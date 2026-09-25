import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectileLab from './simulator/ProjectileLab.jsx';
import ParabolicGames from './games/parabolic/ParabolicGames.jsx';
import './index.css';

function LabPreviewApp() {
  const [lang, setLang] = useState('gn-jopara');
  const [lastProgress, setLastProgress] = useState(null);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#e9f3ee',
        borderRadius: '8px',
        border: '1px solid #b5ccbf'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#17483b' }}>
            Visor de Laboratorio y Minijuegos (Máximo Miranda)
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#38564b' }}>
            Vista previa para probar la simulación, controles, física y minijuegos offline.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="lang-select" style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#17483b' }}>
            Idioma / Ñe'ẽ:
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #17483b',
              fontWeight: '600'
            }}
          >
            <option value="gn-jopara">Guarani Jopara</option>
            <option value="es">Castellano</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* 1. Laboratorio */}
        <ProjectileLab language={lang} />

        {/* 2. Minijuegos */}
        <ParabolicGames
          language={lang}
          onProgress={(data) => {
            console.log('Progreso de minijuego recibido:', data);
            setLastProgress(data);
          }}
        />

        {lastProgress && (
          <aside style={{
            padding: '0.75rem 1rem',
            background: '#eef6f9',
            border: '1px solid #bedce7',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            <strong>Callback onProgress recibido:</strong> {JSON.stringify(lastProgress)}
          </aside>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<LabPreviewApp />);
