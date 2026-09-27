import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import './components/ChatConversation.css';
import Header from './components/Header.jsx';
import ConfidenceBar from './components/ConfidenceBar.jsx';
import TutorCard from './components/TutorCard.jsx';
import ExerciseCard from './components/ExerciseCard.jsx';
import Flashcard from './components/Flashcard.jsx';
import TeacherMode from './components/TeacherMode.jsx';
import StudentClass from './components/StudentClass.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import PdfButton from './components/PdfButton.jsx';
import Onboarding from './components/Onboarding.jsx';
import CurriculumBadge from './components/CurriculumBadge.jsx';
import TheorySection from './components/TheorySection.jsx';
import CanvasSimulator from './simulator/CanvasSimulator.jsx';
import PredictLaunchGame from './simulator/PredictLaunchGame.jsx';
import TrajectoryDrawingPractice from './components/TrajectoryDrawingPractice.jsx';
import ExplorationLab from './simulator/ExplorationLab.jsx';
import AIPrivacyNotice from './components/AIPrivacyNotice.jsx';
import { useSpeechRecognition, useSpeechSynthesis } from './hooks/useSpeech.js';
import { imageFileToDataUrl } from './utils/imageData.js';
import {
  concepts as conceptsData,
  errors as errorsData,
  exercises as builtInExercisesData,
  flashcards as flashcardsData,
  glossary as glossaryData,
  scienceSources as scienceSourcesData,
  localizeCatalogItem,
} from './data/catalogs.js';
import { getCustomExercises } from './utils/customExercises.js';
import { joinClass, leaveClass } from './utils/classroom.js';
import ProfileSettings from './components/ProfileSettings.jsx';
import { Formula, MathText } from './components/MathText.jsx';
import TutorWorkbench from './components/TutorWorkbench.jsx';
const ClassChat = lazy(() => import('./components/ClassChat.jsx'));
import { isCloudConfigured } from './cloud/cloudClient.js';
import { downloadClass, flushProgress, getClassPackage, getPendingProgress, leaveCloudClass, progressSnapshot, queueProgress, syncMyProfile } from './cloud/classCloud.js';

// Los ejercicios que crea el docente viven en este dispositivo (ver
// src/utils/customExercises.js) y se suman a los del banco fijo dondequiera
// que la app necesite "todos los ejercicios disponibles".
const getAllExercises = () => [...builtInExercisesData, ...getCustomExercises()];
import { useOfflineStorage } from './hooks/useOfflineStorage.js';
import { useTutor } from './hooks/useTutor.js';
import { useMission } from './hooks/useMission.js';
import { useQuiz } from './hooks/useQuiz.js';
import { readJSON, writeJSON, setActiveProfile } from './utils/storage.js';
import { getSession, hasContactInfo, logout } from './auth/localAccounts.js';
import { decodeClassConfig, encodeClassConfig, selectClassExercises } from './utils/classCode.js';
import { practiceRecommendation, recommendExercise, summarizeAttempts } from './pedagogy/progression.js';
import './components/TutorModes.css';
import Icon from './components/Icon.jsx';
import { LaunchScene, Nanduti } from './components/Nanduti.jsx';
import { useTranslation } from './i18n/LanguageProvider.jsx';
import { tutorSourceKey } from './ai/tutorSource.js';
import { localizeError } from './i18n/messages.js';

// Cada sección tiene su color: así se reconoce dónde estás sin leer.
const SECTIONS = [
  { id: 'inicio', icon: 'home', accent: 'primary' },
  { id: 'simulador', icon: 'launch', accent: 'earth' },
  { id: 'tarjetas', icon: 'cards', accent: 'sun' },
  { id: 'chats', icon: 'chat', accent: 'sky' },
  { id: 'aula', icon: 'class', accent: 'primary' },
  { id: 'mensajes', icon: 'people', accent: 'sky' },
];

// Un solo tema (Movimiento Parabólico) con tres situaciones: mismo motor
// físico, distinto disfraz visual en el simulador.
const SCENARIOS = [
  // Nombres visibles en messages.js: scenario.<id> y scenario.<id>Lead.
  { id: 'dron', icon: 'launch' },
  { id: 'basketball', icon: 'ball' },
  { id: 'wall', icon: 'wall' },
];

// Texto traducido en un elemento. Antes mostraba además la versión en
// castellano debajo del Jopara; se quitó para que cada idioma se vea completo
// y sin mezclas.
function Bilingual({ k, as: Tag = 'span', className = '' }) {
  const { t } = useTranslation();
  return <Tag className={className}>{t(k)}</Tag>;
}

function HomeView({ user, learning, classConfig, onNavigate, onGuide }) {
  const { t } = useTranslation();
  const teacher = user.role === 'maestro';
  const progress = summarizeAttempts(learning.attemptLog);
  const topicProgress = SCENARIOS.map(scenario => {
    const ids = new Set(getAllExercises().filter(item => item.scenario === scenario.id).map(item => item.id));
    return { topic: t(`scenario.${scenario.id}`), ...summarizeAttempts(learning.attemptLog.filter(item => ids.has(item.exerciseId))) };
  });
  // Plan de práctica: si el alumno repite el mismo tipo de error dos veces o
  // más, se le sugiere un ejercicio corto enfocado en esa dificultad puntual.
  const practicePlan = !teacher ? practiceRecommendation(getAllExercises(), learning.attemptLog) : null;
  const goToPractice = exerciseId => { learning.onSelectExercise(exerciseId); onNavigate('simulador'); };
  return <div className="home-view">
    <section className="home-hero">
      <div className="home-hero-copy">
        <span className="home-kicker">{t(teacher ? 'home.kickerTeacher' : 'home.kickerStudent')}</span>
        <h2>{t('home.hello')}, {user.name.split(' ')[0]}!</h2>
        <p>{t(teacher ? 'home.leadTeacher' : 'home.leadStudent')}</p>
        <button className="btn home-main-action" type="button" onClick={() => onNavigate(teacher ? 'aula' : 'simulador')}>{t(teacher ? 'home.ctaTeacher' : 'home.ctaStudent')} <Icon name="arrow" size={20} /></button>
      </div>
      <div className="hero-art"><LaunchScene /><span className="hero-motto"><Icon name="spark" size={16} />{t('home.motto')}</span></div>
    </section>
    <ul className="home-principles" aria-label="Kyhyje’ỹ">
      <li><Icon name="spark" size={18} /><Bilingual k="home.p1" /></li>
      <li><Icon name="retry" size={18} /><Bilingual k="home.p2" /></li>
      <li><Icon name="offline" size={18} /><Bilingual k="home.p3" /></li>
    </ul>
    <div className="home-section-heading"><Bilingual k="home.question" as="h2" /><button type="button" onClick={onGuide}><Icon name="help" size={18} />{t('home.guide')}</button></div>
    <div className="home-action-grid">
      <button className="home-action-card is-practice" type="button" onClick={() => onNavigate('simulador')}><span className="home-card-icon" aria-hidden="true"><Icon name="launch" size={26} /></span><Bilingual k="nav.simulador" as="strong" /><span className="home-card-text">{t('home.practiceText')}</span><small aria-hidden="true"><Icon name="arrow" size={18} /></small></button>
      <button className="home-action-card is-review" type="button" onClick={() => onNavigate('tarjetas')}><span className="home-card-icon" aria-hidden="true"><Icon name="cards" size={26} /></span><Bilingual k="nav.tarjetas" as="strong" /><span className="home-card-text">{t('home.reviewText')}</span><small aria-hidden="true"><Icon name="arrow" size={18} /></small></button>
      <button className="home-action-card is-tutor" type="button" onClick={() => onNavigate('chats')}><span className="home-card-icon" aria-hidden="true"><Icon name="chat" size={26} /></span><Bilingual k="nav.chats" as="strong" /><span className="home-card-text">{t('home.tutorText')}</span><small aria-hidden="true"><Icon name="arrow" size={18} /></small></button>
    </div>
    <section className="home-class-card"><Nanduti size={64} spokes={16} rings={3} className="home-class-nanduti" /><div><span className="panel-eyebrow">{t(teacher ? 'home.classEyebrowTeacher' : 'home.classEyebrowStudent')}</span><h3>{t(teacher ? 'home.classTitleTeacher' : classConfig ? 'home.classTitleJoined' : 'home.classTitleNoCode')}</h3><p>{t(teacher ? 'home.classTextTeacher' : classConfig ? 'home.classTextJoined' : 'home.classTextNoCode')}</p></div><button className="btn btn-secondary" type="button" onClick={() => onNavigate('aula')}>{t(teacher ? 'home.goTeacherClass' : 'home.goStudentClass')}</button></section>
    {practicePlan && <section className="card practice-plan" aria-label={t('plan.label')}>
      <span className="panel-eyebrow">{t('plan.eyebrow')}</span>
      <h2>{t('plan.reason', { label: t(`error.${practicePlan.pattern.errorType}`) })}</h2>
      <p>{t('plan.why', { n: practicePlan.pattern.count })}</p>
      <button type="button" className="btn btn-primary" onClick={() => goToPractice(practicePlan.exercise.id)}>{t('plan.cta')} <Icon name="arrow" size={18} /></button>
    </section>}
    {progress.attempts > 0 && <section className="card learning-progress" aria-label={t('home.progressLabel')}><div className="learning-progress-head"><div><span className="panel-eyebrow">{t('home.progressEyebrow')}</span><h2>{t('home.progressTitle')}</h2></div><strong>{t('home.accuracy', { n: progress.accuracy })}</strong></div><div className="learning-topic-grid">{topicProgress.map(item => <div key={item.topic}><div className="learning-topic-title"><strong>{item.topic}</strong><span>{t('home.topicCorrect', { c: item.correct, a: item.attempts })}</span></div><div className="learning-topic-track"><span style={{width:`${item.accuracy}%`}} /></div><small>{item.attempts ? t('home.avgTime', { s: item.averageSeconds }) : t('home.noAttempts')}</small></div>)}</div></section>}
    <p className="home-progress-note">{t('home.progressNote', { xp: learning.xp, c: progress.correct, a: progress.attempts })}{progress.attempts ? t('home.progressAccuracy', { n: progress.accuracy }) : ''}. {t('home.savedHere')}</p>
  </div>;
}

const RESOURCE_VALUE_UNITS = { v0: 'm/s', vx: 'm/s', angle: '°', angleA: '°', angleB: '°', gravity: 'm/s²', t: 's', targetDistance: 'm' };

function ResourceLibrary({ concepts, errors, examples, glossary, sources }) {
  const { language, t } = useTranslation();
  const [category, setCategory] = useState('conceptos');
  const [query, setQuery] = useState('');
  const categories = [
    { id: 'conceptos', items: concepts },
    { id: 'ejemplos', items: examples },
    { id: 'errores', items: errors },
    { id: 'glosario', items: glossary },
    { id: 'fuentes', items: sources },
  ];
  const selected = categories.find(item => item.id === category) ?? categories[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = selected.items.filter(item => JSON.stringify(item).toLocaleLowerCase().includes(normalizedQuery));

  return <section className="resource-section" aria-label={t('library.label')}>
    <div className="resource-heading"><div><span className="panel-eyebrow">{t('library.eyebrow')}</span><h2>{t('library.title')}</h2><p>{t('library.lead')}</p></div>
      <div className="resource-summary">{t('library.summary', { c: concepts.length, e: examples.length, r: errors.length, g: glossary.length, s: sources.length })}</div>
    </div>
    <div className="resource-filters" role="group" aria-label={t('library.filterLabel')}>
      {categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => { setCategory(item.id); setQuery(''); }}>{t(`library.cat.${item.id}`)}<span>{item.items.length}</span></button>)}
    </div>
    <label className="resource-search">{t('library.search', { cat: t(`library.cat.${selected.id}`).toLocaleLowerCase() })}<input type="search" className="quiz-input" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('library.searchPlaceholder')} /></label>
    {visibleItems.length ? <div className="resource-card-grid">
      {visibleItems.map(item => category === 'conceptos' ? <article className="resource-card" key={item.id}>
        <span className="resource-card-label">{t('library.keyIdea')}</span><h3>{item.name}</h3><p>{item.definition}</p>{item.formula && <code className="resource-formula"><Formula text={item.formula} /></code>}
      </article> : category === 'errores' ? <article className="resource-card" key={item.id}>
        <span className="resource-card-label">{t('library.toReview')}</span><h3>{item.name}</h3><p>{item.description}</p>{item.example && <div className="resource-example"><strong>{t('library.howToFix')}</strong><MathText as="p" text={item.example} /></div>}
      </article> : category === 'ejemplos' ? <article className="resource-card resource-worked-example" key={item.id}>
        <span className="resource-card-label">{item.topic} · {item.difficulty}</span><MathText as="h3" text={item.question} />
        <div className="resource-given-values">{Object.entries(item.values ?? {}).map(([key, value]) => <span key={key}><small>{t(`value.${key}`)}</small><strong>{value}{RESOURCE_VALUE_UNITS[key] ? ` ${RESOURCE_VALUE_UNITS[key]}` : ''}</strong></span>)}</div>
        <details><summary>{t('library.solution')}</summary><p className="resource-answer">{item.correctAnswer} {item.unit}</p><ol>{(item.hints ?? []).map((hint, index) => <li key={`${item.id}-${index}`}><MathText text={hint} /></li>)}</ol></details>
      </article> : category === 'glosario' ? <article className="resource-card" key={item.id}>
        <span className="resource-card-label">{t('library.term')}</span><h3>{item.term}</h3><p>{item.definition}</p>{language !== 'es' && item.ejemploJopara && <div className="resource-example"><strong>{t('library.example')}</strong><p>{item.ejemploJopara}</p></div>}
      </article> : <article className="resource-card resource-source-card" key={item.id}>
        <span className="resource-card-label">{item.institution}</span><h3>{item.title}</h3><p>{(language === 'es' ? item.supports : (item.supportsJopara ?? item.supports))?.join(' · ')}</p><p className="resource-source-note">{language === 'es' ? item.assumptions : (item.assumptionsJopara ?? item.assumptions)}</p><small>{item.publicationYear}{item.authors?.length ? ` · ${item.authors.join(', ')}` : ''}{item.license ? ` · ${item.license}` : ''}</small><a href={item.url} target="_blank" rel="noreferrer">{t('library.openSource')} <Icon name="arrow" size={16} /></a>
      </article>)}
    </div> : <p className="resource-empty">{t('library.empty')}</p>}
  </section>;
}

function AulaView({ classConfig, onJoinClass, concepts, errors, examples, glossary, sources, teacher }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="aula-toolbar"><p>{t('aula.toolbar')}</p><PdfButton /></div>
      <TeacherMode classConfig={classConfig} onJoinClass={onJoinClass} teacher={teacher} />
      <ResourceLibrary concepts={concepts} errors={errors} examples={examples} glossary={glossary} sources={sources} />
    </>
  );
}

function QuizSelector({ quiz }) {
  const { t } = useTranslation();
  // Nunca queda vacío: sin tarjetas, estado vacío explicado; con pocas
  // (menos del mínimo de 5), un único botón con todas las disponibles.
  if (quiz.maxAvailable <= 0) {
    return <section className="card deck-empty" role="status">
      <h2>{t('repaso.emptyTitle')}</h2>
      <p className="deck-selector-note">{t('repaso.emptyText')}</p>
    </section>;
  }
  const options = [...new Set([5, 10, 20, quiz.maxAvailable])].filter(count => count <= quiz.maxAvailable).sort((a, b) => a - b);
  const label = count => (count === quiz.maxAvailable ? t('repaso.optFull') : count === 5 ? t('repaso.optQuick') : count === 10 ? t('repaso.optNormal') : t('repaso.optMore'));
  return (
    <section className="card" aria-label={t('repaso.chooseTitle')}>
      <h2>{t('repaso.chooseTitle')}</h2>
      <p className="deck-selector-note">{t('repaso.chooseText', { n: quiz.repasoAvailable })}</p>
      <div className="deck-options">
        {options.map((count) => (
          <button key={count} type="button" className="btn btn-secondary" onClick={() => quiz.chooseQuantity(count)}>
            <strong>{count}</strong><span>{label(count)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// El mazo de repaso puede no estar en su fase de tarjetas (el cuestionario
// ya empezó o terminó). Antes la sección quedaba en blanco en ese caso.
function RepasoPhaseNotice({ quiz, onContinue }) {
  const { t } = useTranslation();
  const inQuiz = quiz.step === 'quiz';
  return <section className="card deck-empty" role="status">
    <h2>{t(inQuiz ? 'repaso.inQuizTitle' : 'repaso.doneTitle')}</h2>
    <p className="deck-selector-note">{t(inQuiz ? 'repaso.inQuizText' : 'repaso.doneText')}</p>
    <div className="quiz-actions">
      {inQuiz && <button type="button" className="btn btn-primary" onClick={onContinue}>{t('repaso.continueQuiz')}</button>}
      <button type="button" className={inQuiz ? 'btn btn-secondary' : 'btn btn-primary'} onClick={quiz.restart}>{t('repaso.newReview')}</button>
    </div>
  </section>;
}

function RepasoView({ quiz, onCardConsolidated }) {
  const { t } = useTranslation();
  const card = quiz.currentCard;
  return (
    <section className="deck-view" aria-label={t('repaso.cards')}>
      <p className="deck-counter">{t('repaso.cardsLeft', { left: quiz.deck.length, total: quiz.quantity })}</p>
      {card && (
        <Flashcard
          key={card.id}
          flashcard={{ id: card.id, topic: card.tema, frente_es: card.frente, dorso_concepto: card.dorso, formula: card.formula }}
          consolidated={quiz.consolidatedIds.has(card.id)}
          onConsolidate={onCardConsolidated}
          onReviewLater={quiz.reviewLaterCard}
        />
      )}
      {quiz.seenAll ? (
        <button type="button" className="btn btn-primary" onClick={quiz.skipToQuiz}>{t('repaso.startQuiz')}</button>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={quiz.skipToQuiz} disabled>
          {t('repaso.startQuizLocked', { seen: quiz.seenIds.size, total: quiz.deckSize })}
        </button>
      )}
    </section>
  );
}

function TutorModeTabs({ mode, onModeChange, disabled = false }) {
  const { t } = useTranslation();
  return <div className="tutor-mode-tabs" role="tablist" aria-label={t('quiz.modeLabel')}>
    <button type="button" role="tab" id="tutor-tab-quiz" aria-selected={mode === 'cuestionario'} aria-controls="tutor-panel" className={mode === 'cuestionario' ? 'is-active' : ''} onClick={() => onModeChange('cuestionario')} disabled={disabled}>{t('quiz.tab')}</button>
    <button type="button" role="tab" id="tutor-tab-free" aria-selected={mode === 'libre'} aria-controls="tutor-panel" className={mode === 'libre' ? 'is-active' : ''} onClick={() => onModeChange('libre')} disabled={disabled}>{t('free.tab')}</button>
  </div>;
}

function SourceLabel({ entry }) {
  const { t } = useTranslation();
  const key = tutorSourceKey(entry);
  return key ? <small className="chat-message-source">{t(key)}</small> : null;
}

// Indicador "PyFis está respondiendo": es una burbuja más del flujo del chat
// (no se superpone a los mensajes) y el scroll automático la incluye.
function TypingBubble() {
  const { t } = useTranslation();
  return <div className="chat-bubble chat-tutor-bubble chat-typing" role="status" aria-live="polite"><span>{t('tutor.typing')}</span><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>;
}

function handlePracticeTabKeyDown(event) {
  const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(event.currentTarget);
  const target = event.key === 'ArrowRight' ? (current + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (target < 0) return;
  event.preventDefault();
  tabs[target].focus();
  tabs[target].click();
}

function SpeakerButton({ text, id, speech }) {
  const { t } = useTranslation();
  if (!speech.supported || !text) return null;
  const speaking = speech.speakingId === id;
  return <button type="button" className={'chat-speak-button' + (speaking ? ' is-speaking' : '')} aria-label={t(speaking ? 'free.stopListen' : 'free.listen')} onClick={() => speech.speak(text, id)}>
    <Icon name="speaker" size={14} />
  </button>;
}

// Desplaza el chat al último mensaje cuando cambia su contenido.
function useAutoScroll(deps) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    requestAnimationFrame(() => node.scrollTo?.({ top: node.scrollHeight, behavior: 'smooth' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function FreeChatView({ quiz }) {
  const { t, language } = useTranslation();
  const logRef = useAutoScroll([quiz.charlaLog.length, quiz.streamText, quiz.busy]);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const composerRef = useRef(null);
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const recognition = useSpeechRecognition();
  const speech = useSpeechSynthesis();
  const freeHistory = quiz.history.filter(session => session.tipo === 'chat-libre');
  const latestStudentPrompt = [...quiz.charlaLog].reverse().find(message => message.role === 'alumno')?.text ?? '';

  const pickPhoto = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError(''); setPhotoBusy(true);
    try { quiz.setCharlaImage(await imageFileToDataUrl(file, { maxSize: 1400, maxChars: 850_000 })); }
    catch (failure) { setPhotoError(localizeError(language, failure.message)); }
    finally { setPhotoBusy(false); }
  };
  const toggleMic = () => {
    if (recognition.listening) { recognition.stop(); return; }
    recognition.start(text => quiz.setCharlaText(current => (current ? current + ' ' : '') + text));
  };
  const blocked = quiz.busy || quiz.charlaLeft <= 0;

  return <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-free">
    <div className="quiz-head">
      <div><h2>{t('free.title')}</h2><p>{t('free.lead')}</p></div>
      <span className="chip">{t('free.quota', { n: quiz.charlaLeft })}</span>
      <button type="button" className="btn btn-secondary chat-new-button" onClick={() => { quiz.newFreeConversation(); speech.stop(); }} disabled={quiz.busy}>{t('free.new')}</button>
    </div>
    <div className="chats-scroll" ref={logRef} aria-live="polite">
      {!quiz.charlaLog.length && !quiz.streamText && <div className="chat-bubble chat-tutor-bubble">{t('free.welcome')}</div>}
      {quiz.charlaLog.map((message, position) => <div key={message.id ?? 'free-' + position} className={'chat-bubble ' + (message.role === 'alumno' ? 'chat-alumno-bubble' : 'chat-tutor-bubble')}>
        {message.image && <img className="chat-attached-photo" src={message.image} alt={t('free.photoSent')} />}
        <MathText text={message.text} />
        {message.role !== 'alumno' && <div className="chat-bubble-actions">
          <SourceLabel entry={message} />
          <SpeakerButton text={message.text} id={'free-' + position} speech={speech} />
        </div>}
      </div>)}
      {quiz.busy && !quiz.streamText && <TypingBubble />}
      {quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-streaming" aria-live="off"><MathText text={quiz.streamText} /></div>}
    </div>
    <TutorWorkbench lastPrompt={latestStudentPrompt} onInsertPrompt={text => {
      quiz.setCharlaText(text);
      requestAnimationFrame(() => composerRef.current?.focus());
    }} />
    {quiz.charlaImage && <div className="chat-photo-preview"><img src={quiz.charlaImage} alt={t('free.photoReady')} /><button type="button" className="btn btn-text" onClick={() => quiz.setCharlaImage(null)}>{t('free.removePhoto')}</button></div>}
    {photoError && <p className="field-error" role="alert">{photoError}</p>}
    {recognition.error && <p className="field-error" role="alert">{t(recognition.error)}</p>}
    <form className="chats-input-area" onSubmit={event => { event.preventDefault(); quiz.askFreeQuestion(); }}>
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickPhoto} />
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={pickPhoto} />
      <div className="chat-photo-actions">
        <button type="button" className="btn btn-secondary chat-photo-option" title={t('free.attach')} onClick={() => galleryRef.current?.click()} disabled={blocked || photoBusy}>
          <Icon name="image" size={18} />{t('free.attach')}
        </button>
        <button type="button" className="btn btn-secondary chat-photo-option" title={t('free.camera')} onClick={() => cameraRef.current?.click()} disabled={blocked || photoBusy}>
          <Icon name="camera" size={18} />{t('free.camera')}
        </button>
      </div>
      {recognition.supported && <button type="button" className={'btn btn-icon chat-mic-button' + (recognition.listening ? ' is-listening' : '')} title={t('free.voice')} aria-label={t(recognition.listening ? 'free.listening' : 'free.voice')} onClick={toggleMic} disabled={blocked}>
        <Icon name="mic" size={20} />
      </button>}
      <input ref={composerRef} className="quiz-input" type="text" inputMode="text" autoComplete="off" aria-label={t('free.inputLabel')} placeholder={quiz.charlaLeft > 0 ? t(recognition.listening ? 'free.listening' : 'free.placeholder') : t('free.limitReached')} value={quiz.charlaText} onChange={event => quiz.setCharlaText(event.target.value)} disabled={blocked} />
      <button type="submit" className="btn btn-primary" disabled={blocked || (!quiz.charlaText.trim() && !quiz.charlaImage)}>{quiz.busy ? t('tutor.typing') : t('common.send')}</button>
    </form>
    {recognition.supported && <p className="field-help chat-voice-note">{t('free.voiceNote')}</p>}
    {quiz.charlaLeft <= 0 && <p className="deck-selector-note">{t('free.limitNote')}</p>}
    {freeHistory.length > 0 && <details className="chat-history"><summary>{t('free.history', { n: freeHistory.length })}</summary><ul className="chat-history-list">{[...freeHistory].reverse().map(session => <li key={session.id} className="chat-history-item"><button type="button" className="chat-history-button" onClick={() => quiz.openFreeConversation(session)} disabled={quiz.busy}><strong>{session.tema}</strong><br />{session.fecha} · {session.mensajes?.length ?? 0} {t('quiz.messages')}</button></li>)}</ul></details>}
  </div>;
}

// Cierre del cuestionario: resumen + opciones claras, en vez de repetir la
// última pregunta o quedar en un estado ambiguo.
function QuizEnd({ quiz, onModeChange, onNavigate }) {
  const { t } = useTranslation();
  const mistakes = quiz.mistakeCount;
  return <div className="quiz-end" role="status">
    <h3>{t('quiz.endTitle')}</h3>
    <p>{t('quiz.endScore', { c: quiz.score, t: quiz.questions.length })} {t('quiz.endAsk')}</p>
    <div className="quiz-end-actions">
      <button type="button" className="btn btn-primary" onClick={quiz.practiceAgain}>{t('quiz.again')}</button>
      {mistakes > 0 && <button type="button" className="btn btn-secondary" onClick={quiz.retryMistakes}>{t('quiz.retryMistakes', { n: mistakes })}</button>}
      <button type="button" className="btn btn-secondary" onClick={() => onNavigate('simulador')}>{t('quiz.changeTopic')}</button>
      <button type="button" className="btn btn-secondary" onClick={() => onModeChange('libre')}>{t('quiz.freeChat')}</button>
      <button type="button" className="btn btn-text" onClick={() => onNavigate('inicio')}>{t('quiz.menu')}</button>
    </div>
  </div>;
}

function ChatsView({ quiz, mode, onModeChange, onCardConsolidated, onNavigate }) {
  const { t } = useTranslation();
  const logRef = useAutoScroll([quiz.chat.length, quiz.answered, quiz.busy, quiz.streamText, quiz.step]);

  if (mode === 'libre') return <section className="card chats-view" aria-label={t('free.title')}>
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <FreeChatView quiz={quiz} />
  </section>;

  if (quiz.step === 'cantidad') return <section className="card chats-view" aria-label={t('quiz.title')}>
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-quiz">
      <p className="deck-selector-note">{t('quiz.chooseText')}</p>
      <QuizSelector quiz={quiz} />
    </div>
  </section>;

  if (quiz.step === 'repaso') return <section className="card chats-view" aria-label={t('quiz.reviewTitle')}>
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-quiz">
      <div className="quiz-head"><div><h2>{t('quiz.reviewTitle')}</h2><p>{t('quiz.reviewText')}</p></div></div>
      <RepasoView quiz={quiz} onCardConsolidated={onCardConsolidated} />
    </div>
  </section>;

  const finished = quiz.step === 'charla' || quiz.step === 'fin';
  const quizHistory = quiz.history.filter(session => session.tipo !== 'chat-libre');
  const lastQuestion = quiz.questionIndex + 1 >= quiz.questions.length;
  // La pregunta actual se muestra solo mientras no fue respondida: una vez
  // respondida ya queda en el historial del chat (antes aparecía dos veces).
  const showCurrent = quiz.step === 'quiz' && quiz.currentQuestion && !quiz.answered;

  return (
    <section className="card chats-view" aria-label={t('quiz.title')}>
      <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
      <div className="quiz-head">
        <h2>{t('quiz.title')}</h2>
        {quiz.step === 'quiz' && <>
          <span className="chip">{t('quiz.progress', { n: quiz.questionIndex + 1, total: quiz.questions.length })}</span>
          <span className="chip chip-consolidated">{t('quiz.score', { n: quiz.score })}</span>
        </>}
      </div>

      <div className="chats-scroll" ref={logRef}>
        {quiz.chat.map((entry, position) =>
          entry.closing ? (
            <div key={`closing-${position}`} className="chat-bubble chat-tutor-bubble" role="status">{quiz.closingText(entry)}</div>
          ) : (
            <div key={`quiz-${position}`} className="chat-entry">
              <div className="chat-bubble chat-tutor-bubble"><MathText text={entry.statement} /></div>
              <div className="chat-bubble chat-alumno-bubble">{t('quiz.you', { text: entry.answerKey ? t(entry.answerKey) + (entry.justification ? ` — ${entry.justification}` : '') : entry.studentText })}</div>
              <div className={`chat-bubble ${entry.tutor?.correct ? 'chat-correct' : entry.tutor?.partial ? 'chat-partial' : 'chat-incorrect'}`} role="status">
                <MathText text={entry.tutor?.message} />
                <SourceLabel entry={entry.tutor} />
              </div>
            </div>
          ),
        )}
        {showCurrent && (
          <div className="chat-entry">
            <div className="chat-bubble chat-tutor-bubble">
              <MathText text={quiz.currentQuestion.tipo === 'vf' ? quiz.currentQuestion.enunciado : quiz.currentQuestion.pregunta} />
              {quiz.currentQuestion.tipo === 'vf' && <span className="chip">{t('quiz.vf')}</span>}
            </div>
          </div>
        )}
        {quiz.busy && !quiz.streamText && <TypingBubble />}
        {quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-streaming" aria-live="off"><MathText text={quiz.streamText} /></div>}
      </div>

      {quiz.step === 'quiz' && quiz.currentQuestion && (
        <div className="chats-input-area">
          {quiz.answered ? (
            <button type="button" className="btn btn-primary quiz-send" onClick={quiz.nextQuestion} disabled={quiz.busy}>
              {t(lastQuestion ? 'quiz.finish' : 'quiz.next')}
            </button>
          ) : quiz.currentQuestion.tipo === 'vf' ? (
            <>
              <div className="quiz-actions">
                <button type="button" className="btn btn-primary" onClick={quiz.markTrue} disabled={quiz.busy}>{t('common.true')}</button>
                <button type="button" className="btn btn-secondary" onClick={quiz.markFalse} disabled={quiz.busy}>{t('common.false')}</button>
              </div>
              {quiz.awaitingJustification && (
                <div className="quiz-justification">
                  <p className="quiz-justification-label">{t('quiz.justifyLabel')}</p>
                  <textarea className="quiz-input" rows={2} placeholder={t('quiz.justifyPlaceholder')} value={quiz.justificationText} onChange={(event) => quiz.setJustificationText(event.target.value)} disabled={quiz.busy} />
                  <div className="quiz-actions">
                    <button type="button" className="btn btn-primary" onClick={quiz.sendJustification} disabled={quiz.busy || !quiz.justificationText.trim()}>{t('common.send')}</button>
                    <button type="button" className="btn btn-secondary" onClick={quiz.cancelJustification} disabled={quiz.busy}>{t('common.cancel')}</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form className="quiz-justification" onSubmit={(event) => { event.preventDefault(); quiz.answerOpen(quiz.justificationText.trim()); }}>
              <input className="quiz-input" type="text" inputMode="text" autoComplete="off" placeholder={t('quiz.answerPlaceholder')} value={quiz.justificationText} onChange={(event) => quiz.setJustificationText(event.target.value)} disabled={quiz.busy} />
              <button type="submit" className="btn btn-primary" disabled={quiz.busy || !quiz.justificationText.trim()}>{t('common.send')}</button>
            </form>
          )}
        </div>
      )}

      {finished && <QuizEnd quiz={quiz} onModeChange={onModeChange} onNavigate={onNavigate} />}

      {quizHistory.length > 0 && (
        <details className="chat-history">
          <summary>{t('quiz.history', { n: quizHistory.length })}</summary>
          <ul className="chat-history-list">
            {[...quizHistory].reverse().map((session) => (
              <li key={session.id} className="chat-history-item">
                <strong>{session.fecha}</strong> · {session.tema} · {session.mensajes?.length ?? 0} {t('quiz.messages')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function LearningApp({ user, onLogout, onUpdateUser }) {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState('inicio');
  const [practiceMode, setPracticeMode] = useState('ejercicio');
  const [repasoMode, setRepasoMode] = useState('tarjetas');
  const [tutorMode, setTutorMode] = useState('cuestionario');
  const [simulationSubmission, setSimulationSubmission] = useState(null);
  const [showGuide, setShowGuide] = useState(() => !readJSON('guarania:guideSeen:v2', false));
  const [showSettings, setShowSettings] = useState(false);
  // Cuentas creadas antes de que teléfono y correo fueran obligatorios.
  const missingContact = !hasContactInfo(user);
  const [localClassConfig, setClassConfig] = useState(() => decodeClassConfig(readJSON('guarania:classCode', null)));
  // Clase descargada de la nube (alumno): trae las tarjetas y ejercicios que
  // eligió el docente y queda guardada para usarla sin internet.
  const [classPackage, setClassPackage] = useState(getClassPackage);
  const classConfig = classPackage?.content?.config ?? localClassConfig;
  const [syncState, setSyncState] = useState(() => ({ status: getPendingProgress() ? 'pending' : 'idle', at: null }));
  // El docente puede crear ejercicios propios mientras la app sigue abierta
  // (en Aula) y esperar verlos de inmediato en Practicar/el proyector; este
  // contador fuerza a releer la lista cuando eso pasa, sin recargar la app.
  const [customExercisesVersion, setCustomExercisesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setCustomExercisesVersion(value => value + 1);
    window.addEventListener('custom-exercises-changed', bump);
    return () => window.removeEventListener('custom-exercises-changed', bump);
  }, []);
  // Los ejercicios se localizan acá: enunciado y pistas cambian con el idioma
  // elegido sin tocar scenario/values/correctAnswer (localizeCatalogItem solo
  // reemplaza campos de texto).
  const visibleExercises = useMemo(() => {
    const pool = [...getAllExercises(), ...(classPackage?.content?.exercises ?? [])];
    const unique = [...new Map(pool.map(item => [item.id, item])).values()];
    return selectClassExercises(unique, classConfig).map(item => localizeCatalogItem(item, language));
  }, [classConfig, classPackage, language, customExercisesVersion]);
  const deckCards = classPackage?.content?.cards?.length ? classPackage.content.cards : flashcardsData;
  const supportExercises = useMemo(
    () => getAllExercises().map(item => localizeCatalogItem(item, language)),
    [language, customExercisesVersion],
  );
  const localizedConcepts = useMemo(() => conceptsData.map(item => localizeCatalogItem(item, language)), [language]);
  const localizedErrors = useMemo(() => errorsData.map(item => localizeCatalogItem(item, language)), [language]);
  const localizedGlossary = useMemo(() => glossaryData.map(item => localizeCatalogItem(item, language)), [language]);
  const learning = useOfflineStorage();
  const { tutor, ask } = useTutor();
  const { mission, currentExercise, index, next, prev } = useMission(
    visibleExercises,
    learning.currentExercise,
    learning.onSelectExercise,
  );
  const quiz = useQuiz(deckCards, {
    onMoveToChat: () => { setTutorMode('cuestionario'); setActiveTab('chats'); },
    onQuizAnswer: learning.onQuizAnswer,
    classConfig,
    includeTheory: !classPackage,
  });

  // Avance del alumno: cada cambio deja una foto pendiente y se intenta
  // subir; si no hay internet queda guardada y se sube al volver la conexión.
  const snapshotKey = JSON.stringify(progressSnapshot(learning));
  useEffect(() => {
    if (user.role !== 'alumno' || !classPackage || !isCloudConfigured()) return undefined;
    queueProgress(JSON.parse(snapshotKey));
    setSyncState(state => ({ ...state, status: 'pending' }));
    const timer = setTimeout(async () => setSyncState(await flushProgress()), 1500);
    return () => clearTimeout(timer);
  }, [snapshotKey, classPackage, user.role]);
  useEffect(() => {
    if (user.role !== 'alumno' || !isCloudConfigured()) return undefined;
    const retry = async () => { if (getPendingProgress()) setSyncState(await flushProgress()); };
    window.addEventListener('online', retry);
    retry();
    return () => window.removeEventListener('online', retry);
  }, [user.role]);

  const handleDownloadClass = async code => {
    const pkg = await downloadClass({ code, displayName: user.name, avatar: user.avatar, phone: user.phone, email: user.email });
    setClassPackage(pkg);
    queueProgress(progressSnapshot(learning));
    setSyncState(await flushProgress());
    return pkg;
  };
  // Si cambia la foto o los contactos, se actualizan también en la nube (en
  // todas las clases de esta cuenta). Sin conexión queda pendiente.
  const syncProfile = async account => {
    if (!isCloudConfigured()) return;
    try { await syncMyProfile(account); writeJSON('guarania:profileSyncPending', false); }
    catch { writeJSON('guarania:profileSyncPending', true); }
  };
  const handleProfileSaved = account => { onUpdateUser(account); syncProfile(account); };
  useEffect(() => {
    const retry = () => { if (readJSON('guarania:profileSyncPending', false)) syncProfile(user); };
    window.addEventListener('online', retry);
    retry();
    return () => window.removeEventListener('online', retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const handleLeaveCloudClass = async () => {
    await leaveCloudClass();
    setClassPackage(null);
    setSyncState({ status: 'idle', at: null });
  };

  useEffect(() => {
    if (activeTab === 'inicio') return;
    ask({ type: 'section', section: activeTab, role: user.role, topic: currentExercise?.topic, exerciseId: currentExercise?.id });
  }, [activeTab, currentExercise?.id, ask]);

  const handleCardConsolidated = (flashcardId) => {
    learning.onFlashcardConsolidated(flashcardId);
    quiz.consolidateCard(flashcardId);
  };

  const handleJoinClass = (config, code) => {
    writeJSON('guarania:classCode', config ? encodeClassConfig(config) : null);
    setClassConfig(config);
    if (user.role === 'alumno') {
      if (config) joinClass({ studentId: user.id, code: code ?? encodeClassConfig(config) });
      else leaveClass(user.id);
    }
  };
  const dismissGuide = () => { writeJSON('guarania:guideSeen:v2', true); setShowGuide(false); };
  const startPracticing = () => { setActiveTab('simulador'); dismissGuide(); };
  const section = SECTIONS.find(item => item.id === activeTab) ?? SECTIONS[0];
  const availableScenarios = SCENARIOS.filter(scenario => visibleExercises.some(item => item.scenario === scenario.id));
  const recommendation = recommendExercise(visibleExercises, currentExercise?.id, learning.attemptLog);
  const selectScenario = scenarioId => {
    const first = visibleExercises.find(item => item.scenario === scenarioId);
    if (first) { learning.onSelectExercise(first.id); setSimulationSubmission(null); }
  };

  const sectionKey = activeTab === 'aula' && user.role === 'maestro' ? 'aulaTeacher' : activeTab;
  const navigate = id => { setActiveTab(id); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="app" data-accent={section.accent}>
      <Header user={user} onHome={() => navigate('inicio')} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
      <nav className="primary-nav" aria-label={t('nav.label')}>
        {SECTIONS.map(item => <button key={item.id} type="button" data-accent={item.accent} className={'primary-nav-item' + (activeTab === item.id ? ' is-active' : '')} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><span className="primary-nav-icon"><Icon name={item.icon} size={22} /></span><Bilingual k={'nav.' + item.id} className="primary-nav-label" /></button>)}
      </nav>
      {activeTab !== 'inicio' && <section className="section-intro" aria-labelledby="section-title">
        <span className="section-icon" aria-hidden="true"><Icon name={section.icon} size={28} /></span>
        <div className="section-copy"><p className="section-eyebrow">{t(user.role === 'maestro' ? 'section.teacher' : 'section.student')}</p><h2 id="section-title">{t(`section.${sectionKey}.title`)}</h2><p>{t(`section.${sectionKey}.description`)}</p></div>
        <button type="button" className="guide-replay" onClick={() => setShowGuide(true)}><Icon name="help" size={18} />{t('section.guide')}</button>
      </section>}
      <AIPrivacyNotice />
      <div className="app-layout"><main className="app-main">
        {activeTab === 'inicio' && <HomeView user={user} learning={learning} classConfig={classConfig} onNavigate={navigate} onGuide={() => setShowGuide(true)} />}
        {activeTab === 'simulador' && (
          <>
            <div className="tutor-mode-tabs practice-mode-tabs" role="tablist" aria-label={t('practice.tabsLabel')}>
              {[['ejercicio', 'practice.exercises'], ['dibujo', 'practice.drawing'], ['minijuego', 'practice.game'], ['laboratorio', 'practice.lab']].map(([mode, key]) => (
                <button key={mode} id={`practice-tab-${mode}`} type="button" role="tab" aria-controls="practice-panel" aria-selected={practiceMode === mode} tabIndex={practiceMode === mode ? 0 : -1} className={practiceMode === mode ? 'is-active' : ''} onKeyDown={handlePracticeTabKeyDown} onClick={() => setPracticeMode(mode)}>{t(key)}</button>
              ))}
            </div>
            <div id="practice-panel" role="tabpanel" aria-labelledby={`practice-tab-${practiceMode}`} tabIndex={0}>
            {practiceMode === 'dibujo' ? <TrajectoryDrawingPractice /> : practiceMode === 'minijuego' ? <PredictLaunchGame /> : practiceMode === 'laboratorio' ? <ExplorationLab /> : <>
            <section className="topic-picker card" aria-label={t('practice.pickLabel')}>
              <div><span className="panel-eyebrow">{t('practice.topicEyebrow')}</span><h2>{t('practice.pickTitle')}</h2><p>{t('practice.pickText')}</p></div>
              <div className="scenario-options">{availableScenarios.map(scenario => <button key={scenario.id} type="button" className={'scenario-option' + (currentExercise?.scenario === scenario.id ? ' is-active' : '')} aria-pressed={currentExercise?.scenario === scenario.id} onClick={() => selectScenario(scenario.id)}><Icon name={scenario.icon} size={22} /><span><strong>{t(`scenario.${scenario.id}`)}</strong><small>{t(`scenario.${scenario.id}Lead`)}</small></span></button>)}</div>
            </section>
            {currentExercise && <div className="practice-workspace">
              <ExerciseCard
                exercise={currentExercise}
                onResult={learning.onExerciseResult}
                onAskHint={ask}
                onSimulationCheck={submission => setSimulationSubmission(previous => ({ ...submission, id: (previous?.id ?? 0) + 1 }))}
                onSimulationClear={() => setSimulationSubmission(null)}
                hintsUsed={learning.hintsUsed}
                onIncrementHint={learning.incrementHints}
              />
              <CanvasSimulator mission={mission} submission={simulationSubmission} />
            </div>}
            {recommendation && <div className="practice-recommendation" role="status"><div><strong>{t('reco.title')}</strong><p>{recommendation.reasonKey ? t(recommendation.reasonKey) : recommendation.reason}</p></div>{recommendation.exercise.id !== currentExercise?.id && <button className="btn btn-secondary" type="button" onClick={() => { learning.onSelectExercise(recommendation.exercise.id); setSimulationSubmission(null); }}>{t('reco.go')}</button>}</div>}
            <div className="mission-nav">
              <button type="button" className="btn btn-secondary" onClick={prev} disabled={index === 0}>{t('common.previous')}</button>
              <button type="button" className="btn btn-secondary" onClick={next}>{t('practice.nextExercise')}</button>
            </div>
            </>}
            </div>
          </>
        )}

        {activeTab === 'tarjetas' && (
          <>
            <div className="tutor-mode-tabs" role="tablist" aria-label={t('repaso.tabsLabel')}>
              <button type="button" role="tab" aria-selected={repasoMode === 'tarjetas'} className={repasoMode === 'tarjetas' ? 'is-active' : ''} onClick={() => setRepasoMode('tarjetas')}>{t('repaso.cards')}</button>
              <button type="button" role="tab" aria-selected={repasoMode === 'teoria'} className={repasoMode === 'teoria' ? 'is-active' : ''} onClick={() => setRepasoMode('teoria')}>{t('repaso.theory')}</button>
            </div>

            {repasoMode === 'teoria' ? (
              <TheorySection />
            ) : quiz.step === 'cantidad' ? (
              <QuizSelector quiz={quiz} />
            ) : quiz.step === 'repaso' ? (
              <RepasoView quiz={quiz} onCardConsolidated={handleCardConsolidated} />
            ) : (
              <RepasoPhaseNotice quiz={quiz} onContinue={() => { setTutorMode('cuestionario'); navigate('chats'); }} />
            )}
          </>
        )}

        {activeTab === 'mensajes' && <Suspense fallback={<p className="teacher-note">{t('free.loading')}</p>}><ClassChat
          user={user}
          classPackage={classPackage}
          exercises={supportExercises}
          concepts={localizedConcepts}
          onExerciseResult={learning.onExerciseResult}
          onAskHint={ask}
          hintsUsed={learning.hintsUsed}
          onIncrementHint={learning.incrementHints}
        /></Suspense>}

        {activeTab === 'chats' && <ChatsView quiz={quiz} mode={tutorMode} onModeChange={setTutorMode} onCardConsolidated={handleCardConsolidated} onNavigate={navigate} />}

        {activeTab === 'aula' && (user.role === 'maestro' ?
          <AulaView
            classConfig={classConfig}
            onJoinClass={handleJoinClass}
            concepts={localizedConcepts}
            errors={localizedErrors}
            examples={supportExercises}
            glossary={localizedGlossary}
            sources={scienceSourcesData}
            teacher={user}
          /> : <StudentClass
            classConfig={localClassConfig}
            onJoinClass={handleJoinClass}
            studentId={user.id}
            classPackage={classPackage}
            cloudEnabled={isCloudConfigured()}
            syncState={syncState}
            onDownload={handleDownloadClass}
            onLeaveCloud={handleLeaveCloudClass}
            onPractice={() => navigate('simulador')}
            onReview={() => navigate('tarjetas')}
          />)}
      </main><aside className="app-sidebar" aria-label="Tu progreso y ayuda"><ConfidenceBar xp={learning.xp} level={learning.level} confidence={learning.confidence} /><TutorCard tutor={tutor} /></aside></div>
      <Onboarding open={showGuide} onDismiss={dismissGuide} onStart={startPracticing} role={user.role} />
      <ProfileSettings open={showSettings || missingContact} required={missingContact} user={user} onClose={() => setShowSettings(false)} onSaved={handleProfileSaved} />
      <CurriculumBadge />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getSession);
  setActiveProfile(user?.id);
  const handleLogout = () => { logout(); setActiveProfile(null); setUser(null); };
  return user ? <LearningApp key={user.id} user={user} onLogout={handleLogout} onUpdateUser={setUser} /> : <AuthScreen onAuthenticated={setUser} />;
}
