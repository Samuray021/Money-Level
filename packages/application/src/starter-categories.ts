import { systemClock } from '@money-level/contracts';
import type { CategoryType } from '@money-level/contracts';
import { normalizeCategoryName } from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';
import type { JournalWriter } from './journal-repository.js';

const starterCategories: readonly [
  type: CategoryType,
  name: string,
  icon: string,
][] = [
  ['income', 'Зарплата', 'salary'],
  ['income', 'Подработка', 'work'],
  ['income', 'Подарок', 'gift'],
  ['income', 'Возврат', 'refund'],
  ['income', 'Другое', 'other'],
  ['expense', 'Еда', 'food'],
  ['expense', 'Транспорт', 'transport'],
  ['expense', 'Развлечения', 'entertainment'],
  ['expense', 'Подписки', 'subscriptions'],
  ['expense', 'Покупки', 'shopping'],
  ['expense', 'Жильё и счета', 'home'],
  ['expense', 'Здоровье', 'health'],
  ['expense', 'Другое', 'other'],
];

export async function seedStarterCategories(
  journal: JournalWriter,
  createdAt: string,
): Promise<void> {
  const existing = await journal.categories.list();
  for (const [index, [type, name, icon]] of starterCategories.entries()) {
    const id = 'b73ff290-4035-4f99-8064-' + String(index + 1).padStart(12, '0');
    const normalized = normalizeCategoryName(name);
    if (
      existing.some(
        (category) =>
          category.id === id ||
          (category.deletedAt === undefined &&
            category.type === type &&
            normalizeCategoryName(category.name) === normalized),
      )
    )
      continue;
    await journal.categories.put({
      id,
      type,
      name,
      icon,
      archived: false,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

export function ensureStarterCategories(
  context: JournalCommandContext,
): Promise<void> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted || profile.starterCategoriesReady) return;
    await seedStarterCategories(
      journal,
      (context.clock ?? systemClock).now().toISOString(),
    );
    await journal.settings.put({ ...profile, starterCategoriesReady: true });
  });
}
