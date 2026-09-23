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

function AulaView({ attempts, confidence }) {
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
      <TeacherMode attempts={attempts} confidence={confidence} />
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
      <button type="button" className="btn btn-secondary" onClick={quiz.skipToQuiz}>
        Ir directo al cuestionario
      </button>
    </section>
  );
}

function QuizView({ quiz }) {
  const question = quiz.currentQuestion;
  const score = quiz.chat.filter((entry) => entry.tutor?.correct).length;
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [quiz.chat.length, quiz.answered]);

  if (!question) return null;

  const isVf = question.tipo === 'vf';
  const openInputStyle = {
    width: '100%',
    minHeight: 'var(--touch-min)',
    border: '1px solid var(--borde)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    background: 'var(--blanco)',
    color: 'var(--gris-carbon)',
    resize: 'vertical',
  };
  const tutorBubbleStyle = (correct) => ({
    margin: '6px 0 0',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '14px',
    background: correct ? '#E7F3EC' : '#FBEAE4',
    color: correct ? '#14532D' : '#7C2D12',
    border: `1px solid ${correct ? '#B5D9C4' : '#EFC4B0'}`,
  });

  return (
    <section className="card" aria-label="Cuestionario con el tutor">
      <div className="quiz-head">
        <h2>Cuestionario con el tutor</h2>
        <span className="chip">
          Pregunta {quiz.questionIndex + 1} de {quiz.questions.length}
        </span>
        <span className="chip chip-consolidated">Acertadas: {score}</span>
      </div>

      <div className="quiz-chat" ref={logRef}>
        {quiz.chat.map((entry, position) => (
          <div key={`${quiz.questionIndex}-${position}`} className="quiz-entry">
            <p className="quiz-statement">{entry.statement}</p>
            <p className="quiz-student">Vos: {entry.studentText}</p>
            <div style={tutorBubbleStyle(entry.tutor?.correct)} role="status">
              {entry.tutor?.message}
            </div>
          </div>
        ))}
        <div className="quiz-entry">
          <p className="quiz-statement">{isVf ? question.enunciado : question.pregunta}</p>
          {isVf && <span className="chip">Verdadero o falso</span>}
        </div>
      </div>

      {quiz.answered ? (
        <button type="button" className="btn btn-primary quiz-send" onClick={quiz.nextQuestion}>
          {quiz.questionIndex + 1 >= quiz.questions.length ? 'Ver resultado' : 'Siguiente pregunta'}
        </button>
      ) : isVf ? (
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
                rows={3}
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
                  Enviar justificación
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
            className="btn btn-primary quiz-send"
            disabled={quiz.busy || !quiz.justificationText.trim()}
          >
            Responder
          </button>
        </form>
      )}
    </section>
  );
}

function QuizResultView({ quiz }) {
  const score = quiz.chat.filter((entry) => entry.tutor?.correct).length;
  return (
    <section className="card" aria-label="Resultado del repaso">
      <h2>¡Terminaste el repaso!</h2>
      <p className="deck-selector-note">
        Acertadas: {score} de {quiz.questions.length}. El tutor te guio con explicaciones y
        alientos en jopara.
      </p>
      <button type="button" className="btn btn-primary" onClick={quiz.restart}>
        Volver a empezar
      </button>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('simulador');
  const learning = useOfflineStorage();
  const { tutor, ask } = useTutor();
  const { mission, currentExercise, index, next, prev } = useMission(
    exercisesData,
    learning.currentExercise,
    learning.onSelectExercise,
  );
  const quiz = useQuiz(flashcardsData);

  const handleCardConsolidated = (flashcardId) => {
    learning.onFlashcardConsolidated(flashcardId);
    quiz.consolidateCard(flashcardId);
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
            {quiz.step === 'quiz' && <QuizView quiz={quiz} />}
            {quiz.step === 'fin' && <QuizResultView quiz={quiz} />}
          </>
        )}

        {activeTab === 'aula' && (
          <AulaView attempts={learning.attempts} confidence={learning.confidence} />
        )}
      </main>

      <TutorCard tutor={tutor} />
    </div>
  );
}
