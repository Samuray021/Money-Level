import { domainEventTypeSchema, uuidSchema } from '@money-level/contracts';
import { z } from 'zod';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const message = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[^<>]*$/u);
export const memeEmotionSchema = z.enum([
  'idle',
  'happy',
  'surprised',
  'sarcastic',
  'celebrating',
  'sleeping',
]);

const ruleSchema = z.strictObject({
  id: slug,
  triggers: z
    .array(domainEventTypeSchema)
    .min(1)
    .max(domainEventTypeSchema.options.length),
  tags: z.array(slug).min(1).max(16),
  predicates: z
    .strictObject({
      categoryIds: z.array(uuidSchema).min(1).max(100).optional(),
      amountBand: z.enum(['small', 'medium', 'large']).optional(),
    })
    .optional(),
  text: z.strictObject({ 'ru-RU': message, 'en-US': message.optional() }),
  fallbackText: message,
  modes: z
    .array(z.enum(['neutral', 'roast', 'chaos']))
    .min(1)
    .max(3),
  profanity: z.boolean(),
  weight: z.int().min(1).max(1000),
  rarity: z.enum(['normal', 'rare']),
  emotion: memeEmotionSchema,
  cooldownMs: z.int().min(0).max(2_592_000_000).default(604_800_000),
  displayMs: z.int().min(500).max(2500).default(2200),
  assetKey: slug.optional(),
});

export const memePackSchema = z
  .strictObject({
    id: slug,
    version: z
      .string()
      .max(40)
      .regex(/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/),
    locale: z.literal('ru-RU'),
    rules: z.array(ruleSchema).min(1).max(200),
    disabledRuleIds: z.array(slug).max(200).default([]),
  })
  .superRefine(({ rules, disabledRuleIds }, context) => {
    const ids = new Set<string>();
    for (const [index, rule] of rules.entries()) {
      if (ids.has(rule.id))
        context.addIssue({
          code: 'custom',
          message: 'Duplicate rule ID.',
          path: ['rules', index, 'id'],
        });
      ids.add(rule.id);
    }
    const disabled = new Set<string>();
    for (const [index, id] of disabledRuleIds.entries()) {
      if (!ids.has(id) || disabled.has(id))
        context.addIssue({
          code: 'custom',
          message: 'Use a unique ID of an existing rule.',
          path: ['disabledRuleIds', index],
        });
      disabled.add(id);
    }
  });

export function getMemePackJsonSchema() {
  return z.toJSONSchema(memePackSchema, { io: 'input' });
}

export type MemePack = z.infer<typeof memePackSchema>;
export type MemeRule = z.infer<typeof ruleSchema>;
export type MemeEmotion = z.infer<typeof memeEmotionSchema>;
