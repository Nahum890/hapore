import RuleTutorProvider from './RuleTutorProvider.js';
import LocalAIProvider from './LocalAIProvider.js';

export const PROVIDER_KINDS = { RULES: 'rules', LOCAL: 'local', ORCHESTRATOR: 'orchestrator' };
class AIProvider {
  constructor(options = {}) {
    this.ruleTutor = new RuleTutorProvider(options);
    this.localAI = new LocalAIProvider({ ...options, fallback: this.ruleTutor });
  }
  respond(context = {}) {
    return this.localAI.respond(context);
  }
  explainError(context = {}) { return this.respond(context); }
  evaluateQuizAnswer(context = {}) {
    return this.respond({ ...context, tipo: 'evaluacion_cuestionario', subtema: context.tema ?? context.subtema, ejercicio: context.preguntaId ?? context.ejercicio });
  }
  answerFreeQuestion(context = {}) {
    return this.respond({ ...context, tipo: 'charla_libre' });
  }
}
export function createAIProvider(kind = PROVIDER_KINDS.ORCHESTRATOR, options = {}) {
  if (kind === PROVIDER_KINDS.LOCAL) return new LocalAIProvider(options);
  if (kind === PROVIDER_KINDS.RULES) return new RuleTutorProvider(options);
  return new AIProvider(options);
}
