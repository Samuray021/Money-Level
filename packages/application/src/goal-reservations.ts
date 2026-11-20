import {
  localTransactionDate,
  positiveMinorUnitsSchema,
  systemClock,
  uuidSchema,
} from '@money-level/contracts';
import type { MinorUnits, UUID } from '@money-level/contracts';
import {
  addMinorUnits,
  compareMinorUnits,
  selectTotalBalance,
  subtractMinorUnits,
} from '@money-level/finance-core';
import {
  goalAllocationSchema,
  selectGoalReserved,
  selectAvailableToSpend,
} from '@money-level/goals';
import type { GoalAllocation } from '@money-level/goals';
import type { JournalCommandContext } from './create-transaction.js';

export interface GoalReservationInput {
  goalId: UUID;
  amountMinor: MinorUnits;
  allocationId?: UUID;
}

async function changeReservation(
  context: JournalCommandContext,
  input: GoalReservationInput,
  action: 'reserve' | 'release',
): Promise<GoalAllocation> {
  const amount = positiveMinorUnitsSchema.parse(input.amountMinor);
  const id = uuidSchema.parse(input.goalId);
  const delta = action === 'reserve' ? amount : subtractMinorUnits('0', amount);
  const allocationId =
    input.allocationId === undefined
      ? undefined
      : uuidSchema.parse(input.allocationId);
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    const goal = await journal.goals.get(id);
    if (
      !profile?.onboardingCompleted ||
      !goal ||
      goal.deletedAt ||
      goal.status === 'archived'
    ) {
      throw new RangeError('This goal is unavailable.');
    }

    const existing =
      allocationId && (await journal.goalAllocations.get(allocationId));
    if (existing) {
      if (existing.goalId !== id || existing.deltaMinor !== delta)
        throw new RangeError(
          'This reservation key belongs to a different change.',
        );
      return existing;
    }

    const allocations = await journal.goalAllocations.list();
    const reserved = selectGoalReserved(allocations, id);
    const next = addMinorUnits(reserved, delta);
    if (
      compareMinorUnits(next, '0') < 0 ||
      compareMinorUnits(next, goal.targetMinor) > 0
    ) {
      throw new RangeError(
        'The reservation must stay between zero and the goal target.',
      );
    }
    if (action === 'reserve') {
      const totalBalance = selectTotalBalance(
        await journal.accounts.list(),
        await journal.transactions.list(),
      );
      const { availableMinor } = selectAvailableToSpend(
        totalBalance,
        await journal.goals.list(),
        allocations,
      );
      if (compareMinorUnits(amount, availableMinor) > 0) {
        throw new RangeError(
          'The available balance is too low for this reservation.',
        );
      }
    }

    const now = (context.clock ?? systemClock).now();
    const time = now.toISOString();
    const allocation = goalAllocationSchema.parse({
      id: allocationId ?? context.createId(),
      goalId: id,
      deltaMinor: delta,
      transactionDate: localTransactionDate(now, profile.timeZone),
      createdAt: time,
      updatedAt: time,
    });
    if (await journal.goalAllocations.get(allocation.id)) {
      throw new RangeError('The allocation identifier is already in use.');
    }
    await journal.goalAllocations.put(allocation);
    const status =
      compareMinorUnits(next, goal.targetMinor) === 0 ? 'completed' : 'active';
    await journal.outbox.add({
      eventId: allocation.id,
      type: 'goal.progress.updated',
      version: 1,
      sourceEntityId: goal.id,
      occurredAt: time,
      payload: { action },
    });
    if (goal.status !== status) {
      await journal.goals.put({ ...goal, status, updatedAt: time });
      if (status === 'completed')
        await journal.outbox.add({
          eventId: context.createId(),
          type: 'goal.completed',
          version: 1,
          sourceEntityId: goal.id,
          occurredAt: time,
          payload: {},
        });
    }
    return allocation;
  });
}

export function reserveToGoal(
  context: JournalCommandContext,
  input: GoalReservationInput,
): Promise<GoalAllocation> {
  return changeReservation(context, input, 'reserve');
}

export function releaseFromGoal(
  context: JournalCommandContext,
  input: GoalReservationInput,
): Promise<GoalAllocation> {
  return changeReservation(context, input, 'release');
}
