import {
  categoryTypeSchema,
  isoDateTimeSchema,
  uuidSchema,
} from '@money-level/contracts';
import type { CategoryType, ISODateTime } from '@money-level/contracts';
import { z } from 'zod';

export const categorySchema = z.strictObject({
  id: uuidSchema,
  type: categoryTypeSchema,
  name: z.string().trim().min(1),
  archived: z.boolean(),
  icon: z.string().trim().min(1),
  color: z.string().trim().min(1).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.optional(),
});

export type Category = z.infer<typeof categorySchema>;

export function assertCategoryType(
  category: Category,
  type: CategoryType,
): void {
  if (category.type !== type) {
    throw new RangeError('The category type does not match the transaction.');
  }
}

function normalizedName(name: string): string {
  return name
    .normalize('NFC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('ru-RU');
}

export function assertUniqueCategoryName(
  candidate: Category,
  existing: readonly Category[],
): void {
  const key = normalizedName(candidate.name);
  if (
    existing.some(
      (category) =>
        category.id !== candidate.id &&
        category.type === candidate.type &&
        category.deletedAt === undefined &&
        normalizedName(category.name) === key,
    )
  ) {
    throw new RangeError('A category with this name and type already exists.');
  }
}

export function archiveCategory(
  category: Category,
  updatedAt: ISODateTime,
): Category {
  return category.archived
    ? category
    : categorySchema.parse({ ...category, archived: true, updatedAt });
}
