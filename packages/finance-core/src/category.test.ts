import { expect, test } from 'vitest';
import {
  archiveCategory,
  assertCategoryType,
  assertUniqueCategoryName,
  categorySchema,
} from './index.js';
import { categoryInput, entryId } from './fixtures.js';

test('validates categories and prevents use with the opposite transaction type', () => {
  const expense = categorySchema.parse(categoryInput);
  expect(() => assertCategoryType(expense, 'expense')).not.toThrow();
  expect(() => assertCategoryType(expense, 'income')).toThrow(RangeError);
  expect(categorySchema.safeParse({ ...categoryInput, name: '' }).success).toBe(
    false,
  );
});

test('archives a category without changing its identity or type', () => {
  const date = '2026-11-20T00:00:00.000Z';
  const archived = archiveCategory(categoryInput, date);
  expect(archived).toEqual({
    ...categoryInput,
    archived: true,
    updatedAt: date,
  });
  expect(archiveCategory(archived, '2026-11-21T00:00:00.000Z')).toBe(archived);
});

test('checks names for uniqueness within each category type', () => {
  const candidate = { ...categoryInput, id: entryId, name: '  ЕДА  вне дома ' };
  expect(() => assertUniqueCategoryName(candidate, [categoryInput])).toThrow(
    RangeError,
  );
  expect(() =>
    assertUniqueCategoryName({ ...candidate, type: 'income' }, [categoryInput]),
  ).not.toThrow();
  expect(() =>
    assertUniqueCategoryName(categoryInput, [categoryInput]),
  ).not.toThrow();
});
