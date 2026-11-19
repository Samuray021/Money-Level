import { addExpense, addIncome } from '@money-level/application';
import { selectAccountBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { account, category, commandFixture, day, salary } from './fixtures.js';

test('a repeated expense debits once and does not share its receipt with an income', async () => {
  const { context, storage } = await commandFixture();
  const input = {
    idempotencyKey: 'add-expense',
    accountId: account.id,
    categoryId: category.id,
    amountMinor: '1500',
    transactionDate: day,
  };
  try {
    const first = await addExpense(context, input);
    expect(await addExpense(context, input)).toEqual(first);
    await expect(
      addIncome(context, { ...input, categoryId: salary.id }),
    ).rejects.toThrow(RangeError);

    await storage.read(async (journal) => {
      const transactions = await journal.transactions.list();
      expect(transactions).toEqual([first]);
      expect(selectAccountBalance(transactions, account.id)).toBe('-1500');
      expect(await journal.outbox.list()).toMatchObject([
        { type: 'transaction.expense.created' },
      ]);
    });
  } finally {
    storage.close();
  }
});
