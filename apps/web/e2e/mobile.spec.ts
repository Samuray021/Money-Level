import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { record, setupJournal } from './journal-fixture.js';

async function fitViewport(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test('mobile controls, keyboard focus, reduced motion and private budget editing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 680 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupJournal(page, '1000');
  await record(page, 'Расход', '123,45', 'Еда');

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Общий баланс' }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'К содержимому' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--duration-fast')
        .trim(),
    ),
  ).toMatch(/^0m?s$/u);
  await fitViewport(page);

  const budgetLimit = '789,10';
  await page.goto('/analytics/budgets');
  await page.getByRole('button', { name: 'Добавить бюджет' }).click();
  await page.getByLabel('Лимит на месяц (RUB)').fill(budgetLimit);
  await page.getByRole('button', { name: 'Сохранить бюджет' }).click();
  await page.getByRole('button', { name: /Изменить бюджет/ }).click();
  await expect(page.getByLabel('Лимит на месяц (RUB)')).toHaveValue(
    budgetLimit,
  );

  const privacy = page.getByRole('button', { name: 'Скрыть суммы' });
  await privacy.click();
  await expect(privacy).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Лимит на месяц (RUB)')).toHaveCount(0);
  await expect(
    page.getByText('Чтобы изменить бюджет', { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator('main').getByText('Сумма скрыта').first(),
  ).toBeAttached();
  expect(await page.locator('main').ariaSnapshot()).not.toMatch(
    /789,10|123,45|₽/u,
  );
  await fitViewport(page);

  const widths = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ];
  for (const viewport of widths) {
    await page.setViewportSize(viewport);
    for (const [path, title] of [
      ['/', 'Общий баланс'],
      ['/history', 'История'],
      ['/analytics', 'Аналитика'],
      ['/goals', 'Цели'],
      ['/profile', 'Профиль'],
      ['/profile/backup', 'Резервные копии и данные'],
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Скрыть суммы', pressed: true }),
      ).toBeVisible();
      await fitViewport(page);
    }
  }
});
