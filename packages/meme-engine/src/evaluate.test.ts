import { createSeededRandom } from '@money-level/contracts';
import type { DomainEvent } from '@money-level/contracts';
import { expect, test } from 'vitest';
import { samplePack, sampleRule } from './fixtures.js';
import { evaluateMeme, memePackSchema } from './index.js';

const categoryId = 'd0000000-0000-4000-8000-000000000001';
const event: DomainEvent = {
  eventId: 'd0000000-0000-4000-8000-000000000002',
  sourceEntityId: 'd0000000-0000-4000-8000-000000000003',
  version: 1,
  type: 'transaction.expense.created',
  occurredAt: '2026-11-19T12:00:00Z',
  payload: { categoryId, amountBand: 'small' },
};
const base = {
  event,
  mode: 'roast',
  profanity: false,
  locale: 'ru-RU',
} as const;
const pack = memePackSchema.parse({
  ...samplePack,
  rules: [
    sampleRule,
    {
      ...sampleRule,
      id: 'selected',
      weight: 3,
      predicates: { categoryIds: [categoryId], amountBand: 'small' },
    },
    { ...sampleRule, id: 'restricted', weight: 1000, profanity: true },
  ],
});

test('selection is reproducible and respects weights, triggers and predicates', () => {
  expect(
    evaluateMeme(pack, { ...base, random: { next: () => 0.2499 } })?.ruleId,
  ).toBe('expense-small');
  expect(
    evaluateMeme(pack, { ...base, random: { next: () => 0.25 } })?.ruleId,
  ).toBe('selected');
  const sample = () => {
    const random = createSeededRandom(42);
    return Array.from(
      { length: 10 },
      () => evaluateMeme(pack, { ...base, random })?.ruleId,
    );
  };
  expect(sample()).toEqual(sample());
  expect(
    evaluateMeme(pack, {
      ...base,
      event: { ...event, payload: {} },
      random: { next: () => 0.9 },
    })?.ruleId,
  ).toBe('expense-small');
  expect(
    evaluateMeme(pack, {
      ...base,
      mode: 'off',
      random: createSeededRandom(42),
    }),
  ).toBeUndefined();
});

test('honors global and per-rule cooldowns with an injected clock', () => {
  const now = Date.parse(event.occurredAt);
  const clock = { now: () => new Date(now) };
  const history = (elapsed: number) => [
    {
      shownAt: new Date(now - elapsed).toISOString(),
      packId: pack.id,
      ruleId: 'selected',
      sessionId: 'test-session',
      rarity: 'normal' as const,
    },
  ];
  const input = { ...base, clock, random: { next: () => 0.8 } };
  expect(
    evaluateMeme(pack, { ...input, history: history(89_999) }),
  ).toBeUndefined();
  expect(
    evaluateMeme(pack, { ...input, history: history(90_000) })?.ruleId,
  ).toBe('expense-small');
  expect(
    evaluateMeme(pack, { ...input, history: history(604_800_000) })?.ruleId,
  ).toBe('selected');
  expect(evaluateMeme(pack, { ...input, frequency: 'rare' })).toBeUndefined();
  expect(evaluateMeme(pack, { ...input, frequency: 'off' })).toBeUndefined();
});

test('a rare scene uses the 1% boundary and can be selected at most once per session', () => {
  const scenes = memePackSchema.parse({
    ...samplePack,
    rules: [
      sampleRule,
      { ...sampleRule, id: 'rare-scene', rarity: 'rare', cooldownMs: 0 },
    ],
  });
  const clock = { now: () => new Date(event.occurredAt) };
  const input = { ...base, clock, sessionId: 'current' };
  expect(
    evaluateMeme(scenes, { ...input, random: { next: () => 0.009 } })?.rarity,
  ).toBe('rare');
  expect(
    evaluateMeme(scenes, { ...input, random: { next: () => 0.01 } })?.rarity,
  ).toBe('normal');
  expect(
    evaluateMeme(scenes, {
      ...input,
      random: { next: () => 0 },
      history: [
        {
          packId: scenes.id,
          ruleId: 'rare-scene',
          shownAt: '2026-11-17T12:00:00Z',
          sessionId: 'current',
          rarity: 'rare',
        },
      ],
    })?.rarity,
  ).toBe('normal');
});
