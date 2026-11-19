import { expect, test } from 'vitest';
import { getMemePackJsonSchema, memePackSchema } from './index.js';

export const sampleRule = {
  id: 'expense-small',
  triggers: ['transaction.expense.created'],
  tags: ['expense'],
  text: { 'ru-RU': 'Расход записан.' },
  fallbackText: 'Готово.',
  modes: ['neutral', 'roast', 'chaos'],
  profanity: false,
  weight: 1,
  rarity: 'normal',
  emotion: 'idle',
} as const;
export const samplePack = {
  id: 'default',
  version: '1.0.0',
  locale: 'ru-RU',
  rules: [sampleRule],
};

test('exports a JSON schema and rejects unsafe packs before evaluation', () => {
  expect(getMemePackJsonSchema()).toMatchObject({
    type: 'object',
    properties: { rules: { type: 'array' } },
  });
  expect(memePackSchema.parse(samplePack).rules[0]).toMatchObject({
    cooldownMs: 604_800_000,
  });
  for (const rule of [
    { ...sampleRule, assetKey: '../../files' },
    { ...sampleRule, assetKey: 'https://example.com/image' },
    { ...sampleRule, text: { 'ru-RU': '<script>' } },
    { ...sampleRule, weight: 0 },
    { ...sampleRule, triggers: ['unknown'] },
  ]) {
    expect(
      memePackSchema.safeParse({ ...samplePack, rules: [rule] }).success,
    ).toBe(false);
  }
  expect(
    memePackSchema.safeParse({ ...samplePack, rules: [sampleRule, sampleRule] })
      .success,
  ).toBe(false);
});
