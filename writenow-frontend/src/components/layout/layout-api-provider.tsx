/**
 * Layout API provider
 * Why: Keep the provider export fast-refresh friendly (exporting only a component from this file).
 */

import { LayoutApiContext, type LayoutApi } from './layout-api-context';

export function LayoutApiProvider({ api, children }: { api: LayoutApi; children: React.ReactNode }) {
  return <LayoutApiContext.Provider value={api}>{children}</LayoutApiContext.Provider>;
}

