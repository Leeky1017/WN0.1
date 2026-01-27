import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error - tailwindcss vite plugin has no types
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
