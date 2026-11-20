import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = 'http://127.0.0.1:' + port;
const useWebKit = process.env.PLAYWRIGHT_MOBILE_ENGINE === 'webkit';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices[useWebKit ? 'iPhone 13' : 'Pixel 7'],
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    launchOptions: !useWebKit && executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port ' + port + ' --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
});
