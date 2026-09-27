import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClassMeeting, deleteClassMeeting, listClassMeetings } from '../cloud/classMeetings.js';
import { listTeacherClasses } from '../cloud/classCloud.js';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

function defaultStartTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  return new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function localDateTime(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-PY' : 'gn-PY', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function TeacherMeetings() {
  const { t, language } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [classId, setClassId] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStartTime);
  const [meetUrl, setMeetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadGroups = useCallback(async () => {
    if (!isCloudConfigured()) return;
    setLoading(true); setError('');
    try {
      const found = await listTeacherClasses();
      setGroups(found);
      setClassId(current => found.some(group => group.id === current) ? current : found[0]?.id ?? '');
    } catch (failure) { setError(failure.offline ? 'offline' : 'load'); }
    finally { setLoading(false); }
  }, []);

  const loadMeetings = useCallback(async id => {
    if (!id) { setMeetings([]); return; }
    try { setMeetings(await listClassMeetings(id)); }
    catch { setError('loadMeetings'); }
  }, []);

  useEffect(() => {
    loadGroups();
    window.addEventListener('online', loadGroups);
    window.addEventListener('teacher-classes-changed', loadGroups);
    return () => {
      window.removeEventListener('online', loadGroups);
      window.removeEventListener('teacher-classes-changed', loadGroups);
    };
  }, [loadGroups]);
  useEffect(() => { loadMeetings(classId); }, [classId, loadMeetings]);

  const localizedError = useMemo(() => ({
    MEETING_CLASS_REQUIRED: 'meetings.errorClass', MEETING_TITLE_INVALID: 'meetings.errorTitle',
    MEETING_DESCRIPTION_INVALID: 'meetings.errorDescription', MEETING_TIME_INVALID: 'meetings.errorTime',
    MEETING_URL_INVALID: 'meetings.errorUrl', MEETING_SAVE_FAILED: 'meetings.errorSave',
  }), []);

  const submit = async event => {
    event.preventDefault();
    if (!classId || saving) return;
    setSaving(true); setError(''); setStatus('');
    try {
      await createClassMeeting({ classId, title, description, startsAt, meetUrl });
      setStatus('meetings.created'); setTitle(''); setDescription(''); setMeetUrl(''); setStartsAt(defaultStartTime());
      await loadMeetings(classId);
    } catch (failure) { setError(localizedError[failure.message] ?? (failure.offline ? 'meetings.errorOffline' : 'meetings.errorSave')); }
    finally { setSaving(false); }
  };

  const cancelMeeting = async meetingId => {
    setError(''); setStatus('');
    try { await deleteClassMeeting(meetingId); setStatus('meetings.cancelled'); await loadMeetings(classId); }
    catch (failure) { setError(failure.offline ? 'meetings.errorOffline' : 'meetings.errorSave'); }
  };

  if (!isCloudConfigured()) return <section className="card teacher-tool-panel"><h2>{t('meetings.title')}</h2><p className="field-help">{t('meetings.cloudRequired')}</p></section>;

  return <section className="card teacher-tool-panel teacher-meetings" aria-label={t('meetings.title')}>
    <span className="panel-eyebrow">{t('meetings.eyebrow')}</span>
    <div className="teacher-meetings-heading"><div><h2>{t('meetings.title')}</h2><p className="teacher-note">{t('meetings.lead')}</p></div><button type="button" className="btn btn-secondary" onClick={() => { loadGroups(); loadMeetings(classId); }} disabled={loading}>{t(loading ? 'teacher.refreshing' : 'teacher.refresh')}</button></div>
    <label className="teacher-field">{t('meetings.group')}<select className="quiz-input" value={classId} onChange={event => setClassId(event.target.value)} disabled={loading || groups.length === 0}>
      {!groups.length && <option value="">{loading ? t('common.loading') : t('teacher.noClasses')}</option>}
      {groups.map(group => <option key={group.id} value={group.id}>{group.title} · {group.code}</option>)}
    </select></label>
    {error && <p className="field-error" role="alert">{error === 'offline' ? t('meetings.errorOffline') : error === 'load' || error === 'loadMeetings' ? t('meetings.errorLoad') : t(error)}</p>}
    {groups.length > 0 ? <form className="meeting-form" onSubmit={submit}>
      <label className="teacher-field">{t('meetings.name')}<input className="quiz-input" required minLength={3} maxLength={100} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="teacher-field">{t('meetings.date')}<input className="quiz-input" type="datetime-local" required min={defaultStartTime()} value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label>
      <label className="teacher-field">{t('meetings.link')}<input className="quiz-input" type="url" required placeholder="https://meet.google.com/xxx-yyyy-zzz" value={meetUrl} onChange={event => setMeetUrl(event.target.value)} /></label>
      <label className="teacher-field">{t('meetings.description')}<textarea className="quiz-input" rows={2} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label>
      {status && <p className="field-help" role="status">{t(status)}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving || !classId}>{t(saving ? 'meetings.sending' : 'meetings.schedule')}</button>
      <p className="field-help">{t('meetings.linkHelp')}</p>
    </form> : <p className="field-help">{t('meetings.createGroupFirst')} <button type="button" className="btn btn-text" onClick={loadGroups}>{t('teacher.refresh')}</button></p>}
    <div className="meeting-list"><h3>{t('meetings.upcoming')}</h3>
      {meetings.length ? meetings.map(meeting => <article className="meeting-card" key={meeting.id}>
        <div><strong>{meeting.title}</strong><time dateTime={meeting.starts_at}>{localDateTime(meeting.starts_at, language)}</time>{meeting.description && <p>{meeting.description}</p>}</div>
        <div className="meeting-card-actions"><a className="btn btn-secondary" href={meeting.meet_url} target="_blank" rel="noreferrer">{t('meetings.open')}</a><button type="button" className="btn btn-text" onClick={() => cancelMeeting(meeting.id)}>{t('meetings.cancel')}</button></div>
      </article>) : <p className="field-help">{t('meetings.empty')}</p>}
    </div>
  </section>;
}
