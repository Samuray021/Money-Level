import { expect, test } from 'vitest';
import {
  accountId,
  entryInput,
  expenseInput,
  instant,
  otherAccountId,
} from './fixtures.js';
import { reduceAccountBalance } from './index.js';

test('applies signed openings and adjustments and the correct signs for income and expense', () => {
  expect(
    reduceAccountBalance(
      '0',
      { ...entryInput, kind: 'opening', amountMinor: '100' },
      accountId,
    ),
  ).toBe('100');
  expect(
    reduceAccountBalance(
      '100',
      { ...expenseInput, kind: 'income', amountMinor: '60' },
      accountId,
    ),
  ).toBe('160');
  expect(
    reduceAccountBalance(
      '160',
      { ...expenseInput, amountMinor: '55' },
      accountId,
    ),
  ).toBe('105');
  expect(
    reduceAccountBalance(
      '105',
      { ...entryInput, kind: 'adjustment', amountMinor: '-106' },
      accountId,
    ),
  ).toBe('-1');
});

test('leaves the balance unchanged for deleted and unrelated transactions', () => {
  expect(
    reduceAccountBalance(
      '100',
      { ...expenseInput, deletedAt: instant },
      accountId,
    ),
  ).toBe('100');
  expect(reduceAccountBalance('100', expenseInput, otherAccountId)).toBe('100');
});
