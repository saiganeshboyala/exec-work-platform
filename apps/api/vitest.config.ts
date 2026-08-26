import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The source uses the same `@/` alias as tsconfig paths; vitest needs it
  // spelled out or every import through the alias fails to resolve.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
      exclude: ['src/main.ts', 'src/database/seed.ts', '**/*.types.ts'],
    },
  },
});
