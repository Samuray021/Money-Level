import { isoDateTimeSchema, uuidSchema } from '@money-level/contracts';
import { z } from 'zod';

export const achievementKindSchema = z.enum([
  'first-operation',
  'weekly-journal',
  'first-goal',
  'first-backup',
]);
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
