import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeTheoryModule, THEORY_JOPARA } from '../src/data/theoryJopara.js';

test('los siete módulos tienen contenido, fórmulas y preguntas en Jopara', () => {
  assert.equal(Object.keys(THEORY_JOPARA).length, 7);
  for (const [id, translation] of Object.entries(THEORY_JOPARA)) {
    const module = {
      id,
      title: `Título en español ${id}`,
      tagline: 'Resumen en español',
      mecCap: 'Referencia en español',
      objective: 'Objetivo en español',
      content: translation.content.map((_, index) => `Contenido original ${index}`),
      examNote: 'Nota en español',
      formulas: translation.formulas.map((_, index) => ({ name: `Fórmula ${index}`, code: `x = ${index}`, meaning: 'Significado en español' })),
      questions: translation.questions.map((question, qIndex) => ({
        prompt: `Pregunta ${qIndex} en español`,
        options: question.options.map((_, optionIndex) => ({ text: `Opción ${optionIndex}`, correct: optionIndex === 1, explanation: 'Explicación en español' })),
      })),
    };
    const localized = localizeTheoryModule(module, 'gn-jopara');
    assert.equal(localized.title, translation.title, `${id}: título`);
    assert.equal(localized.tagline, translation.tagline, `${id}: bajada`);
    assert.equal(localized.objective, translation.objective, `${id}: objetivo`);
    assert.deepEqual(localized.content, translation.content, `${id}: explicación`);
    assert.equal(localized.examNote, translation.examNote, `${id}: guía de evaluación`);
    assert.deepEqual(localized.formulas.map(item => item.name), translation.formulas.map(item => item.name), `${id}: nombres de fórmulas`);
    assert.deepEqual(localized.formulas.map(item => item.code), module.formulas.map(item => item.code), `${id}: fórmulas conservan su expresión`);
    assert.equal(localized.questions.length, translation.questions.length, `${id}: cantidad de preguntas`);
    localized.questions.forEach((question, questionIndex) => {
      assert.equal(question.prompt, translation.questions[questionIndex].prompt, `${id}: pregunta ${questionIndex + 1}`);
      question.options.forEach((option, optionIndex) => {
        assert.equal(option.text, translation.questions[questionIndex].options[optionIndex].text);
        assert.equal(option.explanation, translation.questions[questionIndex].options[optionIndex].explanation);
        assert.equal(option.correct, module.questions[questionIndex].options[optionIndex].correct, 'la traducción conserva la respuesta correcta');
      });
    });
  }
});

test('español conserva el módulo original', () => {
  const module = { id: 'fundamento', title: 'Fundamento', content: [] };
  assert.equal(localizeTheoryModule(module, 'es'), module);
});
