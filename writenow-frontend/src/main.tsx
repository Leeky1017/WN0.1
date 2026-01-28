import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initI18n } from '@/lib/i18n/i18n';

import './index.css';
import App from './App.tsx';

async function bootstrap() {
  await initI18n();
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
