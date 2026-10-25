import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, topicById, courseTopics, topicCurriculum } from '../src/curriculum/topics/index.js';
import { COURSES, GUIDE_SCHEDULES } from '../src/curriculum/curriculum.js';
import { SOURCES, NORMATIVE } from '../src/curriculum/sources.js';
import { GENERATOR_IDS, generateExercise, checkAnswer, parseUserNumber, fmt } from '../src/curriculum/practice.js';

test('cada tema del currículo existe y cada tema está en algún curso', () => {
  const ids = new Set(TOPICS.map(topic => topic.id));
  assert.equal(ids.size, TOPICS.length, 'ids repetidos');
  for (const course of COURSES) for (const unit of course.units) for (const capacity of unit.capacities) {
    for (const id of capacity.topics) assert.ok(ids.has(id), `${course.id}: falta el tema ${id}`);
  }
  for (const schedule of Object.values(GUIDE_SCHEDULES)) for (const week of schedule.weeks) {
    for (const id of week.topics) assert.ok(ids.has(id), `Guía: falta el tema ${id}`);
  }
  for (const topic of TOPICS) assert.ok(topicCurriculum(topic.id).placements.length > 0, `${topic.id} no figura en ningún curso`);
});

test('solo Educación Media: cuatro cursos y ningún tercer ciclo', () => {
  assert.deepEqual(COURSES.map(course => course.id), ['c1', 'c2', 'c3c', 'c3e']);
  assert.ok(courseTopics('c1').length >= 15);
  assert.ok(courseTopics('c3e').some(topic => topic.id === 'movimiento-parabolico'));
});

test('las fuentes citan la resolución del programa base sin inventar otras', () => {
  assert.equal(SOURCES.A.resolution, 'Res. MEC N° 12.506/09 BIS');
  assert.equal(SOURCES.B.resolution, null);
  assert.equal(SOURCES.C.resolution, null);
  const resolutions = NORMATIVE.filter(item => item.type === 'resolucion').map(item => item.number);
  assert.deepEqual(resolutions, ['Res. MEC N° 12.506/09 BIS', 'Res. MEC N° 308/2020', 'Res. MEC N° 602/2020', 'Res. MEC N° 832/2020']);
});

test('cada tema tiene contenido bilingüe, quiz válido y generadores existentes', () => {
  for (const topic of TOPICS) {
    assert.ok(topic.name.es && topic.name.gn, `${topic.id}: nombre`);
    assert.ok(topic.summary.es.length >= 3 && topic.summary.gn.length === topic.summary.es.length, `${topic.id}: resumen`);
    assert.ok(topic.formulas.length >= 1, `${topic.id}: fórmulas`);
    assert.ok(topic.quiz.length >= 3, `${topic.id}: quiz`);
    for (const item of topic.quiz) assert.ok(item.a >= 0 && item.a < item.options.length, `${topic.id}: respuesta fuera de rango`);
    for (const genId of topic.practice) assert.ok(GENERATOR_IDS.includes(genId), `${topic.id}: generador ${genId} no existe`);
  }
});

test('todos los generadores producen ejercicios con respuesta finita y se autocorrigen', () => {
  for (const genId of GENERATOR_IDS) {
    for (let seed = 1; seed <= 40; seed += 1) {
      const exercise = generateExercise(genId, seed);
      assert.ok(Number.isFinite(exercise.answer), `${genId}#${seed}: respuesta no finita`);
      assert.ok(exercise.prompt.es && exercise.prompt.gn, `${genId}: enunciado`);
      assert.equal(exercise.steps.length, 3);
      assert.ok(checkAnswer(exercise, String(exercise.answer)).correct, `${genId}#${seed}: no acepta su propia respuesta`);
      assert.ok(checkAnswer(exercise, fmt(exercise.answer, exercise.decimals ?? 2)).correct, `${genId}#${seed}: no acepta la respuesta mostrada ${fmt(exercise.answer)}`);
    }
  }
});

test('la física de los generadores es correcta en casos conocidos', () => {
  const find = (genId, predicate) => {
    for (let seed = 1; seed < 500; seed += 1) { const ex = generateExercise(genId, seed); if (predicate(ex)) return ex; }
    throw new Error(`sin caso para ${genId}`);
  };
  const kmh = find('units-kmh', ex => ex.prompt.es.includes(' 72 km/h'));
  assert.equal(kmh.answer, 20);
  const fall = find('ff-time', ex => ex.prompt.es.includes(' 20 m '));
  assert.ok(Math.abs(fall.answer - 2.0203) < 1e-3);
  const carnot = find('td-carnot', ex => ex.prompt.es.includes('327 °C y 27 °C'));
  assert.ok(Math.abs(carnot.answer - 50) < 1e-9);
  const ohm = find('ohm-parallel', ex => ex.prompt.es.includes('de 12 Ω y 4 Ω'));
  assert.equal(ohm.answer, 3);
});

test('lectura de números escritos por el alumno', () => {
  assert.equal(parseUserNumber('1,5'), 1.5);
  assert.equal(parseUserNumber('1.5'), 1.5);
  assert.equal(parseUserNumber('29 400'), 29400);
  assert.equal(parseUserNumber('29.400,5'), 29400.5);
  assert.equal(parseUserNumber('2,1e14'), 2.1e14);
  assert.equal(parseUserNumber('2,1 × 10^14'), 2.1e14);
  assert.equal(parseUserNumber('1,6·10⁻¹⁹'), 1.6e-19);
  assert.equal(parseUserNumber('−3'), -3);
  assert.ok(Number.isNaN(parseUserNumber('hola')));
});

test('detecta errores típicos de unidades y de signo', () => {
  const exercise = { answer: 20, decimals: 2 };
  assert.equal(checkAnswer(exercise, '2000').unitSlip, true);
  assert.equal(checkAnswer({ answer: -0.5, decimals: 2 }, '0,5').signSlip, true);
});
