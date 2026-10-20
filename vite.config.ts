import { defineConfig } from 'vitest/config';
import { serviceWorker } from './scripts/service-worker.ts';

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'icons', test: /node_modules[\\/]lucide-preact/ },
            { name: 'vendor', test: /node_modules[\\/](preact|@preact)/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
