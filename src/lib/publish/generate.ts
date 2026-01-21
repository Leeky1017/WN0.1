import MarkdownIt from 'markdown-it';

import type { PublishInput, PublishOptions, PublishPlatform, PublishResult } from './types';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: true });

function hasExternalLinks(markdown: string): boolean {
  return /\[[^\]]+\]\((https?:\/\/[^)]+)\)/i.test(markdown) || /https?:\/\/\S+/i.test(markdown);
}

function stripLinks(markdown: string): string {
  return markdown.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1').replace(/https?:\/\/\S+/gi, '');
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderHtml(title: string, markdown: string): string {
  const body = md.render(markdown);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; line-height: 1.65; color: black; background: white; }
      h1, h2, h3 { line-height: 1.25; }
      img { max-width: 100%; }
      blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 3px solid gainsboro; color: dimgray; }
      pre { background: whitesmoke; padding: 12px 14px; border-radius: 8px; overflow: auto; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      a { color: royalblue; text-decoration: none; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

export function generatePublishContent(platform: PublishPlatform, input: PublishInput, options: PublishOptions = {}): PublishResult {
  const warnings: string[] = [];
  const safeTitle = input.title.trim() || 'Untitled';
  const original = input.markdown || '';

  const externalLinks = hasExternalLinks(original);
  const normalized = options.stripLinks ? stripLinks(original) : original;

  if (platform === 'wechat') {
    if (externalLinks) warnings.push('publish.warn.wechat.links');
    warnings.push('publish.warn.wechat.images');
    return {
      platform,
      format: 'html',
      content: renderHtml(safeTitle, normalized),
      warnings,
    };
  }

  if (platform === 'toutiao') {
    if (externalLinks) warnings.push('publish.warn.toutiao.links');
    return {
      platform,
      format: 'html',
      content: renderHtml(safeTitle, normalized),
      warnings,
    };
  }

  if (platform === 'zhihu') {
    if (externalLinks) warnings.push('publish.warn.zhihu.links');
    if (normalized.length > 30_000) warnings.push('publish.warn.zhihu.long');
    return { platform, format: 'markdown', content: normalized, warnings };
  }

  if (platform === 'medium') {
    return { platform, format: 'markdown', content: normalized, warnings };
  }

  const plain = stripMarkdown(normalized);
  warnings.push('publish.warn.xiaohongshu.short');
  if (externalLinks) warnings.push('publish.warn.xiaohongshu.links');

  return { platform, format: 'text', content: `${safeTitle}\n\n${plain}`.trim(), warnings };
}
