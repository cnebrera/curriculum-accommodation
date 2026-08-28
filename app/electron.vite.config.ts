import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: resolve('packages/shell/src/main.ts') }, outDir: 'out/main' },
    resolve: { alias: { '@rampa/core': resolve('packages/core/src/index.ts'),
                        '@rampa/providers': resolve('packages/providers/src/index.ts') } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: resolve('packages/shell/src/preload.ts') }, outDir: 'out/preload' },
  },
  renderer: {
    root: 'ui',
    plugins: [react()],
    build: { outDir: '../out/renderer', rollupOptions: { input: resolve('ui/index.html') } },
  },
});
