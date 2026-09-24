import RuleTutorProvider from './RuleTutorProvider.js';
import LocalAIProvider from './LocalAIProvider.js';
import { buildQuizFeedback, findBestMatch } from './quizEngine.js';
import quizBank from './quizBank.json';

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

  /**
   * Ventana de Charla Libre: el estudiante pregunta con sus palabras.
   * - Sin red: banco de respuestas de soporte conceptual enriquecido
   *   (matcheo tolerante contra el banco de preguntas local).
   * - Con red: respuesta natural del modelo (con fallback automático al banco).
   */
  async answerFreeQuestion(context = {}) {
    const question = context.message ?? '';
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const match = findBestMatch(question, quizBank);
      if (match) {
        const { entry } = match;
        const body = entry.respuesta ?? entry.explicacion ?? '';
        const jopara = entry.respuestaJopara ?? entry.explicacionJopara ?? '';
        return {
          message: `${entry.pregunta ?? entry.enunciado ?? ''} ${body} ${jopara}`.trim(),
          source: 'RuleTutorProvider (Offline)',
          available: true,
        };
      }
      return {
        message:
          'Estoy en modo offline ahora: probá preguntarme sobre la trayectoria, pe gravedad, las flashcards o la Ley de Hooke.',
        source: 'RuleTutorProvider (Offline)',
        available: true,
      };
    }
    return this.localAI.respond({
      tipo: 'charla_libre',
      message: question,
      subtema: context.subtema,
    });
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
