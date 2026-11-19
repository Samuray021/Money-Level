import { compareMinorUnits } from '@money-level/finance-core';
import { selectGoalReserved } from '@money-level/goals';
import { readBackupData } from './backup-export.js';
import type { BackupChecksum, BackupData } from './backup-format.js';
import { assertBackupRelations, validateBackupJson } from './backup-import.js';
import { writeBackupData } from './backup-write.js';
import type { UnitOfWork } from './journal-repository.js';

function added<Row>(
  local: readonly Row[],
  incoming: readonly Row[],
  key: (row: Row) => string,
): Row[] {
  const keys = new Set(local.map(key));
  return incoming.filter((row) => !keys.has(key(row)));
}

function identified<Row extends { id: string }>(
  local: readonly Row[],
  incoming: readonly Row[],
): Row[] {
  return added(local, incoming, (row) => row.id);
}

export async function mergeBackup(
  storage: UnitOfWork,
  text: string,
  checksum: BackupChecksum,
) {
  const { data: incoming } = await validateBackupJson(text, checksum);
  return storage.write(async (journal) => {
    const local = await readBackupData(journal);
    const changes: BackupData = {
      memeShown: identified(local.memeShown, incoming.memeShown),
      eventReceipts: identified(local.eventReceipts, incoming.eventReceipts),
      settings: local.settings ? null : incoming.settings,
      accounts: identified(local.accounts, incoming.accounts),
      categories: identified(local.categories, incoming.categories),
      transactions: identified(local.transactions, incoming.transactions),
      budgets: identified(local.budgets, incoming.budgets),
      budgetNotices: identified(local.budgetNotices, incoming.budgetNotices),
      goals: identified(local.goals, incoming.goals),
      goalAllocations: identified(
        local.goalAllocations,
        incoming.goalAllocations,
      ),
      outbox: added(local.outbox, incoming.outbox, (row) => row.eventId),
      commandReceipts: added(
        local.commandReceipts,
        incoming.commandReceipts,
        (row) => row.key,
      ),
    };
    const merged: BackupData = {
      memeShown: [...local.memeShown, ...changes.memeShown],
      eventReceipts: [...local.eventReceipts, ...changes.eventReceipts],
      settings: local.settings ?? changes.settings,
      accounts: [...local.accounts, ...changes.accounts],
      categories: [...local.categories, ...changes.categories],
      transactions: [...local.transactions, ...changes.transactions],
      budgets: [...local.budgets, ...changes.budgets],
      budgetNotices: [...local.budgetNotices, ...changes.budgetNotices],
      goals: [...local.goals, ...changes.goals],
      goalAllocations: [...local.goalAllocations, ...changes.goalAllocations],
      outbox: [...local.outbox, ...changes.outbox],
      commandReceipts: [...local.commandReceipts, ...changes.commandReceipts],
    };
    assertBackupRelations(merged);

    const updatedGoals = merged.goals.flatMap((goal) => {
      if (goal.status === 'archived' || goal.deletedAt) return [];
      const reserved = selectGoalReserved(merged.goalAllocations, goal.id);
      const status =
        compareMinorUnits(reserved, goal.targetMinor) === 0
          ? ('completed' as const)
          : ('active' as const);
      return goal.status === status ? [] : [{ ...goal, status }];
    });
    await writeBackupData(journal, changes);
    if (updatedGoals.length > 0) await journal.goals.putMany(updatedGoals);
    return {
      accounts: changes.accounts.length,
      transactions: changes.transactions.length,
    };
  });
}
