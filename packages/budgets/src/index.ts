import {
  isoDateSchema,
  isoDateTimeSchema,
  positiveMinorUnitsSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';
import { budgetThresholds } from './usage.js';

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

export {
  budgetThresholds,
  budgetUsageForSpent,
  selectBudgetUsage,
} from './usage.js';
export type { BudgetThreshold } from './usage.js';

export const budgetNoticeSchema = z.strictObject({
  id: z.string().min(1),
  budgetId: uuidSchema,
  monthStart: isoDateSchema,
  threshold: z.enum(budgetThresholds),
  createdAt: isoDateTimeSchema,
});

export type BudgetNotice = z.infer<typeof budgetNoticeSchema>;
