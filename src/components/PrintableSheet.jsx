import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

/** Keep Unicode intact; the shared PDF generator embeds Noto Sans. */
export function printableText(value) {
  return String(value ?? '').replaceAll('θ', 'ángulo').replaceAll('≈', 'aprox.').replaceAll('−', '-').replace(/[–—]/gu, '-');
}

export default function PrintableSheet({ className = '' }) {
  const { language, t } = useTranslation();
  const [downloading, setDownloading] = useState(false), [status, setStatus] = useState('');
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true); setStatus('');
    try {
      const { downloadStudyPdf } = await import('../pdf/createStudyPdf.js');
      await downloadStudyPdf({ language }); setStatus(t('pdf.downloaded'));
    }
    catch { setStatus(t('pdf.error')); }
    finally { setDownloading(false); }
  };
  return <div className={`printable-sheet-wrapper ${className}`}>
    <button type="button" className="btn btn-primary btn-download-pdf" onClick={handleDownload} disabled={downloading} aria-busy={downloading}>
      <span aria-hidden="true">📄</span><span>{downloading ? t('pdf.generating') : t('pdf.button')}</span>
    </button>
    {status && <p className="pdf-success-badge" role="status">{status}</p>}
  </div>;
}
