// Preguntas conceptuales de un tema (opción múltiple) con explicación.
import { useMemo, useState } from 'react';
import { pickLang } from '../../curriculum/topics/index.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';
import { MathText } from '../MathText.jsx';

function shuffled(list, seed) {
  const copy = list.map((item, index) => ({ item, index, key: Math.sin(seed * (index + 1)) }));
  return copy.sort((a, b) => a.key - b.key);
}

export default function TopicQuiz({ topic, onAnswer }) {
  const { t, language } = useTranslation();
  const [round, setRound] = useState(1);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const questions = useMemo(() => topic.quiz.map((question, qi) => ({ ...question, qi, order: shuffled(question.options, round * 7 + qi) })), [topic, round]);
  const done = step >= questions.length;
  const current = questions[step];

  const choose = optionIndex => {
    if (picked !== null) return;
    setPicked(optionIndex);
    const correct = optionIndex === current.a;
    if (correct) setScore(value => value + 1);
    onAnswer?.({ questionId: `${topic.id}:q${current.qi}`, correct });
  };
  const next = () => { setStep(value => value + 1); setPicked(null); };
  const again = () => { setRound(value => value + 1); setStep(0); setPicked(null); setScore(0); };

  if (done) return <section className="topic-quiz card" role="status">
    <h3>{t('tquiz.done')}</h3>
    <p className="topic-quiz-score">{t('tquiz.score', { c: score, t: questions.length })}</p>
    <button type="button" className="btn btn-primary" onClick={again}>{t('tquiz.again')}</button>
  </section>;

  return <section className="topic-quiz card">
    <div className="topic-practice-head"><span className="panel-eyebrow">{step + 1} / {questions.length}</span><span className="topic-chip">{t('tquiz.score', { c: score, t: questions.length })}</span></div>
    <MathText as="p" className="topic-quiz-question" text={pickLang(current.q, language)} />
    <div className="topic-quiz-options">
      {current.order.map(({ item, index }) => {
        const state = picked === null ? '' : index === current.a ? ' is-right' : index === picked ? ' is-wrong' : ' is-muted';
        return <button key={index} type="button" className={`topic-quiz-option${state}`} onClick={() => choose(index)} disabled={picked !== null}>
          <MathText text={pickLang(item, language)} />
        </button>;
      })}
    </div>
    {picked !== null && <>
      <p className={`topic-feedback ${picked === current.a ? 'is-good' : 'is-bad'}`} role="status"><MathText text={pickLang(current.why, language)} /></p>
      <button type="button" className="btn btn-primary" onClick={next}>{t(step + 1 >= questions.length ? 'tquiz.finish' : 'tquiz.next')}</button>
    </>}
  </section>;
}
