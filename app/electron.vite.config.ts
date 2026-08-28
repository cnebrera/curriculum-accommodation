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
    build: {
      // Absolute, deliberately. A path relative to the renderer `root` resolved
      // to the REPOSITORY root, two levels above where main.ts loads it from —
      // so `npm run build` succeeded while the packaged app opened a blank
      // window, and `npm run dev` hid it by serving from the Vite dev server.
      // It also explains the stray `out/renderer` that was once committed.
      // Asserted by packages/shell/test/build-layout.test.ts.
      outDir: resolve('out/renderer'),
      rollupOptions: { input: resolve('ui/index.html') },
    },
  },
});
