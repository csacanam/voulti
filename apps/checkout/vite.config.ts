import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: 5175,
      host: '0.0.0.0', // Allow connections from any IP
      // In dev the services fetch relative paths (`/invoices`, `/commerces`…)
      // so the browser origin is the dev server and CORS never applies. Only
      // `/api` was proxied, so those calls fell through to the SPA fallback and
      // came back as HTML: the checkout could not load an invoice locally at
      // all. Point VITE_BACKEND_URL at api.voulti.com to work against
      // production data without hitting its CORS policy.
      proxy: Object.fromEntries(
        ['/api', '/invoices', '/commerces', '/deposit', '/prices', '/blockchain', '/stats'].map(
          path => [path, {
            target: env.VITE_BACKEND_URL || 'http://127.0.0.1:3000',
            changeOrigin: true,
            secure: false,
          }]
        )
      ),
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
