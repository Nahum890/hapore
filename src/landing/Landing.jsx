import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { BrandMark, Nanduti } from '../components/Nanduti.jsx';
import { LANDING_TEXT } from './content.js';
import { DEMO_VIDEOS } from './videos.js';
import { APP_VERSION_LABEL } from '../version.js';
import './Landing.css';

// Página de presentación del producto (pyfisia.vercel.app). La app vive en /demo.
const LiveDemo = lazy(() => import('./LiveDemo.jsx'));
export const APK_URL = '/downloads/PyFis-IA-Demo-1.0.apk';
const APK_SIZE = '3,8 MB';
const DEMO_URL = '/demo';

const ICONS = {
  chat: 'M4 5h16v10H9l-5 4z',
  notebook: 'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9 8h6M9 12h6M9 16h4',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  chart: 'M4 20V4M4 20h16M7 16l4-5 3 3 5-7',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  check: 'M4 6h16v13H4zM8 12l3 3 5-6',
  teacher: 'M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 4h4v6h-4',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  play: 'M8 5v14l11-7z',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14 10.3A10 10 0 0 1 19 13M12 20h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};
const FEATURE_ICONS = ['chat', 'notebook', 'cube', 'chart', 'target', 'check', 'teacher', 'file', 'link'];
const WHY_ICONS = ['globe', 'wifiOff', 'eye'];

function Icon({ name, size = 22 }) {
  return <svg className="lp-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

function Phone({ src, alt, className = '' }) {
  return <figure className={`lp-phone ${className}`}>
    <div className="lp-phone-notch" aria-hidden="true" />
    <img src={src} alt={alt} loading="lazy" />
  </figure>;
}

function VideoCard({ video, title, soon }) {
  if (video.youtube) {
    return <figure className="lp-video">
      <div className="lp-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.youtube}`} title={title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
      <figcaption>{title}</figcaption>
    </figure>;
  }
  if (video.src) {
    return <figure className="lp-video">
      <div className="lp-video-frame"><video src={video.src} poster={video.poster} controls preload="metadata" playsInline /></div>
      <figcaption>{title}</figcaption>
    </figure>;
  }
  return <figure className="lp-video is-soon">
    <div className="lp-video-frame">
      <img src={video.poster} alt="" loading="lazy" />
      <span className="lp-video-play" aria-hidden="true"><Icon name="play" size={26} /></span>
      <span className="lp-video-soon">{soon}</span>
    </div>
    <figcaption>{title}</figcaption>
  </figure>;
}

export default function Landing() {
  const { language, setLanguage } = useTranslation();
  const L = LANDING_TEXT[language === 'es' ? 'es' : 'gn'];
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    document.title = 'PyFis IA · Tutor de Física en Jopara y castellano';
  }, []);
  // La demo en vivo se carga recién cuando la sección se acerca a la pantalla.
  useEffect(() => {
    const target = document.getElementById('demo');
    if (!target || !('IntersectionObserver' in window)) { setShowDemo(true); return undefined; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setShowDemo(true); observer.disconnect(); } }, { rootMargin: '400px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const nav = [['que', L.nav.what], ['funciones', L.nav.features], ['demo', L.nav.demo], ['videos', L.nav.videos], ['docentes', L.nav.teachers], ['descargar', L.nav.download]];

  return <div className="lp">
    <header className="lp-header">
      <div className="lp-container lp-header-row">
        <a className="lp-logo" href="#inicio" aria-label="PyFis IA">
          <BrandMark size={36} /><span>PyFis <b>IA</b></span>
        </a>
        <nav className={'lp-nav' + (menuOpen ? ' is-open' : '')} aria-label="PyFis IA">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <div className="lp-lang" role="group" aria-label="Idioma / Ñe’ẽ">
            <button type="button" className={language !== 'es' ? 'is-active' : ''} aria-pressed={language !== 'es'} onClick={() => setLanguage('gn-jopara')}>Jopara</button>
            <button type="button" className={language === 'es' ? 'is-active' : ''} aria-pressed={language === 'es'} onClick={() => setLanguage('es')}>Español</button>
          </div>
          <a className="lp-btn lp-btn-primary lp-btn-sm" href={DEMO_URL}>{L.cta}</a>
          <button type="button" className="lp-menu" aria-label="Menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></button>
        </div>
      </div>
    </header>

    <main>
      <section className="lp-hero" id="inicio">
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-nanduti" aria-hidden="true"><Nanduti size={520} spokes={20} rings={3} color="rgba(245,158,11,.14)" accent="rgba(245,158,11,.3)" strokeWidth={1} /></div>
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">{L.hero.eyebrow}</p>
            <h1><span className="lp-red">{L.hero.titleRed}</span> {L.hero.title}</h1>
            <p className="lp-lead">{L.hero.lead}</p>
            <div className="lp-cta-row">
              <a className="lp-btn lp-btn-primary" href={DEMO_URL}><Icon name="play" size={18} />{L.cta}</a>
              <a className="lp-btn lp-btn-ghost" href="#descargar"><Icon name="download" size={18} />{L.ctaDownload}</a>
            </div>
            <ul className="lp-badges">{L.hero.badges.map(badge => <li key={badge}>{badge}</li>)}</ul>
          </div>
          <div className="lp-hero-visual">
            <svg className="lp-hero-arc" viewBox="0 0 400 260" aria-hidden="true"><path d="M20 240 Q 200 -60 380 240" fill="none" stroke="rgba(245,158,11,.55)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" /><circle cx="200" cy="90" r="9" fill="#f59e0b" /></svg>
            <Phone className="lp-phone-back" src="/landing/simulacion-3d.png" alt="Simulación 3D de un lanzamiento en PyFis IA" />
            <Phone className="lp-phone-front" src="/landing/chat-cuaderno.png" alt="El tutor de PyFis IA resolviendo un ejercicio paso a paso" />
          </div>
        </div>
      </section>

      <section className="lp-section" id="que">
        <div className="lp-container">
          <h2 className="lp-h2">{L.why.title}</h2>
          <div className="lp-why">
            {L.why.items.map(([title, text], index) => <article key={title} className="lp-why-card">
              <span className="lp-why-icon"><Icon name={WHY_ICONS[index]} size={26} /></span>
              <h3>{title}</h3><p>{text}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="funciones">
        <div className="lp-container">
          <h2 className="lp-h2">{L.features.title}</h2>
          <p className="lp-sub">{L.features.lead}</p>
          <div className="lp-features">
            {L.features.items.map(([title, text], index) => <article key={title} className="lp-feature" style={{ '--i': index }}>
              <span className="lp-feature-icon"><Icon name={FEATURE_ICONS[index]} /></span>
              <h3>{title}</h3><p>{text}</p>
            </article>)}
          </div>
          <div className="lp-gallery">
            <Phone src="/landing/grafico.png" alt="Gráfico de la parábola paso a paso" />
            <Phone src="/landing/desafio-tiro-libre.png" alt="Desafío de tiro libre" />
            <Phone src="/landing/app-inicio.png" alt="Pantalla de inicio de PyFis IA" />
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-dark" id="demo">
        <div className="lp-container">
          <h2 className="lp-h2">{L.live.title}</h2>
          <p className="lp-sub">{L.live.lead}</p>
          {showDemo
            ? <Suspense fallback={<p className="lp-loading">{L.live.loading}</p>}><LiveDemo text={L.live} /></Suspense>
            : <p className="lp-loading">{L.live.loading}</p>}
          <div className="lp-cta-row lp-center"><a className="lp-btn lp-btn-primary" href={DEMO_URL}><Icon name="play" size={18} />{L.cta}</a></div>
        </div>
      </section>

      <section className="lp-section" id="videos">
        <div className="lp-container">
          <h2 className="lp-h2">{L.videos.title}</h2>
          <p className="lp-sub">{L.videos.lead}</p>
          <div className="lp-videos">{DEMO_VIDEOS.map(video => <VideoCard key={video.id} video={video} title={L.videos.items[video.id]} soon={L.videos.soon} />)}</div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <h2 className="lp-h2">{L.how.title}</h2>
          <ol className="lp-steps">{L.how.items.map(([title, text], index) => <li key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <section className="lp-section" id="docentes">
        <div className="lp-container lp-teachers">
          <div>
            <h2 className="lp-h2 lp-left">{L.teachers.title}</h2>
            <p className="lp-sub lp-left">{L.teachers.lead}</p>
            <ul className="lp-checks">{L.teachers.items.map(item => <li key={item}><Icon name="check" size={20} />{item}</li>)}</ul>
          </div>
          <img className="lp-shot" src="/landing/docente-banderas.png" alt="Panel docente con banderitas por ejercicio" loading="lazy" />
        </div>
      </section>

      <section className="lp-section lp-download" id="descargar">
        <div className="lp-container lp-download-card">
          <div className="lp-download-copy">
            <h2 className="lp-h2 lp-left">{L.download.title}</h2>
            <ul className="lp-meta">{L.download.meta.map(item => <li key={item}>{item}</li>)}<li>{L.download.size}: {APK_SIZE}</li></ul>
            <ol className="lp-install">{L.download.steps.map(step => <li key={step}>{step}</li>)}</ol>
            <div className="lp-cta-row">
              <a className="lp-btn lp-btn-primary lp-btn-lg" href={APK_URL} download><Icon name="download" size={20} />{L.ctaDownload}</a>
              <a className="lp-btn lp-btn-ghost" href={DEMO_URL}>{L.download.noAndroid}</a>
            </div>
          </div>
          <div className="lp-download-visual" aria-hidden="true">
            <Nanduti size={220} spokes={18} rings={3} color="rgba(255,255,255,.22)" accent="#f59e0b" strokeWidth={1.2} />
            <div className="lp-download-mark"><BrandMark size={92} /></div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="equipo">
        <div className="lp-container lp-team">
          <h2 className="lp-h2">{L.team.title}</h2>
          <p>{L.team.text}</p>
          <p className="lp-team-teacher">{L.team.teacher}</p>
          <p className="lp-team-tag">Kyre’y-devs · FeSTEAM 2026</p>
        </div>
      </section>
    </main>

    <footer className="lp-footer">
      <div className="lp-container lp-footer-row">
        <span className="lp-logo"><BrandMark size={28} /><span>PyFis <b>IA</b></span></span>
        <span>{L.footer}</span>
        <span className="lp-footer-links"><a href={DEMO_URL}>{L.cta}</a><a href={APK_URL} download>{L.ctaDownload}</a><span>{APP_VERSION_LABEL}</span></span>
      </div>
    </footer>
  </div>;
}
