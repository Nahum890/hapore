import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import { BrandMark, Nanduti } from '../components/Nanduti.jsx';
import { LANDING_TEXT } from './content.js';
import { DEMO_VIDEOS } from './videos.js';
import { APP_VERSION_LABEL } from '../version.js';
import HeroScene from './HeroScene.jsx';
import './Landing.css';

// Página de presentación del producto (pyfisia.vercel.app). La app vive en /demo.
const LiveDemo = lazy(() => import('./LiveDemo.jsx'));
export const APK_URL = '/downloads/PyFis-IA-Demo-1.0.apk';
const APK_SIZE = '3,8 MB';
const DEMO_URL = '/demo';
const FORMULAS = ['R = v₀²·sen 2θ / g', 'Hmax = v₀²·sen²θ / 2g', 't = 2·v₀·sen θ / g', 'x = v₀·cos θ · t', 'y = h₀ + v₀·sen θ · t − ½·g·t²', 'vx = v₀·cos θ', 'vy = v₀·sen θ − g·t', 'g = 9,8 m/s²'];
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};
const FEATURE_ICONS = ['chat', 'notebook', 'cube', 'chart', 'target', 'check', 'teacher', 'file', 'link'];
const WHY_ICONS = ['globe', 'wifiOff', 'eye'];

function Icon({ name, size = 22 }) {
  return <svg className="lp-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

function Phone({ src, alt, className = '', eager = false }) {
  return <figure className={`lp-phone ${className}`}>
    <div className="lp-phone-notch" aria-hidden="true" />
    <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} />
  </figure>;
}

// Número que cuenta hacia arriba cuando aparece en pantalla.
function CountUp({ value, decimals = 0, suffix = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !('IntersectionObserver' in window)) { setShown(value); return undefined; }
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = now => {
        const p = Math.min((now - start) / 1400, 1);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{shown.toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
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
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const rootRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    document.title = 'PyFis IA · Tutor de Física en Jopara y castellano';
    if (!document.getElementById('lp-font')) {
      const link = Object.assign(document.createElement('link'), { id: 'lp-font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap' });
      document.head.appendChild(link);
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // La demo en vivo se carga recién cuando la sección se acerca a la pantalla.
  useEffect(() => {
    const target = document.getElementById('demo');
    if (!target || !('IntersectionObserver' in window)) { setShowDemo(true); return undefined; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setShowDemo(true); observer.disconnect(); } }, { rootMargin: '400px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Aparición suave de cada bloque al hacer scroll (se repite al cambiar de idioma).
  useEffect(() => {
    const root = rootRef.current;
    const items = [...root.querySelectorAll('[data-reveal]:not(.is-in)')];
    if (reducedMotion() || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return undefined; }
    root.classList.add('has-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [language]);

  // Sección activa en el menú.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.lp section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Los teléfonos de la portada siguen un poco al mouse.
  const onHeroMove = event => {
    if (reducedMotion() || event.pointerType === 'touch') return;
    const box = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty('--px', ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
    heroRef.current.style.setProperty('--py', ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
  };

  const nav = [['que', L.nav.what], ['funciones', L.nav.features], ['demo', L.nav.demo], ['videos', L.nav.videos], ['docentes', L.nav.teachers], ['descargar', L.nav.download]];

  return <div className="lp" ref={rootRef}>
    <header className={'lp-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="lp-container lp-header-row">
        <a className="lp-logo" href="#inicio" aria-label="PyFis IA">
          <BrandMark size={38} /><span>PyFis <b>IA</b></span>
        </a>
        <nav className={'lp-nav' + (menuOpen ? ' is-open' : '')} aria-label="PyFis IA">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'is-active' : ''} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <div className="lp-lang" role="group" aria-label="Idioma / Ñe’ẽ">
            <button type="button" className={language !== 'es' ? 'is-active' : ''} aria-pressed={language !== 'es'} onClick={() => setLanguage('gn-jopara')}>Jopara</button>
            <button type="button" className={language === 'es' ? 'is-active' : ''} aria-pressed={language === 'es'} onClick={() => setLanguage('es')}>Español</button>
          </div>
          <a className="lp-btn lp-btn-primary lp-btn-sm" href={DEMO_URL}>{L.cta}</a>
          <button type="button" className={'lp-menu' + (menuOpen ? ' is-open' : '')} aria-label="Menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></button>
        </div>
      </div>
    </header>

    <main>
      <section className="lp-hero" id="inicio" ref={heroRef} onPointerMove={onHeroMove}>
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow lp-enter" style={{ '--d': 0 }}><span className="lp-dot" />{L.hero.eyebrow}</p>
            <h1 className="lp-enter" style={{ '--d': 1 }}><span className="lp-red">{L.hero.titleRed}</span> <span className="lp-title-rest">{L.hero.title}</span></h1>
            <p className="lp-lead lp-enter" style={{ '--d': 2 }}>{L.hero.lead}</p>
            <div className="lp-cta-row lp-enter" style={{ '--d': 3 }}>
              <a className="lp-btn lp-btn-primary lp-btn-lg" href={DEMO_URL}><Icon name="play" size={18} />{L.cta}</a>
              <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#descargar"><Icon name="download" size={18} />{L.ctaDownload}</a>
            </div>
            <ul className="lp-badges lp-enter" style={{ '--d': 4 }}>{L.hero.badges.map(badge => <li key={badge}><Icon name="tick" size={15} />{badge}</li>)}</ul>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-float lp-float-back"><Phone className="lp-phone-tilt-l" src="/landing/simulacion-3d.png" alt="Simulación 3D de un lanzamiento en PyFis IA" eager /></div>
            <HeroScene />
            <div className="lp-float lp-float-front"><Phone className="lp-phone-tilt-r" src="/landing/chat-cuaderno.png" alt="El tutor de PyFis IA resolviendo un ejercicio paso a paso" eager /></div>
          </div>
        </div>
        <svg className="lp-earth" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 52 C 220 20 420 70 720 46 S 1180 18 1440 44 V140 H0Z" fill="#6aa66f" />
          <path d="M0 72 C 260 52 470 92 760 70 S 1200 50 1440 68 V140 H0Z" fill="#c8552f" />
          <path d="M0 100 C 300 88 520 112 800 98 S 1220 86 1440 100 V140 H0Z" fill="#a94424" />
        </svg>
      </section>

      <div className="lp-container lp-stats" data-reveal>
        {L.stats.map((stat, index) => <div key={index} className="lp-stat" style={{ '--d': index }}>
          <strong><CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} /></strong>
          <span>{stat.label}</span>
        </div>)}
      </div>

      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">{[...FORMULAS, ...FORMULAS].map((formula, index) => <span key={index}>{formula}<i /></span>)}</div>
      </div>

      <section className="lp-section" id="que">
        <div className="lp-container">
          <h2 className="lp-h2" data-reveal>{L.why.title}</h2>
          <div className="lp-why">
            {L.why.items.map(([title, text], index) => <article key={index} className="lp-why-card" data-reveal style={{ '--d': index }}>
              <span className="lp-why-icon"><Icon name={WHY_ICONS[index]} size={26} /></span>
              <h3>{title}</h3><p>{text}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-grid" id="funciones">
        <div className="lp-container">
          <h2 className="lp-h2" data-reveal>{L.features.title}</h2>
          <p className="lp-sub" data-reveal>{L.features.lead}</p>
          <div className="lp-features">
            {L.features.items.map(([title, text], index) => <article key={index} className="lp-feature" data-reveal style={{ '--d': index % 3 }}>
              <span className="lp-feature-icon"><Icon name={FEATURE_ICONS[index]} /></span>
              <h3>{title}</h3><p>{text}</p>
            </article>)}
          </div>
          <div className="lp-gallery" data-reveal>
            <Phone className="lp-gallery-l" src="/landing/grafico.png" alt="Gráfico de la parábola paso a paso" />
            <Phone className="lp-gallery-c" src="/landing/desafio-tiro-libre.png" alt="Desafío de tiro libre" />
            <Phone className="lp-gallery-r" src="/landing/app-inicio.png" alt="Pantalla de inicio de PyFis IA" />
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-sky" id="demo">
        <div className="lp-container">
          <h2 className="lp-h2" data-reveal>{L.live.title}</h2>
          <p className="lp-sub" data-reveal>{L.live.lead}</p>
          <div className="lp-window" data-reveal>
            <div className="lp-window-bar"><i /><i /><i /><span>PyFis IA</span></div>
            {showDemo
              ? <Suspense fallback={<p className="lp-loading">{L.live.loading}</p>}><LiveDemo text={L.live} /></Suspense>
              : <p className="lp-loading">{L.live.loading}</p>}
          </div>
          <div className="lp-cta-row lp-center"><a className="lp-btn lp-btn-primary lp-btn-lg" href={DEMO_URL}><Icon name="play" size={18} />{L.cta}<Icon name="arrow" size={18} /></a></div>
        </div>
      </section>

      <section className="lp-section" id="videos">
        <div className="lp-container">
          <h2 className="lp-h2" data-reveal>{L.videos.title}</h2>
          <p className="lp-sub" data-reveal>{L.videos.lead}</p>
          <div className="lp-videos">{DEMO_VIDEOS.map((video, index) => <div key={video.id} data-reveal style={{ '--d': index % 2 }}><VideoCard video={video} title={L.videos.items[video.id]} soon={L.videos.soon} /></div>)}</div>
        </div>
      </section>

      <section className="lp-section lp-section-grid">
        <div className="lp-container">
          <h2 className="lp-h2" data-reveal>{L.how.title}</h2>
          <ol className="lp-steps">
            {L.how.items.map(([title, text], index) => <li key={index} data-reveal style={{ '--d': index }}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="lp-section" id="docentes">
        <div className="lp-container lp-teachers">
          <div data-reveal>
            <h2 className="lp-h2 lp-left">{L.teachers.title}</h2>
            <p className="lp-sub lp-left">{L.teachers.lead}</p>
            <ul className="lp-checks">{L.teachers.items.map((item, index) => <li key={index}><span><Icon name="tick" size={16} /></span>{item}</li>)}</ul>
          </div>
          <div className="lp-shot-wrap" data-reveal style={{ '--d': 1 }}>
            <img className="lp-shot" src="/landing/docente-banderas.png" alt="Panel docente con banderitas por ejercicio" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="lp-section lp-download" id="descargar">
        <div className="lp-container lp-download-card" data-reveal>
          <div className="lp-download-copy">
            <h2 className="lp-h2 lp-left">{L.download.title}</h2>
            <ul className="lp-meta">{L.download.meta.map(item => <li key={item}>{item}</li>)}<li>{L.download.size}: {APK_SIZE}</li></ul>
            <ol className="lp-install">{L.download.steps.map((step, index) => <li key={index}><span>{index + 1}</span>{step}</li>)}</ol>
            <div className="lp-cta-row">
              <a className="lp-btn lp-btn-primary lp-btn-lg" href={APK_URL} download><Icon name="download" size={20} />{L.ctaDownload}</a>
              <a className="lp-btn lp-btn-ghost lp-btn-lg" href={DEMO_URL}>{L.download.noAndroid}</a>
            </div>
          </div>
          <div className="lp-download-visual" aria-hidden="true">
            <div className="lp-download-sun"><Nanduti size={300} spokes={20} rings={3} color="rgba(29,91,216,.16)" accent="#f59e0b" strokeWidth={1.1} /></div>
            <Phone className="lp-download-phone" src="/landing/app-inicio.png" alt="" />
          </div>
        </div>
      </section>

      <section className="lp-section lp-team-section" id="equipo">
        <div className="lp-container lp-team" data-reveal>
          <div className="lp-team-mark"><Nanduti size={96} spokes={16} rings={3} color="#e11d48" accent="#f59e0b" strokeWidth={1.2} /></div>
          <h2 className="lp-h2">{L.team.title}</h2>
          <p>{L.team.text}</p>
          <p className="lp-team-teacher">{L.team.teacher}</p>
          <p className="lp-team-tag">Kyre’y-devs · Ciudad del Este, Paraguay</p>
        </div>
      </section>
    </main>

    <footer className="lp-footer">
      <div className="lp-container lp-footer-row">
        <span className="lp-logo"><BrandMark size={30} /><span>PyFis <b>IA</b></span></span>
        <span>{L.footer}</span>
        <span className="lp-footer-links"><a href={DEMO_URL}>{L.cta}</a><a href={APK_URL} download>{L.ctaDownload}</a><span>{APP_VERSION_LABEL}</span></span>
      </div>
    </footer>
  </div>;
}
