import { useState } from 'react';
import { login, register } from '../auth/localAccounts.js';
import { BrandMark, LaunchScene } from './Nanduti.jsx';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import LanguageSelector from './LanguageSelector.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { localizeError } from '../i18n/messages.js';

export default function AuthScreen({ onAuthenticated }) {
  const { t, language } = useTranslation();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('alumno');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changeMode = next => { setMode(next); setError(''); setPassword(''); };
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const account = mode === 'register'
        ? await register({ name, username, password, role, phone, email })
        : await login({ username, password });
      onAuthenticated(account);
    } catch (failure) {
      setError(failure.message || 'default');
    } finally { setBusy(false); }
  };
  const errorText = error === 'default' ? t('auth.errDefault') : localizeError(language, error);

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-welcome" aria-labelledby="auth-welcome-title">
          <div className="auth-brand">
            <BrandMark size={44} />
            <span>PyFis <em>IA</em></span>
            <span className="auth-language"><LanguageSelector /></span>
          </div>
          <span className="auth-kicker">{t('auth.kicker')}</span>
          <h1 id="auth-welcome-title">
            <span className="auth-motto" lang="gn">Ani rekyhyje.</span> {t('auth.title')}
          </h1>
          <p>{t('auth.lead')}</p>
          <div className="auth-preview" aria-hidden="true">
            <LaunchScene />
            <div className="preview-note">
              <span>{t('auth.previewTag')}</span>
              <strong>{t('auth.previewTitle')}</strong>
              <small>{t('auth.previewSub')}</small>
            </div>
          </div>
        </section>
        <section className="auth-panel" aria-label={t('auth.panel')}>
          <div className="auth-tabs" role="tablist" aria-label={t('auth.tabs')}>
            <button id="tab-login" type="button" role="tab" aria-selected={mode === 'login'} aria-controls="auth-panel-body" className={mode === 'login' ? 'is-active' : ''} onClick={() => changeMode('login')}>{t('auth.login')}</button>
            <button id="tab-register" type="button" role="tab" aria-selected={mode === 'register'} aria-controls="auth-panel-body" className={mode === 'register' ? 'is-active' : ''} onClick={() => changeMode('register')}>{t('auth.register')}</button>
          </div>
          <div id="auth-panel-body" className="auth-panel-body" role="tabpanel" aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'}>
            <h2>{t(mode === 'login' ? 'auth.welcomeBack' : 'auth.welcomeNew')}</h2>
            <p>{t(mode === 'login' ? 'auth.loginLead' : 'auth.registerLead')}</p>
            <form className="auth-form" onSubmit={submit}>
              {mode === 'register' && (
                <>
                  <fieldset className="role-picker">
                    <legend>{t('auth.roleLegend')}</legend>
                    <label className={role === 'alumno' ? 'is-selected' : ''}>
                      <input id="auth-role-alumno" type="radio" name="role" value="alumno" checked={role === 'alumno'} onChange={() => setRole('alumno')} />
                      <span className="role-icon" aria-hidden="true">✎</span>
                      <strong>{t('auth.student')}</strong>
                      <small>{t('auth.studentSub')}</small>
                    </label>
                    <label className={role === 'maestro' ? 'is-selected' : ''}>
                      <input id="auth-role-maestro" type="radio" name="role" value="maestro" checked={role === 'maestro'} onChange={() => setRole('maestro')} />
                      <span className="role-icon" aria-hidden="true">▤</span>
                      <strong>{t('auth.teacher')}</strong>
                      <small>{t('auth.teacherSub')}</small>
                    </label>
                  </fieldset>
                  <label htmlFor="auth-name">
                    {t('auth.name')}
                    <input id="auth-name" required autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder={t('auth.namePh')} />
                  </label>
                  <label htmlFor="auth-phone">
                    {t('auth.phone')}
                    <input id="auth-phone" required type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} />
                  </label>
                  <label htmlFor="auth-email">
                    {t('auth.email')}
                    <input id="auth-email" required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
                  </label>
                  <p className="auth-field-note">{t('auth.contactNote')}</p>
                </>
              )}
              <label htmlFor="auth-username">
                {t('auth.username')}
                <input id="auth-username" required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder={t('auth.usernamePh')} />
              </label>
              <label htmlFor="auth-password">
                {t('auth.password')}
                <div className="password-field">
                  <input
                    id="auth-password"
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={t(mode === 'register' ? 'auth.passwordNew' : 'auth.passwordPh')}
                    aria-invalid={error !== ''}
                    aria-errormessage={error !== '' ? 'auth-error-msg' : undefined}
                  />
                  <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={t(showPassword ? 'auth.hideLabel' : 'auth.showLabel')} aria-pressed={showPassword}>
                    {t(showPassword ? 'auth.hide' : 'auth.show')}
                  </button>
                </div>
              </label>
              {error !== '' && <p id="auth-error-msg" className="auth-error" role="alert" aria-live="assertive">{errorText}</p>}
              <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
                {busy ? t('auth.busy') : t(mode === 'register' ? 'auth.submitRegister' : 'auth.submitLogin')} <span aria-hidden="true">→</span>
              </button>
            </form>
            <p className="auth-local-note">{t(isCloudConfigured() ? 'auth.noteCloud' : 'auth.noteLocal')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
