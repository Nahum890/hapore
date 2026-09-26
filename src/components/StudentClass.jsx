import { useState } from 'react';
import { validClassCode } from './TeacherMode.jsx';
import { getTeacherLinkForStudent } from '../utils/classroom.js';
import { getAccountById } from '../auth/localAccounts.js';
import Avatar from './Avatars.jsx';

function TeacherCard({ studentId }) {
  const link = getTeacherLinkForStudent(studentId);
  const teacher = link?.teacherId ? getAccountById(link.teacherId) : null;
  if (!teacher) return null;
  return (
    <div className="teacher-card">
      <Avatar id={teacher.avatar} size={48} />
      <div>
        <h3>{teacher.name}</h3>
        <p>@{teacher.username}{teacher.phone ? ` · ${teacher.phone}` : ''}{teacher.email ? ` · ${teacher.email}` : ''}</p>
      </div>
    </div>
  );
}

export default function StudentClass({ classConfig, onJoinClass, studentId }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const join = event => {
    event.preventDefault();
    const config = validClassCode(code);
    if (!config) { setError('Ese código no es válido. Pedile a tu docente que te lo vuelva a compartir.'); return; }
    setError(''); onJoinClass(config, code.trim().toUpperCase());
  };
  return <section className="card student-class" aria-labelledby="student-class-title">
    <span className="panel-eyebrow">MI CLASE</span>
    <h2 id="student-class-title">{classConfig ? 'Ya estás en una clase' : 'Unite a la clase de tu docente'}</h2>
    {classConfig ? <>
      <p>Los temas, las tarjetas y los ejercicios de la clase ya están listos en este dispositivo.</p>
      <div className="student-class-summary"><span>Situaciones seleccionadas</span><strong>{classConfig.subtemas.length}</strong><span>Ejercicios</span><strong>{classConfig.ejercicios}</strong><span>Tarjetas</span><strong>{classConfig.flashcards}</strong></div>
      <p className="field-help">✓ Tu progreso se guarda en este dispositivo; podés practicar sin conexión.</p>
      <TeacherCard studentId={studentId} />
      <button className="btn btn-secondary" type="button" onClick={() => onJoinClass(null)}>Salir de la clase</button>
    </> : <>
      <p>Pedile el código a tu docente y escribilo abajo para ver los materiales que preparó.</p>
      <form onSubmit={join} className="student-class-form"><label htmlFor="student-class-code">1. Código de clase</label><div><input id="student-class-code" className="quiz-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError(''); }} placeholder="Ej.: GP10H03" /><button className="btn btn-primary" type="submit" disabled={!code.trim()}>Ver mi clase</button></div>{error && <p role="alert" className="field-error">{error}</p>}</form>
      <p className="field-help student-class-note">El código ajusta tus ejercicios aquí. Tu progreso queda guardado en este dispositivo.</p>
    </>}
  </section>;
}
