import React, { useState } from 'react';
import { GAMES_I18N } from './parabolicGamesEngine.js';
import BasketballChallenge from './BasketballChallenge.jsx';
import FreeKickChallenge from './FreeKickChallenge.jsx';
import TargetChallenge from './TargetChallenge.jsx';
import ComplementaryChallenge from './ComplementaryChallenge.jsx';
import './parabolicGames.css';

export default function ParabolicGames({
  language = 'gn-jopara',
  onProgress,
}) {
  const langKey = language === 'es' ? 'es' : 'gn-jopara';
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [activeTab, setActiveTab] = useState('bball'); // 'bball' | 'freekick' | 'target' | 'comp'
  const [totalScore, setTotalScore] = useState(0);

  const handleGameProgress = (data) => {
    if (data?.score) {
      setTotalScore((prev) => prev + data.score);
    }
    onProgress?.(data);
  };

  return (
    <section className="pgame-container" aria-label={t.title}>
      <header className="pgame-header">
        <div className="pgame-title-row">
          <h2 className="pgame-title">{t.title}</h2>
          <span className="pgame-score-badge">
            {t.scoreLabel}: {totalScore} XP
          </span>
        </div>
        <p className="pgame-subtitle">{t.subtitle}</p>
      </header>

      {/* Tabs de navegación entre desafíos */}
      <nav className="pgame-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bball'}
          className={`pgame-tab-btn ${activeTab === 'bball' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('bball')}
        >
          {t.tabBasketball}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'freekick'}
          className={`pgame-tab-btn ${activeTab === 'freekick' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('freekick')}
        >
          {t.tabFreeKick}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'target'}
          className={`pgame-tab-btn ${activeTab === 'target' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('target')}
        >
          {t.tabTarget}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'comp'}
          className={`pgame-tab-btn ${activeTab === 'comp' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('comp')}
        >
          {t.tabComplementary}
        </button>
      </nav>

      {/* Vista del desafío seleccionado */}
      <div className="pgame-content-area">
        {activeTab === 'bball' && (
          <BasketballChallenge
            langKey={langKey}
            onProgress={handleGameProgress}
          />
        )}
        {activeTab === 'freekick' && (
          <FreeKickChallenge
            langKey={langKey}
            onProgress={handleGameProgress}
          />
        )}
        {activeTab === 'target' && (
          <TargetChallenge
            langKey={langKey}
            onProgress={handleGameProgress}
          />
        )}
        {activeTab === 'comp' && (
          <ComplementaryChallenge
            langKey={langKey}
            onProgress={handleGameProgress}
          />
        )}
      </div>
    </section>
  );
}
