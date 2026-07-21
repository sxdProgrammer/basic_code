import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Allow relative path deployments
  server: {
    port: 5173,
    proxy: {
      '/best_code/backend/public': {
        target: 'http://localhost',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
