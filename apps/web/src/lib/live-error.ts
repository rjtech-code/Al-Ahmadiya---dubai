export class LiveError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
