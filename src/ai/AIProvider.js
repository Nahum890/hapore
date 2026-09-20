import RuleTutorProvider from './RuleTutorProvider.js';
import LocalAIProvider from './LocalAIProvider.js';

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
 *
 * Los componentes NUNCA importan librerías de modelos directamente:
 * solo consumen esta fábrica. Para conectar un modelo local en el futuro
 * (por ejemplo, Transformers.js), se implementa dentro de LocalAIProvider
 * sin modificar el resto de la aplicación.
 */

export const PROVIDER_KINDS = {
  RULES: 'rules',
  LOCAL: 'local',
};

export function createAIProvider(kind = PROVIDER_KINDS.RULES, options = {}) {
  if (kind === PROVIDER_KINDS.LOCAL) {
    return new LocalAIProvider(options);
  }
  return new RuleTutorProvider(options);
}
