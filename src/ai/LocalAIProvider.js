import { buildTutorPrompt, SYSTEM_PROMPT } from './prompt.js';

/**
 * Implementación preparada para un modelo de IA local (por ejemplo,
 * Transformers.js u otro runtime que corra en el navegador).
 *
 * En este primer commit NO se descarga ni integra ningún modelo:
 * respond() devuelve un mensaje de módulo en desarrollo. La aplicación
 * completa funciona con RuleTutorProvider.
 *
 * Para conectar el modelo en el futuro:
 *  1. Cargar el runtime dentro de esta clase (no en los componentes).
 *  2. Usar buildTutorPrompt(context) + SYSTEM_PROMPT para armar el prompt.
 *  3. Mantener el contrato respond(context) de AIProvider.
 */
export default class LocalAIProvider {
  constructor(options = {}) {
    this.id = 'local-ai';
    this.options = options;
  }

  async respond(context = {}) {
    const prompt = buildTutorPrompt(context);
    return {
      message: 'El tutor con modelo local todavía no está conectado. Sigo funcionando por reglas.',
      promptPreview: { system: SYSTEM_PROMPT, user: prompt },
      source: this.id,
      available: false,
    };
  }
}
