import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { createApiChatHandler } from './src/server/apiChatHandler.js';

const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

// Endpoint /api/chat seguro: la API key vive solo del lado servidor
// (variable de entorno GEMINI_API_KEY, nunca en el bundle del cliente).
export function apiChatPlugin(apiKey, primaryModel, options = {}) {
  const handler = createApiChatHandler(apiKey, primaryModel, options);
  return { name: 'guarania-api-chat', configureServer(server) { server.middlewares.use('/api/chat', handler); }, configurePreviewServer(server) { server.middlewares.use('/api/chat', handler); } };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY ?? '';
  const primaryModel = env.GEMINI_MODEL ?? 'gemini-3.8-flash';

  return {
    // Versión visible en la app (pie de página). Es la misma que usa el APK
    // (apk/twa-manifest.json → appVersionName), así Vercel y el APK coinciden.
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    plugins: [
      react(),
      apiChatPlugin(apiKey, primaryModel, {
        supabaseUrl: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '',
        supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '',
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'manifest.webmanifest'],
        // El manifest se mantiene como archivo estático en public/manifest.webmanifest.
        manifest: false,
        workbox: {
          // Incluye ttf/woff2: sin esto, la fuente NotoSans del PDF (y
          // cualquier otro recurso de fuente) no quedaba precacheada, y la
          // ficha PDF podía fallar la primera vez que se generaba sin conexión.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,ttf,woff,woff2}'],
          navigateFallback: '/index.html',
          // El tutor online nunca debe responderse con el index.html cacheado.
          // Tampoco los archivos de verificación del APK (Digital Asset Links).
          navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
          // Una versión nueva reemplaza a la anterior apenas se instala: evita
          // quedar con un service worker viejo en los teléfonos de la demo.
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
      }),
    ],
  };
});
