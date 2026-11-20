import { expect, test } from '@playwright/test';
import { setupJournal } from './journal-fixture.js';

test('large journal keeps history pagination bounded and records exact amounts', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await setupJournal(page);

  await page.evaluate(async () => {
    function result<Value>(request: IDBRequest<Value>) {
      return new Promise<Value>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    const database = await result(indexedDB.open('money-level'));
    try {
      const journal = database.transaction(['transactions', 'categories']);
      const [operations, categories] = await Promise.all([
        result(journal.objectStore('transactions').getAll()),
        result(journal.objectStore('categories').getAll()),
      ]);
      const opening = operations.find(({ kind }) => kind === 'opening');
      const food = categories.find(({ name }) => name === 'Еда');
      if (!opening || !food)
        throw new Error('Missing fixture account or category');
      const insert = database.transaction('transactions', 'readwrite');
      const store = insert.objectStore('transactions');
      const completed = new Promise<void>((resolve, reject) => {
        insert.oncomplete = () => resolve();
        insert.onabort = () => reject(insert.error);
      });
      for (let index = 0; index < 10_000; index++) {
        store.add({
          ...opening,
          id: crypto.randomUUID(),
          kind: 'expense',
          categoryId: food.id,
          amountMinor: '1',
        });
      }
      await completed;
    } finally {
      database.close();
    }
  });

  await page.reload();
  await expect(page.getByTestId('total-balance')).toHaveText('900,00 ₽');
  const startup = await page.evaluate(() => performance.now());

  await page.getByRole('link', { name: 'История', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(50);
  await expect(page.getByText(/Операции 1–50 из 10\s000/)).toBeVisible();
  await page.getByRole('button', { name: 'Следующая' }).click();
  await expect(page.getByText(/Операции 51–100 из 10\s000/)).toBeFocused();
  await page.locator('.history-row').first().click();
  await page.getByRole('link', { name: 'К истории' }).click();
  await expect(page.getByText(/Операции 51–100 из 10\s000/)).toBeVisible();

  await page.getByText('Фильтры', { exact: true }).click();
  await page.getByLabel('Тип операции').selectOption('income');
  await expect(page.getByText('По этим фильтрам операций нет.')).toBeVisible();
  await page.getByRole('link', { name: 'Главная', exact: true }).click();

  const readTimes = await page.evaluateHandle(() => {
    const times: number[] = [];
    let submittedAt: number | undefined;
    document.addEventListener(
      'submit',
      () => {
        if (location.pathname === '/transactions/expense')
          submittedAt = performance.now();
      },
      true,
    );
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args) {
      if (this.name === 'transactions' && submittedAt !== undefined) {
        const start = submittedAt;
        submittedAt = undefined;
        this.transaction.addEventListener(
          'complete',
          () => times.push(performance.now() - start),
          { once: true },
        );
      }
      return put.apply(this, args);
    };
    return times;
  });

  for (let sample = 0; sample < 30; sample++) {
    await page.getByRole('link', { name: 'Расход', exact: true }).click();
    await page.getByLabel('Сумма (RUB)').fill('0,01');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Общий баланс' }),
    ).toBeVisible();
  }
  await expect(page.getByTestId('total-balance')).toHaveText('899,70 ₽');
  const times = await readTimes.jsonValue();
  expect(times).toHaveLength(30);
  const p95 = times.sort((a, b) => a - b)[Math.ceil(times.length * 0.95) - 1];
  console.log(
    '10,000 entries. Navigation to observed balance %d ms. Save to IndexedDB commit p95 %d ms.',
    Math.round(startup),
    Math.round(p95),
  );
});
