import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function record(
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

test('first setup, income, expense and edit survive an offline restart', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByLabel('Сумма (RUB)').fill('1000');
  await page.getByLabel('Частота шуток').selectOption('off');
  await page.getByRole('button', { name: 'К учёту' }).click();
  await expect(page.getByTestId('total-balance')).toHaveText('1 000,00 ₽');
  await expect(page.getByTestId('income')).toHaveText('0,00 ₽');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await record(page, 'Доход', '500', 'Зарплата');
  await record(page, 'Расход', '200', 'Еда');
  await expect(page.getByTestId('total-balance')).toHaveText('1 300,00 ₽');

  await page.getByRole('link', { name: 'История', exact: true }).click();
  await page.getByRole('link', { name: /Еда/ }).click();
  await page.getByRole('link', { name: 'Изменить' }).click();
  await expect(page.getByLabel('Сумма (RUB)')).toHaveValue('200,00');
  await page.getByLabel('Сумма (RUB)').fill('275,50');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('−275,50 ₽')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText('Офлайн · изменения сохраняются на устройстве'),
  ).toBeVisible();
  await expect(page.getByText('−275,50 ₽')).toBeVisible();
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await expect(page.getByTestId('total-balance')).toHaveText('1 224,50 ₽');
  await expect(page.getByTestId('income')).toHaveText('500,00 ₽');
  await expect(page.getByTestId('expenses')).toHaveText('275,50 ₽');

  await record(page, 'Расход', '10', 'Транспорт');
  await page.reload();
  await expect(page.getByTestId('total-balance')).toHaveText('1 214,50 ₽');
  await expect(page.getByTestId('expenses')).toHaveText('285,50 ₽');
});
