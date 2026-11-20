import {
  calendarMonthPeriod,
  calendarWeekPeriod,
} from '@money-level/analytics';
import { systemClock, uuidSchema } from '@money-level/contracts';
import type { ISODate, UUID } from '@money-level/contracts';
import type { JournalCommandContext } from './create-transaction.js';

export function recordAppSession(
  context: JournalCommandContext,
  sessionId: UUID,
): Promise<void> {
  const id = uuidSchema.parse(sessionId);
  return context.storage.write(async (journal) => {
    if (
      !(await journal.settings.get('profile'))?.onboardingCompleted ||
      (await journal.outbox.get(id))
    )
      return;
    await journal.outbox.add({
      eventId: id,
      type: 'app.session.started',
      version: 1,
      sourceEntityId: id,
      occurredAt: (context.clock ?? systemClock).now().toISOString(),
      payload: {},
    });
  });
}

export function recordAnalyticsOpened(
  context: JournalCommandContext,
  sessionId: UUID,
  kind: 'week' | 'month',
  periodStart: ISODate,
): Promise<void> {
  const id = uuidSchema.parse(sessionId);
  const selectPeriod =
    kind === 'week' ? calendarWeekPeriod : calendarMonthPeriod;
  if (selectPeriod(periodStart).from !== periodStart)
    throw new RangeError('The report event must use the start of its period.');
  const type =
    kind === 'week' ? 'analytics.weekly.opened' : 'analytics.monthly.opened';
  return context.storage.write(async (journal) => {
    if (!(await journal.settings.get('profile'))?.onboardingCompleted) return;
    const exists = (await journal.outbox.list()).some(
      (event) =>
        event.type === type &&
        event.sourceEntityId === id &&
        event.payload.periodStart === periodStart,
    );
    if (exists) return;
    await journal.outbox.add({
      eventId: context.createId(),
      type,
      version: 1,
      sourceEntityId: id,
      occurredAt: (context.clock ?? systemClock).now().toISOString(),
      payload: { periodStart },
    });
  });
}
