import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createLaunch, evaluateTrajectory, timeOfFlight } from '../physics/projectileMotion.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './Trajectory3D.css';

// Vista 3D liviana (SVG + proyección oblicua) que se reutiliza en el chat,
// la teoría, el Laboratorio PyFis y el simulador de ejercicios. No calcula
// física propia: recibe puntos ya calculados por projectileMotion/flightPlan.

export const TRAJECTORY_COLORS = ['#1d5bd8', '#d97706', '#16a34a'];

/** Serie lista para Trajectory3D a partir de v0, ángulo, g y altura inicial. */
export function seriesFromLaunch({ v0, angle, g = 9.8, h0 = 0 }, label = '', color = TRAJECTORY_COLORS[0]) {
  const launch = createLaunch(v0, angle, { gravity: g, y0: h0 });
  const duration = timeOfFlight(launch);
  const points = evaluateTrajectory(launch, { step: Math.max(duration / 80, 0.01) });
  return { points, label, color, duration };
}

const fmt = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0);

export default function Trajectory3D({ series = [], height = 280, autoPlay = true, compact = false }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  const [camera, setCamera] = useState(26);
  const [progress, setProgress] = useState(autoPlay ? 0 : 1);
  const [playKey, setPlayKey] = useState(0);
  const drag = useRef(null);

  const valid = series.filter(item => item?.points?.length > 1);
  const bounds = useMemo(() => {
    const all = valid.flatMap(item => item.points);
    return {
      maxX: Math.max(5, ...all.map(point => point.x)) * 1.08,
      maxY: Math.max(2, ...all.map(point => point.y)) * 1.18,
      maxT: Math.max(0.1, ...valid.map(item => item.points.at(-1).t ?? item.duration ?? 1)),
    };
  }, [valid.map(item => `${item.points.length}:${item.points.at(-1)?.x}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoPlay) { setProgress(1); return undefined; }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setProgress(1); return undefined; }
    let frame = 0, start = null;
    const duration = Math.min(3600, Math.max(1600, bounds.maxT * 700));
    const tick = now => {
      if (start === null) start = now;
      const value = Math.min(1, (now - start) / duration);
      setProgress(value);
      if (value < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playKey, bounds.maxT, autoPlay]);

  const W = 640, H = 330;
  const origin = { x: 110, y: 262 };
  const lengths = { x: 440, y: 190, z: 150 };
  const angle = (camera * Math.PI) / 180;
  const project = ({ x = 0, y = 0, z = 0 }) => {
    const xu = (x / bounds.maxX) * lengths.x;
    const yu = (y / bounds.maxY) * lengths.y;
    const zu = z * lengths.z;
    const planeX = xu * Math.cos(angle) - zu * Math.sin(angle);
    const depth = xu * Math.sin(angle) + zu * Math.cos(angle);
    return { x: origin.x + planeX, y: origin.y - yu - depth * 0.3 };
  };
  const lane = 0.5; // la trayectoria va por el medio del "carril" en profundidad
  const str = point => { const p = project(point); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };
  const floor = [project({}), project({ x: bounds.maxX }), project({ x: bounds.maxX, z: 1 }), project({ z: 1 })];
  const timeNow = progress * bounds.maxT;

  const onPointerDown = event => { drag.current = { x: event.clientX, camera }; event.currentTarget.setPointerCapture?.(event.pointerId); };
  const onPointerMove = event => {
    if (!drag.current) return;
    const next = drag.current.camera + (event.clientX - drag.current.x) * 0.25;
    setCamera(Math.max(-40, Math.min(40, Math.round(next))));
  };
  const onPointerUp = () => { drag.current = null; };

  return <figure className={`traj3d${compact ? ' is-compact' : ''}`}>
    <svg
      viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: height }} role="img" aria-labelledby={`${id}-title`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    >
      <title id={`${id}-title`}>{t('chatw.view3dAria')}</title>
      <defs>
        <linearGradient id={`${id}-floor`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e0f2fe" /><stop offset="1" stopColor="#f0fdf4" /></linearGradient>
        <radialGradient id={`${id}-ball`}><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".35" stopColor="currentColor" /><stop offset="1" stopColor="currentColor" /></radialGradient>
      </defs>
      <polygon className="traj3d-floor" points={floor.map(p => `${p.x},${p.y}`).join(' ')} fill={`url(#${id}-floor)`} />
      {[0, 0.25, 0.5, 0.75, 1].map(f => { const a = project({ z: f }), b = project({ x: bounds.maxX, z: f }); return <line key={`zx${f}`} className="traj3d-grid" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map(f => { const a = project({ x: bounds.maxX * f }), b = project({ x: bounds.maxX * f, z: 1 }); return <g key={`xz${f}`}>
        <line className="traj3d-grid" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        {!compact && <text className="traj3d-tick" x={a.x} y={a.y + 16} textAnchor="middle">{fmt(bounds.maxX / 1.08 * f)}</text>}
      </g>; })}
      {[0.25, 0.5, 0.75, 1].map(f => { const a = project({ y: bounds.maxY / 1.18 * f }), b = project({ x: bounds.maxX, y: bounds.maxY / 1.18 * f }); return <g key={`y${f}`}>
        <line className="traj3d-height" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        {!compact && <text className="traj3d-tick" x={a.x - 8} y={a.y + 4} textAnchor="end">{fmt(bounds.maxY / 1.18 * f)}</text>}
      </g>; })}
      <line className="traj3d-axis is-x" x1={origin.x} y1={origin.y} x2={project({ x: bounds.maxX }).x} y2={project({ x: bounds.maxX }).y} />
      <line className="traj3d-axis is-y" x1={origin.x} y1={origin.y} x2={project({ y: bounds.maxY }).x} y2={project({ y: bounds.maxY }).y} />
      <line className="traj3d-axis is-z" x1={origin.x} y1={origin.y} x2={project({ z: 1 }).x} y2={project({ z: 1 }).y} />
      <text className="traj3d-axis-label" x={project({ x: bounds.maxX }).x + 6} y={project({ x: bounds.maxX }).y + 4}>x (m)</text>
      <text className="traj3d-axis-label" x={project({ y: bounds.maxY }).x - 4} y={project({ y: bounds.maxY }).y - 8} textAnchor="middle">y (m)</text>
      <text className="traj3d-axis-label" x={project({ z: 1 }).x - 8} y={project({ z: 1 }).y - 6} textAnchor="end">z</text>

      {valid.map((item, index) => {
        const z = valid.length > 1 ? 0.3 + index * 0.4 : lane;
        const visible = item.points.filter(point => (point.t ?? 0) <= timeNow + 1e-6);
        const shown = visible.length > 1 ? visible : item.points.slice(0, 2);
        const head = shown.at(-1);
        const color = item.color ?? TRAJECTORY_COLORS[index % TRAJECTORY_COLORS.length];
        const headP = project({ x: head.x, y: Math.max(0, head.y), z });
        const shadowP = project({ x: head.x, y: 0, z });
        return <g key={`s${index}`} style={{ color }}>
          <polyline className="traj3d-ghost" points={item.points.map(p => str({ x: p.x, y: Math.max(0, p.y), z })).join(' ')} stroke={color} />
          <polyline className="traj3d-shadow" points={shown.map(p => str({ x: p.x, y: 0, z })).join(' ')} />
          <polyline className="traj3d-path" points={shown.map(p => str({ x: p.x, y: Math.max(0, p.y), z })).join(' ')} stroke={color} />
          <line className="traj3d-drop" x1={headP.x} y1={headP.y} x2={shadowP.x} y2={shadowP.y} />
          <ellipse className="traj3d-ball-shadow" cx={shadowP.x} cy={shadowP.y} rx="7" ry="2.6" />
          <circle cx={headP.x} cy={headP.y} r="7.5" fill={`url(#${id}-ball)`} stroke="#fff" strokeWidth="1.5" />
          {item.label && <text className="traj3d-label" x={16} y={22 + index * 18} fill={color}>● {item.label}</text>}
        </g>;
      })}
      <text className="traj3d-clock" x={W - 14} y={22} textAnchor="end">t = {fmt(timeNow)} s</text>
    </svg>
    <figcaption className="traj3d-controls">
      <label>
        <span>{t('chatw.camera')} <strong>{camera}°</strong></span>
        <input type="range" min="-40" max="40" step="1" value={camera} onChange={event => setCamera(Number(event.target.value))} aria-label={t('chatw.camera')} />
      </label>
      <button type="button" className="btn btn-secondary" onClick={() => setPlayKey(key => key + 1)}>{t('chatw.replay')}</button>
    </figcaption>
    {!compact && <p className="traj3d-note">{t('chatw.dragHint')}</p>}
  </figure>;
}
