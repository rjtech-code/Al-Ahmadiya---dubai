import { z } from 'zod';
import { PasswordSchema } from './password';

const Email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid e-mail address')).pipe(z.string().max(254));

export const RegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(150),
  email: Email,
  password: PasswordSchema,
  locale: z.enum(['en', 'ar']).default('en'),
});

export const LoginSchema = z.object({
  email: Email,
  password: z.string().min(1, 'Enter your password').max(128),
  audience: z.enum(['portal', 'admin']).default('portal'),
  rememberMe: z.boolean().default(false),
});

export const ForgotSchema = z.object({ email: Email });
export const ResetSchema = z.object({ token: z.string().min(20).max(200), password: PasswordSchema });
