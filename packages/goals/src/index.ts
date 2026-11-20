import {
  isoDateSchema,
  isoDateTimeSchema,
  minorUnitsSchema,
  positiveMinorUnitsSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';

export const goalIconSchema = z.enum(['target', 'reserve', 'gift']);

export const goalSchema = z.strictObject({
  id: uuidSchema,
  title: z.string().trim().min(1).max(100),
  targetMinor: positiveMinorUnitsSchema,
  targetDate: isoDateSchema.optional(),
  icon: z.string().trim().min(1),
  status: z.enum(['active', 'completed', 'archived']),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.optional(),
});

export const goalAllocationSchema = z.strictObject({
  id: uuidSchema,
  goalId: uuidSchema,
  deltaMinor: minorUnitsSchema.refine(
    (value) => !/^-?0+$/.test(value),
    'Reservation cannot be zero.',
  ),
  transactionDate: isoDateSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Goal = z.infer<typeof goalSchema>;
export type GoalAllocation = z.infer<typeof goalAllocationSchema>;

export {
  selectAvailableToSpend,
  selectGoalReserved,
  selectTotalReserved,
} from './reservations.js';
