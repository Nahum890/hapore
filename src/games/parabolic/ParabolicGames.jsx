import React, { useState } from 'react';
import { GAMES_I18N } from './parabolicGamesEngine.js';
import BasketballChallenge from './BasketballChallenge.jsx';
import FreeKickChallenge from './FreeKickChallenge.jsx';
import ComplementaryChallenge from './ComplementaryChallenge.jsx';
import './parabolicGames.css';

export default function ParabolicGames({ language = 'gn-jopara', onProgress }) {
  const langKey = language === 'es' ? 'es' : 'gn-jopara';
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [activeGame, setActiveGame] = useState(null);
  const [totalScore, setTotalScore] = useState(0);

  const handleGameProgress = (data) => {
    if (data?.score) setTotalScore((prev) => prev + data.score);
    onProgress?.(data);
  };

  return (
    <section className="pgame-container" aria-label={t.title}>
      <header className="pgame-header">
        <div className="pgame-title-row">
          <h2 className="pgame-title">{t.title}</h2>
          <span className="pgame-score-badge">{t.scoreLabel}: {totalScore} XP</span>
        </div>
        <p className="pgame-subtitle">{t.subtitle}</p>
      </header>

      {!activeGame ? (
        <>
          <div className="pgame-selection-heading">
            <h3>{t.challengeSelectionTitle}</h3>
            <p>{t.challengeSelectionDescription}</p>
          </div>
          <div className="pgame-challenge-options" role="group" aria-label={t.challengeListLabel}>
            <article className="pgame-challenge-option">
              <div>
                <span className="pgame-option-kicker">01</span>
                <h3>{t.tabBasketball}</h3>
                <p>{t.bballChoiceDescription}</p>
              </div>
              <button type="button" className="btn btn-primary pgame-option-button" onClick={() => setActiveGame('bball')}>
                {t.startThisChallenge}
              </button>
            </article>
            <article className="pgame-challenge-option">
              <div>
                <span className="pgame-option-kicker">02</span>
                <h3>{t.tabFreeKick}</h3>
                <p>{t.fkChoiceDescription}</p>
              </div>
              <button type="button" className="btn btn-primary pgame-option-button" onClick={() => setActiveGame('freekick')}>
                {t.startThisChallenge}
              </button>
            </article>
            <article className="pgame-challenge-option">
              <div>
                <span className="pgame-option-kicker">03</span>
                <h3>{t.tabComplementary}</h3>
                <p>{t.compChoiceDescription}</p>
              </div>
              <button type="button" className="btn btn-primary pgame-option-button" onClick={() => setActiveGame('comp')}>
                {t.startThisChallenge}
              </button>
            </article>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-secondary pgame-back-button" onClick={() => setActiveGame(null)}>
            {t.backToChallenges}
          </button>
          <div className="pgame-content-area">
            {activeGame === 'bball' && <BasketballChallenge langKey={langKey} onProgress={handleGameProgress} />}
            {activeGame === 'freekick' && <FreeKickChallenge langKey={langKey} onProgress={handleGameProgress} />}
            {activeGame === 'comp' && <ComplementaryChallenge langKey={langKey} onProgress={handleGameProgress} />}
          </div>
        </>
      )}
    </section>
  );
}
