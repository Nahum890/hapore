import RuleTutorProvider from './RuleTutorProvider.js';

/**
 * Conector de IA generativa vía endpoint /api/chat (proxy seguro en el
 * servidor; la API key vive solo del lado servidor, nunca en el bundle).
 *
 * Si la llamada falla, delega de forma segura en RuleTutorProvider
 * (tutor offline por reglas) sin romper la experiencia del estudiante.
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
  }

  async respond(context = {}) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: context.message ?? 'Ayuda con el ejercicio',
          context: {
            tipo: context.tipo ?? null,
            subtema: context.topic ?? context.subtema ?? context.expectedConcept ?? null,
            ejercicio: context.exerciseId ?? context.exercise?.id ?? null,
            respuestaAlumno:
              context.studentAnswer ?? context.respuestaAlumno ?? context.respuesta ?? null,
            respuestaCorrecta:
              context.expectedAnswer ?? context.respuestaCorrecta ?? null,
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
        message: text,
        source: this.id,
        available: true,
      };
    } catch (error) {
      console.warn('Conexión con IA online fallida. Usando RuleTutorProvider.', error);
      return this.fallback.respond(context);
    }
  }
}
