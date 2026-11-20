import { systemClock } from '@money-level/contracts';
import type { ISODate } from '@money-level/contracts';
import { parseCurrencyAmount } from '@money-level/finance-core';
import {
  goalIconSchema,
  goalSchema,
  selectGoalReserved,
} from '@money-level/goals';
import type { Goal } from '@money-level/goals';
import type { JournalCommandContext } from './create-transaction.js';
import type { UnitOfWork } from './journal-repository.js';

export interface NewGoalInput {
  title: string;
  target: string;
  targetDate?: ISODate;
  icon?: (typeof goalIconSchema.options)[number];
}

export function createGoal(
  context: JournalCommandContext,
  input: NewGoalInput,
): Promise<Goal> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const time = (context.clock ?? systemClock).now().toISOString();
    const goal = goalSchema.parse({
      id: context.createId(),
      title: input.title,
      targetMinor: parseCurrencyAmount(
        input.target.trim(),
        profile.baseCurrency,
      ),
      ...(input.targetDate ? { targetDate: input.targetDate } : {}),
      icon: goalIconSchema.parse(input.icon ?? 'target'),
      status: 'active',
      createdAt: time,
      updatedAt: time,
    });
    if (await journal.goals.get(goal.id))
      throw new RangeError('The goal identifier is already in use.');
    await journal.goals.put(goal);
    await journal.outbox.add({
      eventId: context.createId(),
      type: 'goal.created',
      version: 1,
      sourceEntityId: goal.id,
      occurredAt: time,
      payload: {},
    });
    return goal;
  });
}

export function getGoalOverview(storage: UnitOfWork) {
  return storage.read(async (journal) => {
    const goals = await journal.goals.list();
    const allocations = goals.length
      ? await journal.goalAllocations.list()
      : [];
    return goals
      .filter((goal) => !goal.deletedAt && goal.status !== 'archived')
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
          left.id.localeCompare(right.id),
      )
      .map((goal) => ({
        goal,
        reservedMinor: selectGoalReserved(allocations, goal.id),
      }));
  });
}
