import { useEffect, useRef } from 'react';
import { Nanduti } from '../components/Nanduti.jsx';

// Escena de la portada: sol-ñandutí, una parábola y una pelota que la recorre
// con movimiento parabólico real (curva de Bézier cuadrática simétrica: x
// avanza uniforme en el tiempo, y cambia con t²), con sus vectores v, vx y vy.
const P0 = [20, 560];
const P1 = [300, -480];
const P2 = [580, 560];
const K = 0.075; // escala de los vectores
const FLIGHT_MS = 3400;
const CYCLE_MS = 4300;

function point(u) {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return [a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1]];
}
function velocity(u) {
  return [2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1])];
}
const PATH = `M${P0} Q${P1} ${P2}`;
const STROBE = Array.from({ length: 9 }, (_, i) => point((i + 1) / 10));

export default function HeroScene() {
  const root = useRef(null);

  useEffect(() => {
    const svg = root.current;
    if (!svg) return undefined;
    const get = name => svg.querySelector(`[data-part="${name}"]`);
    const els = { ball: get('ball'), v: get('v'), vx: get('vx'), vy: get('vy'), lv: get('lv') };
    const place = u => {
      const [x, y] = point(u);
      const [dx, dy] = velocity(u);
      els.ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      els.v.setAttribute('x1', x); els.v.setAttribute('y1', y);
      els.v.setAttribute('x2', x + dx * K); els.v.setAttribute('y2', y + dy * K);
      els.vx.setAttribute('x1', x); els.vx.setAttribute('y1', y);
      els.vx.setAttribute('x2', x + dx * K); els.vx.setAttribute('y2', y);
      els.vy.setAttribute('x1', x); els.vy.setAttribute('y1', y);
      els.vy.setAttribute('x2', x); els.vy.setAttribute('y2', y + dy * K);
      els.lv.setAttribute('x', (x + dx * K + 8).toFixed(1));
      els.lv.setAttribute('y', (y + dy * K + (dy < 0 ? -4 : 14)).toFixed(1));
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { place(0.32); return undefined; }
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const tick = now => {
      if (visible) place(Math.min(((now - start) % CYCLE_MS) / FLIGHT_MS, 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }) : null;
    observer?.observe(svg);
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); };
  }, []);

  return <svg ref={root} className="lp-scene" viewBox="0 0 600 600" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
    <defs>
      {[['v', '#0e7c66'], ['vx', '#e4572e'], ['vy', '#2f80c1']].map(([id, fill]) => <marker key={id} id={`lp-arrow-${id}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill={fill} /></marker>)}
      <radialGradient id="lp-ball" cx=".35" cy=".35" r=".7"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#f59e0b" /></radialGradient>
    </defs>
    <g className="lp-cloud lp-cloud-1"><ellipse cx="90" cy="120" rx="54" ry="18" /><ellipse cx="120" cy="106" rx="34" ry="20" /></g>
    <g className="lp-cloud lp-cloud-2"><ellipse cx="470" cy="250" rx="46" ry="15" /><ellipse cx="445" cy="238" rx="28" ry="17" /></g>
    <g transform="translate(450 18)"><g className="lp-sun"><Nanduti size={132} spokes={18} rings={3} color="#eba431" accent="#f4b942" strokeWidth={1.3} /></g></g>
    <path className="lp-path" d={PATH} fill="none" stroke="#1b2a41" strokeOpacity=".55" strokeWidth="2.4" strokeDasharray="7 9" strokeLinecap="round" pathLength="1000" />
    <g fill="#1d5bd8" fillOpacity=".22">{STROBE.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="6" />)}</g>
    <line data-part="vx" stroke="#e4572e" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#lp-arrow-vx)" />
    <line data-part="vy" stroke="#2f80c1" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#lp-arrow-vy)" />
    <line data-part="v" stroke="#0e7c66" strokeWidth="3.6" strokeLinecap="round" markerEnd="url(#lp-arrow-v)" />
    <text data-part="lv" className="lp-scene-label">v</text>
    <g data-part="ball" transform={`translate(${P0[0]} ${P0[1]})`}>
      <circle r="14" fill="url(#lp-ball)" stroke="#1b2a41" strokeWidth="2.4" />
      <path d="M-9 -6 Q0 0 9 -6 M-9 6 Q0 0 9 6" fill="none" stroke="#1b2a41" strokeOpacity=".35" strokeWidth="1.5" />
    </g>
    <g transform="translate(574 520)"><line x1="0" y1="0" x2="0" y2="40" stroke="#1b2a41" strokeWidth="2.6" /><path className="lp-flag" d="M0 0 22 8 0 16z" fill="#e11d48" /></g>
  </svg>;
}
