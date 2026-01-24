/* eslint-disable no-console */
/**
 * Why: Phase 1 / Task 007 requires reproducible, non-interactive verification of:
 * - WriteNow branding (window/document title)
 * - default dark theme (fresh profile)
 * - Activity Bar does not expose Debug/Git/Extensions
 * - Explorer is visible and can open `.md` files
 * - main area shows a WriteNow welcome widget by default
 * - right side shows an AI Panel placeholder slot
 * - TipTap `.md` editor workflow is not regressed (multi-tab + dirty/save)
 *
 * This uses the real Theia UI + real filesystem (no stubs).
 */

const assert = require('node:assert');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, HOST, () => {
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
  let buffer = '';

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for pattern: ${String(pattern)}`));
    }, timeoutMs);

    const onData = (chunk) => {
      buffer += chunk.toString();
      if (pattern.test(buffer)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      clearTimeout(timer);
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
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-layout-workspace-'));
  const first = path.join(workspaceDir, 'test.md');
  const second = path.join(workspaceDir, 'second.md');

  await fs.writeFile(first, '# WriteNow Theia Layout Smoke\n\nHello **TipTap**.\n', 'utf8');
  await fs.writeFile(second, '# Second\n\nSecond file.\n', 'utf8');

  return { workspaceDir, first, second };
}

async function openFileViaExplorerDoubleClick(page, fileName, artifactsDir) {
  // Why: The task acceptance requires opening `.md` from File Explorer by double-click.
  await page.waitForFunction(() => document.querySelectorAll('.lm-DockPanel').length > 0, { timeout: 60_000 });

  await page.click('body');

  // Ensure Explorer is visible. When the layout contribution already opened it,
  // we must NOT toggle it closed.
  const explorerVisible = await page.evaluate(() => {
    const files = document.querySelector('.theia-Files');
    if (!files) return false;
    const rect = files.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (!explorerVisible) {
    // Command Palette is most reliable across environments.
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

  // Give Theia a moment to render the full layout.
  await new Promise((r) => setTimeout(r, 1200));
  if (artifactsDir) {
    await page.screenshot({ path: path.join(artifactsDir, `02-explorer-visible-${fileName}.png`) });
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

  const rowHandle = await element.evaluateHandle(
    (el) => el.closest('.theia-TreeNodeRow') || el.closest('.theia-TreeNode') || el,
  );
  const rowElement = rowHandle.asElement();
  assert(rowElement, 'expected the explorer row element to exist');

  const box = await rowElement.boundingBox();
  assert(box, 'expected file row to have a bounding box');

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 1, delay: 25 });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2, delay: 80 });

  // Fallback: explicitly dispatch a dblclick event.
  await rowElement.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
  });

  // Fallback: Enter on the selected node.
  await page.keyboard.press('Enter');

  if (artifactsDir) {
    await page.screenshot({ path: path.join(artifactsDir, `03-after-open-${fileName}.png`) });
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

  const { workspaceDir, first, second } = await ensureWorkspace();
  const artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-layout-artifacts-'));
  const theiaConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-config-'));


  let child;
  const cleanup = async () => {
    if (!child) return;
    if (child.exitCode !== null) return;

    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);

    if (child.exitCode === null) {
      child.kill('SIGKILL');
    }
  };

  try {
    console.log('[p1-007] ensuring browser native modules (theia rebuild:browser)');
    await runCommand('yarn', ['--cwd', 'browser-app', 'rebuild'], {
      cwd: ROOT,
      env: withLocalSysdepsEnv(process.env),
    });

    const port = process.env.WN_THEIA_PORT ? Number(process.env.WN_THEIA_PORT) : await findFreePort();
    const baseUrl = `http://${HOST}:${port}`;

    console.log(`[p1-007] starting Theia browser app at ${baseUrl}`);
    const launchEnv = withLocalSysdepsEnv({ ...process.env, THEIA_CONFIG_DIR: theiaConfigDir });
    child = spawn(
      'yarn',
      ['--cwd', 'browser-app', 'start', '--hostname', HOST, '--port', String(port), workspaceDir],
      { cwd: ROOT, env: launchEnv, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let childStdout = '';
    let childStderr = '';
    const appendLimited = (current, chunk, limit) => {
      const next = current + chunk;
      return next.length > limit ? next.slice(next.length - limit) : next;
    };

    child.stdout.on('data', (d) => {
      childStdout = appendLimited(childStdout, d.toString(), 20_000);
    });
    child.stderr.on('data', (d) => {
      childStderr = appendLimited(childStderr, d.toString(), 20_000);
    });

    const exited = new Promise((_, reject) => {
      child.on('exit', (code) => {
        reject(new Error(`theia start exited before ready (code=${code})
${childStdout}
${childStderr}`));
      });
      child.on('error', reject);
    });

    console.log('[p1-007] waiting for server readiness');
    await Promise.race([
      waitForLine(child.stdout, /Theia app listening on/i, 60_000),
      waitForLine(child.stderr, /Theia app listening on/i, 60_000),
      exited,
    ]);
    console.log('[p1-007] server ready');

    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-puppeteer-profile-'));
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], userDataDir });
    const page = await browser.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 90_000 });

    // Branding
    const title = await page.title();
    console.log('[p1-007] page title:', JSON.stringify(title));
    assert(/WriteNow/i.test(title), `expected title to include WriteNow, got: ${title}`);

    const storedTheme = await page.evaluate(() => window.localStorage.getItem('theme'));
    const prefersDark = await page.evaluate(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    console.log('[p1-007] localStorage.theme:', JSON.stringify(storedTheme));
    console.log('[p1-007] prefers-color-scheme:dark:', prefersDark);

    const configDefaultTheme = await page.evaluate(() => {
      const symbols = Object.getOwnPropertySymbols(window);
      const key = symbols.find((s) => s.description === 'FrontendApplicationConfigProvider');
      const cfg = key ? window[key] : undefined;
      return cfg ? cfg.defaultTheme : undefined;
    });
    console.log('[p1-007] frontend.config.defaultTheme:', JSON.stringify(configDefaultTheme));

    // Theme (wait for theming service to apply body class)
    await page.waitForFunction(
      () =>
        document.body &&
        (document.body.classList.contains('theia-dark') ||
          document.body.classList.contains('theia-light') ||
          document.body.classList.contains('theia-hc') ||
          document.body.classList.contains('theia-hcLight')),
      { timeout: 30_000 },
    );

    const themeClass = await page.evaluate(() => {
      const classes = Array.from(document.body.classList);
      return classes.find((c) => c.startsWith('theia-')) || '';
    });
    assert(themeClass === 'theia-dark', `expected default theme to be dark, got: ${themeClass}`);

    // Welcome
    await page.waitForSelector('[data-testid="writenow-welcome"]', { timeout: 60_000 });

    // Right panel placeholder
    await page.waitForSelector('[data-testid="writenow-ai-panel"]', { timeout: 60_000 });

    // Activity bar sanity: ensure no debug/git/extensions icon classes.
    const activityBarIcons = await page.evaluate(() => {
      const left = document.querySelector('.lm-TabBar.theia-app-left');
      if (!left) return [];
      return Array.from(left.querySelectorAll('.lm-TabBar-tabIcon')).map((el) => el.className);
    });
    console.log('[p1-007] activity bar icons:', activityBarIcons);

    const banned = ['debug', 'source-control', 'git', 'extensions'];
    for (const cls of activityBarIcons) {
      for (const bad of banned) {
        assert(!cls.toLowerCase().includes(bad), `expected activity bar to exclude '${bad}', got class: ${cls}`);
      }
    }

    await page.screenshot({ path: path.join(artifactsDir, '01-startup.png') });

    // Multi-tab open: open both markdown files.
    await openFileViaExplorerDoubleClick(page, 'test.md', artifactsDir);
    await openFileViaExplorerDoubleClick(page, 'second.md', artifactsDir);

    await clickTabByLabel(page, 'test.md');
    await page.waitForSelector('[data-testid="writenow-tiptap-markdown-editor"]', { timeout: 20_000 });

    const firstTab = await getTabInfoByLabel(page, 'test.md');
    const secondTab = await getTabInfoByLabel(page, 'second.md');
    assert(firstTab, 'expected tab for test.md');
    assert(secondTab, 'expected tab for second.md');

    // Focus inside the editor and type.
    await page.waitForSelector('.writenow-tiptap-editor');
    await page.click('.writenow-tiptap-editor');
    await page.keyboard.type('\nHello ');
    await page.keyboard.type('中文输入');

    // Dirty marker should appear after edits.
    const dirtyBeforeSave = await getTabInfoByLabel(page, 'test.md');
    console.log('[p1-007] tab (test.md) after edit:', dirtyBeforeSave);
    assert(dirtyBeforeSave, 'expected test.md tab to exist');
    assert(
      /dirty/i.test(dirtyBeforeSave.className) || /\*/.test(dirtyBeforeSave.text) || /●/.test(dirtyBeforeSave.text),
      'expected dirty marker after edit',
    );

    // Ctrl+S should save to disk via Theia's Save command.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('Control');

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

    const updated = await fs.readFile(first, 'utf8');
    assert(updated.includes('Hello'), 'expected typed text to be saved');
    assert(updated.includes('中文输入'), 'expected unicode text to be saved');

    await browser.close();

    console.log('[p1-007] artifacts:', artifactsDir);
    console.log('[p1-007] PASS');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('[p1-007] FAIL', err);
  process.exitCode = 1;
});
