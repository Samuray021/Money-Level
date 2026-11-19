import {
  addMinorUnits,
  assertTransactionReferences,
  compareMinorUnits,
  normalizeCategoryName,
} from '@money-level/finance-core';
import { checksumPayload } from './backup-export.js';
import { backupFileSchema } from './backup-format.js';
import type {
  BackupChecksum,
  BackupData,
  BackupFile,
} from './backup-format.js';

function indexBy<Row>(
  rows: readonly Row[],
  key: (row: Row) => string,
  label: string,
): Map<string, Row> {
  const index = new Map<string, Row>();
  for (const row of rows) {
    const id = key(row);
    if (index.has(id)) throw new RangeError('Duplicate key in ' + label + '.');
    index.set(id, row);
  }
  return index;
}

export function assertBackupRelations(data: BackupData): void {
  if (!data.settings) {
    if (
      Object.values(data).some(
        (value) => Array.isArray(value) && value.length > 0,
      )
    ) {
      throw new RangeError('A populated backup requires profile settings.');
    }
    return;
  }

  const { baseCurrency, firstAccountId } = data.settings;
  const accounts = indexBy(data.accounts, (row) => row.id, 'accounts');
  const categories = indexBy(data.categories, (row) => row.id, 'categories');
  const transactions = indexBy(
    data.transactions,
    (row) => row.id,
    'transactions',
  );
  const budgets = indexBy(data.budgets, (row) => row.id, 'budgets');
  const goals = indexBy(data.goals, (row) => row.id, 'goals');
  const events = indexBy(data.outbox, (row) => row.eventId, 'outbox');
  indexBy(data.eventReceipts, (row) => row.id, 'event receipts');
  indexBy(data.memeShown, (row) => row.id, 'meme history');
  if (data.memeShown.some((row) => !events.has(row.id)))
    throw new RangeError('A meme refers to an unknown event.');
  for (const receipt of data.eventReceipts) {
    if (
      !events.has(receipt.eventId) ||
      receipt.id !== receipt.consumer + ':' + receipt.eventId
    ) {
      throw new RangeError('An event receipt has an invalid reference.');
    }
  }
  indexBy(data.commandReceipts, (row) => row.key, 'command receipts');
  indexBy(data.goalAllocations, (row) => row.id, 'goal allocations');
  indexBy(data.budgetNotices, (row) => row.id, 'budget notices');
  indexBy(
    data.categories.filter((row) => !row.deletedAt),
    (row) => row.type + ':' + normalizeCategoryName(row.name),
    'category names',
  );
  indexBy(
    data.budgets.filter((row) => row.active),
    (row) => row.categoryId ?? '',
    'active budgets',
  );

  if (
    !accounts.has(firstAccountId) ||
    data.accounts.some((row) => row.currencyCode !== baseCurrency)
  ) {
    throw new RangeError(
      'Account references or the base currency do not match the profile.',
    );
  }

  for (const entry of data.transactions) {
    const source = accounts.get(entry.accountId);
    const destination =
      entry.kind === 'transfer' ? accounts.get(entry.toAccountId) : undefined;
    const category =
      entry.kind === 'expense' || entry.kind === 'income'
        ? categories.get(entry.categoryId)
        : undefined;
    assertTransactionReferences(entry, {
      baseCurrency,
      accounts: [source, destination].filter((value) => value !== undefined),
      categories: category ? [category] : [],
    });
  }

  const reserved = new Map<string, string>();
  for (const allocation of data.goalAllocations) {
    if (!goals.has(allocation.goalId))
      throw new RangeError('An allocation refers to an unknown goal.');
    reserved.set(
      allocation.goalId,
      addMinorUnits(
        reserved.get(allocation.goalId) ?? '0',
        allocation.deltaMinor,
      ),
    );
  }
  for (const goal of data.goals) {
    const amount = reserved.get(goal.id) ?? '0';
    if (
      compareMinorUnits(amount, '0') < 0 ||
      compareMinorUnits(amount, goal.targetMinor) > 0
    ) {
      throw new RangeError('Goal reservations are outside their target.');
    }
  }

  for (const budget of data.budgets) {
    if (
      budget.categoryId &&
      categories.get(budget.categoryId)?.type !== 'expense'
    ) {
      throw new RangeError('A budget refers to an unknown expense category.');
    }
  }
  for (const notice of data.budgetNotices) {
    if (
      !budgets.has(notice.budgetId) ||
      !notice.monthStart.endsWith('-01') ||
      notice.id !==
        [notice.budgetId, notice.monthStart, notice.threshold].join(':')
    ) {
      throw new RangeError(
        'A budget notice has an invalid reference or period.',
      );
    }
  }
  if (
    data.commandReceipts.some((row) => !transactions.has(row.transactionId)) ||
    data.outbox.some(
      (row) =>
        row.type.startsWith('transaction.') &&
        !transactions.has(row.sourceEntityId),
    )
  ) {
    throw new RangeError('A receipt or event refers to an unknown entry.');
  }
}

export async function validateBackupJson(
  text: string,
  checksum: BackupChecksum,
): Promise<BackupFile> {
  const raw: unknown = JSON.parse(text);
  const backup = backupFileSchema.parse(raw);
  // Hash the original data so schema defaults do not invalidate older version-one backups.
  const data = (raw as Pick<BackupFile, 'data'>).data;
  const actual = await checksum(
    checksumPayload(backup.schemaVersion, backup.createdAt, data),
  );
  if (actual !== backup.checksum)
    throw new RangeError('The backup checksum does not match.');
  assertBackupRelations(backup.data);
  return backup;
}
