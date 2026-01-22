import * as React from 'react';

import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { Emitter, Event } from '@theia/core/lib/common/event';
import type { CommandService } from '@theia/core/lib/common/command';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Saveable, setDirty } from '@theia/core/lib/browser/saveable';
import { Navigatable } from '@theia/core/lib/browser';

import type { FileService } from '@theia/filesystem/lib/browser/file-service';

import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

import { WritenowTheiaPocCommands } from './writenow-theia-poc-commands';

export const TIPTAP_MARKDOWN_EDITOR_WIDGET_FACTORY_ID = 'writenow-tiptap-markdown-editor';

type FocusChangedHandler = (focused: boolean) => void;
type MarkdownChangedHandler = (markdown: string) => void;

type TipTapMarkdownEditorProps = Readonly<{
  markdown: string;
  onMarkdownChanged: MarkdownChangedHandler;
  onFocusChanged: FocusChangedHandler;
  onEditorReady: (editor: Editor | null) => void;
}>;

const TabIndentExtension = Extension.create({
  name: 'writenowTabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Why: In TipTap/ProseMirror, Tab is not guaranteed to do anything by default
        // (and the browser may move focus). WriteNow expects Tab to be usable in-editor.
        return this.editor.commands.insertContent('  ');
      },
    };
  },
});

function TipTapMarkdownEditor(props: TipTapMarkdownEditorProps): React.ReactElement {
  const { markdown, onMarkdownChanged, onFocusChanged, onEditorReady } = props;
  const isProgrammaticUpdateRef = React.useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        indentation: { style: 'space', size: 2 },
      }),
      TabIndentExtension,
    ],
    content: markdown,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'writenow-tiptap-editor',
        style: 'outline: none; padding: 12px; min-height: 400px;',
      },
      handleDOMEvents: {
        focus: () => {
          onFocusChanged(true);
          return false;
        },
        blur: () => {
          onFocusChanged(false);
          return false;
        },
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      if (isProgrammaticUpdateRef.current) return;
      // `getMarkdown` is provided by `@tiptap/markdown`.
      const next = nextEditor.getMarkdown();
      onMarkdownChanged(next);
    },
  });

  React.useEffect(() => {
    onEditorReady(editor ?? null);
    return () => onEditorReady(null);
    // Why: The callback is owned by the widget and is stable enough for PoC usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getMarkdown();
    if (current === markdown) return;

    isProgrammaticUpdateRef.current = true;
    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    isProgrammaticUpdateRef.current = false;
  }, [editor, markdown]);

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'auto' }} data-testid="writenow-tiptap-markdown-editor">
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * A minimal `.md` editor widget using TipTap, designed specifically to validate Phase 0
 * constraints: focus, keyboard routing, and Theia Save/Dirty integration.
 */
export class TipTapMarkdownEditorWidget extends ReactWidget implements Saveable, Navigatable {
  private readonly onDirtyChangedEmitter = new Emitter<void>();
  readonly onDirtyChanged: Event<void> = this.onDirtyChangedEmitter.event;

  private readonly onContentChangedEmitter = new Emitter<void>();
  readonly onContentChanged: Event<void> = this.onContentChangedEmitter.event;

  private resourceUri: URI | undefined;
  private isLoaded = false;
  private loadError: string | undefined;

  private currentMarkdown = '';
  private lastSavedMarkdown = '';
  private isDirty = false;
  private tiptapEditor: Editor | undefined;

  constructor(
    private readonly fileService: FileService,
    private readonly commandService: CommandService,
  ) {
    super();
    this.addClass('writenow-tiptap-editor-host');
  }

  get dirty(): boolean {
    return this.isDirty;
  }

  getResourceUri(): URI | undefined {
    return this.resourceUri;
  }

  createMoveToUri(resourceUri: URI): URI | undefined {
    return resourceUri;
  }

  /**
   * Why: `Ctrl/Cmd+Z` / `Ctrl/Cmd+B` / `Tab` should be owned by the editor when focused.
   * Theia's keybinding registry listens on `document` capture phase. To prevent it from
   * stealing editor-specific keys, we preemptively `preventDefault()` on `window` capture.
   *
   * Note: ProseMirror's key handling ignores events that are already `defaultPrevented`,
   * so we also invoke the corresponding TipTap commands directly.
   */
  protected override onAfterAttach(msg: import('@lumino/messaging').Message): void {
    super.onAfterAttach(msg);

    const onKeyDownCapture = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!this.node.contains(target)) return;

      const isMod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      // IME safety: do not interfere with composition except for explicit reserved keys.
      if (event.isComposing) return;

      if (key === 'tab') {
        event.preventDefault();
        this.tiptapEditor?.commands.focus();
        this.tiptapEditor?.commands.insertContent('  ');
        return;
      }

      // Route Ctrl/Cmd+K to a WriteNow-owned action (PoC).
      if (isMod && key === 'k') {
        event.preventDefault();
        void this.commandService
          .executeCommand(WritenowTheiaPocCommands.OPEN_INLINE_AI.id)
          .catch((error: unknown) => console.error('[writenow-theia-poc] inline ai command failed', error));
        return;
      }

      // Editor-owned shortcuts: prevent Theia's global layer; TipTap will handle.
      if (isMod && (key === 'z' || key === 'y' || key === 'b')) {
        event.preventDefault();
        this.tiptapEditor?.commands.focus();
        if (key === 'z') {
          if (event.shiftKey) {
            this.tiptapEditor?.commands.redo();
          } else {
            this.tiptapEditor?.commands.undo();
          }
        } else if (key === 'y') {
          this.tiptapEditor?.commands.redo();
        } else if (key === 'b') {
          this.tiptapEditor?.commands.toggleBold();
        }
      }
    };

    window.addEventListener('keydown', onKeyDownCapture, true);
    this.toDispose.push({
      dispose: () => window.removeEventListener('keydown', onKeyDownCapture, true),
    });
  }

  async setResourceUri(uri: URI): Promise<void> {
    this.resourceUri = uri;
    await this.loadFromDisk();
  }

  private async loadFromDisk(): Promise<void> {
    if (!this.resourceUri) return;
    try {
      const file = await this.fileService.readFile(this.resourceUri);
      const markdown = file.value.toString();

      this.isLoaded = true;
      this.loadError = undefined;
      this.currentMarkdown = markdown;
      this.lastSavedMarkdown = markdown;
      this.setDirtyState(false);
    } catch (error) {
      this.isLoaded = false;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.currentMarkdown = '';
      this.lastSavedMarkdown = '';
      this.setDirtyState(false);
    } finally {
      this.update();
    }
  }

  private onEditorMarkdownChanged(nextMarkdown: string): void {
    if (!this.isLoaded) return;
    this.currentMarkdown = nextMarkdown;

    const nextDirty = this.currentMarkdown !== this.lastSavedMarkdown;
    if (nextDirty !== this.isDirty) {
      this.setDirtyState(nextDirty);
    }

    this.onContentChangedEmitter.fire();
  }

  private onEditorFocusChanged(_focused: boolean): void {
    // Why: kept as a dedicated hook for future context-key integration (Phase 1).
  }

  private setDirtyState(dirty: boolean): void {
    this.isDirty = dirty;
    setDirty(this, dirty);
    this.onDirtyChangedEmitter.fire();
  }

  async save(): Promise<void> {
    if (!this.resourceUri) return;
    if (!this.isDirty) return;

    await this.fileService.writeFile(this.resourceUri, BinaryBuffer.fromString(this.currentMarkdown));
    this.lastSavedMarkdown = this.currentMarkdown;
    this.setDirtyState(false);
  }

  protected override render(): React.ReactNode {
    if (!this.resourceUri) {
      return <div style={{ padding: 12 }}>No resource.</div>;
    }

    if (!this.isLoaded) {
      return (
        <div style={{ padding: 12 }}>
          {this.loadError ? `Load failed: ${this.loadError}` : 'Loading…'}
        </div>
      );
    }

    return (
      <TipTapMarkdownEditor
        markdown={this.currentMarkdown}
        onMarkdownChanged={(m) => this.onEditorMarkdownChanged(m)}
        onFocusChanged={(focused) => this.onEditorFocusChanged(focused)}
        onEditorReady={(editor) => {
          this.tiptapEditor = editor ?? undefined;
        }}
      />
    );
  }
}
