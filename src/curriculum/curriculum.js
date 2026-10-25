// Mapa curricular de Física de la Educación Media (MEC, Paraguay).
// Fuente: docs/curriculo/pyfis_especificacion_fisica_curriculo_paraguay.txt.
// - "base": capacidad del programa base (doc A, Res. MEC N° 12.506/09 BIS).
// - "prio": número de la capacidad en la Priorización Curricular 2021 (doc B),
//   o null si la Priorización 2021 no la incluye (el tema NO se borra).
// - GUIDE_SCHEDULES: cronogramas de la Guía de planificación 2021 (doc C),
//   conservados con su rótulo original aunque no coincidan con A/B.
// Los textos de capacidades se copian del documento fuente (sin tildes en el
// original de la especificación; acá se restituyen para lectura).

export const LEVEL = { id: 'media', name: { es: 'Educación Media', gn: 'Educación Media' } };

export const COURSES = [
  {
    id: 'c1', grade: 1, plan: 'comun',
    name: { es: '1.er curso', gn: '1.er curso' },
    planName: { es: 'Plan Común', gn: 'Plan Común' },
    competency: 'comun',
    base: { source: 'A', pages: 'pp. 140-142' },
    prio: { source: 'B', pages: 'pp. impresas 66-67 / PDF 74-75' },
    scope: {
      es: 'Magnitudes, vectores, movimientos, fuerzas, energía, hidrostática, hidrodinámica y calor.',
      gn: 'Magnitudes, vectores, movimiento, fuerza, energía, hidrostática, hidrodinámica ha calor.',
    },
    units: [
      {
        id: 'c1-mecanica', name: { es: 'Mecánica', gn: 'Mecánica' },
        capacities: [
          { n: 1, text: 'Reconoce las magnitudes físicas.', topics: ['magnitudes'], prio: 1 },
          { n: 2, text: 'Resuelve problemas de magnitudes vectoriales.', topics: ['vectores'], prio: 2 },
          { n: 3, text: 'Analiza características del movimiento de los cuerpos.', topics: ['cinematica'], prio: 3 },
          { n: 4, text: 'Resuelve problemas de movimiento (MRU, MRUV y movimiento vertical en el vacío).', topics: ['mru', 'mruv', 'caida-libre'], prio: 4 },
          { n: 5, text: 'Aplica las leyes de Newton a situaciones problemáticas.', topics: ['newton'], prio: 7 },
          { n: 6, text: 'Aplica equilibrio de fuerzas a problemas.', topics: ['equilibrio'], prio: 5 },
          { n: 7, text: 'Ejecuta experiencias sencillas sobre elasticidad.', topics: ['elasticidad'], prio: 6 },
          { n: 8, text: 'Resuelve problemas sobre energía.', topics: ['energia'], prio: 8 },
          { n: 9, text: 'Resuelve problemas de conservación de cantidad de movimiento.', topics: ['cantidad-movimiento'], prio: null },
          { n: 10, text: 'Resuelve situaciones de hidrostática.', topics: ['hidrostatica', 'arquimedes'], prio: 9 },
          { n: 11, text: 'Resuelve problemas de hidrodinámica.', topics: ['hidrodinamica'], prio: null },
        ],
      },
      {
        id: 'c1-calor', name: { es: 'Calor', gn: 'Calor' },
        capacities: [
          { n: 12, text: 'Resuelve problemas de termometría, calorimetría y dilatación.', topics: ['termometria', 'calorimetria', 'dilatacion'], prio: 10 },
          { n: 13, text: 'Ejecuta experiencias sencillas de termometría y calorimetría (construcción de un termómetro, determinación del calor específico).', topics: ['termometria', 'calorimetria'], prio: null },
        ],
      },
    ],
    prioNote: { es: 'La Priorización 2021 no incluye hidrodinámica ni cantidad de movimiento: siguen en el programa completo.', gn: 'Priorización 2021 nombohéri hidrodinámica ha cantidad de movimiento: oĩ gueteri programa completo-pe.' },
  },
  {
    id: 'c2', grade: 2, plan: 'comun',
    name: { es: '2.º curso', gn: '2.º curso' },
    planName: { es: 'Plan Común', gn: 'Plan Común' },
    competency: 'comun',
    base: { source: 'A', pages: 'pp. 143-145' },
    prio: { source: 'B', pages: 'pp. impresas 66-67 / PDF 74-75' },
    scope: {
      es: 'Termodinámica, óptica, ondas y acústica, y electricidad.',
      gn: 'Termodinámica, óptica, onda ha acústica, ha electricidad.',
    },
    units: [
      {
        id: 'c2-termo', name: { es: 'Termodinámica', gn: 'Termodinámica' },
        capacities: [
          { n: 1, text: 'Resuelve problemas que requieren principios de la Termodinámica.', topics: ['termodinamica', 'procesos-gases'], prio: 1 },
          { n: 2, text: 'Ejecuta experiencias sencillas sobre transformaciones gaseosas.', topics: ['procesos-gases'], prio: null },
        ],
      },
      {
        id: 'c2-optica', name: { es: 'Óptica', gn: 'Óptica' },
        capacities: [
          { n: 3, text: 'Analiza características de la luz.', topics: ['luz'], prio: 2 },
          { n: 4, text: 'Resuelve problemas de reflexión.', topics: ['reflexion'], prio: 3 },
          { n: 5, text: 'Resuelve problemas de refracción.', topics: ['refraccion', 'lentes'], prio: 4 },
        ],
      },
      {
        id: 'c2-ondas', name: { es: 'Ondas y Acústica', gn: 'Onda ha Acústica' },
        capacities: [
          { n: 6, text: 'Ejecuta experiencias sobre ondas.', topics: ['ondas'], prio: 5 },
          { n: 7, text: 'Resuelve problemas de Acústica.', topics: ['acustica'], prio: 6 },
        ],
      },
      {
        id: 'c2-electricidad', name: { es: 'Electricidad', gn: 'Electricidad' },
        capacities: [
          { n: 8, text: 'Ejecuta experiencias de electrización.', topics: ['electrizacion'], prio: null },
          { n: 9, text: 'Aplica la Ley de Coulomb.', topics: ['coulomb'], prio: 7 },
          { n: 10, text: 'Resuelve problemas de campo eléctrico.', topics: ['campo-electrico'], prio: 8 },
          { n: 11, text: 'Analiza potencial eléctrico.', topics: ['potencial-electrico'], prio: null },
          { n: 12, text: 'Resuelve problemas de condensadores.', topics: ['condensadores'], prio: 9 },
          { n: 13, text: 'Resuelve situaciones de corriente eléctrica.', topics: ['corriente'], prio: 10 },
          { n: 14, text: 'Resuelve problemas de Ley de Ohm.', topics: ['ohm'], prio: 11 },
        ],
      },
    ],
    prioNote: { es: 'La Priorización 2021 no lista por separado las experiencias de transformaciones gaseosas, la electrización ni el potencial eléctrico: siguen en el programa completo.', gn: 'Priorización 2021 nombohérai transformación gaseosa, electrización ha potencial eléctrico: oĩ gueteri programa completo-pe.' },
  },
  {
    id: 'c3c', grade: 3, plan: 'comun',
    name: { es: '3.er curso', gn: '3.er curso' },
    planName: { es: 'Plan Común (Guía 2021)', gn: 'Plan Común (Guía 2021)' },
    competency: 'comun',
    base: null,
    prio: null,
    guideOnly: true,
    scope: {
      es: 'Termodinámica, óptica, ondas, sonido y electricidad, según el cronograma de la Guía 2021.',
      gn: 'Termodinámica, óptica, onda, sonido ha electricidad, Guía 2021 cronograma he’iháicha.',
    },
    units: [
      { id: 'c3c-calor', name: { es: 'Nivelación: calor', gn: 'Nivelación: calor' }, capacities: [{ n: null, text: 'Termometría, calorimetría; problemas de conversión entre escalas termométricas y calorimetría (nivelación C).', topics: ['termometria', 'calorimetria'], prio: null }] },
      { id: 'c3c-termo', name: { es: 'Termodinámica', gn: 'Termodinámica' }, capacities: [{ n: null, text: 'Procesos termodinámicos y principios termodinámicos (semanas 1-2).', topics: ['procesos-gases', 'termodinamica'], prio: null }] },
      { id: 'c3c-optica', name: { es: 'Óptica', gn: 'Óptica' }, capacities: [{ n: null, text: 'Naturaleza de la luz, reflexión, espejos, refracción y lentes (semanas 3-8).', topics: ['luz', 'reflexion', 'refraccion', 'lentes'], prio: null }] },
      { id: 'c3c-ondas', name: { es: 'Ondas y sonido', gn: 'Onda ha sonido' }, capacities: [{ n: null, text: 'Movimiento ondulatorio, fenómenos ondulatorios y sonido (semanas 9-12).', topics: ['ondas', 'acustica'], prio: null }] },
      { id: 'c3c-electricidad', name: { es: 'Electricidad', gn: 'Electricidad' }, capacities: [{ n: null, text: 'Ley de Coulomb, campo y potencial eléctrico, condensadores, corriente, circuito, Ohm y potencia (semanas 13-22).', topics: ['coulomb', 'campo-electrico', 'potencial-electrico', 'condensadores', 'corriente', 'ohm'], prio: null }] },
    ],
    guideNote: {
      es: 'La Guía 2021 rotula esta tabla como “Plan Común, Tercer curso”. No tiene correspondencia clara en el programa base ni en la Priorización 2021: se conserva tal cual, sin asumir equivalencias.',
      gn: 'Guía 2021 ombohéra ko tabla “Plan Común, Tercer curso”. Ndojojoguái porã programa base ha Priorización 2021 ndive: oñeñongatu he’iháicha, ndojeasumíri equivalencia.',
    },
  },
  {
    id: 'c3e', grade: 3, plan: 'especifico',
    name: { es: '3.er curso', gn: '3.er curso' },
    planName: { es: 'Plan Específico · Ciencias Básicas', gn: 'Plan Específico · Ciencias Básicas' },
    competency: 'especifico',
    base: { source: 'A', pages: 'pp. 251-253' },
    prio: { source: 'B', pages: 'p. impresa 91 / PDF 99' },
    scope: {
      es: 'Mecánica con problemas de complejidad progresiva, gravitación, calor, electricidad y magnetismo, relatividad y mecánica cuántica.',
      gn: 'Mecánica problema hasyvéva reheve, gravitación, calor, electricidad ha magnetismo, relatividad ha mecánica cuántica.',
    },
    units: [
      {
        id: 'c3e-mecanica', name: { es: 'Mecánica', gn: 'Mecánica' },
        capacities: [
          { n: 1, text: 'Aplica expresiones físicas de distintos movimientos a problemas de complejidad progresiva (MRU, MUV, vertical en el vacío, parabólico y circular).', topics: ['mru', 'mruv', 'caida-libre', 'movimiento-parabolico', 'movimiento-circular'], prio: 1 },
          { n: 2, text: 'Resuelve problemas de complejidad progresiva con las leyes de Newton.', topics: ['newton'], prio: 2 },
          { n: 3, text: 'Resuelve problemas de equilibrio de fuerzas (fuerzas paralelas y de sentidos contrarios; momento de una fuerza).', topics: ['equilibrio'], prio: 3 },
          { n: 4, text: 'Resuelve problemas de trabajo, potencia y energía.', topics: ['energia'], prio: 4 },
          { n: 5, text: 'Plantea problemas y soluciones con los principios de Pascal y Arquímedes.', topics: ['hidrostatica', 'arquimedes'], prio: 5 },
          { n: 6, text: 'Interpreta la Ley de Gravitación Universal y las leyes de Kepler (Primera y Segunda Ley).', topics: ['gravitacion'], prio: 6 },
        ],
      },
      {
        id: 'c3e-calor', name: { es: 'Calor', gn: 'Calor' },
        capacities: [
          { n: 7, text: 'Resuelve problemas de termometría y calorimetría (equivalente mecánico del calor y equilibrio térmico de mezclas).', topics: ['termometria', 'calorimetria'], prio: 7 },
          { n: 8, text: 'Aplica relaciones entre escalas Celsius, Fahrenheit y Kelvin a problemas.', topics: ['termometria'], prio: null },
        ],
      },
      {
        id: 'c3e-electro', name: { es: 'Electricidad y Magnetismo', gn: 'Electricidad ha Magnetismo' },
        capacities: [
          { n: 9, text: 'Comprende fenómenos de carga eléctrica.', topics: ['electrizacion'], prio: 8 },
          { n: 10, text: 'Resuelve problemas con la Ley de Coulomb.', topics: ['coulomb'], prio: 9 },
          { n: 11, text: 'Resuelve problemas con la Ley de Ohm (resistencias, asociaciones y circuitos).', topics: ['ohm', 'corriente'], prio: 10 },
          { n: 12, text: 'Resuelve problemas de campo magnético (imanes, Oersted y Ley de Ampère).', topics: ['magnetismo'], prio: 11 },
        ],
      },
      {
        id: 'c3e-moderna', name: { es: 'Relatividad y Mecánica Cuántica', gn: 'Relatividad ha Mecánica Cuántica' },
        capacities: [
          { n: 13, text: 'Interpreta la Teoría de la Relatividad.', topics: ['relatividad'], prio: null },
          { n: 14, text: 'Analiza postulados de Mecánica Cuántica.', topics: ['cuantica'], prio: null },
        ],
      },
    ],
    prioNote: { es: 'La Priorización 2021 no lista Relatividad ni Mecánica Cuántica, y la Guía 2021 no las calendariza: siguen en el programa completo.', gn: 'Priorización 2021 ha Guía 2021 nombohéri Relatividad ha Mecánica Cuántica: oĩ gueteri programa completo-pe.' },
  },
];

// Cronogramas de la Guía de planificación 2021 (doc C). Fechas del calendario
// lectivo 2021: históricas, se muestran como referencia de orden y ritmo.
// kind: 'nivelacion' (A-F), 'capacidad' (1-22), 'etapa' (repaso/evaluación).
export const GUIDE_SCHEDULES = {
  c2: {
    label: { es: 'Guía 2021 · Plan Común, 2.º curso', gn: 'Guía 2021 · Plan Común, 2.º curso' },
    pages: 'pp. impresas 110-113 / PDF 120-123',
    note: {
      es: 'Ojo: la Guía 2021 ubica en 2.º curso temas de mecánica y calor que el programa base pone en 1.er curso. Se muestra tal como la publicó el MEC.',
      gn: 'Ejesareko: Guía 2021 omoĩ 2.º curso-pe mecánica ha calor, programa base omoĩva 1.er curso-pe. Ojehechauka MEC omoherakuãháicha.',
    },
    weeks: [
      { kind: 'nivelacion', code: 'A', dates: '2-5 marzo', text: 'Reencuentro; cuidados para clases presenciales, protocolos, horarios y conversatorio sobre 2020.', topics: [] },
      { kind: 'nivelacion', code: 'B', dates: '8-12 marzo', text: 'Diagnóstico por áreas y nivelación.', topics: [] },
      { kind: 'nivelacion', code: 'C', dates: '8-12 marzo', text: 'Introducción a la Física: conceptos básicos, componente y objeto de estudio.', topics: ['magnitudes'] },
      { kind: 'nivelacion', code: 'D', dates: '19-23 abril', text: 'MRU y MRUV; situaciones horizontales y verticales.', topics: ['mru', 'mruv'] },
      { kind: 'nivelacion', code: 'E', dates: '30 agosto-3 septiembre', text: 'Leyes de Newton; fuerzas de campo y contacto, masas acopladas, plano inclinado y polea.', topics: ['newton'] },
      { kind: 'nivelacion', code: 'F', dates: '27 septiembre-1 octubre', text: 'Hidrostática; Pascal, Stevin y Arquímedes.', topics: ['hidrostatica', 'arquimedes'] },
      { kind: 'capacidad', code: 1, dates: '15-19 marzo', text: 'Reconoce magnitudes físicas.', topics: ['magnitudes'] },
      { kind: 'capacidad', code: 2, dates: '22-26 marzo', text: 'Vectores y operaciones.', topics: ['vectores'] },
      { kind: 'capacidad', code: 3, dates: '28 marzo-2 abril', text: 'Características de movimientos y velocidad media.', topics: ['cinematica'] },
      { kind: 'capacidad', code: 4, dates: '5-9 abril', text: 'MRU.', topics: ['mru'] },
      { kind: 'capacidad', code: 5, dates: '12-16 abril', text: 'MRUV (la fuente agrega “MUA y MUR”).', topics: ['mruv'] },
      { kind: 'capacidad', code: 6, dates: '26-30 abril', text: 'Movimiento vertical en el vacío: lanzamiento hacia arriba y hacia abajo, con y sin velocidad inicial.', topics: ['caida-libre'] },
      { kind: 'capacidad', code: 7, dates: '3-7 mayo', text: 'Equilibrio: fuerzas concurrentes y paralelas.', topics: ['equilibrio'] },
      { kind: 'capacidad', code: 8, dates: '10-13 mayo', text: 'Momento de una fuerza.', topics: ['equilibrio'] },
      { kind: 'capacidad', code: 9, dates: '17-21 mayo', text: 'Momento resultante.', topics: ['equilibrio'] },
      { kind: 'capacidad', code: 10, dates: '24-28 mayo', text: 'Elasticidad, Ley de Hooke.', topics: ['elasticidad'] },
      { kind: 'capacidad', code: 11, dates: '31 mayo-4 junio', text: 'Leyes o principios de Newton.', topics: ['newton'] },
      { kind: 'capacidad', code: 12, dates: '7-11 junio', text: 'Tipos de fuerza de campo y contacto; masas acopladas.', topics: ['newton'] },
      { kind: 'etapa', code: null, dates: '14 junio-6 agosto', text: 'Repaso, evaluaciones y retroalimentación de la primera etapa.', topics: [] },
      { kind: 'capacidad', code: 13, dates: '9-13 agosto', text: 'Plano inclinado y polea.', topics: ['newton'] },
      { kind: 'capacidad', code: 14, dates: '16-20 agosto', text: 'Trabajo mecánico de fuerza constante y variable.', topics: ['energia'] },
      { kind: 'capacidad', code: 15, dates: '23-27 agosto', text: 'Potencia mecánica media e instantánea; rendimiento.', topics: ['energia'] },
      { kind: 'capacidad', code: 16, dates: '6-10 septiembre', text: 'Transformaciones de energía potencial, cinética y mecánica; sistemas conservativos y no conservativos.', topics: ['energia'] },
      { kind: 'capacidad', code: 17, dates: '13-17 septiembre', text: 'Densidad y presión.', topics: ['hidrostatica'] },
      { kind: 'capacidad', code: 18, dates: '20-24 septiembre', text: 'Pascal y Teorema de Stevin.', topics: ['hidrostatica'] },
      { kind: 'capacidad', code: 19, dates: '4-8 octubre', text: 'Teorema de Arquímedes.', topics: ['arquimedes'] },
      { kind: 'capacidad', code: 20, dates: '11-15 octubre', text: 'Calor y temperatura.', topics: ['termometria'] },
      { kind: 'capacidad', code: 21, dates: '18-22 octubre', text: 'Calorimetría.', topics: ['calorimetria'] },
      { kind: 'capacidad', code: 22, dates: '25-29 octubre', text: 'Dilatometría.', topics: ['dilatacion'] },
      { kind: 'etapa', code: null, dates: '1-30 noviembre', text: 'Repaso y evaluaciones de cierre de la segunda etapa.', topics: [] },
    ],
  },
  c3c: {
    label: { es: 'Guía 2021 · Plan Común, 3.er curso', gn: 'Guía 2021 · Plan Común, 3.er curso' },
    pages: 'pp. impresas 114-117 / PDF 124-127',
    note: null,
    weeks: [
      { kind: 'nivelacion', code: 'A', dates: '2-5 marzo', text: 'Reencuentro y cuidados/protocolos.', topics: [] },
      { kind: 'nivelacion', code: 'B', dates: '8-12 marzo', text: 'Diagnóstico y nivelación.', topics: [] },
      { kind: 'nivelacion', code: 'C', dates: '8-12 marzo', text: 'Termometría, calorimetría; conversión entre escalas termométricas y calorimetría.', topics: ['termometria', 'calorimetria'] },
      { kind: 'nivelacion', code: 'D', dates: '19-23 abril', text: 'Reflexión y espejos; problemas progresivos.', topics: ['reflexion'] },
      { kind: 'nivelacion', code: 'E', dates: '30 agosto-3 septiembre', text: 'Campo y potencial eléctricos.', topics: ['campo-electrico', 'potencial-electrico'] },
      { kind: 'nivelacion', code: 'F', dates: '27 septiembre-1 octubre', text: 'Condensadores en serie y paralelo.', topics: ['condensadores'] },
      { kind: 'capacidad', code: 1, dates: '15-19 marzo', text: 'Procesos termodinámicos isotérmico, isobárico, isocórico y adiabático.', topics: ['procesos-gases'] },
      { kind: 'capacidad', code: 2, dates: '22-26 marzo', text: 'Principios termodinámicos.', topics: ['termodinamica'] },
      { kind: 'capacidad', code: 3, dates: '29 marzo-2 abril', text: 'Naturaleza de la luz.', topics: ['luz'] },
      { kind: 'capacidad', code: 4, dates: '5-9 abril', text: 'Reflexión.', topics: ['reflexion'] },
      { kind: 'capacidad', code: 5, dates: '12-16 abril', text: 'Espejos: tipos y características.', topics: ['reflexion'] },
      { kind: 'capacidad', code: 6, dates: '26-30 abril', text: 'Espejos esféricos: elementos, ecuaciones, condiciones de Gauss e imágenes.', topics: ['reflexion'] },
      { kind: 'capacidad', code: 7, dates: '3-7 mayo', text: 'Refracción.', topics: ['refraccion'] },
      { kind: 'capacidad', code: 8, dates: '10-13 mayo', text: 'Lentes.', topics: ['lentes'] },
      { kind: 'capacidad', code: 9, dates: '17-21 mayo', text: 'Movimiento ondulatorio: período, longitud de onda, amplitud y velocidad.', topics: ['ondas'] },
      { kind: 'capacidad', code: 10, dates: '24-28 mayo', text: 'Fenómenos ondulatorios.', topics: ['ondas'] },
      { kind: 'capacidad', code: 11, dates: '31 mayo-4 junio', text: 'Cualidades y propagación del sonido.', topics: ['acustica'] },
      { kind: 'capacidad', code: 12, dates: '7-11 junio', text: 'Fenómenos propios del sonido.', topics: ['acustica'] },
      { kind: 'etapa', code: null, dates: '14 junio-6 agosto', text: 'Repaso, evaluaciones y retroalimentación de la primera etapa.', topics: [] },
      { kind: 'capacidad', code: 13, dates: '9-13 agosto', text: 'Ley de Coulomb.', topics: ['coulomb'] },
      { kind: 'capacidad', code: 14, dates: '16-20 agosto', text: 'Campo eléctrico.', topics: ['campo-electrico'] },
      { kind: 'capacidad', code: 15, dates: '23-27 agosto', text: 'Potencial eléctrico.', topics: ['potencial-electrico'] },
      { kind: 'capacidad', code: 16, dates: '6-10 septiembre', text: 'Condensadores en serie.', topics: ['condensadores'] },
      { kind: 'capacidad', code: 17, dates: '13-17 septiembre', text: 'Condensadores en paralelo.', topics: ['condensadores'] },
      { kind: 'capacidad', code: 18, dates: '20-24 septiembre', text: 'Corriente eléctrica: sentido real y convencional, intensidad, tipos y efectos.', topics: ['corriente'] },
      { kind: 'capacidad', code: 19, dates: '4-8 octubre', text: 'Circuito eléctrico: elementos y aplicaciones de la corriente.', topics: ['corriente'] },
      { kind: 'capacidad', code: 20, dates: '11-15 octubre', text: 'Resistencia eléctrica y Leyes de Ohm.', topics: ['ohm'] },
      { kind: 'capacidad', code: 21, dates: '18-22 octubre', text: 'Asociación de resistencias.', topics: ['ohm'] },
      { kind: 'capacidad', code: 22, dates: '25-29 octubre', text: 'Potencia disipada en resistores.', topics: ['ohm'] },
      { kind: 'etapa', code: null, dates: '1-30 noviembre', text: 'Repaso y evaluaciones de la segunda etapa.', topics: [] },
    ],
  },
  c3e: {
    label: { es: 'Guía 2021 · Plan Específico, 3.er curso', gn: 'Guía 2021 · Plan Específico, 3.er curso' },
    pages: 'pp. impresas 207-210 / PDF 217-220',
    note: {
      es: 'La Guía 2021 llega hasta la Ley de Ampère: no calendariza Relatividad ni Mecánica Cuántica.',
      gn: 'Guía 2021 og̃uahẽ Ley de Ampère peve: nomoĩri Relatividad ha Mecánica Cuántica.',
    },
    weeks: [
      { kind: 'nivelacion', code: 'A', dates: '2-5 marzo', text: 'Reencuentro y cuidados/protocolos.', topics: [] },
      { kind: 'nivelacion', code: 'B', dates: '8-12 marzo', text: 'Diagnóstico y nivelación.', topics: [] },
      { kind: 'nivelacion', code: 'C', dates: '8-12 marzo', text: 'Recuperación de leyes de Newton, plano inclinado y polea; problemas progresivos.', topics: ['newton'] },
      { kind: 'nivelacion', code: 'D', dates: '19-23 abril', text: 'Movimiento parabólico; problemas progresivos.', topics: ['movimiento-parabolico'] },
      { kind: 'nivelacion', code: 'E', dates: '30 agosto-3 septiembre', text: 'Principio de Arquímedes; problemas progresivos.', topics: ['arquimedes'] },
      { kind: 'nivelacion', code: 'F', dates: '27 septiembre-1 octubre', text: 'Electrostática.', topics: ['electrizacion', 'coulomb'] },
      { kind: 'capacidad', code: 1, dates: '15-19 marzo', text: 'MRU.', topics: ['mru'] },
      { kind: 'capacidad', code: 2, dates: '22-26 marzo', text: 'MRUV.', topics: ['mruv'] },
      { kind: 'capacidad', code: 3, dates: '29 marzo-2 abril', text: 'Movimiento vertical en el vacío.', topics: ['caida-libre'] },
      { kind: 'capacidad', code: 4, dates: '5-9 abril', text: 'Movimiento parabólico.', topics: ['movimiento-parabolico'] },
      { kind: 'capacidad', code: 5, dates: '12-16 abril', text: 'Movimiento circular.', topics: ['movimiento-circular'] },
      { kind: 'capacidad', code: 6, dates: '26-30 abril', text: 'Leyes de Newton, masas acopladas y plano inclinado.', topics: ['newton'] },
      { kind: 'capacidad', code: 7, dates: '3-7 mayo', text: 'Equilibrio: fuerzas paralelas del mismo sentido y de sentido contrario.', topics: ['equilibrio'] },
      { kind: 'capacidad', code: 8, dates: '10-13 mayo', text: 'Momento de una fuerza y fuerza resultante.', topics: ['equilibrio'] },
      { kind: 'capacidad', code: 9, dates: '17-21 mayo', text: 'Trabajo motor y resistente.', topics: ['energia'] },
      { kind: 'capacidad', code: 10, dates: '24-28 mayo', text: 'Potencia mecánica.', topics: ['energia'] },
      { kind: 'capacidad', code: 11, dates: '31 mayo-4 junio', text: 'Energía potencial, cinética y mecánica.', topics: ['energia'] },
      { kind: 'capacidad', code: 12, dates: '7-11 junio', text: 'Principio de Pascal.', topics: ['hidrostatica'] },
      { kind: 'etapa', code: null, dates: '14 junio-6 agosto', text: 'Repaso, evaluaciones y retroalimentación de la primera etapa.', topics: [] },
      { kind: 'capacidad', code: 13, dates: '9-13 agosto', text: 'Principio o Teorema de Arquímedes.', topics: ['arquimedes'] },
      { kind: 'capacidad', code: 14, dates: '16-20 agosto', text: 'Ley de Gravitación Universal.', topics: ['gravitacion'] },
      { kind: 'capacidad', code: 15, dates: '23-27 agosto', text: 'Ley de Kepler.', topics: ['gravitacion'] },
      { kind: 'capacidad', code: 16, dates: '6-10 septiembre', text: 'Termometría.', topics: ['termometria'] },
      { kind: 'capacidad', code: 17, dates: '13-17 septiembre', text: 'Calorimetría.', topics: ['calorimetria'] },
      { kind: 'capacidad', code: 18, dates: '20-24 septiembre', text: 'Electrostática.', topics: ['electrizacion'] },
      { kind: 'capacidad', code: 19, dates: '4-8 octubre', text: 'Ley de Coulomb.', topics: ['coulomb'] },
      { kind: 'capacidad', code: 20, dates: '11-15 octubre', text: 'Ley de Ohm y circuito eléctrico.', topics: ['ohm', 'corriente'] },
      { kind: 'capacidad', code: 21, dates: '18-22 octubre', text: 'Campo magnético.', topics: ['magnetismo'] },
      { kind: 'capacidad', code: 22, dates: '24-29 octubre', text: 'Ley de Ampère.', topics: ['magnetismo'] },
      { kind: 'etapa', code: null, dates: '1-30 noviembre', text: 'Repaso y evaluaciones de cierre de la segunda etapa.', topics: [] },
    ],
  },
};

export const GUIDE_C1_NOTE = {
  es: 'La Guía 2021 no trae un cronograma de Física para 1.er curso.',
  gn: 'Guía 2021 nderekói cronograma Física 1.er curso-pe g̃uarã.',
};

export const courseById = id => COURSES.find(course => course.id === id) ?? null;

/** Todos los lugares del currículo donde aparece un tema (curso, unidad,
 * capacidad, priorización y semanas de la Guía 2021). */
export function topicPlacements(topicId) {
  const placements = [];
  for (const course of COURSES) {
    for (const unit of course.units) {
      for (const capacity of unit.capacities) {
        if (capacity.topics.includes(topicId)) placements.push({ course, unit, capacity });
      }
    }
  }
  return placements;
}

export function topicGuideWeeks(topicId) {
  return Object.entries(GUIDE_SCHEDULES).flatMap(([courseId, schedule]) => schedule.weeks
    .filter(week => week.topics.includes(topicId))
    .map(week => ({ courseId, schedule, week })));
}

/** Temas de un curso en el orden del programa (sin repetir). */
export function courseTopicIds(courseId) {
  const course = courseById(courseId);
  if (!course) return [];
  return [...new Set(course.units.flatMap(unit => unit.capacities.flatMap(capacity => capacity.topics)))];
}
