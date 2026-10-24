// Ventana con las fuentes del MEC: documentos analizados (con páginas y
// SHA-256), resoluciones y otras normas citadas, y la competencia del área.
import { useEffect, useRef } from 'react';
import { SOURCES, NORMATIVE, COMPETENCIES, FORMULA_NOTE } from '../../curriculum/sources.js';
import { pickLang } from '../../curriculum/topics/index.js';
import { useTranslation } from '../../i18n/LanguageProvider.jsx';

export default function MecSources({ open, onClose }) {
  const { t, language } = useTranslation();
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const resolutions = NORMATIVE.filter(item => item.type === 'resolucion');
  const others = NORMATIVE.filter(item => item.type !== 'resolucion');
  return <div className="mec-backdrop" role="presentation" onClick={onClose}>
    <section className="mec-dialog" role="dialog" aria-modal="true" aria-labelledby="mec-title" tabIndex={-1} ref={dialogRef} onClick={event => event.stopPropagation()}>
      <header className="mec-head">
        <h2 id="mec-title">{t('mec.title')}</h2>
        <button type="button" className="mec-close" onClick={onClose} aria-label={t('mec.close')}>×</button>
      </header>
      <p className="mec-lead">{t('mec.lead')}</p>
      <h3>{t('mec.docs')}</h3>
      <ol className="mec-docs">
        {Object.values(SOURCES).map(source => <li key={source.id}>
          <span className="mec-doc-letter">{source.id}</span>
          <div>
            <strong>{source.title}</strong>
            {source.resolution && <p className="mec-resolution">{source.resolution}</p>}
            <p>{pickLang(source.role, language)}</p>
            <ul className="mec-pages">{Object.values(source.sections).map(text => <li key={text}>{text}</li>)}</ul>
            {source.note && <p className="mec-note">{source.note}</p>}
            <details><summary>{t('mec.file')}</summary><p className="mec-file">{source.file} · {source.pagesTotal} pp. · SHA-256 {source.sha256}</p></details>
          </div>
        </li>)}
      </ol>
      <h3>{t('mec.resolutions')}</h3>
      <ul className="mec-norms">{resolutions.map(item => <li key={item.number}><strong>{item.number}</strong> — {item.name}. {item.role} <small>({t('mec.pages')}: {item.source} {item.pages})</small></li>)}</ul>
      <details className="mec-others"><summary>{t('mec.otherNorms')}</summary><ul className="mec-norms">{others.map(item => <li key={item.number}><strong>{item.number}</strong> — {item.name}</li>)}</ul></details>
      <h3>{t('mec.competency')}</h3>
      <blockquote className="mec-quote">“{COMPETENCIES.comun.text}” <small>(Plan Común, doc. A, {COMPETENCIES.comun.pages})</small></blockquote>
      <blockquote className="mec-quote">“{COMPETENCIES.especifico.text}” <small>(Plan Específico, doc. A, {COMPETENCIES.especifico.pages})</small></blockquote>
      <p className="mec-note">{pickLang(FORMULA_NOTE, language)}</p>
      {/* Antes estaba en el botón flotante "MEC Res. 12506"; la atribución de
          OpenStax es obligatoria por su licencia CC BY 4.0. */}
      <h3>{t('mec.references')}</h3>
      <ul className="mec-norms">
        <li><strong>MEC Paraguay</strong> — <a href="https://www.mec.gov.py/cms_v2/adjuntos/6838" target="_blank" rel="noreferrer">{t('curriculum.mecLink')}</a></li>
        <li><strong>OpenStax, Rice University</strong> — <em>College Physics 2e</em> & <em>Physics</em>. {t('curriculum.license')} Creative Commons Attribution 4.0 International (CC BY 4.0). <a href="https://openstax.org/books/college-physics-2e" target="_blank" rel="noreferrer">{t('curriculum.openstaxLink')}</a></li>
      </ul>
    </section>
  </div>;
}
