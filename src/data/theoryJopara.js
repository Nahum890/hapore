// Versión Jopara revisada para el curso de movimiento parabólico.
// Las ecuaciones y el orden de las opciones permanecen iguales al original.
export const THEORY_JOPARA = {
  fundamento: {
    title: 'Movimiento horizontal ha vertical oñondive',
    tagline: 'Galileo remiandu ha movimiento mokõi eje-pe',
    mecCap: 'MEC Res. 12506 (pág. 251): Movimiento compuesto ha trayectoria independiente rehegua.',
    objective: 'Jaikuaa hag̃ua mba’érepa peteĩ lanzamiento oblicuo oguereko MRU horizontal ha MRUV vertical, ojoavy’ỹre ojuehegui.',
    content: [
      'Movimiento parabólico-pe, peteĩ mba’e oho simultáneamente tenonde gotyo ha yvate/ypy gotyo. Galileo omyesakã ko’ã mokõi movimiento ikatuha oñemyesakã por separado: peteĩva nombyai ambuépe.',
      'Eje horizontal X-pe, ndaha’éiramo viento térã resistencia del aire, ndaipóri fuerza ombopya’éva pe mba’e. Upévare vx opyta constante: kóva hína MRU.',
      'Eje vertical Y-pe, gravedad ogueraha pe mba’e yvýpe. Pe aceleración hína ay = −g; upévare vy okambia opa segundo-pe. Kóva hína MRUV.',
      'Jahechauka oñondive pe avance horizontal ha pe subida/je’ỹ vertical, ha osẽ peteĩ trayectoria curva hérava parábola.',
    ],
    formulas: [
      { name: 'Posición horizontal (MRU)', detail: 'x(t) ha’e pe posición metro-pe; vx opyta peteĩcha; t ha’e tiempo segundo-pe.' },
      { name: 'Posición vertical (MRUV)', detail: 'y(t) ha’e altura; vy0 ha’e velocidad vertical inicial; g ha’e gravedad (9,8 m/s²).' },
    ],
    examNote: 'Javy ojehechavéva: ñaimo’ã aceleración ohoha pe curva rapykuéri. Nahániri: gravedad añoite omoacelera ha katuete verticalmente yvý gotyo.',
    questions: [
      { prompt: 'Aire resistencia nañaconsideráiramo, ¿mba’éichapa aceleración horizontal?', options: [
        { text: 'Ndaipóri: ax = 0 m/s².', explanation: 'Iporã. Ndaha’éi fuerza horizontal, upévare vx opyta constante ha ax = 0.' },
        { text: 'Oguejy 9,8 m/s² segundo-re.', explanation: 'Nahániri. 9,8 m/s² gravedad ha’e ha oactúa eje vertical-pe.' },
        { text: 'Oñemongakuaa pe mba’e masa reheve.', explanation: 'Nahániri. Modelo ideal-pe ndaipóri aceleración horizontal, ha masa nokambiái gravedad.' },
      ] },
      { prompt: 'Esfera A oñemombo horizontalmente mesa ári; esfera B ojeheja ho’a peteĩ altura-gui, peteĩ tiempo-pe. ¿Máva og̃uahẽ yvýpe raẽ?', options: [
        { text: 'B, pórke ndaikatúi tenonde gotyo.', explanation: 'Nahániri. Pe avance horizontal ndohupytyi pe je’ỹ tiempo.' },
        { text: 'Mokõive peteĩ tiempo-pe.', explanation: 'Iporã. Mokõive oguereko peteĩchagua movimiento vertical; horizontal ndombopukuái je’ỹ.' },
        { text: 'A, pórke oguereko energía horizontal.', explanation: 'Nahániri. Velocidad horizontal nomboacelerái pe caída.' },
      ] },
    ],
  },
  descomposicion: {
    title: 'Velocidad oñemboja’o componente-pe',
    tagline: 'Trigonometría ohechauka mba’éichapa oñemboja’o v0',
    mecCap: 'MEC Res. 12506 (pág. 251): Vector ha componente perpendicular rehegua.',
    objective: 'Ñacalcula hag̃ua vx ha vy0, jaipuru v0 ha pe ángulo θ.',
    content: [
      'Pe mba’e osẽvo, oguereko velocidad inicial v0 ha ángulo θ horizontal rehe. Pe velocidad ohechauka moõ gotyopa ha mboy pya’épa oñemombo.',
      'Jaikuaa hag̃ua mboýpa oho tenonde ha yvate, ñamboja’o velocidad mokõi eje perpendicular-pe: horizontal X ha vertical Y.',
      'Componente horizontal ha’e vx = v0 · cos(θ). Gravedad ndoactuái X-pe, upévare vx opyta peteĩcha vuelo pukukue.',
      'Componente vertical inicial ha’e vy0 = v0 · sen(θ). Gravedad omboguejy vy mbeguekatúpe pe mba’e og̃uahẽ meve yvatevépe.',
    ],
    formulas: [
      { name: 'Velocidad horizontal constante', detail: 'Pe mba’e oho tenonde gotyo ko rapidez reheve; ndokambiái vuelo aja.' },
      { name: 'Velocidad vertical inicial (t = 0)', detail: 'Pe componente yvate gotyo oñepyrũvo; upe rire gravedad omboguejy.' },
      { name: 'Rapidez peteĩ instante-pe', detail: 'Rapidez total ojejuhu oñembojoajúvo componente horizontal ha vertical.' },
    ],
    examNote: 'Ema’ẽ calculadora-pe: ejercicio ome’ẽramo grados, eipuru modo DEG. Ani rembojoavy seno ha coseno: coseno horizontal, seno vertical.',
    questions: [
      { prompt: 'Dron oñemombo v0 = 20 m/s ha ángulo 30° reheve. ¿Mboýpa pe velocidad horizontal?', options: [
        { text: '10 m/s', explanation: 'Nahániri. 10 m/s ha’e componente vertical: 20 · sen(30°).' },
        { text: '17,32 m/s', explanation: 'Iporã. vx = 20 · cos(30°) ≈ 17,32 m/s.' },
        { text: '20 m/s', explanation: 'Nahániri. 20 m/s ha’e velocidad total, ndaha’éi componente horizontal.' },
      ] },
      { prompt: 'Ángulo ojupi 20° guive 70° peve, v0 opyta peteĩcha. ¿Mba’épa oiko vx ha vy0 rehe?', options: [
        { text: 'vx michĩve ha vy0 tuichave.', explanation: 'Iporã. coseno michĩve, ha seno tuichave ángulo ojupívo.' },
        { text: 'Mokõive tuichave.', explanation: 'Nahániri. v0 opyta peteĩcha; peteĩ componente ojupívo, ambuéva oguejy.' },
        { text: 'vx tuichave ha vy0 michĩve.', explanation: 'Nahániri. Ángulo ojupívo, coseno oguejy ha seno ojupi.' },
      ] },
    ],
  },
  'altura-maxima': {
    title: 'Yvatevévo ha altura máxima',
    tagline: 'Vy og̃uahẽ cero-pe pe trayectoria ári yvatevévo',
    mecCap: 'MEC Res. 12506 (pág. 251): Altura máxima ha tiempo de subida rehegua.',
    objective: 'Jaipuru hag̃ua vy = 0 pe mba’e og̃uahẽvo altura máxima-pe, ha ñacalcula Hmax.',
    content: [
      'Oho aja yvate gotyo, gravedad omboguejy pe velocidad vertical. Fórmula: vy(t) = vy0 − g · t.',
      'Pe punto yvatevévape, mba’e noñemomýivéima yvate gotyo peteĩ instante-pe. Upépe vy = 0; pe movimiento horizontal katu osegi.',
      'Ñamoĩ vy = 0 fórmula-pe: pe tiempo de subida hína t = vy0 / g = v0 · sen(θ) / g.',
      'Pe altura máxima pe punto oñemombo haguégui: Hmax = (v0² · sen²(θ)) / (2 · g).',
    ],
    formulas: [
      { name: 'Tiempo og̃uahẽ hag̃ua yvatevévo', detail: 'Ojejuhu vy0 oñemboja’óvo gravedad rehe.' },
      { name: 'Altura máxima', detail: 'Altura oñemedi pe oñepyrũ hague guive, vuelo ideal-pe.' },
    ],
    examNote: 'Punto yvatevévape vy = 0 peteĩ instante-pe, péro gravedad osegi: ay = −g. Pe mba’e ndojejokói, osegi horizontalmente.',
    questions: [
      { prompt: 'v0 = 19,6 m/s, θ = 45° ha g = 9,8 m/s². ¿Mboýpa altura máxima?', options: [
        { text: '9,8 m', explanation: 'Iporã. Hmax = (19,6² · sen²45°) / (2 · 9,8) = 9,8 m.' },
        { text: '19,6 m', explanation: 'Nahániri. Ehecha jey sen² ha pe división 2g rehe.' },
        { text: '4,9 m', explanation: 'Nahániri. Nemandu’áke sen²45° = 0,5.' },
      ] },
      { prompt: '¿Mba’épa pe aceleración pe punto yvatevévape?', options: [
        { text: '0 m/s²', explanation: 'Nahániri. Vy añoite ha’e cero; gravedad osegi oactúa.' },
        { text: '9,8 m/s² yvý gotyo.', explanation: 'Iporã. Aceleración gravitatoria opyta peteĩcha vuelo aja.' },
        { text: 'Oñekambia horizontal gotyo.', explanation: 'Nahániri. Modelo ideal-pe aceleración oho verticalmente yvý gotyo.' },
      ] },
    ],
  },
  'tiempo-vuelo': {
    title: 'Vuelo tiempo ha simetría',
    tagline: 'Mboýpa ipuku vuelo ha mba’éichapa ojojogua subida ha je’ỹ',
    mecCap: 'MEC Res. 12506 (pág. 251): Tiempo de vuelo ha simetría rehegua.',
    objective: 'Jaikuaa hag̃ua terreno peteĩcha ári, tiempo de subida ha je’ỹ ha’e peteĩcha, ha ñacalcula vuelo pukukue.',
    content: [
      'Pe tiempo de vuelo oñepyrũ lanzamiento-pe ha opa pe mba’e og̃uahẽvo yvýpe. Ko fórmula ovale oñemombo ha ho’a peteĩ altura-pe: T = 2 · vy0 / g.',
      'Pe mba’e ojupi ha oguejy aja, gravedad ombojoja umi tiempo: t subida = t je’ỹ = T/2.',
      'Punto yvatevévape vy = 0; upéi velocidad vertical oñembohape yvý gotyo, ha horizontal opyta constante.',
      'Ho’a jave peteĩ nivel-pe, pe rapidez total ikatu ojogua pe oñepyrũ haguépe, péro vy oñemohenda yvý gotyo.',
    ],
    formulas: [
      { name: 'Tiempo total yvy peteĩchagua ári', detail: 'Ovale y0 = yf; oñemombo ha ho’a peteĩ altura-pe.' },
      { name: 'Simetría del tiempo', detail: 'Tiempo ojupi hag̃ua ha tiempo oguejy hag̃ua peteĩcha.' },
    ],
    examNote: 'T = 2 · vy0 / g ovale añoite oñepyrũ ha opa peteĩ altura-pe. Oñemombo yvate guive ramo, eipuru ecuación cuadrática completa.',
    questions: [
      { prompt: 'Dron oñemombo terreno plano-gui: v0 = 20 m/s, 30° ha g = 10 m/s². ¿Mboýpa vuelo tiempo?', options: [
        { text: '1 segundo', explanation: 'Nahániri. 1 segundo hína tiempo de subida añoite.' },
        { text: '2 segundos', explanation: 'Iporã. vy0 = 20 · sen30° = 10; T = 2 · 10 / 10 = 2 s.' },
        { text: '4 segundos', explanation: 'Nahániri. Eipuru T = 2 · vy0 / g.' },
      ] },
      { prompt: 'Pe mba’e ojupi 3 segundo ha ho’a pe oñemombo haguépe. ¿Mboýpa oguejy?', options: [
        { text: 'Sa’ive 3 segundo-gui.', explanation: 'Nahániri. Terreno peteĩcha ári, subida ha je’ỹ tiempo ojoja.' },
        { text: '3 segundo.', explanation: 'Iporã. Simetría rupive t subida = t je’ỹ.' },
        { text: 'Odepende pe mba’e ipohýi rehe.', explanation: 'Nahániri. Gravedad-pe masa ndoikéi ko tiempo-pe.' },
      ] },
    ],
  },
  alcance: {
    title: 'Alcance horizontal ha ángulo iporãvéva',
    tagline: 'Mba’éichapa ojejuhu distancia ha 45°',
    mecCap: 'MEC Res. 12506 (pág. 251): Alcance horizontal máximo rehegua.',
    objective: 'Jahechauka hag̃ua 45° ome’ẽ alcance tuichavéva yvy peteĩcha ári, v0 opyta jave peteĩcha.',
    content: [
      'Alcance R ha’e pe distancia horizontal pe mba’e og̃uahẽ meve yvýpe. Jaipuru R = vx · T, pórke vx opyta constante.',
      'Ñamoĩ fórmula-kuéra: R = (v0² / g) · 2 · sen(θ) · cos(θ).',
      'Identidad 2 · sen(θ) · cos(θ) = sen(2θ) rupive: R = (v0² · sen(2θ)) / g.',
      'Alcance tuichave hag̃ua, sen(2θ) tuichave va’erã. Pe valor máximo ha’e 1; upéva oiko 2θ = 90° jave, upévare θ = 45°.',
      'Upéicha 45° ha’e ángulo óptimo alcance-pe g̃uarã, aire resistencia’ỹre ha yvy peteĩcha ári.',
    ],
    formulas: [
      { name: 'Alcance horizontal', detail: 'Ovale oñemombo ha ho’a peteĩ nivel-pe, ha ndaipóri aire resistencia.' },
      { name: 'Alcance máximo (45°)', detail: 'Pe fórmula ohechauka Rmax, ángulo ha velocidad inicial reheve.' },
      { name: 'Altura ha alcance joaju 45°-pe', detail: 'Pe altura máxima ojoja R/4 ndive, modelo ideal-pe.' },
    ],
    examNote: 'Ángulo 45° añoite ome’ẽ alcance máximo oñemombo ha ho’a peteĩ nivel-pe. Yvate guive ramo, resultado ikatu iñambue.',
    questions: [
      { prompt: 'Puesto sanitario oĩ 40 m-pe. v0 = 20 m/s ha g = 10 m/s². ¿Mba’épa ángulo og̃uahẽ hag̃ua upépe?', options: [
        { text: '30°', explanation: 'Nahániri. 30°-pe R ≈ 34,64 m, ha mombyry’imi opyta.' },
        { text: '45°', explanation: 'Iporã. Rmax = 20² / 10 = 40 m; 45° rupive og̃uahẽ pe meta-pe.' },
        { text: '60°', explanation: 'Nahániri. 60°-pe sen120° = sen60°, upévare pe alcance ojogua 30°-pe; og̃uahẽ 34,6 m rupi.' },
      ] },
      { prompt: 'v0 oñembohetave mokõi jey, ángulo opyta peteĩcha. ¿Mba’épa oiko alcance rehe?', options: [
        { text: 'Oñembohetave 4 jey.', explanation: 'Iporã. R depende de v0²; mokõi jey velocidad = 4 jey alcance.' },
        { text: 'Oñembohetave 2 jey.', explanation: 'Nahániri. Pe velocidad oĩ cuadrado-pe: (2v0)² = 4v0².' },
        { text: 'Nokambiái.', explanation: 'Nahániri. Alcance ojupi velocidad inicial reheve.' },
      ] },
    ],
  },
  complementarios: {
    title: 'Ángulos complementarios ha simetría',
    tagline: 'Ángulos iñambuéva ikatu og̃uahẽ peteĩ distancia-pe',
    mecCap: 'MEC Res. 12506 (pág. 251): Ángulos complementarios ha alcance joja rehegua.',
    objective: 'Jaikuaa hag̃ua ángulos oñembojo’áramo 90° ome’ẽ alcance peteĩcha, péro altura ha tiempo iñambue.',
    content: [
      'Ángulos complementarios oñembojo’a ha ome’ẽ 90°. Techapyrã: 30° ha 60°.',
      'Alcance fórmula-pe oĩ sen(2θ). Ángulos complementarios-pe, sen(2θ) ha’e peteĩcha, upévare alcance joja.',
      'Trayectoria katu iñambue: ángulo tuichavéva ojupi yvateve ha opyta areve yvate gotyo.',
      'Pe regla ovale v0 peteĩcha, gravedad peteĩcha, oñemombo ha ho’a peteĩ nivel-pe, ha ndorekói viento.',
    ],
    formulas: [
      { name: 'Ángulos complementarios', detail: 'θ1 + θ2 = 90°; techapyrã 30° + 60° = 90°.' },
      { name: 'Alcance peteĩcha', detail: 'Ángulos complementarios ome’ẽ peteĩ alcance, v0 ha g opyta ramo peteĩcha.' },
    ],
    examNote: 'Alcance joja he’ise distancia peteĩcha, ndaha’éi trayectoria peteĩcha. Ángulo yvateve oguereko altura ha vuelo tiempo tuichave.',
    questions: [
      { prompt: 'Dron oho 35°-pe ha og̃uahẽ 37,6 m. ¿Mba’épa ambue ángulo ome’ẽta pe misma distancia, v0 peteĩcha reheve?', options: [
        { text: '55°', explanation: 'Iporã. 35° + 55° = 90°, ha mokõive alcance peteĩcha.' },
        { text: '35°', explanation: 'Ko ángulo ome’ẽta mismo alcance, péro oporandúva ambue ángulo.' },
        { text: '70°', explanation: 'Nahániri. Complementario 35° rehe ha’e 55°.' },
      ] },
      { prompt: 'Mokõi lanzamiento complementario 30° ha 60°-pe, v0 peteĩcha. ¿Máva opyta areve yvatekue?', options: [
        { text: '30°', explanation: 'Nahániri. Ángulo michĩve oguereko vy0 michĩve.' },
        { text: '60°', explanation: 'Iporã. 60° oguereko componente vertical tuichave, upévare vuelo ipukuve.' },
        { text: 'Oĩ peteĩcha yvatekue.', explanation: 'Nahániri. Alcance joja, péro altura ha vuelo tiempo iñambue.' },
      ] },
    ],
  },
  trayectoria: {
    title: 'Trayectoria ecuación cartesiana',
    tagline: 'Parábola y(x), tiempo’ỹre',
    mecCap: 'MEC Res. 12506 (pág. 251): Trayectoria cartesiána ha ecuación cuadrática rehegua.',
    objective: 'Ñamombyky hag̃ua tiempo parámetro ha jahecha y = f(x) estructura matemática.',
    content: [
      'Movimiento horizontal-pe, x = vx · t; ikatu ñaikytĩ t ha jajuhu t = x / vx.',
      'Ñamoĩ ko tiempo ecuación vertical-pe, osẽ y(x) = x · tan(θ) − (g · x²)/(2 · v0² · cos²θ).',
      'Pe término x · tan(θ) ohechauka pe inclinación inicial. Término x² ohechauka gravedad omoinge curva ha omboguejyha trayectoria.',
      'Ko función cuadrática ojapo parábola: oñepyrũ y = 0-pe, ojupi altura máxima peve, ha oguejy jey yvýpe.',
    ],
    formulas: [
      { name: 'Trayectoria ecuación y(x)', detail: 'Ohechauka altura y odependeha posición horizontal x rehe.' },
      { name: 'Términokuéra mba’épa he’ise', detail: 'x · tan(θ) ha’e inclinación inicial; término x² ha’e gravedad efecto.' },
    ],
    examNote: 'Término cuadrático oguereko v0 · cos(θ) oñemboja’o ha oñembohetave cuadrado-pe. Ani nderesarái cos(θ)² rehe.',
    questions: [
      { prompt: 'Ecuación y(x) = x · tan(θ) − B · x²-pe, ¿mba’épa ohechauka x · tan(θ) gravedad cero jave?', options: [
        { text: 'Línea recta con pendiente tan(θ).', explanation: 'Iporã. g = 0 jave término cuadrático opyta cero, ha oĩ peteĩ línea recta.' },
        { text: 'Círculo perfecto.', explanation: 'Nahániri. x · tan(θ) ha’e función lineal.' },
        { text: 'Punto opyta haguã.', explanation: 'Nahániri. vx osegi omomýi pe mba’e tenonde gotyo.' },
      ] },
      { prompt: 'Trayectoria ecuación-pe ñamoĩ y = 0. ¿Mba’épa he’ise mokõi solución x?', options: [
        { text: 'Ñepyrũha ha altura máxima.', explanation: 'Nahániri. Altura máxima-pe y tuichave; vy = 0.' },
        { text: 'Punto oñemombo ha punto ho’a haguépe.', explanation: 'Iporã. Parábola ohasa y = 0-pe oñepyrũ ha opa jave.' },
        { text: 'Tiempo ojupi ha tiempo oguejy.', explanation: 'Nahániri. x ha’e distancia metro-pe, ndaha’éi tiempo.' },
      ] },
    ],
  },
};

export function localizeTheoryModule(module, language) {
  if (language === 'es') return module;
  const translated = THEORY_JOPARA[module.id];
  if (!translated) return module;
  return {
    ...module,
    ...translated,
    formulas: module.formulas.map((formula, index) => ({ ...formula, ...translated.formulas[index], code: formula.code })),
    questions: module.questions.map((question, qIndex) => ({
      ...question,
      ...translated.questions[qIndex],
      options: question.options.map((option, optionIndex) => ({ ...option, ...translated.questions[qIndex].options[optionIndex] })),
    })),
  };
}
