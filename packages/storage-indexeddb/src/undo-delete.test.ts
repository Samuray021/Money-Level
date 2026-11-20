import {
  addExpense,
  deleteTransaction,
  undoDeleteTransaction,
  undoDeleteWindowMs,
} from '@money-level/application';
import { selectAccountBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { account, category, commandFixture, day, instant } from './fixtures.js';

test('restores only the matching deletion and only once within the time window', async () => {
  const { context, storage } = await commandFixture();
  let now = Date.parse(instant);
  const timed = { ...context, clock: { now: () => new Date(now) } };
  try {
    const original = await addExpense(timed, {
      idempotencyKey: 'undo-expense',
      accountId: account.id,
      categoryId: category.id,
      transactionDate: day,
      amountMinor: '30000',
    });
    const current = () =>
      storage.read((journal) => journal.transactions.get(original.id));
    await deleteTransaction(timed, original.id);
    const first = (await current())?.deletedAt;
    if (!first) throw new Error('Expected a deletion timestamp.');

    const undo = () => undoDeleteTransaction(timed, original.id, first);
    expect(await Promise.all([undo(), undo()])).toEqual([true, false]);
    expect((await current())?.deletedAt).toBeUndefined();
    expect(
      selectAccountBalance(
        await storage.read((journal) => journal.transactions.list()),
        account.id,
      ),
    ).toBe('-30000');

    await deleteTransaction(timed, original.id);
    const second = (await current())?.deletedAt;
    if (!second) throw new Error('Expected a second deletion timestamp.');
    expect(second).not.toBe(first);
    expect(await undo()).toBe(false);

    now = Date.parse(second) + undoDeleteWindowMs;
    expect(await undoDeleteTransaction(timed, original.id, second)).toBe(false);
    expect((await current())?.deletedAt).toBe(second);
    expect(
      (await storage.read((journal) => journal.outbox.list())).filter(
        ({ type }) => type === 'transaction.restored',
      ),
    ).toHaveLength(1);
  } finally {
    storage.close();
  }
});
