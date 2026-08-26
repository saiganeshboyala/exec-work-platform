import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // @ewp/contracts ships real ESM (dist/esm) alongside its CommonJS build, so
  // Vite resolves it as source and picks up a rebuild immediately. Pre-bundling
  // it would reintroduce a cache that goes stale whenever the package changes.
  optimizeDeps: { exclude: ['@ewp/contracts'] },
  server: {
    port: 5173,
    // The API is called through /api so the browser never sees a second origin.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
