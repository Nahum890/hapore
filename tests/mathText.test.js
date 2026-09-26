import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formulaParts, splitFraction, toTextbookMarked, toTextbookPlain } from '../src/utils/mathText.js';
import concepts from '../src/data/concepts.json' with { type: 'json' };
import flashcards from '../src/data/flashcards.json' with { type: 'json' };
import exercises from '../src/data/exercises.json' with { type: 'json' };

test('las fórmulas se muestran con notación de libro, no de programación', () => {
  assert.equal(toTextbookPlain('vx = v0 * cos(ángulo)'), 'vₓ = v₀ · cos θ');
  assert.equal(toTextbookPlain('Hmax = (v0² * sen²(ángulo)) / (2 * g)'), 'Hmáx = (v₀² · sen² θ) / (2g)');
  assert.equal(toTextbookPlain('R = (v0² * sen(2 * ángulo)) / g'), 'R = (v₀² · sen 2θ) / g');
  assert.equal(toTextbookPlain('y(t) = y0 + vy*t - 0.5*g*t²'), 'y(t) = y₀ + vy · t - ½ g · t²');
  assert.equal(toTextbookPlain('vx = 20 * cos(30°) ≈ 20 * 0,8660 = 17,32 m/s.'), 'vₓ = 20 · cos 30° ≈ 20 · 0,8660 = 17,32 m/s.');
  assert.equal(toTextbookPlain('ángulo_max = 45°'), 'θmáx = 45°');
});

test('el texto común con la palabra ángulo no se toca', () => {
  const prose = 'Probá acercarte a 45°: el ángulo de 30° queda corto.';
  assert.equal(toTextbookPlain(prose), prose);
});

test('las divisiones de primer nivel se separan en numerador y denominador', () => {
  const parts = formulaParts(toTextbookMarked('Hmax = (v0² * sen²(ángulo)) / (2 * g)'));
  assert.deepEqual(splitFraction(parts.at(-1)), { num: 'v_{0}² · sen² θ', den: '2g' });
  assert.equal(splitFraction('x · tan θ - (g / (2 · v_{0}²)) · x²'), null, 'una división anidada no se apila');
});

test('ninguna fórmula del contenido queda con * ni con (ángulo)', () => {
  const texts = [
    ...concepts.map(item => item.formula),
    ...flashcards.map(item => item.formula),
    ...exercises.flatMap(item => item.hints),
  ].filter(Boolean);
  for (const text of texts) {
    const plain = toTextbookPlain(text);
    assert.ok(!plain.includes('*'), `queda * en: ${plain}`);
    assert.ok(!/\(ángulo\)/.test(plain), `queda (ángulo) en: ${plain}`);
  }
});
