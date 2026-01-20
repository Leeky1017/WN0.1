import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import App from './App.tsx';
import { i18n } from './lib/i18n';
import './index.css';
import './styles/platform-fonts.css';
import './styles/theme.css';

const api = window.writenow;

const safeSend = (channel: string, payload?: unknown) => {
  try {
    api?.send?.(channel, payload);
  } catch {
    // ignore
  }
};

safeSend('app:renderer-boot', { href: window.location.href });

window.addEventListener('error', (event) => {
  safeSend('app:renderer-error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: (event.error && event.error.stack) || String(event.error || ''),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  safeSend('app:renderer-unhandledrejection', {
    reason: (event.reason && event.reason.stack) || String(event.reason || ''),
  });
});

createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>
);
safeSend('app:renderer-ready');
