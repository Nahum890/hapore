import { useState } from 'react';
import { login, register } from '../auth/localAccounts.js';
import { BrandMark, LaunchScene } from './Nanduti.jsx';
import { isCloudConfigured } from '../cloud/cloudClient.js';

export default function AuthScreen({ onAuthenticated }) {
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
      setError(failure.message || 'No se pudo acceder. Intentá de nuevo.');
    } finally { setBusy(false); }
  };

  return <main className="auth-page">
    <div className="auth-layout">
      <section className="auth-welcome" aria-labelledby="auth-welcome-title">
        <div className="auth-brand"><BrandMark size={44} /><span>PyFis <em>IA</em></span></div>
        <span className="auth-kicker">Física 3.º curso · Jopara ha castellano</span>
        <h1 id="auth-welcome-title"><span className="auth-motto" lang="gn">Ani rekyhyje.</span> Aprendé física paso a paso.</h1>
        <p>Practicá con ejercicios y simulaciones, repasá con tarjetas y preguntale al tutor cuando necesites ayuda. Equivocarse también es aprender.</p>
        <div className="auth-preview" aria-hidden="true">
          <LaunchScene />
          <div className="preview-note"><span>Ñaha’ã · Practicá</span><strong>Escribí tu respuesta</strong><small>Después comprobala con la simulación.</small></div>
        </div>
      </section>
      <section className="auth-panel" aria-label="Acceso a la aplicación">
        <div className="auth-tabs" role="tablist" aria-label="Acceso">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => changeMode('login')}>Iniciar sesión</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => changeMode('register')}>Crear cuenta</button>
        </div>
        <div className="auth-panel-body">
          <h2>{mode === 'login' ? '¡Qué bueno verte!' : 'Empecemos juntos'}</h2>
          <p>{mode === 'login' ? 'Ingresá a tu espacio de aprendizaje.' : 'Elegí cómo vas a usar PyFis IA.'}</p>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <>
              <fieldset className="role-picker"><legend>Voy a usar la app como</legend>
                <label className={role === 'alumno' ? 'is-selected' : ''}><input type="radio" name="role" value="alumno" checked={role === 'alumno'} onChange={() => setRole('alumno')} /><span className="role-icon" aria-hidden="true">✎</span><strong>Alumno</strong><small>Practicar y unirme a una clase</small></label>
                <label className={role === 'maestro' ? 'is-selected' : ''}><input type="radio" name="role" value="maestro" checked={role === 'maestro'} onChange={() => setRole('maestro')} /><span className="role-icon" aria-hidden="true">▤</span><strong>Maestro</strong><small>Preparar clases y usar el proyector</small></label>
              </fieldset>
              <label>Tu nombre<input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Nombre y apellido" /></label>
              <label>Número de teléfono<input required type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Ej: 0981 123 456" /></label>
              <label>Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Ej: nombre@ejemplo.com" /></label>
              <p className="auth-field-note">Solo los ven tu docente y tus compañeros de clase, para poder contactarte.</p>
            </>}
            <label>Nombre de usuario<input required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Tu usuario" /></label>
            <label>Contraseña<div className="password-field"><input required minLength={mode === 'register' ? 8 : undefined} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'register' ? 'Crear mi cuenta' : 'Entrar a PyFis IA'} <span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-local-note">{isCloudConfigured()
            ? 'La cuenta y el progreso se guardan en este dispositivo. Si te unís a una clase, tu avance se envía a tu docente cuando hay internet.'
            : 'Las cuentas y el progreso se guardan únicamente en este dispositivo. Sincronización entre dispositivos no disponible.'}</p>
        </div>
      </section>
    </div>
  </main>;
}
