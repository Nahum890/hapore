import { useMemo, useState } from 'react';
import {
  createLaunch,
  evaluateTrajectory,
  maxHeight,
  range,
  timeOfFlight,
} from '../physics/projectileMotion.js';
import { exercises as exercisesData } from '../data/catalogs.js';
import { generateGuaraniaPdf } from './PrintableSheet.jsx';

export default function TeacherProjector({ attempts = 0, xp = 0 }) {
  // Parámetros de simulación en vivo
  const [v0, setV0] = useState(20);
  const [angle, setAngle] = useState(30);
  const [gravity, setGravity] = useState(10);
  const [selectedExerciseId, setSelectedExerciseId] = useState('ej-01');

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
    const exId = e.target.value;
    setSelectedExerciseId(exId);
    const ex = exercisesData.find((item) => item.id === exId);
    if (ex && ex.values) {
      if (ex.values.v0) setV0(ex.values.v0);
      if (ex.values.angle) setAngle(ex.values.angle);
      if (ex.values.gravity) setGravity(ex.values.gravity);
    }
  };

  return (
    <section className="card teacher-mode-pro" aria-label="Modo Docente y Proyector de Aula">
      {/* CABECERA DEL MODO AULA */}
      <div className="teacher-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1B4D3E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👨‍🏫</span> Modo Docente: Proyector de Aula
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#4B5563' }}>
            Simulación libre en tiempo real, demostración de hipótesis y generación de fichas para el aula.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateGuaraniaPdf}
            style={{ backgroundColor: '#1B4D3E', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
          >
            📄 Descargar Ficha PDF
          </button>
        </div>
      </div>

      {/* SELECTOR DE EJERCICIO DE REFERENCIA */}
      <div style={{ backgroundColor: '#F3F4F6', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label htmlFor="teacher-exercise-select" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1F2937' }}>
          🎯 Proyectar Ejercicio del Banco:
        </label>
        <select
          id="teacher-exercise-select"
          value={selectedExerciseId}
          onChange={handleSelectExercise}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.85rem', flex: 1, minWidth: '220px' }}
        >
          {exercisesData.map((ex) => (
            <option key={ex.id} value={ex.id}>
              [{ex.difficulty.toUpperCase()}] {ex.question.substring(0, 75)}...
            </option>
          ))}
        </select>
      </div>

      {/* LIENZO DE TRAYECTORIAS PARA PROYECCIÓN */}
      <div style={{ backgroundColor: '#1F2937', borderRadius: '10px', padding: '12px', marginBottom: '16px', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E5E7EB', fontSize: '0.78rem', marginBottom: '6px' }}>
          <span>Visualización 2D • Proyección en Vivo</span>
          <div style={{ display: 'flex', gap: '14px' }}>
            <span style={{ color: '#C04A26', fontWeight: 600 }}>● Trayectoria Actual ({v0} m/s @ {angle}°)</span>
            {referenceLaunch && (
              <span style={{ color: '#0284C7', fontWeight: 600 }}>● Referencia A ({referenceLaunch.v0} m/s @ {referenceLaunch.angleDeg}°)</span>
            )}
          </div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Suelo */}
          <line x1="0" y1={svgHeight - padY} x2={svgWidth} y2={svgHeight - padY} stroke="#4B5563" strokeWidth="2" />
          <line x1="0" y1={svgHeight - padY + 1} x2={svgWidth} y2={svgHeight - padY + 1} stroke="#374151" strokeWidth="6" />

          {/* Cuadrícula tenue */}
          <line x1={toSvgX(maxVisualX * 0.25)} y1={padY} x2={toSvgX(maxVisualX * 0.25)} y2={svgHeight - padY} stroke="#374151" strokeDasharray="3 3" />
          <line x1={toSvgX(maxVisualX * 0.5)} y1={padY} x2={toSvgX(maxVisualX * 0.5)} y2={svgHeight - padY} stroke="#374151" strokeDasharray="3 3" />
          <line x1={toSvgX(maxVisualX * 0.75)} y1={padY} x2={toSvgX(maxVisualX * 0.75)} y2={svgHeight - padY} stroke="#374151" strokeDasharray="3 3" />

          {/* Trayectoria de referencia A (Azul Itaipú) */}
          {refPathData && (
            <>
              <path d={refPathData} fill="none" stroke="#0284C7" strokeWidth="2.5" strokeDasharray="5 4" opacity="0.85" />
              <circle cx={toSvgX(refR)} cy={toSvgY(0)} r="4" fill="#0284C7" />
              <text x={toSvgX(refR)} y={toSvgY(0) + 14} fill="#0284C7" fontSize="9" textAnchor="middle">
                R_A = {refR.toFixed(1)}m
              </text>
            </>
          )}

          {/* Trayectoria Actual (Tierra Colorada) */}
          {currentPathData && (
            <>
              <path d={currentPathData} fill="none" stroke="#C04A26" strokeWidth="3" />
              <circle cx={toSvgX(currentR)} cy={toSvgY(0)} r="5" fill="#C04A26" />
              <text x={toSvgX(currentR)} y={toSvgY(0) + 14} fill="#FCA5A5" fontSize="10" fontWeight="bold" textAnchor="middle">
                R = {currentR.toFixed(1)}m
              </text>
            </>
          )}

          {/* Base de lanzamiento (Dron) */}
          <circle cx={toSvgX(0)} cy={toSvgY(0)} r="6" fill="#10B981" />
          <text x={toSvgX(0)} y={toSvgY(0) + 14} fill="#10B981" fontSize="9" textAnchor="middle">
            0 m
          </text>
        </svg>
      </div>

      {/* CONTROLES DESLIZANTES PARA EL DOCENTE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {/* Slider Velocidad */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Velocidad Inicial (v0):</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1B4D3E' }}>{v0} m/s</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={v0}
            onChange={(e) => setV0(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#1B4D3E' }}
          />
        </div>

        {/* Slider Ángulo */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Ángulo de Lanzamiento (θ):</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C04A26' }}>{angle}°</span>
          </div>
          <input
            type="range"
            min="5"
            max="85"
            step="1"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#C04A26' }}
          />
        </div>

        {/* Gravedad */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            Gravedad (g):
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gravity-select"
                value="10"
                checked={Number(gravity) === 10}
                onChange={() => setGravity(10)}
              />
              10 m/s² (Aula MEC)
            </label>
            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gravity-select"
                value="9.8"
                checked={Number(gravity) === 9.8}
                onChange={() => setGravity(9.8)}
              />
              9,8 m/s² (Exacta)
            </label>
          </div>
        </div>
      </div>

      {/* GUION DE DEMO EN 60 SEGUNDOS (PRESETS PEDAGÓGICOS) */}
      <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E' }}>
            ⚡ Demo de 60 Segundos para Proyección:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleFixReference}
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#0284C7', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Fijar como Referencia A
            </button>
            {referenceLaunch && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleClearReference}
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#6B7280', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Limpiar Referencia
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleDemoPreset(20, 30)}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            1. Probar 30° (v0=20)
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleDemoPreset(20, 45)}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            2. Probar 45° (Alcance Máximo)
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleDemoPreset(20, 60)}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            3. Probar 60° (Simetría con 30°)
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleDemoPreset(20, 20)}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            4. Tiro Rasante 20° (Queda Corto)
          </button>
        </div>
      </div>

      {/* MÉTRICAS FÍSICAS EN TIEMPO REAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 600 }}>vx (horizontal)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E3A8A' }}>{currentLaunch.vx.toFixed(2)} m/s</div>
        </div>
        <div style={{ backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 600 }}>vy (vertical inicial)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E3A8A' }}>{currentLaunch.vy.toFixed(2)} m/s</div>
        </div>
        <div style={{ backgroundColor: '#ECFDF5', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 600 }}>Tiempo Vuelo (T)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#064E3B' }}>{currentT.toFixed(2)} s</div>
        </div>
        <div style={{ backgroundColor: '#ECFDF5', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 600 }}>Altura Máx (Hmax)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#064E3B' }}>{currentH.toFixed(2)} m</div>
        </div>
        <div style={{ backgroundColor: '#FEF2F2', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#991B1B', fontWeight: 600 }}>Alcance Total (R)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#7F1D1D' }}>{currentR.toFixed(2)} m</div>
        </div>
      </div>

      {/* ESTADÍSTICAS DEL AULA */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem', color: '#6B7280' }}>
        <span>Intentos registrados en la sesión: <strong>{attempts}</strong></span>
        <span>XP acumulada: <strong style={{ color: '#1B4D3E' }}>{Math.round(xp)}</strong></span>
        <span style={{ color: '#0284C7', fontWeight: 500 }}>✓ Modo proyector listo para clase sin internet</span>
      </div>
    </section>
  );
}
