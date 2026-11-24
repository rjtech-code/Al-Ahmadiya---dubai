import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type { types as ms } from 'mediasoup';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Self-hosted live-class media server (mediasoup SFU, runs inside this API — no third-party service).
 * One router per live class. The teacher sends (camera/screen + mic); students only receive.
 * Attendance is recorded as students join and leave.
 */
interface Peer { socketId: string; userId: string; name: string; isHost: boolean; transports: Map<string, ms.WebRtcTransport>; producers: Map<string, ms.Producer>; consumers: Map<string, ms.Consumer> }
interface Attendee { name: string; sockets: Set<string>; since: Date; firstJoinedAt: Date }
export interface Room { sessionId: string; router: ms.Router; peers: Map<string, Peer>; attendees: Map<string, Attendee> }

const MEDIA_CODECS: ms.RouterRtpCodecCapability[] = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } },
  { kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters: { 'packetization-mode': 1, 'profile-level-id': '42e01f', 'level-asymmetry-allowed': 1 } },
];

@Injectable()
export class LiveRoomsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('LiveRooms');
  private worker: ms.Worker | null = null;
  private rooms = new Map<string, Room>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (env().NODE_ENV === 'test') return; // media worker started lazily in tests
    await this.ensureWorker();
  }

  async onModuleDestroy() {
    for (const id of [...this.rooms.keys()]) await this.closeRoom(id);
    this.worker?.close();
  }

  private async ensureWorker() {
    if (this.worker && !this.worker.closed) return this.worker;
    this.worker = await mediasoup.createWorker({ rtcMinPort: env().LIVE_RTC_MIN_PORT, rtcMaxPort: env().LIVE_RTC_MAX_PORT, logLevel: 'warn' });
    this.worker.on('died', () => { this.logger.error('mediasoup worker died; live rooms closed'); this.rooms.clear(); this.worker = null; });
    this.logger.log(`Media worker ready (pid ${this.worker.pid}, UDP/TCP ${env().LIVE_RTC_MIN_PORT}-${env().LIVE_RTC_MAX_PORT})`);
    return this.worker;
  }

  /** Ids of rooms currently open on this server. */
  ids() {
    return [...this.rooms.keys()];
  }

  get(sessionId: string) {
    return this.rooms.get(sessionId) ?? null;
  }

  async room(sessionId: string): Promise<Room> {
    const existing = this.rooms.get(sessionId);
    if (existing) return existing;
    const worker = await this.ensureWorker();
    const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    const room: Room = { sessionId, router, peers: new Map(), attendees: new Map() };
    this.rooms.set(sessionId, room);
    return room;
  }

  addPeer(room: Room, p: { socketId: string; userId: string; name: string; isHost: boolean }) {
    const peer: Peer = { ...p, transports: new Map(), producers: new Map(), consumers: new Map() };
    room.peers.set(p.socketId, peer);
    return peer;
  }

  async createTransport(room: Room, peer: Peer) {
    const t = await room.router.createWebRtcTransport({
      listenInfos: [
        { protocol: 'udp', ip: env().LIVE_LISTEN_IP, announcedAddress: env().LIVE_ANNOUNCED_IP },
        { protocol: 'tcp', ip: env().LIVE_LISTEN_IP, announcedAddress: env().LIVE_ANNOUNCED_IP },
      ],
      enableUdp: true, enableTcp: true, preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000,
    });
    peer.transports.set(t.id, t);
    return { id: t.id, iceParameters: t.iceParameters, iceCandidates: t.iceCandidates, dtlsParameters: t.dtlsParameters };
  }

  hostProducers(room: Room) {
    return [...room.peers.values()].filter((p) => p.isHost).flatMap((p) => [...p.producers.values()].map((pr) => ({ id: pr.id, kind: pr.kind })));
  }

  viewerCount(room: Room) {
    return room.attendees.size;
  }

  participants(room: Room) {
    return [...room.attendees.entries()].map(([userId, a]) => ({ userId, name: a.name, joinedAt: a.firstJoinedAt, connectedSince: a.since }));
  }

  // ── Attendance ──
  async markJoin(room: Room, userId: string, name: string, socketId: string) {
    const now = new Date();
    const a = room.attendees.get(userId);
    if (a) { a.sockets.add(socketId); return; } // another tab: already counted
    const row = await this.prisma.liveAttendance.upsert({
      where: { sessionId_userId: { sessionId: room.sessionId, userId } },
      create: { sessionId: room.sessionId, userId, firstJoinedAt: now, lastJoinedAt: now },
      update: { lastJoinedAt: now, joinCount: { increment: 1 } },
    });
    room.attendees.set(userId, { name, sockets: new Set([socketId]), since: now, firstJoinedAt: row.firstJoinedAt });
  }

  async markLeave(room: Room, userId: string, socketId: string, force = false) {
    const a = room.attendees.get(userId);
    if (!a) return;
    a.sockets.delete(socketId);
    if (a.sockets.size && !force) return;
    room.attendees.delete(userId);
    const now = new Date();
    const seconds = Math.max(0, Math.round((now.getTime() - a.since.getTime()) / 1000));
    await this.prisma.liveAttendance.update({
      where: { sessionId_userId: { sessionId: room.sessionId, userId } },
      data: { totalSeconds: { increment: seconds }, lastLeftAt: now },
    }).catch((e: Error) => this.logger.error(`attendance update failed: ${e.message}`));
  }

  async removePeer(room: Room, socketId: string) {
    const peer = room.peers.get(socketId);
    if (!peer) return null;
    peer.transports.forEach((t) => t.close());
    room.peers.delete(socketId);
    if (!peer.isHost) await this.markLeave(room, peer.userId, socketId);
    return peer;
  }

  /** Ends the class: finalises attendance for everyone still connected and frees media resources. */
  async closeRoom(sessionId: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    for (const [userId, a] of [...room.attendees.entries()]) for (const s of [...a.sockets]) await this.markLeave(room, userId, s, true);
    room.peers.forEach((p) => p.transports.forEach((t) => t.close()));
    room.router.close();
    this.rooms.delete(sessionId);
  }
}
