import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testWithOrigin as test } from './build-origin.js';
import { record, setupJournal } from './journal-fixture.js';

const marker = {
  id: '00000000-0000-4000-8000-000000000010',
  fixture: 'legacy source row',
};

async function seedOriginal(page: Page, version: number) {
  await page.evaluate(
    ({ version, marker }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('money-level', version);
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore('accounts', { keyPath: 'id' }).add(marker);
          database.createObjectStore('categories', { keyPath: 'id' });
          database.createObjectStore('transactions', { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      }),
    { version, marker },
  );
}

async function readOriginal(page: Page) {
  return page.evaluate(
    (id) =>
      new Promise<{ version: number; marker: unknown }>((resolve, reject) => {
        const open = indexedDB.open('money-level');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const request = database
            .transaction('accounts')
            .objectStore('accounts')
            .get(id);
          request.onerror = () => {
            database.close();
            reject(request.error);
          };
          request.onsuccess = () => {
            const data = { version: database.version, marker: request.result };
            database.close();
            resolve(data);
          };
        };
      }),
    marker.id,
  );
}

for (const [caseName, version] of [
  ['a failed legacy migration', 10],
  ['a newer unsupported database', 150],
] as const) {
  test(`a valid backup opens separately after ${caseName} and preserves the source`, async ({
    browser,
    buildOrigin,
    page,
  }) => {
    await setupJournal(page, '1000', buildOrigin.url);
    await record(page, 'Расход', '23,45', 'Еда');
    await page.getByRole('link', { name: 'Профиль', exact: true }).click();
    await page.getByRole('link', { name: 'Резервные копии и данные' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать JSON' }).click();
    const backup = await readFile(await (await download).path());

    const failing = await browser.newContext({ locale: 'ru-RU' });
    try {
      const recovered = await failing.newPage();
      await recovered.goto(buildOrigin.url + '/icons/icon-192.png');
      await seedOriginal(recovered, version);
      const original = await readOriginal(recovered);
      await recovered.goto(buildOrigin.url);
      await expect(
        recovered.getByRole('heading', { name: 'Восстановление журнала' }),
      ).toBeVisible();
      await recovered
        .getByRole('button', { name: 'Повторить открытие' })
        .click();
      await expect(
        recovered.getByText('Не удалось открыть локальный журнал.'),
      ).toBeVisible();

      const file = recovered.getByLabel('Файл резервной копии');
      await file.setInputFiles({
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{}'),
      });
      await expect(
        recovered.getByText(/Файл не прошёл проверку/),
      ).toBeVisible();
      await expect(
        recovered.getByRole('button', { name: 'Открыть отдельный журнал' }),
      ).toHaveCount(0);
      expect(await readOriginal(recovered)).toEqual(original);

      await file.setInputFiles({
        name: 'backup.json',
        mimeType: 'application/json',
        buffer: backup,
      });
      await expect(recovered.getByText(/Копия проверена/)).toBeVisible();
      await recovered
        .getByRole('button', { name: 'Открыть отдельный журнал' })
        .click();
      await expect(recovered.getByTestId('total-balance')).toHaveText(
        /976,55\s₽/u,
      );
      await recovered.reload();
      await expect(recovered.getByTestId('total-balance')).toHaveText(
        /976,55\s₽/u,
      );
      expect(await readOriginal(recovered)).toEqual({ version, marker });
    } finally {
      await failing.close();
    }
  });
}
