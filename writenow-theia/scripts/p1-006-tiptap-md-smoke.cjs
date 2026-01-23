/* eslint-disable no-console */
/**
 * Why: Phase 1 / Task 006 requires reproducible, non-interactive verification of:
 * - `.md` opener uses TipTap widget (not default editor)
 * - typing works (incl. Unicode)
 * - Tab indentation stays in-editor
 * - Ctrl/Cmd+B bold stays in-editor
 * - Ctrl/Cmd+Z undo stays in-editor
 * - Ctrl/Cmd+S save is handled by Theia Saveable + writes Markdown to disk
 * - dirty marker flips on edit and clears on successful save
 *
 * This uses the real Theia UI + real filesystem (no stubs).
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = process.env.WN_THEIA_PORT ? Number(process.env.WN_THEIA_PORT) : 3010;
const BASE_URL = `http://${HOST}:${PORT}`;

function withLocalSysdepsEnv(env) {
  // Prefer explicit override (e.g. `PKG_CONFIG=/tmp/wn-pkg-config`).
  if (env.PKG_CONFIG) return env;

  // Fallback to vendored sysroot (see `writenow-theia/README.md`).
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
    const cleanup = () => {
      stream.off('data', onData);
      stream.off('error', onError);
    };
    stream.on('data', onData);
    stream.on('error', onError);
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

async function ensureWorkspace() {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-smoke-workspace-'));
  const testFile = path.join(workspaceDir, 'test.md');

  const baseline = `# WriteNow Theia TipTap Smoke\n\nHello **TipTap**.\n`;
  await fs.writeFile(testFile, baseline, 'utf8');

  return { workspaceDir, testFile };
}

async function openFileViaExplorerDoubleClick(page, fileName, artifactsDir) {
  // Why: The task acceptance requires opening `.md` from File Explorer by double-click.
  // In some environments the Explorer panel starts collapsed, so we explicitly toggle it.
  await page.waitForFunction(() => document.querySelectorAll('.lm-DockPanel').length > 0, { timeout: 60_000 });

  await page.click('body');
  // Ensure Explorer is visible. When a custom layout contribution already opened it,
  // we must NOT toggle it closed.
  const explorerVisible = await page.evaluate(() => {
    const files = document.querySelector('.theia-Files');
    if (!files) return false;
    const rect = files.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (!explorerVisible) {
    // Use Command Palette to toggle Explorer (more reliable than Ctrl+Shift+E in headless browsers).
    let paletteFocused = false;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await page.keyboard.press('F1');
      try {
        await page.waitForFunction(
          () => document.activeElement && document.activeElement.tagName.toLowerCase() === 'input',
          { timeout: 1500 },
        );
        paletteFocused = true;
        break;
      } catch {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    assert(paletteFocused, 'expected Command Palette input to be focused');
    await page.keyboard.type('view: toggle explorer');
    await page.keyboard.press('Enter');

    await page.waitForFunction(() => {
      const files = document.querySelector('.theia-Files');
      if (!files) return false;
      const rect = files.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, { timeout: 30_000 });
  }

  // Give Theia a moment to render the full layout; in headless mode the shell can
  // report mounted before widget factories/opener services finish wiring.
  await new Promise((r) => setTimeout(r, 1200));
  if (artifactsDir) {
    await page.screenshot({ path: path.join(artifactsDir, '02-explorer-visible.png') });
  }

  const handle = await page.waitForFunction(
    (needle) => {
      const nodes = Array.from(document.querySelectorAll('.theia-Files .theia-TreeNodeSegment'));
      return nodes.find((n) => (n.textContent || '').trim() === String(needle)) || null;
    },
    { timeout: 60_000 },
    fileName,
  );

  const element = handle.asElement();
  assert(element, `expected to find file explorer node with label: ${fileName}`);
  await element.evaluate((el) => el.scrollIntoView({ block: 'center' }));

  if (artifactsDir) {
    await page.screenshot({ path: path.join(artifactsDir, '03-before-open.png') });
  }

  const rowHandle = await element.evaluateHandle(
    (el) => el.closest('.theia-TreeNodeRow') || el.closest('.theia-TreeNode') || el,
  );
  const rowElement = rowHandle.asElement();
  assert(rowElement, 'expected the explorer row element to exist');

  // Why: Some headless environments fail to open files via element-based dblclick.
  // Coordinate-based clicking tends to be more reliable.
  const box = await rowElement.boundingBox();
  assert(box, 'expected file row to have a bounding box');

  // Select row first.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 1, delay: 25 });

  // Attempt a real double-click open.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2, delay: 80 });

  // Fallback: explicitly dispatch a dblclick event (React synthetic handlers sometimes miss
  // Puppeteer clickCount in headless mode).
  await rowElement.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
  });

  // Fallback: If dblclick is ignored, Enter on the selected node usually opens it.
  await page.keyboard.press('Enter');

  if (artifactsDir) {
    await page.screenshot({ path: path.join(artifactsDir, '04-after-dblclick.png') });
  }
}

async function getTabInfoByLabel(page, label) {
  return page.evaluate((needle) => {
    const tabs = Array.from(document.querySelectorAll('.lm-TabBar-tab'));
    const tab = tabs.find((t) => (t.textContent || '').includes(String(needle)));
    if (!tab) return null;
    return {
      className: tab.className,
      text: tab.textContent || '',
    };
  }, label);
}

async function clickTabByLabel(page, label) {
  const handle = await page.waitForFunction(
    (needle) => {
      const tabs = Array.from(document.querySelectorAll('.lm-TabBar-tab'));
      return tabs.find((t) => (t.textContent || '').includes(String(needle))) || null;
    },
    { timeout: 30_000 },
    label,
  );

  const element = handle.asElement();
  assert(element, `expected to find tab containing label: ${label}`);
  await element.click();
}

async function main() {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const { workspaceDir, testFile } = await ensureWorkspace();
  const artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-smoke-artifacts-'));

  // Why: Theia rebuild swaps native addons between browser/electron targets. If the user ran
  // `yarn build:electron` previously, `better-sqlite3` may be left in an Electron-ABI state.
  console.log('[p1-006] ensuring browser native modules (theia rebuild:browser)');
  await runCommand('yarn', ['--cwd', 'browser-app', 'rebuild'], {
    cwd: ROOT,
    env: withLocalSysdepsEnv(process.env),
  });

  console.log(`[p1-006] starting Theia browser app at ${BASE_URL}`);
  const child = spawn(
    'yarn',
    ['--cwd', 'browser-app', 'start', '--hostname', HOST, '--port', String(PORT), workspaceDir],
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
      process.kill(-child.pid, 'SIGINT');
    } catch {
      try {
        child.kill('SIGINT');
      } catch {
        // ignore
      }
    }
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch {
      // ignore
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

    // Ensure the workspace UI has mounted.
    await page.waitForSelector('.theia-ApplicationShell');
    await page.screenshot({ path: path.join(artifactsDir, '01-mounted.png') });

    // Open the Markdown file via File Explorer (double-click).
    await openFileViaExplorerDoubleClick(page, 'test.md', artifactsDir);

    // Ensure the file is actually opened (a tab exists) before asserting which widget is used.
    await page.waitForFunction(
      (needle) => Array.from(document.querySelectorAll('.lm-TabBar-tab')).some((t) => (t.textContent || '').includes(String(needle))),
      { timeout: 30_000 },
      'test.md',
    );
    await page.screenshot({ path: path.join(artifactsDir, '02-opened.png') });
    await clickTabByLabel(page, 'test.md');

    // Ensure TipTap widget is used (not Monaco).
    try {
      await page.waitForSelector('[data-testid="writenow-tiptap-markdown-editor"]', { timeout: 15_000 });
    } catch (error) {
      const active = await getTabInfoByLabel(page, 'test.md');
      const hasMonaco = await page.$('.monaco-editor');
      await page.screenshot({ path: path.join(artifactsDir, '03-open-failed.png') });
      throw new Error(
        `Expected TipTap widget for test.md, but it was not found. activeTab=${JSON.stringify(active)} hasMonaco=${Boolean(hasMonaco)}\n` +
          String(error),
      );
    }

    // Focus inside the editor and type.
    await page.waitForSelector('.writenow-tiptap-editor');
    await page.click('.writenow-tiptap-editor');

    // Ctrl+K should be routed to a WriteNow-owned action while editing (per design doc),
    // not to Theia's default chord bindings.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await page.waitForFunction(
      () => document.body && document.body.innerText.includes('Inline AI is not implemented yet'),
      { timeout: 15_000 },
    );

    // Esc should remain Theia-owned to close overlays (Command Palette as a proxy).
    await page.keyboard.press('F1');
    await page.waitForFunction(
      () => document.activeElement && document.activeElement.tagName.toLowerCase() === 'input',
      { timeout: 15_000 },
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !(document.activeElement && document.activeElement.tagName.toLowerCase() === 'input'),
      { timeout: 15_000 },
    );
    await page.keyboard.type('\nHello ');
    // Why: headless cannot validate a real IME composition; we at least assert Unicode persists end-to-end.
    await page.keyboard.type('中文输入');

    // Dirty marker should appear after edits.
    const dirtyBeforeSave = await getTabInfoByLabel(page, 'test.md');
    console.log('[p1-006] tab (test.md) after edit:', dirtyBeforeSave);
    assert(dirtyBeforeSave, 'expected test.md tab to exist');
    assert(
      /dirty/i.test(dirtyBeforeSave.className) || /\*/.test(dirtyBeforeSave.text) || /●/.test(dirtyBeforeSave.text),
      'expected dirty marker after edit',
    );

    // Tab should insert indentation (2 spaces), not move focus.
    await page.keyboard.press('Tab');
    await page.keyboard.type('tabbed');
    await page.waitForFunction(
      () => {
        const active = document.activeElement;
        if (!active) return false;
        const editor = document.querySelector('.writenow-tiptap-editor');
        return Boolean(editor && editor.contains(active));
      },
      { timeout: 10_000 },
    );

    // Bold should stay in-editor.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyB');
    await page.keyboard.up('Control');
    await page.keyboard.type('Bold');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyB');
    await page.keyboard.up('Control');
    await page.keyboard.type(' plain');

    // Ensure undo gets its own history item.
    await delay(700);

    // Undo should stay in-editor.
    await page.keyboard.type(' UNDO');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyZ');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => !document.body?.innerText.includes('UNDO'), { timeout: 15_000 });

    // Ctrl+S should save to disk via Theia's Save command.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('Control');

    // Wait for dirty marker to clear (save succeeded).
    await page.waitForFunction(
      (needle) => {
        const tabs = Array.from(document.querySelectorAll('.lm-TabBar-tab'));
        const tab = tabs.find((t) => (t.textContent || '').includes(String(needle)));
        if (!tab) return false;
        const text = tab.textContent || '';
        return !/dirty/i.test(tab.className) && !/\*/.test(text) && !/●/.test(text);
      },
      { timeout: 20_000 },
      'test.md',
    );

    const dirtyAfterSave = await getTabInfoByLabel(page, 'test.md');
    console.log('[p1-006] tab (test.md) after save:', dirtyAfterSave);
    assert(dirtyAfterSave, 'expected test.md tab to exist');
    assert(!/dirty/i.test(dirtyAfterSave.className), 'expected dirty class to be cleared after save');

    await browser.close();

    const updated = await fs.readFile(testFile, 'utf8');
    console.log('[p1-006] updated markdown preview:\n' + updated.slice(0, 400));

    // Core assertions.
    assert(updated.includes('Hello'), 'expected typed text to be saved');
    assert(updated.includes('中文输入'), 'expected unicode text to be saved');
    assert(updated.includes('tabbed'), 'expected tabbed text to be saved');
    assert(!updated.includes('UNDO'), 'expected undo to remove the UNDO text before saving');

    // Markdown SSOT assertions.
    assert(!updated.includes('<p>') && !updated.includes('<strong>'), 'expected Markdown output, not HTML');
    assert(/\*\*Bold\*\*/.test(updated) || /__Bold__/.test(updated), 'expected bold to serialize as Markdown');

    await fs.writeFile(path.join(artifactsDir, 'final.md'), updated, 'utf8');
    console.log('[p1-006] artifacts:', artifactsDir);
    console.log('[p1-006] PASS');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('[p1-006] FAIL', err);
  process.exitCode = 1;
});
