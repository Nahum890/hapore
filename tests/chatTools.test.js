import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent, offlineChatAnswer, parseProblem, parseWidgetTags } from '../src/ai/chatTools.js';

test('lee los datos de un enunciado común y resuelve como en el cuaderno', () => {
  assert.deepEqual(parseProblem('Una pelota sale a 20 m/s con 30°, ¿cuál es el alcance?'), { v0: 20, angle: 30 });
  const answer = offlineChatAnswer('Una pelota sale a 20 m/s con 30°, ¿cuál es el alcance?', [], 'es');
  assert.equal(answer.widget.type, 'notebook');
  assert.equal(answer.widget.answer, 'R = 35,35 m');
  assert.ok(answer.widget.steps.length >= 5);
});

test('resuelve problemas inversos y tiro horizontal', () => {
  assert.equal(offlineChatAnswer('¿con qué velocidad hay que lanzar a 45° para que llegue a 40 m?', [], 'es').widget.answer, 'v0 = 19,8 m/s');
  assert.match(offlineChatAnswer('¿con qué ángulo llega a 30 m si sale a 20 m/s?', [], 'es').widget.answer, /23,65° o 66,35°/);
  assert.equal(offlineChatAnswer('se lanza horizontalmente desde una mesa de 1,2 m de altura con 3 m/s, cuanto tarda en caer', [], 'es').widget.answer, 'T = 0,49 s');
});

test('detecta gráfico, simulación, 3D, comparación y práctica en español y jopara', () => {
  assert.equal(detectIntent('enseñame a dibujar el grafico de 15 m/s a 45 grados'), 'graph');
  assert.equal(detectIntent('Embo’e chéve rehai hag̃ua gráfico 15 m/s ha 45° reheve'), 'graph');
  assert.equal(detectIntent('simulá 25 m/s a 60°'), 'simulate');
  assert.equal(detectIntent('quiero verlo en 3d'), '3d');
  assert.equal(detectIntent('Embojoja 30° ha 60°'), 'compare');
  assert.equal(detectIntent('Eme’ẽ chéve peteĩ ejercicio'), 'practice');
});

test('corrige la respuesta de una práctica generada', () => {
  const practice = offlineChatAnswer('dame un ejercicio', [], 'gn-jopara');
  const history = [{ role: 'tutor', text: practice.message, widget: practice.widget }];
  const reply = offlineChatAnswer(String(practice.widget.problem.answer), history, 'gn-jopara');
  assert.match(reply.message, /Iporã/);
});

test('lee una etiqueta de herramienta escrita por la IA y la quita del texto', () => {
  const parsed = parseWidgetTags('Mirá la trayectoria.\n[[simular v0=22 angulo=35 g=9.8]]', 'es');
  assert.equal(parsed.text, 'Mirá la trayectoria.');
  assert.deepEqual(parsed.widget.params, { v0: 22, angle: 35, g: 9.8, h0: 0 });
  assert.equal(parseWidgetTags('[[simular v0=9999 angulo=35]]').widget, null);
});
