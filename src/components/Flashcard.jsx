import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export default function Flashcard({ flashcard, consolidated, onConsolidate, onReviewLater }) {
  const { language } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null), locked = useRef(false), answerRef = useRef(null);

  useEffect(() => {
    setFlipped(false); setLeaving(false); locked.current = false;
    return () => clearTimeout(timer.current);
  }, [flashcard?.id]);

  useEffect(() => {
    if (flipped) answerRef.current?.focus({ preventScroll: true });
  }, [flipped]);

  const advance = callback => {
    if (locked.current || !flipped) return;
    locked.current = true; setLeaving(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      callback?.(flashcard?.id);
      // A one-card review-later keeps the same component mounted.
      setFlipped(false); setLeaving(false); locked.current = false;
    }, reduced ? 0 : 200);
  };

  const front = flashcard?.frente_es ?? flashcard?.front ?? '';

  return (
    <section
      className={'card flashcard deck-card-enter ' + (leaving ? 'deck-card-leave' : '')}
      aria-label={'Tarjeta de repaso: ' + front}
      aria-busy={leaving}
    >
      <div className={'flashcard-inner ' + (flipped ? 'is-flipped' : '')}>
        <div className="flashcard-face flashcard-front" aria-hidden={flipped} inert={flipped ? '' : undefined}>
          <div>
            <p className="flashcard-topic">{flashcard?.topic || 'Movimiento Parabólico'}</p>
            <h3 className="flashcard-text">
              {front}
              {language !== 'es' && (
                <small className="bilingual-es" lang="es">
                  {' '}Jopara · borrador sin revisión lingüística
                </small>
              )}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            tabIndex={flipped ? -1 : 0}
            onClick={() => setFlipped(true)}
            aria-expanded={flipped}
          >
            Mostrar respuesta
          </button>
        </div>
        <div className="flashcard-face flashcard-back" aria-hidden={!flipped} inert={!flipped ? '' : undefined}>
          <div ref={answerRef} tabIndex={-1} className="flashcard-answer" aria-live="polite">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="flashcard-topic">{flashcard?.topic || 'Respuesta'}</p>
              <button
                type="button"
                className="btn btn-sm btn-light"
                tabIndex={flipped ? 0 : -1}
                onClick={() => setFlipped(false)}
                aria-label="Volver al frente de la tarjeta"
                style={{ padding: '2px 8px', fontSize: '11px', minHeight: '28px' }}
              >
                ↺ Ver pregunta
              </button>
            </div>
            <p className="flashcard-text">{flashcard?.dorso_concepto ?? flashcard?.back ?? ''}</p>
            {flashcard?.formula && <p className="flashcard-formula">{flashcard.formula}</p>}
            {consolidated && <span className="chip chip-consolidated">Consolidada</span>}
          </div>
          <div className="flashcard-actions">
            <button
              type="button"
              className="btn btn-primary"
              tabIndex={flipped ? 0 : -1}
              disabled={leaving}
              onClick={() => advance(onConsolidate)}
            >
              ¡Aikuaa porãma! (Lo tengo claro)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              tabIndex={flipped ? 0 : -1}
              disabled={leaving}
              onClick={() => advance(onReviewLater)}
            >
              Ahecha jey pota (Repasar luego)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
