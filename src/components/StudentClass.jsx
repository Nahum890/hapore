import { useState } from 'react';
import { validClassCode } from './TeacherMode.jsx';
import { getTeacherLinkForStudent } from '../utils/classroom.js';
import { getAccountById } from '../auth/localAccounts.js';
import { CLOUD_CODE_PATTERN, normalizeCloudCode } from '../cloud/classCloud.js';
import Avatar from './Avatars.jsx';
import ContactLinks from './ContactLinks.jsx';

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
  const online = typeof navigator === 'undefined' || navigator.onLine;
  if (syncState.status === 'synced') return <p className="sync-status is-synced" role="status">✓ Tu avance llegó a tu docente{syncState.at ? ` (${formatWhen(syncState.at)})` : ''}.</p>;
  if (syncState.status === 'pending' || syncState.status === 'offline' || !online) return <p className="sync-status is-pending" role="status">Tu avance está guardado en este dispositivo y se enviará a tu docente cuando haya internet.</p>;
  if (syncState.status === 'error') return <p className="sync-status is-error" role="status">No se pudo enviar tu avance todavía; se vuelve a intentar solo.</p>;
  return null;
}

function ClassActions({ onPractice, onReview }) {
  return <div className="student-class-actions">
    <button type="button" className="btn btn-primary" onClick={onPractice}>Resolver ejercicios</button>
    <button type="button" className="btn btn-secondary" onClick={onReview}>Repasar tarjetas</button>
  </div>;
}

export default function StudentClass({ classConfig, onJoinClass, studentId, classPackage, cloudEnabled, syncState, onDownload, onLeaveCloud, onPractice, onReview }) {
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
      setError('Ese código no es válido. Pedile a tu docente que te lo vuelva a compartir.');
      return;
    }
    setBusy(true);
    try { await onDownload(cloudCode); setCode(''); }
    catch (failure) {
      setError(failure.offline
        ? 'Para descargar la clase por primera vez necesitás internet. Después podés resolverla sin conexión.'
        : failure.message?.includes('inexistente') ? 'No existe una clase con ese código. Revisalo con tu docente.' : `No se pudo descargar la clase: ${failure.message}`);
    } finally { setBusy(false); }
  };

  if (classPackage) {
    const { content } = classPackage;
    return <section className="card student-class" aria-labelledby="student-class-title">
      <span className="panel-eyebrow">MI CLASE · {classPackage.code}</span>
      <h2 id="student-class-title">{classPackage.title}</h2>
      <div className="teacher-card">
        <Avatar id={classPackage.teacherAvatar} size={48} />
        <div><h3>{classPackage.teacherName}</h3><p>Tu docente</p><ContactLinks person={{ phone: classPackage.teacherPhone, email: classPackage.teacherEmail }} /></div>
      </div>
      <p className="sync-status is-synced">✓ Clase descargada: podés resolverla sin internet.</p>
      <div className="student-class-summary"><span>Ejercicios</span><strong>{content.config.ejercicios}</strong><span>Tarjetas</span><strong>{content.cards.length}</strong></div>
      <ClassActions onPractice={onPractice} onReview={onReview} />
      <SyncStatus syncState={syncState} />
      <div className="student-class-footer">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onDownload(classPackage.code); } catch (failure) { setError(failure.offline ? 'Sin conexión: seguís con la versión ya descargada.' : failure.message); } finally { setBusy(false); } }}>{busy ? 'Actualizando…' : 'Actualizar clase'}</button>
        {confirmLeave
          ? <><button type="button" className="btn btn-danger" onClick={onLeaveCloud}>Sí, salir de la clase</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(false)}>Cancelar</button></>
          : <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(true)}>Salir de la clase</button>}
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
    </section>;
  }

  return <section className="card student-class" aria-labelledby="student-class-title">
    <span className="panel-eyebrow">MI CLASE</span>
    <h2 id="student-class-title">{classConfig ? 'Ya tenés la práctica lista' : cloudEnabled ? 'Descargá la clase de tu docente' : 'Aplicá la práctica de tu docente'}</h2>
    {classConfig ? <>
      <p>Las situaciones, tarjetas y ejercicios seleccionados ya están listos en este dispositivo.</p>
      <div className="student-class-summary"><span>Situaciones seleccionadas</span><strong>{classConfig.subtemas.length}</strong><span>Ejercicios</span><strong>{classConfig.ejercicios}</strong><span>Tarjetas</span><strong>{classConfig.flashcards}</strong></div>
      <p className="field-help">✓ Podés practicar sin conexión. Este código comparte la selección de materiales; no envía tu progreso al docente.</p>
      <ClassActions onPractice={onPractice} onReview={onReview} />
      <LocalTeacherCard studentId={studentId} />
      <button className="btn btn-secondary" type="button" onClick={() => onJoinClass(null)}>Salir de la clase</button>
    </> : <>
      <p>{cloudEnabled
        ? <>Escribí el código de 6 caracteres y tocá <strong>Descargar clase</strong>. Después podés resolverla sin conexión; tu avance se envía cuando vuelve internet.</>
        : <>Escribí el código de práctica que te dio tu docente. La selección se aplica en este dispositivo y podés resolver sin conexión.</>}</p>
      <form onSubmit={submit} className="student-class-form"><label htmlFor="student-class-code">{cloudEnabled ? 'Código de clase' : 'Código de práctica'}</label><div><input id="student-class-code" className="quiz-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError(''); }} placeholder={cloudEnabled ? 'Ej.: K7PQ2M' : 'Ej.: GP10D03'} /><button className="btn btn-primary" type="submit" disabled={!code.trim() || busy}>{busy ? 'Cargando…' : cloudEnabled ? 'Descargar clase' : 'Aplicar práctica'}</button></div>{error && <p role="alert" className="field-error">{error}</p>}</form>
      {!cloudEnabled && <p className="field-help student-class-note">El código de práctica no identifica una clase ni envía tu progreso. Para compartirlo con seguimiento entre dispositivos, hace falta Supabase.</p>}
    </>}
  </section>;
}
