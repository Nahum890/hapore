import { test } from 'node:test';
import assert from 'node:assert/strict';
import exercisesData from '../src/data/exercises.json' with { type: 'json' };
import conceptsData from '../src/data/concepts.json' with { type: 'json' };
import errorsData from '../src/data/errors.json' with { type: 'json' };
import tutorData from '../src/data/tutor_jopara.json' with { type: 'json' };
import flashcardsData from '../src/data/flashcards.json' with { type: 'json' };
import glossaryData from '../src/data/glossary.json' with { type: 'json' };
import RuleTutorProvider from '../src/ai/RuleTutorProvider.js';
import { validateExercise } from '../src/physics/physicsValidator.js';
import { createLaunch, range, maxHeight, timeOfFlight } from '../src/physics/projectileMotion.js';
import {
  CONFIDENCE_MAX,
  CONFIDENCE_REWARDS,
  getConfidence,
  increaseConfidence,
} from '../src/pedagogy/confidenceEngine.js';

test('integridad del banco de datos: ejercicios tienen campos y conceptos válidos', () => {
  assert.ok(exercisesData.length >= 6, 'Debe haber al menos 6 ejercicios del MEC');
  const validConceptIds = new Set(conceptsData.map((c) => c.id));

  for (const ex of exercisesData) {
    assert.ok(ex.id, 'El ejercicio debe tener id');
    assert.ok(ex.question, 'El ejercicio debe tener enunciado');
    assert.ok(ex.unit, 'El ejercicio debe tener unidad');
    assert.ok(typeof ex.correctAnswer === 'number', 'correctAnswer debe ser numérico');
    assert.ok(validConceptIds.has(ex.expectedConcept), `Concepto no encontrado: ${ex.expectedConcept}`);
    assert.ok(Array.isArray(ex.hints) && ex.hints.length >= 3, 'Debe tener al menos 3 pistas');
  }
});

test('integridad del tutor en jopara: catálogo de errores y niveles de pista', () => {
  assert.ok(Array.isArray(tutorData.greetings.jopara) && tutorData.greetings.jopara.length > 0);
  assert.ok(Array.isArray(tutorData.greetings.es) && tutorData.greetings.es.length > 0);
  assert.ok(typeof tutorData.fallbackHint.jopara === 'string');
  assert.ok(typeof tutorData.fallbackHint.es === 'string');
  assert.ok(Array.isArray(tutorData.errors) && tutorData.errors.length >= 4);

  for (const err of tutorData.errors) {
    assert.ok(err.errorId, 'Debe tener errorId');
    assert.ok(err.esHint, 'Debe tener pista en español');
    assert.ok(err.followUp?.jopara, 'Debe tener seguimiento en Jopara');
    assert.ok(err.followUp?.es, 'Debe tener seguimiento en español');
  }

  const errorTypes = ['confunde_velocidades', 'confunde_componentes', 'confunde_altura_alcance', 'olvida_gravedad', 'angulo_desfasado'];
  for (const key of errorTypes) {
    const byType = tutorData.hintLevels.byErrorType[key];
    assert.ok(byType, `Debe existir byErrorType.${key}`);
    for (const nivel of ['nivel_1', 'nivel_2', 'nivel_3', 'nivel_4']) {
      assert.ok(byType[nivel]?.jopara?.length, `${key}.${nivel}: Jopara`);
      assert.ok(byType[nivel]?.es?.length, `${key}.${nivel}: español`);
    }
  }
});

test('integridad de flashcards y glosario: contenido bilingüe y fórmulas', () => {
  assert.ok(flashcardsData.length >= 5, 'Debe haber al menos 5 tarjetas de estudio');
  for (const card of flashcardsData) {
    assert.ok(card.front && card.back, 'Tarjeta debe tener frente y dorso');
    assert.ok(card.formula, 'Tarjeta debe incluir fórmula destacada');
  }

  assert.ok(glossaryData.length >= 5, 'Debe haber al menos 5 términos de glosario');
  for (const entry of glossaryData) {
    assert.ok(entry.term && entry.definition, 'Entrada de glosario debe tener término y definición');
    assert.ok(entry.joparaTerm, 'Debe incluir término integrado en Jopara');
  }
});

test('flujo pedagógico completo: error -> tutor socrático en jopara -> 0% penalización', async () => {
  const tutor = new RuleTutorProvider({ data: tutorData, errors: errorsData });
  const exercise = exercisesData.find((e) => e.id === 'ej-01');

  // Estudiante ingresa respuesta incorrecta
  const validation = validateExercise(exercise, '25');
  assert.equal(validation.correct, false);

  // Se solicita acompañamiento al tutor socrático offline
  const response = await tutor.respond({
    type: 'mistake',
    expectedConcept: exercise.expectedConcept,
    exerciseId: exercise.id,
  });

  assert.equal(response.available, true);
  assert.ok(response.message.length > 10, 'Debe retornar mensaje pedagógico en jopara');
  assert.ok(response.esHint, 'Debe incluir soporte conceptual');

  // En la filosofía Kyhyje'ỹ el error no resta confianza
  const confBefore = getConfidence();
  increaseConfidence(CONFIDENCE_REWARDS.mistake);
  assert.equal(getConfidence(), confBefore, 'La confianza nunca debe decrecer ante un error');
});

test('flujo pedagógico completo: acierto -> aumento positivo de confianza', () => {
  const exercise = exercisesData.find((e) => e.id === 'ej-01');
  const validation = validateExercise(exercise, '17,32');
  assert.equal(validation.correct, true);

  const confBefore = getConfidence();
  increaseConfidence(CONFIDENCE_REWARDS.exerciseClean);
  assert.equal(getConfidence(), confBefore + 25, 'Acierto directo suma +25%');
});

test('demostración de aula: simetría de 30° vs 60° calculada por el motor determinista', () => {
  const launch30 = createLaunch(20, 30, { gravity: 10 });
  const launch60 = createLaunch(20, 60, { gravity: 10 });

  const r30 = range(launch30);
  const r60 = range(launch60);

  // sen(2·30°) = sen(60°) = sen(120°) = sen(2·60°) -> R idéntico
  assert.ok(Math.abs(r30 - r60) < 0.001, `Alcances deben ser iguales: r30=${r30}, r60=${r60}`);
  assert.ok(Math.abs(r30 - 34.641) < 0.01, 'Alcance esperado ~34.64 m');

  // Las alturas máximas sí difieren
  const h30 = maxHeight(launch30);
  const h60 = maxHeight(launch60);
  assert.ok(h60 > h30, 'El tiro de 60° debe alcanzar mayor altura que el de 30°');
});

test('misión puesto a 40 metros: ángulo óptimo 45°', () => {
  const launch45 = createLaunch(20, 45, { gravity: 10 });
  const r45 = range(launch45);

  // R = (20² · sen(90°)) / 10 = 400 / 10 = 40 metros exactos
  assert.ok(Math.abs(r45 - 40.0) < 0.001, 'Alcance a 45° debe ser exactamente 40.0 m');
});
