import {
  achievementKindSchema,
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';

export { achievementKindSchema };
export type AchievementKind = z.infer<typeof achievementKindSchema>;

export const achievementXp: Readonly<Record<AchievementKind, number>> = {
  'first-operation': 10,
  'weekly-journal': 20,
  'first-goal': 15,
  'first-backup': 20,
};

export const achievementSchema = z
  .strictObject({
    id: uuidSchema,
    kind: achievementKindSchema,
    sourceKey: z.string(),
    earnedAt: isoDateTimeSchema,
    xp: z.int(),
  })
  .superRefine(({ kind, sourceKey, xp }, context) => {
    if (xp !== achievementXp[kind])
      context.addIssue({
        code: 'custom',
        path: ['xp'],
        message: 'Unexpected XP for this achievement.',
      });
    const validSource =
      kind === 'weekly-journal'
        ? isoDateSchema.safeParse(sourceKey).success &&
          new Date(sourceKey).getUTCDay() === 1
        : sourceKey === 'once';
    if (!validSource)
      context.addIssue({
        code: 'custom',
        path: ['sourceKey'],
        message: 'Unexpected source for this achievement.',
      });
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
