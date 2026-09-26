import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCustomFlashcard, deleteCustomFlashcard, getCustomFlashcards } from '../src/utils/customFlashcards.js';
import { removeKey, setActiveProfile } from '../src/utils/storage.js';

test('el docente crea y borra tarjetas propias, guardadas en su cuenta', () => {
  setActiveProfile('cards-teacher'); removeKey('guarania:customFlashcards');
  const card = createCustomFlashcard({ front: ' ¿vx cambia en el vuelo? ', back: 'No, sin aire es constante.', formula: 'vx = v0 · cos(θ)' });
  assert.equal(card.frente_es, '¿vx cambia en el vuelo?');
  assert.equal(card.custom, true);
  assert.equal(getCustomFlashcards().length, 1);
  assert.throws(() => createCustomFlashcard({ front: 'Solo frente', back: '  ' }), /pregunta y la respuesta/);

  setActiveProfile('otro-docente');
  assert.equal(getCustomFlashcards().length, 0);

  setActiveProfile('cards-teacher');
  deleteCustomFlashcard(card.id);
  assert.equal(getCustomFlashcards().length, 0);
  setActiveProfile(null);
});
