// shared/schemas/user.schema.ts
import { z } from 'zod';
import { UserRoleEnum } from '../enums/pdrb';

const OptionalLocalPasswordSchema = z
  .string()
  .max(128, 'Kata sandi maksimal 128 karakter')
  .refine(
    (val) => val.trim().length === 0 || val.length >= 12,
    'Jika kata sandi lokal diisi, panjang minimal 12 karakter',
  )
  .optional()
  .nullable();

export const CreateAdminUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Format alamat email / Gmail tidak valid').max(254, 'Email maksimal 254 karakter')),
  name: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(120, 'Nama maksimal 120 karakter'),
  role: z.enum(UserRoleEnum).default(UserRoleEnum.OPERATOR),
  isActive: z.boolean().optional().default(true),
  password: OptionalLocalPasswordSchema,
});

export const UpdateAdminUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email('Format alamat email / Gmail tidak valid').max(254, 'Email maksimal 254 karakter'))
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter')
      .max(120, 'Nama maksimal 120 karakter')
      .optional(),
    role: z.enum(UserRoleEnum).optional(),
    isActive: z.boolean().optional(),
    password: OptionalLocalPasswordSchema,
    clearPassword: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !(data.clearPassword && data.password !== undefined && data.password !== null && data.password.trim().length > 0),
    'Tidak dapat mengatur kata sandi baru sekaligus menghapus kata sandi lokal',
  )
  .refine(
    (data) =>
      data.email !== undefined ||
      data.name !== undefined ||
      data.role !== undefined ||
      data.isActive !== undefined ||
      data.clearPassword !== undefined ||
      (data.password !== undefined && data.password !== null && data.password.trim().length > 0),
    'Minimal satu field pembaruan harus disediakan',
  );

export type CreateAdminUserInput = z.infer<typeof CreateAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>;

