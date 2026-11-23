import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { types as ms } from 'mediasoup';
import type { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { LiveRoomsService } from './rooms.service';

interface SocketUser { id: string; permissions: string[] }
interface SocketData { user?: SocketUser; sessionId?: string; name?: string; isHost?: boolean; lastChat?: number }
type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
const fail = (code: string, message: string): Ack<never> => ({ ok: false, error: { code, message } });

/**
 * Real-time live-class signalling, presence, attendance and comments.
 * Clients connect with their access token: io(API_ORIGIN + '/live', { auth: { token } }).
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: env().CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: true } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('LiveGateway');
  @WebSocketServer() server!: Server;

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly rooms: LiveRoomsService) {}

  private data(s: Socket) {
    return s.data as SocketData;
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth as { token?: string })?.token;
      const c = await this.jwt.verifyAsync<{ sub: string; perms: string[] }>(token ?? '', { secret: env().JWT_ACCESS_SECRET, algorithms: ['HS256'] });
      this.data(client).user = { id: c.sub, permissions: c.perms ?? [] };
    } catch {
      client.emit('fatal', { code: 'AUTH_REQUIRED', message: 'Please sign in again.' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const d = this.data(client);
    if (!d.sessionId) return;
    const room = this.rooms.get(d.sessionId);
    if (!room) return;
    const peer = await this.rooms.removePeer(room, client.id);
    if (peer && !peer.isHost) this.broadcastPresence(d.sessionId);
    if (peer?.isHost) this.server.to(`live:${d.sessionId}`).emit('hostLeft');
  }

  private broadcastPresence(sessionId: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    this.server.to(`live:${sessionId}`).emit('presence', { viewers: this.rooms.viewerCount(room) });
    this.server.to(`live-host:${sessionId}`).emit('participants', this.rooms.participants(room));
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId?: string }): Promise<Ack<unknown>> {
    const d = this.data(client);
    if (!d.user) return fail('AUTH_REQUIRED', 'Please sign in again.');
    if (!body?.sessionId || !/^[0-9a-f-]{36}$/i.test(body.sessionId)) return fail('BAD_REQUEST', 'Invalid class');
    const session = await this.prisma.liveSession.findUnique({ where: { id: body.sessionId }, include: { course: { select: { titleEn: true, titleAr: true, slug: true } } } });
    if (!session) return fail('NOT_FOUND', 'Class not found');
    const isHost = d.user.permissions.includes('live.host');
    if (!isHost) {
      const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: d.user.id, courseId: session.courseId } } });
      if (e?.status !== 'ACTIVE') return fail('NOT_ENROLLED', 'Only enrolled students can join this class.');
    }
    if (session.status !== 'LIVE') return fail('NOT_LIVE', session.status === 'SCHEDULED' ? 'The class has not started yet.' : 'This class has ended.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: d.user.id }, select: { fullName: true } });

    const room = await this.rooms.room(session.id);
    this.rooms.addPeer(room, { socketId: client.id, userId: d.user.id, name: user.fullName, isHost });
    Object.assign(d, { sessionId: session.id, name: user.fullName, isHost });
    await client.join(`live:${session.id}`);
    if (isHost) await client.join(`live-host:${session.id}`);
    else await this.rooms.markJoin(room, d.user.id, user.fullName, client.id);
    this.broadcastPresence(session.id);

    const chat = await this.prisma.liveChatMessage.findMany({
      where: { sessionId: session.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { user: { select: { fullName: true } } },
    });
    return {
      ok: true,
      data: {
        isHost, rtpCapabilities: room.router.rtpCapabilities, producers: this.rooms.hostProducers(room), viewers: this.rooms.viewerCount(room),
        participants: isHost ? this.rooms.participants(room) : undefined,
        chat: chat.reverse().map((m) => ({ id: m.id, userId: m.userId, name: m.user.fullName, body: m.body, createdAt: m.createdAt, isHost: m.userId === session.hostId })),
        session: { id: session.id, titleEn: session.titleEn, titleAr: session.titleAr, startedAt: session.startedAt, course: session.course },
      },
    };
  }

  private peerFor(client: Socket) {
    const d = this.data(client);
    const room = d.sessionId ? this.rooms.get(d.sessionId) : null;
    const peer = room?.peers.get(client.id) ?? null;
    return { room, peer, d };
  }

  @SubscribeMessage('createTransport')
  async createTransport(@ConnectedSocket() client: Socket): Promise<Ack<unknown>> {
    const { room, peer } = this.peerFor(client);
    if (!room || !peer) return fail('NOT_JOINED', 'Join the class first');
    if (peer.transports.size >= 2) return fail('LIMIT', 'Too many transports');
    return { ok: true, data: await this.rooms.createTransport(room, peer) };
  }

  @SubscribeMessage('connectTransport')
  async connectTransport(@ConnectedSocket() client: Socket, @MessageBody() b: { transportId: string; dtlsParameters: ms.DtlsParameters }): Promise<Ack<null>> {
    const { peer } = this.peerFor(client);
    const t = peer?.transports.get(b?.transportId);
    if (!t) return fail('NOT_FOUND', 'Transport not found');
    try { await t.connect({ dtlsParameters: b.dtlsParameters }); return { ok: true, data: null }; } catch (e) { return fail('CONNECT_FAILED', (e as Error).message); }
  }

  /** Only the teacher can send media. */
  @SubscribeMessage('produce')
  async produce(@ConnectedSocket() client: Socket, @MessageBody() b: { transportId: string; kind: ms.MediaKind; rtpParameters: ms.RtpParameters }): Promise<Ack<{ id: string }>> {
    const { room, peer, d } = this.peerFor(client);
    if (!room || !peer?.isHost) return fail('FORBIDDEN', 'Only the teacher can broadcast');
    const t = peer.transports.get(b?.transportId);
    if (!t) return fail('NOT_FOUND', 'Transport not found');
    try {
      const producer = await t.produce({ kind: b.kind, rtpParameters: b.rtpParameters });
      peer.producers.set(producer.id, producer);
      producer.on('transportclose', () => { peer.producers.delete(producer.id); this.server.to(`live:${d.sessionId}`).emit('producerClosed', { id: producer.id }); });
      client.to(`live:${d.sessionId}`).emit('newProducer', { id: producer.id, kind: producer.kind });
      return { ok: true, data: { id: producer.id } };
    } catch (e) { return fail('PRODUCE_FAILED', (e as Error).message); }
  }

  @SubscribeMessage('consume')
  async consume(@ConnectedSocket() client: Socket, @MessageBody() b: { transportId: string; producerId: string; rtpCapabilities: ms.RtpCapabilities }): Promise<Ack<unknown>> {
    const { room, peer } = this.peerFor(client);
    const t = peer?.transports.get(b?.transportId);
    if (!room || !peer || !t) return fail('NOT_FOUND', 'Transport not found');
    if (!room.router.canConsume({ producerId: b.producerId, rtpCapabilities: b.rtpCapabilities })) return fail('CANNOT_CONSUME', 'Your browser cannot play this stream');
    try {
      const consumer = await t.consume({ producerId: b.producerId, rtpCapabilities: b.rtpCapabilities, paused: true });
      peer.consumers.set(consumer.id, consumer);
      consumer.on('producerclose', () => { peer.consumers.delete(consumer.id); client.emit('producerClosed', { id: b.producerId }); });
      return { ok: true, data: { id: consumer.id, producerId: b.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters } };
    } catch (e) { return fail('CONSUME_FAILED', (e as Error).message); }
  }

  @SubscribeMessage('resume')
  async resume(@ConnectedSocket() client: Socket, @MessageBody() b: { consumerId: string }): Promise<Ack<null>> {
    const { peer } = this.peerFor(client);
    const c = peer?.consumers.get(b?.consumerId);
    if (!c) return fail('NOT_FOUND', 'Consumer not found');
    await c.resume();
    return { ok: true, data: null };
  }

  @SubscribeMessage('chat')
  async chat(@ConnectedSocket() client: Socket, @MessageBody() b: { body?: string }): Promise<Ack<null>> {
    const { peer, d } = this.peerFor(client);
    if (!peer || !d.sessionId || !d.user) return fail('NOT_JOINED', 'Join the class first');
    const body = (b?.body ?? '').trim().slice(0, 500);
    if (!body) return fail('EMPTY', 'Write a comment');
    const now = Date.now();
    if (d.lastChat && now - d.lastChat < 1500) return fail('TOO_FAST', 'Please wait a moment before sending again');
    d.lastChat = now;
    const m = await this.prisma.liveChatMessage.create({ data: { sessionId: d.sessionId, userId: d.user.id, body } });
    this.server.to(`live:${d.sessionId}`).emit('chat', { id: m.id, userId: d.user.id, name: d.name, body: m.body, createdAt: m.createdAt, isHost: !!d.isHost });
    return { ok: true, data: null };
  }

  /** Teacher moderation. */
  @SubscribeMessage('deleteChat')
  async deleteChat(@ConnectedSocket() client: Socket, @MessageBody() b: { id: string }): Promise<Ack<null>> {
    const { peer, d } = this.peerFor(client);
    if (!peer?.isHost || !d.sessionId) return fail('FORBIDDEN', 'Only the teacher can remove comments');
    await this.prisma.liveChatMessage.updateMany({ where: { id: b?.id, sessionId: d.sessionId }, data: { deletedAt: new Date() } });
    this.server.to(`live:${d.sessionId}`).emit('chatDeleted', { id: b.id });
    return { ok: true, data: null };
  }

  /** Called when the teacher ends the class (REST). */
  async endRoom(sessionId: string) {
    this.server?.to(`live:${sessionId}`).emit('ended');
    await this.rooms.closeRoom(sessionId);
    this.logger.log(`Live class ${sessionId} closed`);
  }
}
