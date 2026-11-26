'use client';

export interface ChatMsg { id: string; userId: string; name: string; body: string; createdAt: string; isHost: boolean }
export interface PollState { id: string; question: string; options: string[]; closed: boolean; counts: number[]; total: number; myVote: number | null }
export interface Participant { userId: string; name: string; joinedAt: string; connectedSince: string }
export interface JoinInfo {
  isHost: boolean; viewers: number; participants?: Participant[]; chat: ChatMsg[];
  session: { id: string; titleEn: string; titleAr: string; startedAt: string | null; course: { titleEn: string; titleAr: string; slug: string } };
  producers: { id: string; kind: 'audio' | 'video' }[]; rtpCapabilities: unknown; poll: PollState | null;
}
export class LiveError extends Error { constructor(public code: string, message: string) { super(message); } }
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
  constructor(_sessionId: string, _handlers: LiveHandlers) {}
  async connect(): Promise<JoinInfo> { throw new LiveError('OFFLINE_DEMO', 'Live streaming is unavailable in local-only demo mode.'); }
  async publish(_track: MediaStreamTrack): Promise<void> { throw new LiveError('OFFLINE_DEMO', 'Live streaming is unavailable in local-only demo mode.'); }
  setPaused(_kind: 'audio' | 'video', _paused: boolean) {}
  chat(_body: string): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live chat is unavailable in local-only demo mode.')); }
  deleteChat(_id: string): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live chat is unavailable in local-only demo mode.')); }
  createPoll(_question: string, _options: string[]): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  vote(_pollId: string, _option: number): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  closePoll(): Promise<never> { return Promise.reject(new LiveError('OFFLINE_DEMO', 'Live polls are unavailable in local-only demo mode.')); }
  close() {}
}
