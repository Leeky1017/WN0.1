import * as React from '@theia/core/shared/react';

type DiffLineKind = 'meta' | 'hunk' | 'insert' | 'delete' | 'context';

type DiffLine = {
    kind: DiffLineKind;
    text: string;
};

function splitDiffLines(diff: string): string[] {
    const normalized = (typeof diff === 'string' ? diff : '').replace(/\r\n/g, '\n');
    if (!normalized) return [];
    const lines = normalized.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}

function classifyLine(line: string): DiffLineKind {
    if (line.startsWith('--- ') || line.startsWith('+++ ')) return 'meta';
    if (line.startsWith('@@')) return 'hunk';
    if (line.startsWith('+') && !line.startsWith('+++')) return 'insert';
    if (line.startsWith('-') && !line.startsWith('---')) return 'delete';
    return 'context';
}

function toDiffLines(diff: string): DiffLine[] {
    return splitDiffLines(diff).map((line) => ({ kind: classifyLine(line), text: line }));
}

export type UnifiedDiffViewProps = Readonly<{
    diff: string;
}>;

/**
 * Render a unified diff string.
 *
 * Why: Version history needs a lightweight, dependency-free diff view inside a Theia widget while still providing
 * clear added/removed/context highlighting.
 */
export function UnifiedDiffView(props: UnifiedDiffViewProps): React.ReactElement {
    const lines = React.useMemo(() => toDiffLines(props.diff), [props.diff]);

    if (lines.length === 0) {
        return <div style={{ fontSize: 12, opacity: 0.8 }}>No diff.</div>;
    }

    return (
        <div
            style={{
                border: '1px solid var(--theia-border-color1)',
                borderRadius: 6,
                overflow: 'auto',
                background: 'var(--theia-editor-background)',
                fontFamily: 'var(--theia-ui-font-family)',
            }}
            data-testid="writenow-version-history-diff"
        >
            <pre style={{ margin: 0, padding: 10, fontSize: 12, lineHeight: 1.5, fontFamily: 'monospace' }}>
                {lines.map((line, idx) => {
                    const style: React.CSSProperties =
                        line.kind === 'insert'
                            ? { background: 'rgba(0, 255, 0, 0.12)' }
                            : line.kind === 'delete'
                              ? { background: 'rgba(255, 0, 0, 0.15)', textDecoration: 'line-through' }
                              : line.kind === 'hunk'
                                ? { background: 'rgba(60, 120, 255, 0.12)' }
                                : line.kind === 'meta'
                                  ? { opacity: 0.8 }
                                  : {};

                    return (
                        <div key={idx} style={style}>
                            {line.text}
                        </div>
                    );
                })}
            </pre>
        </div>
    );
}

