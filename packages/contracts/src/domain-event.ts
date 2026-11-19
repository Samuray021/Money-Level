import { z } from 'zod';
import { isoDateTimeSchema, uuidSchema } from './primitives.js';

export const domainEventTypeSchema = z.enum([
  'transaction.income.created',
  'transaction.expense.created',
  'transaction.transfer.created',
  'transaction.updated',
  'transaction.deleted',
  'transaction.restored',
  'budget.threshold.reached',
  'goal.created',
  'goal.progress.updated',
  'goal.completed',
  'analytics.weekly.opened',
  'analytics.monthly.opened',
  'achievement.unlocked',
  'app.session.started',
  'easter_egg.triggered',
]);

export const domainEventSchema = z.strictObject({
  eventId: uuidSchema,
  type: domainEventTypeSchema,
  version: z.literal(1),
  sourceEntityId: uuidSchema,
  occurredAt: isoDateTimeSchema,
  payload: z.strictObject({
    categoryId: uuidSchema.optional(),
    amountBand: z.enum(['small', 'medium', 'large']).optional(),
    budgetThreshold: z.enum(['80', '100', 'over']).optional(),
    achievementKind: z
      .string()
      .regex(/^[a-z][a-z0-9_.-]{0,63}$/)
      .optional(),
  }),
});

export type DomainEvent = z.infer<typeof domainEventSchema>;
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;

export const eventReceiptSchema = z.strictObject({
  id: z.string().min(1),
  eventId: uuidSchema,
  consumer: z.string().regex(/^[a-z][a-z0-9.-]{0,63}$/),
  processedAt: isoDateTimeSchema,
});

export type EventReceipt = z.infer<typeof eventReceiptSchema>;
