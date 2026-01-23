import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DOMAIN_ORDER = [
  'file',
  'stats',
  'project',
  'character',
  'outline',
  'kg',
  'memory',
  'skill',
  'ai',
  'context',
  'constraints',
  'judge',
  'search',
  'embedding',
  'rag',
  'version',
  'update',
  'export',
  'clipboard',
];
const domainRank = new Map(DOMAIN_ORDER.map((domain, idx) => [domain, idx]));

function sortChannels(channels) {
  return [...channels].sort((a, b) => {
    const domainA = a.split(':')[0] ?? '';
    const domainB = b.split(':')[0] ?? '';
    const rankA = domainRank.get(domainA) ?? 999;
    const rankB = domainRank.get(domainB) ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
}

function toPascalCase(segment) {
  const raw = typeof segment === 'string' ? segment.trim() : '';
  if (!raw) return '';
  return raw.slice(0, 1).toUpperCase() + raw.slice(1);
}

function channelToTypeBase(channel) {
  return channel
    .split(':')
    .map((seg) => toPascalCase(seg))
    .join('');
}

function channelToRequestTypeName(channel) {
  return `${channelToTypeBase(channel)}Request`;
}

function channelToResponseTypeName(channel) {
  return `${channelToTypeBase(channel)}Response`;
}

async function listIpcHandlerFiles(repoRoot) {
  const dir = path.join(repoRoot, 'electron', 'ipc');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.cjs'))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function extractInvokeChannels(repoRoot) {
  const files = await listIpcHandlerFiles(repoRoot);
  const channels = new Set();

  const handleInvokeRe = /handleInvoke\(\s*(['"])([^'"]+)\1\s*,/g;

  for (const filePath of files) {
    const text = await fs.readFile(filePath, 'utf8');
    for (const match of text.matchAll(handleInvokeRe)) {
      const channel = match[2];
      if (typeof channel === 'string' && channel.trim()) channels.add(channel.trim());
    }
  }

  return sortChannels(channels);
}

function loadContractTypes(repoRoot) {
  const require = createRequire(import.meta.url);
  // CJS module: safe to load in Node without pulling Electron runtime deps.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BASE_TYPES, IPC_CHANNEL_TYPES } = require(path.join(repoRoot, 'electron', 'ipc', 'contract', 'ipc-contract.cjs'));
  return {
    baseTypes: String(BASE_TYPES || ''),
    channelTypes: String(IPC_CHANNEL_TYPES || ''),
  };
}

function parseExportedTypeNames(tsText) {
  const names = new Set();
  const re = /export type\s+([A-Za-z0-9_]+)\s*=\s*/g;
  for (const match of tsText.matchAll(re)) {
    names.add(match[1]);
  }
  return names;
}

function renderIpcGeneratedTs({ baseTypes, channelTypes, invokeChannels }) {
  const typeNames = parseExportedTypeNames(`${baseTypes}\n${channelTypes}`);
  const missing = [];

  for (const channel of invokeChannels) {
    const req = channelToRequestTypeName(channel);
    const res = channelToResponseTypeName(channel);
    if (!typeNames.has(req)) missing.push(`${channel}: missing ${req}`);
    if (!typeNames.has(res)) missing.push(`${channel}: missing ${res}`);
  }

  if (missing.length > 0) {
    const preview = missing.slice(0, 20).join('\n');
    const suffix = missing.length > 20 ? `\n... (+${missing.length - 20} more)` : '';
    throw new Error(`IPC contract types are incomplete:\n${preview}${suffix}`);
  }

  const channelUnion = invokeChannels.map((c) => `  | '${c}'`).join('\n');
  const payloadMap = invokeChannels.map((c) => `  '${c}': ${channelToRequestTypeName(c)};`).join('\n');
  const dataMap = invokeChannels.map((c) => `  '${c}': ${channelToResponseTypeName(c)};`).join('\n');

  const header =
    `// GENERATED FILE - DO NOT EDIT.\n` +
    `// Source: electron/ipc/*.cjs + electron/ipc/contract/ipc-contract.cjs\n` +
    `// Run: npm run contract:generate\n`;

  return (
    `${header}\n` +
    `${baseTypes.trim()}\n\n` +
    `export type IpcChannel =\n${channelUnion};\n\n` +
    `${channelTypes.trim()}\n\n` +
    `export type IpcInvokePayloadMap = {\n${payloadMap}\n};\n\n` +
    `export type IpcInvokeDataMap = {\n${dataMap}\n};\n\n` +
    `export type IpcInvokeResponseMap = {\n  [K in IpcChannel]: IpcResponse<IpcInvokeDataMap[K]>;\n};\n`
  );
}

function renderPreloadInvokeAllowlist(invokeChannels) {
  const lines = invokeChannels.map((c) => `  '${c}',`).join('\n');
  return `// IPC_CONTRACT_AUTOGEN_INVOKE_START\n${lines}\n  // IPC_CONTRACT_AUTOGEN_INVOKE_END`;
}

async function updatePreloadAllowlist({ repoRoot, invokeChannels, checkOnly }) {
  const preloadPath = path.join(repoRoot, 'electron', 'preload.cjs');
  const original = await fs.readFile(preloadPath, 'utf8');

  const startMarker = '// IPC_CONTRACT_AUTOGEN_INVOKE_START';
  const endMarker = '// IPC_CONTRACT_AUTOGEN_INVOKE_END';
  const startIdx = original.indexOf(startMarker);
  const endIdx = original.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`preload allowlist markers not found in ${preloadPath}`);
  }

  const before = original.slice(0, startIdx);
  const after = original.slice(endIdx + endMarker.length);
  const replacement = renderPreloadInvokeAllowlist(invokeChannels);
  const next = `${before}${replacement}${after}`;

  if (next === original) return { changed: false, preloadPath };
  if (checkOnly) return { changed: true, preloadPath };

  await fs.writeFile(preloadPath, next, 'utf8');
  return { changed: true, preloadPath };
}

async function diffTextFiles({ repoRoot, label, expectedPath, actualText }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-ipc-contract-'));
  const tmpFile = path.join(tmpDir, `${label}.generated`);
  await fs.writeFile(tmpFile, actualText, 'utf8');

  const result = spawnSync('git', ['--no-pager', 'diff', '--no-index', '--', expectedPath, tmpFile], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  await fs.rm(tmpDir, { recursive: true, force: true });
  return { exitCode: result.status ?? 1, diff: result.stdout || result.stderr || '' };
}

async function main() {
  const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const command = (process.argv[2] || 'check').trim();
  const checkOnly = command === 'check';
  const generate = command === 'generate';

  if (!checkOnly && !generate) {
    throw new Error(`Unknown command: ${command} (expected "check" or "generate")`);
  }

  const invokeChannels = await extractInvokeChannels(repoRoot);
  const { baseTypes, channelTypes } = loadContractTypes(repoRoot);
  const generatedTs = renderIpcGeneratedTs({ baseTypes, channelTypes, invokeChannels });

  const outPath = path.join(repoRoot, 'src', 'types', 'ipc-generated.ts');
  const theiaOutPath = path.join(repoRoot, 'writenow-theia', 'writenow-core', 'src', 'common', 'ipc-generated.ts');
  const existing = await fs.readFile(outPath, 'utf8').catch(() => null);
  const theiaExisting = await fs.readFile(theiaOutPath, 'utf8').catch(() => null);

  const preloadResult = await updatePreloadAllowlist({ repoRoot, invokeChannels, checkOnly });

  if (checkOnly) {
    const mismatches = [];
    if (existing === null) mismatches.push(`missing ${outPath}`);
    else if (existing !== generatedTs) mismatches.push(`drift detected: ${outPath}`);
    if (theiaExisting === null) mismatches.push(`missing ${theiaOutPath}`);
    else if (theiaExisting !== generatedTs) mismatches.push(`drift detected: ${theiaOutPath}`);
    if (preloadResult.changed) mismatches.push(`drift detected: ${preloadResult.preloadPath}`);

    if (mismatches.length === 0) return;

    const diffs = [];
    if (existing === null || existing !== generatedTs) {
      const { diff } = await diffTextFiles({ repoRoot, label: 'ipc-generated.ts', expectedPath: outPath, actualText: generatedTs });
      if (diff.trim()) diffs.push(diff.trimEnd());
    }
    if (theiaExisting === null || theiaExisting !== generatedTs) {
      const { diff } = await diffTextFiles({ repoRoot, label: 'ipc-generated.theia.ts', expectedPath: theiaOutPath, actualText: generatedTs });
      if (diff.trim()) diffs.push(diff.trimEnd());
    }
    // eslint-disable-next-line no-console
    console.error(mismatches.join('\n'));
    if (diffs.length > 0) {
      // eslint-disable-next-line no-console
      console.error(diffs.join('\n'));
    } else {
      // eslint-disable-next-line no-console
      console.error('Run `npm run contract:generate` to update generated files.');
    }

    process.exitCode = 1;
    return;
  }

  await fs.writeFile(outPath, generatedTs, 'utf8');
  await fs.mkdir(path.dirname(theiaOutPath), { recursive: true });
  await fs.writeFile(theiaOutPath, generatedTs, 'utf8');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
