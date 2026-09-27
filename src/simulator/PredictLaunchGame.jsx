import ParabolicGames from '../games/parabolic/ParabolicGames.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export default function PredictLaunchGame() {
  const { language } = useTranslation();
  return <ParabolicGames language={language} />;
}
