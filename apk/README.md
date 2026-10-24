# APK de PyFis IA (Demo 1.0)

El APK se arma con **Capacitor**: lleva toda la app adentro, así que **funciona sin internet**.
El proyecto Android está en [`android/`](../android) y la configuración en [`capacitor.config.json`](../capacitor.config.json).
Con internet, el tutor con IA usa `https://pyfisia.vercel.app/api/chat` (ver `.env.capacitor`).

| Dato | Valor |
| --- | --- |
| Paquete | `com.kyreydevs.pyfisia` |
| Versión | `1.0.0` (versionCode `1`) — igual que `package.json` y el pie de la app ("Demo 1.0") |
| Descarga pública | `public/downloads/PyFis-IA-Demo-1.0.apk` → https://pyfisia.vercel.app/downloads/PyFis-IA-Demo-1.0.apk |

## Qué hay en esta carpeta

| Archivo | Qué es | ¿Se sube a GitHub? |
| --- | --- | --- |
| `README.md` | Esta guía | Sí |
| `android.keystore` | Llave de firma del APK | **Nunca** |
| `keystore-credentials.txt` | Contraseñas de la llave | **Nunca** |
| `PyFis-IA-Demo-1.0.apk` | Último APK firmado | No (la copia pública está en `public/downloads/`) |

Guardá la llave y sus contraseñas en un lugar seguro (por ejemplo, un pendrive y un Drive privado). **Sin ellas no se puede publicar una actualización con el mismo paquete.**

## Instalar en un teléfono Android

1. Pasá el `.apk` al teléfono (WhatsApp, cable USB, Google Drive…) o descargalo desde la página.
2. Tocá el archivo. Si Android lo pide, permití **"Instalar apps desconocidas"**.
3. Abrí **PyFis IA** y creá tu cuenta.

## Volver a generar el APK

Cada cambio de la app necesita un APK nuevo (a diferencia de la web, que se actualiza sola con cada deploy).

1. Si cambia la versión: actualizá `version` en `package.json` y `versionName` / `versionCode` (+1) en `android/app/build.gradle`.
2. `npm run build:apk` (compila en modo `capacitor` y copia la app a `android/`).
3. En `android/`, con `JAVA_HOME` apuntando al JDK de Android Studio (`C:\Program Files\Android\Android Studio\jbr`) y `ANDROID_HOME` al SDK: `gradlew.bat assembleRelease`.
4. Alineá y firmá `android/app/build/outputs/apk/release/app-release-unsigned.apk` con `zipalign -p 4` y `apksigner sign` (build-tools 36.1.0), usando `apk/android.keystore` y el alias `pyfisia`.
5. Copiá el APK firmado como `apk/PyFis-IA-Demo-1.0.apk` y `public/downloads/PyFis-IA-Demo-1.0.apk` (actualizá el tamaño en `src/landing/Landing.jsx` si cambia).

## Publicar en Google Play (opcional)

Play Store pide un **AAB**: `gradlew.bat bundleRelease` en `android/` y firmalo con la misma llave.
