import { expect, test } from 'vitest';
import {
  defaultMemePack,
  getMemePackJsonSchema,
  memePackSchema,
} from './index.js';

import { samplePack, sampleRule } from './fixtures.js';

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

test('the bundled Russian pack includes original, tagged reactions and clean fallbacks', () => {
  expect(defaultMemePack.rules.length).toBeGreaterThanOrEqual(20);
  expect(defaultMemePack.rules.length).toBeLessThanOrEqual(30);
  expect(defaultMemePack.locale).toBe('ru-RU');
  for (const rule of defaultMemePack.rules) {
    expect(rule.tags.length).toBeGreaterThan(0);
    expect(rule.fallbackText).not.toMatch(/блядь|ёбаный/i);
  }
  expect(defaultMemePack.rules.some((rule) => rule.rarity === 'rare')).toBe(
    true,
  );
  expect(defaultMemePack.rules.some((rule) => rule.profanity)).toBe(true);
});
