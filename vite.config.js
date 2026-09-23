import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { SYSTEM_PROMPT, buildDiagnosticPrompt, buildQuizEvaluationPrompt } from './src/ai/prompt.js';
import { sanitizeMarkup } from './src/utils/validation.js';

// Modelo primario configurable por .env (GEMINI_MODEL). Si falla
// (deprecación o alta demanda), se conmuta automáticamente al alias
// estable "gemini-flash-latest", que apunta siempre al flash vigente.
const FALLBACK_MODEL = 'gemini-flash-latest';

// Endpoint /api/chat seguro: la API key vive solo del lado servidor
// (variable de entorno GEMINI_API_KEY, nunca en el bundle del cliente).
function apiChatPlugin(apiKey, primaryModel) {
  const models = [...new Set([primaryModel, FALLBACK_MODEL])];
  const TRANSIENT_STATUS = new Set([429, 503]);
  const RETRY_DELAY_MS = 1500;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function requestModel(model, prompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
      const error = new Error(`Servicio de IA online no disponible (${response.status})`);
      error.transient = TRANSIENT_STATUS.has(response.status);
      throw error;
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
    return sanitizeMarkup(text);
  }

  async function callGemini(prompt) {
    let lastError = new Error('Sin modelo de IA configurado');
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          return await requestModel(model, prompt);
        } catch (error) {
          lastError = error;
          console.warn(`Modelo ${model} falló (intento ${attempt + 1}).`, error.message);
          if (!error.transient) break;
          await wait(RETRY_DELAY_MS);
        }
      }
    }
    throw lastError;
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
        const isQuizEvaluation = body.context?.tipo === 'evaluacion_cuestionario';
        const prompt = isQuizEvaluation
          ? buildQuizEvaluationPrompt(body.context ?? {})
          : buildDiagnosticPrompt(body.context ?? {});
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
  const primaryModel = env.GEMINI_MODEL ?? 'gemini-3.6-flash';

  return {
    plugins: [
      react(),
      apiChatPlugin(apiKey, primaryModel),
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
