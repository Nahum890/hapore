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
        <div className="custom-exercise-step"><span>1</span><label className="teacher-field">Escribí el enunciado
          <textarea className="quiz-input" rows={3} value={form.question} onChange={update('question')} placeholder="Ej.: Un dron lanza una pelota a 20 m/s con un ángulo de 30°. ¿Cuál es su velocidad horizontal?" required />
        </label></div>
        <div className="custom-exercise-step"><span>2</span><label className="teacher-field">¿Qué resultado debe calcular?
          <select value={form.conceptValue} onChange={update('conceptValue')}>
            {CONCEPT_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label></div>
        <div className="custom-exercise-step"><span>3</span><div className="custom-exercise-data"><h4>Cargá los datos del problema</h4><p className="field-help">Usá aquí los mismos números que escribiste en el enunciado.</p><div className="custom-exercise-values">
          <label className="teacher-field">Velocidad inicial · m/s
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.v0} onChange={update('v0')} required />
          </label>
          {option?.needsAngle ? (
            <label className="teacher-field">Ángulo · grados
              <input className="quiz-input" type="number" step="1" min="1" max="89" value={form.angle} onChange={update('angle')} required />
            </label>
          ) : (
            <label className="teacher-field">Distancia objetivo · metros
              <input className="quiz-input" type="number" step="0.1" min="1" value={form.targetDistance} onChange={update('targetDistance')} required />
            </label>
          )}
          <label className="teacher-field">Gravedad · m/s²
            <input className="quiz-input" type="number" step="0.1" min="1" value={form.gravity} onChange={update('gravity')} required />
          </label>
        </div></div></div>
        <p className="custom-exercise-preview" aria-live="polite">Respuesta para corregir: <strong>{Number.isFinite(previewAnswer) ? previewAnswer : '—'} {option?.unit}</strong><small>Solo la ve el docente.</small></p>
        <details className="custom-exercise-context"><summary>Opciones adicionales: situación y dificultad</summary>
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
        </details>
        <details className="custom-exercise-hints">
          <summary>Pistas opcionales (se generan automáticamente si las dejás vacías)</summary>
          {hints.map((text, index) => (
            <label key={index} className="teacher-field">Pista {index + 1}
              <textarea className="quiz-input" rows={1} value={text} onChange={updateHint(index)} placeholder={defaultHints[index]} />
            </label>
          ))}
        </details>
        {error && <p className="field-error" role="alert">{error}</p>}
        {created && <p className="field-help" role="status">Ejercicio guardado. Ya está disponible para practicar y proyectar.</p>}
        <button type="submit" className="btn btn-primary">Guardar ejercicio</button>
      </form>
      {exercises.length > 0 && (
        <div className="teacher-block">
          <h3>Tus ejercicios ({exercises.length})</h3>
          <ul className="aula-list">
            {exercises.map(item => (
              <li key={item.id} className="aula-item custom-exercise-item">
                <div><span className="chip chip-topic">{SCENARIOS.find(s => s.value === item.scenario)?.label ?? item.scenario}</span> <span className="chip chip-difficulty">{item.difficulty}</span></div>
                <p>{item.question}</p>
                <small>Resultado para corregir: {item.correctAnswer} {item.unit}</small>
                <button type="button" className="btn btn-secondary" onClick={() => remove(item.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
