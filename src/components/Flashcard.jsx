import { useEffect, useState } from 'react';

export default function Flashcard({ flashcard, consolidated, onConsolidate, onReviewLater }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [flashcard?.id]);

  const frenteEs = flashcard?.frente_es ?? flashcard?.front ?? '';
  const frenteJopara = flashcard?.frente_jopara ?? '';
  const dorsoConcepto = flashcard?.dorso_concepto ?? flashcard?.back ?? '';
  const formula = flashcard?.formula ?? '';

  return (
    <section className="card flashcard" aria-label={`Tarjeta: ${frenteEs}`}>
      <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <div>
            <p className="flashcard-topic">{flashcard?.topic}</p>
            <p className="flashcard-text">{frenteEs}</p>
            {frenteJopara && <p className="flashcard-jopara">{frenteJopara}</p>}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFlipped(true)}
          >
            Mostrar respuesta
          </button>
        </div>
        <div className="flashcard-face flashcard-back">
          <div>
            <p className="flashcard-topic">{flashcard?.topic}</p>
            <p className="flashcard-text">{dorsoConcepto}</p>
            {formula && <p className="flashcard-formula">{formula}</p>}
            {consolidated && <span className="chip chip-consolidated">Consolidada</span>}
          </div>
          <div className="flashcard-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onConsolidate?.(flashcard?.id)}
            >
              ¡Aikuaa porãma! (Lo tengo claro)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onReviewLater?.(flashcard?.id)}
            >
              Ahecha jey pota (Repasar luego)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
