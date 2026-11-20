import { expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { testWithOrigin as test } from './build-origin.js';
import { record, setupJournal } from './journal-fixture.js';

const run = promisify(execFile);
const web = fileURLToPath(new URL('../', import.meta.url));
test('activating a new production service worker preserves the existing IndexedDB journal offline', async ({
  buildOrigin,
  page,
}) => {
  test.setTimeout(60_000);
  const previousVersion = JSON.parse(
    await readFile(join(web, 'package.json'), 'utf8'),
  ).version;
  const nextVersion = previousVersion + '-update-test';
  const nextBuild = await mkdtemp(join(tmpdir(), 'money-level-update-'));
  try {
    await run('pnpm', ['exec', 'vite', 'build', '--outDir', nextBuild], {
      cwd: web,
      env: { ...process.env, MONEY_LEVEL_BUILD_VERSION: nextVersion },
    });
    await setupJournal(page, '1000', buildOrigin.url);
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await record(page, 'Расход', '182,35', 'Еда');
    await expect(page.getByTestId('total-balance')).toHaveText('817,65 ₽');
    await page.getByRole('link', { name: 'Профиль', exact: true }).click();
    await expect(page.getByTestId('app-version')).toHaveText(previousVersion);
    const schema = await page.getByTestId('schema-version').textContent();

    buildOrigin.useBuild(nextBuild);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const previous = navigator.serviceWorker.controller;
      const activated = new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            if (navigator.serviceWorker.controller !== previous) resolve();
          },
          { once: true },
        );
      });
      await registration.update();
      await activated;
    });

    buildOrigin.disconnect();
    await page.reload();
    await expect(page.getByTestId('app-version')).toHaveText(nextVersion);
    await expect(page.getByTestId('schema-version')).toHaveText(schema ?? '');
    await page.getByRole('link', { name: 'Главная', exact: true }).click();
    await expect(page.getByTestId('total-balance')).toHaveText('817,65 ₽');
    await page.getByRole('link', { name: 'История', exact: true }).click();
    await expect(page.getByRole('link', { name: /Еда.*182,35/ })).toBeVisible();
  } finally {
    await rm(nextBuild, { recursive: true, force: true });
  }
});
