import {
  achievementKindSchema,
  isoDateTimeSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';

export { achievementKindSchema };
export type AchievementKind = z.infer<typeof achievementKindSchema>;

export const achievementSchema = z.strictObject({
  id: uuidSchema,
  kind: achievementKindSchema,
  sourceKey: z.string().regex(/^[a-z0-9:-]{1,80}$/),
  earnedAt: isoDateTimeSchema,
  xp: z.int().positive().max(10_000),
});
export type Achievement = z.infer<typeof achievementSchema>;

export function achievementKey(
  achievement: Pick<Achievement, 'kind' | 'sourceKey'>,
): string {
  return achievement.kind + ':' + achievement.sourceKey;
}

export function selectTotalXp(achievements: readonly Achievement[]): number {
  const seen = new Set<string>();
  let experience = 0;
  for (const achievement of achievements) {
    const key = achievementKey(achievement);
    if (seen.has(key)) continue;
    seen.add(key);
    experience += achievement.xp;
  }
  return experience;
}

export const levelThresholds: readonly number[] = [
  0, 25, 60, 110, 180, 270, 380, 510, 660, 830,
];

export function selectLevelProgress(xp: number) {
  if (!Number.isSafeInteger(xp) || xp < 0)
    throw new RangeError('XP must be a nonnegative integer.');
  const current = levelThresholds.findLastIndex((threshold) => xp >= threshold);
  const levelStart = levelThresholds[current] ?? 0;
  const next = levelThresholds[current + 1];
  return {
    level: current + 1,
    levelStart,
    totalXp: xp,
    nextThreshold: next ?? null,
    remainingXp: next === undefined ? 0 : next - xp,
  };
}
