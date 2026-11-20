import { expect, test } from 'vitest';
import {
  accountInput,
  categoryInput,
  expenseInput,
  instant,
  otherAccountId,
  transferInput,
} from './fixtures.js';
import { assertTransactionReferences } from './index.js';

const otherAccount = {
  ...accountInput,
  id: otherAccountId,
  kind: 'cash' as const,
};
const references = {
  baseCurrency: 'RUB',
  accounts: [accountInput, otherAccount],
  categories: [categoryInput],
};

test('accepts valid linked and archived historical accounts and categories', () => {
  expect(() =>
    assertTransactionReferences(transferInput, references),
  ).not.toThrow();
  expect(() =>
    assertTransactionReferences(expenseInput, {
      ...references,
      accounts: [{ ...accountInput, archived: true }],
      categories: [{ ...categoryInput, archived: true }],
    }),
  ).not.toThrow();
});

test('rejects absent accounts, different currencies and deleted records', () => {
  expect(() =>
    assertTransactionReferences(transferInput, {
      ...references,
      accounts: [accountInput],
    }),
  ).toThrow(RangeError);
  expect(() =>
    assertTransactionReferences(transferInput, {
      ...references,
      accounts: [accountInput, { ...otherAccount, currencyCode: 'USD' }],
    }),
  ).toThrow(RangeError);
  expect(() =>
    assertTransactionReferences(expenseInput, {
      ...references,
      accounts: [{ ...accountInput, deletedAt: instant }],
    }),
  ).toThrow(RangeError);
  expect(() =>
    assertTransactionReferences(
      { ...transferInput, currencyCode: 'USD' },
      references,
    ),
  ).toThrow(RangeError);
});

test('requires an existing category of the matching type', () => {
  expect(() =>
    assertTransactionReferences(expenseInput, {
      ...references,
      categories: [],
    }),
  ).toThrow(RangeError);
  expect(() =>
    assertTransactionReferences(expenseInput, {
      ...references,
      categories: [{ ...categoryInput, type: 'income' }],
    }),
  ).toThrow(RangeError);
});
