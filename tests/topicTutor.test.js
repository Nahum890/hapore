import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTopic, extractQuantities, topicTutorAnswer } from '../src/ai/topicTutor.js';
import { widgetForMessage } from '../src/ai/chatTools.js';
import RuleTutorProvider from '../src/ai/RuleTutorProvider.js';
import { generateExercise } from '../src/curriculum/practice.js';

test('reconoce el tema de la pregunta y deja el tiro parabólico a su motor', () => {
  assert.equal(detectTopic('¿Qué es la ley de Ohm?')?.id, 'ohm');
  assert.equal(detectTopic('explicame el principio de Arquímedes')?.id, 'arquimedes');
  assert.equal(detectTopic('¿Cómo funciona una lupa?')?.id, 'lentes');
  assert.equal(detectTopic('¿Qué es la energía interna?')?.id, 'termodinamica');
  assert.equal(detectTopic('¿Qué es el alcance?'), null, 'alcance es de tiro parabólico');
  assert.equal(detectTopic('¿Por qué cae?'), null, 'una palabra genérica sola no decide');
  assert.equal(detectTopic('una pelota sale a 20 m/s con 30°'), null);
});

test('lee números con unidades y los pasa al SI', () => {
  const q = extractQuantities('R1 = 2 kΩ, 500 g, 72 km/h, 3 μC, 20 °C, 5 cm y 2 x 10^-6 C');
  assert.deepEqual(q.R, [2000]);
  assert.deepEqual(q.m, [0.5]);
  assert.equal(q.v[0], 20);
  assert.ok(Math.abs(q.q[0] - 3e-6) < 1e-12);
  assert.ok(Math.abs(q.q[1] - 2e-6) < 1e-12);
  assert.deepEqual(q.T, [{ value: 20, scale: 'C' }]);
  assert.deepEqual(q.d, [0.05]);
});

test('resuelve con los datos del alumno y cita al MEC', () => {
  const ohm = topicTutorAnswer('Una resistencia de 4 Ω con 12 V, ¿qué corriente circula?', [], 'es');
  assert.match(ohm.message, /I = V \/ R/);
  assert.match(ohm.message, /I = 3 A/);
  assert.match(ohm.message, /Según el MEC: 2\.º curso/);
  assert.match(ohm.message, /Res\. MEC N° 12\.506\/09 BIS/);
  const parallel = topicTutorAnswer('dos resistencias de 6 Ω y 3 Ω en paralelo', [], 'es');
  assert.match(parallel.message, /R_\{eq\} = 2 Ω/);
  const heat = topicTutorAnswer('calor para calentar 2 kg de agua de 20 °C a 70 °C (calorimetría)', [], 'es');
  assert.match(heat.message, /Q = 418\s600 J/, 'miles con espacio fino');
  const temp = topicTutorAnswer('pasar 100 °C a fahrenheit (temperatura)', [], 'es');
  assert.match(temp.message, /T_\{F\} = 212 °F/);
});

test('explica en el idioma elegido, con fórmulas y dónde verlo', () => {
  const es = topicTutorAnswer('¿Qué es el empuje?', [], 'es');
  assert.match(es.message, /Empuje y Principio de Arquímedes/);
  assert.match(es.message, /Temas → /);
  assert.deepEqual(es.widget, { type: 'topic', topicId: 'arquimedes' });
  const gn = topicTutorAnswer('¿Mba’épa empuje?', [], 'gn-jopara');
  assert.match(gn.message, /MEC he’iháicha/);
});

test('propone un ejercicio, lo corrige y muestra la resolución', () => {
  const first = topicTutorAnswer('dame un ejercicio de ley de ohm', [], 'es');
  assert.equal(first.widget.type, 'topic-exercise');
  const exercise = generateExercise(first.widget.genId, first.widget.seed);
  const history = [{ role: 'alumno', text: 'dame un ejercicio de ley de ohm' }, { role: 'tutor', text: first.message, widget: first.widget }];
  const wrong = topicTutorAnswer(String(exercise.answer * 3 + 7), history, 'es');
  assert.match(wrong.message, /Pista/);
  assert.equal(wrong.widget.type, 'topic-exercise', 'el ejercicio sigue abierto para reintentar');
  const right = topicTutorAnswer(String(exercise.answer).replace('.', ','), history, 'es');
  assert.match(right.message, /¡Correcto!/);
  assert.match(right.message, /Resolución/);
  const steps = topicTutorAnswer('mostrame la resolución', history, 'es');
  assert.match(steps.message, /1\. /);
});

test('lista los temas del programa', () => {
  const list = topicTutorAnswer('¿Qué temas hay?', [], 'es');
  assert.match(list.message, /1\.er curso \(Plan Común\)/);
  assert.match(list.message, /Plan Específico/);
});

test('el chat sin internet usa estos temas y no agrega tarjetas de tiro parabólico', async () => {
  const tutor = new RuleTutorProvider();
  const reply = await tutor.respond({ tipo: 'charla_libre', message: '¿Cuál es la fórmula de la ley de Ohm?', language: 'es' });
  assert.match(reply.message, /V = I · R/);
  assert.equal(reply.knowledgeType, 'topic');
  assert.equal(widgetForMessage('dame un ejercicio de MRU', [], 'es'), null);
  const parabolic = await tutor.respond({ tipo: 'charla_libre', message: '¿Qué es el alcance?', language: 'es' });
  assert.notEqual(parabolic.knowledgeType, 'topic');
});
