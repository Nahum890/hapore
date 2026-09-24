import { sanitizeMarkup } from '../utils/validation.js';
import RuleTutorProvider from './RuleTutorProvider.js';

/**
 * Conector de IA generativa vía endpoint /api/chat (proxy seguro en el
 * servidor; la API key vive solo del lado servidor, nunca en el bundle).
 *
 * Timeout estricto de 3,5 segundos con AbortController: si la red móvil es
 * inestable y la promesa no se resuelve, se aborta y se deriva de inmediato
 * en RuleTutorProvider (tutor offline por reglas) sin romper la experiencia.
 *
 * Para un modelo local futuro (por ejemplo, Transformers.js):
 *  1. Cargar el runtime dentro de esta clase (no en los componentes).
 *  2. Usar buildTutorPrompt(context) + SYSTEM_PROMPT para armar el prompt.
 *  3. Mantener el contrato respond(context) de AIProvider.
 */
export default class LocalAIProvider {
  constructor(options = {}) {
    this.id = 'local-ai';
    this.options = options;
    this.fallback = options.fallback ?? new RuleTutorProvider();
    this.timeoutMs = options.timeoutMs ?? 3500;
  }

  async respond(context = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: context.message ?? 'Ayuda con el ejercicio',
          context: {
            tipo: context.tipo ?? null,
            subtema: context.topic ?? context.subtema ?? context.expectedConcept ?? null,
            ejercicio: context.exerciseId ?? context.exercise?.id ?? null,
            respuestaAlumno:
              context.studentAnswer ?? context.respuestaAlumno ?? context.respuesta ?? null,
            respuestaCorrecta: context.expectedAnswer ?? context.respuestaCorrecta ?? null,
            explicacion: context.explicacion ?? null,
            esCercana: context.esCercana ?? null,
            coincidentes: context.coincidentes ?? null,
            esVerdadero: context.esVerdadero ?? null,
            marcadoVerdadero: context.marcadoVerdadero ?? null,
            justificacion: context.justificacion ?? null,
            tipoError: context.errorType ?? context.tipoError ?? context.expectedConcept ?? null,
            nivelPista: context.hintLevel ?? 0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Servicio de API online no disponible');
      }

      const data = await response.json();
      const text = data.text || data.reply;
      if (!text) {
        throw new Error('Respuesta de IA vacía');
      }

      return {
        message: sanitizeMarkup(text),
        source: this.id,
        available: true,
      };
    } catch (error) {
      console.warn('Conexión con IA online fallida. Usando RuleTutorProvider.', error);
      return this.fallback.respond(context);
    } finally {
      clearTimeout(timeout);
    }
  }
}
