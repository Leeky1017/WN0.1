import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

import { expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

export type LaunchWriteNowOptions = {
  userDataDir: string;
  extraEnv?: Record<string, string>;
};

export type LaunchWriteNowResult = {
  electronApp: ElectronApplication;
  page: Page;
  userDataDir: string;
};

export function isWSL(): boolean {
  return Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Launch the WriteNow Electron app with a fully isolated userData dir.
 *
 * Why: E2E must not contaminate real user data, and failures must be diagnosable via `main.log`.
 */
export async function launchWriteNowApp(options: LaunchWriteNowOptions): Promise<LaunchWriteNowResult> {
  const electronArgs = ['.'];
  if (process.platform === 'linux') {
    // Why: GitHub-hosted Linux runners do not have the Electron/Chromium SUID sandbox configured.
    // Disabling the sandbox is acceptable for CI E2E and avoids flaky permission issues.
    electronArgs.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  const electronApp = await electron.launch({
    args: electronArgs,
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: options.userDataDir,
      // Why: Some CI/WSL environments crash Electron when GPU initialization fails.
      WN_DISABLE_GPU: '1',
      // Why: WSLg + Wayland can crash Electron renderer in CI-like runs; prefer X11 for stability.
      ELECTRON_OZONE_PLATFORM_HINT: 'x11',
      WAYLAND_DISPLAY: '',
      ...(options.extraEnv ?? {}),
    },
  });

  const page = await electronApp.firstWindow();
  try {
    await expect(page.getByTestId('wm-header')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('wm-connection-indicator')).toContainText('已连接', { timeout: 60_000 });
  } catch (error) {
    const url = page.url();
    let logTail = '';
    try {
      const raw = await readFile(path.join(options.userDataDir, 'logs', 'main.log'), 'utf8');
      logTail = raw.slice(-4000);
    } catch {
      logTail = '<main.log not found>';
    }
    throw new Error(
      `UI not ready (wm-header). url=${url}\nmain.log tail:\n${logTail}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { electronApp, page, userDataDir: options.userDataDir };
}

export async function createNewFile(page: Page, name: string): Promise<void> {
  await page.locator('button[title="新建文件"]').click();
  const nameInput = page.getByPlaceholder('未命名');
  await nameInput.fill(name);
  await nameInput.press('Enter');

  await expect(
    page
      .getByTestId('layout-sidebar')
      .getByRole('treeitem', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) }),
  ).toBeVisible({ timeout: 30_000 });
}

async function killBackendFromPidFile(userDataDir: string): Promise<void> {
  const pidFilePath = path.join(userDataDir, 'backend.pid');
  let pid: number | null = null;
  try {
    const raw = await readFile(pidFilePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as { pid?: unknown };
      if (typeof record.pid === 'number' && Number.isFinite(record.pid) && record.pid > 0) {
        pid = record.pid;
      }
    }
  } catch {
    pid = null;
  }

  if (!pid) return;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }

  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
      // still alive
    } catch {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }

  try {
    await unlink(pidFilePath);
  } catch {
    // ignore
  }
}

/**
 * Close the Electron app and hard-kill if needed.
 *
 * Why: Playwright worker teardown can hang if Electron lingers (WSL/CI flake).
 */
export async function closeWriteNowApp(app: LaunchWriteNowResult): Promise<void> {
  const proc = app.electronApp.process();
  await app.electronApp.close().catch(() => undefined);
  if (proc && proc.exitCode === null) {
    try {
      proc.kill('SIGKILL');
    } catch {
      try {
        proc.kill();
      } catch {
        // ignore
      }
    }
  }

  // Why: If Electron is SIGKILLed, its backend child can outlive and keep port 3000 occupied → cascading E2E failures.
  await killBackendFromPidFile(app.userDataDir);
}
