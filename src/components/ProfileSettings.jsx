import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { changePassword, updateProfile } from '../auth/localAccounts.js';
import { getOnlineConsent, setOnlineConsent, subscribeOnlineConsent } from '../ai/onlineConsent.js';
import Avatar, { AVATAR_OPTIONS, isPhotoAvatar } from './Avatars.jsx';
import { imageFileToDataUrl } from '../utils/imageData.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { localizeError } from '../i18n/messages.js';

// `required`: la cuenta todavía no tiene teléfono y correo (cuentas creadas
// antes de que fueran obligatorios). No se puede cerrar hasta completarlos.
export default function ProfileSettings({ open, user, onClose, onSaved, required = false }) {
  const { t, language } = useTranslation();
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? AVATAR_OPTIONS[0]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [geminiError, setGeminiError] = useState('');
  const geminiConsent = useSyncExternalStore(subscribeOnlineConsent, getOnlineConsent, () => 'unset');

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
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordStatus(''); setPasswordError('');
      setGeminiError('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => { if (dialog.open) dialog.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => { if (!required) onClose(); };

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setSaved(false); setLoadingPhoto(true);
    try {
      setAvatar(await imageFileToDataUrl(file, { maxSize: 256, square: true, maxChars: 190_000 }));
    } catch (failure) {
      setError(failure.message);
    } finally { setLoadingPhoto(false); }
  };

  const submit = (event) => {
    event.preventDefault();
    setError(''); setSaved(false);
    try {
      const updated = updateProfile(user.id, { phone, email, avatar });
      onSaved?.(updated);
      setSaved(true);
      if (required) onClose();
    } catch (failure) {
      setError(failure.message || t('settings.errSave'));
    }
  };

  const submitPassword = async event => {
    event.preventDefault();
    setPasswordError(''); setPasswordStatus('');
    if (newPassword !== confirmPassword) { setPasswordError('settings.passwordMismatch'); return; }
    try {
      await changePassword(user.id, { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordStatus('settings.passwordSaved');
    } catch (failure) {
      const key = failure.message === 'PASSWORD_CURRENT_INVALID' ? 'settings.passwordWrong'
        : failure.message === 'PASSWORD_TOO_SHORT' ? 'settings.passwordShort'
          : failure.message === 'PASSWORD_UNAVAILABLE' ? 'settings.passwordUnavailable' : 'settings.passwordError';
      setPasswordError(key);
    }
  };

  const updateGeminiConsent = event => {
    setGeminiError('');
    if (!setOnlineConsent(event.target.checked ? 'online' : 'local')) setGeminiError('settings.geminiError');
  };

  return (
    <dialog ref={dialogRef} className="onboarding-dialog settings-dialog" aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="onboarding-shell">
        <div className="onboarding-top"><span className="onboarding-brand">{t('settings.brand')}</span>{!required && <button type="button" className="onboarding-close" aria-label={t('settings.closeLabel')} onClick={onClose}>×</button>}</div>
        <form className="settings-form" onSubmit={submit}>
          <h2 id="settings-title">{t(required ? 'settings.requiredTitle' : 'settings.title')}</h2>
          <p className="teacher-note">{t(required ? 'settings.requiredNote' : 'settings.note')}</p>
          <fieldset className="avatar-picker">
            <legend>{t('settings.photo')}</legend>
            <div className="avatar-options">
              {isPhotoAvatar(avatar) && (
                <label className="avatar-option is-selected">
                  <input type="radio" name="avatar" value="photo" checked readOnly />
                  <Avatar id={avatar} size={52} />
                </label>
              )}
              {AVATAR_OPTIONS.map(id => (
                <label key={id} className={'avatar-option' + (avatar === id ? ' is-selected' : '')}>
                  <input type="radio" name="avatar" value={id} checked={avatar === id} onChange={() => setAvatar(id)} />
                  <Avatar id={id} size={52} />
                </label>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickPhoto} />
            <button type="button" className="btn btn-secondary avatar-upload" onClick={() => fileRef.current?.click()} disabled={loadingPhoto}>
              {t(loadingPhoto ? 'settings.uploading' : 'settings.upload')}
            </button>
          </fieldset>
          <label className="teacher-field">{t('settings.phone')}
            <input className="quiz-input" type="tel" required autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} />
          </label>
          <label className="teacher-field">{t('settings.email')}
            <input className="quiz-input" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          </label>
          {error && <p className="field-error" role="alert">{localizeError(language, error)}</p>}
          {saved && <p className="field-help" role="status">{t('common.saved')}</p>}
          <div className="onboarding-actions">
            {!required && <button type="button" className="onboarding-skip" onClick={onClose}>{t('common.close')}</button>}
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </div>
        </form>
        {!required && <div className="settings-extra">
          <section className="settings-preference" aria-labelledby="settings-gemini-title">
            <div><h3 id="settings-gemini-title">{t('settings.geminiTitle')}</h3><p>{t(geminiConsent === 'online' ? 'settings.geminiOnline' : 'settings.geminiLocal')}</p></div>
            <label className="settings-switch"><span className="sr-only">{t('settings.geminiToggle')}</span><input type="checkbox" checked={geminiConsent === 'online'} onChange={updateGeminiConsent} /><span aria-hidden="true" /></label>
            {geminiError && <p className="field-error" role="alert">{t(geminiError)}</p>}
          </section>
          <form className="settings-password-form" onSubmit={submitPassword}>
            <h3>{t('settings.passwordTitle')}</h3>
            <p className="field-help">{t('settings.passwordScope')}</p>
            <label className="teacher-field">{t('settings.passwordCurrent')}<input className="quiz-input" type="password" required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
            <label className="teacher-field">{t('settings.passwordNew')}<input className="quiz-input" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
            <label className="teacher-field">{t('settings.passwordConfirm')}<input className="quiz-input" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
            {passwordError && <p className="field-error" role="alert">{t(passwordError)}</p>}
            {passwordStatus && <p className="field-help" role="status">{t(passwordStatus)}</p>}
            <button type="submit" className="btn btn-secondary">{t('settings.passwordSave')}</button>
          </form>
        </div>}
      </div>
    </dialog>
  );
}
