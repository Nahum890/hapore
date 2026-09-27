import { useMemo, useState } from 'react';
import { exercises as exerciseCatalog, flashcards as cardCatalog, localizeCatalogItem } from '../data/catalogs.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { listTeacherClasses } from '../cloud/classCloud.js';
import { activityPayload, sendMessage } from '../cloud/chatCloud.js';
import { createCustomFlashcard, getCustomFlashcards } from '../utils/customFlashcards.js';
import { getCustomExercises } from '../utils/customExercises.js';
import { readJSON, writeJSON } from '../utils/storage.js';

const ACTIVITIES_KEY = 'guarania:teacherActivities';
const readActivities = () => {
  const stored = readJSON(ACTIVITIES_KEY, []);
  return Array.isArray(stored) ? stored : [];
};
const makeId = () => `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function ChoiceList({ items, selected, onToggle, title, search, onSearch, placeholder, renderItem }) {
  const visible = items.filter(item => renderItem(item).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <details className="teacher-activity-picker" open>
    <summary>{title}<span>{selected.length}</span></summary>
    <label className="teacher-field teacher-activity-search"><span className="sr-only">{placeholder}</span>
      <input className="quiz-input" type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder={placeholder} />
    </label>
    <ul className="teacher-activity-options">
      {visible.map(item => <li key={item.id}><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span>{renderItem(item)}</span></label></li>)}
      {!visible.length && <li className="field-help">—</li>}
    </ul>
  </details>;
}

function NewCardForm({ onCreated }) {
  const { t } = useTranslation();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [error, setError] = useState('');
  const save = () => {
    try {
      const card = createCustomFlashcard({ front, back });
      setFront(''); setBack(''); setError(''); onCreated(card);
    } catch (failure) { setError(failure.message); }
  };
  return <details className="teacher-activity-new-card">
    <summary>{t('teacher.activityNewCard')}</summary>
    <label className="teacher-field">{t('teacher.front')}<input className="quiz-input" value={front} onChange={event => setFront(event.target.value)} maxLength={300} /></label>
    <label className="teacher-field">{t('teacher.back')}<textarea className="quiz-input" rows="2" value={back} onChange={event => setBack(event.target.value)} maxLength={600} /></label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <button type="button" className="btn btn-secondary" onClick={save}>{t('teacher.saveCard')}</button>
  </details>;
}

export default function TeacherActivityStudio({ exercises = exerciseCatalog }) {
  const { t, language } = useTranslation();
  const [customCards, setCustomCards] = useState(getCustomFlashcards);
  const cards = useMemo(() => [...cardCatalog, ...customCards], [customCards]);
  const allExercises = useMemo(() => [...exerciseCatalog, ...exercises.filter(item => item.custom)], [exercises]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [activities, setActivities] = useState(readActivities);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [openSendId, setOpenSendId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const toggle = (setter, id) => setter(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const saveActivity = event => {
    event.preventDefault();
    if (!title.trim() || !selectedCards.length || !selectedExercises.length) return;
    const activity = {
      id: makeId(), title: title.trim().slice(0, 80), description: description.trim().slice(0, 500),
      cards: cards.filter(item => selectedCards.includes(item.id)),
      exercises: allExercises.filter(item => selectedExercises.includes(item.id)),
      createdAt: new Date().toISOString(),
    };
    const next = [activity, ...activities];
    writeJSON(ACTIVITIES_KEY, next);
    setActivities(next); setTitle(''); setDescription(''); setSelectedCards([]); setSelectedExercises([]);
    setStatus(t('teacher.activitySaved', { title: activity.title })); setError('');
  };

  const loadGroups = async activity => {
    setError(''); setStatus('');
    if (!isCloudConfigured()) { setGroups([]); setError(t('teacher.activityNeedsCloud')); return; }
    setBusyId(activity.id);
    try {
      const fetched = await listTeacherClasses();
      setGroups(fetched);
      setGroupId(current => fetched.some(group => group.id === current) ? current : fetched[0]?.id ?? '');
    } catch (failure) { setError(t('teacher.activitySendError', { msg: failure.message })); }
    finally { setBusyId(null); }
  };

  const openSend = async activity => {
    if (openSendId === activity.id) { setOpenSendId(null); return; }
    setOpenSendId(activity.id);
    await loadGroups(activity);
  };

  const sendToGroup = async activity => {
    if (!groupId || busyId) return;
    setBusyId(activity.id); setError(''); setStatus('');
    try {
      await sendMessage({ classId: groupId, kind: 'activity', payload: activityPayload(activity) });
      setStatus(t('teacher.activitySent', { title: activity.title, group: groups.find(group => group.id === groupId)?.title ?? '' }));
    } catch (failure) { setError(t('teacher.activitySendError', { msg: failure.message })); }
    finally { setBusyId(null); }
  };

  const removeActivity = id => {
    const next = activities.filter(activity => activity.id !== id);
    writeJSON(ACTIVITIES_KEY, next); setActivities(next);
    if (openSendId === id) setOpenSendId(null);
  };
  const cardName = item => `${localizeCatalogItem(item, language).frente_es ?? localizeCatalogItem(item, language).front ?? ''}${item.custom ? ` · ${t('teacher.own')}` : ''}`;
  const exerciseName = item => `${localizeCatalogItem(item, language).question ?? ''}${item.custom ? ` · ${t('teacher.own')}` : ''}`;
  const allCardsSelected = selectedCards.length === cards.length && cards.length > 0;
  const allExercisesSelected = selectedExercises.length === allExercises.length && allExercises.length > 0;

  return <section className="card teacher-tool-panel teacher-activity-studio" aria-labelledby="teacher-activity-title">
    <span className="panel-eyebrow">{t('teacher.activityEyebrow')}</span>
    <h2 id="teacher-activity-title">{t('teacher.activityTitle')}</h2>
    <p className="teacher-note">{t('teacher.activityLead')}</p>
    <form className="teacher-activity-form" onSubmit={saveActivity}>
      <label className="teacher-field">{t('teacher.activityName')}<input className="quiz-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={80} /></label>
      <label className="teacher-field">{t('teacher.activityDescription')}<textarea className="quiz-input" rows="2" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} /></label>
      <div className="teacher-activity-section-head"><h3>{t('teacher.activityCards', { n: selectedCards.length })}</h3><button type="button" className="btn btn-text" onClick={() => setSelectedCards(allCardsSelected ? [] : cards.map(item => item.id))}>{t(allCardsSelected ? 'teacher.none' : 'teacher.all')}</button></div>
      <ChoiceList items={cards} selected={selectedCards} onToggle={id => toggle(setSelectedCards, id)} title={t('teacher.activityCatalogCards')} search={cardSearch} onSearch={setCardSearch} placeholder={t('teacher.activitySearchCards')} renderItem={cardName} />
      <NewCardForm onCreated={card => { setCustomCards(getCustomFlashcards()); setSelectedCards(current => [...current, card.id]); }} />
      <div className="teacher-activity-section-head"><h3>{t('teacher.activityExercises', { n: selectedExercises.length })}</h3><button type="button" className="btn btn-text" onClick={() => setSelectedExercises(allExercisesSelected ? [] : allExercises.map(item => item.id))}>{t(allExercisesSelected ? 'teacher.none' : 'teacher.all')}</button></div>
      <ChoiceList items={allExercises} selected={selectedExercises} onToggle={id => toggle(setSelectedExercises, id)} title={t('teacher.activityCatalogExercises')} search={exerciseSearch} onSearch={setExerciseSearch} placeholder={t('teacher.activitySearchExercises')} renderItem={exerciseName} />
      <p className="field-help">{t('teacher.activitySelectionHint')}</p>
      <button type="submit" className="btn btn-primary" disabled={!title.trim() || !selectedCards.length || !selectedExercises.length}>{t('teacher.activitySave')}</button>
    </form>
    {error && <p className="field-error" role="alert">{error}</p>}
    {status && <p className="teacher-share-status" role="status">{status}</p>}

    <section className="teacher-saved-activities" aria-label={t('teacher.activitySavedList')}>
      <h3>{t('teacher.activitySavedList')}</h3>
      {!activities.length && <p className="field-help">{t('teacher.activityEmpty')}</p>}
      <ul className="teacher-activity-list">{activities.map(activity => <li key={activity.id}>
        <div><strong>{activity.title}</strong><small>{t('teacher.activityCounts', { cards: activity.cards.length, exercises: activity.exercises.length })}</small>{activity.description && <p>{activity.description}</p>}</div>
        <div className="teacher-activity-actions">
          <button type="button" className="btn btn-primary" onClick={() => openSend(activity)} disabled={busyId === activity.id}>{t('teacher.activitySendToGroup')}</button>
          {confirmDeleteId === activity.id
            ? <><button type="button" className="btn btn-danger" onClick={() => { removeActivity(activity.id); setConfirmDeleteId(null); }}>{t('teacher.activityConfirmDelete')}</button><button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</button></>
            : <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(activity.id)}>{t('teacher.activityDelete')}</button>}
        </div>
        {openSendId === activity.id && <div className="lesson-share-panel">
          {!isCloudConfigured() ? <p className="field-help">{t('teacher.activityNeedsCloud')}</p> : busyId === activity.id ? <p role="status">{t('common.loading')}</p> : groups.length === 0
            ? <><p className="field-help">{t('teacher.activityNoGroups')}</p><button type="button" className="btn btn-secondary" onClick={() => loadGroups(activity)} disabled={busyId === activity.id}>{t('teacher.lessonShareRefresh')}</button></>
            : <div className="lesson-share-controls"><label className="teacher-field">{t('teacher.activityChooseGroup')}
              <select className="quiz-input" value={groupId} onChange={event => setGroupId(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{group.title} · {group.code}</option>)}</select>
            </label><button type="button" className="btn btn-primary" onClick={() => sendToGroup(activity)} disabled={!groupId || busyId === activity.id}>{t('teacher.activitySend')}</button></div>}
        </div>}
      </li>)}</ul>
    </section>
  </section>;
}
