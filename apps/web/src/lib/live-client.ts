'use client';

import { Device } from 'mediasoup-client';
import type { types as msc } from 'mediasoup-client';
import { io, type Socket } from 'socket.io-client';
import { restoreSession, tokenStore } from './client-api';

/**
 * Browser side of our self-hosted live classroom (no third-party service):
 * socket.io signalling + mediasoup WebRTC. Teacher sends camera/screen + mic; students receive.
 */
export interface ChatMsg { id: string; userId: string; name: string; body: string; createdAt: string; isHost: boolean }
export interface PollState { id: string; question: string; options: string[]; closed: boolean; counts: number[]; total: number; myVote: number | null }
export interface Participant { userId: string; name: string; joinedAt: string; connectedSince: string }
export interface JoinInfo {
  isHost: boolean; viewers: number; participants?: Participant[]; chat: ChatMsg[];
  session: { id: string; titleEn: string; titleAr: string; startedAt: string | null; course: { titleEn: string; titleAr: string; slug: string } };
  producers: { id: string; kind: 'audio' | 'video' }[]; rtpCapabilities: msc.RtpCapabilities;
  poll: PollState | null;
}
type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export class LiveError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export interface LiveHandlers {
  onTrack?: (track: MediaStreamTrack, kind: 'audio' | 'video') => void;
  onTrackEnded?: (kind: 'audio' | 'video') => void;
  onChat?: (m: ChatMsg) => void;
  onChatDeleted?: (id: string) => void;
  onPresence?: (viewers: number) => void;
  onParticipants?: (p: Participant[]) => void;
  onEnded?: () => void;
  onHostLeft?: () => void;
  onDisconnect?: () => void;
  onPoll?: (p: PollState | null) => void;
}

export class LiveClient {
  private socket!: Socket;
  private device = new Device();
  private send?: msc.Transport;
  private recv?: msc.Transport;
  private producers = new Map<'audio' | 'video', msc.Producer>();
  private consumerKinds = new Map<string, 'audio' | 'video'>();
  info!: JoinInfo;

  constructor(private sessionId: string, private h: LiveHandlers) {}

  private call<T>(ev: string, payload: unknown = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(15_000).emit(ev, payload, (err: Error | null, res: Ack<T>) => {
        if (err) return reject(new LiveError('TIMEOUT', 'The live server did not respond'));
        if (!res.ok) return reject(new LiveError(res.error.code, res.error.message));
        resolve(res.data);
      });
    });
  }

  async connect(): Promise<JoinInfo> {
    await restoreSession();
    const configuredOrigin = process.env.NEXT_PUBLIC_LIVE_ORIGIN?.trim() || process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
    if (!configuredOrigin) {
      throw new LiveError('CONFIGURATION', 'Set NEXT_PUBLIC_LIVE_ORIGIN or NEXT_PUBLIC_API_ORIGIN in the environment.');
    }
    let liveOrigin: URL;
    try {
      liveOrigin = new URL(configuredOrigin);
    } catch {
      throw new LiveError('CONFIGURATION', 'The configured live signalling origin must be an absolute URL.');
    }
    if (!['http:', 'https:'].includes(liveOrigin.protocol) || liveOrigin.pathname !== '/' || liveOrigin.search || liveOrigin.hash) {
      throw new LiveError('CONFIGURATION', 'The configured live signalling value must contain only an HTTP(S) origin.');
    }
    const origin = liveOrigin.origin;
    this.socket = io(`${origin}/live`, { auth: { token: tokenStore.get() }, transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', () => reject(new LiveError('NETWORK', 'Could not reach the live class server')));
      this.socket.once('fatal', (e: { code: string; message: string }) => reject(new LiveError(e.code, e.message)));
    });
    this.socket.on('chat', (m: ChatMsg) => this.h.onChat?.(m));
    this.socket.on('chatDeleted', (e: { id: string }) => this.h.onChatDeleted?.(e.id));
    this.socket.on('presence', (p: { viewers: number }) => this.h.onPresence?.(p.viewers));
    this.socket.on('participants', (p: Participant[]) => this.h.onParticipants?.(p));
    this.socket.on('ended', () => this.h.onEnded?.());
    this.socket.on('poll', (p: PollState | null) => this.h.onPoll?.(p));
    this.socket.on('hostLeft', () => this.h.onHostLeft?.());
    this.socket.on('disconnect', () => this.h.onDisconnect?.());
    this.socket.on('newProducer', (p: { id: string; kind: 'audio' | 'video' }) => void this.consume(p.id, p.kind));
    this.socket.on('producerClosed', (p: { id: string }) => { const k = this.consumerKinds.get(p.id); if (k) this.h.onTrackEnded?.(k); });

    this.info = await this.call<JoinInfo>('join', { sessionId: this.sessionId });
    await this.device.load({ routerRtpCapabilities: this.info.rtpCapabilities });
    if (!this.info.isHost) {
      await this.createRecv();
      for (const p of this.info.producers) await this.consume(p.id, p.kind);
    }
    return this.info;
  }

  private async makeTransport(direction: 'send' | 'recv') {
    const params = await this.call<msc.TransportOptions>('createTransport');
    const t = direction === 'send' ? this.device.createSendTransport(params) : this.device.createRecvTransport(params);
    t.on('connect', ({ dtlsParameters }, ok, err) => { this.call('connectTransport', { transportId: t.id, dtlsParameters }).then(() => ok()).catch(err); });
    if (direction === 'send') {
      t.on('produce', ({ kind, rtpParameters }, ok, err) => { this.call<{ id: string }>('produce', { transportId: t.id, kind, rtpParameters }).then(ok).catch(err); });
    }
    return t;
  }

  private async createRecv() {
    this.recv ??= await this.makeTransport('recv');
  }

  private async consume(producerId: string, kind: 'audio' | 'video') {
    if (this.info?.isHost) return;
    await this.createRecv();
    const c = await this.call<{ id: string; producerId: string; kind: 'audio' | 'video'; rtpParameters: msc.RtpParameters }>('consume', { transportId: this.recv!.id, producerId, rtpCapabilities: this.device.rtpCapabilities });
    const consumer = await this.recv!.consume({ id: c.id, producerId: c.producerId, kind: c.kind, rtpParameters: c.rtpParameters });
    this.consumerKinds.set(producerId, kind);
    await this.call('resume', { consumerId: consumer.id });
    this.h.onTrack?.(consumer.track, kind);
  }

  /** Teacher: start sending a track, or swap it (camera ⇄ screen) without renegotiation. */
  async publish(track: MediaStreamTrack) {
    const kind = track.kind as 'audio' | 'video';
    const existing = this.producers.get(kind);
    if (existing) { await existing.replaceTrack({ track }); return; }
    this.send ??= await this.makeTransport('send');
    const p = await this.send.produce(kind === 'video' ? { track, encodings: [{ maxBitrate: 1_500_000 }], codecOptions: { videoGoogleStartBitrate: 1000 } } : { track });
    this.producers.set(kind, p);
  }

  setPaused(kind: 'audio' | 'video', paused: boolean) {
    const p = this.producers.get(kind);
    if (p) { if (paused) p.pause(); else p.resume(); }
  }

  chat(body: string) { return this.call('chat', { body }); }
  deleteChat(id: string) { return this.call('deleteChat', { id }); }
  createPoll(question: string, options: string[]) { return this.call('pollCreate', { question, options }); }
  vote(pollId: string, option: number) { return this.call('pollVote', { pollId, option }); }
  closePoll() { return this.call('pollClose'); }

  close() {
    this.producers.forEach((p) => p.close());
    this.send?.close(); this.recv?.close();
    this.socket?.close();
  }
}
