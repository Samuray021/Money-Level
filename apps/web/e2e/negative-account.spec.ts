import { expect, test } from '@playwright/test';
import { setupJournal } from './journal-fixture.js';

test('a negative account warns even when the total is positive and does not block saving', async ({
  page,
}) => {
  await setupJournal(page);
  await page.goto('/profile/accounts');
  await page.getByRole('button', { name: 'Добавить счёт' }).click();
  await page.getByLabel('Название счёта').fill('Счёт для расходов');
  await page.getByLabel('Начальный остаток (RUB)').fill('0');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const row = page
    .getByRole('listitem')
    .filter({ hasText: 'Счёт для расходов' });
  await expect(row).toBeVisible();
  await expect(row.getByText('Отрицательный остаток.')).toHaveCount(0);

  await page.goto('/transactions/expense');
  await page.getByLabel(/^Счёт/u).selectOption({ label: 'Счёт для расходов' });
  await page.getByLabel('Категория').selectOption({ label: 'Еда' });
  await page.getByLabel('Сумма (RUB)').fill('123,45');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByTestId('total-balance')).toHaveText(/876,55\s₽/u);
  const warning = page.getByText('Есть счёт с отрицательным остатком.', {
    exact: false,
  });
  await expect(warning).toBeVisible();
  await warning.getByRole('link', { name: 'Счета' }).click();
  await expect(row.getByRole('status')).toHaveText('Отрицательный остаток.');

  await page.getByRole('button', { name: 'Скрыть суммы' }).click();
  await expect(row.getByText('Сумма скрыта')).toBeAttached();
  await expect(row).not.toContainText('123,45');
  await expect(row.getByRole('status')).toHaveText('Отрицательный остаток.');
  await page.getByLabel('Показать счета').selectOption('archived');
  await expect(row).toHaveCount(0);
  await expect(page.getByText('По фильтру счетов нет.')).toBeVisible();
});
