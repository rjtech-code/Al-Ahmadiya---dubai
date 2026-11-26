'use client';

import { LiveError } from './live-error';

/** Live streaming requires a signalling server and is intentionally unavailable in local-only demo mode. */
export class LiveClient {
  constructor(_sessionId: string, _handlers: unknown) {}
  async connect(): Promise<never> { throw new LiveError('OFFLINE_DEMO', 'Live streaming is unavailable in local-only demo mode.'); }
  async publish(_track: MediaStreamTrack): Promise<void> { throw new LiveError('OFFLINE_DEMO', 'Live streaming is unavailable in local-only demo mode.'); }
  setPaused(_kind: 'audio' | 'video', _paused: boolean) {}
  chat(_body: string): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live chat is unavailable in local-only demo mode.')); }
  deleteChat(_id: string): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live chat is unavailable in local-only demo mode.')); }
  createPoll(_question: string, _options: string[]): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  vote(_pollId: string, _option: number): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  closePoll(): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  close() {}
}
