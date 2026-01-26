# WriteNow Artistic Frontend Demo

This is a standalone, high-fidelity frontend demo showcasing the "Professional & Artistic" design direction for WriteNow.

## 🎨 Design Philosophy

This demo moves away from the "generic SaaS" look towards a more immersive, texture-rich, and emotional design language suitable for a creative tool.

### Key Pillars:
1.  **Immersive Typography**: Uses a carefully selected serif font for the editor to evoke the feeling of a book or high-quality print.
2.  **"Midnight" Theme with Depth**: Instead of flat blacks, we use deep zinc/slate tones with subtle violet/indigo tints to create a "Midnight" atmosphere.
3.  **Glassmorphism & Texture**: Panels use backdrop blur to feel like floating layers. A subtle noise texture overlay adds "grain" and physicality to the digital surface.
4.  **Invisible UI**: Controls like the Stats Bar and Sidebar toggles are unobtrusive or hidden until needed, keeping the focus on writing.
5.  **Micro-interactions**: Fluid transitions using Framer Motion make the app feel alive and responsive.

## 🛠 Tech Stack

-   **Framework**: React + Vite + TypeScript
-   **Styling**: Tailwind CSS 4.x (using the new `@theme` configuration)
-   **Animation**: Framer Motion
-   **Icons**: Lucide React
-   **Primitives**: Radix UI (Popover, etc.)

## 🚀 How to Run

1.  Navigate to this directory:
    ```bash
    cd writenow-artistic-demo
    ```
2.  Install dependencies (already done):
    ```bash
    npm install
    ```
3.  Start the dev server:
    ```bash
    npm run dev
    ```

## 📂 Project Structure

-   `src/styles/globals.css`: The heart of the design system. Defines the color palette, typography, and noise texture.
-   `src/components/layout/AppShell.tsx`: The main 3-pane layout with smooth collapsible transitions.
-   `src/components/editor/Editor.tsx`: The immersive writing surface with "breathing" ambient effects.
-   `src/components/ai-panel/AIPanel.tsx`: The AI assistant with a glass-like chat interface.
-   `src/components/sidebar/Sidebar.tsx`: Minimalist navigation with active state animations.
-   `src/components/layout/WelcomeScreen.tsx`: An emotional "Zero State" entry point.
