import { useState } from 'react';
import { encodeClassConfig, decodeClassConfig } from '../utils/classCode.js';

const SUBTEMAS = [
  { id: 'parabolico', label: 'Parabólico' },
  { id: 'cinematica', label: 'Cinemática' },
  { id: 'vectores', label: 'Vectores' },
  { id: 'hooke', label: 'Hooke' },
];

export default function TeacherMode({ attempts, confidence, classConfig, onJoinClass }) {
  const joined = Boolean(classConfig);

  return (
    <section className="card teacher-mode" aria-label="Modo docente y clase">
      <h2>Modo Aula / Docente</h2>
      <p className="teacher-note">
        {joined
          ? 'Clase activa en este dispositivo: la configuración sincronizó sin conexión.'
          : 'Generá un código de clase para configurar la sesión, o unite al aula de tu profesor. Todo funciona en modo avión.'}
      </p>

      <ul className="teacher-stats">
        <li>Intentos registrados: {attempts}</li>
        <li>XP acumulada: {Number(confidence) || 0}</li>
      </ul>

      {joined ? (
        <div className="teacher-block">
          <p className="quiz-justification-label">Clase activa</p>
          <ul className="teacher-stats">
            <li>Flashcards por repaso: {classConfig.flashcards}</li>
            <li>Subtemas habilitados: {classConfig.subtemas.join(', ')}</li>
            <li>Ejercicios prácticos: {classConfig.ejercicios}</li>
          </ul>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onJoinClass?.(null)}
          >
            Salir de la clase
          </button>
        </div>
      ) : (
        <TeacherControls onJoinClass={onJoinClass} />
      )}
    </section>
  );
}

function TeacherControls({ onJoinClass }) {
  const [flashcards, setFlashcards] = useState(10);
  const [subtemas, setSubtemas] = useState(SUBTEMAS.map((subtema) => subtema.id));
  const [ejercicios, setEjercicios] = useState(3);
  const [classCode, setClassCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const toggleSubtema = (id) => {
    setSubtemas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleGenerate = () => {
    const code = encodeClassConfig({
      flashcards,
      subtemas,
      ejercicios,
    });
    setClassCode(code);
    setError('');
  };

  const handleJoin = () => {
    const config = decodeClassConfig(joinCode.trim());
    if (!config) {
      setError('Código inválido: revisá el formato (ejemplo: GP08F12).');
      return;
    }
    setError('');
    onJoinClass?.(config);
  };

  return (
    <>
      <div className="teacher-block">
        <p className="quiz-justification-label">Configuración del docente</p>
        <label className="teacher-field">
          <span>Flashcards por repaso (5 a 20):</span>
          <input
            className="quiz-input"
            type="number"
            min={5}
            max={20}
            value={flashcards}
            onChange={(event) =>
              setFlashcards(Math.min(20, Math.max(5, Number(event.target.value) || 5)))
            }
          />
        </label>
        <div className="teacher-subtemas">
          {SUBTEMAS.map((subtema) => (
            <label key={subtema.id} className="teacher-subtema">
              <input
                type="checkbox"
                checked={subtemas.includes(subtema.id)}
                onChange={() => toggleSubtema(subtema.id)}
              />
              {subtema.label}
            </label>
          ))}
        </div>
        <label className="teacher-field">
          <span>Cantidad de ejercicios prácticos (1 a 10):</span>
          <input
            className="quiz-input"
            type="number"
            min={1}
            max={10}
            value={ejercicios}
            onChange={(event) =>
              setEjercicios(Math.min(10, Math.max(1, Number(event.target.value) || 1)))
            }
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={handleGenerate}>
          Generar Código de Clase
        </button>
        {classCode && (
          <p className="class-code-display">
            Código para compartir con tus estudiantes: <strong>{classCode}</strong>
          </p>
        )}
      </div>

      <div className="teacher-block">
        <p className="quiz-justification-label">Unirse con Código</p>
        <div className="quiz-actions">
          <input
            className="quiz-input"
            type="text"
            autoComplete="off"
            placeholder="Ej: GP08F12"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={!joinCode.trim()}
          >
            Unirse
          </button>
        </div>
        {error && <p className="teacher-error">{error}</p>}
      </div>
    </>
  );
}
