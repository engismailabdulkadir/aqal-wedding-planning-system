import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/uploads': {
        target: process.env.VITE_BACKEND_ORIGIN || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

