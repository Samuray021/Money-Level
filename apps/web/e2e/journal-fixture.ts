import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function setupJournal(page: Page, opening = '1000') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByLabel('Сумма (RUB)').fill(opening);
  await page.getByLabel('Частота шуток').selectOption('off');
  await page.getByRole('button', { name: 'К учёту' }).click();
  await expect(
    page.getByRole('heading', { name: 'Общий баланс' }),
  ).toBeVisible();
}

export async function record(
  page: Page,
  kind: 'Доход' | 'Расход',
  amount: string,
  category: string,
): Promise<void> {
  await page.getByRole('link', { name: kind, exact: true }).click();
  await page.getByLabel('Сумма (RUB)').fill(amount);
  await page.getByLabel('Категория').selectOption({ label: category });
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Общий баланс' }),
  ).toBeVisible();
}
