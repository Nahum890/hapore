import { useEffect, useMemo, useRef, useState } from 'react';
import { planFlight } from './flightPlan.js';
import { drawScene } from './projectileRenderer.js';
import { formatMeasure } from './exerciseSimulation.js';
import { validateAnswer } from '../physics/physicsValidator.js';
import { isNumericAnswer } from '../components/ExerciseCard.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

// Minijuego "predecí → lanzá → observá → corregí" de Movimiento Parabólico.
// Reutiliza el mismo motor físico (flightPlan/planFlight) y el mismo canvas
// (projectileRenderer/drawScene) que el simulador ligado a los ejercicios;
// no calcula ninguna fórmula nueva.
const SCENARIOS = [
  { id: 'dron', label: 'Dron', obstacle: null },
  { id: 'basketball', label: 'Básquetbol', obstacle: null },
  { id: 'wall', label: 'Pelota sobre el paredón', obstacle: { x: 8, height: 1.5 } },
];
// La predicción es una estimación antes de ver el resultado, no una respuesta
// de examen: se usa una tolerancia más amplia que la de los ejercicios
// calificados (1%), justificada porque acá se evalúa el criterio del alumno
// sobre el orden de magnitud del alcance, no un cálculo exacto.
const GUESS_TOLERANCE = 0.12;

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function newRound() {
  const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  return { scenario, v0: randomBetween(14, 26), angle: randomBetween(25, 65), gravity: 9.8, key: Date.now() + Math.random() };
}

export default function PredictLaunchGame() {
  const { t, language } = useTranslation();
  const [round, setRound] = useState(newRound);
  const [prediction, setPrediction] = useState('');
  const [phase, setPhase] = useState('predicting'); // predicting -> flying -> result
  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  const flight = useMemo(
    () => planFlight({ speed: round.v0, angle: round.angle, gravity: round.gravity, targetX: 9999, obstacle: round.scenario.obstacle }),
    [round],
  );

  const result = useMemo(() => {
    if (phase !== 'result') return null;
    return validateAnswer(flight.landingX, prediction, { tolerance: GUESS_TOLERANCE, unit: 'm' });
  }, [phase, flight.landingX, prediction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let width = 0, height = 0, frameId = 0, startedAt = null;
    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, {
        width, height, flight, progress: progressRef.current,
        phase: phase === 'flying' ? 'flying' : phase === 'result' ? 'landed' : 'idle',
        now: 0, scenario: round.scenario.id, verdict: result ? result.correct : null,
      });
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
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) { progressRef.current = 1; draw(); setPhase('result'); }
      else {
        const durationMs = Math.min(4200, Math.max(2200, flight.duration * 800));
        const tick = (now) => {
          if (startedAt === null) startedAt = now;
          progressRef.current = Math.min(1, (now - startedAt) / durationMs);
          draw();
          if (progressRef.current < 1) frameId = requestAnimationFrame(tick);
          else setPhase('result');
        };
        frameId = requestAnimationFrame(tick);
      }
    } else {
      progressRef.current = phase === 'result' ? 1 : 0;
      draw();
    }
    return () => { cancelAnimationFrame(frameId); observer.disconnect(); };
  }, [flight, phase, round.scenario.id, result]);

  const canLaunch = isNumericAnswer(prediction);
  const launch = () => { if (canLaunch) setPhase('flying'); };
  const retry = () => { setRound(newRound()); setPrediction(''); progressRef.current = 0; setPhase('predicting'); };

  const feedbackKey = !result ? null : result.correct ? 'game.correct' : result.reason === 'out-of-tolerance' && result.diff <= result.toleranceAbs * 2 ? 'game.close' : 'game.incorrect';

  return (
    <section className="card predict-game" aria-label={t('game.title')}>
      <h2>{t('game.title')}</h2>
      <p className="teacher-note">{t('game.intro')}</p>
      <div className="values-chips">
        <span className="chip chip-data"><small>Velocidad inicial</small><strong>{round.v0} m/s</strong></span>
        <span className="chip chip-data"><small>Ángulo</small><strong>{round.angle}°</strong></span>
        <span className="chip chip-data"><small>Gravedad</small><strong>{round.gravity} m/s²</strong></span>
        <span className="chip chip-topic">{round.scenario.label}</span>
      </div>
      <canvas ref={canvasRef} className="simulator-canvas" role="img" aria-label={`${round.scenario.label}. ${phase === 'result' ? `El recorrido termina a ${formatMeasure(flight.landingX)} metros.` : 'La trayectoria aparecerá al lanzar.'}`}>
        Simulación del minijuego.
      </canvas>
      {phase === 'predicting' && (
        <form className="quiz-justification" onSubmit={event => { event.preventDefault(); launch(); }}>
          <label className="answer-label" htmlFor="predict-guess">{t('game.predictLabel')} (m)</label>
          <input id="predict-guess" className="quiz-input" type="text" inputMode="decimal" autoComplete="off" value={prediction} onChange={event => setPrediction(event.target.value)} placeholder="Escribí un número" />
          <button type="submit" className="btn btn-primary" disabled={!canLaunch}>{t('game.launch')}</button>
        </form>
      )}
      {phase === 'flying' && <p className="simulator-status" role="status">…</p>}
      {phase === 'result' && result && (
        <div className={'feedback ' + (result.correct ? 'correct' : 'incorrect')} role="status">
          <strong>{t(feedbackKey)}</strong>
          <span>{t('game.yourGuess')}: {formatMeasure(result.student)} m · {t('game.result')} {formatMeasure(result.expected)} m.</span>
          <button type="button" className="btn btn-secondary" onClick={retry}>{t('game.retry')}</button>
        </div>
      )}
      {round.scenario.obstacle && phase === 'result' && (
        <p className="teacher-note">{flight.clearsObstacle ? 'Superó el paredón.' : 'No llegó a superar el paredón.'}</p>
      )}
      <p className="simulator-explainer">Movimiento parabólico ideal, sin resistencia del aire: {language === 'es' ? 'la predicción se compara con el cálculo, no con una medición real.' : 'ojejoja ne predicción cálculo reheve, ndaha\'éi medición real reheve.'}</p>
    </section>
  );
}
