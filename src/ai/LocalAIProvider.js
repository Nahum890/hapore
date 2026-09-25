import { sanitizeMarkup } from '../utils/validation.js';
import RuleTutorProvider from './RuleTutorProvider.js';
import { evaluateQuizContext } from './quizEngine.js';

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_WAIT_MS = 3500;
const aborted = () => new DOMException('Tiempo de espera agotado', 'AbortError');
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const cancel = () => { clearTimeout(timer); reject(aborted()); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
export function buildChatPayload(context = {}) {
  return {
    message: context.message ?? 'Ayuda con el ejercicio',
    context: {
      ...context,
      message: context.message,
      tipo: context.tipo ?? null,
      subtema: context.topic ?? context.subtema ?? context.expectedConcept ?? null,
      ejercicio: context.exerciseId ?? context.exercise?.id ?? context.ejercicio ?? context.preguntaId ?? null,
      pregunta: context.pregunta ?? context.enunciado ?? context.exercise?.question ?? null,
      respuestaAlumno: context.studentAnswer ?? context.respuestaAlumno ?? context.respuesta ?? null,
      respuestaCorrecta: context.expectedAnswer ?? context.respuestaCorrecta ?? null,
      tipoError: context.errorType ?? context.tipoError ?? context.expectedConcept ?? null,
      nivelPista: context.hintLevel ?? context.nivelPista ?? 0,
    },
  };
}

/** All online attempts share one deadline. Optional local runtime is injected by
 * loadLocalModel({signal}) -> { respond(context, {signal, onToken}) }.
 * It is loaded once, only when explicitly configured; no model is downloaded by default.
 */
export default class LocalAIProvider {
  constructor(options = {}) {
    this.id = 'local-ai';
    this.options = options;
    this.fallback = options.fallback ?? new RuleTutorProvider(options);
    this.timeoutMs = Math.min(MAX_WAIT_MS, Math.max(1, Number(options.timeoutMs) || MAX_WAIT_MS));
    this.maxRetries = Math.min(2, Math.max(0, Math.floor(options.maxRetries ?? 2)));
    this.retryDelayMs = Math.max(1, options.retryDelayMs ?? 150);
    this.fetch = options.fetch ?? ((...args) => fetch(...args));
    this.model = null;
  }
  notify(callback, text) {
    if (typeof callback !== 'function') return;
    try { callback(sanitizeMarkup(text)); } catch { /* A UI callback cannot break fallback. */ }
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
      this.notify(onToken, text);
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
        const response = await this.fetch('/api/chat', {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
          body: JSON.stringify({ ...buildChatPayload(context), stream: true }),
        });
        if (!response.ok) {
          const error = new Error('Servicio de IA no disponible');
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
  async respond(context = {}) {
    const onToken = context.onToken ?? this.options.onToken;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (context.type === 'welcome' || context.type === 'section' || (offline && !this.options.loadLocalModel)) return this.fallback.respond(context);
    const controller = new AbortController();
    let timer;
    let active = true;
    const emit = text => { if (active && !controller.signal.aborted) this.notify(onToken, text); };
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(aborted()); }, this.timeoutMs);
    });
    try {
      const operation = this.options.loadLocalModel && (offline || this.options.preferLocal)
        ? this.local(context, controller.signal, emit) : this.online(context, controller.signal, emit);
      const text = await Promise.race([operation, deadline]);
      if (typeof text !== 'string' || !text.trim()) throw new Error('Respuesta vacía');
      return {
        message: sanitizeMarkup(text), source: this.options.loadLocalModel && (offline || this.options.preferLocal) ? 'local-model' : this.id, available: true,
        ...(context.tipo === 'evaluacion_cuestionario' ? evaluateQuizContext(context) : {}),
      };
    } catch {
      active = false;
      controller.abort();
      if (this.options.loadLocalModel) this.model = null;
      const result = await this.fallback.respond(context);
      this.notify(onToken, result.message);
      return result;
    } finally {
      active = false;
      clearTimeout(timer);
    }
  }
}
