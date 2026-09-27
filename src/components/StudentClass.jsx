import { useState } from 'react';
import { validClassCode } from './TeacherMode.jsx';
import { getTeacherLinkForStudent } from '../utils/classroom.js';
import { getAccountById } from '../auth/localAccounts.js';
import { CLOUD_CODE_PATTERN, normalizeCloudCode } from '../cloud/classCloud.js';
import Avatar from './Avatars.jsx';
import ContactLinks from './ContactLinks.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

function LocalTeacherCard({ studentId }) {
  const link = getTeacherLinkForStudent(studentId);
  const teacher = link?.teacherId ? getAccountById(link.teacherId) : null;
  if (!teacher) return null;
  return <div className="teacher-card">
    <Avatar id={teacher.avatar} size={48} />
    <div><h3>{teacher.name}</h3><p>@{teacher.username}</p><ContactLinks person={teacher} /></div>
  </div>;
}

const formatWhen = iso => { try { return new Date(iso).toLocaleString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function SyncStatus({ syncState }) {
  const { t } = useTranslation();
  const online = typeof navigator === 'undefined' || navigator.onLine;
  if (syncState.status === 'synced') return <p className="sync-status is-synced" role="status">{t('class.synced', { when: syncState.at ? ` (${formatWhen(syncState.at)})` : '' })}</p>;
  if (syncState.status === 'pending' || syncState.status === 'offline' || !online) return <p className="sync-status is-pending" role="status">{t('class.pending')}</p>;
  if (syncState.status === 'error') return <p className="sync-status is-error" role="status">{t('class.syncError')}</p>;
  return null;
}

function ClassActions({ onPractice, onReview }) {
  const { t } = useTranslation();
  return <div className="student-class-actions">
    <button type="button" className="btn btn-primary" onClick={onPractice}>{t('class.practice')}</button>
    <button type="button" className="btn btn-secondary" onClick={onReview}>{t('class.review')}</button>
  </div>;
}

export default function StudentClass({ classConfig, onJoinClass, studentId, classPackage, cloudEnabled, syncState, onDownload, onLeaveCloud, onPractice, onReview }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    const localConfig = validClassCode(code);
    if (localConfig) { onJoinClass(localConfig, code.trim().toUpperCase()); return; }
    const cloudCode = normalizeCloudCode(code);
    if (!cloudEnabled || !CLOUD_CODE_PATTERN.test(cloudCode)) {
      setError(t('class.errInvalid'));
      return;
    }
    setBusy(true);
    try { await onDownload(cloudCode); setCode(''); }
    catch (failure) {
      setError(failure.offline
        ? t('class.errOffline')
        : failure.message?.includes('inexistente') ? t('class.errMissing') : t('class.errDownload', { msg: failure.message }));
    } finally { setBusy(false); }
  };

  if (classPackage) {
    const { content } = classPackage;
    const update = async () => {
      setBusy(true); setError('');
      try { await onDownload(classPackage.code); }
      catch (failure) { setError(failure.offline ? t('class.errKeepVersion') : failure.message); }
      finally { setBusy(false); }
    };
    return <section className="card student-class" aria-labelledby="student-class-title">
      <span className="panel-eyebrow">{t('class.eyebrow')} · {classPackage.code}</span>
      <h2 id="student-class-title">{classPackage.title}</h2>
      <div className="teacher-card">
        <Avatar id={classPackage.teacherAvatar} size={48} />
        <div><h3>{classPackage.teacherName}</h3><p>{t('class.yourTeacher')}</p><ContactLinks person={{ phone: classPackage.teacherPhone, email: classPackage.teacherEmail }} /></div>
      </div>
      <p className="sync-status is-synced">{t('class.downloaded')}</p>
      <div className="student-class-summary"><span>{t('class.exercises')}</span><strong>{content.config.ejercicios}</strong><span>{t('class.cards')}</span><strong>{content.cards.length}</strong></div>
      <ClassActions onPractice={onPractice} onReview={onReview} />
      <SyncStatus syncState={syncState} />
      <div className="student-class-footer">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={update}>{t(busy ? 'class.updating' : 'class.update')}</button>
        {confirmLeave
          ? <><button type="button" className="btn btn-danger" onClick={onLeaveCloud}>{t('class.confirmLeave')}</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(false)}>{t('common.cancel')}</button></>
          : <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(true)}>{t('class.leave')}</button>}
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
    </section>;
  }

  return <section className="card student-class" aria-labelledby="student-class-title">
    <span className="panel-eyebrow">{t('class.eyebrow')}</span>
    <h2 id="student-class-title">{t(classConfig ? 'class.readyTitle' : cloudEnabled ? 'class.downloadTitle' : 'class.applyTitle')}</h2>
    {classConfig ? <>
      <p>{t('class.readyText')}</p>
      <div className="student-class-summary"><span>{t('class.situations')}</span><strong>{classConfig.subtemas.length}</strong><span>{t('class.exercises')}</span><strong>{classConfig.ejercicios}</strong><span>{t('class.cards')}</span><strong>{classConfig.flashcards}</strong></div>
      <p className="field-help">{t('class.localNote')}</p>
      <ClassActions onPractice={onPractice} onReview={onReview} />
      <LocalTeacherCard studentId={studentId} />
      <button className="btn btn-secondary" type="button" onClick={() => onJoinClass(null)}>{t('class.leave')}</button>
    </> : <>
      <p>{t(cloudEnabled ? 'class.cloudLead' : 'class.localLead')}</p>
      <form onSubmit={submit} className="student-class-form"><label htmlFor="student-class-code">{t(cloudEnabled ? 'class.cloudCode' : 'class.localCode')}</label><div><input id="student-class-code" className="quiz-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError(''); }} /><button className="btn btn-primary" type="submit" disabled={!code.trim() || busy}>{busy ? t('common.loading') : t(cloudEnabled ? 'class.download' : 'class.apply')}</button></div>{error && <p role="alert" className="field-error">{error}</p>}</form>
      {!cloudEnabled && <p className="field-help student-class-note">{t('class.localOnly')}</p>}
    </>}
  </section>;
}
