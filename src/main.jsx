import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { LanguageProvider } from './i18n/LanguageProvider.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';

registerSW({ immediate: true });

// "/" es la página de presentación del producto; la app vive en "/demo".
// El APK (Capacitor) y la app instalada (PWA) abren directo la app.
const native = Capacitor.isNativePlatform();
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
