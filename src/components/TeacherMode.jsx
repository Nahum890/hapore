import { lazy, Suspense, useMemo, useState } from 'react';
const TeacherProjector = lazy(() => import('./TeacherProjector.jsx'));
import { encodeClassConfig, decodeClassConfig, scenarioMatchesConfig } from '../utils/classCode.js';
import { exercises, flashcards as flashcardsData, quizBank } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import CustomExerciseForm from './CustomExerciseForm.jsx';
import StudentRoster from './StudentRoster.jsx';
import { registerClassCode } from '../utils/classroom.js';
const SUBTEMAS = [{id:'dron',label:'Entregas en dron'},{id:'basketball',label:'Tiros de básquetbol'},{id:'wall',label:'Pelota sobre el paredón'}];
export function validClassCode(text) {
  const code = String(text ?? '').trim().toUpperCase();
  const config = decodeClassConfig(code);
  return config && encodeClassConfig(config) === code ? config : null;
}
function ConfigSummary({ config, applied = false, allExercises = exercises }) {
  // Las tarjetas y preguntas teóricas son de repaso general (no dependen de
  // la situación elegida); solo los ejercicios prácticos se filtran por ella.
  const cards = flashcardsData.length + quizBank.filter(item => item.tipo === 'abierta').length;
  const available = allExercises.filter(item => scenarioMatchesConfig(item.scenario, config.subtemas)).length;
  return <div className="class-summary" role="status" aria-live="polite"><h3>{applied ? 'Configuración aplicada' : 'Vista previa de la clase'}</h3><p>{SUBTEMAS.filter(item=>config.subtemas.includes(item.id)).map(item=>item.label).join(' · ') || 'Elegí al menos una situación.'}</p><dl><div><dt>Tarjetas de repaso</dt><dd>{Math.min(config.flashcards || 0,cards)} de {cards} disponibles</dd></div><div><dt>Ejercicios prácticos</dt><dd>{Math.min(config.ejercicios || 0,available)} de {available} disponibles</dd></div></dl>{(config.flashcards > cards || config.ejercicios > available) && <p className="field-help">Se usará el contenido disponible de las situaciones elegidas.</p>}</div>;
}
export default function TeacherMode({ attempts = 0, xp = 0, classConfig, onJoinClass, teacherId }) {
  const [customExercises, setCustomExercises] = useState(getCustomExercises);
  const refreshCustomExercises = () => setCustomExercises(getCustomExercises());
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises]);
  return <>
    <section className="card teacher-mode" aria-label="Modo docente y clase"><h2>Tu aula, también sin conexión</h2><p className="teacher-note">Compartí un código para que cada estudiante aplique la misma configuración en su dispositivo.</p><div className="teacher-metrics"><span><strong>{attempts}</strong> intentos</span><span><strong>{Number(xp)||0}</strong> XP</span></div>
      {classConfig ? <div className="teacher-block"><ConfigSummary config={classConfig} applied allExercises={allExercises} /><p className="class-code-display">Código de clase: <strong>{encodeClassConfig(classConfig)}</strong></p><button type="button" className="btn btn-secondary" onClick={()=>onJoinClass?.(null)}>Salir de la clase</button></div> : <TeacherControls onJoinClass={onJoinClass} allExercises={allExercises} teacherId={teacherId} />}
    </section>
    <StudentRoster teacherId={teacherId} />
    <section className="card" aria-label="Tus propios ejercicios">
      <h2>Ejercicios propios</h2>
      <p className="teacher-note">Cargá tus propios datos; la respuesta correcta se calcula sola con el mismo motor físico de la app. Quedan guardados en este dispositivo, disponibles para practicar y para el proyector.</p>
      <CustomExerciseForm exercises={customExercises} onChange={refreshCustomExercises} />
    </section>
    <section className="projector-section" aria-label="Proyector de aula">
      <h3>Proyector de aula</h3>
      <p className="teacher-note">Proyectá un concepto, o elegí un ejercicio, revisá la vista previa y mostrá su simulador cuando estés listo para tu clase.</p>
      <Suspense fallback={<p className="teacher-note">Cargando proyector…</p>}><TeacherProjector attempts={attempts} xp={xp} exercises={allExercises} /></Suspense>
    </section>
  </>;
}
function TeacherControls({onJoinClass, allExercises = exercises, teacherId}) {
  const [flashcards,setFlashcards]=useState(10), [ejercicios,setEjercicios]=useState(3), [subtemas,setSubtemas]=useState(['dron','basketball','wall']);
  const [generated,setGenerated]=useState(false), [error,setError]=useState(''), [copied,setCopied]=useState(false);
  const config=useMemo(()=>({flashcards:Number(flashcards),ejercicios:Number(ejercicios),subtemas}),[flashcards,ejercicios,subtemas]);
  const valid=Number.isInteger(config.flashcards)&&config.flashcards>=5&&config.flashcards<=20&&Number.isInteger(config.ejercicios)&&config.ejercicios>=1&&config.ejercicios<=10&&subtemas.length>0;
  const code=valid?encodeClassConfig(config):'';
  const toggle=id=>{setCopied(false);setSubtemas(previous=>previous.includes(id)?previous.filter(item=>item!==id):[...previous,id]);};
  const copy=async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setError('No se pudo copiar. Podés seleccionar el código y copiarlo.');}};
  return <div className="teacher-stack">
    <form className="teacher-block" onSubmit={event=>{event.preventDefault();if(valid){setGenerated(true);setCopied(false);}}}>
      <h3>Preparar una clase</h3>
      <label className="teacher-field">Tarjetas por repaso (5 a 20)<input className="quiz-input" type="number" min="5" max="20" step="1" required value={flashcards} onChange={event=>{setFlashcards(event.target.value);setCopied(false);}} /></label>
      <fieldset className="teacher-subtemas"><legend>Situaciones para practicar</legend>{SUBTEMAS.map(item=><label key={item.id} className={`teacher-subtema ${subtemas.includes(item.id) ? 'is-selected' : ''}`}><input type="checkbox" checked={subtemas.includes(item.id)} onChange={()=>toggle(item.id)} />{item.label}</label>)}</fieldset>
      <label className="teacher-field">Ejercicios prácticos (1 a 10)<input className="quiz-input" type="number" min="1" max="10" step="1" required value={ejercicios} onChange={event=>{setEjercicios(event.target.value);setCopied(false);}} /></label>
      <ConfigSummary config={config} allExercises={allExercises} />
      {!subtemas.length && <p className="field-error">Seleccioná al menos una situación.</p>}
      <button type="submit" className="btn btn-primary" disabled={!valid} onClick={()=>{if(valid) registerClassCode({teacherId, code, config});}}>Generar código de clase</button>
      {generated&&valid&&<><p className="class-code-display">Código para compartir: <strong>{code}</strong></p><div className="class-actions"><button type="button" className="btn btn-secondary" onClick={copy}>{copied?'Copiado':'Copiar código'}</button><button type="button" className="btn btn-primary" onClick={()=>onJoinClass?.(config)}>Aplicar en este dispositivo</button></div></>}
    </form>
    {error&&<p className="teacher-error" role="alert">{error}</p>}
  </div>;
}
