import { expect, test } from 'vitest';
import {
  goalAllocationSchema,
  goalSchema,
  selectAvailableToSpend,
} from './index.js';

const sampleGoal = {
  id: 'd0000000-0000-4000-8000-000000000111',
  title: 'Компьютер',
  targetMinor: '7000000',
  status: 'active',
  icon: 'target',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
} as const;
const allocation = {
  id: 'd0000000-0000-4000-8000-000000000112',
  goalId: sampleGoal.id,
  transactionDate: '2026-11-02',
  createdAt: sampleGoal.createdAt,
  updatedAt: sampleGoal.updatedAt,
};

test('goals require a positive target and a calendar target date', () => {
  expect(goalSchema.parse(sampleGoal)).toEqual(sampleGoal);
  expect(
    goalSchema.safeParse({ ...sampleGoal, targetMinor: '0' }).success,
  ).toBe(false);
  expect(
    goalSchema.safeParse({ ...sampleGoal, targetDate: '2026-02-29' }).success,
  ).toBe(false);
});

test('allocations are signed deltas in a goal journal, without financial transaction fields', () => {
  expect(
    goalAllocationSchema.parse({ ...allocation, deltaMinor: '500000' })
      .deltaMinor,
  ).toBe('500000');
  expect(
    goalAllocationSchema.parse({ ...allocation, deltaMinor: '-200000' })
      .deltaMinor,
  ).toBe('-200000');
  expect(
    goalAllocationSchema.safeParse({ ...allocation, deltaMinor: '0' }).success,
  ).toBe(false);
  expect(
    goalAllocationSchema.safeParse({
      ...allocation,
      deltaMinor: '1',
      kind: 'expense',
    }).success,
  ).toBe(false);
});

test('reports overreservation after expenses and keeps completed goals reserved', () => {
  const archived = {
    ...sampleGoal,
    id: allocation.id,
    status: 'archived' as const,
  };
  expect(
    selectAvailableToSpend(
      '100000',
      [{ ...sampleGoal, status: 'completed' }, archived],
      [
        { ...allocation, deltaMinor: '500000' },
        { ...allocation, goalId: archived.id, deltaMinor: '999000' },
      ],
    ),
  ).toEqual({
    availableMinor: '-400000',
    reservedMinor: '500000',
    overReserved: true,
  });
  expect(selectAvailableToSpend('0', [], [])).toEqual({
    availableMinor: '0',
    reservedMinor: '0',
    overReserved: false,
  });
});
