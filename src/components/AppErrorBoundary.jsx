import { Component } from 'react';
import { readLanguage } from '../i18n/LanguageProvider.jsx';
import { translate } from '../i18n/messages.js';

// Si un componente falla al dibujarse, en vez de dejar la pantalla en blanco
// (lo peor que puede pasar en una demo) se muestra qué pasó y cómo seguir.
// Los datos del alumno quedan intactos en el dispositivo.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('PyFis IA: error de la interfaz', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const language = readLanguage();
    const t = key => translate(language, key);
    return <main className="app-crash" role="alert">
      <h1>{t('crash.title')}</h1>
      <p>{t('crash.text')}</p>
      <p className="app-crash-detail">{String(this.state.error?.message ?? this.state.error)}</p>
      <div className="app-crash-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
        <button type="button" className="btn btn-secondary" onClick={() => { this.setState({ error: null }); window.location.assign('/'); }}>{t('crash.home')}</button>
      </div>
    </main>;
  }
}
