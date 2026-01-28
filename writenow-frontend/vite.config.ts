import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * WriteNow Frontend Vite Configuration
 *
 * Build optimizations:
 * - Chunk splitting for vendor/feature code
 * - drop_console in production
 * - Bundle analysis via env flag
 *
 * Note: react-hotkeys-hook is listed as dependency but unused (custom shortcuts in lib/keyboard).
 * Consider removing if not planned for future use.
 */

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      // Enable source maps for debugging (disabled in production for size)
      sourcemap: !isProduction,

      // Chunk size warning threshold
      chunkSizeWarningLimit: 500,

      rollupOptions: {
        output: {
          // Manual chunk splitting strategy for better caching
          manualChunks: (id) => {
            // Vendor chunks - split large dependencies for better caching
            if (id.includes('node_modules')) {
              // React ecosystem
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react'
              }
              // TipTap editor (large)
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-tiptap'
              }
              // Framer Motion
              if (id.includes('framer-motion')) {
                return 'vendor-motion'
              }
              // Radix UI components
              if (id.includes('@radix-ui')) {
                return 'vendor-radix'
              }
              // JSON-RPC
              if (id.includes('vscode-jsonrpc') || id.includes('vscode-ws-jsonrpc')) {
                return 'vendor-rpc'
              }
              // Other vendors
              return 'vendor'
            }

            // Feature chunks - lazy-loaded features
            if (id.includes('/features/ai-panel/')) {
              return 'feature-ai'
            }
            if (id.includes('/features/write-mode/')) {
              return 'feature-editor'
            }
            if (id.includes('/features/settings/')) {
              return 'feature-settings'
            }
            if (id.includes('/features/search/') || id.includes('/features/outline/')) {
              return 'feature-search'
            }
            if (id.includes('/features/version-history/') || id.includes('/features/export/')) {
              return 'feature-history'
            }

            // Default: let Vite handle it
            return undefined
          },
        },
      },

      // Minification options
      minify: isProduction ? 'esbuild' : false,
      esbuild: isProduction
        ? {
            // Remove console.log/warn in production, keep console.error for observability
            drop: ['console', 'debugger'],
            // Keep console.error for error tracking
            pure: ['console.log', 'console.warn', 'console.info', 'console.debug'],
          }
        : undefined,
    },

    // Development server config
    server: {
      port: 5173,
      strictPort: false,
    },

    // Environment variables
    define: {
      __DEV__: JSON.stringify(!isProduction),
      __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    },
  }
})
