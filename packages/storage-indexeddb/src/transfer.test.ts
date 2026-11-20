import { transfer } from '@money-level/application';
import {
  selectAccountBalance,
  selectTotalBalance,
} from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { account, commandFixture, day, exampleId } from './fixtures.js';

const cash = {
  ...account,
  id: exampleId(11),
  kind: 'cash' as const,
  name: 'Наличные',
};
const input = {
  idempotencyKey: 'transfer',
  accountId: account.id,
  toAccountId: cash.id,
  amountMinor: '5000',
  transactionDate: day,
};

test('validates both accounts in the atomic transfer, which writes a single entry', async () => {
  const { context, storage } = await commandFixture();

  try {
    await expect(transfer(context, input)).rejects.toThrow(RangeError);
    await expect(
      transfer(context, { ...input, toAccountId: account.id }),
    ).rejects.toThrow();
    await storage.write((journal) =>
      journal.accounts.put({ ...cash, currencyCode: 'USD' }),
    );
    await expect(transfer(context, input)).rejects.toThrow(RangeError);

    await storage.read(async (journal) => {
      expect(await journal.transactions.list()).toEqual([]);
      expect(await journal.outbox.list()).toEqual([]);
      expect(await journal.commands.get(input.idempotencyKey)).toBeUndefined();
    });
    await storage.write((journal) => journal.accounts.put(cash));

    const first = await transfer(context, input);
    expect(await transfer(context, input)).toEqual(first);
    await storage.read(async (journal) => {
      const transactions = await journal.transactions.list();
      expect(transactions).toEqual([first]);
      expect(selectAccountBalance(transactions, account.id)).toBe('-5000');
      expect(selectAccountBalance(transactions, cash.id)).toBe('5000');
      expect(
        selectTotalBalance(await journal.accounts.list(), transactions),
      ).toBe('0');
      expect(await journal.outbox.list()).toMatchObject([
        { type: 'transaction.transfer.created' },
      ]);
    });
  } finally {
    storage.close();
  }
});
