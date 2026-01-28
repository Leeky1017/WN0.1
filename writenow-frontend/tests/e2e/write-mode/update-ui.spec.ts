import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { closeWriteNowApp, isWSL, launchWriteNowApp } from '../_utils/writenow';

test.describe('@update UI', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('P7: Update section renders and check triggers a non-idle status', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-update-'));
    const app = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app;

      await page.getByTestId('activity-tab-settings').click();

      const section = page.getByTestId('settings-update-section');
      await expect(section).toBeVisible();

      const status = page.getByTestId('update-status');
      await expect(status).toHaveAttribute(
        'data-status',
        /idle|checking|available|not_available|downloading|downloaded|error/,
      );

      await page.getByTestId('update-check').click();

      await expect(status).toHaveAttribute(
        'data-status',
        /checking|available|not_available|downloading|downloaded|error/,
      );
    } finally {
      await closeWriteNowApp(app);
    }
  });
});

