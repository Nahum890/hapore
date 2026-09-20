import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIDENCE_MAX,
  CONFIDENCE_REWARDS,
  getConfidence,
  increaseConfidence,
} from '../src/pedagogy/confidenceEngine.js';

test('la confianza inicial es 0', () => {
  assert.equal(getConfidence(), 0);
});

test('ejercicio correcto sin ayuda suma +25', () => {
  increaseConfidence(CONFIDENCE_REWARDS.exerciseClean);
  assert.equal(getConfidence(), 25);
});

test('ejercicio correcto con pistas suma +15', () => {
  increaseConfidence(CONFIDENCE_REWARDS.exerciseWithHints);
  assert.equal(getConfidence(), 40);
});

test('tarjeta consolidada suma +5', () => {
  increaseConfidence(CONFIDENCE_REWARDS.flashcardConsolidated);
  assert.equal(getConfidence(), 45);
});

test('error suma +0: la confianza no cambia', () => {
  const before = getConfidence();
  increaseConfidence(CONFIDENCE_REWARDS.mistake);
  assert.equal(getConfidence(), before);
});

test('los incrementos negativos se ignoran: la confianza nunca disminuye', () => {
  const before = getConfidence();
  increaseConfidence(-10);
  increaseConfidence(-0.001);
  assert.equal(getConfidence(), before);
});

test('el valor se limita al máximo de 100', () => {
  increaseConfidence(500);
  assert.equal(getConfidence(), CONFIDENCE_MAX);
});

test('los incrementos no numéricos se ignoran', () => {
  const before = getConfidence();
  increaseConfidence('10');
  increaseConfidence(NaN);
  increaseConfidence(undefined);
  assert.equal(getConfidence(), before);
});

test('no existe ninguna función de decremento', async () => {
  const module = await import('../src/pedagogy/confidenceEngine.js');
  assert.ok(!('decreaseConfidence' in module));
});

test('las recompensas tienen los valores definidos', () => {
  assert.deepEqual(CONFIDENCE_REWARDS, {
    exerciseClean: 25,
    exerciseWithHints: 15,
    flashcardConsolidated: 5,
    mistake: 0,
  });
});
