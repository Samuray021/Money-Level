import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { record, setupJournal } from './journal-fixture.js';

const run = promisify(execFile);
const web = fileURLToPath(new URL('../', import.meta.url));
const contentType: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
};

test('activating a new production service worker preserves the existing IndexedDB journal offline', async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  const previousVersion = JSON.parse(
    await readFile(join(web, 'package.json'), 'utf8'),
  ).version;
  const nextVersion = previousVersion + '-update-test';
  const nextBuild = await mkdtemp(join(tmpdir(), 'money-level-update-'));
  let release = join(web, 'dist');

  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const filename = extname(pathname) ? pathname : '/index.html';
    void readFile(join(release, filename)).then(
      (bytes) => {
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type':
            contentType[extname(filename)] ?? 'application/octet-stream',
        });
        response.end(bytes);
      },
      () => response.writeHead(404).end(),
    );
  });

  try {
    await run('pnpm', ['exec', 'vite', 'build', '--outDir', nextBuild], {
      cwd: web,
      env: { ...process.env, MONEY_LEVEL_BUILD_VERSION: nextVersion },
    });
    const listening = once(server, 'listening');
    server.listen(0, '127.0.0.1');
    await listening;
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Fixture server unavailable.');
    const origin = 'http://127.0.0.1:' + address.port;

    await setupJournal(page, '1000', origin);
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await record(page, 'Расход', '182,35', 'Еда');
    await expect(page.getByTestId('total-balance')).toHaveText('817,65 ₽');
    await page.getByRole('link', { name: 'Профиль', exact: true }).click();
    await expect(page.getByTestId('app-version')).toHaveText(previousVersion);
    const schema = await page.getByTestId('schema-version').textContent();

    release = nextBuild;
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

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('app-version')).toHaveText(nextVersion);
    await expect(page.getByTestId('schema-version')).toHaveText(schema ?? '');
    await page.getByRole('link', { name: 'Главная', exact: true }).click();
    await expect(page.getByTestId('total-balance')).toHaveText('817,65 ₽');
    await page.getByRole('link', { name: 'История', exact: true }).click();
    await expect(page.getByRole('link', { name: /Еда.*182,35/ })).toBeVisible();
  } finally {
    server.close();
    server.closeAllConnections();
    await rm(nextBuild, { recursive: true, force: true });
  }
});
