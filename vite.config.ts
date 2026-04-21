import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@gfx': resolve(__dirname, 'src/gfx'),
      '@midi': resolve(__dirname, 'src/midi'),
      '@audio': resolve(__dirname, 'src/audio'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@state': resolve(__dirname, 'src/state'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
