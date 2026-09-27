import { useEffect, useId, useMemo, useState } from 'react';
import activitiesData from '../data/explorationLabActivities.json' with { type: 'json' };
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { createLaunch, evaluateTrajectory, maxHeight, positionAt, range, timeOfFlight } from '../physics/projectileMotion.js';
import './ExplorationLab.css';

const CHART = { width: 760, height: 310, left: 54, right: 18, top: 24, bottom: 42 };
const STUDIES = [
  { id: 'angle', key: 'angle', variable: 'angle', base: { v0: 20, angle: 30, gravity: 10, y0: 0 }, start: 60, min: 5, max: 85, step: 1, unit: '°' },
  { id: 'speed', key: 'speed', variable: 'v0', base: { v0: 10, angle: 45, gravity: 10, y0: 0 }, start: 20, min: 5, max: 40, step: 0.5, unit: 'm/s' },
  { id: 'gravity', key: 'gravity', variable: 'gravity', base: { v0: 20, angle: 45, gravity: 9.8, y0: 0 }, start: 1.62, min: 1.62, max: 9.8, step: 0.01, unit: 'm/s²' },
  { id: 'height', key: 'height', variable: 'y0', base: { v0: 20, angle: 45, gravity: 9.8, y0: 0 }, start: 8, min: 0, max: 20, step: 0.5, unit: 'm' },
];

function launchFrom(values) {
  return createLaunch(values.v0, values.angle, { gravity: values.gravity, y0: values.y0 });
}

function metrics(launch) {
  return { range: range(launch), height: maxHeight(launch), time: timeOfFlight(launch) };
}

function number(value, digits = 2) {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}

function signed(value) {
  return `${value > 0 ? '+' : ''}${number(value)}`;
}

function Plot({ launches, elapsed = null, labels, axisX, axisY, description }) {
  const plotId = useId().replace(/:/g, '');
  const samples = launches.map(launch => evaluateTrajectory(launch, { step: 0.08 }));
  const allPoints = samples.flat();
  const maxX = Math.max(5, ...allPoints.map(point => point.x)) * 1.08;
  const maxY = Math.max(2, ...allPoints.map(point => point.y)) * 1.16;
  const graphWidth = CHART.width - CHART.left - CHART.right;
  const graphHeight = CHART.height - CHART.top - CHART.bottom;
  const x = value => CHART.left + (value / maxX) * graphWidth;
  const y = value => CHART.height - CHART.bottom - (value / maxY) * graphHeight;
  const longestTime = Math.max(0, ...launches.map(timeOfFlight));
  const current = elapsed === null ? [] : launches.map(launch => positionAt(launch, Math.min(elapsed, timeOfFlight(launch))));
  const colors = ['exploration-path-a', 'exploration-path-b'];

  return <figure className="exploration-plot">
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-labelledby={`exploration-plot-title-${plotId} exploration-plot-desc-${plotId}`}>
      <title id={`exploration-plot-title-${plotId}`}>{description}</title>
      <desc id={`exploration-plot-desc-${plotId}`}>{description}</desc>
      {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g className="exploration-gridline" key={fraction}>
        <line x1={CHART.left} x2={CHART.width - CHART.right} y1={y(maxY * fraction)} y2={y(maxY * fraction)} />
        <text x={CHART.left - 8} y={y(maxY * fraction) + 4} textAnchor="end">{number(maxY * fraction, 1)}</text>
      </g>)}
      <line className="exploration-axis" x1={CHART.left} x2={CHART.width - CHART.right} y1={CHART.height - CHART.bottom} y2={CHART.height - CHART.bottom} />
      <line className="exploration-axis" x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={CHART.height - CHART.bottom} />
      {samples.map((points, index) => <g key={index}>
        <polyline className={`exploration-path ${colors[index % colors.length]}`} points={points.map(point => `${x(point.x)},${y(point.y)}`).join(' ')} />
        <text className="exploration-legend" x={CHART.left + 12 + index * 155} y={CHART.top + 13}>{labels[index]}</text>
      </g>)}
      {current.map((point, index) => <g key={`projectile-${index}`} className={`exploration-projectile ${colors[index % colors.length]}`} transform={`translate(${x(point.x)} ${y(Math.max(0, point.y))})`}>
        <circle r="7" /><circle r="13" className="exploration-projectile-halo" />
      </g>)}
      <text className="exploration-axis-label" x={CHART.width / 2} y={CHART.height - 5} textAnchor="middle">{axisX}</text>
      <text className="exploration-axis-label" transform={`translate(14 ${CHART.height / 2}) rotate(-90)`} textAnchor="middle">{axisY}</text>
      {elapsed !== null && elapsed > 0 && <text className="exploration-clock" x={CHART.width - CHART.right - 4} y={CHART.top + 14} textAnchor="end">{number(Math.min(elapsed, longestTime), 1)} s</text>}
    </svg>
  </figure>;
}

function MetricComparison({ launches }) {
  const { t } = useTranslation();
  const a = metrics(launches[0]);
  const b = metrics(launches[1]);
  const rows = [
    ['range', t('lab.metricRange'), a.range, b.range, 'm'],
    ['height', t('lab.metricHeight'), a.height, b.height, 'm'],
    ['time', t('lab.metricTime'), a.time, b.time, 's'],
  ];
  return <div className="exploration-metric-comparison" aria-label={t('lab.comparisonLabel')}>
    {rows.map(([key, label, before, after, unit]) => {
      const delta = after - before;
      const direction = Math.abs(delta) < 0.01 ? 'same' : delta > 0 ? 'up' : 'down';
      return <article className="exploration-metric-card" key={key}>
        <span>{label}</span>
        <div><strong>A · {number(before)} {unit}</strong><strong>B · {number(after)} {unit}</strong></div>
        <small className={`is-${direction}`}>{direction === 'same' ? t('lab.noChange') : t('lab.change', { direction: t(`lab.direction.${direction}`), amount: number(Math.abs(delta)), unit })}</small>
      </article>;
    })}
  </div>;
}

function ActivityLab() {
  const { t, language } = useTranslation();
  const activities = activitiesData.activities ?? [];
  const [selectedId, setSelectedId] = useState(activities[0]?.id ?? '');
  const [prediction, setPrediction] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [reflection, setReflection] = useState('');
  const activity = activities.find(item => item.id === selectedId) ?? activities[0];
  const localized = activity && language !== 'es' && activity.jopara
    ? { ...activity, ...activity.jopara, exitTicket: activity.jopara.exitTicket }
    : activity;
  const launchA = useMemo(() => activity ? launchFrom({ ...activity.launchA, y0: 0 }) : null, [activity]);
  const launchB = useMemo(() => activity ? launchFrom({ ...activity.launchB, y0: 0 }) : null, [activity]);

  useEffect(() => { setPrediction(''); setRevealed(false); setReflection(''); }, [selectedId]);
  if (!activity || !localized || !launchA || !launchB) return null;

  return <section className="exploration-activity" aria-labelledby="exploration-activity-title">
    <div className="exploration-heading"><div><span className="panel-eyebrow">{t('lab.guidedEyebrow')}</span><h3 id="exploration-activity-title">{t('lab.guidedTitle')}</h3><p>{t('lab.guidedLead')}</p></div>
      <label className="exploration-activity-select">{t('lab.activity')}<select value={activity.id} onChange={event => setSelectedId(event.target.value)}>{activities.map(item => {
        const title = language !== 'es' && item.jopara ? item.jopara.title : item.title;
        return <option key={item.id} value={item.id}>{title}</option>;
      })}</select></label>
    </div>
    <div className="exploration-objective"><strong>{t('lab.objective')}</strong><p>{localized.objective}</p></div>
    <ol className="exploration-instructions">{localized.instructions.map((instruction, index) => <li key={`${activity.id}-${index}`}>{instruction}</li>)}</ol>
    <div className="exploration-prediction">
      <label htmlFor="exploration-prediction">{t('lab.predictionQuestion')}</label>
      <select id="exploration-prediction" value={prediction} onChange={event => setPrediction(event.target.value)}>
        <option value="">{t('lab.choosePrediction')}</option><option value="A">{t('lab.launchA')}</option><option value="B">{t('lab.launchB')}</option><option value="igual">{t('lab.equal')}</option>
      </select>
      <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} disabled={!prediction}>{t('lab.compare')}</button>
    </div>
    {revealed && <div className="exploration-reveal" aria-live="polite">
      <Plot launches={[launchA, launchB]} labels={[t('lab.launchA'), t('lab.launchB')]} description={t('lab.graphDescription')} axisX={t('lab.axisX')} axisY={t('lab.axisY')} />
      <div className="exploration-comparison" role="table" aria-label={t('lab.comparisonLabel')}>
        <div role="row" className="exploration-comparison-head"><span role="columnheader">{t('lab.measure')}</span><span role="columnheader">{t('lab.launchA')}</span><span role="columnheader">{t('lab.launchB')}</span></div>
        {[
          [t('lab.metricSpeed'), number(activity.launchA.v0) + ' m/s', number(activity.launchB.v0) + ' m/s'],
          [t('lab.variableAngleLabel'), number(activity.launchA.angle) + '°', number(activity.launchB.angle) + '°'],
          [t('lab.variableGravityLabel'), number(activity.launchA.gravity) + ' m/s²', number(activity.launchB.gravity) + ' m/s²'],
          [t('lab.metricRange'), number(metrics(launchA).range) + ' m', number(metrics(launchB).range) + ' m'],
          [t('lab.metricHeight'), number(metrics(launchA).height) + ' m', number(metrics(launchB).height) + ' m'],
          [t('lab.metricTime'), number(metrics(launchA).time) + ' s', number(metrics(launchB).time) + ' s'],
        ].map(([label, a, b]) => <div role="row" key={label}><span role="cell">{label}</span><span role="cell">{a}</span><span role="cell">{b}</span></div>)}
      </div>
      <p className="exploration-explanation"><strong>{t('lab.compareExplanation')}</strong><br />{localized.expectedExplanation}</p>
      <label className="exploration-reflection">{localized.exitTicket.question}<textarea value={reflection} onChange={event => setReflection(event.target.value)} rows="3" placeholder={t('lab.reflectionPlaceholder')} /></label>
    </div>}
  </section>;
}

export default function ExplorationLab() {
  const { t } = useTranslation();
  const [studyId, setStudyId] = useState('angle');
  const study = STUDIES.find(item => item.id === studyId) ?? STUDIES[0];
  const [testedValue, setTestedValue] = useState(study.start);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const valuesA = study.base;
  const valuesB = { ...valuesA, [study.variable]: Number(testedValue) };
  const launches = useMemo(() => [launchFrom(valuesA), launchFrom(valuesB)], [study, testedValue]);
  const longestTime = Math.max(...launches.map(timeOfFlight));
  const displayValue = number(Number(testedValue), study.id === 'gravity' ? 2 : study.step < 1 ? 1 : 0);
  const anglePair = study.id === 'angle' && Math.abs(valuesA.angle + valuesB.angle - 90) < 0.5;

  useEffect(() => { setTestedValue(study.start); setElapsed(0); setPlaying(false); }, [studyId]);
  useEffect(() => { setElapsed(0); setPlaying(false); }, [testedValue]);
  useEffect(() => {
    if (!playing) return undefined;
    const duration = Math.max(1600, longestTime * 650);
    const startedAt = performance.now() - (elapsed / Math.max(0.01, longestTime)) * duration;
    let frame = 0;
    const tick = now => {
      const next = Math.min(longestTime, ((now - startedAt) / duration) * longestTime);
      setElapsed(next);
      if (next >= longestTime) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, longestTime]);

  const play = () => {
    if (elapsed >= longestTime) setElapsed(0);
    setPlaying(true);
  };

  return <div className="exploration-lab">
    <header className="exploration-lab-header card">
      <span className="panel-eyebrow">{t('lab.eyebrow')}</span>
      <h2>{t('lab.title')}</h2>
      <p>{t('lab.lead')}</p>
      <div className="exploration-three-steps" aria-label={t('lab.stepsLabel')}>
        <span><b>1</b>{t('lab.stepChoose')}</span><span><b>2</b>{t('lab.stepMove')}</span><span><b>3</b>{t('lab.stepObserve')}</span>
      </div>
      <p className="exploration-assumptions">{t('lab.assumptions')}</p>
    </header>

    <section className="exploration-free card" aria-labelledby="exploration-free-title">
      <div className="exploration-heading"><div><span className="panel-eyebrow">{t('lab.quickExplore')}</span><h3 id="exploration-free-title">{t('lab.chooseQuestion')}</h3></div></div>
      <div className="exploration-study-picker" role="group" aria-label={t('lab.chooseQuestion')}>
        {STUDIES.map(item => <button type="button" key={item.id} className={studyId === item.id ? 'is-active' : ''} aria-pressed={studyId === item.id} onClick={() => setStudyId(item.id)}>
          <strong>{t(`lab.study.${item.key}`)}</strong><span>{t(`lab.question.${item.key}`)}</span>
        </button>)}
      </div>

      <div className="exploration-mission">
        <div><span className="panel-eyebrow">{t('lab.oneChange')}</span><h4>{t(`lab.question.${study.key}`)}</h4><p>{t(`lab.hint.${study.key}`)}</p></div>
        <label className="exploration-slider-label"><span>{t(`lab.variable.${study.key}`)}</span><strong>{displayValue} {study.unit}</strong>
          <input type="range" min={study.min} max={study.max} step={study.step} value={testedValue} onChange={event => setTestedValue(Number(event.target.value))} aria-label={t(`lab.variable.${study.key}`)} />
          <small>{t('lab.compareWithBase', { value: number(Number(valuesA[study.variable]), study.id === 'gravity' ? 2 : 1), unit: study.unit })}</small>
        </label>
      </div>

      <div className="exploration-results">
        <div className="exploration-visual">
          <div className="exploration-plot-heading"><strong>{t('lab.graphTitle')}</strong><span><i className="is-a" />{t('lab.reference')} <i className="is-b" />{t('lab.yourTest')}</span></div>
          <Plot launches={launches} elapsed={elapsed} labels={[t('lab.reference'), t('lab.yourTest')]} description={t('lab.graphDescription')} axisX={t('lab.axisX')} axisY={t('lab.axisY')} />
          <button type="button" className="btn btn-secondary exploration-play" onClick={playing ? () => setPlaying(false) : play}>
            {playing ? t('lab.pause') : elapsed > 0 ? t('lab.replay') : t('lab.play')}
          </button>
        </div>
        <div className="exploration-analysis">
          <h4>{t('lab.whatChanged')}</h4>
          <MetricComparison launches={launches} />
          <p className="exploration-explanation"><strong>{t('lab.takeaway')}</strong><br />{t(anglePair ? 'lab.insight.anglePair' : `lab.insight.${study.key}`, {
            a: number(valuesA[study.variable], study.id === 'gravity' ? 2 : 1),
            b: displayValue,
            unit: study.unit,
            rangeA: number(metrics(launches[0]).range), rangeB: number(metrics(launches[1]).range),
            heightA: number(metrics(launches[0]).height), heightB: number(metrics(launches[1]).height),
            timeA: number(metrics(launches[0]).time), timeB: number(metrics(launches[1]).time),
          })}</p>
        </div>
      </div>
    </section>

    <details className="exploration-extra card">
      <summary>{t('lab.moreGuided')}</summary>
      <ActivityLab />
    </details>
    <p className="exploration-review-note">{t('lab.reviewNote')}</p>
  </div>;
}
