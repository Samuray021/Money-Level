import { createSeededRandom } from '@money-level/contracts';
import { expect, test } from 'vitest';
import { buildRoastCards } from './index.js';

const data = {
  expenseMinor: '9007199254740993',
  priorExpenseMinor: '100',
  expenseCount: 5,
  leadingCategory: { name: 'Еда', amountMinor: '20000' },
};

test('cards are reproducible and preserve input evidence exactly', () => {
  const cards = buildRoastCards(data, 'roast', createSeededRandom(42));
  expect(cards).toEqual(buildRoastCards(data, 'roast', createSeededRandom(42)));
  expect(cards).toHaveLength(4);
  expect(cards).toMatchObject([
    { kind: 'total', amountMinor: data.expenseMinor },
    { kind: 'frequency', count: 5 },
    { kind: 'category', category: 'Еда', amountMinor: '20000' },
    { kind: 'comparison', currentMinor: data.expenseMinor, priorMinor: '100' },
  ]);
  expect(cards.every(({ formula }) => formula.length > 10)).toBe(true);
});

test('empty reports and a zero comparison base cannot produce invented figures', () => {
  const random = createSeededRandom(1);
  expect(
    buildRoastCards(
      { ...data, expenseCount: 0, expenseMinor: '0' },
      'off',
      random,
    ),
  ).toMatchObject([{ kind: 'empty' }]);
  expect(
    buildRoastCards({ ...data, priorExpenseMinor: '0' }, 'roast', random).at(-1)
      ?.kind,
  ).toBe('no-baseline');
});
