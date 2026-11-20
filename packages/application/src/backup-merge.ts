import { achievementKey } from '@money-level/gamification';
import {
  compareMinorUnits,
  normalizeCategoryName,
  selectTotalBalance,
} from '@money-level/finance-core';
import { selectAvailableToSpend, selectGoalReserved } from '@money-level/goals';
import { readBackupData } from './backup-export.js';
import type { BackupChecksum, BackupData } from './backup-format.js';
import { assertBackupRelations, validateBackupJson } from './backup-import.js';
import { writeBackupData } from './backup-write.js';
import type { UnitOfWork } from './journal-repository.js';

interface MergeCounts {
  incoming: number;
  added: number;
  duplicates: number;
  conflicts: number;
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function forecast(data: BackupData) {
  const totalMinor = selectTotalBalance(data.accounts, data.transactions);
  const { availableMinor, reservedMinor } = selectAvailableToSpend(
    totalMinor,
    data.goals,
    data.goalAllocations,
  );
  return {
    accounts: data.accounts.filter((row) => !row.deletedAt).length,
    transactions: data.transactions.filter((row) => !row.deletedAt).length,
    goals: data.goals.filter(
      (row) => !row.deletedAt && row.status !== 'archived',
    ).length,
    totalMinor,
    availableMinor,
    reservedMinor,
  };
}

export interface BackupMergePreview {
  totals: MergeCounts;
  tables: Partial<Record<keyof BackupData, MergeCounts>>;
  projection?: {
    before: ReturnType<typeof forecast>;
    after: ReturnType<typeof forecast>;
  };
}

export class BackupMergePreviewChanged extends Error {
  constructor() {
    super('The journal changed after the merge preview.');
    this.name = 'BackupMergePreviewChanged';
  }
}

function planMerge(local: BackupData, incoming: BackupData) {
  const tables: BackupMergePreview['tables'] = {};
  const totals: MergeCounts = {
    incoming: 0,
    added: 0,
    duplicates: 0,
    conflicts: 0,
  };
  let integrityConflict = false;

  function records<Row>(
    table: keyof BackupData,
    existing: readonly Row[],
    source: readonly Row[],
    identity: (row: Row) => string,
    alternate?: (row: Row) => string | undefined,
    structural = false,
  ): Row[] {
    const byId = new Map(existing.map((row) => [identity(row), row]));
    const byAlternate = new Map<string, Row>();
    if (alternate)
      for (const row of existing) {
        const key = alternate(row);
        if (key !== undefined) byAlternate.set(key, row);
      }

    const pending: Row[] = [];
    const counts = {
      incoming: source.length,
      added: 0,
      duplicates: 0,
      conflicts: 0,
    };
    for (const row of source) {
      const matchingId = byId.get(identity(row));
      const secondaryKey = alternate?.(row);
      const matchingAlternate =
        secondaryKey === undefined ? undefined : byAlternate.get(secondaryKey);
      const matched = matchingId ?? matchingAlternate;
      if (matched === undefined) {
        pending.push(row);
        counts.added++;
      } else if (sameRecord(row, matched)) {
        counts.duplicates++;
      } else {
        counts.conflicts++;
        if (structural && matchingId === undefined) integrityConflict = true;
      }
    }
    tables[table] = counts;
    totals.incoming += counts.incoming;
    totals.added += counts.added;
    totals.duplicates += counts.duplicates;
    totals.conflicts += counts.conflicts;
    return pending;
  }

  const id = (row: { id: string }) => row.id;
  const settings =
    records(
      'settings',
      local.settings ? [local.settings] : [],
      incoming.settings ? [incoming.settings] : [],
      id,
    )[0] ?? null;
  const changes: BackupData = {
    settings,
    accounts: records('accounts', local.accounts, incoming.accounts, id),
    categories: records(
      'categories',
      local.categories,
      incoming.categories,
      id,
      (row) =>
        row.deletedAt
          ? undefined
          : row.type + ':' + normalizeCategoryName(row.name),
      true,
    ),
    transactions: records(
      'transactions',
      local.transactions,
      incoming.transactions,
      id,
    ),
    budgets: records(
      'budgets',
      local.budgets,
      incoming.budgets,
      id,
      (row) => (row.active ? (row.categoryId ?? '') : undefined),
      true,
    ),
    budgetNotices: records(
      'budgetNotices',
      local.budgetNotices,
      incoming.budgetNotices,
      id,
    ),
    goals: records('goals', local.goals, incoming.goals, id),
    goalAllocations: records(
      'goalAllocations',
      local.goalAllocations,
      incoming.goalAllocations,
      id,
    ),
    achievements: records(
      'achievements',
      local.achievements,
      incoming.achievements,
      id,
      achievementKey,
    ),
    memeShown: records('memeShown', local.memeShown, incoming.memeShown, id),
    eventReceipts: records(
      'eventReceipts',
      local.eventReceipts,
      incoming.eventReceipts,
      id,
    ),
    outbox: records(
      'outbox',
      local.outbox,
      incoming.outbox,
      (row) => row.eventId,
    ),
    commandReceipts: records(
      'commandReceipts',
      local.commandReceipts,
      incoming.commandReceipts,
      (row) => row.key,
    ),
  };
  const merged: BackupData = {
    settings: local.settings ?? changes.settings,
    accounts: [...local.accounts, ...changes.accounts],
    categories: [...local.categories, ...changes.categories],
    transactions: [...local.transactions, ...changes.transactions],
    budgets: [...local.budgets, ...changes.budgets],
    budgetNotices: [...local.budgetNotices, ...changes.budgetNotices],
    goals: [...local.goals, ...changes.goals],
    goalAllocations: [...local.goalAllocations, ...changes.goalAllocations],
    achievements: [...local.achievements, ...changes.achievements],
    memeShown: [...local.memeShown, ...changes.memeShown],
    eventReceipts: [...local.eventReceipts, ...changes.eventReceipts],
    outbox: [...local.outbox, ...changes.outbox],
    commandReceipts: [...local.commandReceipts, ...changes.commandReceipts],
  };

  const preview: BackupMergePreview = { totals, tables };
  if (!integrityConflict) {
    try {
      assertBackupRelations(merged);
      preview.projection = { before: forecast(local), after: forecast(merged) };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  return { changes, merged, preview };
}

export function previewBackupMerge(
  storage: UnitOfWork,
  incoming: BackupData,
): Promise<BackupMergePreview> {
  assertBackupRelations(incoming);
  return storage.read(
    async (journal) =>
      planMerge(await readBackupData(journal), incoming).preview,
  );
}

export async function mergeBackup(
  storage: UnitOfWork,
  text: string,
  checksum: BackupChecksum,
  expected?: BackupMergePreview,
) {
  const { data: incoming } = await validateBackupJson(text, checksum);
  return storage.write(async (journal) => {
    const { changes, merged, preview } = planMerge(
      await readBackupData(journal),
      incoming,
    );
    if (expected && !sameRecord(preview, expected))
      throw new BackupMergePreviewChanged();
    if (!preview.projection)
      throw new RangeError('The backup conflicts with the current journal.');

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
