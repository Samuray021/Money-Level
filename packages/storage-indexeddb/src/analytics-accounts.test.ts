import {
  addExpense,
  addIncome,
  getAnalyticsReport,
  transfer,
} from '@money-level/application';
import { createOpeningEntry } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import {
  account,
  category,
  commandFixture,
  exampleId,
  instant,
  salary,
} from './fixtures.js';

test('account scope applies consistently to calendar totals, categories, chart and comparison', async () => {
  const { context, storage } = await commandFixture();
  const cash = {
    ...account,
    id: exampleId(20),
    name: 'Наличные',
    archived: false,
    sortOrder: 2,
  };
  const food = category;
  const transport = { ...category, id: exampleId(21), name: 'Транспорт' };
  try {
    await storage.write(async (journal) => {
      await journal.accounts.put(cash);
      await journal.categories.put(transport);
      await journal.transactions.put(
        createOpeningEntry(account, {
          id: exampleId(22),
          amountMinor: '100000',
          transactionDate: '2026-10-01',
          createdAt: instant,
        }),
      );
    });
    await addIncome(context, {
      accountId: account.id,
      categoryId: salary.id,
      amountMinor: '9000',
      transactionDate: '2026-11-01',
      idempotencyKey: 'salary',
    });
    const debit = (
      key: string,
      accountId: string,
      categoryId: string,
      transactionDate: string,
      amountMinor: string,
    ) =>
      addExpense(context, {
        accountId,
        categoryId,
        transactionDate,
        amountMinor,
        idempotencyKey: key,
      });
    await debit('october-card', account.id, food.id, '2026-10-31', '2001');
    await debit('october-cash', cash.id, transport.id, '2026-10-31', '443');
    await debit('november-card', account.id, food.id, '2026-11-01', '5002');
    await debit('november-cash', cash.id, transport.id, '2026-11-30', '1712');
    await debit('december-card', account.id, food.id, '2026-12-01', '987');
    await transfer(context, {
      accountId: account.id,
      toAccountId: cash.id,
      amountMinor: '2300',
      transactionDate: '2026-11-10',
      idempotencyKey: 'cash',
    });
    await storage.write((journal) =>
      journal.accounts.put({ ...cash, archived: true }),
    );

    const before = await storage.read((journal) => journal.transactions.list());
    const all = await getAnalyticsReport(storage, '2026-11');
    expect(all.totals).toEqual({
      incomeMinor: '9000',
      expenseMinor: '6714',
      netMinor: '2286',
    });
    expect(all.previousTotals.expenseMinor).toBe('2444');

    const card = await getAnalyticsReport(storage, '2026-11', account.id);
    expect(card.totals).toEqual({
      incomeMinor: '9000',
      expenseMinor: '5002',
      netMinor: '3998',
    });
    expect(card.previousTotals.expenseMinor).toBe('2001');
    expect(card.byCategory).toEqual([
      { categoryId: food.id, name: food.name, amountMinor: '5002' },
    ]);
    expect(card.daily.filter(({ amountMinor }) => amountMinor !== '0')).toEqual(
      [{ date: '2026-11-01', amountMinor: '5002' }],
    );

    const archived = await getAnalyticsReport(storage, '2026-11', cash.id);
    expect(archived.accounts).toContainEqual({
      id: cash.id,
      name: cash.name,
      archived: true,
    });
    expect(archived.totals).toEqual({
      incomeMinor: '0',
      expenseMinor: '1712',
      netMinor: '-1712',
    });
    expect(archived.previousTotals.expenseMinor).toBe('443');
    expect(archived.byCategory[0]?.name).toBe(transport.name);
    expect(archived.daily.at(-1)?.amountMinor).toBe('1712');

    const empty = await getAnalyticsReport(storage, '2027-01', cash.id);
    expect(empty.totals).toEqual({
      incomeMinor: '0',
      expenseMinor: '0',
      netMinor: '0',
    });
    expect(empty.previousTotals.expenseMinor).toBe('0');
    expect(empty.byCategory).toEqual([]);
    expect(empty.daily.every(({ amountMinor }) => amountMinor === '0')).toBe(
      true,
    );
    expect(
      await storage.read((journal) => journal.transactions.list()),
    ).toEqual(before);
  } finally {
    storage.close();
  }
});
