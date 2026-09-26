import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { SYSTEM_PROMPT, buildDiagnosticPrompt, buildQuizEvaluationPrompt, buildFreeChatPrompt } from './src/ai/prompt.js';
import { sanitizeMarkup } from './src/utils/validation.js';

// Modelo primario configurable por .env (GEMINI_MODEL). Si falla
// (deprecación o alta demanda), se conmuta automáticamente al alias
// estable "gemini-flash-latest", que apunta siempre al flash vigente.
const FALLBACK_MODEL = 'gemini-flash-latest';

// Endpoint /api/chat seguro: la API key vive solo del lado servidor
// (variable de entorno GEMINI_API_KEY, nunca en el bundle del cliente).
export function apiChatPlugin(apiKey, primaryModel, options = {}) {
  const fetchModel = options.fetch ?? fetch;
  const models = [...new Set([primaryModel, FALLBACK_MODEL])];
  const timeoutMs = options.timeoutMs ?? 45000;
  const textFrom = data => data?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text).filter(Boolean).join('') ?? '';
  async function handler(req, res) {
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }); res.end(); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    req.on('aborted', cancel);
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    try {
      let raw = '', bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16384) { json(413, { error: 'Consulta demasiado extensa' }); return; }
        raw += chunk;
      }
      let body;
      try { body = JSON.parse(raw); } catch { json(400, { error: 'Consulta inválida' }); return; }
      if (!body || typeof body !== 'object' || !body.context || typeof body.context !== 'object' || Array.isArray(body.context)) { json(400, { error: 'Falta el contexto de la consulta' }); return; }
      if (!apiKey) { json(503, { error: 'Tutor online sin configurar' }); return; }
      const context = { ...body.context, message: body.context.message ?? body.message };
      const buildPrompt = context.tipo === 'evaluacion_cuestionario' ? buildQuizEvaluationPrompt : context.tipo === 'charla_libre' ? buildFreeChatPrompt : buildDiagnosticPrompt;
      const streaming = body.stream === true;
      const requestBody = JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: buildPrompt(context) }] }], generationConfig: { maxOutputTokens: 4096 } });
      let response;
      for (const model of models) {
        response = await fetchModel('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + (streaming ? ':streamGenerateContent?alt=sse' : ':generateContent'), {
          method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: requestBody,
        });
        if (response.ok || response.status !== 404) break;
        await response.body?.cancel();
      }
      if (!response?.ok) { json(response?.status === 429 ? 429 : 502, { error: 'Servicio de IA no disponible' }); return; }
      if (!streaming) {
        const text = sanitizeMarkup(textFrom(await response.json()));
        if (!text) throw new Error('Respuesta vacía');
        json(200, { text }); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      let buffer = '', fullText = '';
      const decoder = new TextDecoder();
      const consume = line => {
        if (!line.startsWith('data:')) return;
        const rawData = line.slice(5).trim();
        if (!rawData || rawData === '[DONE]') return;
        const data = JSON.parse(rawData);
        if (data.error) throw new Error('Respuesta interrumpida');
        const delta = textFrom(data);
        if (!delta) return;
        fullText += delta;
        res.write('data: ' + JSON.stringify({ text: sanitizeMarkup(fullText) }) + '\n\n');
      };
      for await (const chunk of response.body) {
        if (controller.signal.aborted) throw new Error('Consulta cancelada');
        buffer += decoder.decode(chunk, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) { consume(buffer.slice(0, newline).trimEnd()); buffer = buffer.slice(newline + 1); }
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer.trimEnd());
      if (!fullText.trim()) throw new Error('Respuesta vacía');
      res.end('data: [DONE]\n\n');
    } catch {
      if (!res.destroyed && !res.writableEnded) {
        if (res.headersSent) res.end('data: ' + JSON.stringify({ error: 'La respuesta se interrumpió' }) + '\n\n');
        else json(502, { error: 'Servicio de IA no disponible' });
      }
    } finally {
      clearTimeout(timer); controller.abort();
      res.off('close', cancel); req.off('aborted', cancel);
    }
  }
  return { name: 'guarania-api-chat', configureServer(server) { server.middlewares.use('/api/chat', handler); }, configurePreviewServer(server) { server.middlewares.use('/api/chat', handler); } };
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
          // Incluye ttf/woff2: sin esto, la fuente NotoSans del PDF (y
          // cualquier otro recurso de fuente) no quedaba precacheada, y la
          // ficha PDF podía fallar la primera vez que se generaba sin conexión.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,ttf,woff,woff2}'],
          navigateFallback: '/index.html',
        },
      }),
    ],
  };
});
