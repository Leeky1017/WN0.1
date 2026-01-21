import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import App from './App.tsx';
import { i18n } from './lib/i18n';
import './index.css';
import './styles/platform-fonts.css';
import './styles/tokens.css';
import './styles/theme.css';
import './styles/markdown.css';

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
  type ConversationMessage = import('./types/ipc').WritenowConversationMessage;
  type ConversationIndexItem = import('./types/ipc').WritenowConversationIndexItem;

  type E2EDebugApi = {
    ready: boolean;
    assembleContext?: (input: AssembleInput) => Promise<AssembleOutput>;
    generateConversationSummary?: (input: {
      projectId: string;
      conversationId: string;
      articleId: string;
      skillId: string;
      skillName: string;
      outcome: 'accepted' | 'rejected' | 'canceled' | 'error';
      originalText: string;
      suggestedText: string;
      messages: ConversationMessage[];
    }) => Promise<ConversationIndexItem>;
    getEditorContext?: () => {
      config: { debounceMs: number; windowParagraphs: number };
      context: import('./types/context').EditorContext | null;
      entityHits: import('./lib/context/entity-detect').DetectedEntityHit[];
      settingsPrefetch: import('./stores/editorContextStore').SettingsPrefetchState;
      syncError: string | null;
      lastSyncedAtMs: number | null;
    };
  };

  const w = window as unknown as { __WN_E2E__?: E2EDebugApi };
  w.__WN_E2E__ = { ready: false };

  void Promise.all([
    import('./lib/context/ContextAssembler'),
    import('./lib/context/conversation-summary'),
    import('./stores/editorContextStore'),
  ])
    .then(([{ ContextAssembler }, { generateAndPersistConversationSummary }, { useEditorContextStore }]) => {
      const assembler = new ContextAssembler();
      if (!w.__WN_E2E__) w.__WN_E2E__ = { ready: false };
      w.__WN_E2E__.assembleContext = async (input: AssembleInput) => assembler.assemble(input);
      w.__WN_E2E__.generateConversationSummary = async (input) =>
        generateAndPersistConversationSummary({
          projectId: input.projectId,
          conversationId: input.conversationId,
          articleId: input.articleId,
          skillId: input.skillId,
          skillName: input.skillName,
          outcome: input.outcome,
          originalText: input.originalText,
          suggestedText: input.suggestedText,
          messages: input.messages,
        });
      w.__WN_E2E__.getEditorContext = () => {
        const state = useEditorContextStore.getState();
        return {
          config: state.config,
          context: state.context,
          entityHits: state.entityHits,
          settingsPrefetch: state.settingsPrefetch,
          syncError: state.syncError,
          lastSyncedAtMs: state.lastSyncedAtMs,
        };
      };
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
