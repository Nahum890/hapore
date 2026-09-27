import { useEffect, useRef, useState } from 'react';
import { Formula, MathText } from './MathText.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export default function Flashcard({ flashcard, consolidated, onConsolidate, onReviewLater }) {
  const { t } = useTranslation();
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
      aria-label={t('flashcard.label', { front })}
      aria-busy={leaving}
    >
      <div className={'flashcard-inner ' + (flipped ? 'is-flipped' : '')}>
        <div className="flashcard-face flashcard-front" aria-hidden={flipped} inert={flipped ? '' : undefined}>
          <div>
            <p className="flashcard-topic">{flashcard?.topic || t('flashcard.defaultTopic')}</p>
            <h3 className="flashcard-text"><MathText text={front} /></h3>
          </div>
          <button type="button" className="btn btn-secondary" tabIndex={flipped ? -1 : 0} onClick={() => setFlipped(true)} aria-expanded={flipped}>
            {t('flashcard.show')}
          </button>
        </div>
        <div className="flashcard-face flashcard-back" aria-hidden={!flipped} inert={!flipped ? '' : undefined}>
          <div ref={answerRef} tabIndex={-1} className="flashcard-answer" aria-live="polite">
            <div className="flashcard-back-head">
              <p className="flashcard-topic">{flashcard?.topic || t('flashcard.answer')}</p>
              <button type="button" className="btn btn-sm btn-light flashcard-flip-back" tabIndex={flipped ? 0 : -1} onClick={() => setFlipped(false)} aria-label={t('flashcard.backLabel')}>
                {t('flashcard.back')}
              </button>
            </div>
            <MathText as="p" className="flashcard-text" text={flashcard?.dorso_concepto ?? flashcard?.back ?? ''} />
            {flashcard?.formula && <p className="flashcard-formula"><Formula text={flashcard.formula} /></p>}
            {consolidated && <span className="chip chip-consolidated">{t('flashcard.consolidated')}</span>}
          </div>
          <div className="flashcard-actions">
            <button type="button" className="btn btn-primary" tabIndex={flipped ? 0 : -1} disabled={leaving} onClick={() => advance(onConsolidate)}>{t('flashcard.know')}</button>
            <button type="button" className="btn btn-secondary" tabIndex={flipped ? 0 : -1} disabled={leaving} onClick={() => advance(onReviewLater)}>{t('flashcard.later')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
