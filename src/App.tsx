import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { SidebarPanel } from './components/SidebarPanel';
import { Editor } from './components/Editor';
import { AIPanel } from './components/AIPanel';
import { StatsBar } from './components/StatsBar';
import { PomodoroOverlay } from './components/PomodoroOverlay';

import type { DocumentSnapshot } from './types/ipc';
import { IpcError, fileOps } from './lib/ipc';
import { toUserMessage } from './lib/errors';
import { useFilesStore } from './stores/filesStore';
import { useConstraintsStore } from './stores/constraintsStore';
import { useEditorStore } from './stores/editorStore';
import { useProjectsStore } from './stores/projectsStore';
import { useContextEntityPrefetch } from './hooks/useContextEntityPrefetch';
import { usePomodoroRuntime } from './hooks/usePomodoroRuntime';
import { useAiStore } from './stores/aiStore';
import { CommandPalette } from './components/CommandPalette';
import { BUILTIN_SKILLS } from './lib/skills';
import { createCommandRegistry } from './lib/commands/registry';

export type ViewMode = 'edit' | 'preview' | 'split';
export type SidebarView =
  | 'files'
  | 'characters'
  | 'outline'
  | 'knowledgeGraph'
  | 'workflow'
  | 'materials'
  | 'publish'
  | 'stats'
  | 'memory'
  | 'settings';

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function App() {
  const { t } = useTranslation();
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [statsBarOpen, setStatsBarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [focusMode, setFocusMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const bootstrappedRef = useRef(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState<DocumentSnapshot | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useContextEntityPrefetch();
  usePomodoroRuntime();

  const files = useFilesStore((s) => s.files);
  const filesHasLoaded = useFilesStore((s) => s.hasLoaded);
  const filesLoading = useFilesStore((s) => s.isLoading);
  const filesError = useFilesStore((s) => s.error);
  const refreshFiles = useFilesStore((s) => s.refresh);
  const createFile = useFilesStore((s) => s.createFile);

  const projectsHasLoaded = useProjectsStore((s) => s.hasLoaded);
  const projectsLoading = useProjectsStore((s) => s.isLoading);
  const projectsError = useProjectsStore((s) => s.error);
  const bootstrapProjects = useProjectsStore((s) => s.bootstrap);

  const selectedFile = useEditorStore((s) => s.currentPath);
  const openFile = useEditorStore((s) => s.openFile);
  const editorContent = useEditorStore((s) => s.content);

  const runSkill = useAiStore((s) => s.runSkill);

  useEffect(() => {
    let cancelled = false;
    const checkRecovery = async () => {
      try {
        const status = await fileOps.sessionStatus();
        if (!status.uncleanExitDetected) return;

        const { snapshot } = await fileOps.snapshotLatest();
        if (!snapshot) return;
        if (cancelled) return;
        setRecoverySnapshot(snapshot);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setRecoveryChecked(true);
      }
    };

    checkRecovery().catch(() => {
      if (!cancelled) setRecoveryChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ESC to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // Global Ctrl/Cmd+K command palette (capture so it can safely override editor shortcuts)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';

      if (key === 'escape' && commandPaletteOpen) {
        e.preventDefault();
        e.stopPropagation();
        setCommandPaletteOpen(false);
        return;
      }

      const isK = key === 'k';
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      if (!isK || !metaOrCtrl) return;

      e.preventDefault();
      e.stopPropagation();
      setCommandPaletteOpen((v) => !v);
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [commandPaletteOpen]);

  const commandRegistry = useMemo(() => {
    return createCommandRegistry({
      t,
      openStats: () => {
        setFocusMode(false);
        setSidebarView('stats');
      },
      openMemory: () => {
        setFocusMode(false);
        setSidebarView('memory');
      },
      openSettings: () => {
        setFocusMode(false);
        setSidebarView('settings');
      },
      toggleFocusMode: () => setFocusMode((v) => !v),
      runSkill,
      skills: BUILTIN_SKILLS,
    });
  }, [runSkill, t]);

  useEffect(() => {
    bootstrapProjects().catch(() => undefined);
  }, [bootstrapProjects]);

  useEffect(() => {
    if (!projectsHasLoaded || projectsLoading) return;
    if (projectsError) return;
    refreshFiles().catch(() => undefined);
  }, [projectsError, projectsHasLoaded, projectsLoading, refreshFiles]);

  useEffect(() => {
    useConstraintsStore.getState().load().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!projectsHasLoaded || projectsLoading) return;
    if (projectsError) return;
    if (!filesHasLoaded || filesLoading) return;
    if (filesError) return;
    if (!recoveryChecked) return;
    if (recoverySnapshot) return;

    bootstrappedRef.current = true;

    if (selectedFile) return;
    if (files.length > 0) {
      openFile(files[0].path).catch(() => undefined);
      return;
    }

    createFile('欢迎使用').then((created) => {
      if (created) openFile(created.path).catch(() => undefined);
    }).catch(() => undefined);
  }, [
    createFile,
    files,
    filesError,
    filesHasLoaded,
    filesLoading,
    openFile,
    projectsError,
    projectsHasLoaded,
    projectsLoading,
    recoveryChecked,
    recoverySnapshot,
    selectedFile,
  ]);

  const restoreSnapshot = async () => {
    if (!recoverySnapshot) return;
    setRecoveryBusy(true);
    setRecoveryError(null);

    try {
      let targetPath = recoverySnapshot.path;

      try {
        await fileOps.read(targetPath);
      } catch (error) {
        if (!(error instanceof IpcError) || error.code !== 'NOT_FOUND') throw error;

        const baseName = targetPath.replace(/\.md$/i, '') || '恢复内容';
        const created = await createFile(`${baseName} (Recovered)`);
        if (!created) throw new Error(useFilesStore.getState().error ?? '创建恢复文件失败');
        targetPath = created.path;
      }

      await openFile(targetPath);
      useEditorStore.getState().setContent(recoverySnapshot.content);
      setRecoverySnapshot(null);
    } catch (error) {
      setRecoveryError(toErrorMessage(error));
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <TitleBar
        focusMode={focusMode}
        aiPanelOpen={aiPanelOpen}
        statsBarOpen={statsBarOpen}
        onToggleAIPanel={() => setAiPanelOpen(!aiPanelOpen)}
        onToggleStatsBar={() => setStatsBarOpen(!statsBarOpen)}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
      />

      {/* Stats Bar */}
      {!focusMode && statsBarOpen && <StatsBar onOpenStats={() => setSidebarView('stats')} />}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!focusMode && (
          <>
            <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
            <SidebarPanel 
              view={sidebarView} 
              onViewChange={setSidebarView}
              selectedFile={selectedFile} 
              onSelectFile={openFile}
              editorContent={editorContent}
            />
          </>
        )}
        
        <Editor 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          focusMode={focusMode}
          onFocusModeToggle={() => setFocusMode(!focusMode)}
        />
        
        {!focusMode && aiPanelOpen && <AIPanel />}
      </div>

      {/* Focus Mode Exit Hint */}
      {focusMode && (
        <div className="fixed top-4 right-4 wn-elevated rounded-md px-3 py-2 flex items-center gap-2 animate-fade-in">
          <span className="text-[11px] text-[var(--text-tertiary)]">{t('app.focus.exitHint')}</span>
          <button
            onClick={() => setFocusMode(false)}
            className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
          >
            {t('app.focus.exit')}
          </button>
        </div>
      )}

      {recoverySnapshot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="wn-elevated p-6 w-[520px]">
            <div className="text-[15px] text-[var(--text-primary)] mb-2">检测到上次异常退出</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mb-4 leading-relaxed">
              是否恢复最近一次快照？
              <div className="mt-2 text-[12px] text-[var(--text-secondary)]">
                <div>文件：{recoverySnapshot.path}</div>
                <div>时间：{new Date(recoverySnapshot.createdAt).toLocaleString('zh-CN')}</div>
              </div>
            </div>

            {recoveryError && <div className="mb-3 text-[12px] text-red-400">{recoveryError}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => restoreSnapshot().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={recoveryBusy}
              >
                恢复快照
              </button>
              <button
                onClick={() => setRecoverySnapshot(null)}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
                disabled={recoveryBusy}
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      )}

      <PomodoroOverlay />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        title={t('commands.title')}
        description={t('commands.description')}
        emptyText={t('commands.empty')}
        commands={commandRegistry}
      />
    </div>
  );
}
