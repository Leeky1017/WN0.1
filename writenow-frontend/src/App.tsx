import { I18nextProvider } from 'react-i18next';
import { TooltipProvider } from './components/ui/tooltip';
import { ElectronApiProvider } from './lib/electron/ElectronApiProvider';
import { i18n } from './lib/i18n/i18n';
import { WriteModePage } from './features/write-mode/WriteModePage';

/**
 * WriteNow Artistic Demo - Main App
 * 
 * Why TooltipProvider at root: All Tooltip components in the app require
 * a provider ancestor. Placing it here ensures all tooltips work correctly.
 */
function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ElectronApiProvider>
        <TooltipProvider>
          <WriteModePage />
        </TooltipProvider>
      </ElectronApiProvider>
    </I18nextProvider>
  );
}

export default App;
