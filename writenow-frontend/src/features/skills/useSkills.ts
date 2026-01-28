/**
 * useSkills hook
 * Why: Centralize skills management operations with proper loading/error states.
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@/lib/rpc';
import type { SkillListItem, SkillReadResponse } from '@/types/ipc-generated';

export interface UseSkillsResult {
  skills: SkillListItem[];
  loading: boolean;
  error: string | null;

  selectedSkill: SkillReadResponse['skill'] | null;
  selectedSkillLoading: boolean;

  refresh: () => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<boolean>;
  readSkill: (id: string) => Promise<void>;
  clearSelectedSkill: () => void;
}

export function useSkills(): UseSkillsResult {
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSkill, setSelectedSkill] = useState<SkillReadResponse['skill'] | null>(null);
  const [selectedSkillLoading, setSelectedSkillLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke('skill:list', { includeDisabled: true });
      setSkills(res.skills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    setError(null);
    try {
      await invoke('skill:toggle', { id, enabled });
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
      // Also update selected skill if it's the same
      setSelectedSkill((prev) => (prev && prev.id === id ? { ...prev, enabled } : prev));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle skill');
      return false;
    }
  }, []);

  const readSkill = useCallback(async (id: string) => {
    setSelectedSkillLoading(true);
    setError(null);
    try {
      const res = await invoke('skill:read', { id });
      setSelectedSkill(res.skill);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read skill');
      setSelectedSkill(null);
    } finally {
      setSelectedSkillLoading(false);
    }
  }, []);

  const clearSelectedSkill = useCallback(() => {
    setSelectedSkill(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    skills,
    loading,
    error,
    selectedSkill,
    selectedSkillLoading,
    refresh,
    toggle,
    readSkill,
    clearSelectedSkill,
  };
}

export default useSkills;
