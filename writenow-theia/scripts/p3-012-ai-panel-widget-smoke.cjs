/* eslint-disable no-console */
/**
 * Why: Phase 3 / Task 012 requires end-to-end verification of the AI Panel widget in Theia:
 * - widget is visible in the right area
 * - SKILL list loads
 * - Cmd/Ctrl+K focuses the panel input
 * - (optional, requires WN_AI_API_KEY) streaming + cancel + selection rewrite + apply
 *
 * This uses the real Theia UI + real persistence (no stubs). The optional AI part calls the real Anthropic API.
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

async function ensureWorkspace() {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-panel-workspace-'));
  const first = path.join(workspaceDir, 'test.md');
  const content = [
    '# WriteNow AI Panel Smoke',
    '',
    '我我我非常非常喜欢喜欢这个故事，但表达有点重复。',
    '',
    '这是一段用于验证选区改写与 diff 应用的文本。',
    '',
  ].join('\n');

  await fs.writeFile(first, content, 'utf8');
  return { workspaceDir, first };
}

async function openFileViaExplorerDoubleClick(page, fileName) {
  // Why: The widget relies on the active TipTap editor for selection integration.
  await page.waitForFunction(() => document.querySelectorAll('.lm-DockPanel').length > 0, { timeout: 60_000 });

  await page.click('body');

  // Ensure Explorer is visible (layout contribution should open it, but avoid assumptions).
  const explorerVisible = await page.evaluate(() => {
    const files = document.querySelector('.theia-Files');
    if (!files) return false;
    const rect = files.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (!explorerVisible) {
    await page.keyboard.press('F1');
    await page.waitForFunction(() => document.activeElement && document.activeElement.tagName.toLowerCase() === 'input', { timeout: 10_000 });
    await page.keyboard.type('view: toggle explorer');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const files = document.querySelector('.theia-Files');
      if (!files) return false;
      const rect = files.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
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

  const rowHandle = await element.evaluateHandle((el) => el.closest('.theia-TreeNodeRow') || el.closest('.theia-TreeNode') || el);
  const rowElement = rowHandle.asElement();
  assert(rowElement, 'expected the explorer row element to exist');

  const box = await rowElement.boundingBox();
  assert(box, 'expected file row to have a bounding box');

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 1, delay: 25 });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2, delay: 80 });
}

function hasConfiguredAiKey() {
  // Why: We must not accidentally use unrelated env vars as an API key in automation.
  // Explicitly require WN_AI_API_KEY for the optional "real AI" part.
  return typeof process.env.WN_AI_API_KEY === 'string' && process.env.WN_AI_API_KEY.trim().length > 0;
}

async function main() {
  const { workspaceDir } = await ensureWorkspace();
  const artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-panel-artifacts-'));
  const theiaConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-panel-config-'));
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-panel-data-'));

  const port = process.env.WN_THEIA_PORT ? Number(process.env.WN_THEIA_PORT) : await findFreePort();
  const baseUrl = `http://${HOST}:${port}`;

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
    console.log(`[p3-012] starting Theia browser app at ${baseUrl}`);
    child = spawn(
      'yarn',
      ['--cwd', 'browser-app', 'start', '--hostname', HOST, '--port', String(port), workspaceDir],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          THEIA_CONFIG_DIR: theiaConfigDir,
          WRITENOW_THEIA_DATA_DIR: dataDir,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
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
      child.on('exit', (code) => reject(new Error(`theia start exited before ready (code=${code})\n${childStdout}\n${childStderr}`)));
      child.on('error', reject);
    });

    await Promise.race([
      waitForLine(child.stdout, /Theia app listening on/i, 90_000),
      waitForLine(child.stderr, /Theia app listening on/i, 90_000),
      exited,
    ]);

    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-panel-puppeteer-profile-'));
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], userDataDir });
    const page = await browser.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 90_000 });

    await page.waitForSelector('[data-testid="writenow-ai-panel"]', { timeout: 60_000 });
    await page.waitForFunction(() => {
      const select = document.querySelector('select[data-testid=\"writenow-ai-skill-select\"]');
      return Boolean(select && select.options && select.options.length > 0);
    }, { timeout: 90_000 });

    await page.screenshot({ path: path.join(artifactsDir, '01-ai-panel-skill-list.png') });

    // Cmd/Ctrl+K should focus the panel input.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return Boolean(active && active.getAttribute && active.getAttribute('data-testid') === 'writenow-ai-input');
    }, { timeout: 10_000 });

    if (!hasConfiguredAiKey()) {
      console.log('[p3-012] WN_AI_API_KEY is not set; skipping real AI streaming checks.');
      await browser.close();
      return;
    }

    // --- Optional real AI checks (requires WN_AI_API_KEY) ---
    await openFileViaExplorerDoubleClick(page, 'test.md');
    await page.waitForSelector('[data-testid=\"writenow-tiptap-markdown-editor\"]', { timeout: 60_000 });
    await page.waitForSelector('.writenow-tiptap-editor', { timeout: 60_000 });

    // Capture the original visible text (plain text view).
    await page.click('.writenow-tiptap-editor');
    const originalText = await page.$eval('.writenow-tiptap-editor', (el) => (el.innerText || '').trim());
    assert(originalText.length > 0, 'expected editor to have initial content');

    // Select all, run a rewrite SKILL, then apply.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');

    await page.select('select[data-testid=\"writenow-ai-skill-select\"]', 'builtin:polish');
    await page.click('textarea[data-testid=\"writenow-ai-input\"]');
    await page.keyboard.type('保持原意，去重并润色。');

    await page.click('button[data-testid=\"writenow-ai-send\"]');
    await page.waitForSelector('[data-testid=\"writenow-ai-diff\"]', { timeout: 5 * 60_000 });
    await page.screenshot({ path: path.join(artifactsDir, '02-ai-panel-diff.png') });

    await page.click('button[data-testid=\"writenow-ai-apply\"]');
    await page.waitForSelector('[data-testid=\"writenow-ai-diff\"]', { hidden: true, timeout: 60_000 });

    const afterApply = await page.$eval('.writenow-tiptap-editor', (el) => (el.innerText || '').trim());
    assert(afterApply && afterApply !== originalText, 'expected editor content to change after apply');

    // Cancel flow: start a longer skill and stop quickly.
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.select('select[data-testid=\"writenow-ai-skill-select\"]', 'builtin:expand');
    await page.click('textarea[data-testid=\"writenow-ai-input\"]');
    await page.keyboard.type('扩写到更丰富的段落。');
    await page.click('button[data-testid=\"writenow-ai-send\"]');
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid=\"writenow-ai-status\"]');
      return Boolean(status && status.textContent && status.textContent.includes('Status: streaming'));
    }, { timeout: 60_000 });
    await page.click('button[data-testid=\"writenow-ai-stop\"]');
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid=\"writenow-ai-status\"]');
      return Boolean(status && status.textContent && status.textContent.includes('Status: canceled'));
    }, { timeout: 60_000 });

    await page.screenshot({ path: path.join(artifactsDir, '03-ai-panel-canceled.png') });
    await browser.close();
  } finally {
    await cleanup().catch(() => undefined);
    console.log('[p3-012] artifactsDir:', artifactsDir);
    console.log('[p3-012] dataDir:', dataDir);
  }
}

main().catch((error) => {
  console.error('[p3-012] failed', error);
  process.exit(1);
});
