import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { LanguageProvider } from './i18n/LanguageProvider.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';

const native = Capacitor.isNativePlatform();

// Busca versión nueva al abrir, cada 30 minutos y al volver a la pestaña.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => { if (navigator.onLine) registration.update().catch(() => {}); };
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  },
});

// Red de seguridad contra versiones viejas en caché: si /version.json (nunca
// cacheado) dice que hay otro build, se borran las cachés y se recarga una vez.
async function ensureLatestVersion() {
  if (native || !navigator.onLine || typeof __BUILD_ID__ === 'undefined' || import.meta.env.DEV) return;
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { build } = await response.json();
    if (!build || build === __BUILD_ID__) return;
    const key = `pyfis-reloaded-${build}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(registrations.map(registration => registration.update().catch(() => {})));
    const names = await window.caches?.keys?.() ?? [];
    await Promise.all(names.map(name => caches.delete(name)));
    window.location.reload();
  } catch { /* sin conexión o sin permisos: se sigue con la versión actual */ }
}
ensureLatestVersion();

// "/" es la página de presentación del producto; la app vive en "/demo".
// El APK (Capacitor) y la app instalada (PWA) abren directo la app.
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const showLanding = !native && !standalone && (path === '/' || path === '/index.html');
// Dos funciones separadas: así Vite precarga el CSS correcto de cada una
// (con un ternario dentro de un solo import() mezclaba las dependencias).
const loadLanding = () => import('./landing/Landing.jsx');
const loadApp = () => import('./App.jsx');
const Root = React.lazy(showLanding ? loadLanding : loadApp);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <LanguageProvider>
        <Suspense fallback={<div className="boot-loading" aria-busy="true" />}>
          <Root />
        </Suspense>
      </LanguageProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
