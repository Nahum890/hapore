import concepts from './concepts.json' with { type: 'json' };
import errors from './errors.json' with { type: 'json' };
import exercises from './exercises.json' with { type: 'json' };
import flashcards from './flashcards.json' with { type: 'json' };
import glossary from './glossary.json' with { type: 'json' };
import tutorJopara from './tutor_jopara.json' with { type: 'json' };
import quizBank from '../ai/quizBank.json' with { type: 'json' };
import contentReview from './contentReviewStatus.json' with { type: 'json' };
import catalogTranslations from './catalogTranslations.json' with { type: 'json' };
import scienceSources from './scienceSources.json' with { type: 'json' };

export { concepts, errors, exercises, flashcards, glossary, quizBank, tutorJopara, contentReview, catalogTranslations, scienceSources };

const JOPARA_FIELDS = {
  name: ['nameJopara', 'name_gn'], definition: ['definitionJopara', 'definition_gn'],
  question: ['questionJopara', 'question_gn'], frente_es: ['frente_jopara'],
  pregunta: ['preguntaJopara'], enunciado: ['enunciadoJopara'], tema: ['temaJopara'],
  description: ['descriptionJopara'], example: ['exampleJopara'], ejemplo: ['ejemploJopara'], hints: ['hintsJopara'],
  front: ['frontJopara', 'frente_jopara'], respuesta: ['respuestaJopara'],
  explicacion: ['explicacionJopara', 'explanationJopara'], dorso_concepto: ['dorso_jopara', 'backJopara'],
  topic: ['topicJopara', 'temaJopara'], term: ['joparaTerm'],
};

export function localizeCatalogItem(item, language = 'gn-jopara') {
  if (!item || language === 'es') return item;
  const localized = { ...item, ...(catalogTranslations.items[item.id] ?? {}) };
  for (const [field, alternates] of Object.entries(JOPARA_FIELDS)) {
    if (item[field] == null) continue;
    const value = alternates.map(key => localized[key]).find(candidate => {
      if (Array.isArray(item[field])) return Array.isArray(candidate) && candidate.length > 0;
      return typeof candidate === 'string' && candidate.trim();
    });
    if (value) localized[field] = value;
  }
  return localized;
}
