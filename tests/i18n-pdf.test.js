import { test } from 'node:test';
import assert from 'node:assert/strict';
import concepts from '../src/data/concepts.json' with { type: 'json' };
import errors from '../src/data/errors.json' with { type: 'json' };
import exercises from '../src/data/exercises.json' with { type: 'json' };
import flashcards from '../src/data/flashcards.json' with { type: 'json' };
import glossary from '../src/data/glossary.json' with { type: 'json' };
import quizBank from '../src/ai/quizBank.json' with { type: 'json' };
import catalogTranslations from '../src/data/catalogTranslations.json' with { type: 'json' };
import review from '../src/data/contentReviewStatus.json' with { type: 'json' };
import sources from '../src/data/scienceSources.json' with { type: 'json' };
import tutor from '../src/data/tutor_jopara.json' with { type: 'json' };
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translate, translationReview } from '../src/i18n/messages.js';
import { localizeCatalogItem } from '../src/data/catalogs.js';
import { validateExercise } from '../src/physics/physicsValidator.js';

test('Jopara es el idioma inicial y la interfaz ofrece español', () => {
  assert.equal(DEFAULT_LANGUAGE, 'gn-jopara');
  assert.deepEqual(SUPPORTED_LANGUAGES, ['gn-jopara', 'es']);
  assert.equal(translate('es', 'pdf.title'), 'Ficha de Física');
  assert.equal(translationReview['gn-jopara'].status, 'draft');
  assert.equal(review.humanReview.status, 'pending');
});

test('cada flashcard tiene frente y dorso de trabajo en Jopara', () => {
  for (const card of flashcards) {
    const localized = localizeCatalogItem(card, 'gn-jopara');
    assert.ok(localized.frente_es?.trim(), `${card.id}: frente`);
    assert.ok(localized.dorso_concepto?.trim(), `${card.id}: dorso`);
    assert.ok(localized.frente_jopara?.trim(), `${card.id}: frente Jopara`);
    assert.ok(localized.dorso_jopara?.trim(), `${card.id}: dorso Jopara`);
  }
});

test('cada ejercicio tiene enunciado de trabajo en Jopara sin cambiar la respuesta', () => {
  for (const exercise of exercises) {
    const localized = localizeCatalogItem(exercise, 'gn-jopara');
    assert.ok(localized.question?.trim(), `${exercise.id}: enunciado`);
    assert.ok(localized.questionJopara?.trim(), `${exercise.id}: enunciado Jopara`);
    assert.equal(localized.question, localized.questionJopara, `${exercise.id}: usa la traducción`);
    assert.equal(localized.correctAnswer, exercise.correctAnswer, `${exercise.id}: valor físico`);
  }
});

test('el simulador acepta 45° y rechaza 30° para el alcance máximo exacto', () => {
  const exercise = exercises.find(item => item.id === 'ej-06');
  assert.equal(exercise.correctAnswer, 45);
  assert.equal(validateExercise(exercise, '45').correct, true);
  assert.equal(validateExercise(exercise, '30').correct, false);
});

test('todos los ítems de quiz abierto incluyen una respuesta Jopara de borrador', () => {
  const openQuestions = quizBank.filter(item => item.tipo === 'abierta');
  assert.ok(openQuestions.length > 0);
  assert.ok(openQuestions.every(item => item.respuestaJopara?.trim()));
});

test('cada respuesta de apoyo temático del tutor ofrece Jopara y español', () => {
  assert.ok(tutor.topicSupport.length > 0);
  for (const entry of tutor.topicSupport) {
    assert.ok(entry.es?.trim(), `${entry.search}: español`);
    assert.ok(entry.jopara?.trim(), `${entry.search}: Jopara`);
  }
  assert.match(tutor._reviewNote, /pendiente de revisión|borrador/i);
});

test('catálogos conservan cobertura explícita y etiquetas de revisión pendientes', () => {
  assert.equal(review.collections.concepts.count, concepts.length);
  assert.equal(review.collections.errors.count, errors.length);
  assert.equal(review.collections.exercises.joparaQuestionsPresent, exercises.length);
  assert.equal(review.collections.flashcards.joparaFrontsPresent, flashcards.length);
  assert.equal(review.collections.glossary.count, glossary.length);
  assert.equal(catalogTranslations.status, 'draft');
});

test('cada referencia PDF tiene metadatos, licencia y contenido respaldado', () => {
  assert.ok(sources.length >= 2);
  for (const source of sources) {
    assert.ok(source.institution && source.authors.length && source.title && source.edition);
    assert.ok(source.publicationYear && source.section && source.page && source.url && source.license);
    assert.ok(Array.isArray(source.supports) && source.supports.length);
  }
});
