import {
  addExpense,
  addIncome,
  deleteTransaction,
  transfer,
  updateTransaction,
} from '@money-level/application';
import {
  createOpeningEntry,
  selectAccountBalance,
  selectTotalBalance,
} from '@money-level/finance-core';
import { expect, test } from 'vitest';
import {
  account,
  category,
  commandFixture,
  exampleId,
  instant,
  salary,
} from './fixtures.js';

const day = '2026-11-01';
const cash = {
  ...account,
  id: exampleId(11),
  name: 'Наличные',
  kind: 'cash' as const,
};
const shopping = { ...category, id: exampleId(12), name: 'Покупки' };

test('TC-FIN-001 through TC-FIN-003: real journal commands match the expected account and total balances', async () => {
  const { storage, context } = await commandFixture();
  try {
    await storage.write(async (journal) => {
      await journal.accounts.put(cash);
      await journal.categories.put(shopping);
      await journal.transactions.put(
        createOpeningEntry(account, {
          id: exampleId(20),
          amountMinor: '1000000',
          transactionDate: day,
          createdAt: instant,
        }),
      );
      await journal.transactions.put(
        createOpeningEntry(cash, {
          id: exampleId(21),
          amountMinor: '0',
          transactionDate: day,
          createdAt: instant,
        }),
      );
    });

    const fields = { accountId: account.id, transactionDate: day };
    await addIncome(context, {
      ...fields,
      categoryId: salary.id,
      amountMinor: '5000000',
      idempotencyKey: 'november-salary',
    });
    await addExpense(context, {
      ...fields,
      categoryId: category.id,
      amountMinor: '30000',
      idempotencyKey: 'november-food',
    });
    const purchase = await addExpense(context, {
      ...fields,
      categoryId: shopping.id,
      amountMinor: '100000',
      idempotencyKey: 'november-shopping',
    });
    await transfer(context, {
      ...fields,
      toAccountId: cash.id,
      amountMinor: '1000000',
      idempotencyKey: 'cash-withdrawal',
    });

    const balances = () =>
      storage.read(async (journal) => {
        const transactions = await journal.transactions.list();
        return {
          card: selectAccountBalance(transactions, account.id),
          cash: selectAccountBalance(transactions, cash.id),
          total: selectTotalBalance(
            await journal.accounts.list(),
            transactions,
          ),
        };
      });
    expect(await balances()).toEqual({
      card: '4870000',
      cash: '1000000',
      total: '5870000',
    });

    await transfer(context, {
      ...fields,
      toAccountId: cash.id,
      amountMinor: '200000',
      idempotencyKey: 'second-cash-withdrawal',
    });
    expect(await balances()).toEqual({
      card: '4670000',
      cash: '1200000',
      total: '5870000',
    });

    await deleteTransaction(context, purchase.id);
    expect((await balances()).total).toBe('5970000');
    await deleteTransaction(context, purchase.id);
    expect((await balances()).total).toBe('5970000');
  } finally {
    storage.close();
  }
});

test('TC-FIN-005: an idempotency key still recognizes a saved command after reopening IndexedDB', async () => {
  const { storage, context, open } = await commandFixture();
  const input = {
    accountId: account.id,
    categoryId: category.id,
    transactionDate: day,
    amountMinor: '30000',
    idempotencyKey: 'reopened-expense',
  };
  let id: string;
  try {
    id = (await addExpense(context, input)).id;
  } finally {
    storage.close();
  }

  const reopened = open();
  try {
    const repeated = await addExpense({ ...context, storage: reopened }, input);
    expect(repeated.id).toBe(id);
    await reopened.read(async (journal) => {
      const transactions = await journal.transactions.list();
      expect(transactions).toEqual([repeated]);
      expect(selectAccountBalance(transactions, account.id)).toBe('-30000');
      expect(await journal.outbox.list()).toHaveLength(1);
    });
  } finally {
    reopened.close();
  }
});

test('TC-FIN-006: creation and edit timestamps preserve the local operation dates on either side of a month boundary', async () => {
  const { context, storage } = await commandFixture();
  try {
    const fields = {
      accountId: account.id,
      categoryId: category.id,
      amountMinor: '30000',
    };
    const october = await addExpense(context, {
      ...fields,
      transactionDate: '2026-10-31',
      idempotencyKey: 'october-expense',
    });
    const november = await addExpense(context, {
      ...fields,
      transactionDate: day,
      idempotencyKey: 'november-expense',
    });
    const editor = {
      ...context,
      clock: { now: () => new Date('2026-12-01T09:00:00.000Z') },
    };
    await updateTransaction(editor, october.id, { note: 'Late annotation' });
    await updateTransaction(editor, november.id, { note: 'Late annotation' });

    await storage.read(async (journal) => {
      expect(await journal.transactions.get(october.id)).toMatchObject({
        transactionDate: '2026-10-31',
        createdAt: instant,
        updatedAt: '2026-12-01T09:00:00.000Z',
      });
      expect(await journal.transactions.get(november.id)).toMatchObject({
        transactionDate: day,
        createdAt: instant,
        updatedAt: '2026-12-01T09:00:00.000Z',
      });
    });
  } finally {
    storage.close();
  }
});
