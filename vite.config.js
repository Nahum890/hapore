import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { createApiChatHandler } from './src/server/apiChatHandler.js';

const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
// Identificador único de cada build: la app lo compara con /version.json para
// recargarse sola si quedó abierta una versión vieja desde la caché.
const BUILD_ID = `${APP_VERSION}-${Date.now().toString(36)}`;

function versionFilePlugin() {
  return {
    name: 'pyfis-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION, build: BUILD_ID }) });
    },
  };
}

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
    // (android/app/build.gradle → versionName), así Vercel y el APK coinciden.
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    plugins: [
      react(),
      versionFilePlugin(),
      apiChatPlugin(apiKey, primaryModel, {
        supabaseUrl: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '',
        supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '',
      }),
      VitePWA({
        // En el APK (Capacitor) todos los archivos ya van dentro de la app:
        // no hace falta service worker y así no interfiere con la carga local.
        disable: mode === 'capacitor',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'manifest.webmanifest'],
        // El manifest se mantiene como archivo estático en public/manifest.webmanifest.
        manifest: false,
        workbox: {
          // Incluye ttf/woff2: sin esto, la fuente NotoSans del PDF (y
          // cualquier otro recurso de fuente) no quedaba precacheada, y la
          // ficha PDF podía fallar la primera vez que se generaba sin conexión.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,ttf,woff,woff2}'],
          // La presentación (capturas) y el APK solo se usan con internet.
          // version.json nunca se cachea: es el que avisa que hay versión nueva.
          globIgnores: ['**/landing/**', '**/downloads/**', '**/videos/**', 'version.json'],
          // Las páginas van "primero la red": con internet siempre se ve la
          // última versión publicada; el index.html precacheado queda solo como
          // respaldo sin conexión. (Antes se servía desde la caché y algunos
          // navegadores seguían mostrando la versión anterior.)
          navigateFallback: null,
          directoryIndex: null,
          runtimeCaching: [{
            urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/.well-known/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pyfis-pages',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
              precacheFallback: { fallbackURL: '/index.html' },
            },
          }],
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
