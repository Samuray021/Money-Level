import { expect, test } from 'vitest';
import { instant, transferInput } from './fixtures.js';
import {
  addMinorUnits,
  getBalancePostings,
  reduceAccountBalance,
  transactionSchema,
} from './index.js';

test('one transfer yields two offsetting balance postings, with no income or expense category', () => {
  const transfer = transactionSchema.parse(transferInput);
  const postings = getBalancePostings(transfer);
  expect(postings).toEqual([
    { accountId: transferInput.accountId, deltaMinor: '-45050' },
    { accountId: transferInput.toAccountId, deltaMinor: '45050' },
  ]);
  expect(
    postings.reduce(
      (sum, { deltaMinor }) => addMinorUnits(sum, deltaMinor),
      '0',
    ),
  ).toBe('0');
  expect(transfer.kind).toBe('transfer');
  expect(transfer).not.toHaveProperty('categoryId');

  expect(
    reduceAccountBalance('100000', transfer, transferInput.accountId),
  ).toBe('54950');
  expect(
    reduceAccountBalance('200000', transfer, transferInput.toAccountId),
  ).toBe('245050');
  expect(getBalancePostings({ ...transfer, deletedAt: instant })).toEqual([]);
});

test('UUID casing cannot disguise a transfer to the same account', () => {
  expect(
    transactionSchema.safeParse({
      ...transferInput,
      toAccountId: transferInput.accountId.toUpperCase(),
    }).success,
  ).toBe(false);
});
