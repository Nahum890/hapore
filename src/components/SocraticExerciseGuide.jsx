import { useEffect, useState } from 'react';
import { validateExercise } from '../physics/physicsValidator.js';
import { diagnoseAttempt } from '../pedagogy/diagnoseAttempt.js';
import './SocraticExerciseGuide.css';

const CONCEPTS = [
  ['componente-horizontal', 'Componente horizontal de la velocidad'],
  ['componente-vertical', 'Componente vertical de la velocidad'],
  ['altura-maxima', 'Altura máxima'],
  ['tiempo-de-vuelo', 'Tiempo de vuelo'],
  ['alcance', 'Alcance horizontal'],
];
const FORMULAS = {
  'componente-horizontal': ['vx = v0 · cos(θ)', 'vx = v0 · sen(θ)', 'vx = v0 · cos(θ) · t'],
  'componente-vertical': ['vy = v0 · sen(θ)', 'vy = v0 · cos(θ)', 'vy = v0 · sen(θ) − g · t'],
  'altura-maxima': ['Hmax = (v0² · sen²(θ)) / (2g)', 'Hmax = (v0² · sen(2θ)) / g', 'Hmax = v0 · sen(θ)'],
  'tiempo-de-vuelo': ['T = (2 · v0 · sen(θ)) / g', 'T = v0 · cos(θ) / g', 'T = (v0 · sen(θ)) / g'],
  alcance: ['R = (v0² · sen(2θ)) / g', 'R = (v0² · sen²(θ)) / (2g)', 'R = v0 · sen(θ)'],
};
const VALUE_LABELS = { v0: 'Velocidad inicial', angle: 'Ángulo', gravity: 'Gravedad', vx: 'Velocidad horizontal', t: 'Tiempo', targetDistance: 'Distancia objetivo', angleA: 'Primer ángulo', angleB: 'Segundo ángulo' };
const VALUE_UNITS = { v0: 'm/s', angle: '°', gravity: 'm/s²', vx: 'm/s', t: 's', targetDistance: 'm', angleA: '°', angleB: '°' };
const formatNumber = value => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 3 }).format(Number(value));
const rotationFor = (id, length) => [...String(id ?? '')].reduce((sum, character) => sum + character.charCodeAt(0), 0) % Math.max(1, length);
const rotate = (items, offset) => [...items.slice(offset), ...items.slice(0, offset)];

export default function SocraticExerciseGuide({ exercise, language = 'es' }) {
  const targetLabel = CONCEPTS.find(([id]) => id === exercise?.expectedConcept)?.[1];
  const options = FORMULAS[exercise?.expectedConcept];
  const targetChoices = rotate(CONCEPTS, rotationFor(exercise?.id, CONCEPTS.length));
  const formulaChoices = options ? rotate(options, rotationFor(exercise?.id, options.length)) : [];
  const [step, setStep] = useState(0);
  const [selectedData, setSelectedData] = useState([]);
  const [target, setTarget] = useState('');
  const [formula, setFormula] = useState('');
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [solution, setSolution] = useState(false);

  useEffect(() => {
    setStep(0); setSelectedData([]); setTarget(''); setFormula(''); setAnswer('');
    setAttempts(0); setFeedback(''); setSolution(false);
  }, [exercise?.id]);

  if (!exercise || !targetLabel || !options) return null;
  const fields = Object.entries(exercise.values ?? {}).filter(([, value]) => Number.isFinite(Number(value)));
  const checkData = () => {
    const correct = fields.every(([key]) => selectedData.includes(key)) && selectedData.length === fields.length;
    if (correct) { setFeedback('Bien: identificaste los datos del problema.'); setStep(1); }
    else setFeedback(selectedData.length < fields.length ? 'Falta marcar algún dato que aparece en el enunciado.' : 'Revisá si marcaste una magnitud que el enunciado no entrega.');
  };
  const checkTarget = () => {
    if (target === exercise.expectedConcept) { setFeedback('Correcto. Ya sabés qué magnitud tenés que encontrar.'); setStep(2); return; }
    setFeedback('Volvé a leer la pregunta final: ¿qué magnitud te pide calcular?');
  };
  const checkFormula = () => {
    if (formula === options[0]) { setFeedback('Esa relación conecta los datos con la magnitud buscada.'); setStep(3); return; }
    setFeedback('Pista: fijate si buscás una componente, una altura, un tiempo o una distancia horizontal.');
  };
  const checkAnswer = event => {
    event.preventDefault();
    const result = validateExercise(exercise, answer);
    if (result.correct) { setFeedback('¡Correcto! Conectaste bien los datos y la fórmula.'); setStep(4); return; }
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    const diagnosis = diagnoseAttempt(exercise, answer, language);
    setFeedback(diagnosis.message || (nextAttempt === 1 ? 'Revisá las unidades y sustituí cada dato con cuidado.' : 'Separá el problema en pasos y comprobá qué representa cada valor.'));
  };

  return <details className="socratic-guide">
    <summary>Resolver con PyFis paso a paso</summary>
    <div className="socratic-guide-body">
      <p className="socratic-guide-intro">Vamos por partes. Primero pensás y contestás; las pistas aparecen de a poco.</p>
      <ol className="socratic-steps" aria-label="Pasos de la guía socrática">
        {['Identificar datos', 'Decidir qué buscar', 'Elegir una fórmula', 'Calcular y comprobar'].map((label, index) => <li key={label} className={step === index ? 'is-current' : step > index ? 'is-done' : ''}>{label}</li>)}
      </ol>
      {step === 0 && <fieldset className="socratic-options"><legend>¿Qué datos reconocés en el enunciado?</legend>
        {fields.map(([key, value]) => <label key={key}><input type="checkbox" checked={selectedData.includes(key)} onChange={() => setSelectedData(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])} /><span>{VALUE_LABELS[key] ?? key}: <strong>{formatNumber(value)} {VALUE_UNITS[key] ?? ''}</strong></span></label>)}
        <button type="button" className="btn btn-secondary" onClick={checkData} disabled={!selectedData.length}>Revisar los datos</button>
      </fieldset>}
      {step === 1 && <fieldset className="socratic-options"><legend>¿Qué magnitud te pide hallar?</legend>
        {targetChoices.map(([id, label]) => <label key={id}><input type="radio" name={`socratic-target-${exercise.id}`} value={id} checked={target === id} onChange={() => setTarget(id)} /><span>{label}</span></label>)}
        <button type="button" className="btn btn-secondary" onClick={checkTarget} disabled={!target}>Comprobar qué buscamos</button>
      </fieldset>}
      {step === 2 && <fieldset className="socratic-options"><legend>¿Qué fórmula usarías para {targetLabel.toLocaleLowerCase()}?</legend>
        {formulaChoices.map(item => <label key={item}><input type="radio" name={`socratic-formula-${exercise.id}`} value={item} checked={formula === item} onChange={() => setFormula(item)} /><span>{item}</span></label>)}
        <button type="button" className="btn btn-secondary" onClick={checkFormula} disabled={!formula}>Revisar fórmula</button>
      </fieldset>}
      {step === 3 && <form className="socratic-calculate" onSubmit={checkAnswer}>
        <label htmlFor={`socratic-answer-${exercise.id}`}>¿Qué resultado obtenés? Ingresá solo el número.</label>
        <div><input id={`socratic-answer-${exercise.id}`} className="quiz-input" inputMode="decimal" value={answer} onChange={event => setAnswer(event.target.value)} /><span>{exercise.unit}</span><button type="submit" className="btn btn-primary" disabled={!answer.trim()}>Comprobar</button></div>
        {attempts > 0 && attempts < 3 && <p className="socratic-hint">Pista {attempts}: {exercise.hints?.[Math.min(attempts, (exercise.hints?.length ?? 1) - 1)] ?? 'Revisá la relación trigonométrica y las unidades.'}</p>}
        {attempts >= 3 && <button type="button" className="btn btn-text" onClick={() => setSolution(true)}>Ver la resolución completa</button>}
      </form>}
      {step === 4 && <div className="socratic-success" role="status"><strong>¡Buen trabajo! Resolviste el problema por pasos.</strong><p>Datos, magnitud y fórmula quedaron conectados antes del cálculo.</p></div>}
      {feedback && <p className="socratic-feedback" role="status" aria-live="polite">{feedback}</p>}
      {solution && <aside className="socratic-solution"><strong>Resolución</strong><p>{exercise.hints?.at(-1) ?? `${options[0]} = ${formatNumber(exercise.correctAnswer)} ${exercise.unit}`}</p></aside>}
    </div>
  </details>;
}
