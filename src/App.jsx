import { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('simulador');
  const learning = useOfflineStorage();
  const { tutor, ask } = useTutor();
  const { mission, currentExercise, index, next, prev } = useMission(
    exercisesData,
    learning.currentExercise,
    learning.onSelectExercise,
  );

  const [deckOrder, setDeckOrder] = useState(() => flashcardsData.map((card) => card.id));
  const [deckIndex, setDeckIndex] = useState(0);
  const currentCard =
    flashcardsData.find((card) => card.id === deckOrder[deckIndex]) ?? flashcardsData[0];

  const handleFlashcardConsolidated = (flashcardId) => {
    learning.onFlashcardConsolidated(flashcardId);
    setDeckIndex((prev) => Math.min(prev + 1, deckOrder.length - 1));
  };

  const handleFlashcardReviewLater = (flashcardId) => {
    setDeckOrder((prev) => {
      const rest = prev.filter((id) => id !== flashcardId);
      return rest.length === prev.length ? prev : [...rest, flashcardId];
    });
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

        {activeTab === 'tarjetas' && currentCard && (
          <section className="deck-view" aria-label="Mazo de tarjetas de repaso">
            <p className="deck-counter">
              Tarjeta {deckIndex + 1} de {deckOrder.length}
            </p>
            <Flashcard
              key={currentCard.id}
              flashcard={currentCard}
              consolidated={Boolean(learning.flashcardState[currentCard.id]?.consolidated)}
              onConsolidate={handleFlashcardConsolidated}
              onReviewLater={handleFlashcardReviewLater}
            />
          </section>
        )}

        {activeTab === 'aula' && (
          <AulaView attempts={learning.attempts} confidence={learning.confidence} />
        )}
      </main>

      <TutorCard tutor={tutor} />
    </div>
  );
}
