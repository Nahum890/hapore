import { useEffect, useRef, useState } from 'react';
import { MathText } from './MathText.jsx';
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
  const source = tutor?.source === 'gemini' ? 'Gemini con conexión'
    : tutor?.source === 'local-model' ? 'Modelo en el dispositivo'
      : tutor?.source === 'rules' && tutor?.reason === 'offline' ? 'Tutor local · sin conexión'
        : tutor?.source === 'rules' && ['consent-required', 'local-only'].includes(tutor?.reason) ? 'Tutor local · Gemini no habilitado'
          : tutor?.source === 'rules' && ['rate-limited', 'timeout', 'online-fallback'].includes(tutor?.reason) ? 'Tutor local · respaldo de Gemini'
            : tutor?.source === 'rules' ? 'Tutor local'
            : tutor?.available === false ? 'Tutor no disponible' : 'Tutor listo';
  return (
    <section className="card tutor-card" aria-label="Tutor Jopara">
      <div className="tutor-avatar" aria-hidden="true"><Nanduti size={34} spokes={12} rings={2} /></div>
      <div className="tutor-body">
        <p className="tutor-name">Tutor <span>· Pytyvõhára</span></p>
        <p className="tutor-message" role="status" aria-live="polite"><MathText text={message} /></p>
        {tutor?.loading && <p className="chat-typing tutor-typing" role="status" aria-live="polite"><span>El tutor está preparando una respuesta</span><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></p>}
        {tutor?.esHint && <MathText as="p" className="tutor-es-hint" text={tutor.esHint} />}
        {tutor?.followUp && <p className="tutor-follow-up">{tutor.followUp}</p>}
        <p className="tutor-source">{source}</p>
        {history.length > 0 && <details className="tutor-history"><summary>Mensajes anteriores ({history.length})</summary><ol>{history.map((item, index) => <li key={index}><MathText as="p" text={item.message} />{item.esHint && <MathText as="small" text={item.esHint} />}</li>)}</ol></details>}
      </div>
    </section>
  );
}
