import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonDifficulties, practiceRecommendation, weakestPattern } from '../src/pedagogy/progression.js';
import { buildDiagnosticPrompt, buildPhotoExercisePrompt } from '../src/ai/prompt.js';
import RuleTutorProvider from '../src/ai/RuleTutorProvider.js';
import { normalizeChatImage } from '../src/ai/LocalAIProvider.js';
import exercises from '../src/data/exercises.json' with { type: 'json' };

const dron01 = exercises.find(item => item.id === 'ej-01'); // componente-horizontal

test('weakestPattern ignora un tropiezo aislado y detecta el error repetido', () => {
  const log = [
    { exerciseId: 'ej-01', correct: false, errorType: 'confunde_componentes' },
    { exerciseId: 'ej-02', correct: true, errorType: null },
  ];
  assert.equal(weakestPattern(log), null, 'una sola vez no alcanza');
  log.push({ exerciseId: 'ej-01', correct: false, errorType: 'confunde_componentes' });
  const pattern = weakestPattern(log);
  assert.equal(pattern.errorType, 'confunde_componentes');
  assert.equal(pattern.count, 2);
  assert.match(pattern.label, /seno y coseno/i);
});

test('practiceRecommendation sugiere un ejercicio del concepto afectado, no el último intentado', () => {
  const log = [
    { exerciseId: 'ej-01', correct: false, errorType: 'confunde_componentes' },
    { exerciseId: 'ej-01', correct: false, errorType: 'confunde_componentes' },
  ];
  const recommendation = practiceRecommendation(exercises, log);
  assert.ok(recommendation);
  assert.ok(['componente-horizontal', 'componente-vertical'].includes(recommendation.exercise.expectedConcept));
  assert.notEqual(recommendation.exercise.id, 'ej-01');
  assert.match(recommendation.reason, /Practicá esto/);
});

test('commonDifficulties combina los errores de varios alumnos sin identificar a quién le pasó', () => {
  const anaLog = [{ errorType: 'olvida_gravedad' }, { errorType: 'olvida_gravedad' }];
  const luisLog = [{ errorType: 'olvida_gravedad' }, { errorType: 'angulo_desfasado' }];
  const top = commonDifficulties([anaLog, luisLog]);
  assert.equal(top[0].errorType, 'olvida_gravedad');
  assert.equal(top[0].count, 3);
  assert.ok(!JSON.stringify(top).match(/ana|luis/i), 'no debe exponer nombres');
});

test('buildDiagnosticPrompt hace una pregunta en el nivel 1 en vez de explicar', () => {
  const prompt = buildDiagnosticPrompt({ exercise: dron01, nivelPista: 1, language: 'es' });
  assert.match(prompt, /Nivel 1: no expliques nada todavía/);
});

test('buildDiagnosticPrompt reconoce una respuesta previa antes de la siguiente pregunta', () => {
  const prompt = buildDiagnosticPrompt({
    exercise: dron01, nivelPista: 2, language: 'es',
    history: [{ role: 'tutor', text: '¿Qué datos identificás?' }],
  });
  assert.match(prompt, /confirmá o corregí en una frase/);
  assert.match(prompt, /Última pregunta del tutor y respuesta del estudiante/);
});

test('buildPhotoExercisePrompt pide confirmar la lectura antes de resolver', () => {
  const prompt = buildPhotoExercisePrompt({ language: 'es' });
  assert.match(prompt, /transcribí en una lista corta/);
  assert.match(prompt, /No reveles el resultado final/);
});

test('buildPhotoExercisePrompt no repite la lectura si ya se confirmó en el historial', () => {
  const prompt = buildPhotoExercisePrompt({ language: 'es', history: [{ role: 'estudiante', text: 'Sí, está bien leído' }] });
  assert.match(prompt, /continuá guiando el paso siguiente/);
});

test('el tutor offline pregunta en el nivel 1 en vez de dar la pista directamente', async () => {
  const tutor = new RuleTutorProvider();
  const response = await tutor.respond({ type: 'hint', exercise: dron01, expectedConcept: dron01.expectedConcept, hintLevel: 1, language: 'es' });
  assert.equal(response.socratic, true);
  assert.match(response.message, /qué datos identificás/i);
  assert.match(response.message, /v0 = 20/);
});

test('el tutor offline reconoce la respuesta del alumno en vez de repetir la pregunta', async () => {
  const tutor = new RuleTutorProvider();
  const first = await tutor.respond({ type: 'hint', exercise: dron01, expectedConcept: dron01.expectedConcept, hintLevel: 1, language: 'es' });
  const second = await tutor.respond({
    type: 'hint', exercise: dron01, expectedConcept: dron01.expectedConcept, hintLevel: 1, language: 'es',
    message: 'v0 y el ángulo, busco vx', history: [{ role: 'tutor', text: first.message }],
  });
  assert.equal(second.socratic, false);
  assert.match(second.message, /Vamos a revisarlo juntos/);
});

test('normalizeChatImage acepta un data URL de imagen válido y rechaza el resto', () => {
  const image = normalizeChatImage('data:image/jpeg;base64,QUJD');
  assert.deepEqual(image, { mimeType: 'image/jpeg', data: 'QUJD' });
  assert.equal(normalizeChatImage('data:text/html;base64,QUJD'), null, 'solo imágenes');
  assert.equal(normalizeChatImage('no-es-una-imagen'), null);
  assert.equal(normalizeChatImage(null), null);
  assert.equal(normalizeChatImage({ dataUrl: 'data:image/png;base64,' + 'A'.repeat(900_001) }), null, 'demasiado pesada');
});
