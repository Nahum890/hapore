import { useRef, useState } from 'react';
import { decodeClassConfig } from '../utils/classCode.js';
import { readJSON } from '../utils/storage.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export async function createStudyPdf(options) {
  const { createStudyPdf: generate } = await import('../pdf/createStudyPdf.js');
  return generate(options);
}

export default function PdfButton() {
  const { language, t } = useTranslation();
  const [generating, setGenerating] = useState(false), [status, setStatus] = useState('');
  const lock = useRef(false);
  const download = async () => {
    if (lock.current) return;
    lock.current = true; setGenerating(true); setStatus('');
    try {
      const config = decodeClassConfig(readJSON('guarania:classCode', null));
      const { downloadStudyPdf } = await import('../pdf/createStudyPdf.js');
      await downloadStudyPdf({ config, language });
      setStatus(t('pdf.downloaded'));
    } catch { setStatus(t('pdf.error')); }
    finally { lock.current = false; setGenerating(false); }
  };
  return <div className="pdf-button"><button type="button" className="btn btn-light" onClick={download} disabled={generating} aria-label={t('pdf.button')} aria-busy={generating}>{generating ? t('pdf.generating') : t('pdf.button')}</button>{status && <p className="pdf-status" role="status" onClick={() => setStatus('')}>{status}</p>}</div>;
}
