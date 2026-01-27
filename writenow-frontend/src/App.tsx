import { TooltipProvider } from './components/ui/tooltip';
import { ElectronApiProvider } from './lib/electron/ElectronApiProvider';
import { WriteModePage } from './features/write-mode/WriteModePage';

/**
 * WriteNow Artistic Demo - Main App
 * 
 * Why TooltipProvider at root: All Tooltip components in the app require
 * a provider ancestor. Placing it here ensures all tooltips work correctly.
 */
function App() {
  return (
    <ElectronApiProvider>
      <TooltipProvider>
        <WriteModePage />
      </TooltipProvider>
    </ElectronApiProvider>
  );
}

export default App;
