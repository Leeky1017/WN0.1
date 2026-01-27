/**
 * WriteModePage
 * Why: One entry point for the Write Mode SSOT chain (connect backend → render workbench).
 */

import { useEffect } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useElectronApi } from '@/lib/electron';
import { useRpcConnection } from '@/lib/hooks';
import { useStatusBarStore } from '@/stores/statusBarStore';

export function WriteModePage() {
  const { isConnected } = useRpcConnection({ autoConnect: true });
  const setConnectionStatus = useStatusBarStore((s) => s.setConnectionStatus);
  const electronApi = useElectronApi();

  useEffect(() => {
    setConnectionStatus(isConnected);
  }, [isConnected, setConnectionStatus]);

  useEffect(() => {
    if (!electronApi) return;
    return electronApi.onBackendCrashed(() => {
      setConnectionStatus(false);
    });
  }, [electronApi, setConnectionStatus]);

  return <AppShell />;
}

export default WriteModePage;

