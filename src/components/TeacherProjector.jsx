import { useMemo, useState } from 'react';
import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  range,
  timeOfFlight,
} from '../physics/projectileMotion.js';
import { exercises as builtInExercises, concepts } from '../data/catalogs.js';
import { generateGuaraniaPdf } from './PrintableSheet.jsx';

const SCENARIO_LABELS = { dron: 'Dron', basketball: 'Básquetbol', wall: 'Pelota sobre el paredón' };

export default function TeacherProjector({ attempts = 0, xp = 0, exercises: exercisesProp }) {
  const exercisesData = exercisesProp ?? builtInExercises;
  // Qué mostrarle a la clase: un ejercicio con su simulador, o un concepto en
  // formato grande para proyectar.
  const [displayMode, setDisplayMode] = useState('ejercicio');
  const [selectedConceptId, setSelectedConceptId] = useState(concepts[0]?.id ?? '');
  const selectedConcept = concepts.find((item) => item.id === selectedConceptId) ?? null;
  // Parámetros de simulación en vivo
  const [v0, setV0] = useState(20);
  const [angle, setAngle] = useState(30);
  const [gravity, setGravity] = useState(10);
  // Elegir un ejercicio solo carga su vista previa; recién "Proyectar este
  // ejercicio" aplica sus valores a la simulación que ve la clase.
  const [selectedExerciseId, setSelectedExerciseId] = useState('ej-01');
  const [projectedExerciseId, setProjectedExerciseId] = useState(null);
  const previewExercise = exercisesData.find((item) => item.id === selectedExerciseId) ?? exercisesData[0] ?? null;

  // Trayectoria de referencia A para comparación simultánea (ej. 30° vs 60°)
  const [referenceLaunch, setReferenceLaunch] = useState(null);

  // Cálculo del lanzamiento actual
  const currentLaunch = useMemo(
    () => createLaunch(Number(v0), Number(angle), { gravity: Number(gravity) }),
    [v0, angle, gravity],
  );

  const currentPoints = useMemo(
    () => evaluateTrajectory(currentLaunch, { step: 0.04 }),
    [currentLaunch],
  );

  const currentT = useMemo(() => timeOfFlight(currentLaunch), [currentLaunch]);
  const currentH = useMemo(() => maxHeight(currentLaunch), [currentLaunch]);
  const currentR = useMemo(() => range(currentLaunch), [currentLaunch]);

  // Trayectoria de referencia A (si está fijada)
  const refPoints = useMemo(() => {
    if (!referenceLaunch) return null;
    return evaluateTrajectory(referenceLaunch, { step: 0.04 });
  }, [referenceLaunch]);

  const refT = referenceLaunch ? timeOfFlight(referenceLaunch) : 0;
  const refH = referenceLaunch ? maxHeight(referenceLaunch) : 0;
  const refR = referenceLaunch ? range(referenceLaunch) : 0;

  // Escala visual para el lienzo del proyector
  const maxVisualX = Math.max(currentR, refR, 45, 10);
  const maxVisualY = Math.max(currentH, refH, 15, 5);

  const svgWidth = 640;
  const svgHeight = 220;
  const padX = 40;
  const padY = 30;
  const drawW = svgWidth - padX * 2;
  const drawH = svgHeight - padY * 2;

  const toSvgX = (x) => padX + (x / maxVisualX) * drawW;
  const toSvgY = (y) => svgHeight - padY - (y / maxVisualY) * drawH;

  const currentPathData = useMemo(() => {
    if (currentPoints.length === 0) return '';
    return currentPoints.reduce(
      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`,
      '',
    );
  }, [currentPoints, maxVisualX, maxVisualY]);

  const refPathData = useMemo(() => {
    if (!refPoints || refPoints.length === 0) return '';
    return refPoints.reduce(
      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`,
      '',
    );
  }, [refPoints, maxVisualX, maxVisualY]);

  // Acciones de demostración en 60 segundos
  const handleFixReference = () => {
    setReferenceLaunch({ ...currentLaunch });
  };

  const handleClearReference = () => {
    setReferenceLaunch(null);
  };

  const handleDemoPreset = (presetV0, presetAngle) => {
    setV0(presetV0);
    setAngle(presetAngle);
  };

  const handleSelectExercise = (e) => {
    setSelectedExerciseId(e.target.value);
  };

  const handleProjectExercise = () => {
    if (!previewExercise?.values) return;
    const { v0: exV0, angle: exAngle, gravity: exGravity } = previewExercise.values;
    if (exV0) setV0(exV0);
    if (exAngle) setAngle(exAngle);
    if (exGravity) setGravity(exGravity);
    setProjectedExerciseId(previewExercise.id);
  };

  // Mover un control a mano deja de coincidir con el ejercicio proyectado.
  const handleManualV0 = (value) => { setV0(value); setProjectedExerciseId(null); };
  const handleManualAngle = (value) => { setAngle(value); setProjectedExerciseId(null); };
  const handleManualGravity = (value) => { setGravity(value); setProjectedExerciseId(null); };

  const isPresetActive = (pV0, pAngle) => Number(v0) === pV0 && Number(angle) === pAngle;

  return (
    <section className="card teacher-mode-pro" aria-label="Modo Docente y Proyector de Aula">
      {/* CABECERA DEL MODO AULA */}
      <div className="projector-header-bar">
        <div className="projector-header-title">
          <div>
            <h2>
              <span aria-hidden="true">👨‍🏫</span> Modo Docente: Proyector de Aula
            </h2>
            <p>
              Simulación libre en tiempo real, demostración de hipótesis frente al aula y descarga de fichas.
            </p>
          </div>
        </div>
        <div className="projector-action-bar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateGuaraniaPdf}
          >
            📄 Descargar Ficha PDF
          </button>
        </div>
      </div>

      {/* QUÉ PROYECTAR */}
      <div className="tutor-mode-tabs" role="tablist" aria-label="Qué proyectar">
        <button
          type="button"
          role="tab"
          aria-selected={displayMode === 'ejercicio'}
          className={displayMode === 'ejercicio' ? 'is-active' : ''}
          onClick={() => setDisplayMode('ejercicio')}
        >
          Ejercicio y simulador
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={displayMode === 'concepto'}
          className={displayMode === 'concepto' ? 'is-active' : ''}
          onClick={() => setDisplayMode('concepto')}
        >
          Concepto
        </button>
      </div>

      {displayMode === 'concepto' ? (
        <div className="projector-concept" aria-label="Concepto proyectado">
          <label className="teacher-field" htmlFor="teacher-concept-select">
            Elegí un concepto para proyectar
            <select
              id="teacher-concept-select"
              className="quiz-input"
              value={selectedConceptId}
              onChange={(event) => setSelectedConceptId(event.target.value)}
            >
              {concepts.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          {selectedConcept && (
            <div className="projector-concept-slide">
              <h2>{selectedConcept.name}</h2>
              <p>{selectedConcept.definition}</p>
              {selectedConcept.formula && (
                <p className="projector-concept-formula">{selectedConcept.formula}</p>
              )}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* SELECTOR DE EJERCICIO DE REFERENCIA */}
      <div className="projector-select-wrap">
        <label htmlFor="teacher-exercise-select">
          🎯 Proyectar Ejercicio del Banco:
        </label>
        <select
          id="teacher-exercise-select"
          className="quiz-input"
          value={selectedExerciseId}
          onChange={handleSelectExercise}
        >
          {exercisesData.map((ex) => (
            <option key={ex.id} value={ex.id}>
              [{ex.difficulty.toUpperCase()}] {ex.custom ? '⭐ ' : ''}{ex.question.substring(0, 75)}...
            </option>
          ))}
        </select>
      </div>

      {/* VISTA PREVIA: el docente ve el enunciado completo antes de proyectar */}
      {previewExercise && (
        <div className={`projector-preview-card ${projectedExerciseId === previewExercise.id ? 'is-projected' : ''}`}>
          <div className="projector-preview-head">
            <div className="projector-preview-body">
              <div className="projector-preview-tags">
                <span className="chip chip-topic">{SCENARIO_LABELS[previewExercise.scenario] ?? previewExercise.scenario}</span>
                <span className="chip chip-difficulty">{previewExercise.difficulty}</span>
                {projectedExerciseId === previewExercise.id && (
                  <span className="chip chip-consolidated">✓ Proyectado en clase</span>
                )}
              </div>
              <p className="projector-preview-question">{previewExercise.question}</p>
              <div className="projector-preview-values">
                {Object.entries(previewExercise.values ?? {}).map(([key, value]) => (
                  <span key={key} className="chip">{key} = {value}</span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleProjectExercise}
              disabled={projectedExerciseId === previewExercise.id}
            >
              {projectedExerciseId === previewExercise.id ? 'Ya proyectado' : 'Proyectar este ejercicio'}
            </button>
          </div>
        </div>
      )}

      {/* LIENZO DE TRAYECTORIAS PARA PROYECCIÓN */}
      <div className="projector-canvas-wrapper">
        <div className="projector-canvas-legend">
          <strong>Visualización 2D • Proyección en Vivo</strong>
          <div className="projector-legend-items">
            <span className="legend-current">● Trayectoria Actual ({v0} m/s @ {angle}°)</span>
            {referenceLaunch && (
              <span className="legend-reference">● Referencia A ({referenceLaunch.v0} m/s @ {referenceLaunch.angleDeg}°)</span>
            )}
          </div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Suelo */}
          <line x1="0" y1={svgHeight - padY} x2={svgWidth} y2={svgHeight - padY} stroke="#475569" strokeWidth="2.5" />
          <line x1="0" y1={svgHeight - padY + 1} x2={svgWidth} y2={svgHeight - padY + 1} stroke="#1e293b" strokeWidth="6" />

          {/* Cuadrícula tenue */}
          <line x1={toSvgX(maxVisualX * 0.25)} y1={padY} x2={toSvgX(maxVisualX * 0.25)} y2={svgHeight - padY} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={toSvgX(maxVisualX * 0.5)} y1={padY} x2={toSvgX(maxVisualX * 0.5)} y2={svgHeight - padY} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={toSvgX(maxVisualX * 0.75)} y1={padY} x2={toSvgX(maxVisualX * 0.75)} y2={svgHeight - padY} stroke="#1e293b" strokeDasharray="3 3" />

          {/* Trayectoria de referencia A */}
          {refPathData && (
            <>
              <path d={refPathData} fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" opacity="0.9" className="projector-ref-path" />
              <circle cx={toSvgX(refR)} cy={toSvgY(0)} r="5" fill="#38bdf8" />
              <text x={toSvgX(refR)} y={toSvgY(0) + 16} fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
                R_A = {refR.toFixed(1)}m
              </text>
            </>
          )}

          {/* Trayectoria Actual */}
          {currentPathData && (
            <>
              <path d={currentPathData} fill="none" stroke="#fb7185" strokeWidth="3.5" className="projector-current-path" />
              <circle cx={toSvgX(currentR)} cy={toSvgY(0)} r="6" fill="#f43f5e" />
              <text x={toSvgX(currentR)} y={toSvgY(0) + 16} fill="#fda4af" fontSize="13" fontWeight="bold" textAnchor="middle">
                R = {currentR.toFixed(1)}m
              </text>
            </>
          )}

          {/* Base de lanzamiento (Dron) */}
          <circle cx={toSvgX(0)} cy={toSvgY(0)} r="6" fill="#34d399" />
          <text x={toSvgX(0)} y={toSvgY(0) + 16} fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
            0 m
          </text>
        </svg>
      </div>

      {/* CONTROLES DESLIZANTES PARA EL DOCENTE */}
      <div className="projector-controls-grid">
        {/* Slider Velocidad */}
        <div className="projector-slider-card">
          <div className="projector-slider-head">
            <span className="projector-slider-label">Velocidad Inicial (v₀):</span>
            <span className="projector-slider-value">{v0} m/s</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={v0}
            aria-label="Velocidad Inicial v0 en metros por segundo"
            onChange={(e) => handleManualV0(Number(e.target.value))}
          />
        </div>

        {/* Slider Ángulo */}
        <div className="projector-slider-card">
          <div className="projector-slider-head">
            <span className="projector-slider-label">Ángulo de Tiro (θ):</span>
            <span className="projector-slider-value is-coral">{angle}°</span>
          </div>
          <input
            type="range"
            min="5"
            max="85"
            step="1"
            value={angle}
            className="is-coral"
            aria-label="Ángulo de Tiro en grados"
            onChange={(e) => handleManualAngle(Number(e.target.value))}
          />
        </div>

        {/* Gravedad */}
        <div className="projector-slider-card">
          <div className="projector-slider-head">
            <span className="projector-slider-label">Gravedad (g):</span>
            <span className="projector-slider-value">{gravity} m/s²</span>
          </div>
          <div className="projector-gravity-radios">
            <label className="projector-gravity-radio">
              <input
                type="radio"
                name="gravity-select"
                value="10"
                checked={Number(gravity) === 10}
                onChange={() => handleManualGravity(10)}
              />
              10 m/s² (Aula MEC)
            </label>
            <label className="projector-gravity-radio">
              <input
                type="radio"
                name="gravity-select"
                value="9.8"
                checked={Number(gravity) === 9.8}
                onChange={() => handleManualGravity(9.8)}
              />
              9,8 m/s² (Exacta)
            </label>
          </div>
        </div>
      </div>

      {/* GUION DE DEMO EN 60 SEGUNDOS (PRESETS PEDAGÓGICOS) */}
      <div className="projector-demo-box">
        <div className="projector-demo-top">
          <div className="projector-demo-title">
            <span className="projector-badge-aula">Demostración en 60s</span>
            <strong>Hipótesis de Movimiento Parabólico para la Clase:</strong>
          </div>
          <div className="projector-ref-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleFixReference}
            >
              {referenceLaunch ? 'Actualizar Referencia A' : 'Fijar como Referencia A'}
            </button>
            {referenceLaunch && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleClearReference}
              >
                Limpiar Referencia
              </button>
            )}
          </div>
        </div>
        <div className="projector-preset-grid">
          <button
            type="button"
            className={`projector-preset-card ${isPresetActive(20, 30) ? 'is-active' : ''}`}
            onClick={() => handleDemoPreset(20, 30)}
            aria-pressed={isPresetActive(20, 30)}
          >
            <span className="preset-angle-badge">30°</span>
            <span className="preset-card-body">
              <strong>1. Elevación Base (v₀=20)</strong>
              <small>Alcance intermedio y altura moderada</small>
            </span>
            {isPresetActive(20, 30) && <span className="preset-live-pill">En pantalla</span>}
          </button>
          <button
            type="button"
            className={`projector-preset-card ${isPresetActive(20, 45) ? 'is-active' : ''}`}
            onClick={() => handleDemoPreset(20, 45)}
            aria-pressed={isPresetActive(20, 45)}
          >
            <span className="preset-angle-badge">45°</span>
            <span className="preset-card-body">
              <strong>2. Alcance Máximo (R_max)</strong>
              <small>Ángulo óptimo para mayor distancia</small>
            </span>
            {isPresetActive(20, 45) && <span className="preset-live-pill">En pantalla</span>}
          </button>
          <button
            type="button"
            className={`projector-preset-card ${isPresetActive(20, 60) ? 'is-active' : ''}`}
            onClick={() => handleDemoPreset(20, 60)}
            aria-pressed={isPresetActive(20, 60)}
          >
            <span className="preset-angle-badge">60°</span>
            <span className="preset-card-body">
              <strong>3. Simetría con 30°</strong>
              <small>Mismo alcance exacto, mayor altura</small>
            </span>
            {isPresetActive(20, 60) && <span className="preset-live-pill">En pantalla</span>}
          </button>
          <button
            type="button"
            className={`projector-preset-card ${isPresetActive(20, 20) ? 'is-active' : ''}`}
            onClick={() => handleDemoPreset(20, 20)}
            aria-pressed={isPresetActive(20, 20)}
          >
            <span className="preset-angle-badge">20°</span>
            <span className="preset-card-body">
              <strong>4. Tiro Rasante (20°)</strong>
              <small>Vuelo bajo y alcance recortado</small>
            </span>
            {isPresetActive(20, 20) && <span className="preset-live-pill">En pantalla</span>}
          </button>
        </div>
      </div>

      {/* MÉTRICAS FÍSICAS EN TIEMPO REAL */}
      <div className="projector-metrics-grid">
        <div className="projector-metric-box is-velocity">
          <div className="metric-caption">vx (horizontal)</div>
          <div className="metric-number">{currentLaunch.vx.toFixed(2)} m/s</div>
        </div>
        <div className="projector-metric-box is-velocity">
          <div className="metric-caption">vy (vertical inicial)</div>
          <div className="metric-number">{currentLaunch.vy.toFixed(2)} m/s</div>
        </div>
        <div className="projector-metric-box is-time-height">
          <div className="metric-caption">Tiempo Vuelo (T)</div>
          <div className="metric-number">{currentT.toFixed(2)} s</div>
        </div>
        <div className="projector-metric-box is-time-height">
          <div className="metric-caption">Altura Máx (Hmax)</div>
          <div className="metric-number">{currentH.toFixed(2)} m</div>
        </div>
        <div className="projector-metric-box is-range">
          <div className="metric-caption">Alcance Total (R)</div>
          <div className="metric-number">{currentR.toFixed(2)} m</div>
        </div>
      </div>
      </>
      )}

      {/* ESTADÍSTICAS DEL AULA */}
      <div className="projector-footer-stats">
        <span>Intentos registrados en la sesión: <strong>{attempts}</strong></span>
        <span>XP acumulada: <strong style={{ color: 'var(--brand-blue-deep)' }}>{Math.round(xp)}</strong></span>
        <span style={{ color: 'var(--brand-blue)', fontWeight: 650 }}>✓ Modo proyector listo para clase sin internet</span>
      </div>
    </section>
  );
}
