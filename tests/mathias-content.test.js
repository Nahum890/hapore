import { test } from 'node:test';
import assert from 'node:assert/strict';
import exercises from '../src/data/exercises.json' with { type: 'json' };
import cards from '../src/data/flashcards.json' with { type: 'json' };
import concepts from '../src/data/concepts.json' with { type: 'json' };
import tutor from '../src/data/tutor_jopara.json' with { type: 'json' };
import { temaMatchesSubtemas, encodeClassConfig, decodeClassConfig } from '../src/utils/classCode.js';
import { validateExercise } from '../src/physics/physicsValidator.js';

for(const [label,rows] of Object.entries({exercises,cards,concepts})) test(label+' tiene IDs únicos',()=>assert.equal(new Set(rows.map(item=>item.id)).size,rows.length));
for(const topic of ['Movimiento Parabólico','Cinemática','Vectores','Ley de Hooke']) test(topic+' tiene ejercicios y tarjetas',()=>{
  assert.ok(exercises.filter(item=>item.topic===topic).length>=3);
  assert.ok(cards.filter(item=>item.topic===topic).length>=4);
});
test('los ejercicios nuevos aceptan su resultado y conservan pistas y unidades',()=>{
  for(const item of exercises){
    assert.ok(item.hints?.length>=3,item.id);
    assert.ok(concepts.some(concept=>concept.id===item.expectedConcept),item.id);
    assert.equal(validateExercise(item,String(item.correctAnswer)).correct,true,item.id);
    assert.ok(item.unit,item.id);
  }
});
test('el código de aula selecciona contenido real de todos los temas',()=>{
  for(const subtemas of [['parabolico'],['cinematica'],['vectores'],['hooke']]){
    const decoded=decodeClassConfig(encodeClassConfig({flashcards:10,ejercicios:3,subtemas}));
    assert.ok(decoded);
    assert.ok(exercises.filter(item=>temaMatchesSubtemas(item.topic,decoded.subtemas)).length>=3);
  }
});
test('se mantiene la revisión lingüística pendiente',()=>{
  assert.match(tutor._reviewNote,/pendient/i);
  assert.ok(tutor.hintLevels?.byConcept?.['ley-hooke']);
});
