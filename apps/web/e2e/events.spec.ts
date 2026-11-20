import { expect, test } from '@playwright/test';
import { setupJournal } from './journal-fixture.js';

test('real report views and tab startup publish one scoped event across reloads', async ({
  page,
}) => {
  await setupJournal(page);
  await page.getByRole('link', { name: 'Аналитика', exact: true }).click();
  await page.getByRole('link', { name: 'Разбор расходов' }).click();
  await page.getByLabel('Период').selectOption('week');
  await expect(
    page.getByRole('heading', { name: 'Данных пока мало.' }),
  ).toBeVisible();

  const emitted = () =>
    page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('money-level');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<string[]>((resolve, reject) => {
          const request = database
            .transaction('outbox')
            .objectStore('outbox')
            .getAll();
          request.onsuccess = () =>
            resolve(request.result.map(({ type }) => type).sort());
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    });
  const expected = [
    'analytics.monthly.opened',
    'analytics.weekly.opened',
    'app.session.started',
  ];
  await expect.poll(emitted).toEqual(expected);
  await page.reload();
  await page.getByLabel('Период').selectOption('week');
  await expect(
    page.getByRole('heading', { name: 'Данных пока мало.' }),
  ).toBeVisible();
  await expect.poll(emitted).toEqual(expected);
});
