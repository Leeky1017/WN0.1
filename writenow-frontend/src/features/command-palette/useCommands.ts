/**
 * useCommands
 * Why: Assemble cmdk groups (recent/files/skills) from real backend data + persisted recents.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { invoke } from '@/lib/rpc';
import { useAIStore, useCommandPaletteStore } from '@/stores';
import type { DocumentFileListItem, SkillListItem } from '@/types/ipc-generated';

export type CommandPaletteFileItem = {
  path: string;
  name: string;
};

export interface UseCommandsResult {
  recentItems: { type: 'file' | 'command' | 'skill'; id: string; label: string }[];
  files: CommandPaletteFileItem[];
  filesLoading: boolean;
  filesError: string | null;
  reloadFiles: () => Promise<void>;
  skills: SkillListItem[];
}

function toFileItem(item: DocumentFileListItem): CommandPaletteFileItem {
  return { path: item.path, name: item.name };
}

export function useCommands(enabled: boolean): UseCommandsResult {
  const recent = useCommandPaletteStore((s) => s.recent);
  const skills = useAIStore((s) => s.skills);

  const [files, setFiles] = useState<CommandPaletteFileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const reloadFiles = useCallback(async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await invoke('file:list', {});
      const items = Array.isArray(res.items) ? res.items : [];
      setFiles(items.map(toFileItem));
    } catch (error) {
      setFilesError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reloadFiles();
  }, [enabled, reloadFiles]);

  const recentItems = useMemo(() => recent.map((r) => ({ type: r.type, id: r.id, label: r.label })), [recent]);
  const enabledSkills = useMemo(() => skills.filter((s) => s.enabled && s.valid), [skills]);

  return { recentItems, files, filesLoading, filesError, reloadFiles, skills: enabledSkills };
}

export default useCommands;
