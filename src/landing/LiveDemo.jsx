import { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { MathText } from '../components/MathText.jsx';
import { offlineChatAnswer } from '../ai/chatTools.js';

// Demo en vivo: las mismas herramientas offline del chat de la app, con
// preguntas de ejemplo. No guarda nada ni usa internet.
export default function LiveDemo({ text }) {
  const { language } = useTranslation();
  const [tab, setTab] = useState('notebook');
  const question = text.questions[tab];
  const answer = useMemo(() => offlineChatAnswer(question, [], language === 'es' ? 'es' : 'gn-jopara'), [question, language]);
  const widget = answer?.widget && tab === 'sim' ? { ...answer.widget, view: '3d' } : answer?.widget;
  return <div className="lp-live">
    <div className="lp-live-tabs" role="tablist">
      {Object.entries(text.tabs).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <div className="lp-live-chat" role="tabpanel">
      <div className="lp-live-msg is-user"><small>{text.you}</small><p>{question}</p></div>
      <div className="lp-live-msg is-tutor">
        <small>{text.tutor}</small>
        <MathText text={answer?.message ?? ''} />
        {widget && <ChatWidget key={`${tab}-${language}`} widget={widget} />}
      </div>
    </div>
  </div>;
}
