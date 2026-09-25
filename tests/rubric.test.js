import test from 'node:test';
import assert from 'node:assert/strict';
import exercises from '../src/data/exercises.json' with { type: 'json' };
import flashcards from '../src/data/flashcards.json' with { type: 'json' };
import quizBank from '../src/ai/quizBank.json' with { type: 'json' };
import { measureExercise } from '../src/simulator/exerciseSimulation.js';
import { validateExercise } from '../src/physics/physicsValidator.js';
import { encodeClassConfig, decodeClassConfig, selectClassExercises } from '../src/utils/classCode.js';
import { diagnoseAttempt } from '../src/pedagogy/diagnoseAttempt.js';
import { recommendExercise, summarizeAttempts } from '../src/pedagogy/progression.js';

test('termodinámica y óptica incluyen práctica, tarjetas y preguntas conceptuales', () => {
  for (const topic of ['Termodinámica', 'Óptica']) {
    const group = exercises.filter(item => item.topic === topic);
    assert.ok(group.length >= 4);
    assert.ok(group.some(item => item.difficulty === 'básico'));
    assert.ok(group.some(item => item.difficulty === 'avanzado'));
    assert.ok(group.every(item => item.questionJopara && item.hints.length >= 3));
    assert.ok(flashcards.filter(item => item.topic === topic).length >= 3);
    assert.ok(quizBank.filter(item => item.tema === topic && item.tipo === 'abierta').length >= 2);
  }
});

test('el modelo visual calcula el mismo resultado que el corrector en los temas nuevos', () => {
  for (const exercise of exercises.filter(item => ['Termodinámica', 'Óptica'].includes(item.topic))) {
    const measured = measureExercise(exercise);
    assert.ok(Number.isFinite(measured), exercise.id);
    assert.ok(Math.abs(measured - exercise.correctAnswer) < 0.0001, exercise.id);
    assert.equal(validateExercise(exercise, String(measured)).correct, true);
    assert.equal(validateExercise(exercise, String(measured + Math.max(2, Math.abs(measured) * 0.2))).correct, false);
  }
});

test('códigos de clase nuevos aceptan ambos temas y códigos anteriores siguen funcionando', () => {
  const config = { flashcards: 10, ejercicios: 4, subtemas: ['termodinamica', 'optica'] };
  assert.deepEqual(decodeClassConfig(encodeClassConfig(config)), config);
  assert.deepEqual(decodeClassConfig('GP10P03'), { flashcards: 10, ejercicios: 3, subtemas: ['parabolico', 'cinematica', 'vectores', 'hooke'] });
  const selection = selectClassExercises(exercises, config);
  assert.deepEqual(selection.map(item => item.topic), ['Termodinámica', 'Óptica', 'Termodinámica', 'Óptica']);
});

test('retroalimentación identifica errores de procedimiento frecuentes', () => {
  const heat = exercises.find(item => item.id === 'ej-termo-01');
  assert.match(diagnoseAttempt(heat, 63000), /temperatura final/);
  const reflection = exercises.find(item => item.id === 'ej-optica-04');
  assert.match(diagnoseAttempt(reflection, 25), /normal/);
});

test('el progreso registra aciertos y recomienda reforzar tras dos fallos', () => {
  const thermal = exercises.filter(item => item.topic === 'Termodinámica');
  const current = thermal.find(item => item.difficulty === 'avanzado');
  const log = [{ exerciseId: current.id, correct: false, durationMs: 12000 }, { exerciseId: current.id, correct: false, durationMs: 8000 }];
  assert.equal(summarizeAttempts(log).averageSeconds, 10);
  assert.equal(recommendExercise(thermal, current.id, log).exercise.difficulty, 'básico');
});
