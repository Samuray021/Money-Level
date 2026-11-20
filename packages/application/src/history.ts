import { summarizeCashFlow } from '@money-level/analytics';
import type { PeriodTotals } from '@money-level/analytics';
import { isoDateSchema, uuidSchema } from '@money-level/contracts';
import type { ISODate } from '@money-level/contracts';
import type { Account, Category, Transaction } from '@money-level/finance-core';
import type { UnitOfWork } from './journal-repository.js';

export interface HistoryEntry {
  transaction: Transaction;
  account: Account | undefined;
  destination: Account | undefined;
  category: Category | undefined;
}

export interface HistoryDay {
  date: ISODate;
  totals: PeriodTotals;
  entries: HistoryEntry[];
}

export function compareHistoryEntries(
  left: Transaction,
  right: Transaction,
): number {
  return (
    right.transactionDate.localeCompare(left.transactionDate) ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export interface HistoryFilters {
  kind?: string;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  note?: string;
}

export function filterHistoryEntries(
  transactions: readonly Transaction[],
  filters: HistoryFilters,
): Transaction[] {
  const note = filters.note?.trim().normalize('NFC').toLocaleLowerCase('ru-RU');
  const from = filters.from ? isoDateSchema.parse(filters.from) : undefined;
  const to = filters.to ? isoDateSchema.parse(filters.to) : undefined;
  if (from && to && from > to) return [];

  return transactions.filter((transaction) => {
    if (transaction.deletedAt) return false;
    if (
      filters.kind
        ? transaction.kind !== filters.kind
        : transaction.kind === 'opening' || transaction.kind === 'adjustment'
    )
      return false;
    if (
      filters.accountId &&
      transaction.accountId !== filters.accountId &&
      (transaction.kind !== 'transfer' ||
        transaction.toAccountId !== filters.accountId)
    )
      return false;
    if (
      filters.categoryId &&
      ((transaction.kind !== 'income' && transaction.kind !== 'expense') ||
        transaction.categoryId !== filters.categoryId)
    )
      return false;
    if (from && transaction.transactionDate < from) return false;
    if (to && transaction.transactionDate > to) return false;
    return (
      !note ||
      !!transaction.note
        ?.normalize('NFC')
        .toLocaleLowerCase('ru-RU')
        .includes(note)
    );
  });
}

export function getHistory(storage: UnitOfWork, filters: HistoryFilters = {}) {
  return storage.read(async (journal) => {
    const accounts = new Map(
      (await journal.accounts.list()).map((account) => [account.id, account]),
    );
    const categories = new Map(
      (await journal.categories.list()).map((category) => [
        category.id,
        category,
      ]),
    );
    const transactions = filterHistoryEntries(
      await journal.transactions.list(),
      filters,
    ).sort(compareHistoryEntries);
    const days = new Map<ISODate, HistoryEntry[]>();
    for (const transaction of transactions) {
      let entries = days.get(transaction.transactionDate);
      if (!entries) {
        entries = [];
        days.set(transaction.transactionDate, entries);
      }
      entries.push({
        transaction,
        account: accounts.get(transaction.accountId),
        destination:
          transaction.kind === 'transfer'
            ? accounts.get(transaction.toAccountId)
            : undefined,
        category:
          transaction.kind === 'income' || transaction.kind === 'expense'
            ? categories.get(transaction.categoryId)
            : undefined,
      });
    }
    return {
      accounts: [...accounts.values()],
      categories: [...categories.values()],
      days: Array.from(days, ([date, entries]): HistoryDay => ({
        date,
        entries,
        totals: summarizeCashFlow(
          entries.map(({ transaction }) => transaction),
        ),
      })),
    };
  });
}

export async function getHistoryDetail(
  storage: UnitOfWork,
  id: string | undefined,
): Promise<HistoryEntry | undefined> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return undefined;
  return storage.read(async (journal) => {
    const transaction = await journal.transactions.get(parsed.data);
    if (!transaction || transaction.deletedAt) return undefined;

    return {
      transaction,
      account: await journal.accounts.get(transaction.accountId),
      destination:
        transaction.kind === 'transfer'
          ? await journal.accounts.get(transaction.toAccountId)
          : undefined,
      category:
        transaction.kind === 'income' || transaction.kind === 'expense'
          ? await journal.categories.get(transaction.categoryId)
          : undefined,
    };
  });
}
