# APK de PyFis IA (Demo 1.0)

El APK es una **Trusted Web Activity (TWA)**: abre **https://pyfisia.vercel.app** en pantalla completa, sin barra del navegador.
Por eso **la app del teléfono y la web de Vercel son siempre la misma versión**: cada deploy en Vercel actualiza también el APK, sin reinstalar.

| Dato | Valor |
| --- | --- |
| Paquete | `com.kyreydevs.pyfisia` |
| Versión | `1.0.0` (versionCode `1`) — igual que `package.json` y el pie de la app ("Demo 1.0") |
| Sitio | `pyfisia.vercel.app` |
| Android mínimo | 5.0 (API 21) |
| Verificación | `public/.well-known/assetlinks.json` (huella SHA-256 de la llave de firma) |

## Instalar en un teléfono Android

1. Pasá `PyFis-IA-Demo-1.0.apk` al teléfono (WhatsApp, cable USB, Google Drive…).
2. Tocá el archivo. Si Android lo pide, permití **"Instalar apps desconocidas"** para esa aplicación.
3. Abrí **PyFis IA**. Necesita **Google Chrome** instalado (viene en casi todos los Android).

Si la primera vez aparece una barra con la dirección arriba, es porque Android todavía no verificó el sitio: cerrá la app, esperá un minuto con internet y volvé a abrirla.

## Qué NO se sube a GitHub

Dentro de `apk/` solo se versionan `twa-manifest.json` y este README. **Nunca** subas:

- `android.keystore` → la llave de firma.
- `keystore-credentials.txt` → sus contraseñas.

Guardá esos dos archivos en un lugar seguro (por ejemplo, un pendrive y un Drive privado). **Sin ellos no se puede publicar una actualización del APK con el mismo paquete** (Play Store la rechazaría).

## Volver a generar el APK (solo si cambia el ícono, el nombre o la versión)

Los cambios de la app **no** requieren un APK nuevo: basta con desplegar en Vercel.
Si cambiás nombre, ícono o versión:

1. Actualizá `version` en `package.json` y `appVersionName` / `appVersionCode` (+1) en `apk/twa-manifest.json`.
2. En `apk/`: `npx @bubblewrap/cli update --skipVersionUpgrade --manifest ./twa-manifest.json`.
3. Compilá: con `JAVA_HOME` apuntando al JDK de Android Studio (`C:\Program Files\Android\Android Studio\jbr`) y `ANDROID_HOME` al SDK, ejecutá `gradlew.bat assembleRelease`.
4. Firmá `app/build/outputs/apk/release/app-release-unsigned.apk` con `zipalign` y `apksigner` (build-tools 36.1.0) usando `android.keystore` y el alias `pyfisia`.

## Publicar en Google Play (opcional)

Play Store pide un **AAB** en vez de APK: `gradlew.bat bundleRelease` y firmalo con la misma llave. Si Play genera su propia llave de firma ("Play App Signing"), agregá su huella SHA-256 también en `public/.well-known/assetlinks.json` y volvé a desplegar.
