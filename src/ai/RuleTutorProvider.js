import tutorData from '../data/tutor_jopara.json' with { type: 'json' };
import errorsData from '../data/errors.json' with { type: 'json' };

export const HINT_LEVELS_MAX = 5;

/**
 * Helper: selecciona aleatoriamente una variante sintáctica de la lista de
 * pistas del nivel para evitar respuestas repetitivas en modo offline.
 * Acepta arrays de variantes o textos simples (retrocompatibilidad).
 */
export function obtenerVariantePista(variants) {
  if (Array.isArray(variants) && variants.length > 0) {
    return variants[Math.floor(Math.random() * variants.length)];
  }
  return variants ?? null;
}

/**
 * Tutor 100% offline basado en reglas.
 * Usa JSON local (saludos, pistas jopara, errores frecuentes, pistas
 * progresivas nivel 1-5) para responder sin conexión y sin ningún modelo de IA.
 *
 * Regla técnica: este módulo NO calcula trayectoria, alcance ni tiempo de
 * vuelo; recibe el diagnóstico cerrado del motor físico y solo interpreta.
 */
export default class RuleTutorProvider {
  constructor(options = {}) {
    this.id = 'rule-tutor';
    this.data = options.data ?? tutorData;
    this.errors = options.errors ?? errorsData;
    this.levels = options.levels ?? tutorData.hintLevels;
  }

  async respond(context = {}) {
    const { type = 'hint' } = context;
    if (type === 'welcome') return this.#welcome();
    if (type === 'section') return this.#sectionGreeting(context);
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

  #sectionGreeting(context) {
    const greetings = this.data.sectionGreetings ?? {};
    const greeting =
      greetings[context.section] ??
      this.data.greetings?.[0] ??
      '¡Mba\'éichapa!';
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
    const clampedLevel = Math.min(Math.max(Number(context.hintLevel) || 1, 1), HINT_LEVELS_MAX);
    const key = `nivel_${clampedLevel}`;
    const byErrorType = this.levels?.byErrorType ?? {};
    const byConcept = this.levels?.byConcept ?? {};

    if (context.errorType && byErrorType[context.errorType]) {
      return obtenerVariantePista(
        byErrorType[context.errorType][key] ?? byErrorType[context.errorType].nivel_1,
      );
    }
    if (context.expectedConcept && byConcept[context.expectedConcept]) {
      return obtenerVariantePista(
        byConcept[context.expectedConcept][key] ?? byConcept[context.expectedConcept].nivel_1,
      );
    }
    return null;
  }

  #mistakeResponse(context) {
    const levelText = this.#levelResponse(context);
    if (levelText) {
      return {
        message: levelText,
        esHint: this.data.errors?.find((item) => item.errorId === this.#findError(context)?.id)?.esHint,
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
        esHint: this.data.errors?.find((item) => item.errorId === this.#findError(context)?.id)?.esHint,
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
