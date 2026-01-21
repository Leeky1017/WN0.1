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

if (api?.isE2E) {
  type AssembleInput = import('./lib/context/assembler').ContextAssemblerInput;
  type AssembleOutput = import('./types/context').AssembleResult;

  type E2EDebugApi = {
    ready: boolean;
    assembleContext?: (input: AssembleInput) => Promise<AssembleOutput>;
  };

  const w = window as unknown as { __WN_E2E__?: E2EDebugApi };
  w.__WN_E2E__ = { ready: false };

  void import('./lib/context/ContextAssembler')
    .then(({ ContextAssembler }) => {
      const assembler = new ContextAssembler();
      if (!w.__WN_E2E__) w.__WN_E2E__ = { ready: false };
      w.__WN_E2E__.assembleContext = async (input: AssembleInput) => assembler.assemble(input);
      w.__WN_E2E__.ready = true;
    })
    .catch(() => {
      if (!w.__WN_E2E__) w.__WN_E2E__ = { ready: false };
      w.__WN_E2E__.ready = false;
    });
}

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
