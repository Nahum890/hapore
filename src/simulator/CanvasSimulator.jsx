import { useEffect, useMemo, useRef, useState } from 'react';
import { drawScene } from './projectileRenderer.js';
import { formatMeasure, sceneForExercise, scenarioOf } from './exerciseSimulation.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import Trajectory3D from './Trajectory3D.jsx';
import '../components/ChatWidget.css';

const SCENE_TEXT = { dron: 'sim.dronText', basketball: 'sim.basketballText', wall: 'sim.wallText' };
const SCENE_LABEL = { dron: 'scenario.dron', basketball: 'scenario.basketball', wall: 'sim.wallLabel' };
const SCENE_ARIA = { dron: 'sim.dronAria', basketball: 'sim.basketballAria', wall: 'sim.wallAria' };

export default function CanvasSimulator({ mission, submission }) {
  const { t, language } = useTranslation();
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
  const [view, setView] = useState('2d');
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
      drawScene(ctx, { width, height, flight: scene.flight, progress: progressRef.current, phase, now, scenario, verdict: verdictRef.current, language });
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
  }, [scene.flight, phase, scenario, language]);

  const replay = () => { if (currentSubmission && phase !== 'flying') { progressRef.current = 0; setPhase('flying'); } };
  const answer = currentSubmission ? formatMeasure(currentSubmission.answer) : '';
  const unit = exercise?.unit ?? '';
  const isCorrect = Boolean(currentSubmission?.result?.correct);
  const settled = currentSubmission && phase === 'landed';
  verdictRef.current = currentSubmission ? isCorrect : null;
  // sceneForExercise reconstruye un vuelo hipotético a partir de la propia
  // respuesta del alumno (componente, altura, tiempo, alcance o ángulo), así
  // que un cálculo mal hecho se ve realmente distinto en vez de dibujar
  // siempre el lanzamiento verdadero del ejercicio.
  const DRIVEN_CONCEPTS = ['componente-horizontal', 'componente-vertical', 'altura-maxima', 'tiempo-de-vuelo', 'alcance'];
  const answerDrivesFlight = exercise?.unit === '°' || DRIVEN_CONCEPTS.includes(exercise?.expectedConcept);
  // La respuesta correcta exacta solo se muestra cuando el intento fue acertado;
  // si falló, se da una pista de dirección/desfasaje, nunca el valor esperado.
  const measured = formatMeasure(scene.measured);
  const offTarget = settled && answerDrivesFlight && !isCorrect && scene.flight
    ? Math.abs(scene.flight.error)
    : null;

  return <section ref={sectionRef} className="card simulator-card" aria-label={t('sim.exerciseAria', { id: exercise?.id ?? '' })}>
    <div className="simulator-heading"><div><h2>{t('sim.heading')}</h2><p className="simulator-status">{t(SCENE_TEXT[scenario])}</p></div><span className="simulator-target">{t(SCENE_LABEL[scenario])}</span></div>
    <div className="chatw-toggle simulator-view-toggle" role="group" aria-label={t('chatw.viewLabel')}>
      {['2d', '3d'].map(item => <button key={item} type="button" className={view === item ? 'is-active' : ''} aria-pressed={view === item} onClick={() => setView(item)}>{t(`chatw.view.${item}`)}</button>)}
    </div>
    {view === '3d' && scene.flight && <Trajectory3D key={`${exercise?.id}-${currentSubmission?.id ?? 'idle'}`} series={[{ points: scene.flight.points, label: t(SCENE_LABEL[scenario]), color: isCorrect || !currentSubmission ? '#1d5bd8' : '#d97706' }]} />}
    <canvas hidden={view === '3d'} ref={canvasRef} className="simulator-canvas" role="img" aria-label={`${t(SCENE_ARIA[scenario])}. ${phase === 'landed' ? t('sim.canvasEnd', { x: formatMeasure(scene.flight?.landingX) }) : t('sim.canvasWaiting')}`}>{t('sim.canvasFallback')}</canvas>
    {!currentSubmission ? <p className="simulator-result">{t('sim.enterAnswer')}</p>
      : <div className={'simulator-check-result' + (phase === 'landed' ? (isCorrect ? ' is-hit' : ' is-miss') : '')} role="status" aria-live="polite">
        {phase === 'flying' ? <p>{t('sim.checking')}</p> : <>
          <p className="simulator-verdict">{t(isCorrect ? 'sim.match' : 'sim.notMatch')}</p>
          {isCorrect
            ? <div className="simulator-comparison"><span>{t('sim.youWrote')} <strong>{answer} {unit}</strong></span><span>{t('sim.exerciseShows')} <strong>{measured} {unit}</strong></span></div>
            : <p className="simulator-miss-note">{answerDrivesFlight
                ? t(offTarget !== null ? 'sim.missDrivenDistance' : 'sim.missDriven', { answer, unit, distance: formatMeasure(offTarget ?? 0) })
                : t('sim.missOriginal', { answer, unit })}</p>}
          {settled && answerDrivesFlight && <p>{t('sim.actualAndGoal', { actual: formatMeasure(scene.flight.landingX), target: formatMeasure(scene.flight.targetX) })}</p>}
          {settled && scenario === 'wall' && scene.flight.obstacle && <p>{t(scene.flight.clearsObstacle ? 'sim.clearedWall' : 'sim.missedWall')}</p>}
        </>}
      </div>}
    {currentSubmission && <button type="button" className="btn btn-secondary simulator-replay" onClick={replay} disabled={phase === 'flying'}>{t('sim.replay')}</button>}
    <p className="simulator-explainer">{t('sim.explainer')}</p>
  </section>;
}
