import {
  accountKindSchema,
  currencyCodeSchema,
  isoDateTimeSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';

export const accountSchema = z.strictObject({
  id: uuidSchema,
  name: z.string().trim().min(1),
  kind: accountKindSchema,
  currencyCode: currencyCodeSchema,
  archived: z.boolean(),
  sortOrder: z.int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.optional(),
});

export type Account = z.infer<typeof accountSchema>;
