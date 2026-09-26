import { test } from 'node:test';
import assert from 'node:assert/strict';
import RuleTutorProvider from '../src/ai/RuleTutorProvider.js';
import { buildFreeChatPrompt } from '../src/ai/prompt.js';
import tutorData from '../src/data/tutor_jopara.json' with { type: 'json' };

const tutor = new RuleTutorProvider();

test('el chat offline relaciona una consulta de alcance con material de ese tema', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: '¿Qué fórmula uso para el alcance?' });
  assert.equal(response.available, true);
  assert.match(response.message, /alcance/i);
  assert.doesNotMatch(response.message, /No encontré una explicación suficientemente cercana/i);
});

test('el chat offline recupera material para el tiempo de vuelo', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: '¿Qué relación uso para el tiempo de vuelo?' });
  assert.equal(response.available, true);
  assert.match(response.message, /tiempo de vuelo|vuelo/i);
  assert.doesNotMatch(response.message, /No encontré una explicación suficientemente cercana/i);
});

test('el chat offline pide precisión cuando el material no permite responder', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: '¿Me contás algo?', language: 'es' });
  assert.equal(response.available, true);
  assert.match(response.message, /No encontré una explicación suficientemente cercana/i);
});

test('el chat offline responde en jopara por defecto cuando no se pide español', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: '¿Me contás algo?' });
  assert.equal(response.available, true);
  assert.match(response.message, /Ndajuhúi/i);
});

test('el tutor usa el catálogo de errores para resolver pistas por tipo de error', async () => {
  const local = new RuleTutorProvider({
    data: {
      ...tutorData,
      hintLevels: {
        byExercise: {},
        byErrorType: { confunde_componentes: { nivel_1: ['Separá primero los ejes horizontal y vertical.'] } },
        byConcept: {},
      },
    },
    errors: [{ id: 'test-component', key: 'confunde_componentes', expectedConcept: 'componente-horizontal' }],
    exercises: [],
    concepts: [],
    glossary: [],
    bank: [],
  });
  const response = await local.respond({ type: 'mistake', expectedConcept: 'componente-horizontal', hintLevel: 1 });
  assert.equal(response.message, 'Separá primero los ejes horizontal y vertical.');
});


test('el chat offline interpreta una afirmación corta usando el tema anterior', async () => {
  const response = await tutor.respond({
    tipo: 'charla_libre',
    message: 'Sí, contame más',
    history: [{ role: 'tutor', text: 'El tiempo de vuelo indica cuánto dura el movimiento parabólico en el aire.' }],
  });
  assert.match(response.message, /vuelo|movimiento parabólico/i);
  assert.match(response.message, /pregunta para seguir|techapyrã/i);
});

test('un “sí” corto continúa el tema y una pregunta nueva no hereda el anterior', async () => {
  const continuation = await tutor.respond({
    tipo: 'charla_libre', message: 'Sí',
    history: [{ role: 'tutor', text: 'El tiempo de vuelo indica cuánto dura el movimiento en el aire.' }],
  });
  const newQuestion = await tutor.respond({
    tipo: 'charla_libre', message: '¿Qué pasa con 30° y 60° en el alcance?',
    history: [{ role: 'tutor', text: 'El tiempo de vuelo indica cuánto dura el movimiento en el aire.' }],
  });
  assert.match(continuation.message, /tiempo de vuelo|vuelo/i);
  assert.match(newQuestion.message, /30|60|alcance|complementarios/i);
  assert.doesNotMatch(newQuestion.message, /tiempo de vuelo/);
});

test('el chat offline amplía preguntas cotidianas de Física a temas del material', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: '¿Cuánto tiempo queda en el aire antes de aterrizar?' });
  assert.match(response.message, /segundos|aire|vuelo/i);
});

test('Mba’éichapa y un saludo con pregunta no se confunden con un saludo aislado', async () => {
  const joparaQuestion = await tutor.respond({ tipo: 'charla_libre', message: '¿Mba’éichapa oñecalcula alcance?' });
  const greetedQuestion = await tutor.respond({ tipo: 'charla_libre', message: 'Hola, ¿cómo calculo el tiempo de vuelo?', language: 'es' });
  const greeting = await tutor.respond({ tipo: 'charla_libre', message: 'Mba’éichapa' });
  assert.match(joparaQuestion.message, /alcance/i);
  assert.match(greetedQuestion.message, /tiempo de vuelo|vuelo/i);
  assert.equal(greeting.knowledgeType, undefined);
});

test('la respuesta larga usa un ejercicio y pasos del catálogo local', async () => {
  const response = await tutor.respond({ tipo: 'charla_libre', message: 'Explicame el alcance paso a paso y completo', language: 'es' });
  assert.match(response.message, /Ejemplo del material/i);
  assert.match(response.message, /Datos:/);
  assert.match(response.message, /Resultado del ejercicio/i);
});

test('el prompt online respeta español aunque la pregunta esté en otro idioma', () => {
  const prompt = buildFreeChatPrompt({ language: 'es', message: 'explicame el alcance' });
  assert.match(prompt, /Idioma elegido: español/);
  assert.doesNotMatch(prompt, /Idioma elegido: guaraní\/Jopara/);
});
