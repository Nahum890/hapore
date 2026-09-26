import { test } from 'node:test';
import assert from 'node:assert/strict';
import LocalAIProvider, { buildChatPayload } from '../src/ai/LocalAIProvider.js';
import RuleTutorProvider, { obtenerVariantePista } from '../src/ai/RuleTutorProvider.js';
import { matchAnswer, matchText, buildQuiz, evaluateQuizContext } from '../src/ai/quizEngine.js';
import quizBank from '../src/ai/quizBank.json' with { type: 'json' };

const question = quizBank.find(item => item.tipo === 'abierta');
const offline = new RuleTutorProvider();

test('la consulta libre y el enunciado llegan dentro del contexto pedagógico', () => {
  const payload = buildChatPayload({tipo:'charla_libre',message:'¿Por qué cae el dron?',pregunta:'¿Qué fuerza actúa?',exerciseId:'ej-01'});
  assert.equal(payload.context.message,payload.message);
  assert.equal(payload.context.pregunta,'¿Qué fuerza actúa?');
  assert.equal(payload.context.ejercicio,'ej-01');
});

test('un timeout con conexión cae al tutor local en vez de dejar al alumno sin respuesta',async()=>{
  // Decisión de producto actualizada: antes, un fallo online mostraba un
  // error de Gemini y nunca probaba el tutor local aunque estuviera
  // disponible. Ahora el pedido es que cualquier falla online (no solo estar
  // realmente sin conexión) pase directamente al chatbot local, etiquetado
  // como tal (source: 'rules'), nunca presentado como si fuera Gemini.
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  let fallbackCalls=0;
  const provider=new LocalAIProvider({timeoutMs:35,maxRetries:0,fetch:()=>new Promise(()=>{}),fallback:{respond:async()=>{fallbackCalls++;return offline.respond({tipo:'charla_libre',message:'parábola'});}}});
  try {
    const start=performance.now();
    const result=await provider.respond({tipo:'evaluacion_cuestionario',pregunta:'¿Qué es una parábola?',esCorrecta:true,respuestaCorrecta:'Una parábola'});
    assert.ok(performance.now()-start<250);
    assert.equal(result.available,true);
    assert.equal(result.source,'rules');
    assert.notEqual(result.source,'gemini');
    assert.equal(fallbackCalls,1);
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'navigator',descriptor); else delete globalThis.navigator;
  }
});

test('si el tutor local tampoco puede responder, recién ahí se explica la falla online',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  const provider=new LocalAIProvider({timeoutMs:35,maxRetries:0,fetch:()=>new Promise(()=>{}),fallback:{respond:async()=>({message:''})}});
  try {
    const result=await provider.respond({tipo:'charla_libre',message:'algo'});
    assert.equal(result.available,false);
    assert.equal(result.reason,'online-unavailable');
    assert.match(result.message,/Gemini/);
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'navigator',descriptor); else delete globalThis.navigator;
  }
});

test('reintenta 429 con pausa exponencial y conserva el contexto',async()=>{
  let count=0,payload;
  const provider=new LocalAIProvider({timeoutMs:1000,retryDelayMs:1,fetch:async(_url,options)=>{count++;payload=JSON.parse(options.body);return count===1?new Response('',{status:429}):Response.json({text:'Respuesta útil'});}});
  const result=await provider.respond({tipo:'charla_libre',message:'¿Qué es gravedad?'});
  assert.equal(count,2);
  assert.equal(result.message,'Respuesta útil');
  assert.equal(payload.context.message,'¿Qué es gravedad?');
});

test('streaming muestra texto parcial y sanitiza al completar',async()=>{
  const encoder=new TextEncoder();
  const stream=new ReadableStream({start(controller){
    controller.enqueue(encoder.encode('data: {"text":"La "}\n\n'));
    controller.enqueue(encoder.encode('data: {"text":"La gravedad"}\n\n'));
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }});
  const seen=[];
  const provider=new LocalAIProvider({fetch:async()=>new Response(stream,{headers:{'content-type':'text/event-stream'}})});
  const result=await provider.respond({tipo:'charla_libre',message:'Pregunta',onToken:text=>seen.push(text)});
  assert.deepEqual(seen,['La','La gravedad']);
  assert.equal(result.message,'La gravedad');
});

test('el tutor local corrige el cuestionario y responde temas fuera de la red',async()=>{
  const correction=await offline.respond({tipo:'evaluacion_cuestionario',esCorrecta:true,respuestaCorrecta:'Parábola',respuestaAlumno:'Parábola'});
  assert.equal(correction.correct,true);
  const answer=await offline.respond({tipo:'charla_libre',message:'¿Qué es la gravedad?'});
  assert.ok(answer.message.length>20);
  assert.ok(!answer.message.includes('fallbackHint'));
});

test('el chat offline recupera explicaciones del temario por concepto',async()=>{
  const answer=await offline.respond({tipo:'charla_libre',message:'¿Me explicás qué es la altura máxima?'});
  assert.equal(answer.knowledgeType,'concept');
  assert.match(answer.message,/altura máxima/i);
  const unknown=await offline.respond({tipo:'charla_libre',message:'¿Cómo se programa una aplicación móvil?'});
  assert.match(unknown.message,/material offline/i);
});

test('el tutor ofrece cuatro pistas progresivas para un ejercicio',async()=>{
  const exercise=offline.exercises.find(item=>item.id==='ej-01');
  const hints=[];
  for(let hintLevel=1;hintLevel<=4;hintLevel++){
    const response=await offline.respond({type:'hint',exercise,exerciseId:exercise.id,expectedConcept:exercise.expectedConcept,hintLevel});
    hints.push(response.message);
  }
  assert.equal(hints.length,4);
  assert.ok(hints.every(message=>message.length>15));
  assert.match(hints[3],/17,32|17\.32/);
});

test('matcheo acepta sinónimos, conserva umbrales y rechaza contradicciones',()=>{
  assert.equal(matchText('La rapidez no cambia','La rapidez permanece constante').correct,true);
  assert.equal(matchAnswer(question,question.respuesta).correct,true);
  assert.equal(matchText('La velocidad cambia','La velocidad no cambia').correct,false);
  assert.equal(matchText('La rapidez disminuye','La rapidez no cambia',{correctThreshold:0.4}).correct,false);
  assert.equal(evaluateQuizContext({esCorrecta:true,esVerdadero:false,marcadoVerdadero:false}).correct,true);
  assert.equal(evaluateQuizContext({esCorrecta:false,esVerdadero:false,marcadoVerdadero:false}).correct,false);
});

test('mazo no duplica IDs ni excede la cantidad solicitada',()=>{
  const duplicated=[question,question,{...question,id:'otro'}];
  const built=buildQuiz(duplicated,50);
  assert.equal(built.length,2);
  assert.equal(buildQuiz(duplicated,0).length,0);
});

test('las variantes evitan repetir la pista anterior cuando hay opciones',()=>{
  assert.equal(obtenerVariantePista(['una','otra'],'una'),'otra');
});
