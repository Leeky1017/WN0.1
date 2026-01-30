import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { closeWriteNowApp, isWSL, launchWriteNowApp } from '../_utils/writenow';

test.describe('@i18n language switch', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('P6: switching language takes effect immediately and persists after restart', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-i18n-'));

    const app1 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app1;

      await page.getByTestId('activity-tab-settings').click();
      await expect(page.getByText('外观与编辑器')).toBeVisible();

      const languageSelect = page.getByTestId('settings-language-select');
      await languageSelect.selectOption('en');

      await expect(page.getByText('Appearance & Editor')).toBeVisible();
      await expect(languageSelect).toHaveValue('en');
    } finally {
      await closeWriteNowApp(app1);
    }

    const app2 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app2;
      await page.getByTestId('activity-tab-settings').click();

      await expect(page.getByText('Appearance & Editor')).toBeVisible();
      await expect(page.getByTestId('settings-language-select')).toHaveValue('en');
    } finally {
      await closeWriteNowApp(app2);
    }
  });
});
