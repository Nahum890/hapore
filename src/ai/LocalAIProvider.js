import { sanitizeMarkup } from '../utils/validation.js';
import RuleTutorProvider from './RuleTutorProvider.js';
import { evaluateQuizContext } from './quizEngine.js';
import { getTutorQuota, recordTutorQuery, tutorQuotaMessage } from './tutorQuota.js';
import { hasOnlineConsent, getOnlineConsent } from './onlineConsent.js';
import { getCloudSession, isCloudConfigured } from '../cloud/cloudClient.js';

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_WAIT_MS = 15000;
const aborted = () => new DOMException('Tiempo de espera agotado', 'AbortError');
const safeText = (value, limit) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, limit);
const numberFields = ['v0', 'angle', 'gravity', 'x0', 'y0', 'targetX', 'targetY'];
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const cancel = () => { clearTimeout(timer); reject(aborted()); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
export function buildChatPayload(context = {}) {
  const message = safeText(context.message ?? 'Ayuda con el ejercicio', 1600);
  const history = Array.isArray(context.history) ? context.history.slice(-4).map(item => ({
    role: item?.role === 'tutor' || item?.role === 'assistant' ? 'tutor' : 'alumno',
    text: safeText(item?.text, 400),
  })).filter(item => item.text) : [];
  const sourceExercise = context.exercise;
  const values = Object.fromEntries(numberFields
    .filter(key => sourceExercise?.values?.[key] !== null && sourceExercise?.values?.[key] !== '' && Number.isFinite(Number(sourceExercise?.values?.[key])))
    .map(key => [key, Number(sourceExercise.values[key])]));
  const exercise = sourceExercise && typeof sourceExercise === 'object' ? {
    id: safeText(sourceExercise.id, 80),
    question: safeText(sourceExercise.question, 700),
    difficulty: safeText(sourceExercise.difficulty, 40),
    expectedConcept: safeText(sourceExercise.expectedConcept, 100),
    ...(Object.keys(values).length ? { values } : {}),
  } : undefined;
  return {
    message,
    context: {
      message,
      language: context.language === 'es' ? 'es' : 'gn-jopara',
      type: safeText(context.type, 40),
      tipo: ['charla_libre', 'evaluacion_cuestionario'].includes(context.tipo) ? context.tipo : null,
      subtema: safeText(context.topic ?? context.subtema ?? context.expectedConcept, 120),
      ejercicio: safeText(context.exerciseId ?? context.exercise?.id ?? context.ejercicio ?? context.pregunta ?? context.enunciado ?? exercise?.question ?? context.preguntaId, 700),
      pregunta: safeText(context.pregunta ?? context.enunciado ?? exercise?.question, 700),
      ...(exercise ? { exercise } : {}),
      respuestaAlumno: safeText(context.studentAnswer ?? context.respuestaAlumno ?? context.respuesta, 500),
      respuestaCorrecta: safeText(context.expectedAnswer ?? context.respuestaCorrecta, 500),
      tipoError: safeText(context.errorType ?? context.tipoError ?? context.expectedConcept, 120),
      nivelPista: Math.min(4, Math.max(0, Math.floor(Number(context.hintLevel ?? context.nivelPista) || 0))),
      history,
    },
  };
}

/** All online attempts share one deadline. Optional local runtime is injected by
 * loadLocalModel({signal}) -> { respond(context, {signal, onToken}) }.
 * It is loaded once, only when explicitly configured; no model is downloaded by default.
 */
export default class LocalAIProvider {
  constructor(options = {}) {
    this.id = 'gemini';
    this.options = options;
    this.fallback = options.fallback ?? new RuleTutorProvider(options);
    this.timeoutMs = Math.min(MAX_WAIT_MS, Math.max(1, Number(options.timeoutMs) || 12000));
    // Every server attempt consumes quota, so production falls back locally
    // instead of resending a billable query by default.
    this.maxRetries = Math.min(1, Math.max(0, Math.floor(options.maxRetries ?? 0)));
    this.retryDelayMs = Math.max(1, options.retryDelayMs ?? 150);
    this.fetch = options.fetch ?? ((...args) => fetch(...args));
    this.model = null;
  }
  notify(callback, text, source = this.id) {
    if (typeof callback !== 'function') return;
    try { callback(sanitizeMarkup(text), source); } catch { /* A UI callback cannot break fallback. */ }
  }
  async readResponse(response, signal, onToken) {
    const mime = response.headers?.get?.('content-type') ?? '';
    if (!mime.includes('text/event-stream') && !mime.includes('application/x-ndjson')) {
      const data = await response.json();
      return data.text || data.reply || '';
    }
    if (!response.body) throw new Error('Respuesta de streaming vacía');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', text = '', finished = false;
    const consume = line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':') || /^(event|id|retry):/.test(trimmed)) return;
      const raw = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      if (raw === '[DONE]') { finished = true; return; }
      const data = JSON.parse(raw);
      if (data.error) throw new Error('El servicio interrumpió la respuesta');
      const delta = data.delta ?? data.token ?? '';
      text = typeof data.text === 'string' ? data.text : text + delta;
      this.notify(onToken, text, this.id);
    };
    const cancel = () => { reader.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      while (!finished) {
        if (signal.aborted) throw aborted();
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1);
          if (finished) break;
        }
        if (done) { if (buffer.trim() && !finished) consume(buffer); break; }
      }
      return text;
    } finally {
      signal.removeEventListener('abort', cancel);
      reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  async online(context, signal, onToken) {
    for (let attempt = 0; ; attempt += 1) {
      if (signal.aborted) throw aborted();
      try {
        const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' };
        if (isCloudConfigured()) {
          const session = await getCloudSession();
          if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
        }
        const response = await this.fetch('/api/chat', {
          method: 'POST', signal,
          headers,
          body: JSON.stringify({ ...buildChatPayload(context), stream: true }),
        });
        if (!response.ok) {
          const error = new Error('Servicio de IA no disponible');
          error.status = response.status;
          error.retryable = RETRY_STATUS.has(response.status);
          throw error;
        }
        const text = await this.readResponse(response, signal, onToken);
        if (!text.trim()) throw new Error('Respuesta de IA vacía');
        return text;
      } catch (error) {
        if (signal.aborted || attempt >= this.maxRetries || !(error.retryable || error instanceof TypeError)) throw error;
        await wait(this.retryDelayMs * 2 ** attempt, signal);
      }
    }
  }
  async local(context, signal, onToken) {
    if (!this.model) {
      this.model = Promise.resolve().then(() => this.options.loadLocalModel({ signal }));
      this.model.catch(() => { this.model = null; });
    }
    const model = await this.model;
    if (signal.aborted) throw aborted();
    const result = await model.respond(context, { signal, onToken });
    return typeof result === 'string' ? result : result?.message;
  }
  /** Intenta el tutor local (modelo en el dispositivo si está configurado,
   * si no el tutor por reglas). Se usa tanto cuando el dispositivo está
   * realmente sin conexión como cuando el intento online falló por
   * cualquier motivo (sin servidor, sin credencial, error del servicio):
   * en ambos casos el alumno debe seguir teniendo un tutor que responde,
   * no un mensaje de error sin salida. */
  async respondLocally(context, onToken, fallbackReason = 'offline') {
    const localResult = this.options.loadLocalModel
      ? await this.local(context, new AbortController().signal, onToken)
      : await this.fallback.respond(context);
    const text = typeof localResult === 'string' ? localResult : localResult?.message;
    if (typeof text !== 'string' || !text.trim()) throw new Error('Respuesta local vacía');
    const nextQuota = recordTutorQuery();
    const extras = typeof localResult === 'object' && localResult
      ? { esHint: localResult.esHint, followUp: localResult.followUp, knowledgeType: localResult.knowledgeType }
      : {};
    const result = {
      ...extras,
      message: sanitizeMarkup(text),
      source: this.options.loadLocalModel ? 'local-model' : 'rules',
      available: true,
      reason: fallbackReason,
      ...nextQuota,
      ...(context.tipo === 'evaluacion_cuestionario' ? evaluateQuizContext(context) : {}),
    };
    this.notify(onToken, result.message, result.source);
    return result;
  }
  async respond(context = {}) {
    const onToken = context.onToken ?? this.options.onToken;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (context.type === 'welcome' || context.type === 'section') return this.fallback.respond(context);
    const quota = getTutorQuota();
    if (quota.remaining <= 0) {
      return { message: tutorQuotaMessage(), source: null, available: false, reason: 'daily-limit', ...quota };
    }
    if (offline) {
      try {
        return await this.respondLocally(context, onToken, 'offline');
      } catch {
        return {
          message: 'No pude preparar una respuesta sin conexión. Revisá el contenido guardado o volvé a intentarlo.',
          source: null,
          available: false,
          reason: 'offline-unavailable',
          ...getTutorQuota(),
        };
      }
    }
    if (!hasOnlineConsent()) {
      return this.respondLocally(context, onToken, getOnlineConsent() === 'local' ? 'local-only' : 'consent-required');
    }
    const controller = new AbortController();
    let timer;
    let active = true;
    const emit = text => { if (active && !controller.signal.aborted) this.notify(onToken, text, this.id); };
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(aborted()); }, this.timeoutMs);
    });
    try {
      const text = await Promise.race([this.online(context, controller.signal, emit), deadline]);
      if (typeof text !== 'string' || !text.trim()) throw new Error('Respuesta vacía');
      const nextQuota = recordTutorQuery();
      return {
        message: sanitizeMarkup(text),
        source: this.id,
        available: true,
        ...nextQuota,
        ...(context.tipo === 'evaluacion_cuestionario' ? evaluateQuizContext(context) : {}),
      };
    } catch (error) {
      active = false;
      controller.abort();
      if (this.options.loadLocalModel) this.model = null;
      try {
        return await this.respondLocally(context, onToken, error?.status === 429 ? 'rate-limited' : error?.name === 'AbortError' ? 'timeout' : 'online-fallback');
      } catch {
        // El tutor local tampoco pudo responder (sin material offline para
        // esta consulta): recién ahí se muestra el motivo del fallo online.
      }
      const message = error?.name === 'AbortError'
        ? 'Gemini está tardando más de lo esperado. Probá de nuevo en un momento.'
        : error?.status === 404
          ? 'La app no encuentra el endpoint /api/chat. Este servicio debe publicarse junto con la app para usar Gemini.'
          : error?.status === 401 || error?.status === 403
            ? 'Gemini rechazó la credencial configurada en el servidor. Revisá la configuración del servidor y volvé a intentarlo.'
            : error?.status === 429
              ? 'Gemini alcanzó su límite temporal de consultas. Esperá un momento y volvé a intentar.'
              : error?.status === 503
                ? 'El endpoint online no tiene una credencial configurada en el servidor. Revisá la variable del entorno y reiniciá el servicio.'
                : 'No pude conectar con Gemini. Revisá la conexión y volvé a intentarlo; el tutor local se usa cuando el dispositivo está sin conexión.';
      const unavailable = { message, source: null, available: false, reason: 'online-unavailable', ...getTutorQuota() };
      this.notify(onToken, message);
      return unavailable;
    } finally {
      active = false;
      clearTimeout(timer);
    }
  }
}
