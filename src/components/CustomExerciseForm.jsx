import { useMemo, useState } from 'react';
import { CONCEPT_OPTIONS, SCENARIOS, buildDefaultHints, computeAnswer, createCustomExercise, deleteCustomExercise } from '../utils/customExercises.js';

const DIFFICULTIES = [
  { value: 'básico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

const emptyForm = {
  scenario: 'dron',
  difficulty: 'básico',
  question: '',
  conceptValue: 'componente-horizontal',
  v0: '20',
  angle: '30',
  gravity: '9.8',
  targetDistance: '30',
};

export default function CustomExerciseForm({ exercises, onChange }) {
  const [form, setForm] = useState(emptyForm);
  const [hints, setHints] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  const option = CONCEPT_OPTIONS.find(item => item.value === form.conceptValue);

  const previewAnswer = useMemo(() => {
    const values = option?.needsAngle
      ? { v0: form.v0, angle: form.angle, gravity: form.gravity }
      : { v0: form.v0, gravity: form.gravity, targetDistance: form.targetDistance };
    return computeAnswer(form.conceptValue, values);
  }, [form, option]);

  const defaultHints = useMemo(
    () => buildDefaultHints(form.conceptValue, previewAnswer),
    [form.conceptValue, previewAnswer],
  );

  const update = (field) => (event) => {
    setCreated(false);
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateHint = (index) => (event) => {
    setHints((prev) => prev.map((text, position) => (position === index ? event.target.value : text)));
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');
    setCreated(false);
    if (!form.question.trim()) { setError('Escribí el enunciado del ejercicio.'); return; }
    if (!Number.isFinite(previewAnswer)) { setError('Revisá los datos: no se pudo calcular una respuesta con esos números.'); return; }
    const exercise = createCustomExercise({ ...form, conceptValue: form.conceptValue, hints });
    if (!exercise) { setError('No se pudo crear el ejercicio. Revisá los datos.'); return; }
    setCreated(true);
    setForm(emptyForm);
    setHints(['', '', '', '']);
    onChange?.();
  };

  const remove = (id) => {
    deleteCustomExercise(id);
    onChange?.();
  };

  return (
    <div className="custom-exercise-stack">
      <form className="teacher-block custom-exercise-form" onSubmit={submit}>
        <h3>Crear tu propio ejercicio</h3>
        <p className="teacher-note">La respuesta correcta se calcula sola con el motor físico de la app: cargá los datos y elegí qué le pedís al alumno.</p>
        <label className="teacher-field">Situación
          <select value={form.scenario} onChange={update('scenario')}>
            {SCENARIOS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="teacher-field">Dificultad
          <select value={form.difficulty} onChange={update('difficulty')}>
            {DIFFICULTIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="teacher-field">Enunciado
          <textarea className="quiz-input" rows={2} value={form.question} onChange={update('question')} placeholder="Ej: Un dron despega con v0 = 18 m/s y ángulo de 35°. ¿Cuánto vale...?" required />
        </label>
        <label className="teacher-field">¿Qué le pedís al alumno?
          <select value={form.conceptValue} onChange={update('conceptValue')}>
            {CONCEPT_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div className="custom-exercise-values">
          <label className="teacher-field">Velocidad inicial (v0, m/s)
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.v0} onChange={update('v0')} required />
          </label>
          {option?.needsAngle ? (
            <label className="teacher-field">Ángulo (°)
              <input className="quiz-input" type="number" step="1" min="1" max="89" value={form.angle} onChange={update('angle')} required />
            </label>
          ) : (
            <label className="teacher-field">Distancia objetivo (m)
              <input className="quiz-input" type="number" step="0.1" min="1" value={form.targetDistance} onChange={update('targetDistance')} required />
            </label>
          )}
          <label className="teacher-field">Gravedad (m/s²)
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.gravity} onChange={update('gravity')} required />
          </label>
        </div>
        <p className="custom-exercise-preview" aria-live="polite">
          Respuesta correcta calculada: <strong>{Number.isFinite(previewAnswer) ? previewAnswer : '—'} {option?.unit}</strong>
        </p>
        <details className="custom-exercise-hints">
          <summary>Pistas (opcional: si las dejás vacías, se generan solas)</summary>
          {hints.map((text, index) => (
            <label key={index} className="teacher-field">Pista {index + 1}
              <textarea className="quiz-input" rows={1} value={text} onChange={updateHint(index)} placeholder={defaultHints[index]} />
            </label>
          ))}
        </details>
        {error && <p className="field-error" role="alert">{error}</p>}
        {created && <p className="field-help" role="status">Ejercicio creado. Ya aparece en la lista de abajo y en el proyector.</p>}
        <button type="submit" className="btn btn-primary">Crear ejercicio</button>
      </form>
      {exercises.length > 0 && (
        <div className="teacher-block">
          <h3>Tus ejercicios ({exercises.length})</h3>
          <ul className="aula-list">
            {exercises.map(item => (
              <li key={item.id} className="aula-item custom-exercise-item">
                <div><span className="chip chip-topic">{SCENARIOS.find(s => s.value === item.scenario)?.label ?? item.scenario}</span> <span className="chip chip-difficulty">{item.difficulty}</span></div>
                <p>{item.question}</p>
                <small>Respuesta: {item.correctAnswer} {item.unit}</small>
                <button type="button" className="btn btn-secondary" onClick={() => remove(item.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
