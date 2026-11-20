import { expect, test } from '@playwright/test';
import { record, setupJournal } from './journal-fixture.js';

test('a completed goal alerts without humor or audio and preserves the financial balance', async ({
  page,
}) => {
  await setupJournal(page);
  await page.getByRole('link', { name: 'Цели', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить цель' }).click();
  await page.getByLabel('Название', { exact: true }).fill('Тестовый резерв');
  await page.getByLabel('Целевая сумма (RUB)').fill('27,50');
  await page.getByLabel('Значок цели').selectOption('reserve');
  await page.getByRole('button', { name: 'Сохранить цель' }).click();
  await expect(
    page.getByRole('heading', { name: 'Тестовый резерв' }),
  ).toBeVisible();
  const notice = page.getByRole('complementary', {
    name: 'Уведомление о целях',
  });
  await expect(notice).toHaveCount(0);

  await page.getByRole('button', { name: 'Выделить' }).click();
  await page.getByLabel('Сумма (RUB)', { exact: true }).fill('27,50');
  await page.getByRole('button', { name: 'Подтвердить резерв' }).click();
  await expect(notice.getByRole('status')).toHaveText('Цель достигнута.');
  await expect(
    page.getByRole('complementary', { name: 'Реакция компаньона' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Закрыть уведомление о целях' })
    .click();
  await expect(notice).toHaveCount(0);
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await expect(page.getByTestId('total-balance')).toHaveText(/1\s000,00\s₽/u);
  await expect(page.getByTestId('available')).toHaveText(/972,50\s₽/u);
  await expect(page.getByTestId('expenses')).toHaveText(/0,00\s₽/u);
});

test('roast distinguishes the largest share from the most frequent category and respects privacy', async ({
  page,
}) => {
  await setupJournal(page);
  await record(page, 'Расход', '10', 'Еда');
  await record(page, 'Расход', '20', 'Еда');
  await record(page, 'Расход', '70', 'Транспорт');
  await page.getByRole('link', { name: 'Аналитика', exact: true }).click();
  await page.getByRole('link', { name: 'Разбор расходов' }).click();
  const biggest = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Крупнейшая категория расходов' }),
  });
  const frequent = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: 'Самая частая категория расходов',
    }),
  });
  await expect(frequent).toContainText('Еда · 2');
  await biggest.getByText('Доли категорий расходов').click();
  await expect(biggest.locator('.roast-distribution')).toContainText(
    /Транспорт\s*70\s*%/u,
  );
  await expect(biggest.locator('.roast-distribution')).toContainText(
    /Еда\s*30\s*%/u,
  );
  await page.getByRole('button', { name: 'Скрыть суммы' }).click();
  await expect(biggest.locator('.roast-distribution')).toHaveCount(0);
  await expect(biggest).not.toContainText(/70,00/u);
});
