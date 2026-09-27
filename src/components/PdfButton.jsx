import { useMemo, useRef, useState } from 'react';
import { decodeClassConfig, selectClassExercises } from '../utils/classCode.js';
import { readJSON, writeJSON } from '../utils/storage.js';
import { exercises } from '../data/catalogs.js';
import { DEFAULT_PDF_OPTIONS, PDF_THEMES, selectPdfExercises } from '../pdf/pdfOptions.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import './PdfButton.css';

const OPTIONS_KEY = 'guarania:pdfOptions';

export async function createStudyPdf(options) {
  const { createStudyPdf: generate } = await import('../pdf/createStudyPdf.js');
  return generate(options);
}

const rgb = color => `rgb(${color.join(',')})`;

// Ficha PDF personalizable: encabezado, color, qué ejercicios, espacio para
// resolver y qué secciones incluir. Las opciones se recuerdan.
export default function PdfButton() {
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(() => ({ ...DEFAULT_PDF_OPTIONS, ...(readJSON(OPTIONS_KEY, {}) ?? {}) }));
  const [pdfLanguage, setPdfLanguage] = useState(language);
  const [generating, setGenerating] = useState(false), [status, setStatus] = useState('');
  const lock = useRef(false);
  const config = useMemo(() => decodeClassConfig(readJSON('guarania:classCode', null)), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const available = useMemo(() => (config ? selectClassExercises(exercises, config) : exercises), [config]);
  const count = selectPdfExercises(available, options).length;

  const set = patch => setOptions(current => {
    const next = { ...current, ...patch };
    writeJSON(OPTIONS_KEY, next);
    return next;
  });
  const download = async () => {
    if (lock.current || !count) return;
    lock.current = true; setGenerating(true); setStatus('');
    try {
      const { downloadStudyPdf } = await import('../pdf/createStudyPdf.js');
      await downloadStudyPdf({ config, language: pdfLanguage, options });
      setStatus(t('pdf.downloaded'));
    } catch { setStatus(t('pdf.error')); }
    finally { lock.current = false; setGenerating(false); }
  };
  const toggles = ['includeInstructions', 'includeAssumptions', 'includeFormulas', 'includeGraphs', 'includeAnswers', 'includeReferences'];

  return <div className="pdf-button">
    <button type="button" className="btn btn-light" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="pdf-options-panel">
      {t('pdf.button')} {open ? '▴' : '▾'}
    </button>
    {open && <section id="pdf-options-panel" className="pdf-panel" aria-label={t('pdfo.title')} style={{ '--pdf-main': rgb(PDF_THEMES[options.theme].main), '--pdf-soft': rgb(PDF_THEMES[options.theme].soft), '--pdf-dark': rgb(PDF_THEMES[options.theme].dark) }}>
      <header className="pdf-panel-head">
        <div className="pdf-preview" aria-hidden="true">
          <div className="pdf-preview-band"><strong>{options.title.trim() || t('pdf.title')}</strong><small>{[options.teacher, options.course].filter(Boolean).join(' · ') || 'PyFis IA'}</small><svg viewBox="0 0 60 24"><path d="M2 22 Q30 -8 58 22" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
          <div className="pdf-preview-card"><i>1</i><span /><span /><em className={`is-${options.workArea}`} /></div>
          <div className="pdf-preview-card"><i>2</i><span /><span /><em className={`is-${options.workArea}`} /></div>
        </div>
        <div><h3>{t('pdfo.title')}</h3><p>{t('pdfo.lead')}</p></div>
      </header>

      <fieldset className="pdf-group">
        <legend>{t('pdfo.header')}</legend>
        <div className="pdf-grid">
          <label>{t('pdfo.sheetTitle')}<input className="quiz-input" value={options.title} maxLength={70} placeholder={t('pdf.title')} onChange={event => set({ title: event.target.value })} /></label>
          <label>{t('pdfo.teacher')}<input className="quiz-input" value={options.teacher} maxLength={60} onChange={event => set({ teacher: event.target.value })} /></label>
          <label>{t('pdfo.school')}<input className="quiz-input" value={options.school} maxLength={70} onChange={event => set({ school: event.target.value })} /></label>
          <label>{t('pdfo.course')}<input className="quiz-input" value={options.course} maxLength={30} placeholder="3.º A" onChange={event => set({ course: event.target.value })} /></label>
        </div>
      </fieldset>

      <fieldset className="pdf-group">
        <legend>{t('pdfo.design')}</legend>
        <div className="pdf-swatches" role="radiogroup" aria-label={t('pdfo.color')}>
          {Object.entries(PDF_THEMES).map(([id, theme]) => <button key={id} type="button" role="radio" aria-checked={options.theme === id} className={options.theme === id ? 'is-active' : ''} style={{ background: rgb(theme.main) }} title={t(`pdfo.theme.${id}`)} aria-label={t(`pdfo.theme.${id}`)} onClick={() => set({ theme: id })} />)}
        </div>
        <div className="pdf-segment" role="radiogroup" aria-label={t('pdfo.workArea')}>
          <span>{t('pdfo.workArea')}</span>
          {['lines', 'grid', 'none'].map(item => <button key={item} type="button" role="radio" aria-checked={options.workArea === item} className={options.workArea === item ? 'is-active' : ''} onClick={() => set({ workArea: item })}>{t(`pdfo.work.${item}`)}</button>)}
        </div>
      </fieldset>

      <fieldset className="pdf-group">
        <legend>{t('pdfo.content')}</legend>
        <div className="pdf-grid">
          <label>{t('custom.difficulty')}<select className="quiz-input" value={options.difficulty} onChange={event => set({ difficulty: event.target.value })}>
            <option value="all">{t('pdfo.all')}</option>
            <option value="básico">{t('custom.basic')}</option><option value="intermedio">{t('custom.intermediate')}</option><option value="avanzado">{t('custom.advanced')}</option>
          </select></label>
          <label>{t('custom.scenario')}<select className="quiz-input" value={options.scenario} onChange={event => set({ scenario: event.target.value })}>
            <option value="all">{t('pdfo.all')}</option>
            {['dron', 'basketball', 'wall'].map(id => <option key={id} value={id}>{t(`scenario.${id}`)}</option>)}
          </select></label>
          <label>{t('pdfo.max')}<select className="quiz-input" value={options.maxExercises} onChange={event => set({ maxExercises: Number(event.target.value) })}>
            <option value={0}>{t('pdfo.all')}</option>{[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select></label>
          <label>{t('pdfo.language')}<select className="quiz-input" value={pdfLanguage} onChange={event => setPdfLanguage(event.target.value)}>
            <option value="gn-jopara">Jopara</option><option value="es">Español</option>
          </select></label>
        </div>
        <label className="pdf-check"><input type="checkbox" checked={options.shuffle} onChange={event => set({ shuffle: event.target.checked })} />{t('pdfo.shuffle')}</label>
      </fieldset>

      <fieldset className="pdf-group">
        <legend>{t('pdfo.sections')}</legend>
        <div className="pdf-checks">
          {toggles.map(key => <label key={key} className="pdf-check"><input type="checkbox" checked={options[key]} onChange={event => set({ [key]: event.target.checked })} />{t(`pdfo.${key}`)}</label>)}
        </div>
      </fieldset>

      <footer className="pdf-panel-foot">
        <span className={count ? 'pdf-count' : 'pdf-count is-empty'}>{count ? t('pdfo.count', { n: count }) : t('pdfo.none')}</span>
        <button type="button" className="btn btn-secondary" onClick={() => { setOptions({ ...DEFAULT_PDF_OPTIONS }); writeJSON(OPTIONS_KEY, DEFAULT_PDF_OPTIONS); }}>{t('pdfo.reset')}</button>
        <button type="button" className="btn btn-primary" onClick={download} disabled={generating || !count} aria-busy={generating}>{generating ? t('pdf.generating') : t('pdfo.download')}</button>
      </footer>
      {status && <p className="pdf-status" role="status" onClick={() => setStatus('')}>{status}</p>}
    </section>}
  </div>;
}
