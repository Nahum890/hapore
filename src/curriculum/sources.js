// Fuentes oficiales del MEC (Paraguay) usadas para organizar los temas de
// Física de la Educación Media. Todo sale de docs/curriculo/
// pyfis_especificacion_fisica_curriculo_paraguay.txt, que analizó los
// documentos originales: se conservan páginas impresas y páginas del PDF cuando
// difieren, y el SHA-256 de cada archivo para poder verificarlo.
// Regla: no se inventan resoluciones, páginas ni fórmulas atribuidas al MEC.

export const SOURCES = {
  A: {
    id: 'A',
    short: { es: 'Programa base 2010-2012', gn: 'Programa base 2010-2012' },
    title: 'Desarrollo de capacidades en la Educación Media. Bachillerato Científico con énfasis en Ciencias Básicas y Tecnología. Plan ajustado (años 2010-2012)',
    resolution: 'Res. MEC N° 12.506/09 BIS',
    role: { es: 'Programa curricular base (temario completo).', gn: 'Programa curricular base (temario completo).' },
    file: 'BACHILLERATO CIENTÍFICO CON ÉNFASIS EN CIENCIAS BÁSICAS Y TECNOLOGÍA.pdf',
    pagesTotal: 277,
    sha256: '5f501cd9a84999216a034b8dbd40bf097536e6fb1e64f06449e18f91c028d5c1',
    sections: {
      comun: 'Física del Plan Común: pp. 139-145 (impresas = PDF).',
      especifico: 'Física del Plan Específico, énfasis en Ciencias Básicas: pp. 251-253; orientación pedagógica p. 268.',
    },
  },
  B: {
    id: 'B',
    short: { es: 'Priorización Curricular 2021', gn: 'Priorización Curricular 2021' },
    title: 'Priorización Curricular 2021. 3er ciclo de la Educación Escolar Básica y Educación Media',
    resolution: null,
    role: { es: 'Selección nacional y flexible de capacidades prioritarias para 2021 (contexto COVID-19). Es un piso común, no el temario total.', gn: 'Capacidad prioritaria 2021-pe g̃uarã (COVID-19 jave). Ha’e piso común, ndaha’éi temario completo.' },
    file: '2300836-1-PRIO20213yEMDGDEfinalverif3pdf-1-PRIO2021.3yEM.DGDE.final.verif.3.pdf',
    pagesTotal: 137,
    sha256: 'a77d97d7eed852cea2d9c423a80815a486d58359866f7bc238d4dc360d7d4d7a',
    sections: {
      comun: 'Física del Plan Común (1° y 2° curso): pp. impresas 66-67 / PDF 74-75.',
      especifico: 'Física del Plan Específico, 3er curso: p. impresa 91 / PDF 99.',
      legal: 'Marco legal: pp. impresas 9-11 / PDF 17-19.',
    },
    note: 'El documento no muestra una resolución aprobatoria propia en las páginas analizadas: no se le atribuye ninguna.',
  },
  C: {
    id: 'C',
    short: { es: 'Guía de planificación 2021', gn: 'Guía de planificación 2021' },
    title: 'Guía para la planificación de clases en tiempos de pandemia. Educación Media',
    resolution: null,
    role: { es: 'Cronogramas semanales y orientaciones didácticas del año lectivo 2021 (fechas históricas).', gn: 'Cronograma semanal ha orientación didáctica 2021-pegua (fecha ymaguarepegua).' },
    file: '4786101-3-GUADELELABORADOR_MEDIADGDEFINALverif31pdf-3-GUADELELABORADOR_MEDIA.DGDE.FINAL.verif.31.pdf',
    pagesTotal: 303,
    sha256: '6f276a0cb1fb366f0c38644828c1f41f697b919986a21f41f62c382c005e5c45',
    sections: {
      comun2: 'Plan Común, Física 2° curso: pp. impresas 110-113 / PDF 120-123.',
      comun3: 'Plan Común, Física 3er curso: pp. impresas 114-117 / PDF 124-127.',
      especifico3: 'Plan Específico, Física 3er curso: pp. impresas 207-210 / PDF 217-220.',
    },
    note: 'No se le atribuye una resolución aprobatoria: no figura en las páginas revisadas.',
  },
};

// Instrumentos normativos citados por las fuentes. Solo los marcados como
// "resolucion" son resoluciones del MEC; el resto es otro tipo de norma.
export const NORMATIVE = [
  { type: 'resolucion', number: 'Res. MEC N° 12.506/09 BIS', name: 'Plan ajustado del Bachillerato Científico (años 2010-2012)', role: 'Referencia curricular del programa base de Física.', source: 'A', pages: 'pp. 1 y 24' },
  { type: 'resolucion', number: 'Res. MEC N° 308/2020', name: 'Suspensión de clases presenciales', role: 'Su Art. 5 autorizó planes de contingencia y alternativas tecnológicas.', source: 'B', pages: 'p. impresa 11 / PDF 19' },
  { type: 'resolucion', number: 'Res. MEC N° 602/2020', name: 'Orientaciones para evaluar el aprendizaje en tiempos de pandemia', role: 'Aprobó el documento de orientaciones de evaluación.', source: 'B', pages: 'p. impresa 11 / PDF 19' },
  { type: 'resolucion', number: 'Res. MEC N° 832/2020', name: 'Regreso voluntario a clases presenciales del 3er año de la Media', role: 'Conforme al Decreto N° 4220/2020.', source: 'B', pages: 'p. impresa 11 / PDF 19' },
  { type: 'constitucion', number: 'Constitución Nacional', name: 'Arts. 68 y 128', source: 'B' },
  { type: 'ley', number: 'Ley N° 1264/1998', name: 'General de Educación (Arts. 3, 5, 11, 117 y 125)', source: 'B' },
  { type: 'ley', number: 'Ley N° 5749/2017', name: 'Carta Orgánica del MEC (Arts. 3, 5, 65 y 66)', source: 'B' },
  { type: 'ley', number: 'Ley N° 1680/2001', name: 'Código de la Niñez y la Adolescencia (Art. 3)', source: 'B' },
  { type: 'ley', number: 'Ley N° 6524/2020', name: 'Emergencia sanitaria por COVID-19', source: 'B' },
  { type: 'ley', number: 'Ley N° 836/1980', name: 'Código Sanitario', source: 'B' },
  { type: 'decreto', number: 'Decreto N° 3442/2020', name: 'Acciones preventivas ante el COVID-19', source: 'B' },
  { type: 'decreto', number: 'Decreto N° 3456/2020', name: 'Emergencia sanitaria nacional', source: 'B' },
  { type: 'decreto', number: 'Decreto N° 4705/2021', name: 'Medidas sanitarias del 11 al 31 de enero de 2021', source: 'B' },
  { type: 'decreto', number: 'Decreto N° 4798/2021', name: 'Extensión del Decreto 4705/2021 hasta el 21 de febrero de 2021', source: 'B' },
];

// Competencias específicas textuales del programa base.
export const COMPETENCIES = {
  comun: { text: 'Resuelve situaciones problemáticas referidas a fenómenos del entorno que requieran de los principios y de las leyes de la Física.', source: 'A', pages: 'p. 139' },
  especifico: { text: 'Resuelve problemas que impliquen la comprensión de fenómenos físicos acontecidos en el ambiente.', source: 'A', pages: 'p. 251' },
};

// Aviso que acompaña a toda fórmula: los documentos del MEC nombran leyes y
// ecuaciones pero no transcriben fórmulas (regla 5 de la especificación).
export const FORMULA_NOTE = {
  es: 'Fórmulas de física estándar (libros de texto de nivel medio). El programa del MEC nombra el tema y la ley, pero no transcribe fórmulas.',
  gn: 'Fórmula física estándar-gua (libro de texto nivel medio). MEC programa ombohéra tema ha ley, ndohaíri fórmula.',
};
