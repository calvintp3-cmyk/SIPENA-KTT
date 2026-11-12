// shared/schemas/auth.schema.ts
import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Format email tidak valid').max(254, 'Email maksimal 254 karakter')),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi')
    .max(128, 'Kata sandi maksimal 128 karakter'),
});

export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;

