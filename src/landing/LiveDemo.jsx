import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { MathText } from '../components/MathText.jsx';
import RuleTutorProvider from '../ai/RuleTutorProvider.js';

// Demo en vivo: el tutor local de la app (herramientas offline + base de
// conocimiento), sin clave API ni internet. No guarda nada.
export default function LiveDemo({ text }) {
  const { language } = useTranslation();
  const lang = language === 'es' ? 'es' : 'gn-jopara';
  const tutor = useMemo(() => new RuleTutorProvider(), []);
  const [tab, setTab] = useState('notebook');
  const [custom, setCustom] = useState('');
  const [draft, setDraft] = useState('');
  const [answer, setAnswer] = useState(null);
  const question = tab === 'custom' ? custom : text.questions[tab];

  useEffect(() => {
    let alive = true;
    setAnswer(null);
    tutor.respond({ tipo: 'charla_libre', message: question, history: [], language: lang })
      .then(result => { if (alive) setAnswer(result); })
      .catch(() => { if (alive) setAnswer({ message: text.noAnswer }); });
    return () => { alive = false; };
  }, [tutor, question, lang, text.noAnswer]);

  const ask = event => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setCustom(value);
    setTab('custom');
    setDraft('');
  };
  const widget = answer?.widget && tab === 'sim' ? { ...answer.widget, view: '3d' } : answer?.widget;

  return <div className="lp-live">
    <div className="lp-live-tabs" role="tablist">
      {Object.entries(text.tabs).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <form className="lp-live-ask" onSubmit={ask}>
      <input value={draft} onChange={event => setDraft(event.target.value)} placeholder={text.placeholder} aria-label={text.placeholder} maxLength={300} />
      <button type="submit" disabled={!draft.trim()}>{text.send}</button>
    </form>
    <p className="lp-live-note">{text.offline}</p>
    <div className="lp-live-chat" role="tabpanel" aria-live="polite">
      <div className="lp-live-msg is-user"><small>{text.you}</small><p>{question}</p></div>
      <div className="lp-live-msg is-tutor">
        <small>{text.tutor}</small>
        {answer ? <MathText text={answer.message || text.noAnswer} /> : <p className="lp-live-wait">…</p>}
        {widget && <ChatWidget key={`${tab}-${question}-${language}`} widget={widget} />}
      </div>
    </div>
  </div>;
}
