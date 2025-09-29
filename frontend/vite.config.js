import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    port: 5173, // Explicitly set frontend port
    proxy: {
      '/api': {
        target: 'https://aktiv-backend.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/socket.io': {
        target: 'https://aktiv-backend.onrender.com',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://aktiv-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/Uploads': {
        target: 'https://aktiv-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});