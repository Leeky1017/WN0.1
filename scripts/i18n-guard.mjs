import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'release', '.worktrees']);

const SKIP_ATTR_PREFIXES = ['data-'];
const SKIP_ATTRS = new Set(['className', 'id', 'key', 'ref', 'role', 'type', 'name', 'value', 'href', 'src', 'to']);

const UI_ATTRS = new Set([
  'title',
  'placeholder',
  'alt',
  'aria-label',
  'ariaLabel',
  'ariaDescription',
  'aria-description',
  'label',
  'acceptLabel',
  'rejectLabel',
  'confirmText',
  'cancelText',
]);

function toPosix(p) {
  return p.split(path.sep).join('/');
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

function isTsx(relPath) {
  return relPath.endsWith('.tsx');
}

function isSkippableAttrName(name) {
  if (SKIP_ATTRS.has(name)) return true;
  return SKIP_ATTR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isUserFacingAttrName(name) {
  if (UI_ATTRS.has(name)) return true;
  if (name.endsWith('Label')) return true;
  if (name.endsWith('Title')) return true;
  if (name.endsWith('Placeholder')) return true;
  if (name.endsWith('Hint')) return true;
  if (name.endsWith('Text')) return true;
  return false;
}

function isProbablyUiText(raw) {
  const text = raw.trim();
  if (!text) return false;
  return /\p{L}/u.test(text);
}

function scanTemplateLiteralParts(sourceFile, node) {
  const results = [];
  const add = (text, pos) => {
    if (!isProbablyUiText(text)) return;
    results.push({ text: text.trim(), pos });
  };

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    add(node.text, node.getStart(sourceFile) + 1);
    return results;
  }

  if (ts.isTemplateExpression(node)) {
    add(node.head.text, node.head.getStart(sourceFile) + 1);
    for (const span of node.templateSpans) {
      add(span.literal.text, span.literal.getStart(sourceFile) + 1);
    }
    return results;
  }

  return results;
}

function scanFileForHardcodedUiText({ relPath, content }) {
  const sourceFile = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = [];

  const pushViolation = (node, text) => {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      file: relPath,
      line: pos.line + 1,
      column: pos.character + 1,
      text,
    });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      if (isProbablyUiText(node.getText(sourceFile))) {
        pushViolation(node, node.getText(sourceFile).trim());
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      const isChildExpr = ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
      if (!isChildExpr) {
        ts.forEachChild(node, visit);
        return;
      }
      const expr = node.expression;
      if (ts.isStringLiteral(expr)) {
        if (isProbablyUiText(expr.text)) pushViolation(expr, expr.text.trim());
      } else if (ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
        for (const part of scanTemplateLiteralParts(sourceFile, expr)) {
          const pos = sourceFile.getLineAndCharacterOfPosition(part.pos);
          violations.push({
            file: relPath,
            line: pos.line + 1,
            column: pos.character + 1,
            text: part.text,
          });
        }
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sourceFile);
      if (!isUserFacingAttrName(name) || isSkippableAttrName(name)) {
        ts.forEachChild(node, visit);
        return;
      }

      const init = node.initializer;
      if (ts.isStringLiteral(init)) {
        if (isProbablyUiText(init.text)) pushViolation(init, init.text.trim());
      } else if (ts.isJsxExpression(init) && init.expression) {
        const expr = init.expression;
        if (ts.isStringLiteral(expr)) {
          if (isProbablyUiText(expr.text)) pushViolation(expr, expr.text.trim());
        } else if (ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
          for (const part of scanTemplateLiteralParts(sourceFile, expr)) {
            const pos = sourceFile.getLineAndCharacterOfPosition(part.pos);
            violations.push({
              file: relPath,
              line: pos.line + 1,
              column: pos.character + 1,
              text: part.text,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

async function main() {
  const absFiles = await listFiles(SRC_ROOT);
  const relFiles = absFiles
    .map((absPath) => path.relative(ROOT, absPath))
    .filter((relPath) => isTsx(relPath));

  const violations = [];
  for (const relPath of relFiles) {
    const absPath = path.join(ROOT, relPath);
    const content = await fs.readFile(absPath, 'utf8');
    violations.push(...scanFileForHardcodedUiText({ relPath, content }));
  }

  if (violations.length === 0) return;

  const lines = [];
  lines.push('I18N_GUARD_FAILED');
  lines.push('');
  lines.push('Hardcoded UI text is forbidden. Replace with `t(\"...\")` and add keys to:');
  lines.push('- src/locales/zh-CN.json');
  lines.push('- src/locales/en.json');
  lines.push('');
  for (const v of violations.slice(0, 200)) {
    lines.push(`- ${toPosix(v.file)}:${v.line}:${v.column} ${JSON.stringify(v.text)}`);
  }
  if (violations.length > 200) lines.push(`- ...and ${violations.length - 200} more`);
  lines.push('');

  // eslint-disable-next-line no-console
  console.error(lines.join('\n'));
  process.exitCode = 1;
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('I18N_GUARD_CRASHED');
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
