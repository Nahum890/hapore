// Carga los simuladores aparte (no pesan en la primera pantalla de la app).
import { lazy, Suspense } from 'react';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';

const Registry = lazy(() => import('../../sims/index.js').then(module => ({
  default: ({ type, mode }) => {
    const Component = module.SIMULATORS[type];
    return Component ? <Component mode={mode} /> : null;
  },
})));

export default function SimLoader({ sim }) {
  const { t } = useTranslation();
  if (!sim) return null;
  return <Suspense fallback={<p className="topics-loading">{t('topics.loadingSim')}</p>}><Registry type={sim.type} mode={sim.mode} /></Suspense>;
}
