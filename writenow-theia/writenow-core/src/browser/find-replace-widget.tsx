import * as React from '@theia/core/shared/react';
import { codicon } from '@theia/core/lib/browser/widgets';
import type { Editor } from '@tiptap/core';

type FindReplaceProps = Readonly<{
    editor: Editor | null;
    isOpen: boolean;
    showReplace: boolean;
    onClose: () => void;
}>;

/**
 * Why: Simple text search in ProseMirror document.
 * Returns all positions where the search text is found.
 */
function findTextPositions(editor: Editor, searchText: string, options: { caseSensitive: boolean; wholeWord: boolean }): { from: number; to: number }[] {
    if (!searchText) return [];
    
    const doc = editor.state.doc;
    const results: { from: number; to: number }[] = [];
    
    let text = '';
    const positions: number[] = [];
    
    // Build a flat text representation with position mapping
    doc.descendants((node, pos) => {
        if (node.isText && node.text) {
            positions.push(pos);
            text += node.text;
        } else if (node.isBlock && text.length > 0) {
            text += '\n';
            positions.push(-1); // Marker for block boundary
        }
    });
    
    // Search in the flat text
    let searchStr = searchText;
    let compareText = text;
    
    if (!options.caseSensitive) {
        searchStr = searchStr.toLowerCase();
        compareText = compareText.toLowerCase();
    }
    
    let startIndex = 0;
    while (true) {
        const foundIndex = compareText.indexOf(searchStr, startIndex);
        if (foundIndex === -1) break;
        
        // Check whole word if needed
        if (options.wholeWord) {
            const before = foundIndex > 0 ? compareText[foundIndex - 1] : ' ';
            const after = foundIndex + searchStr.length < compareText.length ? compareText[foundIndex + searchStr.length] : ' ';
            if (/\w/.test(before) || /\w/.test(after)) {
                startIndex = foundIndex + 1;
                continue;
            }
        }
        
        // Map back to document position
        // This is a simplified mapping - for complex documents with nodes, a more sophisticated approach is needed
        const from = foundIndex + 1; // +1 because ProseMirror positions are 1-indexed for text
        const to = from + searchText.length;
        
        results.push({ from, to });
        startIndex = foundIndex + 1;
    }
    
    return results;
}

/**
 * Find and Replace component.
 */
export function FindReplaceWidget(props: FindReplaceProps): React.ReactElement | null {
    const { editor, isOpen, showReplace, onClose } = props;
    
    const [searchText, setSearchText] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
    const [caseSensitive, setCaseSensitive] = React.useState(false);
    const [wholeWord, setWholeWord] = React.useState(false);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [results, setResults] = React.useState<{ from: number; to: number }[]>([]);
    
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    
    // Focus search input when opening
    React.useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    }, [isOpen]);
    
    // Update results when search changes
    React.useEffect(() => {
        if (!editor || !searchText) {
            setResults([]);
            setCurrentIndex(0);
            return;
        }
        
        const newResults = findTextPositions(editor, searchText, { caseSensitive, wholeWord });
        setResults(newResults);
        setCurrentIndex(newResults.length > 0 ? 0 : -1);
    }, [editor, searchText, caseSensitive, wholeWord]);
    
    // Highlight current result
    React.useEffect(() => {
        if (!editor || results.length === 0 || currentIndex < 0) return;
        
        const result = results[currentIndex];
        if (!result) return;
        
        // Scroll to and select the match
        editor.chain().focus().setTextSelection({ from: result.from, to: result.to }).run();
    }, [editor, results, currentIndex]);
    
    const goToNext = (): void => {
        if (results.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % results.length);
    };
    
    const goToPrevious = (): void => {
        if (results.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + results.length) % results.length);
    };
    
    const replaceCurrent = (): void => {
        if (!editor || results.length === 0 || currentIndex < 0) return;
        
        const result = results[currentIndex];
        if (!result) return;
        
        editor.chain()
            .focus()
            .setTextSelection({ from: result.from, to: result.to })
            .insertContent(replaceText)
            .run();
        
        // Update search results after replacement
        setTimeout(() => {
            const newResults = findTextPositions(editor, searchText, { caseSensitive, wholeWord });
            setResults(newResults);
            if (currentIndex >= newResults.length) {
                setCurrentIndex(Math.max(0, newResults.length - 1));
            }
        }, 0);
    };
    
    const replaceAll = (): void => {
        if (!editor || results.length === 0) return;
        
        // Replace from end to start to preserve positions
        const sortedResults = [...results].sort((a, b) => b.from - a.from);
        
        editor.chain().focus();
        
        for (const result of sortedResults) {
            editor.chain()
                .setTextSelection({ from: result.from, to: result.to })
                .insertContent(replaceText)
                .run();
        }
        
        // Clear results after replace all
        setResults([]);
        setCurrentIndex(-1);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                goToPrevious();
            } else {
                goToNext();
            }
        }
    };
    
    if (!isOpen) return null;
    
    const resultText = results.length > 0 
        ? `${currentIndex + 1}/${results.length}` 
        : searchText ? '无结果' : '';
    
    return (
        <div className="wn-find-replace-container" data-testid="writenow-find-replace">
            {/* Find row */}
            <div className="wn-find-replace-row">
                <input
                    ref={searchInputRef}
                    type="text"
                    className="wn-find-replace-input"
                    placeholder="查找..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    data-testid="writenow-find-input"
                />
                <span className="wn-find-replace-count">{resultText}</span>
                <div className="wn-find-replace-actions">
                    <button
                        type="button"
                        className={`wn-find-replace-btn ${caseSensitive ? 'wn-find-replace-btn--active' : ''}`}
                        title="区分大小写"
                        onClick={() => setCaseSensitive(!caseSensitive)}
                    >
                        <span className={codicon('case-sensitive')} />
                    </button>
                    <button
                        type="button"
                        className={`wn-find-replace-btn ${wholeWord ? 'wn-find-replace-btn--active' : ''}`}
                        title="全词匹配"
                        onClick={() => setWholeWord(!wholeWord)}
                    >
                        <span className={codicon('whole-word')} />
                    </button>
                    <button
                        type="button"
                        className="wn-find-replace-btn"
                        title="上一个 (⇧Enter)"
                        onClick={goToPrevious}
                        disabled={results.length === 0}
                    >
                        <span className={codicon('arrow-up')} />
                    </button>
                    <button
                        type="button"
                        className="wn-find-replace-btn"
                        title="下一个 (Enter)"
                        onClick={goToNext}
                        disabled={results.length === 0}
                    >
                        <span className={codicon('arrow-down')} />
                    </button>
                    <button
                        type="button"
                        className="wn-find-replace-btn wn-find-replace-close"
                        title="关闭 (Esc)"
                        onClick={onClose}
                    >
                        <span className={codicon('close')} />
                    </button>
                </div>
            </div>
            
            {/* Replace row */}
            {showReplace && (
                <div className="wn-find-replace-row">
                    <input
                        type="text"
                        className="wn-find-replace-input"
                        placeholder="替换为..."
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        data-testid="writenow-replace-input"
                    />
                    <div className="wn-find-replace-actions">
                        <button
                            type="button"
                            className="wn-find-replace-btn"
                            title="替换当前"
                            onClick={replaceCurrent}
                            disabled={results.length === 0}
                        >
                            <span className={codicon('replace')} />
                        </button>
                        <button
                            type="button"
                            className="wn-find-replace-btn"
                            title="全部替换"
                            onClick={replaceAll}
                            disabled={results.length === 0}
                        >
                            <span className={codicon('replace-all')} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
