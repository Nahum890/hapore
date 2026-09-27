import { useEffect, useRef, useState } from 'react';
import { updateProfile } from '../auth/localAccounts.js';
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
            <input className="quiz-input" type="tel" required autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder={t('auth.phonePh')} />
          </label>
          <label className="teacher-field">{t('settings.email')}
            <input className="quiz-input" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={t('auth.emailPh')} />
          </label>
          {error && <p className="field-error" role="alert">{localizeError(language, error)}</p>}
          {saved && <p className="field-help" role="status">{t('common.saved')}</p>}
          <div className="onboarding-actions">
            {!required && <button type="button" className="onboarding-skip" onClick={onClose}>{t('common.close')}</button>}
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
