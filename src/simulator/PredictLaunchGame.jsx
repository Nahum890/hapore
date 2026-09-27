import { useEffect, useMemo, useRef, useState } from 'react';
import { planFlight } from './flightPlan.js';
import { drawScene } from './projectileRenderer.js';
import { formatMeasure } from './exerciseSimulation.js';
import { validateAnswer } from '../physics/physicsValidator.js';
import { isNumericAnswer } from '../components/ExerciseCard.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import ParabolicGames from '../games/parabolic/ParabolicGames.jsx';
import './PredictLaunchGame.css';

// Minijuego "predecí → lanzá → observá → corregí". Reutiliza el mismo motor
// físico (flightPlan/planFlight) y el mismo canvas (projectileRenderer) que el
// simulador ligado a los ejercicios. La pregunta es siempre "¿a cuántos metros
// cae?", así que solo se usan escenas donde se sale y se llega al suelo.
const SCENARIOS = [
  { id: 'dron', obstacle: null },
  { id: 'wall', obstacle: { x: 8, height: 1.5 } },
];
// La predicción es una estimación antes de ver el resultado, no una respuesta
// de examen: tolerancia más amplia (12 %) que la de los ejercicios (1 %).
const GUESS_TOLERANCE = 0.12;

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function newRound() {
  return {
    scenario: SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)],
    v0: randomBetween(14, 26),
    angle: randomBetween(25, 65),
    gravity: 9.8,
    key: Date.now() + Math.random(),
  };
}

export default function PredictLaunchGame() {
  const { t, language } = useTranslation();
  const [activeMode, setActiveMode] = useState('predict'); // 'predict' | 'challenges'
  const [round, setRound] = useState(newRound);
  const [prediction, setPrediction] = useState('');
  const [phase, setPhase] = useState('predicting'); // predicting -> flying -> result
  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  // Causa del dibujo roto: antes se pasaba targetX = 9999 y el renderizador
  // escalaba la escena a ~11 km, así que la parábola quedaba como un punto
  // pegado al borde. Ahora el "objetivo" es el propio punto de caída: la
  // escena se ajusta al vuelo real y la marca de llegada se oculta hasta que
  // el proyectil aterriza, para no delatar la respuesta.
  const flight = useMemo(() => {
    const base = { speed: round.v0, angle: round.angle, gravity: round.gravity, targetY: 0, y0: 0, obstacle: round.scenario.obstacle };
    const probe = planFlight({ ...base, targetX: 10 });
    return planFlight({ ...base, targetX: probe.landingX });
  }, [round]);

  const result = useMemo(() => {
    if (phase !== 'result') return null;
    return validateAnswer(flight.landingX, prediction, { tolerance: GUESS_TOLERANCE, unit: 'm' });
  }, [phase, flight.landingX, prediction]);
  const guessX = result ? Number(result.student) : null;

  useEffect(() => {
    if (activeMode !== 'predict') return undefined;
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
        hideTarget: phase !== 'result', guessX, guessLabel: t('game.guessMark'),
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
  }, [flight, phase, round.scenario.id, result, activeMode, guessX, t]);

  const canLaunch = isNumericAnswer(prediction);
  const launch = () => { if (canLaunch) setPhase('flying'); };
  const retry = () => { setRound(newRound()); setPrediction(''); progressRef.current = 0; setPhase('predicting'); };

  const feedbackKey = !result ? null : result.correct ? 'game.correct' : result.reason === 'out-of-tolerance' && result.diff <= result.toleranceAbs * 2 ? 'game.close' : 'game.incorrect';
  const scenarioName = t(`scenario.${round.scenario.id}`);

  return (
    <div className="predict-game-wrapper">
      <div className="predict-mode-switch" role="tablist" aria-label={t('game.modeLabel')}>
        <button type="button" role="tab" aria-selected={activeMode === 'predict'} className={activeMode === 'predict' ? 'is-active' : ''} onClick={() => setActiveMode('predict')}>{t('game.title')}</button>
        <button type="button" role="tab" aria-selected={activeMode === 'challenges'} className={activeMode === 'challenges' ? 'is-active' : ''} onClick={() => setActiveMode('challenges')}>{t('game.challenges')}</button>
      </div>

      {activeMode === 'challenges' ? (
        <ParabolicGames language={language} />
      ) : (
        <section className="card predict-game" aria-label={t('game.title')}>
          <header className="predict-head">
            <h2>{t('game.title')}</h2>
            <p>{t('game.intro')}</p>
          </header>
          <ol className="predict-steps" aria-hidden="true">
            <li className={phase === 'predicting' ? 'is-current' : ''}>{t('game.step1')}</li>
            <li className={phase === 'predicting' ? 'is-current' : ''}>{t('game.step2')}</li>
            <li className={phase !== 'predicting' ? 'is-current' : ''}>{t('game.step3')}</li>
          </ol>
          <div className="values-chips">
            <span className="chip chip-data"><small>{t('value.v0')}</small><strong>{round.v0} m/s</strong></span>
            <span className="chip chip-data"><small>{t('value.angle')}</small><strong>{round.angle}°</strong></span>
            <span className="chip chip-data"><small>{t('value.gravity')}</small><strong>{round.gravity} m/s²</strong></span>
            <span className="chip chip-topic">{scenarioName}</span>
          </div>
          <div className="predict-canvas-frame">
            <canvas ref={canvasRef} className="simulator-canvas predict-canvas" role="img" aria-label={`${scenarioName}. ${phase === 'result' ? t('game.canvasEnd', { x: formatMeasure(flight.landingX) }) : t('game.canvasWaiting')}`} />
          </div>
          {phase === 'predicting' && (
            <form className="predict-form" onSubmit={event => { event.preventDefault(); launch(); }}>
              <label htmlFor="predict-guess">{t('game.predictLabel')}</label>
              <div className="predict-input-row">
                <input id="predict-guess" className="quiz-input" type="text" inputMode="decimal" autoComplete="off" value={prediction} onChange={event => setPrediction(event.target.value)} placeholder={t('game.placeholder')} />
                <span className="predict-unit">m</span>
                <button type="submit" className="btn btn-primary" disabled={!canLaunch}>{t('game.launch')}</button>
              </div>
            </form>
          )}
          {phase === 'flying' && <p className="simulator-status" role="status">{t('game.flying')}</p>}
          {phase === 'result' && result && (
            <div className={'feedback predict-feedback ' + (result.correct ? 'correct' : 'incorrect')} role="status">
              <strong>{t(feedbackKey)}</strong>
              <span>{t('game.yourGuess')}: {formatMeasure(result.student)} m · {t('game.result')} {formatMeasure(result.expected)} m.</span>
              {round.scenario.obstacle && <span>{t(flight.clearsObstacle ? 'game.cleared' : 'game.notCleared')}</span>}
              <button type="button" className="btn btn-secondary" onClick={retry}>{t('game.retry')}</button>
            </div>
          )}
          <p className="simulator-explainer">{t('game.explainer')}</p>
        </section>
      )}
    </div>
  );
}
