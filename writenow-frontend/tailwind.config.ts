import type { Config } from 'tailwindcss';

/**
 * Tailwind config (Tailwind CSS v4)
 * Why: Provide semantic utility names mapped to Design Tokens.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-app': 'var(--bg-app)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-panel': 'var(--bg-panel)',
        'bg-editor': 'var(--bg-editor)',
        'bg-input': 'var(--bg-input)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
} satisfies Config;
