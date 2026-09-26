import { useEffect, useMemo, useRef, useState } from 'react';
import { drawScene } from './projectileRenderer.js';
import { formatMeasure, sceneForExercise, scenarioOf } from './exerciseSimulation.js';

const SCENE_TEXT = {
  dron: 'El dron sigue la trayectoria indicada por los datos del ejercicio.',
  basketball: 'La pelota describe el arco indicado por los datos del lanzamiento.',
  wall: 'La pelota pasa (o no) por encima del paredón según los datos del lanzamiento.',
};
const SCENE_LABEL = { dron: 'Entrega en dron', basketball: 'Básquetbol', wall: 'Sobre el paredón' };
const SCENE_ARIA = {
  dron: 'Granja y dron',
  basketball: 'Cancha de básquetbol',
  wall: 'Patio con paredón',
};

export default function CanvasSimulator({ mission, submission }) {
  const exercise = mission?.exercise;
  const currentSubmission = submission?.exerciseId === exercise?.id ? submission : null;
  const scenario = scenarioOf(exercise);
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  // Leído por el bucle de dibujo (que corre fuera del ciclo de render): si la
  // respuesta escrita fue correcta, no si la trayectoria geométrica "cayó cerca".
  const verdictRef = useRef(null);
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
    if (!scene.flight) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let width = 0, height = 0, frameId = 0, startedAt = null;
    const draw = (now = 0) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, { width, height, flight: scene.flight, progress: progressRef.current, phase, now, scenario, verdict: verdictRef.current });
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
  }, [scene.flight, phase, scenario]);

  const replay = () => { if (currentSubmission && phase !== 'flying') { progressRef.current = 0; setPhase('flying'); } };
  const answer = currentSubmission ? formatMeasure(currentSubmission.answer) : '';
  const unit = exercise?.unit ?? '';
  const isCorrect = Boolean(currentSubmission?.result?.correct);
  const settled = currentSubmission && phase === 'landed';
  verdictRef.current = currentSubmission ? isCorrect : null;
  // El ángulo es el único dato que cambia la trayectoria dibujada: en esos
  // ejercicios "quedó a X m de la meta" describe algo real. En el resto la
  // escena siempre muestra el lanzamiento verdadero del ejercicio (para que
  // se pueda comparar), así que un cálculo mal hecho no mueve el dibujo.
  const isAngleDriven = exercise?.unit === '°';
  // La respuesta correcta exacta solo se muestra cuando el intento fue acertado;
  // si falló, se da una pista de dirección/desfasaje, nunca el valor esperado.
  const measured = formatMeasure(scene.measured);
  const offTarget = settled && isAngleDriven && !isCorrect && scene.flight
    ? Math.abs(scene.flight.error)
    : null;

  return <section ref={sectionRef} className="card simulator-card" aria-label={`Simulación del ejercicio ${exercise?.id ?? ''}`}>
    <div className="simulator-heading"><div><h2>Así se comprueba tu respuesta</h2><p className="simulator-status">{SCENE_TEXT[scenario]}</p></div><span className="simulator-target">{SCENE_LABEL[scenario]}</span></div>
    <canvas ref={canvasRef} className="simulator-canvas" role="img" aria-label={`${SCENE_ARIA[scenario]} para el ejercicio ${exercise?.id ?? ''}. ${phase === 'landed' ? `El recorrido termina a ${formatMeasure(scene.flight?.landingX)} metros.` : 'La trayectoria aparecerá al comprobar la respuesta.'}`}>Simulación del lanzamiento.</canvas>
    {!currentSubmission ? <p className="simulator-result">Escribí tu respuesta en el ejercicio de arriba y tocá “Comprobar con el simulador”.</p>
      : <div className={'simulator-check-result' + (phase === 'landed' ? (isCorrect ? ' is-hit' : ' is-miss') : '')} role="status" aria-live="polite">
        {phase === 'flying' ? <p>Comprobando tu respuesta con la simulación…</p> : <>
          <p className="simulator-verdict">{isCorrect ? '¡Tu respuesta coincide!' : 'Tu respuesta todavía no coincide.'}</p>
          {isCorrect
            ? <div className="simulator-comparison"><span>Escribiste <strong>{answer} {unit}</strong></span><span>El ejercicio muestra <strong>{measured} {unit}</strong></span></div>
            : <p className="simulator-miss-note">{isAngleDriven
                ? <>Escribiste <strong>{answer}{unit}</strong>{offTarget !== null ? `; con ese ángulo el lanzamiento hubiera quedado a ${formatMeasure(offTarget)} m de la meta.` : '.'} No te muestro el ángulo correcto: pedile una pista al tutor o volvé a calcular con los datos de arriba.</>
                : <>Escribiste <strong>{answer} {unit}</strong>. La escena siempre dibuja el lanzamiento real de este ejercicio para que compares tu cálculo con la trayectoria; no te muestro el valor correcto: pedile una pista al tutor o volvé a calcular con los datos de arriba.</>}</p>}
          {settled && isAngleDriven && <p>Con tu ángulo, el lanzamiento llegó a {formatMeasure(scene.flight.landingX)} m; la meta está a {formatMeasure(scene.flight.targetX)} m.</p>}
          {settled && scenario === 'wall' && scene.flight.obstacle && <p>{scene.flight.clearsObstacle ? 'Superó el paredón.' : 'No llegó a superar el paredón: probá con más altura.'}</p>}
        </>}
      </div>}
    {currentSubmission && <button type="button" className="btn btn-secondary simulator-replay" onClick={replay} disabled={phase === 'flying'}>Repetir simulación</button>}
    <p className="simulator-explainer">El vuelo se dibuja como movimiento parabólico ideal, sin resistencia del aire, para comparar tu respuesta con la trayectoria calculada.</p>
  </section>;
}
