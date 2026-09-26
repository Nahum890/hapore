export const DEFAULT_LANGUAGE = 'gn-jopara';
export const SUPPORTED_LANGUAGES = ['gn-jopara', 'es'];

export const translationReview = {
  'gn-jopara': { status: 'draft', note: 'Borrador pendiente de revisión por una persona competente en guaraní paraguayo.' },
  es: { status: 'draft', note: 'Textos de interfaz sujetos a revisión editorial.' },
};

const messages = {
  'gn-jopara': {
    'brand.tagline': 'Jaaprende Física nde ritmo-pe',
    'header.home': 'Eho ñepyrũme', 'header.online': 'Con conexión', 'header.offline': 'Sin conexión',
    'header.teacher': 'Mbo’ehára', 'header.student': 'Temimbo’e', 'header.logout': 'Eñesẽ',
    'language.label': 'Ñe’ẽ / Idioma', 'language.jopara': 'Jopara (borrador)', 'language.spanish': 'Español',
    'pdf.button': 'Ficha PDF', 'pdf.generating': 'Ojapo hína PDF…', 'pdf.downloaded': '¡Ficha oñemboguejy! Ikatu eipuru internet’ỹre.',
    'pdf.error': 'Ndoikói PDF. Eñeha’ã jey.', 'pdf.title': 'Ficha de Física', 'pdf.subtitle': 'Eikuaa, eñepractica ha ehecha jey nde cálculo.',
    'pdf.name': 'Téra', 'pdf.date': 'Ára', 'pdf.before': 'Eñepyrũ mboyve',
    'pdf.instructions': 'Eipuru umi unidad oĩva ejercicio-pe. Ehechauka fórmula ha cálculo. Pe gravedad ikatu ha’e 9,8 térã 10 m/s², he’iháicha ejercicio.',
    'pdf.review': 'Ehecha jey hag̃ua', 'pdf.answer': 'Mbohovái', 'pdf.page': 'Pág.',
    'pdf.assumptionsTitle': 'Umi supuesto de Física', 'pdf.relations': 'Umi fórmula', 'pdf.exercises': 'Ejercicios', 'pdf.references': 'Fuentes científicas',
    'pdf.draft': 'Ñe’ẽasa Jopara ha’e peteĩ borrador, ndojehechái gueteri peteĩ lingüista reheve.',
    'pdf.assumptions': 'Supuestos: no se considera resistencia del aire; g es constante; el alcance de 45° supone salida y llegada a la misma altura. En calor se supone que no hay pérdidas ni cambio de estado. Los ángulos ópticos se miden desde la normal.',
    'pdf.source': 'Fuente consultada', 'pdf.accessed': 'Consulta', 'pdf.license': 'Licencia',
    'pdf.footer': 'Generado en este dispositivo; disponible sin conexión.',
    'nav.inicio': 'Ñepyrũ', 'nav.simulador': 'Ñaha’ã', 'nav.tarjetas': 'Jahecha jey', 'nav.chats': 'Eporandu', 'nav.aula': 'Aula', 'nav.label': 'Umi sección',
    'section.simulador.title': 'Ñaha’ã peteĩ ejercicio', 'section.simulador.description': 'Emoñe’ẽ pe ejercicio, ehai nde respuesta ha ehecha simulación-pe mba’épa oiko.',
    'section.tarjetas.title': 'Jahecha jey tarjeta reheve', 'section.tarjetas.description': 'Eiporavo peteĩ mazo, ehecha pe respuesta ha upéi ehasa cuestionario-pe.',
    'section.chats.title': 'Eporandu tutor-pe', 'section.chats.description': 'Ejapo cuestionario térã eporandu chat libre-pe nde duda.',
    'section.aula.title': 'Nde clase', 'section.aula.description': 'Ehai pe código ome’ẽva ndéve nde mbo’ehára.',
    'section.aulaTeacher.title': 'Embosako’i nde clase', 'section.aulaTeacher.description': 'Ejapo peteĩ código nde temimbo’ekuérape guarã ha eipuru proyector.',
    'section.guide': 'Guía', 'section.student': 'Nde aprendizaje', 'section.teacher': 'Espacio docente',
    'home.hello': 'Mba’éichapa', 'home.kickerStudent': 'Nde espacio de aprendizaje', 'home.kickerTeacher': 'Espacio docente',
    'home.leadStudent': 'Ñañepyrũ peteĩ ejercicio reheve: ehai nde respuesta ha ehecha simulación-pe. Ani rekyhyje, equivocarse avei ha’e aprender.',
    'home.leadTeacher': 'Embosako’i peteĩ clase ha eme’ẽ pe código nde temimbo’ekuérape. Ikatu avei rehecha umi actividad.',
    'home.ctaStudent': 'Ñañepyrũ', 'home.ctaTeacher': 'Embosako’i clase', 'home.motto': 'Ani rekyhyje',
    'home.question': 'Mba’épa rejaposé ko’ãga?', 'home.guide': 'Ehecha guía',
    'home.practiceText': 'Eresolve peteĩ ejercicio ha ehecha mba’éichapa oiko.', 'home.reviewText': 'Estudia tarjeta reheve nde ritmo-pe.', 'home.tutorText': 'Ejapo cuestionario ha eporandu nde duda.',
    'home.p1': 'Ndaipóri castigo', 'home.p2': 'Eñeha’ã jey', 'home.p3': 'Internet’ỹre avei',
  },
  es: {
    'brand.tagline': 'Física a tu ritmo',
    'header.home': 'Ir al inicio', 'header.online': 'Con conexión', 'header.offline': 'Sin conexión',
    'header.teacher': 'Maestro', 'header.student': 'Alumno', 'header.logout': 'Salir',
    'language.label': 'Idioma', 'language.jopara': 'Jopara (borrador)', 'language.spanish': 'Español',
    'pdf.button': 'Ficha PDF', 'pdf.generating': 'Generando PDF…', 'pdf.downloaded': 'Ficha descargada. Está disponible sin conexión.',
    'pdf.error': 'No se pudo generar el PDF. Probá nuevamente.', 'pdf.title': 'Ficha de Física', 'pdf.subtitle': 'Aprendé, practicá y revisá tus cálculos.',
    'pdf.name': 'Nombre', 'pdf.date': 'Fecha', 'pdf.before': 'Antes de empezar',
    'pdf.instructions': 'Usá las unidades indicadas en cada ejercicio. Mostrá la fórmula y el cálculo. La gravedad puede ser 9,8 o 10 m/s², según el ejercicio.',
    'pdf.review': 'Guía de revisión', 'pdf.answer': 'Resultado', 'pdf.page': 'Pág.',
    'pdf.assumptionsTitle': 'Supuestos físicos', 'pdf.relations': 'Relaciones útiles', 'pdf.exercises': 'Ejercicios', 'pdf.references': 'Fuentes científicas',
    'pdf.draft': 'La traducción al Jopara es un borrador y todavía no fue revisada por una persona lingüista.',
    'pdf.assumptions': 'Supuestos: se desprecia la resistencia del aire; g es constante; el alcance a 45° supone la misma altura de salida y llegada. En calor, no hay pérdidas ni cambio de estado. Los ángulos ópticos se miden desde la normal.',
    'pdf.source': 'Fuente consultada', 'pdf.accessed': 'Consulta', 'pdf.license': 'Licencia',
    'pdf.footer': 'Generado en este dispositivo; disponible sin conexión.',
    'nav.inicio': 'Inicio', 'nav.simulador': 'Practicar', 'nav.tarjetas': 'Repasar', 'nav.chats': 'Tutor', 'nav.aula': 'Aula', 'nav.label': 'Secciones principales',
    'section.simulador.title': 'Practicá con una simulación', 'section.simulador.description': 'Leé el ejercicio, escribí tu respuesta y comprobala con la escena de ese tema.',
    'section.tarjetas.title': 'Repasá con tarjetas', 'section.tarjetas.description': 'Elegí un mazo, descubrí cada respuesta y seguí con el cuestionario.',
    'section.chats.title': 'Preguntale al tutor', 'section.chats.description': 'Practicá con un cuestionario o abrí el chat libre cuando tengas una duda.',
    'section.aula.title': 'Tu clase', 'section.aula.description': 'Usá el código que te dio tu docente para aprender los temas que eligió.',
    'section.aulaTeacher.title': 'Prepará tu aula', 'section.aulaTeacher.description': 'Creá un código para tus alumnos y usá el proyector de trayectorias.',
    'section.guide': 'Guía', 'section.student': 'Tu aprendizaje', 'section.teacher': 'Espacio docente',
    'home.hello': 'Hola', 'home.kickerStudent': 'Tu espacio de aprendizaje', 'home.kickerTeacher': 'Espacio docente',
    'home.leadStudent': 'Empezá con un ejercicio: escribí tu respuesta y comprobala con la simulación. Sin miedo: equivocarse también es aprender.',
    'home.leadTeacher': 'Prepará una clase y compartí el código con tus alumnos. También podés explorar las actividades.',
    'home.ctaStudent': 'Empezar a practicar', 'home.ctaTeacher': 'Preparar una clase', 'home.motto': 'Sin miedo a equivocarte',
    'home.question': '¿Qué querés hacer hoy?', 'home.guide': 'Ver guía rápida',
    'home.practiceText': 'Resolvé un ejercicio y mirá cómo funciona.', 'home.reviewText': 'Estudiá con tarjetas a tu ritmo.', 'home.tutorText': 'Hacé el cuestionario y despejá dudas.',
    'home.p1': 'Sin castigos', 'home.p2': 'Reintentá cuando quieras', 'home.p3': 'Funciona sin conexión',
  },
};

export function translate(language, key) {
  return messages[language]?.[key] ?? messages.es[key] ?? key;
}

export default messages;
