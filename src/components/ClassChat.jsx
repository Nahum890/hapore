import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatars.jsx';
import ContactLinks from './ContactLinks.jsx';
import { MathText } from './MathText.jsx';
import ExerciseCard from './ExerciseCard.jsx';
import CanvasSimulator from '../simulator/CanvasSimulator.jsx';
import { Presenter } from './LessonStudio.jsx';
import { buildMission } from '../hooks/useMission.js';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { getClassDirectory, listTeacherClasses } from '../cloud/classCloud.js';
import {
  GROUP, MAX_BODY, cacheMessages, conversationOf, fetchMessages, getCachedMessages, getMyCloudId,
  getReadMarks, lessonPayload, markRead, mergeMessages, sendMessage, unreadCounts,
} from '../cloud/chatCloud.js';
import { getLessons } from '../utils/lessons.js';
import { exercises as catalogExercises, localizeCatalogItem } from '../data/catalogs.js';
import { getCustomExercises } from '../utils/customExercises.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { imageFileToDataUrl } from '../utils/imageData.js';
import { readJSON, writeJSON } from '../utils/storage.js';

const POLL_MS = 4000;
const TEACHER_CLASSES_KEY = 'guarania:teacherClassesCache';
const DIRECTORY_KEY = 'guarania:chatDirectory';

const formatTime = iso => {
  try { return new Date(iso).toLocaleString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

function ActivityDialog({ exercise, onClose, onResult, onAskHint, hintsUsed, onIncrementHint }) {
  const dialogRef = useRef(null);
  const [submission, setSubmission] = useState(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  const mission = useMemo(() => buildMission(exercise, 0, 1), [exercise]);
  return <dialog ref={dialogRef} className="activity-dialog" aria-label="Actividad de la clase" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="activity-dialog-head">
      <div><span className="panel-eyebrow">ACTIVIDAD DE TU DOCENTE</span><h2>Resolvé y comprobá con la simulación</h2></div>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
    </div>
    <div className="practice-workspace">
      <ExerciseCard
        exercise={exercise}
        onResult={onResult}
        onAskHint={onAskHint}
        onSimulationCheck={value => setSubmission(previous => ({ ...value, id: (previous?.id ?? 0) + 1 }))}
        onSimulationClear={() => setSubmission(null)}
        hintsUsed={hintsUsed}
        onIncrementHint={onIncrementHint}
      />
      <CanvasSimulator mission={mission} submission={submission} />
    </div>
  </dialog>;
}

function MessageContent({ message, onOpenLesson, onOpenActivity }) {
  const { kind, body, payload } = message;
  // La actividad viaja sin traducir; cada alumno la ve en su idioma.
  const { language } = useTranslation();
  const activity = kind === 'activity' && payload?.exercise ? localizeCatalogItem(payload.exercise, language) : null;
  return <>
    {kind === 'image' && (payload?.dataUrl
      ? <a href={payload.dataUrl} target="_blank" rel="noreferrer" className="chat-image-link"><img className="chat-image" src={payload.dataUrl} alt={body || 'Imagen enviada por el docente'} /></a>
      : <p className="chat-image-missing">Imagen (se ve con conexión)</p>)}
    {kind === 'lesson' && <div className="chat-attachment">
      <span className="panel-eyebrow">CLASE</span>
      <strong>{payload?.lesson?.title}</strong>
      <small>{payload?.lesson?.slides?.length ?? 0} {payload?.lesson?.slides?.length === 1 ? 'diapositiva' : 'diapositivas'}</small>
      <button type="button" className="btn btn-primary" onClick={() => onOpenLesson(payload)}>Abrir clase</button>
    </div>}
    {activity && <div className="chat-attachment">
      <span className="panel-eyebrow">ACTIVIDAD</span>
      <MathText as="strong" text={activity.question} />
      <button type="button" className="btn btn-primary" onClick={() => onOpenActivity(activity)}>Resolver actividad</button>
    </div>}
    {body && <MathText as="p" className="chat-text" text={body} />}
  </>;
}

function TeacherAttachments({ exercises, onSend, busy }) {
  const fileRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [lessonId, setLessonId] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [error, setError] = useState('');
  const lessons = useMemo(() => (mode === 'lesson' ? getLessons().filter(item => item.slides?.length) : []), [mode]);

  const send = async (message) => {
    setError('');
    try { await onSend(message); setMode(null); setLessonId(''); setExerciseId(''); }
    catch (failure) { setError(failure.message); }
  };
  const pickImage = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const dataUrl = await imageFileToDataUrl(file, { maxSize: 1280, maxChars: 600_000 });
      await send({ kind: 'image', payload: { dataUrl } });
    } catch (failure) { setError(failure.message); }
  };

  return <div className="chat-teacher-tools">
    <div className="chat-teacher-buttons">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage} />
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>🖼 Imagen</button>
      <button type="button" className="btn btn-secondary" aria-pressed={mode === 'lesson'} disabled={busy} onClick={() => setMode(mode === 'lesson' ? null : 'lesson')}>▤ Enviar clase</button>
      <button type="button" className="btn btn-secondary" aria-pressed={mode === 'activity'} disabled={busy} onClick={() => setMode(mode === 'activity' ? null : 'activity')}>✎ Enviar actividad</button>
    </div>
    {mode === 'lesson' && (lessons.length
      ? <div className="chat-teacher-picker">
        <label className="teacher-field">Clase de “Mis clases”<select className="quiz-input" value={lessonId} onChange={event => setLessonId(event.target.value)}>
          <option value="">Elegí una clase…</option>
          {lessons.map(item => <option key={item.id} value={item.id}>{item.title} ({item.slides.length} diapositivas)</option>)}
        </select></label>
        <button type="button" className="btn btn-primary" disabled={!lessonId || busy} onClick={() => {
          const lesson = lessons.find(item => item.id === lessonId);
          send({ kind: 'lesson', body: '', payload: lessonPayload(lesson, exercises) });
        }}>Enviar</button>
      </div>
      : <p className="field-help">Todavía no tenés clases con diapositivas. Creá una en Aula → Mis clases.</p>)}
    {mode === 'activity' && <div className="chat-teacher-picker">
      <label className="teacher-field">Ejercicio<select className="quiz-input" value={exerciseId} onChange={event => setExerciseId(event.target.value)}>
        <option value="">Elegí un ejercicio…</option>
        {exercises.map(item => <option key={item.id} value={item.id}>{item.custom ? '★ ' : ''}{item.question.slice(0, 90)}</option>)}
      </select></label>
      <button type="button" className="btn btn-primary" disabled={!exerciseId || busy} onClick={() => {
        const original = [...catalogExercises, ...getCustomExercises()].find(item => item.id === exerciseId);
        send({ kind: 'activity', body: '', payload: { exercise: original ?? exercises.find(item => item.id === exerciseId) } });
      }}>Enviar</button>
    </div>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}

export default function ClassChat({ user, classPackage, exercises, concepts, onExerciseResult, onAskHint, hintsUsed, onIncrementHint }) {
  const teacher = user.role === 'maestro';
  const cloud = isCloudConfigured();
  const [classes, setClasses] = useState(() => (teacher ? readJSON(TEACHER_CLASSES_KEY, []) : []));
  const [classId, setClassId] = useState(() => (teacher ? readJSON(TEACHER_CLASSES_KEY, [])[0]?.id ?? null : classPackage?.classId ?? null));
  const [myId, setMyId] = useState(null);
  const [directory, setDirectory] = useState(() => (classId ? readJSON(DIRECTORY_KEY, {})[classId] ?? [] : []));
  const [messages, setMessages] = useState(() => (classId ? getCachedMessages(classId) : []));
  const [conversation, setConversation] = useState(GROUP);
  const [showThread, setShowThread] = useState(false);
  const [marks, setMarks] = useState(() => (classId ? getReadMarks(classId) : {}));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [openLesson, setOpenLesson] = useState(null);
  const [openActivity, setOpenActivity] = useState(null);
  const lastIdRef = useRef(0);
  const threadRef = useRef(null);

  // Alumno: la clase es la que descargó. Docente: sus clases de la nube.
  useEffect(() => { if (!teacher) setClassId(classPackage?.classId ?? null); }, [teacher, classPackage?.classId]);
  useEffect(() => {
    if (!teacher || !cloud) return;
    listTeacherClasses().then(list => {
      const slim = list.map(({ id, title, code }) => ({ id, title, code }));
      writeJSON(TEACHER_CLASSES_KEY, slim);
      setClasses(slim);
      setClassId(current => (slim.some(item => item.id === current) ? current : slim[0]?.id ?? null));
    }).catch(() => {});
  }, [teacher, cloud]);
  useEffect(() => { if (cloud) getMyCloudId().then(setMyId).catch(() => {}); }, [cloud]);

  // Al cambiar de clase: mensajes y personas guardados, y se reinicia la lectura.
  useEffect(() => {
    const cached = classId ? getCachedMessages(classId) : [];
    setMessages(cached);
    lastIdRef.current = cached.at(-1)?.id ?? 0;
    setDirectory(classId ? readJSON(DIRECTORY_KEY, {})[classId] ?? [] : []);
    setMarks(classId ? getReadMarks(classId) : {});
    setConversation(GROUP); setShowThread(false);
  }, [classId]);

  const loadDirectory = useCallback(async () => {
    if (!classId) return;
    try {
      const list = await getClassDirectory(classId);
      setDirectory(list);
      writeJSON(DIRECTORY_KEY, { ...readJSON(DIRECTORY_KEY, {}), [classId]: list });
    } catch { /* sin conexión: queda la lista guardada */ }
  }, [classId]);

  const poll = useCallback(async () => {
    if (!classId || !cloud) return;
    try {
      const incoming = await fetchMessages(classId, lastIdRef.current);
      setStatus('');
      if (!incoming?.length) return;
      setMessages(current => {
        const merged = mergeMessages(current, incoming);
        lastIdRef.current = merged.at(-1)?.id ?? lastIdRef.current;
        cacheMessages(classId, merged);
        return merged;
      });
    } catch (failure) {
      setStatus(failure.offline ? 'Sin conexión: ves los últimos mensajes guardados.' : `No se pudieron cargar los mensajes: ${failure.message}`);
    }
  }, [classId, cloud]);

  useEffect(() => {
    if (!classId || !cloud) return undefined;
    loadDirectory(); poll();
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') poll(); }, POLL_MS);
    const directoryTimer = setInterval(loadDirectory, POLL_MS * 8);
    const online = () => { loadDirectory(); poll(); };
    window.addEventListener('online', online);
    return () => { clearInterval(timer); clearInterval(directoryTimer); window.removeEventListener('online', online); };
  }, [classId, cloud, poll, loadDirectory]);

  const people = useMemo(() => new Map(directory.map(person => [person.user_id, person])), [directory]);
  const others = useMemo(() => directory.filter(person => person.user_id !== myId)
    .sort((a, b) => (a.role === b.role ? a.display_name.localeCompare(b.display_name) : a.role === 'maestro' ? -1 : 1)), [directory, myId]);
  const thread = useMemo(() => messages.filter(message => conversationOf(message, myId) === conversation), [messages, myId, conversation]);
  const unread = useMemo(() => unreadCounts(messages, myId, marks), [messages, myId, marks]);
  const partner = conversation === GROUP ? null : people.get(conversation);
  const roleLabel = person => (person.role === 'maestro' ? 'Docente' : teacher ? 'Alumno/a' : 'Compañero/a de clase');

  useEffect(() => {
    const last = thread.at(-1)?.id;
    if (!classId || !last || !showThread) return;
    markRead(classId, conversation, last);
    setMarks(getReadMarks(classId));
  }, [thread, classId, conversation, showThread]);
  useEffect(() => { threadRef.current?.scrollTo?.({ top: threadRef.current.scrollHeight }); }, [thread.length, conversation, showThread]);

  const post = async ({ kind = 'text', body = '', payload = null }) => {
    setBusy(true); setError('');
    try {
      const saved = await sendMessage({ classId, recipientId: conversation === GROUP ? null : conversation, kind, body, payload });
      if (saved?.id) {
        setMessages(current => {
          const merged = mergeMessages(current, [saved]);
          lastIdRef.current = Math.max(lastIdRef.current, saved.id);
          cacheMessages(classId, merged);
          return merged;
        });
      }
    } catch (failure) {
      const message = failure.offline ? 'Sin conexión: el mensaje no se envió. Probá cuando vuelva internet.' : failure.message;
      setError(message);
      throw new Error(message);
    } finally { setBusy(false); }
  };
  const submitText = async event => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    try { await post({ body: text }); setText(''); } catch { /* el error ya se muestra */ }
  };
  const openConversation = key => { setConversation(key); setShowThread(true); setError(''); };

  if (!cloud) return <section className="card class-chat-empty">
    <h2>Mensajes de la clase</h2>
    <p>El chat necesita la nube configurada en esta instalación (ver <code>supabase/README.md</code>). Sin eso, cada dispositivo guarda solo sus propios datos.</p>
  </section>;

  if (!classId) return <section className="card class-chat-empty">
    <h2>Mensajes de la clase</h2>
    <p>{teacher
      ? 'Creá una clase en Aula → Compartir clase. Cuando tus alumnos se unan, podés escribirles acá.'
      : 'Uní tu cuenta a una clase en “Mi clase” con el código de tu docente para poder chatear con tu docente y tus compañeros.'}</p>
  </section>;

  const lessonExercises = openLesson ? [...exercises, ...(openLesson.exercises ?? [])] : exercises;
  const currentClass = teacher ? classes.find(item => item.id === classId) : { title: classPackage?.title, code: classPackage?.code };

  return <section className="card class-chat" data-view={showThread ? 'thread' : 'list'} aria-label="Mensajes de la clase">
    <aside className="class-chat-sidebar" aria-label="Conversaciones">
      {teacher && classes.length > 1
        ? <label className="teacher-field">Clase<select className="quiz-input" value={classId} onChange={event => setClassId(event.target.value)}>
          {classes.map(item => <option key={item.id} value={item.id}>{item.title} · {item.code}</option>)}
        </select></label>
        : <p className="class-chat-class"><strong>{currentClass?.title}</strong><span>Código {currentClass?.code}</span></p>}
      <ul className="class-chat-list">
        <li><button type="button" className={'class-chat-item' + (conversation === GROUP && showThread ? ' is-active' : '')} onClick={() => openConversation(GROUP)}>
          <span className="class-chat-group-icon" aria-hidden="true">👥</span>
          <span className="class-chat-name"><strong>Chat grupal</strong><small>Toda la clase</small></span>
          {unread[GROUP] > 0 && <span className="class-chat-badge" aria-label={`${unread[GROUP]} sin leer`}>{unread[GROUP]}</span>}
        </button></li>
        {others.map(person => <li key={person.user_id}><button type="button" className={'class-chat-item' + (conversation === person.user_id && showThread ? ' is-active' : '')} onClick={() => openConversation(person.user_id)}>
          <Avatar id={person.avatar} size={36} />
          <span className="class-chat-name"><strong>{person.display_name}</strong><small>{roleLabel(person)}</small></span>
          {unread[person.user_id] > 0 && <span className="class-chat-badge" aria-label={`${unread[person.user_id]} sin leer`}>{unread[person.user_id]}</span>}
        </button></li>)}
      </ul>
      {!others.length && <p className="field-help">{teacher ? 'Todavía no se unió ningún alumno a esta clase.' : 'Cargando las personas de tu clase…'}</p>}
      {status && <p className="field-help" role="status">{status}</p>}
    </aside>

    <div className="class-chat-thread">
      {!showThread
        ? <p className="class-chat-placeholder">Elegí el chat grupal o una persona para empezar a conversar.</p>
        : <>
          <header className="class-chat-thread-head">
            <button type="button" className="btn btn-secondary class-chat-back" onClick={() => setShowThread(false)}>← Volver</button>
            {partner ? <><Avatar id={partner.avatar} size={40} /><div><strong>{partner.display_name}</strong><small>{roleLabel(partner)}</small><ContactLinks person={partner} /></div></>
              : <div><strong>Chat grupal</strong><small>{others.length + 1} personas{teacher ? ' · podés enviar imágenes, clases y actividades' : ''}</small></div>}
          </header>
          <ol className="class-chat-messages" ref={threadRef} aria-live="polite">
            {!thread.length && <li className="class-chat-placeholder">Todavía no hay mensajes. ¡Escribí el primero!</li>}
            {thread.map(message => {
              const mine = message.sender_id === myId;
              const sender = people.get(message.sender_id);
              return <li key={message.id} className={'class-chat-message' + (mine ? ' is-mine' : '')}>
                {!mine && <Avatar id={sender?.avatar} size={30} />}
                <div className="class-chat-bubble">
                  {!mine && conversation === GROUP && <span className="class-chat-sender">{sender?.display_name ?? 'Alguien de la clase'}{sender?.role === 'maestro' ? ' · Docente' : ''}</span>}
                  <MessageContent message={message} onOpenLesson={setOpenLesson} onOpenActivity={setOpenActivity} />
                  <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                </div>
              </li>;
            })}
          </ol>
          {teacher && <TeacherAttachments exercises={exercises} busy={busy} onSend={post} />}
          <form className="class-chat-composer" onSubmit={submitText}>
            <input className="quiz-input" value={text} maxLength={MAX_BODY} onChange={event => setText(event.target.value)} aria-label={partner ? `Mensaje para ${partner.display_name}` : 'Mensaje para toda la clase'} placeholder={partner ? `Escribile a ${partner.display_name.split(' ')[0]}…` : 'Escribí a toda la clase…'} />
            <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>{busy ? 'Enviando…' : 'Enviar'}</button>
          </form>
          {error && <p className="field-error" role="alert">{error}</p>}
        </>}
    </div>

    {openLesson && <Presenter lesson={openLesson.lesson} exercises={lessonExercises} concepts={concepts} onExit={() => setOpenLesson(null)} />}
    {openActivity && <ActivityDialog exercise={openActivity} onClose={() => setOpenActivity(null)} onResult={onExerciseResult} onAskHint={onAskHint} hintsUsed={hintsUsed} onIncrementHint={onIncrementHint} />}
  </section>;
}
