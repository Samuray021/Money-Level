import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { record, setupJournal } from './journal-fixture.js';

function pngDigest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

test('expense card preview, PNG and system share hide financial figures by default and in private mode', async ({
  page,
}) => {
  const privateText = /987,65|1[\s\u00a0]111,11|12,35|1234|₽/u;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        if (!file) throw new Error('Expected a share file');
        const detail = {
          keys: Object.keys(data).sort(),
          title: data.title,
          name: file.name,
          bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
        };
        window.dispatchEvent(new CustomEvent('card-share', { detail }));
      },
    });
  });

  await setupJournal(page);
  await record(page, 'Расход', '987,65', 'Еда');
  await page.goto('/analytics/roast');
  const card = page.locator('.roast-card').first();
  await expect(
    card.getByRole('heading', { name: 'Всего расходов' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Другие реплики' }),
  ).toHaveCount(0);
  const preview = card.locator('.roast-preview');
  await card.getByText('Экспорт карточки', { exact: true }).click();
  await expect(preview).not.toContainText(privateText);

  async function downloadCard() {
    const pending = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Сохранить PNG' }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('money-level.png');
    return readFile(await download.path());
  }

  const masked = pngDigest(await downloadCard());
  await card.getByLabel('Показать показатели в PNG').check();
  await expect(preview).toContainText('987,65');
  expect(pngDigest(await downloadCard())).not.toBe(masked);

  await page.getByRole('link', { name: 'Главная', exact: true }).click();
  await record(page, 'Расход', '123,46', 'Еда');
  await page.goto('/analytics/roast');
  await card.getByText('Экспорт карточки', { exact: true }).click();
  await expect(preview).not.toContainText(privateText);
  expect(pngDigest(await downloadCard())).toBe(masked);

  await card.getByLabel('Показать показатели в PNG').check();
  await expect(preview).toContainText('111,11');
  await page.getByRole('button', { name: 'Скрыть суммы' }).click();
  await expect(
    page.getByRole('button', { name: 'Скрыть суммы', pressed: true }),
  ).toBeVisible();
  await card.getByText('Экспорт карточки', { exact: true }).click();
  await expect(card.getByLabel('Показать показатели в PNG')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(privateText);

  const accessibility = await page.locator('main').ariaSnapshot();
  expect(accessibility).not.toMatch(privateText);
  const attributes = await page
    .locator('[title], [alt], [aria-label]')
    .evaluateAll((elements) =>
      elements
        .flatMap((element) =>
          ['title', 'alt', 'aria-label'].map((name) =>
            element.getAttribute(name),
          ),
        )
        .join(' '),
    );
  expect(attributes).not.toMatch(privateText);

  const share = page.evaluate(
    () =>
      new Promise<{
        keys: string[];
        title: string;
        name: string;
        bytes: number[];
      }>((resolve) => {
        window.addEventListener(
          'card-share',
          (event) => resolve((event as CustomEvent).detail),
          { once: true },
        );
      }),
  );
  await card.getByRole('button', { name: 'Поделиться PNG' }).click();
  const result = await share;
  expect(result.keys).toEqual(['files', 'title']);
  expect(result.title).toBe('Money Level');
  expect(result.name).toBe('money-level.png');
  expect(pngDigest(Buffer.from(result.bytes))).toBe(masked);

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Скрыть суммы', pressed: true }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText(privateText);
});
