import tutorData from '../data/tutor_jopara.json' with { type: 'json' };
import errorsData from '../data/errors.json' with { type: 'json' };

/**
 * Tutor 100% offline basado en reglas.
 * Usa JSON local (saludos, pistas jopara, errores frecuentes) para responder
 * sin conexión y sin ningún modelo de IA.
 */
export default class RuleTutorProvider {
  constructor(options = {}) {
    this.id = 'rule-tutor';
    this.data = options.data ?? tutorData;
    this.errors = options.errors ?? errorsData;
  }

  async respond(context = {}) {
    const { type = 'hint' } = context;
    if (type === 'welcome') return this.#welcome();
    if (type === 'mistake') return this.#mistakeResponse(context);
    return this.#hintResponse(context);
  }

  #welcome() {
    const greeting = this.data.greetings?.[0] ?? '¡Mba\'éichapa!';
    return {
      message: greeting,
      source: this.id,
      available: true,
    };
  }

  #findError(context) {
    const { errorId, expectedConcept } = context;
    if (errorId) {
      return this.errors.find((error) => error.id === errorId) ?? null;
    }
    if (expectedConcept) {
      return this.errors.find((error) => error.expectedConcept === expectedConcept) ?? null;
    }
    return null;
  }

  #mistakeResponse(context) {
    const error = this.#findError(context);
    const entry = error
      ? this.data.errors?.find((item) => item.errorId === error.id)
      : null;
    if (!entry) {
      return {
        message: this.data.fallbackHint ?? 'Revisá el enunciado y probá paso a paso.',
        source: this.id,
        available: true,
      };
    }
    return {
      message: entry.joparaHint,
      esHint: entry.esHint,
      followUp: entry.followUp,
      source: this.id,
      available: true,
    };
  }

  #hintResponse(context) {
    const error = this.#findError(context);
    const entry = error
      ? this.data.errors?.find((item) => item.errorId === error.id)
      : null;
    return {
      message: entry?.joparaHint ?? this.data.fallbackHint ?? 'Vamos paso a paso: releé el enunciado.',
      esHint: entry?.esHint,
      followUp: entry?.followUp,
      source: this.id,
      available: true,
    };
  }
}
