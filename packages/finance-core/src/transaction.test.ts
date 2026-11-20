import { expect, test } from 'vitest';
import { entryInput, expenseInput, transferInput } from './fixtures.js';
import { transactionSchema } from './index.js';

test('requires a category and a positive amount for income and expense', () => {
  for (const kind of ['income', 'expense']) {
    expect(transactionSchema.safeParse({ ...expenseInput, kind }).success).toBe(
      true,
    );
    expect(transactionSchema.safeParse({ ...entryInput, kind }).success).toBe(
      false,
    );
    expect(
      transactionSchema.safeParse({ ...expenseInput, kind, amountMinor: '0' })
        .success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...expenseInput, kind, amountMinor: '-1' })
        .success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({
        ...expenseInput,
        kind,
        toAccountId: transferInput.toAccountId,
      }).success,
    ).toBe(false);
  }
});

test('requires a separate destination account, positive amount and no category for transfers', () => {
  expect(transactionSchema.safeParse(transferInput).success).toBe(true);
  expect(
    transactionSchema.safeParse({ ...entryInput, kind: 'transfer' }).success,
  ).toBe(false);
  expect(
    transactionSchema.safeParse({
      ...transferInput,
      toAccountId: transferInput.accountId,
    }).success,
  ).toBe(false);
  expect(
    transactionSchema.safeParse({
      ...transferInput,
      categoryId: expenseInput.categoryId,
    }).success,
  ).toBe(false);
  expect(
    transactionSchema.safeParse({ ...transferInput, amountMinor: '0' }).success,
  ).toBe(false);
});

test('accepts signed journal corrections with no category or destination', () => {
  for (const kind of ['adjustment', 'opening']) {
    expect(
      transactionSchema.safeParse({ ...entryInput, kind, amountMinor: '-1' })
        .success,
    ).toBe(true);
    expect(transactionSchema.safeParse({ ...expenseInput, kind }).success).toBe(
      false,
    );
  }
  expect(
    transactionSchema.safeParse({
      ...entryInput,
      transactionDate: '2026-02-30',
      kind: 'opening',
    }).success,
  ).toBe(false);
  expect(
    transactionSchema.safeParse({ ...expenseInput, note: 'a'.repeat(501) })
      .success,
  ).toBe(false);
});
