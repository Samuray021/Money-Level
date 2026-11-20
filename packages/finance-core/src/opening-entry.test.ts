import { expect, test } from 'vitest';
import { createOpeningEntry, openingEntrySchema } from './index.js';
import { accountInput, entryId, instant } from './fixtures.js';

test.each(['1000000', '0', '-100'])(
  'records %s as a signed opening posting',
  (amountMinor) => {
    const opening = createOpeningEntry(accountInput, {
      id: entryId,
      transactionDate: '2026-11-19',
      createdAt: instant,
      amountMinor,
    });
    expect(opening).toMatchObject({
      amountMinor,
      accountId: accountInput.id,
      currencyCode: 'RUB',
      kind: 'opening',
    });
    expect(opening).not.toHaveProperty('categoryId');
    expect(
      openingEntrySchema.safeParse({ ...opening, kind: 'income' }).success,
    ).toBe(false);
  },
);
