import { useState } from 'react';
import Header from './components/Header.jsx';
import ConfidenceBar from './components/ConfidenceBar.jsx';
import TabNavigation from './components/TabNavigation.jsx';
import TutorCard from './components/TutorCard.jsx';
import ExerciseCard from './components/ExerciseCard.jsx';
import Flashcard from './components/Flashcard.jsx';
import TeacherMode from './components/TeacherMode.jsx';
import LaunchPanel from './components/LaunchPanel.jsx';
import CanvasSimulator from './simulator/CanvasSimulator.jsx';
import exercisesData from './data/exercises.json';
import flashcardsData from './data/flashcards.json';
import conceptsData from './data/concepts.json';
import errorsData from './data/errors.json';
import glossaryData from './data/glossary.json';
import { useOfflineStorage } from './hooks/useOfflineStorage.js';
import { useTutor } from './hooks/useTutor.js';
import { useMission } from './hooks/useMission.js';
import { useSimulator } from './hooks/useSimulator.js';
import { useExerciseState } from './hooks/useExerciseState.js';

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
  const { mission, currentExercise, next, prev } = useMission(
    exercisesData,
    learning.currentExercise,
    learning.onSelectExercise,
  );
  const simulator = useSimulator(currentExercise, { targetDistance: 40, tolerance: 2.5 });
  const exercise = useExerciseState(currentExercise, {
    onResult: learning.onExerciseResult,
    onMistake: (context) => ask({ type: 'mistake', ...context }),
  });
  const handleTutorHint = () => {
    ask({
      type: 'hint',
      expectedConcept: currentExercise?.expectedConcept,
      exerciseId: currentExercise?.id,
    });
  };

  return (
    <div className="app">
      <Header />
      <ConfidenceBar value={learning.confidence} />
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      <main className="app-main">
        {activeTab === 'simulador' && (
          <>
            <div className="simulator-layout">
              <CanvasSimulator
                mission={mission}
                values={simulator.values}
                status={simulator.status}
                result={simulator.result}
                targetDistance={simulator.targetDistance}
              />
              <div className="simulator-side">
                {currentExercise && (
                  <ExerciseCard
                    exercise={currentExercise}
                    answer={exercise.answer}
                    feedback={exercise.feedback}
                    hintsUsed={exercise.hintsUsed}
                    currentHint={exercise.currentHint}
                    hasHints={exercise.hasHints}
                    onChange={exercise.changeAnswer}
                    onCheck={exercise.check}
                    onHint={exercise.requestHint}
                  />
                )}
                <LaunchPanel
                  values={simulator.values}
                  status={simulator.status}
                  result={simulator.result}
                  onChange={simulator.changeValues}
                  onLaunch={simulator.launch}
                  onReset={simulator.reset}
                />
              </div>
            </div>
            <div className="mission-nav">
              <button type="button" className="btn btn-secondary" onClick={prev}>
                Anterior
              </button>
              <button type="button" className="btn btn-secondary" onClick={next}>
                Siguiente ejercicio
              </button>
            </div>
          </>
        )}

        {activeTab === 'tarjetas' && (
          <div className="card-list">
            {flashcardsData.map((flashcard) => (
              <Flashcard
                key={flashcard.id}
                flashcard={flashcard}
                consolidated={Boolean(learning.flashcardState[flashcard.id]?.consolidated)}
                onConsolidate={learning.onFlashcardConsolidated}
              />
            ))}
          </div>
        )}

        {activeTab === 'aula' && (
          <AulaView attempts={learning.attempts} confidence={learning.confidence} />
        )}
      </main>

      <TutorCard
        message={tutor?.message}
        esHint={tutor?.esHint}
        followUp={tutor?.followUp}
        showHintButton={activeTab === 'simulador' && Boolean(currentExercise)}
        onHint={handleTutorHint}
      />
    </div>
  );
}
