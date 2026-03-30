import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: 5175,
      host: '0.0.0.0', // Allow connections from any IP
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 5175,
      host: true,
    },
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react', 'locales/en-US.js'],
    },
  };
});
