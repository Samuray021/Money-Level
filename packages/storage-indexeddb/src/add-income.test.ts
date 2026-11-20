import { addIncome } from '@money-level/application';
import { selectAccountBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { account, category, commandFixture, day, salary } from './fixtures.js';

const input = {
  idempotencyKey: 'add-income',
  accountId: account.id,
  categoryId: salary.id,
  amountMinor: '50000',
  transactionDate: day,
};

test('concurrent requests across connections record an income and outbox event only once', async () => {
  const { context, open, storage } = await commandFixture();
  const parallel = open();
  try {
    const [first, repeated] = await Promise.all([
      addIncome(context, input),
      addIncome({ ...context, storage: parallel }, input),
    ]);
    expect(first).toEqual(repeated);

    await storage.read(async (journal) => {
      const transactions = await journal.transactions.list();
      expect(transactions).toEqual([first]);
      expect(selectAccountBalance(transactions, account.id)).toBe('50000');
      expect(await journal.outbox.list()).toMatchObject([
        { type: 'transaction.income.created' },
      ]);
    });
  } finally {
    parallel.close();
    storage.close();
  }
});

test('a rejected income leaves the same key available for a corrected command', async () => {
  const { context, storage } = await commandFixture();
  try {
    await expect(
      addIncome(context, { ...input, categoryId: category.id }),
    ).rejects.toThrow(RangeError);
    await storage.read(async (journal) => {
      expect(await journal.commands.get(input.idempotencyKey)).toBeUndefined();
      expect(await journal.outbox.list()).toEqual([]);
    });
    await expect(addIncome(context, input)).resolves.toMatchObject({
      kind: 'income',
    });
  } finally {
    storage.close();
  }
});
