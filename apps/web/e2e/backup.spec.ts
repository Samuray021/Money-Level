import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testWithOrigin as test } from './build-origin.js';
import { record, setupJournal } from './journal-fixture.js';

test('onboarding, journal, report and backup restore preserve the exact balance offline', async ({
  buildOrigin,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setupJournal(page, '1000', buildOrigin.url);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await record(page, 'Доход', '250,10', 'Зарплата');
  await record(page, 'Расход', '123,45', 'Еда');
  await expect(page.getByTestId('total-balance')).toHaveText('1 126,65 ₽');

  async function checkReport() {
    await page.getByRole('link', { name: 'Аналитика', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Аналитика' }),
    ).toBeVisible();
    await expect(page.locator('.analytics-totals dd')).toHaveText([
      '250,10 ₽',
      '123,45 ₽',
      '126,65 ₽',
    ]);
    await expect(page.locator('.analytics-categories')).toContainText('Еда');
  }

  async function openBackups() {
    await page.getByRole('link', { name: 'Профиль', exact: true }).click();
    await page.getByRole('link', { name: 'Резервные копии и данные' }).click();
  }

  async function loadBackup(buffer: Buffer) {
    await page.getByLabel('Файл резервной копии').setInputFiles({
      name: 'money-level-backup.json',
      mimeType: 'application/json',
      buffer,
    });
  }

  await checkReport();
  await openBackups();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать JSON' }).click();
  const backup = await readFile(await (await download).path());
  const parsed = JSON.parse(backup.toString());
  expect(parsed.data.transactions).toHaveLength(3);

  await loadBackup(
    Buffer.from(JSON.stringify({ ...parsed, checksum: '0'.repeat(64) })),
  );
  await expect(page.getByRole('alert')).toContainText(
    'Файл не прошёл проверку',
  );
  await expect(
    page.getByRole('button', { name: 'Импортировать копию' }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await expect(page.getByTestId('total-balance')).toHaveText('1 126,65 ₽');

  await openBackups();
  await loadBackup(backup);
  await page.getByRole('button', { name: 'Импортировать копию' }).click();
  await expect(
    page.getByText(/Добавлено счетов — 0, операций — 0/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Стереть все данные' }).click();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Стереть все данные' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Стереть все данные' }).click();
  await page
    .getByRole('button', { name: 'Подтвердить удаление всех данных' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Личные финансы' }),
  ).toBeVisible();

  buildOrigin.disconnect();
  await page.reload();
  await page
    .getByRole('link', { name: 'Восстановить из резервной копии' })
    .click();
  await loadBackup(backup);
  await page.getByRole('button', { name: 'Восстановить журнал' }).click();
  await expect(page.getByTestId('total-balance')).toHaveText('1 126,65 ₽');
  await page.reload();
  await expect(page.getByTestId('total-balance')).toHaveText('1 126,65 ₽');
  await checkReport();
  await page.getByRole('link', { name: 'История', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: /Зарплата.*250,10/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Еда.*123,45/ })).toBeVisible();
  expect(errors).toEqual([]);
});
