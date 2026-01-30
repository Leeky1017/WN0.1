import { readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const GLOBAL_BACKEND_PID_FILE = path.join(os.tmpdir(), 'writenow-backend.pid');

export type LaunchWriteNowOptions = {
  userDataDir: string;
  extraEnv?: Record<string, string>;
};

export type LaunchWriteNowResult = {
  electronApp: ElectronApplication;
  page: Page;
  userDataDir: string;
  backendPid: number | null;
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

  let page: Page | null = null;
  try {
    page = await electronApp.firstWindow();
    await expect(page.getByTestId('wm-header')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('wm-connection-indicator')).toContainText('已连接', { timeout: 60_000 });
  } catch (error) {
    const url = page ? page.url() : '<no window>';
    let logTail = '';
    try {
      const raw = await readFile(path.join(options.userDataDir, 'logs', 'main.log'), 'utf8');
      logTail = raw.slice(-4000);
    } catch {
      logTail = '<main.log not found>';
    }

    // Why: If `firstWindow` / readiness checks fail, Playwright won't have a handle to close the app.
    // We must hard-clean here to avoid cascading port-3000 conflicts and worker teardown hangs.
    const backendPidOnFailure = await readBackendPidFromPidFile(options.userDataDir);
    await closeElectronAppHard(electronApp, 5_000);
    await cleanupBackendProcess(options.userDataDir, backendPidOnFailure);

    throw new Error(
      `UI not ready (wm-header). url=${url}\nmain.log tail:\n${logTail}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!page) {
    throw new Error('Unexpected: Electron launched but no window was created');
  }

  let backendPid: number | null = null;
  const pidDeadline = Date.now() + 2_000;
  while (!backendPid && Date.now() < pidDeadline) {
    backendPid = await readBackendPidFromPidFile(options.userDataDir);
    if (backendPid) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { electronApp, page, userDataDir: options.userDataDir, backendPid };
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

type BackendPidFileRecord = {
  pid: number;
};

async function readBackendPidFromPidFilePath(pidFilePath: string): Promise<number | null> {
  try {
    const raw = await readFile(pidFilePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Partial<BackendPidFileRecord>;
      if (typeof record.pid === 'number' && Number.isFinite(record.pid) && record.pid > 0) return record.pid;
    }
  } catch {
    // ignore
  }

  return null;
}

async function readBackendPidFromPidFile(userDataDir: string): Promise<number | null> {
  const candidates = [path.join(userDataDir, 'backend.pid'), GLOBAL_BACKEND_PID_FILE];
  for (const pidFilePath of candidates) {
    const pid = await readBackendPidFromPidFilePath(pidFilePath);
    if (pid) return pid;
  }
  return null;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EPERM';
  }
}

async function killPid(pid: number, timeoutMs: number): Promise<boolean> {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (!isPidAlive(pid)) return true;
    } catch {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }

  const killDeadline = Date.now() + 1_000;
  while (Date.now() < killDeadline) {
    if (!isPidAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return !isPidAlive(pid);
}

async function closeElectronAppHard(electronApp: ElectronApplication, timeoutMs: number): Promise<void> {
  const proc = electronApp.process();
  const closePromise = electronApp.close().catch(() => undefined);
  await Promise.race([
    closePromise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);

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
}

async function cleanupBackendProcess(userDataDir: string, pidHint: number | null): Promise<void> {
  const userPidFilePath = path.join(userDataDir, 'backend.pid');
  const pidFromFile = await readBackendPidFromPidFile(userDataDir);
  const pidSet = new Set<number>();
  if (pidHint) pidSet.add(pidHint);
  if (pidFromFile) pidSet.add(pidFromFile);

  let allKilled = true;
  for (const pid of pidSet) {
    const killed = await killPid(pid, 2_000);
    if (!killed) {
      allKilled = false;
      console.warn(`[e2e] backend pid ${pid} still alive after kill attempts; leaving pid file for next run`);
    }
  }

  if (!allKilled) return;

  const maybeUnlink = async (pidFilePath: string): Promise<void> => {
    const pid = await readBackendPidFromPidFilePath(pidFilePath);
    if (pid && isPidAlive(pid)) return;
    try {
      await unlink(pidFilePath);
    } catch {
      // ignore
    }
  };

  await maybeUnlink(userPidFilePath);
  await maybeUnlink(GLOBAL_BACKEND_PID_FILE);
}

/**
 * Close the Electron app and hard-kill if needed.
 *
 * Why: Playwright worker teardown can hang if Electron lingers (WSL/CI flake).
 */
export async function closeWriteNowApp(app: LaunchWriteNowResult): Promise<void> {
  await closeElectronAppHard(app.electronApp, 5_000);

  // Why: If Electron is SIGKILLed, its backend child can outlive and keep port 3000 occupied → cascading E2E failures.
  await cleanupBackendProcess(app.userDataDir, app.backendPid);
}

/**
 * Force-close the Electron app to simulate a crash, then ensure test isolation by cleaning up the backend.
 *
 * Why: WM-005 validates recovery after an unexpected shutdown. In CI, the orphan backend can keep port 3000 occupied,
 * causing cascading E2E failures and Playwright worker teardown timeouts.
 */
export async function forceCloseWriteNowApp(app: LaunchWriteNowResult): Promise<void> {
  const proc = app.electronApp.process();
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

  await closeElectronAppHard(app.electronApp, 2_000);
  await cleanupBackendProcess(app.userDataDir, app.backendPid);
}
