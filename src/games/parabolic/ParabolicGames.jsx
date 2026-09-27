import React, { useState } from 'react';
import { GAMES_I18N } from './parabolicGamesEngine.js';
import BasketballChallenge from './BasketballChallenge.jsx';
import FreeKickChallenge from './FreeKickChallenge.jsx';
import ComplementaryChallenge from './ComplementaryChallenge.jsx';
import './parabolicGames.css';

export default function ParabolicGames({ language = 'gn-jopara', onProgress }) {
  const langKey = language === 'es' ? 'es' : 'gn-jopara';
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('bball');
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

      {!started ? (
        <div className="pgame-start-card">
          <div>
            <h3>{t.startTitle}</h3>
            <p>{t.startDescription}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStarted(true)}>
            {t.startButton}
          </button>
        </div>
      ) : (
        <>
          <nav className="pgame-tabs" role="tablist" aria-label={t.challengeListLabel}>
            <button type="button" role="tab" aria-selected={activeTab === 'bball'} className={`pgame-tab-btn ${activeTab === 'bball' ? 'is-active' : ''}`} onClick={() => setActiveTab('bball')}>
              {t.tabBasketball}
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'freekick'} className={`pgame-tab-btn ${activeTab === 'freekick' ? 'is-active' : ''}`} onClick={() => setActiveTab('freekick')}>
              {t.tabFreeKick}
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'comp'} className={`pgame-tab-btn ${activeTab === 'comp' ? 'is-active' : ''}`} onClick={() => setActiveTab('comp')}>
              {t.tabComplementary}
            </button>
          </nav>

          <div className="pgame-content-area">
            {activeTab === 'bball' && <BasketballChallenge langKey={langKey} onProgress={handleGameProgress} />}
            {activeTab === 'freekick' && <FreeKickChallenge langKey={langKey} onProgress={handleGameProgress} />}
            {activeTab === 'comp' && <ComplementaryChallenge langKey={langKey} onProgress={handleGameProgress} />}
          </div>
        </>
      )}
    </section>
  );
}
