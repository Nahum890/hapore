import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLIDE_TYPES, createGuidedLesson, createLesson, createSlide, deleteLesson, duplicateLesson, getLessons, launchErrors, moveItem, saveLesson,
} from '../src/utils/lessons.js';
import { removeKey, setActiveProfile } from '../src/utils/storage.js';
import { planFlight } from '../src/simulator/flightPlan.js';
import { sceneForExercise } from '../src/simulator/exerciseSimulation.js';
import { createLaunch, range } from '../src/physics/projectileMotion.js';

test('una clase nueva empieza con una portada y cada tipo de diapositiva se puede crear', () => {
  const lesson = createLesson('Tiro parabólico · 3.º B');
  assert.equal(lesson.title, 'Tiro parabólico · 3.º B');
  assert.equal(lesson.slides.length, 1);
  assert.equal(lesson.slides[0].type, 'titulo');
  for (const { type } of SLIDE_TYPES) assert.equal(createSlide(type).type, type);
  assert.throws(() => createSlide('video'));
});

test('la plantilla guiada prepara gancho, demostración, práctica y ticket en ese orden', () => {
  const lesson = createGuidedLesson('Cinemática · 3.º B', { practiceExerciseId: 'ew-02' });
  assert.equal(lesson.title, 'Cinemática · 3.º B');
  assert.deepEqual(lesson.slides.map(slide => slide.type), ['titulo', 'texto', 'simulador', 'ejercicio', 'texto']);
  assert.match(lesson.slides[1].title, /Gancho/);
  assert.match(lesson.slides[2].title, /Demostración/);
  assert.equal(lesson.slides[2].compare, true);
  assert.equal(lesson.slides[2].angle, 30);
  assert.equal(lesson.slides[2].angleB, 60);
  assert.equal(lesson.slides[3].title, '3. Práctica');
  assert.equal(lesson.slides[3].exerciseId, 'ew-02');
  assert.match(lesson.slides[4].title, /Ticket de salida/);
  assert.match(lesson.description, /Supuestos del modelo/);
});

test('los valores del lanzamiento no tienen topes arbitrarios, solo sentido físico', () => {
  assert.deepEqual(launchErrors({ v0: 150, angle: 89.5, gravity: 1.62 }), {});
  assert.deepEqual(launchErrors({ v0: 0.5, angle: 0.5, gravity: 24.8 }), {});
  const invalid = launchErrors({ v0: 0, angle: 90, gravity: -9.8 });
  assert.ok(invalid.v0 && invalid.angle && invalid.gravity);
  assert.ok(launchErrors({ v0: 'abc', angle: 45, gravity: 9.8 }).v0);
});

test('mover diapositivas reordena sin perder ninguna', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 5), ['a', 'b']);
});

test('las clases se guardan por docente, se duplican y se eliminan', () => {
  setActiveProfile('lessons-teacher-a'); removeKey('guarania:lessons');
  setActiveProfile('lessons-teacher-b'); removeKey('guarania:lessons');

  setActiveProfile('lessons-teacher-a');
  const lesson = createLesson('Clase de la docente A');
  lesson.slides.push(createSlide('simulador'));
  saveLesson(lesson);
  assert.equal(getLessons().length, 1);

  setActiveProfile('lessons-teacher-b');
  assert.equal(getLessons().length, 0, 'otra cuenta no ve las clases ajenas');

  setActiveProfile('lessons-teacher-a');
  const edited = { ...getLessons()[0], title: 'Clase editada' };
  saveLesson(edited);
  assert.equal(getLessons().length, 1);
  assert.equal(getLessons()[0].title, 'Clase editada');

  const copy = duplicateLesson(lesson.id);
  assert.equal(getLessons().length, 2);
  assert.equal(copy.slides.length, 2);
  assert.notEqual(copy.slides[0].id, lesson.slides[0].id);

  deleteLesson(lesson.id);
  assert.deepEqual(getLessons().map(item => item.id), [copy.id]);
  setActiveProfile(null);
});

test('el simulador ya no recorta en silencio velocidades altas de ejercicios propios', () => {
  const flight = planFlight({ speed: 50, angle: 45, gravity: 9.8, targetX: 255 });
  assert.equal(flight.launch.v0, 50);
  const exercise = { values: { v0: 50, angle: 30, gravity: 9.8 }, expectedConcept: 'alcance', unit: 'm', correctAnswer: 220.92, targetX: 220.92 };
  const scene = sceneForExercise(exercise, exercise.correctAnswer);
  const expected = range(createLaunch(50, 30, { gravity: 9.8 }));
  assert.ok(Math.abs(scene.flight.landingX - expected) < 0.05, `${scene.flight.landingX} vs ${expected}`);
});
