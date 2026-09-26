import { readJSON, writeJSON } from './storage.js';

// Tarjetas que crea el docente: quedan en su cuenta y puede elegir
// compartirlas en una clase junto con las tarjetas del banco.
const CUSTOM_CARDS_KEY = 'guarania:customFlashcards';

export function getCustomFlashcards() {
  const stored = readJSON(CUSTOM_CARDS_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function createCustomFlashcard({ front, back, formula }) {
  const frente = String(front ?? '').trim();
  const dorso = String(back ?? '').trim();
  if (!frente || !dorso) throw new Error('Escribí la pregunta y la respuesta de la tarjeta.');
  const card = {
    id: `custom-card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    topic: 'Movimiento Parabólico',
    frente_es: frente.slice(0, 300),
    dorso_concepto: dorso.slice(0, 600),
    formula: String(formula ?? '').trim().slice(0, 160),
    custom: true,
  };
  writeJSON(CUSTOM_CARDS_KEY, [...getCustomFlashcards(), card]);
  return card;
}

export function deleteCustomFlashcard(id) {
  writeJSON(CUSTOM_CARDS_KEY, getCustomFlashcards().filter(card => card.id !== id));
}
