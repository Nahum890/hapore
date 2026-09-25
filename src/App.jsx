import { useEffect, useRef, useState } from 'react';
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
import CanvasSimulator from './simulator/CanvasSimulator.jsx';
import {
  concepts as conceptsData,
  errors as errorsData,
  exercises as exercisesData,
  flashcards as flashcardsData,
  glossary as glossaryData,
} from './data/catalogs.js';
import { useOfflineStorage } from './hooks/useOfflineStorage.js';
import { useTutor } from './hooks/useTutor.js';
import { useMission } from './hooks/useMission.js';
import { useQuiz } from './hooks/useQuiz.js';
import { readJSON, writeJSON, setActiveProfile } from './utils/storage.js';
import { getSession, logout } from './auth/localAccounts.js';
import { decodeClassConfig, encodeClassConfig, temaMatchesSubtemas, selectClassExercises } from './utils/classCode.js';
import { recommendExercise, summarizeAttempts } from './pedagogy/progression.js';
import './components/TutorModes.css';

const SECTIONS = [
  { id: 'inicio', label: 'Inicio', icon: '⌂', title: 'Tu espacio para aprender', description: 'Elegí una actividad y avanzá a tu ritmo.' },
  { id: 'simulador', label: 'Practicar', icon: '↗', title: 'Practicá con una simulación', description: 'Leé el ejercicio, escribí tu respuesta y comprobala con la escena de ese tema.' },
  { id: 'tarjetas', label: 'Repasar', icon: '▧', title: 'Repasá con tarjetas', description: 'Elegí un mazo, descubrí cada respuesta y seguí con el cuestionario.' },
  { id: 'chats', label: 'Tutor', icon: '✳', title: 'Elegí cómo aprender con el tutor', description: 'Practicá con un cuestionario o abrí el chat libre cuando tengas una duda.' },
  { id: 'aula', label: 'Aula', icon: '▣', title: 'Tu clase', description: 'Usá un código de clase para aprender los temas que eligió tu docente.' },
];

function HomeView({ user, learning, classConfig, onNavigate, onGuide }) {
  const teacher = user.role === 'maestro';
  const progress = summarizeAttempts(learning.attemptLog);
  const topicProgress = ['Termodinámica', 'Óptica'].map(topic => {
    const ids = new Set(exercisesData.filter(item => item.topic === topic).map(item => item.id));
    return { topic, ...summarizeAttempts(learning.attemptLog.filter(item => ids.has(item.exerciseId))) };
  });
  return <div className="home-view">
    <section className="home-hero"><div><span className="home-kicker">{teacher ? 'ESPACIO DOCENTE' : 'TU ESPACIO DE APRENDIZAJE'}</span><h2>¡Hola, {user.name.split(' ')[0]}!</h2><p>{teacher ? 'Prepará una clase y compartí el código con tus alumnos. También podés explorar las actividades.' : 'Empezá con un ejercicio. Escribí tu respuesta y comprobala con la simulación del mismo tema.'}</p><button className="btn home-main-action" type="button" onClick={() => onNavigate(teacher ? 'aula' : 'simulador')}>{teacher ? 'Preparar una clase' : 'Empezar a practicar'} <span aria-hidden="true">→</span></button></div><div className="hero-art" aria-hidden="true"><span className="hero-art-sun" /><span className="hero-art-flight" /><span className="hero-art-drone">✣</span><span className="hero-art-hill" /></div></section>
    <div className="home-section-heading"><div><span className="panel-eyebrow">A TU RITMO</span><h2>¿Qué querés hacer hoy?</h2></div><button type="button" onClick={onGuide}>Ver guía rápida</button></div>
    <div className="home-action-grid">
      <button className="home-action-card" type="button" onClick={() => onNavigate('simulador')}><span className="home-card-icon practice" aria-hidden="true">↗</span><strong>Practicar</strong><span>Resolvé un ejercicio y mirá cómo funciona.</span><small>Ir a ejercicios →</small></button>
      <button className="home-action-card" type="button" onClick={() => onNavigate('tarjetas')}><span className="home-card-icon review" aria-hidden="true">▧</span><strong>Repasar</strong><span>Estudiá con tarjetas a tu ritmo.</span><small>Ver tarjetas →</small></button>
      <button className="home-action-card" type="button" onClick={() => onNavigate('chats')}><span className="home-card-icon tutor" aria-hidden="true">✳</span><strong>Preguntar al tutor</strong><span>Hacé el cuestionario y despejá dudas.</span><small>Abrir tutor →</small></button>
    </div>
    <section className="home-class-card"><div><span className="panel-eyebrow">{teacher ? 'PARA TU CLASE' : 'APRENDÉ EN CLASE'}</span><h3>{teacher ? 'Todo listo para enseñar' : classConfig ? 'Tu clase está configurada' : '¿Tenés un código de clase?'}</h3><p>{teacher ? 'Elegí temas, generá un código y usá el proyector desde Aula docente.' : classConfig ? 'Ya podés practicar los temas que eligió tu docente.' : 'Ingresalo para ver los ejercicios y tarjetas de tu docente.'}</p></div><button className="btn btn-secondary" type="button" onClick={() => onNavigate('aula')}>{teacher ? 'Ir a Aula docente' : 'Ir a Mi clase'}</button></section>
    {progress.attempts > 0 && <section className="card learning-progress" aria-label="Progreso por tema"><div className="learning-progress-head"><div><span className="panel-eyebrow">TU AVANCE</span><h2>Así vas aprendiendo</h2></div><strong>{progress.accuracy}% de aciertos</strong></div><div className="learning-topic-grid">{topicProgress.map(item => <div key={item.topic}><div className="learning-topic-title"><strong>{item.topic}</strong><span>{item.correct}/{item.attempts} aciertos</span></div><div className="learning-topic-track"><span style={{width:`${item.accuracy}%`}} /></div><small>{item.attempts ? `Tiempo promedio: ${item.averageSeconds} s` : 'Todavía sin intentos'}</small></div>)}</div></section>}
    <p className="home-progress-note">Tu progreso: <strong>{learning.xp} XP</strong> · {progress.correct} respuestas correctas de {progress.attempts} intentos{progress.attempts ? ` · ${progress.accuracy}% de aciertos` : ''}. Guardado en este dispositivo.</p>
  </div>;
}

function ResourceGroup({ title, items, getTitle, getDescription }) {
  return <details className="resource-group">
    <summary>{title}<span aria-hidden="true">＋</span></summary>
    <ul className="aula-list">{items.map(item => <li key={item.id} className="aula-item"><h3>{getTitle(item)}</h3><p>{getDescription(item)}</p></li>)}</ul>
  </details>;
}

function AulaView({ attempts, xp, classConfig, onJoinClass }) {
  return (
    <>
      <div className="aula-toolbar"><p>Herramientas para preparar y compartir tu clase.</p><PdfButton /></div>
      <TeacherMode
        attempts={attempts}
        confidence={xp}
        classConfig={classConfig}
        onJoinClass={onJoinClass}
      />
      <section className="resource-section" aria-label="Biblioteca de apoyo">
        <div className="resource-heading"><h2>Biblioteca de apoyo</h2><p>Abrí solo el material que quieras consultar.</p></div>
        <ResourceGroup title="Conceptos clave" items={conceptsData} getTitle={item => item.name} getDescription={item => item.definition} />
        <ResourceGroup title="Errores frecuentes" items={errorsData} getTitle={item => item.name} getDescription={item => item.description} />
        <ResourceGroup title="Glosario" items={glossaryData} getTitle={item => item.term} getDescription={item => item.definition} />
      </section>
    </>
  );
}

function QuizSelector({ quiz, topics, studyTopic, onTopicChange }) {
  const options = [...new Set([5, 10, 20, quiz.maxAvailable])].filter(count => count <= quiz.maxAvailable).sort((a, b) => a - b);
  return (
    <section className="card" aria-label="Selector de cantidad de tarjetas">
      <h2>Elegí tu repaso</h2>
      <div className="topic-options" role="group" aria-label="Tema de las tarjetas">{topics.map(topic => <button key={topic} type="button" className={topic === studyTopic ? 'is-active' : ''} aria-pressed={topic === studyTopic} onClick={() => onTopicChange(topic)}>{topic}</button>)}</div>
      <p className="deck-selector-note">
        Hay {quiz.repasoAvailable} tarjetas disponibles. Empezá con 5 si tenés poco tiempo.
      </p>
      <div className="deck-options">
        {options.map((count) => (
          <button
            key={count}
            type="button"
            className="btn btn-secondary"
            onClick={() => quiz.chooseQuantity(count)}
          >
            <strong>{count}</strong><span>{count === 5 ? 'Rápido' : count === 10 ? 'Normal' : count === quiz.maxAvailable ? 'Completo' : 'Más práctica'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RepasoView({ quiz, onCardConsolidated }) {
  const card = quiz.currentCard;
  return (
    <section className="deck-view" aria-label="Mazo de tarjetas de repaso">
      <p className="deck-counter">
        Quedan {quiz.deck.length} de {quiz.quantity} tarjetas
      </p>
      {card && (
        <Flashcard
          key={card.id}
          flashcard={{
            id: card.id,
            topic: card.tema,
            frente_es: card.frente,
            frente_jopara: card.jopara,
            dorso_concepto: card.dorso,
            formula: card.formula,
          }}
          consolidated={quiz.consolidatedIds.has(card.id)}
          onConsolidate={onCardConsolidated}
          onReviewLater={quiz.reviewLaterCard}
        />
      )}
      {quiz.seenAll ? (
        <button type="button" className="btn btn-primary" onClick={quiz.skipToQuiz}>
          ¡Empezar Cuestionario!
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={quiz.skipToQuiz}
          disabled
        >
          Empezar Cuestionario ({quiz.seenIds.size}/{quiz.deckSize} vistas)
        </button>
      )}
    </section>
  );
}

function TutorModeTabs({ mode, onModeChange, disabled = false }) {
  return <div className="tutor-mode-tabs" role="tablist" aria-label="Modo del tutor">
    <button type="button" role="tab" id="tutor-tab-quiz" aria-selected={mode === 'cuestionario'} aria-controls="tutor-panel" className={mode === 'cuestionario' ? 'is-active' : ''} onClick={() => onModeChange('cuestionario')} disabled={disabled}>Cuestionario</button>
    <button type="button" role="tab" id="tutor-tab-free" aria-selected={mode === 'libre'} aria-controls="tutor-panel" className={mode === 'libre' ? 'is-active' : ''} onClick={() => onModeChange('libre')} disabled={disabled}>Chat libre</button>
  </div>;
}

function FreeChatView({ quiz }) {
  const logRef = useRef(null);
  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [quiz.charlaLog.length, quiz.streamText, quiz.busy]);
  const freeHistory = quiz.history.filter(session => session.tipo === 'chat-libre' || session.tema === 'Chat libre');
  return <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-free">
    <div className="quiz-head">
      <div><h2>Chat libre</h2><p>Preguntale al tutor sin completar tarjetas ni cuestionarios.</p></div>
      <span className="chip">Consultas disponibles hoy: {quiz.charlaLeft}/15</span>
      <button type="button" className="btn btn-secondary chat-new-button" onClick={quiz.newFreeConversation} disabled={quiz.busy}>Nueva conversación</button>
    </div>
    <div className="chats-scroll" ref={logRef} aria-live="polite">
      {!quiz.charlaLog.length && !quiz.streamText && <div className="chat-bubble chat-tutor-bubble">¡Hola! Estoy acá para ayudarte con Física. Escribí tu pregunta cuando quieras.</div>}
      {quiz.charlaLog.map((message, position) => <div key={message.id ?? 'free-' + position} className={'chat-bubble ' + (message.role === 'alumno' ? 'chat-alumno-bubble' : 'chat-tutor-bubble')}>
        {message.text}
        {message.role !== 'alumno' && message.source && <small className="chat-message-source">{message.source === 'gemini' ? 'Gemini' : message.source === 'rules' ? 'Tutor local · sin conexión' : message.source === 'local-model' ? 'Modelo local' : ''}</small>}
      </div>)}
      {quiz.busy && !quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-typing" role="status" aria-live="polite"><span>Jopara está respondiendo</span><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
      {quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-streaming" aria-live="off">{quiz.streamText}</div>}
    </div>
    <form className="chats-input-area" onSubmit={event => { event.preventDefault(); quiz.askFreeQuestion(); }}>
      <input className="quiz-input" type="text" inputMode="text" autoComplete="off" aria-label="Pregunta para el tutor" placeholder={quiz.charlaLeft > 0 ? 'Escribí tu pregunta…' : 'Llegaste al límite diario de consultas'} value={quiz.charlaText} onChange={event => quiz.setCharlaText(event.target.value)} disabled={quiz.busy || quiz.charlaLeft <= 0} />
      <button type="submit" className="btn btn-primary" disabled={quiz.busy || quiz.charlaLeft <= 0 || !quiz.charlaText.trim()}>{quiz.busy ? 'El tutor está respondiendo…' : 'Enviar pregunta'}</button>
    </form>
    {quiz.charlaLeft <= 0 && <p className="deck-selector-note">Alcanzaste las 15 consultas diarias. Iniciar otra conversación no reinicia el límite.</p>}
    {freeHistory.length > 0 && <details className="chat-history"><summary>Conversaciones anteriores ({freeHistory.length})</summary><ul className="chat-history-list">{[...freeHistory].reverse().map(session => <li key={session.id} className="chat-history-item"><button type="button" className="chat-history-button" onClick={() => quiz.openFreeConversation(session)} disabled={quiz.busy}><strong>{session.tema}</strong><br />{session.fecha} · {session.mensajes?.length ?? 0} mensajes</button></li>)}</ul></details>}
  </div>;
}
function ChatsView({ quiz, mode, onModeChange, topics, studyTopic, onTopicChange, onCardConsolidated }) {
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [quiz.chat.length, quiz.charlaLog.length, quiz.answered, quiz.busy, quiz.streamText]);

  const score = quiz.chat.filter((entry) => entry.tutor?.correct).length;

  if (mode === 'libre') return <section className="card chats-view" aria-label="Chat libre con el tutor">
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <FreeChatView quiz={quiz} />
  </section>;

  if (quiz.step === 'cantidad') return <section className="card chats-view" aria-label="Modo cuestionario">
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-quiz">
      <p className="deck-selector-note">Elegí un tema y una cantidad. Primero vas a repasar las fichas; después, el tutor te hará preguntas.</p>
      <QuizSelector quiz={quiz} topics={topics} studyTopic={studyTopic} onTopicChange={onTopicChange} />
    </div>
  </section>;

  if (quiz.step === 'repaso') return <section className="card chats-view" aria-label="Repaso previo al cuestionario">
    <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
    <div className="tutor-mode-panel" id="tutor-panel" role="tabpanel" aria-labelledby="tutor-tab-quiz">
      <div className="quiz-head"><div><h2>Repaso para el cuestionario</h2><p>Podés abrir Chat libre cuando quieras; el repaso queda guardado.</p></div></div>
      <RepasoView quiz={quiz} onCardConsolidated={onCardConsolidated} />
    </div>
  </section>;

  return (
    <section className="card chats-view" aria-label="Chats con el tutor">
      <TutorModeTabs mode={mode} onModeChange={onModeChange} disabled={quiz.busy} />
      <div className="quiz-head">
        <h2>Cuestionario</h2>
        {quiz.step === 'quiz' && (
          <>
            <span className="chip">
              Pregunta {quiz.questionIndex + 1} de {quiz.questions.length}
            </span>
            <span className="chip chip-consolidated">Acertadas: {score}</span>
          </>
        )}
      </div>

      <div className="chats-scroll" ref={logRef}>
        {quiz.chat.map((entry, position) =>
          entry.closing ? (
            <div key={`closing-${position}`} className="chat-bubble chat-tutor-bubble" role="status">
              {entry.message}
            </div>
          ) : (
            <div key={`quiz-${position}`} className="chat-entry">
              <div className="chat-bubble chat-tutor-bubble">{entry.statement}</div>
              <div className="chat-bubble chat-alumno-bubble">Vos: {entry.studentText}</div>
              <div
                className={`chat-bubble ${entry.tutor?.correct ? 'chat-correct' : 'chat-incorrect'}`}
                role="status"
              >
                {entry.tutor?.message}
                {entry.tutor?.source && <small className="chat-message-source">{entry.tutor.source === 'gemini' ? 'Gemini' : entry.tutor.source === 'rules' ? 'Tutor local · sin conexión' : ''}</small>}
              </div>
            </div>
          ),
        )}

        {quiz.busy && !quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-typing" role="status" aria-live="polite"><span>Jopara está respondiendo</span><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
        {quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-streaming" aria-live="off">{quiz.streamText}</div>}

        {quiz.step === 'quiz' && quiz.currentQuestion && (
          <div className="chat-entry">
            <div className="chat-bubble chat-tutor-bubble">
              {quiz.currentQuestion.tipo === 'vf'
                ? quiz.currentQuestion.enunciado
                : quiz.currentQuestion.pregunta}
              {quiz.currentQuestion.tipo === 'vf' && <span className="chip">Verdadero o falso</span>}
            </div>
          </div>
        )}
      </div>

      {quiz.step === 'quiz' && quiz.currentQuestion && (
        <div className="chats-input-area">
          {quiz.answered ? (
            <button type="button" className="btn btn-primary quiz-send" onClick={quiz.nextQuestion}>
              {quiz.questionIndex + 1 >= quiz.questions.length ? 'Cerrar y charlar' : 'Siguiente pregunta'}
            </button>
          ) : quiz.currentQuestion.tipo === 'vf' ? (
            <>
              <div className="quiz-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={quiz.markTrue}
                  disabled={quiz.busy}
                >
                  Verdadero
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={quiz.markFalse}
                  disabled={quiz.busy}
                >
                  Falso
                </button>
              </div>
              {quiz.awaitingJustification && (
                <div className="quiz-justification">
                  <p className="quiz-justification-label">
                    Justificá por qué marcaste que es falso:
                  </p>
                  <textarea
                    className="quiz-input"
                    rows={2}
                    placeholder="Escribí tu justificación..."
                    value={quiz.justificationText}
                    onChange={(event) => quiz.setJustificationText(event.target.value)}
                    disabled={quiz.busy}
                  />
                  <div className="quiz-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={quiz.sendJustification}
                      disabled={quiz.busy || !quiz.justificationText.trim()}
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={quiz.cancelJustification}
                      disabled={quiz.busy}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form
              className="quiz-justification"
              onSubmit={(event) => {
                event.preventDefault();
                quiz.answerOpen(quiz.justificationText.trim());
              }}
            >
              <input
                className="quiz-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="Escribí tu respuesta..."
                value={quiz.justificationText}
                onChange={(event) => quiz.setJustificationText(event.target.value)}
                disabled={quiz.busy}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={quiz.busy || !quiz.justificationText.trim()}
              >
                Enviar
              </button>
            </form>
          )}
        </div>
      )}

      {(quiz.step === 'charla' || quiz.step === 'fin') && (
        <div className="chats-input-area">
          <p className="deck-selector-note">
            Cuestionario terminado: {score} de {quiz.questions.length} respuestas correctas. Si querés conversar sobre un tema, cambiá a Chat libre.
          </p>
          <div className="quiz-actions">
            <button type="button" className="btn btn-primary" onClick={() => onModeChange('libre')}>Ir al chat libre</button>
            <button type="button" className="btn btn-secondary" onClick={quiz.restart}>Hacer otro cuestionario</button>
          </div>
        </div>
      )}

      {quiz.history.some(session => session.tema !== 'Chat libre') && (
        <details className="chat-history">
          <summary>Historial de cuestionarios ({quiz.history.filter(session => session.tema !== 'Chat libre').length})</summary>
          <ul className="chat-history-list">
            {[...quiz.history].filter(session => session.tema !== 'Chat libre').reverse().map((session) => (
              <li key={session.id} className="chat-history-item">
                <strong>{session.fecha}</strong> · {session.tema} · {session.mensajes?.length ?? 0}{' '}
                mensajes
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function LearningApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [tutorMode, setTutorMode] = useState('cuestionario');
  const [simulationSubmission, setSimulationSubmission] = useState(null);
  const [showGuide, setShowGuide] = useState(() => !readJSON('guarania:guideSeen:v2', false));
  const [classConfig, setClassConfig] = useState(() => decodeClassConfig(readJSON('guarania:classCode', null)));
  const [selectedStudyTopic, setSelectedStudyTopic] = useState('Termodinámica');
  const studyTopics = [...new Set(flashcardsData.filter(card => temaMatchesSubtemas(card.topic, classConfig?.subtemas)).map(card => card.topic))];
  const studyTopic = studyTopics.includes(selectedStudyTopic) ? selectedStudyTopic : studyTopics[0];
  const visibleExercises = selectClassExercises(exercisesData, classConfig);
  const learning = useOfflineStorage();
  const { tutor, ask } = useTutor();
  const { mission, currentExercise, index, next, prev } = useMission(
    visibleExercises,
    learning.currentExercise,
    learning.onSelectExercise,
  );
  const quiz = useQuiz(flashcardsData, {
    onMoveToChat: () => { setTutorMode('cuestionario'); setActiveTab('chats'); },
    onQuizAnswer: learning.onQuizAnswer,
    classConfig,
    studyTopic,
  });

  useEffect(() => {
    if (activeTab === 'inicio') return;
    ask({ type: 'section', section: activeTab, role: user.role, topic: currentExercise?.topic, exerciseId: currentExercise?.id });
  }, [activeTab, currentExercise?.id, ask]);

  const handleCardConsolidated = (flashcardId) => {
    learning.onFlashcardConsolidated(flashcardId);
    quiz.consolidateCard(flashcardId);
  };

  const handleJoinClass = (config) => {
    writeJSON('guarania:classCode', config ? encodeClassConfig(config) : null);
    setClassConfig(config);
  };
  const dismissGuide = () => { writeJSON('guarania:guideSeen:v2', true); setShowGuide(false); };
  const startPracticing = () => { setActiveTab('simulador'); dismissGuide(); };
  const section = SECTIONS.find(item => item.id === activeTab) ?? SECTIONS[0];
  const topics = [...new Set(visibleExercises.map(item => item.topic))];
  const primaryTopics = topics.filter(topic => ['Termodinámica', 'Óptica'].includes(topic));
  const extraTopics = topics.filter(topic => !primaryTopics.includes(topic));
  const recommendation = recommendExercise(visibleExercises, currentExercise?.id, learning.attemptLog);
  const selectTopic = topic => {
    const first = visibleExercises.find(item => item.topic === topic);
    if (first) { learning.onSelectExercise(first.id); setSimulationSubmission(null); }
  };

  return (
    <div className="app">
      <Header user={user} onHome={() => setActiveTab('inicio')} onLogout={onLogout} />
      <nav className="primary-nav" aria-label="Secciones principales">
        {SECTIONS.map(item => <button key={item.id} type="button" className={'primary-nav-item' + (activeTab === item.id ? ' is-active' : '')} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => setActiveTab(item.id)}><span className="primary-nav-number" aria-hidden="true">{item.icon}</span><span>{item.id === 'aula' ? (user.role === 'maestro' ? 'Aula docente' : 'Mi clase') : item.label}</span></button>)}
      </nav>
      {activeTab !== 'inicio' && <section className="section-intro" aria-labelledby="section-title"><div><p className="section-eyebrow">{user.role === 'maestro' ? 'ESPACIO DOCENTE' : 'TU APRENDIZAJE'} / {section.label.toUpperCase()}</p><h2 id="section-title">{activeTab === 'aula' && user.role === 'maestro' ? 'Prepará tu aula' : section.title}</h2><p>{activeTab === 'aula' && user.role === 'maestro' ? 'Creá un código para tus alumnos y consultá los recursos docentes.' : section.description}</p></div><button type="button" className="guide-replay" onClick={() => setShowGuide(true)}>Ver guía de uso</button></section>}
      <div className="app-layout"><main className="app-main">
        {activeTab === 'inicio' && <HomeView user={user} learning={learning} classConfig={classConfig} onNavigate={setActiveTab} onGuide={() => setShowGuide(true)} />}
        {activeTab === 'simulador' && (
          <>
            <section className="topic-picker card" aria-label="Elegir tema de práctica"><div><span className="panel-eyebrow">FÍSICA DE 3.º · PROGRAMA PRINCIPAL</span><h2>Elegí un tema</h2><p>Podés cambiar de tema en cualquier momento.</p></div><div className="topic-options">{primaryTopics.map(topic => <button key={topic} type="button" className={currentExercise?.topic === topic ? 'is-active' : ''} aria-pressed={currentExercise?.topic === topic} onClick={() => selectTopic(topic)}>{topic}</button>)}</div>{extraTopics.length > 0 && <details className="extra-topics"><summary>Práctica complementaria de movimiento y fuerzas</summary><div className="topic-options">{extraTopics.map(topic => <button key={topic} type="button" className={currentExercise?.topic === topic ? 'is-active' : ''} aria-pressed={currentExercise?.topic === topic} onClick={() => selectTopic(topic)}>{topic}</button>)}</div></details>}</section>
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
            {recommendation && <div className="practice-recommendation" role="status"><div><strong>Tu siguiente paso</strong><p>{recommendation.reason}</p></div>{recommendation.exercise.id !== currentExercise?.id && <button className="btn btn-secondary" type="button" onClick={() => { learning.onSelectExercise(recommendation.exercise.id); setSimulationSubmission(null); }}>Ir al recomendado</button>}</div>}
            <div className="mission-nav">
              <button type="button" className="btn btn-secondary" onClick={prev} disabled={index === 0}>
                Anterior
              </button>
              <button type="button" className="btn btn-secondary" onClick={next}>
                Siguiente ejercicio
              </button>
            </div>
          </>
        )}

        {activeTab === 'tarjetas' && (
          <>
            {quiz.step === 'cantidad' && <QuizSelector quiz={quiz} topics={studyTopics} studyTopic={studyTopic} onTopicChange={setSelectedStudyTopic} />}
            {quiz.step === 'repaso' && (
              <RepasoView quiz={quiz} onCardConsolidated={handleCardConsolidated} />
            )}
          </>
        )}

        {activeTab === 'chats' && <ChatsView quiz={quiz} mode={tutorMode} onModeChange={setTutorMode} topics={studyTopics} studyTopic={studyTopic} onTopicChange={setSelectedStudyTopic} onCardConsolidated={handleCardConsolidated} />}

        {activeTab === 'aula' && (user.role === 'maestro' ?
          <AulaView
            attempts={learning.attempts}
            xp={learning.xp}
            classConfig={classConfig}
            onJoinClass={handleJoinClass}
          /> : <StudentClass classConfig={classConfig} onJoinClass={handleJoinClass} />)}
      </main><aside className="app-sidebar" aria-label="Tu progreso y ayuda"><ConfidenceBar xp={learning.xp} level={learning.level} /><TutorCard tutor={tutor} /></aside></div>
      <Onboarding open={showGuide} onDismiss={dismissGuide} onStart={startPracticing} role={user.role} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getSession);
  setActiveProfile(user?.id);
  const handleLogout = () => { logout(); setActiveProfile(null); setUser(null); };
  return user ? <LearningApp key={user.id} user={user} onLogout={handleLogout} /> : <AuthScreen onAuthenticated={setUser} />;
}
