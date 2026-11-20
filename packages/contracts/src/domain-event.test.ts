import { expect, test } from 'vitest';
import { domainEventSchema, domainEventTypeSchema } from './domain-event.js';
import type { DomainEvent, DomainEventType } from './domain-event.js';

const id = '00000000-0000-4000-8000-000000000001';
const envelope = {
  eventId: id,
  version: 1,
  sourceEntityId: id,
  occurredAt: '2026-11-20T08:00:00.000Z',
};
const payloads: Record<DomainEventType, DomainEvent['payload']> = {
  'transaction.income.created': { categoryId: id },
  'transaction.expense.created': { categoryId: id },
  'transaction.transfer.created': {},
  'transaction.updated': { categoryId: id },
  'transaction.deleted': { categoryId: id },
  'transaction.restored': { categoryId: id },
  'budget.threshold.reached': {
    budgetThreshold: '80',
    monthStart: '2026-11-01',
  },
  'goal.created': {},
  'goal.progress.updated': { action: 'release' },
  'goal.completed': {},
  'analytics.weekly.opened': { periodStart: '2026-11-16' },
  'analytics.monthly.opened': { periodStart: '2026-11-01' },
  'achievement.unlocked': { achievementKind: 'first-goal' },
  'backup.exported': {},
  'app.session.started': {},
  'easter_egg.triggered': { cause: 'rare-reaction' },
};

test('all event envelopes accept only their own payload fields and reject private fields', () => {
  for (const type of domainEventTypeSchema.options) {
    const event = { ...envelope, type, payload: payloads[type] };
    expect(domainEventSchema.safeParse(event).success, type).toBe(true);
    for (const field of ['note', 'amountMinor', 'accountName', 'balance']) {
      expect(
        domainEventSchema.safeParse({
          ...event,
          payload: { ...event.payload, [field]: 'private' },
        }).success,
        type,
      ).toBe(false);
    }
  }
  expect(
    domainEventSchema.safeParse({
      ...envelope,
      type: 'goal.progress.updated',
      payload: {},
    }).success,
  ).toBe(false);
  expect(
    domainEventSchema.safeParse({
      ...envelope,
      type: 'budget.threshold.reached',
      payload: { budgetThreshold: '50', monthStart: '2026-11-01' },
    }).success,
  ).toBe(false);
  expect(
    domainEventSchema.safeParse({
      ...envelope,
      type: 'achievement.unlocked',
      payload: { achievementKind: 'fake' },
    }).success,
  ).toBe(false);
});
