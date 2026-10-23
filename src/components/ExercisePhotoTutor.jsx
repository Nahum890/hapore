import { useEffect, useState, useSyncExternalStore } from 'react';
import { getOnlineConsent, hasOnlineConsent, subscribeOnlineConsent } from '../ai/onlineConsent.js';
import { recordTutorQuery } from '../ai/tutorQuota.js';
import { getCloudSession, isCloudConfigured } from '../cloud/cloudClient.js';

const MAX_IMAGE_BYTES = 1_500_000;
const MAX_DATA_URL_LENGTH = 2_000_000;
const onlineConsentEnabled = () => getOnlineConsent() === 'online';

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('No se pudo preparar la foto.'));
    reader.readAsDataURL(blob);
  });
}

async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('El navegador no pudo abrir esta imagen. Probá con JPG o PNG.'));
      element.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la foto en este navegador.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('No se pudo convertir la foto.');
    if (blob.size > MAX_IMAGE_BYTES) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.62));
    if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error('La foto sigue siendo muy pesada. Probá recortarla y volver a cargarla.');
    const data = await readDataUrl(blob);
    if (!data || data.length > MAX_DATA_URL_LENGTH) throw new Error('La foto supera el tamaño permitido.');
    return { data, mimeType: 'image/jpeg' };
  } finally { URL.revokeObjectURL(url); }
}

function parseAnalysis(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('PyFis no pudo devolver una lectura ordenada. Probá con una foto más nítida.');
  let result;
  try { result = JSON.parse(text.slice(start, end + 1)); }
  catch { throw new Error('No se pudo interpretar la lectura. Probá con una foto más nítida.'); }
  if (!result || typeof result.statement !== 'string' || !result.statement.trim()) throw new Error('No encontré un enunciado legible en la foto.');
  const values = Array.isArray(result.values) ? result.values.slice(0, 8).map(item => `${String(item?.name ?? 'Dato').slice(0, 30)}: ${String(item?.value ?? '').slice(0, 20)} ${String(item?.unit ?? '').slice(0, 15)}`.trim()) : [];
  return { statement: result.statement.slice(0, 850), values, writtenSteps: String(result.writtenSteps ?? '').slice(0, 850), uncertainties: Array.isArray(result.uncertainties) ? result.uncertainties.slice(0, 4).map(item => String(item).slice(0, 80)) : [] };
}

export default function ExercisePhotoTutor({ quiz, language, onBusyChange }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [phase, setPhase] = useState('idle');
  const [statement, setStatement] = useState('');
  const [valuesText, setValuesText] = useState('');
  const [writtenSteps, setWrittenSteps] = useState('');
  const [uncertainties, setUncertainties] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onlineAllowed = useSyncExternalStore(subscribeOnlineConsent, onlineConsentEnabled, () => false);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  const analyze = async () => {
    if (!file || busy) return;
    if (!hasOnlineConsent()) { setError('Para leer la foto, primero habilitá Gemini online en el aviso de privacidad.'); return; }
    if (navigator.onLine === false) { setError('La lectura de fotos necesita conexión. Podés transcribir el enunciado en Chat libre.'); return; }
    if (quiz.charlaLeft < 2) { setError('Para leer la foto y empezar la guía necesitás al menos 2 consultas disponibles.'); return; }
    setBusy(true); setError(''); setPhase('reading');
    try {
      const image = await prepareImage(file);
      const headers = { 'Content-Type': 'application/json' };
      if (isCloudConfigured()) {
        const session = await getCloudSession();
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
      }
      const response = await fetch('/api/chat', { method: 'POST', headers, body: JSON.stringify({ action: 'analyze-exercise-image', language, image }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo leer la foto. Revisá la conexión e intentá otra vez.');
      recordTutorQuery();
      const extracted = parseAnalysis(payload.text ?? '');
      setStatement(extracted.statement); setValuesText(extracted.values.join('\n'));
      setWrittenSteps(extracted.writtenSteps); setUncertainties(extracted.uncertainties);
      setPhase('review'); setConfirmed(false);
    } catch (failure) { setPhase('error'); setError(failure.message || 'No se pudo analizar la foto.'); }
    finally { setBusy(false); }
  };

  const continueWithTutor = async () => {
    if (!confirmed || !statement.trim() || busy || quiz.charlaLeft <= 0) return;
    const languageName = language === 'es' ? 'español' : 'Jopara mezclado con español';
    const prompt = [
      'El estudiante fotografió y confirmó este ejercicio de movimiento parabólico.',
      `Enunciado confirmado: ${statement.trim()}`,
      valuesText.trim() ? `Datos y unidades confirmados:\n${valuesText.trim()}` : 'No se identificaron valores numéricos legibles; preguntá al estudiante si falta algún dato.',
      writtenSteps.trim() ? `Pasos que el estudiante escribió:\n${writtenSteps.trim()}` : 'La foto no muestra pasos de resolución escritos.',
      uncertainties.length ? `Partes que conviene volver a confirmar: ${uncertainties.join('; ')}` : '',
      'Guialo con método socrático: comienza preguntando qué magnitud busca o cómo conectaría los datos. Si hay pasos escritos, señala el primer paso que revisarías con una pregunta y una pista gradual. No reveles la resolución completa hasta que el estudiante la pida o complete los pasos. No inventes datos. Respondé en ' + languageName + '.',
    ].filter(Boolean).join('\n\n');
    setBusy(true); setError('');
    try { await quiz.askFreeQuestion({ message: prompt, interaction: 'photo-socratic' }); setPhase('sent'); }
    catch (failure) { setError(failure.message || 'No se pudo abrir la guía en el chat.'); }
    finally { setBusy(false); }
  };

  return <details className="exercise-photo-tutor">
    <summary>Fotografiar un ejercicio del cuaderno</summary>
    <div className="exercise-photo-body">
      <p>PyFis extraerá el enunciado, los datos, las unidades y los pasos visibles. La foto se envía a Gemini solo si habilitaste el tutor online; revisá la lectura antes de continuar. La imagen no se guarda, pero el texto confirmado queda en el historial local. La lectura y la respuesta del tutor consumen una consulta cada una.</p>
      <label className="exercise-photo-file">Elegir o fotografiar<input type="file" accept="image/*" capture="environment" onChange={event => { setFile(event.target.files?.[0] ?? null); event.currentTarget.value = ''; setPhase('idle'); setError(''); setConfirmed(false); }} disabled={busy} /></label>
      {preview && <img className="exercise-photo-preview" src={preview} alt="Vista previa de la foto seleccionada" />}
      {!onlineAllowed && <p className="exercise-photo-note">Gemini online no está habilitado en esta pestaña. Podés cambiar esa opción en el aviso de privacidad o escribir el enunciado en el chat.</p>}
      {phase !== 'review' && phase !== 'sent' && quiz.charlaLeft < 2 && <p className="exercise-photo-note">Necesitás al menos 2 consultas disponibles para leer la foto y empezar la guía.</p>}
      {phase === 'review' && quiz.charlaLeft <= 0 && <p className="exercise-photo-note">Se agotó el límite diario. La lectura queda disponible para revisar, pero el tutor no puede responder hoy.</p>}
      {file && phase !== 'review' && phase !== 'sent' && <button type="button" className="btn btn-primary" onClick={analyze} disabled={busy || !onlineAllowed || quiz.charlaLeft < 2}>{busy ? 'PyFis está leyendo la foto…' : 'Leer foto con PyFis'}</button>}
      {phase === 'reading' && <p role="status" className="exercise-photo-note">PyFis está leyendo el enunciado y las unidades…</p>}
      {phase === 'review' && <div className="exercise-photo-review">
        <label>Enunciado extraído<textarea rows="4" maxLength={850} value={statement} onChange={event => setStatement(event.target.value)} /></label>
        <label>Datos y unidades extraídos<textarea rows="3" maxLength={600} value={valuesText} onChange={event => setValuesText(event.target.value)} placeholder="No se detectaron valores legibles" /></label>
        <label>Pasos escritos en el cuaderno<textarea rows="3" maxLength={850} value={writtenSteps} onChange={event => setWrittenSteps(event.target.value)} placeholder="No se detectaron pasos escritos" /></label>
        {uncertainties.length > 0 && <p className="exercise-photo-note"><strong>Revisá estas partes:</strong> {uncertainties.join(' · ')}</p>}
        <label className="exercise-photo-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo que corregí y revisé la lectura del enunciado y los datos.</label>
        <div className="exercise-photo-actions"><button type="button" className="btn btn-primary" onClick={continueWithTutor} disabled={!confirmed || !statement.trim() || busy || quiz.charlaLeft <= 0}>{busy ? 'Abriendo guía…' : 'Confirmar y empezar la guía'}</button><button type="button" className="btn btn-secondary" onClick={() => { setPhase('idle'); setConfirmed(false); }} disabled={busy}>Volver a elegir foto</button></div>
      </div>}
      {phase === 'sent' && <p role="status" className="exercise-photo-note">Lectura confirmada. PyFis ya abrió una guía socrática en el chat; podés responder ahí paso a paso.</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  </details>;
}
