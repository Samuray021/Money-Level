import {
  isoDateTimeSchema,
  positiveMinorUnitsSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';

export const budgetSchema = z.strictObject({
  id: uuidSchema,
  periodType: z.literal('month'),
  categoryId: uuidSchema.optional(),
  limitMinor: positiveMinorUnitsSchema,
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Budget = z.infer<typeof budgetSchema>;
