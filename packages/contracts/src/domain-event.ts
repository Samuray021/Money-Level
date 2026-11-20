import { z } from 'zod';
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from './primitives.js';

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
  'backup.exported',
  'app.session.started',
  'easter_egg.triggered',
]);

export const achievementKindSchema = z.enum([
  'first-operation',
  'weekly-journal',
  'first-goal',
  'first-backup',
]);
export const budgetThresholdSchema = z.enum(['80', '100', 'over']);

const envelope = {
  eventId: uuidSchema,
  version: z.literal(1),
  sourceEntityId: uuidSchema,
  occurredAt: isoDateTimeSchema,
};

export const domainEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...envelope,
    type: domainEventTypeSchema.extract([
      'transaction.income.created',
      'transaction.expense.created',
      'transaction.updated',
      'transaction.deleted',
      'transaction.restored',
    ]),
    payload: z.strictObject({
      categoryId: uuidSchema.optional(),
      amountBand: z.enum(['small', 'medium', 'large']).optional(),
    }),
  }),
  z.strictObject({
    ...envelope,
    type: domainEventTypeSchema.extract([
      'transaction.transfer.created',
      'goal.created',
      'goal.completed',
      'backup.exported',
      'app.session.started',
    ]),
    payload: z.strictObject({}),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('budget.threshold.reached'),
    payload: z.strictObject({
      budgetThreshold: budgetThresholdSchema,
      monthStart: isoDateSchema,
    }),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('goal.progress.updated'),
    payload: z.strictObject({ action: z.enum(['reserve', 'release']) }),
  }),
  z.strictObject({
    ...envelope,
    type: domainEventTypeSchema.extract([
      'analytics.weekly.opened',
      'analytics.monthly.opened',
    ]),
    payload: z.strictObject({ periodStart: isoDateSchema }),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('achievement.unlocked'),
    payload: z.strictObject({ achievementKind: achievementKindSchema }),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('easter_egg.triggered'),
    payload: z.strictObject({ cause: z.literal('rare-reaction') }),
  }),
]);

export type DomainEvent = z.infer<typeof domainEventSchema>;
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;

export const eventReceiptSchema = z.strictObject({
  id: z.string().min(1),
  eventId: uuidSchema,
  consumer: z.string().regex(/^[a-z][a-z0-9.-]{0,63}$/),
  processedAt: isoDateTimeSchema,
});

export type EventReceipt = z.infer<typeof eventReceiptSchema>;

const ruleSlug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const memeShownSchema = z.strictObject({
  id: uuidSchema,
  packId: ruleSlug,
  ruleId: ruleSlug,
  shownAt: isoDateTimeSchema,
  sessionId: uuidSchema,
  rarity: z.enum(['normal', 'rare']),
});
export type MemeShown = z.infer<typeof memeShownSchema>;
