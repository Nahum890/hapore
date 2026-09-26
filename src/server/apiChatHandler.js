import { SYSTEM_PROMPT, buildDiagnosticPrompt, buildFreeChatPrompt, buildQuizEvaluationPrompt } from '../ai/prompt.js';
import { sanitizeMarkup } from '../utils/validation.js';

const DAILY_LIMIT = 15;
const BURST_LIMIT = 5;
const MAX_BODY_BYTES = 12000;
const SERVER_TIMEOUT_MS = 18000;
const FALLBACK_MODEL = 'gemini-flash-latest';

function localDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

const safeText = (value, limit) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, limit);

function normalizeContext(raw = {}) {
  const allowedType = raw.tipo === 'charla_libre' || raw.tipo === 'evaluacion_cuestionario' ? raw.tipo : null;
  const history = Array.isArray(raw.history) ? raw.history.slice(-4).map(item => ({
    role: item?.role === 'tutor' || item?.role === 'assistant' ? 'tutor' : 'estudiante',
    text: safeText(item?.text, 400),
  })).filter(item => item.text) : [];
  const exercise = raw.exercise && typeof raw.exercise === 'object' ? {
    question: safeText(raw.exercise.question, 700),
    difficulty: safeText(raw.exercise.difficulty, 40),
    expectedConcept: safeText(raw.exercise.expectedConcept, 100),
    values: Object.fromEntries(['v0', 'angle', 'gravity', 'x0', 'y0', 'targetX', 'targetY']
      .filter(key => raw.exercise.values?.[key] !== null && raw.exercise.values?.[key] !== '' && Number.isFinite(Number(raw.exercise.values?.[key])))
      .map(key => [key, Number(raw.exercise.values[key])])),
  } : undefined;
  return {
    message: safeText(raw.message, 1600),
    language: raw.language === 'es' ? 'es' : 'gn-jopara',
    tipo: allowedType,
    subtema: safeText(raw.subtema, 120),
    ejercicio: safeText(raw.ejercicio, 700),
    pregunta: safeText(raw.pregunta, 700),
    respuestaAlumno: safeText(raw.respuestaAlumno, 500),
    respuestaCorrecta: safeText(raw.respuestaCorrecta, 500),
    tipoError: safeText(raw.tipoError, 120),
    nivelPista: Math.min(4, Math.max(0, Math.floor(Number(raw.nivelPista) || 0))),
    history,
    ...(exercise ? { exercise } : {}),
  };
}

function requestAddress(req) {
  const real = req.headers?.['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim().slice(0, 80);
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',').at(-1).trim().slice(0, 80);
  return req.socket?.remoteAddress ?? 'unknown';
}

function createInstanceQuota() {
  const usage = new Map();
  return function consume(address, now = Date.now()) {
    const day = localDay(new Date(now));
    const current = usage.get(address);
    const minute = Math.floor(now / 60000);
    const next = !current || current.day !== day
      ? { day, count: 0, minute, burst: 0 }
      : current.minute === minute ? current : { ...current, minute, burst: 0 };
    if (next.count >= DAILY_LIMIT || next.burst >= BURST_LIMIT) return false;
    next.count += 1;
    next.burst += 1;
    usage.set(address, next);
    if (usage.size > 5000) {
      for (const [key, value] of usage) if (value.day !== day) usage.delete(key);
    }
    return true;
  };
}

function getBearer(req) {
  const value = req.headers?.authorization;
  return typeof value === 'string' && /^Bearer\s+\S+$/i.test(value) ? value.replace(/^Bearer\s+/i, '') : '';
}

async function consumeSupabaseQuota(req, options, fetchImpl, signal) {
  const token = getBearer(req);
  if (!token) return { status: 401, body: { error: 'Se necesita una sesión de usuario válida para el tutor online.' } };
  const headers = { apikey: options.supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const authResponse = await fetchImpl(`${options.supabaseUrl}/auth/v1/user`, { headers, signal });
  if (!authResponse.ok) return { status: 401, body: { error: 'La sesión de usuario venció. Volvé a conectarte para usar Gemini.' } };
  const authUser = await authResponse.json();
  if (!authUser?.id) return { status: 401, body: { error: 'No se pudo verificar la sesión del tutor.' } };
  const response = await fetchImpl(`${options.supabaseUrl}/rest/v1/rpc/consume_tutor_query`, {
    method: 'POST', headers, body: JSON.stringify({ p_usage_date: localDay() }), signal,
  });
  if (!response.ok) return { status: 503, body: { error: 'Falta aplicar la migración de cuota diaria del tutor en Supabase.' } };
  const rows = await response.json();
  const quota = Array.isArray(rows) ? rows[0] : rows;
  if (!quota || quota.allowed !== true) return { status: 429, body: { error: 'Alcanzaste las 15 consultas diarias del tutor.' } };
  return null;
}

export function createApiChatHandler(apiKey, primaryModel, options = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const quotaUrl = String(options.supabaseUrl ?? '').replace(/\/+$/, '');
  const quotaKey = options.supabaseAnonKey ?? '';
  const fallbackQuota = options.consumeQuota ?? createInstanceQuota();
  const models = [...new Set([primaryModel || 'gemini-3.6-flash', FALLBACK_MODEL])];
  const textFrom = data => data?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text).filter(Boolean).join('') ?? '';

  return async function handle(req, res) {
    const json = (status, value, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
      res.end(JSON.stringify(value));
    };
    if (req.method !== 'POST') { json(405, { error: 'Método no permitido.' }, { Allow: 'POST' }); return; }
    if (!apiKey) { json(503, { error: 'Tutor online sin configurar.' }); return; }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SERVER_TIMEOUT_MS);
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    req.on('aborted', cancel);
    try {
      let body;
      if (req.body && typeof req.body === 'object') {
        const raw = JSON.stringify(req.body);
        if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) { json(413, { error: 'Consulta demasiado extensa.' }); return; }
        body = req.body;
      } else {
        let raw = '', bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > MAX_BODY_BYTES) { json(413, { error: 'Consulta demasiado extensa.' }); return; }
          raw += chunk;
        }
        try { body = JSON.parse(raw); } catch { json(400, { error: 'La consulta no tiene un formato válido.' }); return; }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body) || !body.context || typeof body.context !== 'object' || Array.isArray(body.context)) {
        json(400, { error: 'Falta el contexto de la consulta.' }); return;
      }
      const context = normalizeContext({ ...body.context, message: body.context.message ?? body.message });
      if (!context.message) { json(400, { error: 'Escribí una pregunta antes de enviar.' }); return; }
      let quotaError;
      if (quotaUrl && quotaKey) {
        quotaError = await consumeSupabaseQuota(req, { supabaseUrl: quotaUrl, supabaseAnonKey: quotaKey }, fetchImpl, controller.signal);
      } else if (!fallbackQuota(requestAddress(req))) {
        quotaError = { status: 429, body: { error: 'Se alcanzó el límite de consultas de este dispositivo o red.' } };
      }
      if (quotaError) { json(quotaError.status, quotaError.body); return; }

      const buildPrompt = context.tipo === 'evaluacion_cuestionario'
        ? buildQuizEvaluationPrompt
        : context.tipo === 'charla_libre' ? buildFreeChatPrompt : buildDiagnosticPrompt;
      const requestBody = JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(context) }] }],
        generationConfig: { maxOutputTokens: 4096 },
      });
      const streaming = body.stream === true;
      let response;
      for (const model of models) {
        response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + (streaming ? ':streamGenerateContent?alt=sse' : ':generateContent'), {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: requestBody,
        });
        if (response.ok || response.status !== 404) break;
        await response.body?.cancel();
      }
      if (!response?.ok) { json(response?.status === 429 ? 429 : 502, { error: 'El servicio de IA no está disponible ahora.' }); return; }
      if (!streaming) {
        const text = sanitizeMarkup(textFrom(await response.json()));
        if (!text) { json(502, { error: 'Gemini devolvió una respuesta vacía.' }); return; }
        json(200, { text }); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      res.flushHeaders?.();
      let buffer = '', fullText = '';
      const decoder = new TextDecoder();
      const consume = line => {
        if (!line.startsWith('data:')) return;
        const dataText = line.slice(5).trim();
        if (!dataText || dataText === '[DONE]') return;
        const data = JSON.parse(dataText);
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
        if (res.headersSent) res.end('data: ' + JSON.stringify({ error: 'La respuesta se interrumpió.' }) + '\n\n');
        else json(502, { error: 'No se pudo completar la consulta a Gemini.' });
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      res.off('close', cancel);
      req.off('aborted', cancel);
    }
  };
}
