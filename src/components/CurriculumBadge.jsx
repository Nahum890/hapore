import { useState } from 'react';
import Icon from './Icon.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export default function CurriculumBadge() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón flotante en la esquina inferior */}
      <aside className="curriculum-corner-badge" aria-label={t('curriculum.label')}>
        <button
          type="button"
          className="curriculum-badge-btn"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={t('curriculum.title')}
        >
          <span className="curriculum-badge-icon" aria-hidden="true"><Icon name="class" size={16} /></span>
          <span className="curriculum-badge-text">
            <strong>MEC Res. 12506</strong>
            <small>{t('curriculum.badge')}</small>
          </span>
        </button>
      </aside>

      {/* Modal con los detalles y enlaces de la fuente */}
      {open && (
        <div className="curriculum-dialog-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="curriculum-dialog card" role="dialog" aria-modal="true" aria-labelledby="curriculum-dialog-title" onClick={event => event.stopPropagation()}>
            <div className="curriculum-dialog-header">
              <span className="panel-eyebrow">{t('curriculum.eyebrow')}</span>
              <h2 id="curriculum-dialog-title">{t('curriculum.heading')}</h2>
              <button type="button" className="curriculum-close-btn" onClick={() => setOpen(false)} aria-label={t('curriculum.close')}>✕</button>
            </div>

            <div className="curriculum-dialog-body">
              <section className="curriculum-source-block">
                <div className="curriculum-source-tag"><span className="chip chip-consolidated">{t('curriculum.mainTag')}</span></div>
                <h3>{t('curriculum.mecName')}</h3>
                <p><strong>{t('curriculum.document')}</strong> {t('curriculum.documentText')}</p>
                <p><strong>{t('curriculum.legal')}</strong> {t('curriculum.legalText')}</p>
                <p><strong>{t('curriculum.contents')}</strong> {t('curriculum.contentsText')}</p>
                <a href="https://www.mec.gov.py/cms_v2/adjuntos/6838" target="_blank" rel="noreferrer" className="btn btn-secondary curriculum-source-link">
                  <span>{t('curriculum.mecLink')}</span>
                  <Icon name="arrow" size={16} />
                </a>
              </section>

              <section className="curriculum-source-block">
                <div className="curriculum-source-tag"><span className="chip">{t('curriculum.intlTag')}</span></div>
                <h3>OpenStax, Rice University</h3>
                <p><strong>{t('curriculum.work')}</strong> <em>College Physics 2e</em> & <em>Physics</em> ({t('curriculum.digital')}).</p>
                <p><strong>{t('curriculum.license')}</strong> Creative Commons Attribution 4.0 International (CC BY 4.0).</p>
                <p><strong>{t('curriculum.calc')}</strong> {t('curriculum.calcText')}</p>
                <a href="https://openstax.org/books/college-physics-2e" target="_blank" rel="noreferrer" className="btn btn-secondary curriculum-source-link">
                  <span>{t('curriculum.openstaxLink')}</span>
                  <Icon name="arrow" size={16} />
                </a>
              </section>
            </div>

            <div className="curriculum-dialog-footer">
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>{t('curriculum.ok')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
