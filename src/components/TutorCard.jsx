import { useEffect, useRef, useState } from 'react';
import { MathText } from './MathText.jsx';
import { Nanduti } from './Nanduti.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { tutorSourceKey } from '../ai/tutorSource.js';

export default function TutorCard({ tutor }) {
  const { t, language } = useTranslation();
  const message = tutor?.message ?? t('tutor.default');
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
  const sourceKey = tutorSourceKey(tutor ?? {}) ?? (tutor?.available === false ? 'tutor.src.unavailable' : 'tutor.src.ready');
  return (
    <section className="card tutor-card" aria-label={t('tutor.label')}>
      <div className="tutor-avatar" aria-hidden="true"><Nanduti size={34} spokes={12} rings={2} /></div>
      <div className="tutor-body">
        <p className="tutor-name">{t('tutor.name')} <span>· {t('tutor.nameSub')}</span></p>
        <p className="tutor-message" role="status" aria-live="polite"><MathText text={message} /></p>
        {tutor?.loading && <p className="chat-typing tutor-typing" role="status" aria-live="polite"><span>{t('tutor.preparing')}</span><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></p>}
        {/* La ayuda extra se muestra en el idioma activo (antes aparecía en castellano también en modo Jopara). */}
        {(language === 'es' ? tutor?.esHint : tutor?.joparaHint) && <MathText as="p" className="tutor-es-hint" text={language === 'es' ? tutor.esHint : tutor.joparaHint} />}
        {tutor?.followUp && <p className="tutor-follow-up">{tutor.followUp}</p>}
        <p className="tutor-source">{t(sourceKey)}</p>
        {history.length > 0 && <details className="tutor-history"><summary>{t('tutor.previous', { n: history.length })}</summary><ol>{history.map((item, index) => <li key={index}><MathText as="p" text={item.message} /></li>)}</ol></details>}
      </div>
    </section>
  );
}
