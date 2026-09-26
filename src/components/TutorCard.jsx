import { useEffect, useRef, useState } from 'react';
import { Nanduti } from './Nanduti.jsx';
export default function TutorCard({ tutor }) {
  const message = tutor?.message ?? '¡Mba’éichapa! Vamos a aprender Física paso a paso.';
  const [history, setHistory] = useState([]);
  const previous = useRef(null);
  useEffect(() => {
    if (tutor?.streaming) return;
    if (previous.current?.message !== message) {
      const old = previous.current;
      if (old && old.message !== 'Cargando tutor...') setHistory(items => [...items, old].slice(-3));
      previous.current = { message, esHint: tutor?.esHint };
    }
  }, [message, tutor?.esHint, tutor?.streaming]);
  const source = tutor?.source === 'gemini' ? 'Gemini con conexión' : tutor?.source === 'local-model' ? 'Modelo en el dispositivo' : tutor?.source === 'rules' ? 'Tutor local sin conexión' : tutor?.available === false ? 'Tutor no disponible' : 'Tutor listo';
  return (
    <section className="card tutor-card" aria-label="Tutor Jopara">
      <div className="tutor-avatar" aria-hidden="true"><Nanduti size={34} spokes={12} rings={2} /></div>
      <div className="tutor-body">
        <p className="tutor-name">Tutor <span>· Pytyvõhára</span></p>
        <p className="tutor-message" role="status" aria-live="polite">{message}</p>
        {tutor?.esHint && <p className="tutor-es-hint">{tutor.esHint}</p>}
        {tutor?.followUp && <p className="tutor-follow-up">{tutor.followUp}</p>}
        <p className="tutor-source">{source}</p>
        {history.length > 0 && <details className="tutor-history"><summary>Mensajes anteriores ({history.length})</summary><ol>{history.map((item, index) => <li key={index}><p>{item.message}</p>{item.esHint && <small>{item.esHint}</small>}</li>)}</ol></details>}
      </div>
    </section>
  );
}
