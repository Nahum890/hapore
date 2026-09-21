import tutorData from '../data/tutor_jopara.json';
import errorsData from '../data/errors.json';
import hintLevelsData from '../data/hint_levels.json';

/**
 * Tutor 100% offline basado en reglas.
 * Usa JSON local (saludos, pistas jopara, errores frecuentes, pistas
 * progresivas nivel 1-4) para responder sin conexión y sin ningún modelo de IA.
 *
 * Regla técnica: este módulo NO calcula trayectoria, alcance ni tiempo de
 * vuelo; recibe el diagnóstico cerrado del motor físico y solo interpreta.
 */
export default class RuleTutorProvider {
  constructor(options = {}) {
    this.id = 'rule-tutor';
    this.data = options.data ?? tutorData;
    this.errors = options.errors ?? errorsData;
    this.levels = options.levels ?? hintLevelsData;
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

  #levelResponse(context) {
    const clampedLevel = Math.min(Math.max(Number(context.hintLevel) || 1, 1), 4);
    const key = `nivel_${clampedLevel}`;
    const byErrorType = this.levels?.byErrorType ?? {};
    const byConcept = this.levels?.byConcept ?? {};

    if (context.errorType && byErrorType[context.errorType]) {
      return byErrorType[context.errorType][key] ?? byErrorType[context.errorType].nivel_1;
    }
    if (context.expectedConcept && byConcept[context.expectedConcept]) {
      return byConcept[context.expectedConcept][key] ?? byConcept[context.expectedConcept].nivel_1;
    }
    return null;
  }

  #mistakeResponse(context) {
    const levelText = this.#levelResponse(context);
    if (levelText) {
      return {
        message: levelText,
        source: this.id,
        available: true,
      };
    }
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
    const levelText = this.#levelResponse(context);
    if (levelText) {
      return {
        message: levelText,
        source: this.id,
        available: true,
      };
    }
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
