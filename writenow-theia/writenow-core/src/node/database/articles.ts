import type { SqliteDatabase } from './init';

function toIsoNow(): string {
    return new Date().toISOString();
}

function countWords(content: string): number {
    if (!content) return 0;
    return String(content).replace(/\s+/g, '').length;
}

function stripMarkdownTitle(raw: string): string | null {
    const line = raw.trim();
    if (!line) return null;
    if (!line.startsWith('#')) return null;
    const title = line.replace(/^#+\s*/, '').trim();
    return title || null;
}

function extractFrontMatterLines(content: string): string[] | null {
    if (!content.startsWith('---\n')) return null;
    const endIndex = content.indexOf('\n---', 4);
    if (endIndex === -1) return null;
    const block = content.slice(4, endIndex + 1);
    return block.split('\n');
}

function splitListValue(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const normalized = trimmed.replace(/^\[/, '').replace(/\]$/, '');
    return normalized
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseFrontMatter(content: string): { tags: string[]; characters: string[]; title: string | null } {
    const lines = extractFrontMatterLines(content);
    if (!lines) return { tags: [], characters: [], title: null };

    let currentListKey: 'tags' | 'characters' | null = null;
    const tags: string[] = [];
    const characters: string[] = [];
    let title: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const listMatch = trimmed.match(/^-\s+(.+)$/);
        if (listMatch && currentListKey) {
            const value = listMatch[1].trim();
            if (!value) continue;
            if (currentListKey === 'tags') tags.push(value);
            if (currentListKey === 'characters') characters.push(value);
            continue;
        }

        currentListKey = null;
        const keyMatch = trimmed.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/);
        if (!keyMatch) continue;

        const key = keyMatch[1];
        const rawValue = keyMatch[2];

        if (key === 'title') {
            title = rawValue.trim() || null;
            continue;
        }

        if (key === 'tags' || key === 'characters') {
            if (!rawValue.trim()) {
                currentListKey = key;
                continue;
            }
            const items = splitListValue(rawValue);
            if (key === 'tags') tags.push(...items);
            if (key === 'characters') characters.push(...items);
        }
    }

    return {
        title,
        tags: Array.from(new Set(tags)),
        characters: Array.from(new Set(characters)),
    };
}

export function deriveTitle(fileName: string, content: string): string {
    const base = fileName.replace(/\.md$/i, '');
    const { title: frontMatterTitle } = parseFrontMatter(content);
    if (frontMatterTitle) return frontMatterTitle;

    const lines = content.split('\n');
    for (const line of lines.slice(0, 20)) {
        const maybe = stripMarkdownTitle(line);
        if (maybe) return maybe;
    }

    return base || 'Untitled';
}

function stringifyTokens(tokens: string[]): string {
    return tokens.map((token) => token.trim()).filter(Boolean).join(' ');
}

function normalizeProjectId(projectId: unknown): string | null {
    const trimmed = typeof projectId === 'string' ? projectId.trim() : '';
    return trimmed ? trimmed : null;
}

export type UpsertArticleInput = Readonly<{
    id: string;
    fileName?: string;
    content: string;
    projectId?: string | null;
}>;

export function upsertArticle(db: SqliteDatabase, input: UpsertArticleInput): { id: string; title: string; tags: string; characters: string } {
    const id = typeof input.id === 'string' ? input.id : '';
    if (!id) {
        throw new Error('upsertArticle requires { id }');
    }

    const fileName = typeof input.fileName === 'string' ? input.fileName : id;
    const content = typeof input.content === 'string' ? input.content : '';
    const projectId = normalizeProjectId(input.projectId);

    const meta = parseFrontMatter(content);
    const title = deriveTitle(fileName, content);
    const now = toIsoNow();

    const tags = stringifyTokens(meta.tags);
    const characters = stringifyTokens(meta.characters);

    db.prepare(
        `INSERT INTO articles (id, title, content, characters, tags, format, workflow_stage, word_count, project_id, created_at, updated_at)
         VALUES (@id, @title, @content, @characters, @tags, 'markdown', 'draft', @word_count, @project_id, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title,
           content=excluded.content,
           characters=excluded.characters,
           tags=excluded.tags,
           format=excluded.format,
           workflow_stage=excluded.workflow_stage,
           word_count=excluded.word_count,
           project_id=COALESCE(excluded.project_id, articles.project_id),
           updated_at=excluded.updated_at`,
    ).run({
        id,
        title,
        content,
        characters,
        tags,
        word_count: countWords(content),
        project_id: projectId,
        created_at: now,
        updated_at: now,
    });

    return { id, title, tags, characters };
}

export function deleteArticle(db: SqliteDatabase, articleId: string): void {
    const id = typeof articleId === 'string' ? articleId.trim() : '';
    if (!id) throw new Error('deleteArticle requires articleId');
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
}

