import { useTranslation } from '../i18n/LanguageProvider.jsx';
import '../i18n/language.css';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation();
  return <label className="pyfis-language-selector"><span className="sr-only">{t('language.label')}</span>
    <select aria-label={t('language.label')} value={language} onChange={event => setLanguage(event.target.value)}>
      <option value="gn-jopara">{t('language.jopara')}</option>
      <option value="es">{t('language.spanish')}</option>
    </select>
  </label>;
}
