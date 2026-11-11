// shared/schemas/keyword.schema.ts
import { z } from 'zod';
import { ExpenditureComponentEnum, KbliCategoryEnum } from '../enums/pdrb';

export const CreateKeywordSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, 'Kata kunci minimal 2 karakter')
    .max(120, 'Kata kunci maksimal 120 karakter'),
  defaultKbliCategory: z.nativeEnum(KbliCategoryEnum).nullable().optional(),
  defaultExpenditureComponent: z.nativeEnum(ExpenditureComponentEnum).nullable().optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateKeywordSchema = z
  .object({
    keyword: z
      .string()
      .trim()
      .min(2, 'Kata kunci minimal 2 karakter')
      .max(120, 'Kata kunci maksimal 120 karakter')
      .optional(),
    defaultKbliCategory: z.nativeEnum(KbliCategoryEnum).nullable().optional(),
    defaultExpenditureComponent: z.nativeEnum(ExpenditureComponentEnum).nullable().optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Deskripsi maksimal 500 karakter')
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    'Minimal satu field harus diubah',
  );

export type CreateKeywordInput = z.infer<typeof CreateKeywordSchema>;
export type UpdateKeywordInput = z.infer<typeof UpdateKeywordSchema>;

