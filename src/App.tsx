import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { SidebarPanel } from './components/SidebarPanel';
import { Editor } from './components/Editor';
import { AIPanel } from './components/AIPanel';
import { StatusBar } from './components/StatusBar';
import { PomodoroOverlay } from './components/PomodoroOverlay';
import { WnResizable } from './components/wn';

import type { DocumentSnapshot } from './types/ipc';
import { IpcError, fileOps } from './lib/ipc';
import { toUserMessage } from './lib/errors';
import { useFilesStore } from './stores/filesStore';
import { useConstraintsStore } from './stores/constraintsStore';
import { useEditorStore } from './stores/editorStore';
import { usePomodoroStore } from './stores/pomodoroStore';
import { useProjectsStore } from './stores/projectsStore';
import { useLayoutStore } from './stores/layoutStore';
import { usePreferencesStore } from './stores/preferencesStore';
import { useContextEntityPrefetch } from './hooks/useContextEntityPrefetch';
import { usePomodoroRuntime } from './hooks/usePomodoroRuntime';
import { useAiStore } from './stores/aiStore';
import { useSkillsStore } from './stores/skillsStore';
import { CommandPalette } from './components/CommandPalette';
import { createCommandRegistry } from './lib/commands/registry';
import { useZenChrome } from './components/Editor/modes/zen';

export type ViewMode = 'edit' | 'preview' | 'split';
export type SidebarView =
  | 'search'
  | 'cards'
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
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const bootstrappedRef = useRef(false);
  const responsiveRestoreRef = useRef<null | { sidebarCollapsed: boolean; aiPanelCollapsed: boolean }>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState<DocumentSnapshot | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useContextEntityPrefetch();
  usePomodoroRuntime();

  const hydrateLayout = useLayoutStore((s) => s.hydrate);
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);

  const zenEnabled = usePreferencesStore((s) => s.flow.zenEnabled);
  const setZenEnabled = usePreferencesStore((s) => s.setZenEnabled);
  const toggleZen = usePreferencesStore((s) => s.toggleZen);
  const { chromeHidden } = useZenChrome({ enabled: zenEnabled });
  const focusMode = chromeHidden;
  const sidebarWidthPx = useLayoutStore((s) => s.sidebarWidthPx);
  const isSidebarCollapsed = useLayoutStore((s) => s.isSidebarCollapsed);
  const setSidebarWidthPx = useLayoutStore((s) => s.setSidebarWidthPx);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const toggleSidebarCollapsed = useLayoutStore((s) => s.toggleSidebarCollapsed);

  const aiPanelWidthPx = useLayoutStore((s) => s.aiPanelWidthPx);
  const isAiPanelCollapsed = useLayoutStore((s) => s.isAiPanelCollapsed);
  const setAiPanelWidthPx = useLayoutStore((s) => s.setAiPanelWidthPx);
  const setAiPanelCollapsed = useLayoutStore((s) => s.setAiPanelCollapsed);
  const toggleAiPanelCollapsed = useLayoutStore((s) => s.toggleAiPanelCollapsed);

  useEffect(() => {
    hydrateLayout();
  }, [hydrateLayout]);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const selectedFile = useEditorStore((s) => (s.activeTabId ? s.tabStateById[s.activeTabId]?.path ?? null : null));
  const openFile = useEditorStore((s) => s.openFile);
  const editorContent = useEditorStore((s) => (s.activeTabId ? s.tabStateById[s.activeTabId]?.content ?? '' : ''));

  const runSkill = useAiStore((s) => s.runSkill);
  const startPomodoro = usePomodoroStore((s) => s.start);
  const pausePomodoro = usePomodoroStore((s) => s.pause);
  const stopPomodoro = usePomodoroStore((s) => s.stop);
  const skills = useSkillsStore((s) => s.items);
  const refreshSkills = useSkillsStore((s) => s.refresh);

  useEffect(() => {
    refreshSkills({ includeDisabled: true }).catch(() => undefined);
  }, [refreshSkills]);

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
      if (e.key !== 'Escape') return;
      if (!zenEnabled) return;
      setZenEnabled(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setZenEnabled, zenEnabled]);

  useEffect(() => {
    if (zenEnabled) return;

    const applyResponsiveCollapse = () => {
      const width = window.innerWidth;
      const collapseAi = width < 1100;
      const collapseSidebar = width < 900;

      if ((collapseAi || collapseSidebar) && !responsiveRestoreRef.current) {
        responsiveRestoreRef.current = { sidebarCollapsed: isSidebarCollapsed, aiPanelCollapsed: isAiPanelCollapsed };
      }

      if (collapseAi && !isAiPanelCollapsed) setAiPanelCollapsed(true);
      if (collapseSidebar && !isSidebarCollapsed) setSidebarCollapsed(true);

      if (!collapseAi && !collapseSidebar && responsiveRestoreRef.current) {
        setSidebarCollapsed(responsiveRestoreRef.current.sidebarCollapsed);
        setAiPanelCollapsed(responsiveRestoreRef.current.aiPanelCollapsed);
        responsiveRestoreRef.current = null;
      }
    };

    applyResponsiveCollapse();
    window.addEventListener('resize', applyResponsiveCollapse);
    return () => window.removeEventListener('resize', applyResponsiveCollapse);
  }, [isAiPanelCollapsed, isSidebarCollapsed, setAiPanelCollapsed, setSidebarCollapsed, zenEnabled]);

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
        setZenEnabled(false);
        setSidebarCollapsed(false);
        setSidebarView('stats');
      },
      openMemory: () => {
        setZenEnabled(false);
        setSidebarCollapsed(false);
        setSidebarView('memory');
      },
      openSettings: () => {
        setZenEnabled(false);
        setSidebarCollapsed(false);
        setSidebarView('settings');
      },
      toggleFocusMode: () => toggleZen(),
      startPomodoro,
      pausePomodoro,
      stopPomodoro,
      runSkill,
      skills: skills.filter((s) => s.enabled && s.valid).map((s) => ({ id: s.id, name: s.name, description: s.description })),
    });
  }, [pausePomodoro, runSkill, setSidebarCollapsed, setZenEnabled, skills, startPomodoro, stopPomodoro, t, toggleZen]);

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

  const sidebarMinPx = 240;
  const sidebarMaxPx = 520;
  const effectiveSidebarWidthPx = Math.min(sidebarMaxPx, Math.max(sidebarMinPx, sidebarWidthPx));

  const aiMinPx = 280;
  const aiMaxPx = Math.max(aiMinPx, Math.floor(windowWidth * 0.5));
  const effectiveAiPanelWidthPx = Math.min(aiMaxPx, Math.max(aiMinPx, aiPanelWidthPx));

  useEffect(() => {
    if (!isSidebarCollapsed && sidebarWidthPx !== effectiveSidebarWidthPx) setSidebarWidthPx(effectiveSidebarWidthPx);
  }, [effectiveSidebarWidthPx, isSidebarCollapsed, setSidebarWidthPx, sidebarWidthPx]);

  useEffect(() => {
    if (!isAiPanelCollapsed && aiPanelWidthPx !== effectiveAiPanelWidthPx) setAiPanelWidthPx(effectiveAiPanelWidthPx);
  }, [aiPanelWidthPx, effectiveAiPanelWidthPx, isAiPanelCollapsed, setAiPanelWidthPx]);

  const openSidebarView = (next: SidebarView) => {
    setSidebarView(next);
    setSidebarCollapsed(false);
  };

  const handleActivityViewChange = (next: SidebarView) => {
    openSidebarView(next);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {!focusMode && (
        <TitleBar
          focusMode={focusMode}
          zenEnabled={zenEnabled}
          sidebarOpen={!isSidebarCollapsed}
          aiPanelOpen={!isAiPanelCollapsed}
          onToggleSidebar={toggleSidebarCollapsed}
          onToggleAIPanel={toggleAiPanelCollapsed}
          onToggleFocusMode={toggleZen}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!focusMode && (
          <>
            <ActivityBar activeView={sidebarView} onViewChange={handleActivityViewChange} />

            {!isSidebarCollapsed && (
              <>
                <div
                  className="flex-none overflow-hidden"
                  style={{ width: effectiveSidebarWidthPx }}
                  data-testid="layout-sidebar"
                  data-zen-chrome
                >
                  <SidebarPanel
                    view={sidebarView}
                    onViewChange={openSidebarView}
                    selectedFile={selectedFile}
                    onSelectFile={openFile}
                    editorContent={editorContent}
                  />
                </div>
                <WnResizable
                  direction="horizontal"
                  sizePx={effectiveSidebarWidthPx}
                  minPx={sidebarMinPx}
                  maxPx={sidebarMaxPx}
                  ariaLabel="Resize sidebar"
                  onSizePxChange={setSidebarWidthPx}
                />
              </>
            )}
          </>
        )}
        
        <Editor 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          focusMode={focusMode}
        />
        
        {!focusMode && !isAiPanelCollapsed && (
          <>
            <WnResizable
              direction="horizontal"
              invert
              sizePx={effectiveAiPanelWidthPx}
              minPx={aiMinPx}
              maxPx={aiMaxPx}
              ariaLabel="Resize AI panel"
              onSizePxChange={setAiPanelWidthPx}
            />
            <div
              className="flex-none overflow-hidden"
              style={{ width: effectiveAiPanelWidthPx }}
              data-testid="layout-ai-panel"
              data-zen-chrome
            >
              <AIPanel />
            </div>
          </>
        )}
      </div>

      {!focusMode && (
        <StatusBar
          focusMode={focusMode}
          onOpenStats={() => {
            setZenEnabled(false);
            setSidebarCollapsed(false);
            setSidebarView('stats');
          }}
        />
      )}

      {recoverySnapshot && (
        <div className="fixed inset-0 wn-backdrop flex items-center justify-center z-50">
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
