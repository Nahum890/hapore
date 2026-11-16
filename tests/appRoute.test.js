import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRoute, parseRoute } from '../src/utils/appRoute.js';
import { TOPICS } from '../src/curriculum/topics/index.js';

const HOME = { tab: 'inicio', topic: null };

test('sin hash, la ruta es Inicio', () => {
  assert.deepEqual(parseRoute(''), HOME);
  assert.deepEqual(parseRoute('#'), HOME);
  assert.deepEqual(parseRoute('#/'), HOME);
});

test('las 6 secciones van y vuelven por la dirección', () => {
  for (const tab of ['inicio', 'simulador', 'tarjetas', 'chats', 'aula', 'mensajes']) {
    assert.deepEqual(parseRoute(formatRoute({ tab, topic: null })), { tab, topic: null }, tab);
  }
  assert.equal(formatRoute({ tab: 'chats' }), '#/tutor');
  assert.equal(formatRoute({ tab: 'simulador', topic: null }), '#/temas');
});

test('un tema guarda su pestaña inicial', () => {
  const practice = { tab: 'simulador', topic: { id: 'vectores', tab: 'practice' } };
  assert.equal(formatRoute(practice), '#/temas/vectores/practicar');
  assert.deepEqual(parseRoute('#/temas/vectores/practicar'), practice);
  const learn = { tab: 'simulador', topic: { id: 'vectores', tab: 'learn' } };
  assert.equal(formatRoute(learn), '#/temas/vectores');
  assert.deepEqual(parseRoute('#/temas/vectores'), learn);
});

test('direcciones raras no rompen nada', () => {
  assert.deepEqual(parseRoute('#/nada'), HOME);
  assert.deepEqual(parseRoute('#/temas/../x'), { tab: 'simulador', topic: null });
  assert.equal(parseRoute('#/temas/vectores/otra').topic.tab, 'learn');
  assert.doesNotThrow(() => parseRoute('#/temas/%E0%A4%A'));
  assert.deepEqual(parseRoute('#/temas/%E0%A4%A'), { tab: 'simulador', topic: null });
});

test('todos los temas del currículo caben en la dirección', () => {
  for (const topic of TOPICS) {
    const route = parseRoute(formatRoute({ tab: 'simulador', topic: { id: topic.id, tab: 'learn' } }));
    assert.equal(route.topic?.id, topic.id, topic.id);
  }
});
