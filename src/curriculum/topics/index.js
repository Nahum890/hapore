// Catálogo de temas de Física (Educación Media). Junta el contenido de cada
// área con su ubicación en el currículo del MEC (curriculum.js).
import { MECANICA } from './mecanica.js';
import { FLUIDOS_CALOR } from './fluidosCalor.js';
import { ONDAS_OPTICA } from './ondasOptica.js';
import { ELECTRICIDAD } from './electricidad.js';
import { COURSES, courseTopicIds, topicGuideWeeks, topicPlacements } from '../curriculum.js';

export const TOPICS = [...MECANICA, ...FLUIDOS_CALOR, ...ONDAS_OPTICA, ...ELECTRICIDAD];
const BY_ID = new Map(TOPICS.map(topic => [topic.id, topic]));

export const AREAS = {
  mecanica: { es: 'Mecánica', gn: 'Mecánica', color: 'blue' },
  fluidos: { es: 'Fluidos', gn: 'Fluido', color: 'sky' },
  calor: { es: 'Calor', gn: 'Calor', color: 'sun' },
  termo: { es: 'Termodinámica', gn: 'Termodinámica', color: 'earth' },
  optica: { es: 'Óptica', gn: 'Óptica', color: 'sun' },
  ondas: { es: 'Ondas', gn: 'Onda', color: 'sky' },
  electricidad: { es: 'Electricidad', gn: 'Electricidad', color: 'violet' },
  moderna: { es: 'Física moderna', gn: 'Física moderna', color: 'earth' },
};

export const topicById = id => BY_ID.get(id) ?? null;

/** Texto bilingüe { es, gn } → el idioma activo (Jopara si existe). */
export const pickLang = (value, language) => {
  if (value == null) return '';
  if (typeof value === 'string' || Array.isArray(value)) return value;
  return language === 'es' ? (value.es ?? value.gn ?? '') : (value.gn ?? value.es ?? '');
};

/** Lugares del currículo de un tema, con lo necesario para citarlo. */
export function topicCurriculum(topicId) {
  return {
    placements: topicPlacements(topicId),
    guideWeeks: topicGuideWeeks(topicId),
  };
}

export function courseTopics(courseId) {
  return courseTopicIds(courseId).map(topicById).filter(Boolean);
}

/** Todos los cursos donde aparece el tema (para chips "1.º · 3.º PE"). */
export function topicCourses(topicId) {
  return COURSES.filter(course => courseTopicIds(course.id).includes(topicId));
}

export function searchTopics(query) {
  const text = normalize(query);
  if (!text) return TOPICS;
  return TOPICS.filter(topic => normalize(`${topic.name.es} ${topic.name.gn} ${topic.tagline.es} ${(topic.keywords ?? []).join(' ')}`).includes(text));
}

export function normalize(text) {
  return String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').trim();
}
