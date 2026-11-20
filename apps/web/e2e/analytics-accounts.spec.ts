import { expect, test } from '@playwright/test';
import { record, setupJournal } from './journal-fixture.js';

test('the account filter updates past month comparison, categories and daily amounts for archived accounts', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  await setupJournal(page);
  await record(page, 'Расход', '70', 'Еда');
  await page.goto('/profile/accounts');
  await page.getByRole('button', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название счёта').fill('Семейный');
  await page.getByLabel('Начальный остаток (RUB)').fill('100');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Семейный', { exact: true })).toBeVisible();

  for (const [date, amount] of [
    ['2026-10-31', '20'],
    ['2026-11-01', '30'],
  ]) {
    await page.goto('/transactions/expense');
    await page.getByLabel(/^Счёт/u).selectOption({ label: 'Семейный' });
    await page.getByLabel('Категория').selectOption({ label: 'Транспорт' });
    await page.getByText('Дата и заметка').click();
    await page.getByLabel('Дата операции').fill(date);
    await page.getByLabel('Сумма (RUB)').fill(amount);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Общий баланс' }),
    ).toBeVisible();
  }
  await page.goto('/profile/accounts');
  await page.getByRole('button', { name: 'Архивировать Семейный' }).click();
  await expect(page.getByText('В архиве', { exact: true })).toBeVisible();

  await page.goto('/analytics');
  const totals = page.locator('.analytics-totals dd');
  await expect(totals.nth(1)).toHaveText(/100,00\s₽/u);
  const account = page.getByLabel(/^Счёт/u);
  await account.selectOption({ label: 'Семейный (архив)' });
  await expect(totals.nth(1)).toHaveText(/30,00\s₽/u);
  await expect(
    page.getByText('+50,0% к расходам прошлого месяца', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.analytics-categories')).toContainText(
    'Транспорт',
  );
  await expect(page.locator('.analytics-categories')).not.toContainText('Еда');
  await page.getByText('Таблица расходов по дням').click();
  await expect(
    page.getByRole('row').filter({ hasText: /30,00\s₽/u }),
  ).toContainText('1 нояб.');

  await page.getByLabel('Месяц').fill('2026-10');
  await expect(totals.nth(1)).toHaveText(/20,00\s₽/u);
  await page.getByLabel('Месяц').fill('2026-09');
  await expect(page.getByText('За этот месяц пока нет данных.')).toBeVisible();
  await page.getByLabel('Месяц').fill('2026-11');
  await account.selectOption({ label: 'Все счета' });
  await expect(totals.nth(1)).toHaveText(/100,00\s₽/u);
});
