/* eslint-disable no-console */
/**
 * Why: Phase 0 PoC requires a reproducible, non-interactive verification of:
 * - `.md` opener uses TipTap widget
 * - typing works
 * - Ctrl/Cmd+Z undo (editor-owned)
 * - Ctrl/Cmd+S save (Theia-owned)
 * - Ctrl/Cmd+B bold (editor-owned)
 * - Tab inserts indentation (editor-owned)
 * - Ctrl/Cmd+K can be rerouted to a WriteNow-owned action
 *
 * This is intentionally minimal and uses the real Theia UI + real filesystem.
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.join(ROOT, 'poc-workspace');
const TEST_FILE = path.join(WORKSPACE, 'test.md');
const HOST = '127.0.0.1';
const PORT = process.env.WN_THEIA_POC_PORT ? Number(process.env.WN_THEIA_POC_PORT) : 3010;
const BASE_URL = `http://${HOST}:${PORT}`;

function withLocalSysdepsEnv(env) {
  const sysroot = path.join(ROOT, '.sysdeps', 'root');
  const pkgConfig = path.join(sysroot, 'usr', 'bin', 'pkg-config');
  return require('node:fs').existsSync(pkgConfig)
    ? {
        ...env,
        PATH: `${path.join(sysroot, 'usr', 'bin')}:${env.PATH || ''}`,
        LD_LIBRARY_PATH: `${path.join(sysroot, 'usr', 'lib', 'x86_64-linux-gnu')}${env.LD_LIBRARY_PATH ? `:${env.LD_LIBRARY_PATH}` : ''}`,
        PKG_CONFIG_SYSROOT_DIR: sysroot,
        PKG_CONFIG_PATH: `${path.join(sysroot, 'usr', 'lib', 'x86_64-linux-gnu', 'pkgconfig')}:${path.join(sysroot, 'usr', 'share', 'pkgconfig')}`,
      }
    : env;
}

async function waitForLine(stream, pattern, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let buffer = '';

  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (pattern.test(buffer)) {
        cleanup();
        resolve(buffer);
      }
      if (Date.now() > deadline) {
        cleanup();
        reject(new Error(`Timed out waiting for pattern: ${String(pattern)}`));
      }
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`Theia process exited early with code ${code}`));
    };
    const cleanup = () => {
      stream.off('data', onData);
      stream.off('error', onError);
    };
    stream.on('data', onData);
    stream.on('error', onError);
    // caller handles child exit
  });
}

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function main() {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const baseline = `# Theia TipTap PoC

Hello **TipTap**.

- [ ] Ctrl/Cmd+Z undo
- [ ] Ctrl/Cmd+S save
- [ ] Ctrl/Cmd+B bold
- [ ] Tab indent
`;
  await fs.writeFile(TEST_FILE, baseline, 'utf8');

  // Why: Theia rebuild swaps native addons between browser/electron targets. If the user ran
  // `yarn build:electron` previously, `better-sqlite3` may be left in an Electron-ABI state.
  // Force a browser rebuild to keep this PoC reproducible.
  console.log('[poc001] ensuring browser native modules (theia rebuild:browser)');
  await runCommand('yarn', ['--cwd', 'browser-app', 'rebuild'], {
    cwd: ROOT,
    env: withLocalSysdepsEnv(process.env),
  });

  console.log(`[poc001] starting Theia browser app at ${BASE_URL}`);
  const child = spawn(
    'yarn',
    [
      '--cwd',
      'browser-app',
      'start',
      '--hostname',
      HOST,
      '--port',
      String(PORT),
      '--set-preference',
      'writenow.poc.autoOpenTestMarkdown=true',
      path.relative(path.join(ROOT, 'browser-app'), WORKSPACE),
    ],
    {
      cwd: ROOT,
      env: withLocalSysdepsEnv(process.env),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  );

  child.stderr.on('data', (d) => process.stderr.write(d));

  const cleanup = async () => {
    try {
      // Kill the whole process group (yarn -> node backend).
      process.kill(-child.pid, 'SIGINT');
    } catch {
      try {
        child.kill('SIGINT');
      } catch {
        // ignore
      }
    }
  };

  try {
    await waitForLine(child.stdout, new RegExp(`Theia app listening on http://${HOST}:${PORT}\\.`), 60_000);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    page.on('console', (msg) => {
      const type = msg.type();
      if (type !== 'error' && type !== 'warning' && type !== 'warn') return;
      console.log(`[browser:${type}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => console.error('[browser:pageerror]', err));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Ensure the workspace UI has mounted before waiting for auto-open to finish.
    await page.waitForSelector('.theia-Files');

    // Ensure TipTap widget is used.
    await page.waitForSelector('[data-testid=\"writenow-tiptap-markdown-editor\"]');

    // Focus inside the editor and type.
    await page.waitForSelector('.writenow-tiptap-editor');
    await page.click('.writenow-tiptap-editor');
    await page.keyboard.type('\nHello ');
    // Why: PoC requirement includes IME behavior; while headless CI cannot validate a real IME,
    // we at least assert that Unicode input is persisted end-to-end.
    await page.keyboard.type('中文输入');

    // Tab should insert indentation (2 spaces), not move focus.
    await page.keyboard.press('Tab');
    await page.keyboard.type('tabbed');

    // Bold should stay in-editor (not routed to Theia).
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyB');
    await page.keyboard.up('Control');
    await page.keyboard.type('Bold');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyB');
    await page.keyboard.up('Control');
    await page.keyboard.type(' plain');

    // Why: ProseMirror history groups changes within a short window. Ensure the upcoming
    // "UNDO" input is its own history item so Ctrl+Z removes only that suffix.
    await delay(700);

    // Undo should stay in-editor.
    await page.keyboard.type(' UNDO');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyZ');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => !document.body?.innerText.includes('UNDO'), { timeout: 15_000 });

    // Redo should also stay in-editor (Ctrl/Cmd+Shift+Z).
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyZ');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => document.body?.innerText.includes('UNDO'), { timeout: 15_000 });

    // Cleanup: undo again so we persist the final state without the UNDO suffix.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyZ');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => !document.body?.innerText.includes('UNDO'), { timeout: 15_000 });

    // Ctrl+K should be routed to the WriteNow PoC command.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await page.waitForFunction(
      () => document.body && document.body.innerText.includes('Inline AI (PoC)'),
      { timeout: 15_000 },
    );

    // Ctrl+S should save to disk via Theia's Save command.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('Control');

    // Give the backend a moment to flush.
    await delay(750);

    await browser.close();

    const updated = await fs.readFile(TEST_FILE, 'utf8');
    console.log('[poc001] updated markdown preview:\\n' + updated.slice(0, 400));

    assert(updated.includes('Hello'), 'expected typed text to be saved');
    assert(updated.includes('中文输入'), 'expected unicode text to be saved');
    assert(updated.includes('tabbed'), 'expected tabbed text to be saved');
    assert(!updated.includes('UNDO'), 'expected undo to remove the UNDO text before saving');
    assert(updated.includes('Bold'), 'expected bold text to be present');

    console.log('[poc001] PASS');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('[poc001] FAIL', err);
  process.exitCode = 1;
});
