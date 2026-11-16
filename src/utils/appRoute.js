// Ruta de la app guardada en el hash de la dirección (por ejemplo
// /demo#/temas/vectores). Así "atrás" del navegador y del teléfono vuelve a la
// pantalla anterior, recargar no manda a Inicio y se puede compartir el enlace
// a un tema. Funciona igual en Vercel, en la PWA y en el APK sin tocar servidores.
const SLUG_BY_TAB = { inicio: 'inicio', simulador: 'temas', tarjetas: 'repasar', chats: 'tutor', aula: 'aula', mensajes: 'mensajes' };
const TAB_BY_SLUG = Object.fromEntries(Object.entries(SLUG_BY_TAB).map(([tab, slug]) => [slug, tab]));
const SLUG_BY_TOPIC_TAB = { learn: 'aprender', sim: 'simulador', practice: 'practicar', quiz: 'preguntas' };
const TOPIC_TAB_BY_SLUG = Object.fromEntries(Object.entries(SLUG_BY_TOPIC_TAB).map(([tab, slug]) => [slug, tab]));
const TOPIC_ID = /^[a-z0-9-]{1,60}$/;

export const HOME_ROUTE = Object.freeze({ tab: 'inicio', topic: null });

export function parseRoute(hash = '') {
  const parts = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean)
    .map(part => { try { return decodeURIComponent(part); } catch { return ''; } });
  const tab = TAB_BY_SLUG[parts[0]];
  if (!tab) return HOME_ROUTE;
  if (tab !== 'simulador' || !TOPIC_ID.test(parts[1] ?? '')) return { tab, topic: null };
  return { tab, topic: { id: parts[1], tab: TOPIC_TAB_BY_SLUG[parts[2]] ?? 'learn' } };
}

export function formatRoute({ tab, topic } = {}) {
  const slug = SLUG_BY_TAB[tab] ?? 'inicio';
  if (tab !== 'simulador' || !topic?.id || !TOPIC_ID.test(topic.id)) return `#/${slug}`;
  const topicTab = topic.tab && topic.tab !== 'learn' ? `/${SLUG_BY_TOPIC_TAB[topic.tab] ?? 'aprender'}` : '';
  return `#/${slug}/${topic.id}${topicTab}`;
}
