import { useEffect, useMemo, useRef, useState } from 'react';

import { detectEntities, type DetectedEntityHit, type DetectEntitiesCandidates } from '../lib/context/entity-detect';
import { onWritenowChanged, startWritenowWatch } from '../lib/context/writenow';
import { listWritenowSettings, prefetchByEntities } from '../lib/context/loaders/settings-loader';
import { useEditorContextStore } from '../stores/editorContextStore';
import { useProjectsStore } from '../stores/projectsStore';

const EMPTY_LIST: string[] = [];

function hitsEqual(a: DetectedEntityHit[], b: DetectedEntityHit[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.entity !== right.entity) return false;
    if (left.kind !== right.kind) return false;
    if (left.ruleId !== right.ruleId) return false;
    if (left.source !== right.source) return false;
  }
  return true;
}

function listEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Connects Immediate editor context → entity detection → settings prefetch.
 *
 * Why:
 * - Phase-1 entity detection must be fast and deterministic to safely trigger prefetch.
 * - Prefetch should run ahead of user requests so prompt assembly can stay snappy.
 * - All failures must degrade to "no settings injected" without crashing the editor.
 */
export function useContextEntityPrefetch() {
  const projectId = useProjectsStore((s) => s.currentProjectId);

  const selectedText = useEditorContextStore((s) => s.context?.selectedText ?? null);
  const currentParagraph = useEditorContextStore((s) => s.context?.currentParagraph ?? '');
  const surroundingBefore = useEditorContextStore((s) => s.context?.surroundingParagraphs.before ?? EMPTY_LIST);
  const surroundingAfter = useEditorContextStore((s) => s.context?.surroundingParagraphs.after ?? EMPTY_LIST);

  const setEntityHits = useEditorContextStore((s) => s.setEntityHits);
  const setSettingsPrefetch = useEditorContextStore((s) => s.setSettingsPrefetch);

  const candidatesRef = useRef<DetectEntitiesCandidates>({ characters: [], settings: [] });
  const [candidatesVersion, setCandidatesVersion] = useState(0);
  const candidatesLoadedRef = useRef(false);

  const idleState = useMemo(
    () => ({
      status: 'idle' as const,
      entities: [],
      resolved: { characters: [], settings: [] },
      atMs: null,
      errorMessage: null,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    candidatesLoadedRef.current = false;
    candidatesRef.current = { characters: [], settings: [] };

    if (!projectId) {
      const current = useEditorContextStore.getState().settingsPrefetch;
      if (current.status !== 'idle' || current.entities.length > 0 || current.errorMessage) {
        setSettingsPrefetch(idleState);
      }
      return () => {
        cancelled = true;
      };
    }

    startWritenowWatch(projectId).catch((error) => {
      if (cancelled) return;
      const message = toErrorMessage(error);
      setSettingsPrefetch({
        status: 'error',
        entities: [],
        resolved: { characters: [], settings: [] },
        atMs: Date.now(),
        errorMessage: `Settings watch start failed: ${message}`,
      });
    });

    const stopChanged = onWritenowChanged((evt) => {
      if (evt.projectId !== projectId) return;
      const paths = Array.isArray(evt.changedPaths) ? evt.changedPaths : [];
      const didTouchSettings =
        paths.length === 0 || paths.some((p) => p.startsWith('characters/') || p.startsWith('settings/'));
      if (!didTouchSettings) return;

      listWritenowSettings(projectId, { refresh: true })
        .then((index) => {
          if (cancelled) return;
          candidatesLoadedRef.current = true;
          candidatesRef.current = { characters: index.characters, settings: index.settings };
          setCandidatesVersion((v) => v + 1);
        })
        .catch((error) => {
          if (cancelled) return;
          const message = toErrorMessage(error);
          candidatesRef.current = { characters: [], settings: [] };
          setCandidatesVersion((v) => v + 1);
          setSettingsPrefetch({
            status: 'error',
            entities: [],
            resolved: { characters: [], settings: [] },
            atMs: Date.now(),
            errorMessage: `Settings index refresh failed: ${message}`,
          });
        });
    });

    listWritenowSettings(projectId)
      .then((index) => {
        if (cancelled) return;
        candidatesLoadedRef.current = true;
        candidatesRef.current = { characters: index.characters, settings: index.settings };
        setCandidatesVersion((v) => v + 1);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = toErrorMessage(error);
        candidatesRef.current = { characters: [], settings: [] };
        setCandidatesVersion((v) => v + 1);
        setSettingsPrefetch({
          status: 'error',
          entities: [],
          resolved: { characters: [], settings: [] },
          atMs: Date.now(),
          errorMessage: `Settings index load failed: ${message}`,
        });
      });

    return () => {
      cancelled = true;
      stopChanged();
    };
  }, [idleState, projectId, setSettingsPrefetch]);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) return () => {
      cancelled = true;
    };

    const hasAnyText =
      Boolean(selectedText && selectedText.trim()) ||
      Boolean(currentParagraph && currentParagraph.trim()) ||
      surroundingBefore.some((p) => p.trim()) ||
      surroundingAfter.some((p) => p.trim());

    if (!hasAnyText) {
      const existingHits = useEditorContextStore.getState().entityHits;
      if (existingHits.length > 0) setEntityHits([]);
      const current = useEditorContextStore.getState().settingsPrefetch;
      if (current.status !== 'idle' || current.entities.length > 0 || current.errorMessage) {
        setSettingsPrefetch(idleState);
      }
      return () => {
        cancelled = true;
      };
    }

    if (!candidatesLoadedRef.current) return () => {
      cancelled = true;
    };

    const detected = detectEntities({
      context: {
        selectedText,
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph,
        surroundingParagraphs: { before: surroundingBefore, after: surroundingAfter },
        detectedEntities: [],
      },
      candidates: candidatesRef.current,
    });

    const existingHits = useEditorContextStore.getState().entityHits;
    if (!hitsEqual(existingHits, detected.hits)) setEntityHits(detected.hits);

    if (detected.entities.length === 0) {
      setSettingsPrefetch(idleState);
      return () => {
        cancelled = true;
      };
    }

    const current = useEditorContextStore.getState().settingsPrefetch;
    if (listEqual(current.entities, detected.entities) && (current.status === 'prefetching' || current.status === 'ready')) {
      return () => {
        cancelled = true;
      };
    }

    setSettingsPrefetch({
      status: 'prefetching',
      entities: detected.entities,
      resolved: { characters: [], settings: [] },
      atMs: Date.now(),
      errorMessage: null,
    });

    prefetchByEntities(projectId, { entities: detected.entities })
      .then((result) => {
        if (cancelled) return;
        setSettingsPrefetch({
          status: 'ready',
          entities: result.entities,
          resolved: result.resolved,
          atMs: result.loadedAtMs,
          errorMessage: result.errors.length > 0 ? `Prefetch completed with ${result.errors.length} warnings` : null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setSettingsPrefetch({
          status: 'error',
          entities: detected.entities,
          resolved: { characters: [], settings: [] },
          atMs: Date.now(),
          errorMessage: `Prefetch failed: ${toErrorMessage(error)}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentParagraph,
    candidatesVersion,
    idleState,
    projectId,
    selectedText,
    setEntityHits,
    setSettingsPrefetch,
    surroundingAfter,
    surroundingBefore,
  ]);
}
