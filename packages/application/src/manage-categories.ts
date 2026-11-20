import { systemClock, uuidSchema } from '@money-level/contracts';
import type { CategoryType, UUID } from '@money-level/contracts';
import {
  archiveCategory,
  assertUniqueCategoryName,
  categorySchema,
} from '@money-level/finance-core';
import type { Category } from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';

export interface CategoryInput {
  id?: UUID;
  type: CategoryType;
  name: string;
  icon: string;
  color?: string;
}

export function saveCategory(
  context: JournalCommandContext,
  input: CategoryInput,
): Promise<Category> {
  return context.storage.write(async (journal) => {
    const id = uuidSchema.parse(input.id ?? context.createId());
    const existing = await journal.categories.get(id);
    if (
      input.id &&
      (!existing ||
        existing.deletedAt ||
        existing.archived ||
        existing.type !== input.type)
    ) {
      throw new RangeError('The category cannot be edited.');
    }
    if (!input.id && existing)
      throw new RangeError('A category already uses this identifier.');

    const now = (context.clock ?? systemClock).now().toISOString();
    const category = categorySchema.parse({
      id,
      name: input.name,
      type: input.type,
      icon: input.icon,
      ...(input.color ? { color: input.color } : {}),
      archived: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    assertUniqueCategoryName(category, await journal.categories.list());
    await journal.categories.put(category);
    return category;
  });
}

export function archiveJournalCategory(
  context: JournalCommandContext,
  id: UUID,
): Promise<void> {
  return context.storage.write(async (journal) => {
    const category = await journal.categories.get(uuidSchema.parse(id));
    if (!category || category.deletedAt || category.archived) return;
    await journal.categories.put(
      archiveCategory(
        category,
        (context.clock ?? systemClock).now().toISOString(),
      ),
    );
  });
}
