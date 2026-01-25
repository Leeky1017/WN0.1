import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { ElectronApiProvider } from './lib/electron/ElectronApiProvider'
import type { ElectronAPI } from './types/electron-api'

function getElectronApi(): ElectronAPI | null {
  const maybeWindow = window as unknown as { electronAPI?: ElectronAPI };
  return maybeWindow.electronAPI ?? null;
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Unable to find root element');
}

createRoot(rootEl).render(
  <StrictMode>
    <ElectronApiProvider api={getElectronApi()}>
      <App />
    </ElectronApiProvider>
  </StrictMode>,
)
