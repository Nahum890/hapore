import { useEffect, useMemo, useRef, useState } from 'react';
import { drawScene } from './projectileRenderer.js';
import { formatMeasure, sceneForExercise } from './exerciseSimulation.js';
import ConceptScene from './ConceptScene.jsx';

const SCENE_TEXT = {
  'Movimiento Parabólico': 'El dron sigue la trayectoria indicada por los datos del ejercicio.',
  Cinemática: 'El recorrido muestra cómo cambia la posición durante el tiempo del ejercicio.',
  Vectores: 'Las flechas muestran cómo se combinan dirección y sentido.',
  'Ley de Hooke': 'El resorte y la caja muestran la relación entre fuerza y deformación.',
  'Termodinámica': 'La escena muestra el intercambio de calor y el cambio de temperatura de este ejercicio.',
  'Óptica': 'Los rayos y el espejo cambian según el fenómeno y los datos de este ejercicio.',
};

export default function CanvasSimulator({ mission, submission }) {
  const exercise = mission?.exercise;
  const currentSubmission = submission?.exerciseId === exercise?.id ? submission : null;
  const isParabolic = exercise?.topic === 'Movimiento Parabólico';
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState('idle');
  const scene = useMemo(() => sceneForExercise(exercise, currentSubmission?.answer), [exercise, currentSubmission?.answer]);

  useEffect(() => { progressRef.current = 0; setPhase('idle'); }, [exercise?.id]);
  useEffect(() => {
    if (!currentSubmission) { progressRef.current = 0; setPhase('idle'); return; }
    progressRef.current = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase(reduced ? 'landed' : 'flying');
    sectionRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [currentSubmission?.id, exercise?.id]);

  useEffect(() => {
    if (isParabolic || phase !== 'flying') return undefined;
    const timer = setTimeout(() => setPhase('landed'), 1900);
    return () => clearTimeout(timer);
  }, [isParabolic, phase, currentSubmission?.id]);

  useEffect(() => {
    if (!isParabolic || !scene.flight) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let width = 0, height = 0, frameId = 0, startedAt = null;
    const draw = (now = 0) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, { width, height, flight: scene.flight, progress: progressRef.current, phase, now });
    };
    const resize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    if (phase === 'flying') {
      const durationMs = Math.min(4200, Math.max(2200, scene.flight.duration * 800));
      const tick = now => {
        if (startedAt === null) startedAt = now;
        progressRef.current = Math.min(1, (now - startedAt) / durationMs);
        draw(now);
        if (progressRef.current < 1) frameId = requestAnimationFrame(tick);
        else setPhase('landed');
      };
      frameId = requestAnimationFrame(tick);
    } else { progressRef.current = phase === 'landed' ? 1 : 0; draw(); }
    return () => { cancelAnimationFrame(frameId); observer.disconnect(); };
  }, [isParabolic, scene.flight, phase]);

  const replay = () => { if (currentSubmission && phase !== 'flying') { progressRef.current = 0; setPhase('flying'); } };
  const measured = formatMeasure(scene.measured);
  const answer = currentSubmission ? formatMeasure(currentSubmission.answer) : '';
  const unit = exercise?.unit ?? '';

  return <section ref={sectionRef} className="card simulator-card" aria-label={`Simulación del ejercicio ${exercise?.id ?? ''}`}>
    <div className="simulator-heading"><div><h2>Así se comprueba tu respuesta</h2><p className="simulator-status">{SCENE_TEXT[exercise?.topic] ?? 'La visualización usa los datos del ejercicio de arriba.'}</p></div><span className="simulator-target">{exercise?.topic}</span></div>
    {isParabolic
      ? <canvas ref={canvasRef} className="simulator-canvas" role="img" aria-label={`Granja y dron para el ejercicio ${exercise.id}. ${phase === 'landed' ? `El recorrido termina a ${formatMeasure(scene.flight.landingX)} metros.` : 'La trayectoria aparecerá al comprobar la respuesta.'}`}>Simulación del vuelo del dron.</canvas>
      : <ConceptScene exercise={exercise} phase={phase} submissionId={currentSubmission?.id} />}
    {!currentSubmission ? <p className="simulator-result">Escribí tu respuesta en el ejercicio de arriba y tocá “Comprobar con el simulador”.</p>
      : <div className={'simulator-check-result' + (phase === 'landed' ? (currentSubmission.result.correct ? ' is-hit' : ' is-miss') : '')} role="status" aria-live="polite">
        {phase === 'flying' ? <p>Comprobando tu respuesta con la simulación…</p> : <>
          <p className="simulator-verdict">{currentSubmission.result.correct ? '¡Tu respuesta coincide!' : 'Tu respuesta todavía no coincide.'}</p>
          <div className="simulator-comparison"><span>Escribiste <strong>{answer} {unit}</strong></span><span>El ejercicio muestra <strong>{measured} {unit}</strong></span></div>
          {isParabolic && exercise.unit === '°' && <p>Con tu ángulo, el paquete llegó a {formatMeasure(scene.flight.landingX)} m; la entrega está a {formatMeasure(scene.flight.targetX)} m.</p>}
          {!currentSubmission.result.correct && <p>Revisá los datos del ejercicio y pedile una pista al tutor si la necesitás.</p>}
        </>}
      </div>}
    {currentSubmission && <button type="button" className="btn btn-secondary simulator-replay" onClick={replay} disabled={phase === 'flying'}>Repetir simulación</button>}
    <p className="simulator-explainer">{isParabolic ? 'El vuelo se dibuja como movimiento parabólico ideal, sin motor, para comparar la respuesta con la trayectoria.' : 'La escena y el resultado se calculan con los datos del ejercicio seleccionado; el modelo usa las condiciones indicadas en el enunciado.'}</p>
  </section>;
}
