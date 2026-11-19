import { expect, test } from 'vitest';
import { getMemePackJsonSchema, memePackSchema } from './index.js';

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
