import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { _electron as electron } from '@playwright/test';

const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-fev2-debug-'));
console.log('userDataDir:', userDataDir);

const electronApp = await electron.launch({
  args: ['.'],
  env: {
    ...process.env,
    WN_E2E: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
  },
});

const page = await electronApp.firstWindow();
page.on('console', (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.stack || err.message));
page.on('close', () => console.log('[page] closed'));
page.on('crash', () => console.log('[page] crashed'));

try {
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
  console.log('domcontentloaded');

  await page.getByTestId('layout-sidebar').waitFor({ timeout: 30_000 });
  console.log('sidebar visible');
} catch (error) {
  console.log('wait failed:', error?.message || String(error));
  const html = await page.content().catch(() => '<unable to read content>');
  console.log('page content preview:\n', html.slice(0, 2000));
  await page.screenshot({ path: 'debug-electron.png', fullPage: true }).catch(() => undefined);
  console.log('wrote screenshot: debug-electron.png');
}

await electronApp.close();

