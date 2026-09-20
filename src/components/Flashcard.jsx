import { useState } from 'react';

export default function Flashcard({ flashcard, consolidated, onConsolidate }) {
  const [flipped, setFlipped] = useState(false);

  const handleConsolidate = () => {
    onConsolidate?.(flashcard.id);
  };

  return (
    <section className="card flashcard" aria-label={`Tarjeta: ${flashcard.front}`}>
      <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <p className="flashcard-topic">{flashcard.topic}</p>
          <p className="flashcard-text">{flashcard.front}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFlipped(true)}
          >
            Mostrar respuesta
          </button>
        </div>
        <div className="flashcard-face flashcard-back">
          <p className="flashcard-text">{flashcard.back}</p>
          {consolidated && <span className="chip chip-consolidated">Consolidada</span>}
          <div className="flashcard-actions">
            <button type="button" className="btn btn-primary" onClick={handleConsolidate}>
              ¡Aikuaa porãma!
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFlipped(false)}
            >
              Ahecha jey pota
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
