import RuleTutorProvider from './RuleTutorProvider.js';
import LocalAIProvider from './LocalAIProvider.js';
import { buildQuizFeedback } from './quizEngine.js';

/**
 * Interfaz conceptual AIProvider.
 *
 * Todo provider debe implementar:
 *   respond(context) -> Promise<{
 *     message: string,        // texto para mostrar al estudiante
 *     esHint?: string,        // apoyo adicional en castellano
 *     followUp?: string,      // invitación a reintentar
 *     source: string,         // identificador del provider
 *     available: boolean,     // si el provider está operativo
 *   }>
 *   evaluateQuizAnswer(context) -> Promise<{
 *     message: string,        // corrección del cuestionario para el chat
 *     source: string,
 *     available: boolean,
 *   }>
 *
 * Los componentes NUNCA importan librerías de modelos directamente:
 * solo consumen esta fábrica. El modelo local se implementa dentro de
 * LocalAIProvider sin modificar el resto de la aplicación.
 *
 * Regla técnica: ningún provider calcula trayectoria, alcance ni tiempo de
 * vuelo, ni decide si una respuesta de física es correcta; eso lo hace el
 * motor de Física (physicsValidator) y entrega un diagnóstico cerrado a la IA.
 * En el cuestionario teórico la IA interpreta y redacta la corrección.
 */

export const PROVIDER_KINDS = {
  RULES: 'rules',
  LOCAL: 'local',
  ORCHESTRATOR: 'orchestrator',
};

/**
 * Orquestador central: decide en tiempo de ejecución qué proveedor utilizar
 * evaluando el estado de conexión del navegador (navigator.onLine).
 * - Sin red (modo avión): RuleTutorProvider responde al instante.
 * - Con red: LocalAIProvider (con fallback automático a reglas si falla).
 */
class AIProvider {
  constructor(options = {}) {
    this.id = 'ai-provider';
    this.ruleTutor = new RuleTutorProvider(options);
    this.localAI = new LocalAIProvider({ ...options, fallback: this.ruleTutor });
  }

  async respond(context = {}) {
    const { type = 'welcome' } = context;
    if (type === 'welcome') {
      return this.ruleTutor.respond(context);
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.ruleTutor.respond(context);
    }
    return this.localAI.respond(context);
  }

  async explainError(context = {}) {
    return this.respond(context);
  }

  /**
   * Corrección del cuestionario teórico (verdadero/falso con justificación
   * y preguntas abiertas interpretadas con tolerancia).
   * - Sin red: corrección por reglas con JSON local (aliento + respuesta en jopara).
   * - Con red: corrección natural del modelo (con fallback automático a reglas).
   */
  async evaluateQuizAnswer(context = {}) {
    const {
      esCorrecta = false,
      esCercana = false,
      esVerdadero,
      marcadoVerdadero,
      respuestaCorrecta = '',
      respuestaJopara = '',
      explicacion = '',
      explicacionJopara = '',
      coincidentes = [],
      justificacion = '',
    } = context;

    const quizContext = {
      tipo: 'evaluacion_cuestionario',
      subtema: context.tema,
      ejercicio: context.preguntaId,
      pregunta: context.pregunta ?? context.enunciado,
      respuestaAlumno: context.respuestaAlumno ?? context.message,
      respuestaCorrecta,
      explicacion,
      esCercana,
      coincidentes,
      esVerdadero,
      marcadoVerdadero,
      justificacion,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        message: buildQuizFeedback({
          esCorrecta,
          esCercana,
          esVerdadero,
          marcadoVerdadero,
          respuestaCorrecta,
          respuestaJopara,
          explicacion,
          explicacionJopara,
          coincidentes,
        }),
        source: 'RuleTutorProvider (Offline)',
        available: true,
      };
    }

    return this.localAI.respond(quizContext);
  }
}

export function createAIProvider(kind = PROVIDER_KINDS.ORCHESTRATOR, options = {}) {
  if (kind === PROVIDER_KINDS.LOCAL) {
    return new LocalAIProvider(options);
  }
  if (kind === PROVIDER_KINDS.RULES) {
    return new RuleTutorProvider(options);
  }
  return new AIProvider(options);
}
