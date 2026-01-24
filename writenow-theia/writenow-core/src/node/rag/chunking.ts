/**
 * Why: WriteNow stores Markdown documents that may include YAML front matter for metadata (e.g. entity cards).
 * RAG chunking must exclude the front matter so embeddings and keyword recall operate on user-visible content only.
 */
export function stripFrontMatter(content: string): string {
    const raw = typeof content === 'string' ? content : '';
    if (!raw.startsWith('---\n')) return raw;
    const endIndex = raw.indexOf('\n---', 4);
    if (endIndex === -1) return raw;
    const after = raw.indexOf('\n', endIndex + 4);
    return after === -1 ? '' : raw.slice(after + 1);
}

function normalizeParagraph(text: string): string | null {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) return null;
    return trimmed.replace(/\s+\n/g, '\n').trim();
}

/**
 * Why: The existing Electron pipeline chunks Markdown into paragraph-sized passages as the smallest unit
 * for retrieval and (optionally) chunk-level embeddings.
 */
export function chunkMarkdownToParagraphs(content: string): string[] {
    const withoutFrontMatter = stripFrontMatter(content);
    const parts = withoutFrontMatter.split(/\n{2,}/);
    const chunks: string[] = [];
    for (const part of parts) {
        const normalized = normalizeParagraph(part);
        if (!normalized) continue;
        chunks.push(normalized);
    }
    return chunks;
}

