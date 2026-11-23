import * as argon2 from 'argon2';
import { z } from 'zod';

/** OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1). */
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1, raw: false } as const;

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);
export const verifyPassword = (hash: string, plain: string): Promise<boolean> => argon2.verify(hash, plain).catch(() => false);

export const PasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

let dummyHash: Promise<string> | undefined;
/** Equalises timing when the e-mail does not exist. */
export function dummyVerify(plain: string): Promise<boolean> {
  const h = (dummyHash ??= hashPassword('timing-equaliser-not-a-real-password'));
  return h.then((hash) => verifyPassword(hash, plain));
}
