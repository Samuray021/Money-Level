import type { MinorUnits, UUID } from '@money-level/contracts';
import { addMinorUnits } from '@money-level/finance-core';
import type { Goal, GoalAllocation } from './index.js';

export function selectGoalReserved(
  allocations: readonly GoalAllocation[],
  goalId: UUID,
): MinorUnits {
  return allocations.reduce(
    (sum, entry) =>
      entry.goalId === goalId ? addMinorUnits(sum, entry.deltaMinor) : sum,
    '0',
  );
}

export function selectTotalReserved(
  goals: readonly Goal[],
  allocations: readonly GoalAllocation[],
): MinorUnits {
  const current = new Set(
    goals
      .filter(
        (goal) => goal.status !== 'archived' && goal.deletedAt === undefined,
      )
      .map((goal) => goal.id),
  );
  return allocations.reduce(
    (sum, entry) =>
      current.has(entry.goalId) ? addMinorUnits(sum, entry.deltaMinor) : sum,
    '0',
  );
}
