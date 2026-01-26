import { AppShell } from './components/layout/AppShell';
import { TooltipProvider } from './components/ui/tooltip';

/**
 * WriteNow Artistic Demo - Main App
 * 
 * Why TooltipProvider at root: All Tooltip components in the app require
 * a provider ancestor. Placing it here ensures all tooltips work correctly.
 */
function App() {
  return (
    <TooltipProvider>
      <AppShell />
    </TooltipProvider>
  );
}

export default App;
