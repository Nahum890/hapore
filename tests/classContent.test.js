import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeActivityPacket, sanitizeClassContent, sanitizeExercise, sanitizeLessonPayload } from '../src/cloud/classContent.js';
import exercises from '../src/data/exercises.json' with { type: 'json' };

// El paquete de clase y los adjuntos del chat llegan de la nube: alguien puede
// escribirlos a mano contra la API. Un campo con otro tipo rompía la app del
// alumno cada vez que la abría (el paquete queda guardado).

test('los ejercicios del catálogo pasan el saneado sin perder datos', () => {
  for (const exercise of exercises) {
    const clean = sanitizeExercise(exercise);
    assert.equal(clean.id, exercise.id);
    assert.equal(clean.question, exercise.question);
    assert.equal(clean.questionJopara, exercise.questionJopara);
    assert.deepEqual(clean.values, exercise.values);
    assert.deepEqual(clean.hints, exercise.hints);
    assert.equal(clean.correctAnswer, exercise.correctAnswer);
    assert.equal(clean.scenario, exercise.scenario);
    assert.deepEqual(clean.obstacle, exercise.obstacle);
  }
});

test('un ejercicio mal formado se normaliza en vez de romper la app', () => {
  const clean = sanitizeExercise({
    id: 'malo', question: { html: '<b>x</b>' }, hints: 'no es lista', scenario: 'cohete',
    values: { v0: 1e12, angle: 'abc', gravity: 0, targetDistance: 30, extra: 5 },
    obstacle: { x: 'lejos' }, ['__proto__']: { admin: true }, nested: { deep: { x: 1 } },
  });
  assert.equal(clean.question, '');
  assert.deepEqual(clean.hints, []);
  assert.equal(clean.scenario, 'dron');
  assert.deepEqual(clean.values, { targetDistance: 30 }, 'números absurdos o con otro tipo se descartan');
  assert.equal(clean.obstacle, undefined);
  assert.equal(clean.nested, undefined);
  assert.equal({}.admin, undefined, 'sin contaminación del prototipo');
  assert.equal(sanitizeExercise({ question: 'sin id' }), null);
  assert.equal(sanitizeExercise('texto'), null);
});

test('el paquete de clase siempre tiene la forma que espera la app', () => {
  const content = sanitizeClassContent({
    config: { subtemas: 'todo', ejercicios: 1e9, topics: ['mru', 5] },
    cards: [{ id: 'c1', frente_es: 'Pregunta', dorso_concepto: 'Respuesta' }, null, 'x'],
    exercises: [{ id: 'e1', values: null }, ...Array.from({ length: 500 }, (_, i) => ({ id: `n${i}` }))],
    flags: { defs: [{ id: 'f1', name: 'Repaso', color: 'url(https://rastreo.example/x.png)' }], byExercise: { e1: 'f1', e2: { x: 1 } } },
  });
  assert.deepEqual(content.config, { subtemas: [], ejercicios: 500, flashcards: 0, topics: ['mru'] });
  assert.equal(content.cards.length, 1);
  assert.equal(content.exercises.length, 300, 'con tope');
  assert.deepEqual(content.exercises[0].values, {});
  assert.equal(content.flags.defs[0].color, '#475569', 'colores solo en formato #hex');
  assert.deepEqual(content.flags.byExercise, { e1: 'f1' });
  assert.deepEqual(sanitizeClassContent(null).exercises, []);
});

test('clases y actividades del chat: sin diapositivas o con tipos raros no rompen el visor', () => {
  assert.equal(sanitizeLessonPayload({ lesson: { title: 'Vacía' } }), null);
  const lesson = sanitizeLessonPayload({ lesson: { id: 'l1', title: 'Clase', slides: [{ type: 'script', body: 'hola' }, { type: 'simulador', v0: 1e9, angle: 45 }] }, exercises: 'x' });
  assert.equal(lesson.lesson.slides[0].type, 'texto');
  assert.equal(lesson.lesson.slides[1].v0, undefined);
  assert.equal(lesson.lesson.slides[1].angle, 45);
  assert.deepEqual(lesson.exercises, []);
  const packet = sanitizeActivityPacket({ title: 'Act', cards: [{ id: 'c' }], exercises: [{ id: 'e', hints: ['a'] }, 3] });
  assert.equal(packet.cards.length, 1);
  assert.equal(packet.exercises.length, 1);
});
