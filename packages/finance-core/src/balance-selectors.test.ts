import { expect, test } from 'vitest';
import {
  accountInput,
  entryInput,
  expenseInput,
  instant,
  otherAccountId,
  transferInput,
} from './fixtures.js';
import {
  selectAccountBalance,
  selectTotalBalance,
  transactionSchema,
} from './index.js';

const cash = {
  ...accountInput,
  id: otherAccountId,
  name: 'Наличные',
  kind: 'cash' as const,
  archived: true,
};
const accounts = [accountInput, cash];
const baseTransactions = [
  { ...entryInput, kind: 'opening', amountMinor: '1000000' },
  { ...entryInput, kind: 'opening', accountId: cash.id, amountMinor: '0' },
  { ...expenseInput, kind: 'income', amountMinor: '5000000' },
  { ...expenseInput, amountMinor: '30000' },
  { ...expenseInput, amountMinor: '100000' },
  { ...transferInput, amountMinor: '1000000' },
].map((input, index) =>
  transactionSchema.parse({
    ...input,
    id: 'd0000000-0000-4000-8000-' + String(index).padStart(12, '0'),
  }),
);

test('TC-FIN-001: the journal balance matches for each account and in aggregate, including archived accounts', () => {
  expect(selectAccountBalance(baseTransactions, accountInput.id)).toBe(
    '4870000',
  );
  expect(selectAccountBalance(baseTransactions, cash.id)).toBe('1000000');
  expect(selectTotalBalance(accounts, baseTransactions)).toBe('5870000');
});

test('TC-FIN-002: moving another 2,000 RUB leaves the total unchanged', () => {
  const extra = { ...transferInput, amountMinor: '200000' };
  const transactions = [...baseTransactions, extra];

  expect(selectAccountBalance(transactions, accountInput.id)).toBe('4670000');
  expect(selectAccountBalance(transactions, cash.id)).toBe('1200000');
  expect(selectTotalBalance(accounts, transactions)).toBe('5870000');
});

test('total excludes deleted accounts and postings from deleted journal entries', () => {
  expect(
    selectTotalBalance(
      [{ ...accountInput, deletedAt: instant }, cash],
      baseTransactions,
    ),
  ).toBe('1000000');
  expect(
    selectTotalBalance(accounts, [
      ...baseTransactions,
      { ...expenseInput, deletedAt: instant },
    ]),
  ).toBe('5870000');
});
