import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Dev: forward auth API to the Express backend.
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          purify: ['dompurify'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console'],
  },
});