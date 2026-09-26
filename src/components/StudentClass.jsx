import { useState } from 'react';
import { validClassCode } from './TeacherMode.jsx';
import { getTeacherLinkForStudent } from '../utils/classroom.js';
import { getAccountById } from '../auth/localAccounts.js';
import Avatar from './Avatars.jsx';

function TeacherCard({ studentId }) {
  const link = getTeacherLinkForStudent(studentId);
  const teacher = link?.teacherId ? getAccountById(link.teacherId) : null;
  if (!teacher) {
    return <p className="field-help">No pudimos identificar a tu docente en este dispositivo (puede ser que el código se lo hayan pasado desde otro dispositivo).</p>;
  }
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
      <p>Los temas, las tarjetas y los ejercicios de la clase ya se aplicaron a tu cuenta.</p>
      <div className="student-class-summary"><span>Situaciones seleccionadas</span><strong>{classConfig.subtemas.length}</strong><span>Ejercicios</span><strong>{classConfig.ejercicios}</strong><span>Tarjetas</span><strong>{classConfig.flashcards}</strong></div>
      <p className="field-help">✓ Ya quedó guardado en este dispositivo: podés seguir practicando sin conexión.</p>
      <h3>Tu docente</h3>
      <TeacherCard studentId={studentId} />
      <button className="btn btn-secondary" type="button" onClick={() => onJoinClass(null)}>Salir de la clase</button>
    </> : <>
      <p>Escribí el código que te dio tu docente. La práctica y el repaso se ajustarán a esa clase.</p>
      <form onSubmit={join} className="student-class-form"><label htmlFor="student-class-code">Código de clase</label><div><input id="student-class-code" className="quiz-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError(''); }} placeholder="Ingresá el código" /><button className="btn btn-primary" type="submit" disabled={!code.trim()}>Unirme</button></div>{error && <p role="alert" className="field-error">{error}</p>}</form>
    </>}
  </section>;
}
