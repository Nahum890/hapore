import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuizFeedback } from '../src/ai/quizEngine.js';
import { diagnoseAttempt } from '../src/pedagogy/diagnoseAttempt.js';
import LocalAIProvider from '../src/ai/LocalAIProvider.js';
import { planFlight } from '../src/simulator/flightPlan.js';
import { validateAnswer } from '../src/physics/physicsValidator.js';
import { removeKey, setActiveProfile, STORAGE_KEYS } from '../src/utils/storage.js';
import exercises from '../src/data/exercises.json' with { type: 'json' };

function useOnlineState(onLine, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine } });
  return Promise.resolve().then(run).finally(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  });
}

test('buildQuizFeedback cambia de idioma según el contexto', () => {
  const base = { esVerdadero: true, marcadoVerdadero: true, explicacion: 'La componente horizontal no cambia.' };
  const es = buildQuizFeedback({ ...base, language: 'es' });
  const jopara = buildQuizFeedback({ ...base, language: 'gn-jopara' });
  assert.match(es, /¡Bien!/);
  assert.match(jopara, /Iporã/);
  assert.notEqual(es, jopara);
});

test('diagnoseAttempt devuelve el diagnóstico en el idioma pedido', () => {
  const exercise = { values: { v0: 20, angle: 30, gravity: 9.8 }, expectedConcept: 'componente-horizontal', unit: 'm/s' };
  const es = diagnoseAttempt(exercise, '10', 'es');
  const jopara = diagnoseAttempt(exercise, '10', 'gn-jopara');
  assert.equal(es.key, 'confunde_componentes');
  assert.equal(jopara.key, 'confunde_componentes');
  assert.notEqual(es.message, jopara.message);
  assert.match(es.message, /seno/i);
});

test('el fallback offline conserva esHint y followUp del tutor por reglas', async () => {
  setActiveProfile('scope-fixes-offline-hint');
  removeKey(STORAGE_KEYS.TUTOR_USAGE);
  const exercise = exercises.find(item => item.id === 'ej-01');
  const provider = new LocalAIProvider({});
  await useOnlineState(false, async () => {
    const result = await provider.respond({
      exercise,
      exerciseId: exercise.id,
      expectedConcept: exercise.expectedConcept,
      errorType: 'confunde_componentes',
      hintLevel: 1,
      language: 'gn-jopara',
    });
    assert.equal(result.source, 'rules');
    assert.ok(result.message?.trim());
    // Antes de este fix, LocalAIProvider reconstruía la respuesta offline
    // solo con {message, source, available}, descartando esHint/followUp
    // que sí calcula RuleTutorProvider (ver src/data/tutor_jopara.json err-02).
    assert.match(result.esHint ?? '', /coseno/i);
    assert.ok(result.followUp?.trim());
  });
});

test('el minijuego predecí-y-lanzá usa el mismo motor físico y una tolerancia propia de estimación', () => {
  const flight = planFlight({ speed: 20, angle: 45, gravity: 9.8, targetX: 9999 });
  const close = validateAnswer(flight.landingX, flight.landingX * 1.05, { tolerance: 0.12, unit: 'm' });
  const far = validateAnswer(flight.landingX, flight.landingX * 1.5, { tolerance: 0.12, unit: 'm' });
  assert.equal(close.correct, true);
  assert.equal(far.correct, false);
});
