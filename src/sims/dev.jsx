// Página de desarrollo para revisar los simuladores uno por uno:
// /sims-dev.html?sim=motion&mode=mruv  (no forma parte del build).
import { createRoot } from 'react-dom/client';
import '../index.css';
import { LanguageProvider } from '../i18n/LanguageProvider.jsx';
import { SIMULATORS } from './index.js';

const params = new URLSearchParams(location.search);
const type = params.get('sim') ?? 'motion';
const mode = params.get('mode') ?? undefined;
const Component = SIMULATORS[type];

createRoot(document.getElementById('root')).render(<LanguageProvider>
  <main style={{ maxWidth: 1100, margin: '20px auto', padding: '0 16px' }}>
    {Component ? <Component mode={mode} /> : <p>Simulador “{type}” no existe.</p>}
  </main>
</LanguageProvider>);
