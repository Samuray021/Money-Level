import { expect, test } from 'vitest';
import { achievementSchema, selectTotalXp } from './index.js';

const first = {
  id: 'd0000000-0000-4000-8000-000000000001',
  kind: 'first-operation',
  sourceKey: 'once',
  earnedAt: '2026-11-19T12:00:00Z',
  xp: 10,
} as const;

test('XP counts each achievement source once and validates the XP grant', () => {
  expect(achievementSchema.parse(first)).toEqual(first);
  expect(achievementSchema.safeParse({ ...first, xp: -10 }).success).toBe(
    false,
  );
  expect(
    selectTotalXp([
      first,
      { ...first, id: 'd0000000-0000-4000-8000-000000000002' },
      { ...first, kind: 'first-goal', xp: 15 },
    ]),
  ).toBe(25);
  expect(selectTotalXp([])).toBe(0);
});
