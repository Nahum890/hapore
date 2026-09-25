import React, { useState } from 'react';
import { GAMES_I18N } from './parabolicGamesEngine.js';
import TargetChallenge from './TargetChallenge.jsx';
import ComplementaryChallenge from './ComplementaryChallenge.jsx';
import './parabolicGames.css';

export default function ParabolicGames({
  language = 'gn-jopara',
  onProgress,
}) {
  const langKey = language === 'es' ? 'es' : 'gn-jopara';
  const t = GAMES_I18N[langKey] || GAMES_I18N.es;

  const [activeTab, setActiveTab] = useState('target'); // 'target' | 'complementary'
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

      {/* Tabs */}
      <nav className="pgame-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'target'}
          className={`pgame-tab-btn ${activeTab === 'target' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('target')}
        >
          {t.targetTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'complementary'}
          className={`pgame-tab-btn ${activeTab === 'complementary' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('complementary')}
        >
          {t.compTab}
        </button>
      </nav>

      {/* Active Challenge */}
      {activeTab === 'target' ? (
        <TargetChallenge
          langKey={langKey}
          onProgress={handleGameProgress}
        />
      ) : (
        <ComplementaryChallenge
          langKey={langKey}
          onProgress={handleGameProgress}
        />
      )}
    </section>
  );
}
