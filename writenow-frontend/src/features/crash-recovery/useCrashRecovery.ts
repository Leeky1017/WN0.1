/**
 * useCrashRecovery hook
 * Why: Detect unclean exits and provide recovery options on startup.
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke, invokeSafe } from '@/lib/rpc';
import type { DocumentSnapshot } from '@/types/ipc-generated';

export interface UseCrashRecoveryResult {
  /** Whether an unclean exit was detected */
  uncleanExitDetected: boolean;
  /** The latest snapshot available for recovery */
  latestSnapshot: DocumentSnapshot | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;

  /** Check session status */
  checkStatus: () => Promise<void>;
  /** Recover the snapshot content */
  recover: () => Promise<{ path: string; content: string } | null>;
  /** Dismiss the recovery prompt without recovering */
  dismiss: () => void;
}

export function useCrashRecovery(): UseCrashRecoveryResult {
  const [uncleanExitDetected, setUncleanExitDetected] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await invoke('file:session:status', {});
      
      if (statusRes.uncleanExitDetected) {
        setUncleanExitDetected(true);
        
        // Fetch the latest snapshot for recovery
        const snapshotRes = await invokeSafe('file:snapshot:latest', {});
        if (snapshotRes?.snapshot) {
          setLatestSnapshot(snapshotRes.snapshot);
        }
      } else {
        setUncleanExitDetected(false);
        setLatestSnapshot(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check session status');
      // Why: Errors checking status are non-blocking; we don't show recovery UI.
      setUncleanExitDetected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const recover = useCallback(async (): Promise<{ path: string; content: string } | null> => {
    if (!latestSnapshot) {
      setError('No snapshot available for recovery');
      return null;
    }

    try {
      // Write the recovered content back to the original file
      await invoke('file:write', {
        path: latestSnapshot.path,
        content: latestSnapshot.content,
      });

      // Clear the recovery state
      setUncleanExitDetected(false);
      setLatestSnapshot(null);

      return {
        path: latestSnapshot.path,
        content: latestSnapshot.content,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover snapshot');
      return null;
    }
  }, [latestSnapshot]);

  const dismiss = useCallback(() => {
    setUncleanExitDetected(false);
    setLatestSnapshot(null);
    setError(null);
  }, []);

  // Check on mount
  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  return {
    uncleanExitDetected,
    latestSnapshot,
    loading,
    error,
    checkStatus,
    recover,
    dismiss,
  };
}

export default useCrashRecovery;
