import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { SYSTEM_PROMPT, buildDiagnosticPrompt } from './src/ai/prompt.js';

// gemini-2.5-flash está deprecado para usuarios nuevos: se usa el alias
// estable "gemini-flash-latest", que apunta siempre al modelo flash vigente.
const GEMINI_MODEL = 'gemini-flash-latest';

// Endpoint /api/chat seguro: la API key vive solo del lado servidor
// (variable de entorno GEMINI_API_KEY, nunca en el bundle del cliente).
function apiChatPlugin(apiKey) {
  async function callGemini(prompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Servicio de IA online no disponible (${response.status})`);
    }
    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join(' ') ?? '';
    if (!text) {
      throw new Error('Respuesta de IA vacía');
    }
    return text;
  }

  function handler(req, res) {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', async () => {
      let body = {};
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        body = {};
      }
      if (!apiKey) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GEMINI_API_KEY no configurada' }));
        return;
      }
      try {
        const prompt = buildDiagnosticPrompt(body.context ?? {});
        const text = await callGemini(prompt);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ text }));
      } catch (error) {
        console.warn('Fallo la consulta al tutor IA online:', error.message);
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Servicio de IA online no disponible' }));
      }
    });
  }

  return {
    name: 'guarania-api-chat',
    configureServer(server) {
      server.middlewares.use('/api/chat', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY ?? '';

  return {
    plugins: [
      react(),
      apiChatPlugin(apiKey),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'manifest.webmanifest'],
        // El manifest se mantiene como archivo estático en public/manifest.webmanifest.
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json}'],
          navigateFallback: '/index.html',
        },
      }),
    ],
  };
});
