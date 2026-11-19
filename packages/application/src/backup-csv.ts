import { currencyAmountForInput } from '@money-level/finance-core';
import { compareHistoryEntries } from './history.js';
import type { UnitOfWork } from './journal-repository.js';

function quote(value: string, untrustedText = false): string {
  const safe =
    untrustedText && /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function exportTransactionsCsv(storage: UnitOfWork): Promise<string> {
  return storage.read(async (journal) => {
    const transactions = (await journal.transactions.list())
      .filter(({ deletedAt }) => !deletedAt)
      .sort(compareHistoryEntries);
    const rows = transactions.map((entry) =>
      [
        quote(entry.id),
        quote(entry.transactionDate),
        quote(entry.kind),
        quote(
          currencyAmountForInput(entry.amountMinor, entry.currencyCode).replace(
            ',',
            '.',
          ),
        ),
        quote(entry.currencyCode),
        quote(entry.accountId),
        quote(entry.kind === 'transfer' ? entry.toAccountId : ''),
        quote(
          entry.kind === 'income' || entry.kind === 'expense'
            ? entry.categoryId
            : '',
        ),
        quote(entry.note ?? '', true),
      ].join(','),
    );
    const header =
      'id,transaction_date,kind,amount,currency,account_id,to_account_id,category_id,note';
    return '\ufeff' + [header, ...rows].join('\r\n') + '\r\n';
  });
}
