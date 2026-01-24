/* eslint-disable no-console */
/**
 * Why: Task 007 requires Electron target verification (branding + layout) with screenshot evidence.
 * We launch the Electron target with a remote debugging port and use Puppeteer to:
 * - assert the window/document title includes "WriteNow"
 * - assert Welcome + AI Panel placeholder render
 * - capture a screenshot artifact
 *
 * This uses the real Theia Electron app (no stubs).
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const ELECTRON_APP_DIR = path.join(ROOT, 'electron-app');
const ELECTRON_BIN = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron');

function withLocalSysdepsEnv(env) {
  if (env.PKG_CONFIG) return env;
  const sysroot = path.join(ROOT, '.sysdeps', 'root');
  const pkgConfig = path.join(sysroot, 'usr', 'bin', 'pkg-config');
  // eslint-disable-next-line no-sync
  const hasSysroot = require('node:fs').existsSync(pkgConfig);
  if (!hasSysroot) return env;

  return {
    ...env,
    PATH: `${path.join(sysroot, 'usr', 'bin')}:${env.PATH || ''}`,
    LD_LIBRARY_PATH: `${path.join(sysroot, 'usr', 'lib', 'x86_64-linux-gnu')}${env.LD_LIBRARY_PATH ? `:${env.LD_LIBRARY_PATH}` : ''}`,
    PKG_CONFIG_SYSROOT_DIR: sysroot,
    PKG_CONFIG_PATH: `${path.join(sysroot, 'usr', 'lib', 'x86_64-linux-gnu', 'pkgconfig')}:${path.join(sysroot, 'usr', 'share', 'pkgconfig')}`,
  };
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to acquire a TCP port'));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForDebugPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${port}/json/list`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  throw new Error(`Timed out waiting for Electron debug port: ${url}`);
}

async function ensureWorkspace() {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-electron-workspace-'));
  await fs.writeFile(path.join(workspaceDir, 'test.md'), '# WriteNow Electron\n\nHello.\n', 'utf8');
  return workspaceDir;
}

async function main() {
  const workspaceDir = await ensureWorkspace();
  const theiaConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-electron-config-'));
  const artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-electron-artifacts-'));

  const debugPort = process.env.WN_THEIA_ELECTRON_DEBUG_PORT
    ? Number(process.env.WN_THEIA_ELECTRON_DEBUG_PORT)
    : await findFreePort();

  assert(await fs.stat(ELECTRON_BIN), `electron binary not found: ${ELECTRON_BIN}`);

  const env = withLocalSysdepsEnv({
    ...process.env,
    THEIA_CONFIG_DIR: theiaConfigDir,
  });

  console.log('[p1-007/electron] launching electron with debug port', debugPort);

  const child = spawn(
    ELECTRON_BIN,
    [`--remote-debugging-port=${debugPort}`, '.', workspaceDir],
    { cwd: ELECTRON_APP_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let childStdout = '';
  let childStderr = '';
  const appendLimited = (current, chunk, limit) => {
    const next = current + chunk;
    return next.length > limit ? next.slice(next.length - limit) : next;
  };
  child.stdout.on('data', (d) => (childStdout = appendLimited(childStdout, d.toString(), 20_000)));
  child.stderr.on('data', (d) => (childStderr = appendLimited(childStderr, d.toString(), 20_000)));

  const cleanup = async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  };

  try {
    await waitForDebugPort(debugPort, 30_000);

    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${debugPort}` });

    const deadline = Date.now() + 60_000;
    let page;
    while (!page && Date.now() < deadline) {
      const pages = await browser.pages();
      page = pages.find((p) => (p.url() || '').includes('index.html'));
      if (!page) await new Promise((r) => setTimeout(r, 200));
    }
    assert(page, 'expected to find an Electron renderer page');

    await page.waitForSelector('[data-testid="writenow-welcome"]', { timeout: 60_000 });
    await page.waitForSelector('[data-testid="writenow-ai-panel"]', { timeout: 60_000 });

    const title = await page.title();
    console.log('[p1-007/electron] title:', JSON.stringify(title));
    assert(/WriteNow/i.test(title), `expected title to include WriteNow, got: ${title}`);

    const screenshotPath = path.join(artifactsDir, 'electron-startup.png');
    await page.screenshot({ path: screenshotPath });

    await browser.disconnect();

    console.log('[p1-007/electron] artifacts:', artifactsDir);
    console.log('[p1-007/electron] screenshot:', screenshotPath);
    console.log('[p1-007/electron] PASS');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('[p1-007/electron] FAIL', err);
  process.exitCode = 1;
});
