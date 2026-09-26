import { useEffect, useRef, useState } from 'react';
import { updateProfile } from '../auth/localAccounts.js';
import Avatar, { AVATAR_OPTIONS } from './Avatars.jsx';

export default function ProfileSettings({ open, user, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? AVATAR_OPTIONS[0]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Solo se reinician los campos al ABRIR el diálogo, no en cada cambio de
  // `user` (guardar exitosamente actualiza `user` en el componente padre, lo
  // que antes disparaba este efecto de nuevo y borraba el mensaje "Guardado"
  // apenas aparecía).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      setPhone(user?.phone ?? ''); setEmail(user?.email ?? ''); setAvatar(user?.avatar ?? AVATAR_OPTIONS[0]);
      setSaved(false); setError('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => { if (dialog.open) dialog.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = (event) => {
    event.preventDefault();
    setError(''); setSaved(false);
    try {
      const updated = updateProfile(user.id, { phone, email, avatar });
      onSaved?.(updated);
      setSaved(true);
    } catch (failure) {
      setError(failure.message || 'No se pudo guardar. Probá de nuevo.');
    }
  };

  return (
    <dialog ref={dialogRef} className="onboarding-dialog settings-dialog" aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="onboarding-shell">
        <div className="onboarding-top"><span className="onboarding-brand">Configuración</span><button type="button" className="onboarding-close" aria-label="Cerrar configuración" onClick={onClose}>×</button></div>
        <form className="settings-form" onSubmit={submit}>
          <h2 id="settings-title">Tus datos</h2>
          <p className="teacher-note">Se guardan solo en este dispositivo, junto con tu cuenta.</p>
          <fieldset className="avatar-picker">
            <legend>Foto de perfil</legend>
            <div className="avatar-options">
              {AVATAR_OPTIONS.map(id => (
                <label key={id} className={'avatar-option' + (avatar === id ? ' is-selected' : '')}>
                  <input type="radio" name="avatar" value={id} checked={avatar === id} onChange={() => setAvatar(id)} />
                  <Avatar id={id} size={52} />
                </label>
              ))}
            </div>
          </fieldset>
          <label className="teacher-field">Teléfono (opcional)
            <input className="quiz-input" type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Ej: 0981 123 456" />
          </label>
          <label className="teacher-field">Correo (opcional)
            <input className="quiz-input" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Ej: nombre@ejemplo.com" />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          {saved && <p className="field-help" role="status">Guardado.</p>}
          <div className="onboarding-actions">
            <button type="button" className="onboarding-skip" onClick={onClose}>Cerrar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
