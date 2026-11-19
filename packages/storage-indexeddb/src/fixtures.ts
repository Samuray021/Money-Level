import type { Account, Category, Transaction } from '@money-level/finance-core';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { IndexedDbJournal } from './index.js';

export const instant = '2026-11-19T12:00:00.000Z';
export const day = '2026-11-19';

export function exampleId(sequence: number): string {
  return 'd0000000-0000-4000-8000-' + String(sequence).padStart(12, '0');
}

export const account = {
  id: exampleId(1),
  name: 'Карта',
  kind: 'card',
  currencyCode: 'RUB',
  archived: false,
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
} as const satisfies Account;

export const category = {
  id: exampleId(2),
  name: 'Еда',
  type: 'expense',
  icon: 'food',
  archived: false,
  createdAt: instant,
  updatedAt: instant,
} as const satisfies Category;

export const expense = {
  id: exampleId(3),
  accountId: account.id,
  categoryId: category.id,
  kind: 'expense',
  amountMinor: '1500',
  currencyCode: 'RUB',
  transactionDate: day,
  createdAt: instant,
  updatedAt: instant,
} as const satisfies Transaction;

export function journalFixture() {
  const indexedDB = new IDBFactory();
  const dependencies = { indexedDB, IDBKeyRange };
  const open = () => new IndexedDbJournal('money-level-test', dependencies);
  return { open, dependencies };
}
