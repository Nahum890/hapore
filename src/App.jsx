import { useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import ConfidenceBar from './components/ConfidenceBar.jsx';
import TutorCard from './components/TutorCard.jsx';
import ExerciseCard from './components/ExerciseCard.jsx';
import Flashcard from './components/Flashcard.jsx';
import TeacherMode from './components/TeacherMode.jsx';
import CanvasSimulator from './simulator/CanvasSimulator.jsx';
import exercisesData from './data/exercises.json';
import flashcardsData from './data/flashcards.json';
import conceptsData from './data/concepts.json';
import errorsData from './data/errors.json';
import glossaryData from './data/glossary.json';
import { useOfflineStorage } from './hooks/useOfflineStorage.js';
import { useTutor } from './hooks/useTutor.js';
import { useMission } from './hooks/useMission.js';
import { useQuiz } from './hooks/useQuiz.js';
import { readJSON, writeJSON } from './utils/storage.js';
import { decodeClassConfig, encodeClassConfig, temaMatchesSubtemas } from './utils/classCode.js';

function AulaView({ attempts, xp, classConfig, onJoinClass }) {
  return (
    <>
      <section className="card" aria-label="Conceptos clave">
        <h2>Conceptos clave</h2>
        <ul className="aula-list">
          {conceptsData.map((concept) => (
            <li key={concept.id} className="aula-item">
              <h3>{concept.name}</h3>
              <p>{concept.definition}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-label="Errores frecuentes">
        <h2>Errores frecuentes</h2>
        <ul className="aula-list">
          {errorsData.map((error) => (
            <li key={error.id} className="aula-item">
              <h3>{error.name}</h3>
              <p>{error.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-label="Glosario">
        <h2>Glosario</h2>
        <ul className="aula-list">
          {glossaryData.map((entry) => (
            <li key={entry.id} className="aula-item">
              <h3>{entry.term}</h3>
              <p>{entry.definition}</p>
            </li>
          ))}
        </ul>
      </section>
      <TeacherMode
        attempts={attempts}
        confidence={xp}
        classConfig={classConfig}
        onJoinClass={onJoinClass}
      />
    </>
  );
}

function QuizSelector({ quiz }) {
  const options = [];
  for (let count = 5; count <= quiz.maxAvailable; count += 5) {
    options.push(count);
  }
  return (
    <section className="card" aria-label="Selector de cantidad de tarjetas">
      <h2>¿Cuántas tarjetas querés repasar?</h2>
      <p className="deck-selector-note">
        Elegí entre 5 (mínimo) y 50 (máximo). Ahora hay {quiz.repasoAvailable} tarjetas teóricas
        disponibles.
      </p>
      <div className="deck-options">
        {options.map((count) => (
          <button
            key={count}
            type="button"
            className="btn btn-secondary"
            onClick={() => quiz.chooseQuantity(count)}
          >
            {count}
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

function ChatsView({ quiz }) {
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [quiz.chat.length, quiz.charlaLog.length, quiz.answered]);

  const score = quiz.chat.filter((entry) => entry.tutor?.correct).length;

  return (
    <section className="card chats-view" aria-label="Chats con el tutor">
      <div className="quiz-head">
        <h2>Chats con el tutor</h2>
        {quiz.step === 'quiz' && (
          <>
            <span className="chip">
              Pregunta {quiz.questionIndex + 1} de {quiz.questions.length}
            </span>
            <span className="chip chip-consolidated">Acertadas: {score}</span>
          </>
        )}
        {quiz.step === 'charla' && (
          <span className="chip">Preguntas libres disponibles: {quiz.charlaLeft}/8</span>
        )}
      </div>

      <div className="chats-scroll" ref={logRef}>
        {quiz.step === 'cantidad' && (
          <div className="chat-bubble chat-tutor-bubble">
            ¡Hola! Completá el repaso de las flashcards para empezar el cuestionario acá.
          </div>
        )}
        {quiz.step === 'repaso' && (
          <div className="chat-bubble chat-tutor-bubble">
            ¡Hola! Seguí repasando las tarjetas: cuando termines, el cuestionario empieza acá.
          </div>
        )}

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
              </div>
            </div>
          ),
        )}

        {quiz.streamText && <div className="chat-bubble chat-tutor-bubble chat-streaming" aria-live="off">{quiz.streamText}</div>}

        {quiz.charlaLog.map((message, position) => (
          <div
            key={`charla-${position}`}
            className={`chat-bubble ${
              message.role === 'alumno' ? 'chat-alumno-bubble' : 'chat-tutor-bubble'
            }`}
          >
            {message.text}
          </div>
        ))}

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

      {quiz.step === 'charla' && (
        <div className="chats-input-area">
          <form
            className="quiz-justification"
            onSubmit={(event) => {
              event.preventDefault();
              quiz.askFreeQuestion();
            }}
          >
            <input
              className="quiz-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder={
                quiz.charlaLeft > 0 ? 'Preguntame lo que quieras...' : 'Sin preguntas libres disponibles'
              }
              value={quiz.charlaText}
              onChange={(event) => quiz.setCharlaText(event.target.value)}
              disabled={quiz.busy || quiz.charlaLeft <= 0}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={quiz.busy || quiz.charlaLeft <= 0 || !quiz.charlaText.trim()}
            >
              Enviar
            </button>
          </form>
          <button type="button" className="btn btn-secondary quiz-send" onClick={quiz.finish} disabled={quiz.busy}>
            Terminar y ver resultado
          </button>
        </div>
      )}

      {quiz.step === 'fin' && (
        <div className="chats-input-area">
          <p className="deck-selector-note">
            Acertadas: {score} de {quiz.questions.length}. El tutor te guio con explicaciones y
            alientos en jopara.
          </p>
          <button type="button" className="btn btn-primary quiz-send" onClick={quiz.restart}>
            Volver a empezar
          </button>
        </div>
      )}

      {quiz.history.length > 0 && (
        <details className="chat-history">
          <summary>Historial de conversaciones ({quiz.history.length})</summary>
          <ul className="chat-history-list">
            {[...quiz.history].reverse().map((session) => (
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

export default function App() {
  const [activeTab, setActiveTab] = useState('simulador');
  const [classConfig, setClassConfig] = useState(() => decodeClassConfig(readJSON('guarania:classCode', null)));
  const visibleExercises = classConfig
    ? exercisesData.filter((exercise) => temaMatchesSubtemas(exercise.topic, classConfig.subtemas)).slice(0, classConfig.ejercicios)
    : exercisesData;
  const learning = useOfflineStorage();
  const { tutor, ask } = useTutor();
  const { mission, currentExercise, index, next, prev } = useMission(
    visibleExercises,
    learning.currentExercise,
    learning.onSelectExercise,
  );
  const quiz = useQuiz(flashcardsData, {
    onMoveToChat: () => setActiveTab('chats'),
    onQuizAnswer: learning.onQuizAnswer,
    classConfig,
  });

  useEffect(() => {
    ask({ type: 'section', section: activeTab });
  }, [activeTab, ask]);

  const handleCardConsolidated = (flashcardId) => {
    learning.onFlashcardConsolidated(flashcardId);
    quiz.consolidateCard(flashcardId);
  };

  const handleJoinClass = (config) => {
    writeJSON('guarania:classCode', config ? encodeClassConfig(config) : null);
    setClassConfig(config);
  };

  return (
    <div className="app">
      <Header activeTab={activeTab} onChange={setActiveTab} />
      <ConfidenceBar xp={learning.xp} level={learning.level} />

      <main className="app-main">
        {activeTab === 'simulador' && (
          <>
            <CanvasSimulator mission={mission} />
            {currentExercise && (
              <ExerciseCard
                exercise={currentExercise}
                onResult={learning.onExerciseResult}
                onAskHint={ask}
                hintsUsed={learning.hintsUsed}
                onIncrementHint={learning.incrementHints}
              />
            )}
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
            {quiz.step === 'cantidad' && <QuizSelector quiz={quiz} />}
            {quiz.step === 'repaso' && (
              <RepasoView quiz={quiz} onCardConsolidated={handleCardConsolidated} />
            )}
          </>
        )}

        {activeTab === 'chats' && <ChatsView quiz={quiz} />}

        {activeTab === 'aula' && (
          <AulaView
            attempts={learning.attempts}
            xp={learning.xp}
            classConfig={classConfig}
            onJoinClass={handleJoinClass}
          />
        )}
      </main>

      <TutorCard tutor={tutor} />
    </div>
  );
}
