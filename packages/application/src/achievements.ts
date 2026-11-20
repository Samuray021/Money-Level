import { calendarWeekPeriod } from '@money-level/analytics';
import { localTransactionDate, systemClock } from '@money-level/contracts';
import type { DomainEvent } from '@money-level/contracts';
import type { Transaction } from '@money-level/finance-core';
import {
  achievementKey,
  achievementSchema,
  achievementXp,
  selectLevelProgress,
  selectTotalXp,
} from '@money-level/gamification';
import type { Achievement } from '@money-level/gamification';
import type { JournalCommandContext } from './create-transaction.js';
import type { JournalReader, UnitOfWork } from './journal-repository.js';
import { consumeOutbox } from './outbox.js';

const operationTypes = new Set([
  'transaction.income.created',
  'transaction.expense.created',
  'transaction.transfer.created',
]);

function isJournalEntry(entry: Transaction): boolean {
  return (
    !entry.deletedAt &&
    (entry.kind === 'income' ||
      entry.kind === 'expense' ||
      entry.kind === 'transfer')
  );
}

async function eligibleAchievements(
  event: DomainEvent,
  journal: JournalReader,
  earned: ReadonlySet<string>,
): Promise<Pick<Achievement, 'kind' | 'sourceKey'>[]> {
  if (event.type === 'backup.exported')
    return [{ kind: 'first-backup', sourceKey: 'once' }];
  if (event.type === 'goal.created') {
    const goal = await journal.goals.get(event.sourceEntityId);
    return goal && !goal.deletedAt
      ? [{ kind: 'first-goal', sourceKey: 'once' }]
      : [];
  }
  const entry = await journal.transactions.get(event.sourceEntityId);
  if (!entry || !isJournalEntry(entry)) return [];

  const candidates: Pick<Achievement, 'kind' | 'sourceKey'>[] = [
    { kind: 'first-operation', sourceKey: 'once' },
  ];
  const { from, until } = calendarWeekPeriod(entry.transactionDate);
  const weekly = { kind: 'weekly-journal', sourceKey: from } as const;
  if (earned.has(achievementKey(weekly))) return candidates;
  const profile = await journal.settings.get('profile');
  if (
    !profile ||
    localTransactionDate(new Date(entry.createdAt), profile.timeZone) !==
      entry.transactionDate
  )
    return candidates;

  const dates = new Set([entry.transactionDate]);
  for (const transaction of await journal.transactions.list()) {
    const date = transaction.transactionDate;
    if (date < from || date >= until || dates.has(date)) continue;
    if (
      isJournalEntry(transaction) &&
      localTransactionDate(
        new Date(transaction.createdAt),
        profile.timeZone,
      ) === date
    )
      dates.add(date);
    if (dates.size === 7) {
      candidates.push(weekly);
      break;
    }
  }
  return candidates;
}

export function runAchievementRules(context: JournalCommandContext) {
  const clock = context.clock ?? systemClock;
  return consumeOutbox(context.storage, {
    consumer: 'achievements',
    clock,
    filter: (event) =>
      operationTypes.has(event.type) ||
      event.type === 'goal.created' ||
      event.type === 'backup.exported',
    async handle(event, journal) {
      const earned = new Set(
        (await journal.achievements.list()).map(achievementKey),
      );
      for (const candidate of await eligibleAchievements(
        event,
        journal,
        earned,
      )) {
        const key = achievementKey(candidate);
        if (earned.has(key)) continue;
        const achievement = achievementSchema.parse({
          ...candidate,
          id: context.createId(),
          earnedAt: clock.now().toISOString(),
          xp: achievementXp[candidate.kind],
        });
        if (await journal.achievements.get(achievement.id))
          throw new RangeError('The achievement identifier is already in use.');
        await journal.achievements.put(achievement);
        await journal.outbox.add({
          eventId: context.createId(),
          type: 'achievement.unlocked',
          version: 1,
          sourceEntityId: achievement.id,
          occurredAt: achievement.earnedAt,
          payload: { achievementKind: achievement.kind },
        });
        earned.add(key);
      }
    },
  });
}

export function noteManualBackup(
  context: JournalCommandContext,
  id = context.createId(),
): Promise<void> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted || (await journal.outbox.get(id))) return;
    await journal.outbox.add({
      eventId: id,
      sourceEntityId: id,
      type: 'backup.exported',
      version: 1,
      occurredAt: (context.clock ?? systemClock).now().toISOString(),
      payload: {},
    });
  });
}

export function getAchievementProgress(storage: UnitOfWork) {
  return storage.read(async (journal) => {
    const achievements = await journal.achievements.list();
    achievements.sort(
      (left, right) =>
        Date.parse(right.earnedAt) - Date.parse(left.earnedAt) ||
        left.id.localeCompare(right.id),
    );
    return {
      achievements,
      ...selectLevelProgress(selectTotalXp(achievements)),
    };
  });
}
