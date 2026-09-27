// Versión de la app (la inyecta Vite desde package.json). Es la misma que
// declara el APK en apk/twa-manifest.json, así Vercel y el APK coinciden.
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
export const APP_VERSION_LABEL = `Demo ${APP_VERSION.split('.').slice(0, 2).join('.')}`;
