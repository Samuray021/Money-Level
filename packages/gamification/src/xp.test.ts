import { expect, test } from 'vitest';
import {
  achievementSchema,
  levelThresholds,
  selectLevelProgress,
  selectTotalXp,
} from './index.js';

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
  expect(achievementSchema.safeParse({ ...first, xp: 100 }).success).toBe(
    false,
  );
  expect(
    achievementSchema.safeParse({ ...first, sourceKey: 'later' }).success,
  ).toBe(false);
  const weekly = { ...first, kind: 'weekly-journal', xp: 20 };
  expect(
    achievementSchema.safeParse({ ...weekly, sourceKey: '2026-11-16' }).success,
  ).toBe(true);
  expect(
    achievementSchema.safeParse({ ...weekly, sourceKey: '2026-11-19' }).success,
  ).toBe(false);
  expect(
    selectTotalXp([
      first,
      { ...first, id: 'd0000000-0000-4000-8000-000000000002' },
      { ...first, kind: 'first-goal', xp: 15 },
    ]),
  ).toBe(25);
  expect(selectTotalXp([])).toBe(0);
});

test('levels have deterministic inclusive thresholds and a finite final level', () => {
  expect(
    levelThresholds.every(
      (value, index) =>
        index === 0 || value > (levelThresholds[index - 1] ?? value),
    ),
  ).toBe(true);
  expect(selectLevelProgress(24)).toMatchObject({ level: 1, remainingXp: 1 });
  expect(selectLevelProgress(25)).toMatchObject({ level: 2, remainingXp: 35 });
  expect(selectLevelProgress(830)).toMatchObject({
    level: 10,
    nextThreshold: null,
    remainingXp: 0,
  });
  expect(() => selectLevelProgress(-1)).toThrow(RangeError);
});
