import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { record, setupJournal } from './journal-fixture.js';

async function savePreferences(page: Page) {
  await page.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect(
    page.getByText('Настройки сохранены.', { exact: true }),
  ).toBeVisible();
}

test('report titles and cards honor the saved humor and profanity choices after restart', async ({
  page,
}) => {
  await setupJournal(page);
  await record(page, 'Расход', '97,23', 'Еда');
  await page.goto('/profile/humor');
  await page.getByLabel('Режим юмора').selectOption('roast');
  await page.getByLabel('Частота реакций').selectOption('usual');
  await expect(page.getByLabel('Разрешить мат в шутках')).toBeDisabled();
  await page.getByLabel('Мне 18 лет или больше').check();
  await page.getByLabel('Разрешить мат в шутках').check();
  await savePreferences(page);
  await page.reload();
  await expect(page.getByLabel('Мне 18 лет или больше')).toBeChecked();
  await expect(page.getByLabel('Разрешить мат в шутках')).toBeChecked();
  await page.goto('/analytics');
  await page.getByRole('link', { name: 'Разъеби мои финансы' }).click();
  await expect(
    page.getByRole('heading', { name: 'Разъеби мои финансы' }),
  ).toBeVisible();

  await page.goto('/profile/humor');
  await page.getByLabel('Разрешить мат в шутках').uncheck();
  await savePreferences(page);
  await page.goto('/analytics');
  await page.getByRole('link', { name: 'Разбор расходов' }).click();
  await expect(
    page.getByRole('heading', { name: 'Разбор расходов' }),
  ).toBeVisible();

  await page.goto('/profile/humor');
  await page.getByLabel('Разрешить мат в шутках').check();
  await page.getByLabel('Частота реакций').selectOption('off');
  await savePreferences(page);
  await page.reload();
  await expect(page.getByLabel('Частота реакций')).toHaveValue('off');
  await page.getByRole('link', { name: 'Аналитика', exact: true }).click();
  await page.getByRole('link', { name: 'Разбор расходов' }).click();
  await expect(
    page.getByRole('heading', { name: 'Всего расходов' }),
  ).toBeVisible();
  await expect(page.getByText('Другие реплики')).toHaveCount(0);
  await expect(page.getByText('Разъеби мои финансы')).toHaveCount(0);

  await page.goto('/profile/humor');
  await page.getByLabel('Частота реакций').selectOption('usual');
  await page.getByLabel('Мне 18 лет или больше').uncheck();
  await savePreferences(page);
  await page.reload();
  await expect(page.getByLabel('Разрешить мат в шутках')).toBeDisabled();
  await page.getByLabel('Мне 18 лет или больше').check();
  await expect(page.getByLabel('Разрешить мат в шутках')).not.toBeChecked();
});

test('the opening setup keeps profanity optional and requires age confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  const profanity = page.getByLabel('Разрешить мат в шутках');
  await expect(profanity).toBeDisabled();
  await page.getByLabel('Мне 18 лет или больше').check();
  await profanity.check();
  await page.getByRole('button', { name: 'К учёту' }).click();
  await expect(page.getByTestId('total-balance')).toBeVisible();
  await page.goto('/profile/humor');
  await expect(page.getByLabel('Мне 18 лет или больше')).toBeChecked();
  await expect(profanity).toBeChecked();
});

test('quiet reactions stay silent and finance works with the companion and animation off', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      document.documentElement.dataset.audioPlayed = 'true';
      return Promise.resolve();
    };
  });
  await setupJournal(page);
  await page.goto('/profile/humor');
  await page.getByLabel('Режим юмора').selectOption('neutral');
  await page.getByLabel('Частота реакций').selectOption('usual');
  await page.getByLabel('Тихий режим без всплывающих реакций').check();
  await page.getByLabel('Звуки реакций').check();
  await page.getByLabel('Анимации').uncheck();
  await savePreferences(page);
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await record(page, 'Доход', '17,31', 'Зарплата');
  await expect(
    page.getByText('Есть пополнение. Запись на месте.'),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Реакция компаньона' }),
  ).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-audio-played',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

  await page.goto('/profile/humor');
  await page.getByLabel('Показывать компаньона').uncheck();
  await savePreferences(page);
  await page.reload();
  await expect(page.getByLabel('Показывать компаньона')).not.toBeChecked();
  await expect(page.getByLabel('Анимации')).not.toBeChecked();
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await record(page, 'Расход', '0,31', 'Еда');
  await expect(page.getByTestId('total-balance')).toHaveText(/1\s017,00\s₽/u);
  await expect(page.locator('.companion, .meme-toast')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-audio-played',
    'true',
  );
});
