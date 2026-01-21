import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();

const SRC_ROOT = path.join(ROOT, 'src');

const COLOR_PATTERNS = [
  { name: 'hex', re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'rgb', re: /\brgba?\(/g },
  { name: 'hsl', re: /\bhsla?\(/g },
  { name: 'oklch', re: /\boklch\(/g },
  { name: 'oklab', re: /\boklab\(/g },
];

const ALLOW_COLOR_FILES = new Set([
  path.normalize('src/styles/tokens.css'),
]);

const EXCLUDE_FILES = new Set([
  // Generated Tailwind bundle (contains upstream color literals).
  path.normalize('src/index.css'),
]);

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'release', '.worktrees']);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function findLineColumn(content, index) {
  const before = content.slice(0, index);
  const lastNewline = before.lastIndexOf('\n');
  const line = before.split('\n').length;
  const column = index - lastNewline;
  return { line, column };
}

async function listFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      results.push(...(await listFiles(path.join(rootDir, entry.name))));
      continue;
    }
    if (!entry.isFile()) continue;
    results.push(path.join(rootDir, entry.name));
  }
  return results;
}

function isSourceFile(relPath) {
  return relPath.endsWith('.ts') || relPath.endsWith('.tsx') || relPath.endsWith('.css');
}

function shouldSkipColorScan(relPath) {
  const normalized = path.normalize(relPath);
  if (ALLOW_COLOR_FILES.has(normalized)) return true;
  if (EXCLUDE_FILES.has(normalized)) return true;
  return false;
}

function shouldSkipWnClassScan(relPath) {
  const normalized = path.normalize(relPath);
  if (EXCLUDE_FILES.has(normalized)) return true;
  return false;
}

function scanUnknownWnClassesInClassNameProps({ relPath, content, wnClassDefs }) {
  if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) return [];

  const scriptKind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true, scriptKind);
  const violations = [];

  const wnUseRe = /(?<!-)\bwn-[a-z0-9-]+\b/gi;

  const scanStringNode = (node) => {
    const raw = node.getText(sourceFile);
    const start = node.getStart(sourceFile);
    wnUseRe.lastIndex = 0;
    let match;
    while ((match = wnUseRe.exec(raw))) {
      const className = match[0].toLowerCase();
      if (wnClassDefs.has(className)) continue;
      const pos = sourceFile.getLineAndCharacterOfPosition(start + match.index);
      violations.push({
        file: relPath,
        line: pos.line + 1,
        column: pos.character + 1,
        className,
      });
    }
  };

  const visitClassExpr = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      scanStringNode(node);
      return;
    }
    ts.forEachChild(node, visitClassExpr);
  };

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name.text === 'className' && node.initializer) {
      const initializer = node.initializer;
      if (ts.isStringLiteral(initializer)) {
        scanStringNode(initializer);
      } else if (ts.isJsxExpression(initializer) && initializer.expression) {
        visitClassExpr(initializer.expression);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

async function main() {
  const absFiles = (await listFiles(SRC_ROOT)).filter((absPath) => {
    const rel = path.relative(ROOT, absPath);
    return isSourceFile(rel);
  });

  const wnClassDefs = new Set();
  for (const absPath of absFiles) {
    const rel = path.relative(ROOT, absPath);
    if (!rel.endsWith('.css')) continue;
    if (shouldSkipWnClassScan(rel)) continue;
    const content = await fs.readFile(absPath, 'utf8');
    const re = /\.wn-[a-z0-9-]+/gi;
    let match;
    while ((match = re.exec(content))) {
      wnClassDefs.add(match[0].slice(1).toLowerCase());
    }
  }

  const colorViolations = [];
  const unknownWnClassViolations = [];

  for (const absPath of absFiles) {
    const rel = path.relative(ROOT, absPath);
    if (shouldSkipColorScan(rel)) continue;

    const content = await fs.readFile(absPath, 'utf8');
    for (const { name, re } of COLOR_PATTERNS) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(content))) {
        const pos = findLineColumn(content, match.index);
        colorViolations.push({
          file: rel,
          line: pos.line,
          column: pos.column,
          kind: name,
          sample: match[0],
        });
      }
    }

    if (!rel.endsWith('.ts') && !rel.endsWith('.tsx')) continue;
    unknownWnClassViolations.push(...scanUnknownWnClassesInClassNameProps({ relPath: rel, content, wnClassDefs }));
  }

  if (colorViolations.length === 0 && unknownWnClassViolations.length === 0) return;

  const lines = [];
  lines.push('STYLE_GUARD_FAILED');
  lines.push('');

  if (colorViolations.length > 0) {
    lines.push('Hardcoded colors are forbidden (use tokens / CSS variables):');
    for (const v of colorViolations.slice(0, 200)) {
      lines.push(`- ${toPosix(v.file)}:${v.line}:${v.column} (${v.kind}) ${JSON.stringify(v.sample)}`);
    }
    if (colorViolations.length > 200) lines.push(`- ...and ${colorViolations.length - 200} more`);
    lines.push('');
  }

  if (unknownWnClassViolations.length > 0) {
    lines.push('Unknown `wn-*` class names are forbidden (define the class in CSS or remove usage):');
    for (const v of unknownWnClassViolations.slice(0, 200)) {
      lines.push(`- ${toPosix(v.file)}:${v.line}:${v.column} ${v.className}`);
    }
    if (unknownWnClassViolations.length > 200) lines.push(`- ...and ${unknownWnClassViolations.length - 200} more`);
    lines.push('');
  }

  // eslint-disable-next-line no-console
  console.error(lines.join('\n'));
  process.exitCode = 1;
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('STYLE_GUARD_CRASHED');
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
