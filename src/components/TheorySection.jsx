import { useEffect, useMemo, useState } from 'react';
import { Formula, MathText } from './MathText.jsx';
import Icon from './Icon.jsx';
import { readJSON, writeJSON } from '../utils/storage.js';

const STORAGE_KEY = 'guarania:theoryProgress:parabolic';

const MODULES = [
  {
    id: 'fundamento',
    number: '1.1',
    title: 'Fundamento e Independencia de Movimientos',
    tagline: 'El principio de Galileo y el movimiento bidimensional',
    mecCap: 'MEC Res. 12506 (pág. 251): Analiza las características de los movimientos compuestos y la independencia de trayectorias.',
    objective: 'Comprender por qué un cuerpo lanzado oblicuamente compone simultáneamente un MRU horizontal y un MRUV vertical sin interferirse.',
    content: [
      'El movimiento parabólico o tiro oblicuo es el ejemplo por excelencia de movimiento bidimensional en la física clásica. En el siglo XVII, Galileo Galilei formuló el Principio de Independencia de los Movimientos: cuando un cuerpo está sometido simultáneamente a dos o más movimientos elementales, cada uno de ellos se ejecuta de forma totalmente autónoma, como si los otros no existieran.',
      'En el eje horizontal (eje X), sobre el objeto no actúa ninguna fuerza neta en condiciones ideales (sin resistencia atmosférica). En virtud de la Primera Ley de Newton o Principio de Inercia, su velocidad horizontal permanece rigurosamente constante en todo momento, describiendo un Movimiento Rectilíneo Uniforme (MRU).',
      'En el eje vertical (eje Y), el objeto se halla inmerso en el campo gravitatorio de la Tierra. La atracción gravitatoria ejerce una fuerza constante hacia abajo igual a su peso (P = m · g), lo que genera una aceleración vertical uniforme hacia el suelo (ay = -g = -9,8 m/s²). Describe, por tanto, un Movimiento Rectilíneo Uniformemente Variado (MRUV).',
      'La combinación vectorial del avance uniforme en X y la caída acelerada en Y dibuja una curva matemática cuadrática: una parábola simétrica de concavidad hacia abajo.',
    ],
    formulas: [
      {
        name: 'Ecuación horaria en el eje horizontal (MRU)',
        code: 'x(t) = x0 + vx · t',
        meaning: 'x(t) es la posición horizontal en metros; vx es la velocidad horizontal constante; t es el tiempo transcurrido en segundos.',
      },
      {
        name: 'Ecuación horaria en el eje vertical (MRUV)',
        code: 'y(t) = y0 + vy0 · t - 0,5 · g · t²',
        meaning: 'y(t) es la cota vertical; vy0 es la velocidad vertical inicial; g es la aceleración gravitatoria (9,8 m/s²).',
      },
    ],
    examNote: 'Error frecuente en evaluaciones: suponer que la aceleración apunta en la dirección de la curva. La única aceleración existente es la gravitatoria, y es siempre estrictamente vertical descendente.',
    questions: [
      {
        id: 'q1-1',
        prompt: 'Si se desprecia la resistencia del aire, ¿cuál es la aceleración del proyectil en el eje horizontal?',
        options: [
          { text: 'Es nula (ax = 0 m/s²), porque no actúa ninguna fuerza horizontal.', correct: true, explanation: 'Correcto. Por la primera ley de Newton, sin fuerzas horizontales la velocidad vx se conserva constante y la aceleración ax es exactamente cero.' },
          { text: 'Disminuye a razón de 9,8 m/s².', correct: false, explanation: 'Incorrecto. La aceleración de 9,8 m/s² actúa exclusivamente en el eje vertical, no en el horizontal.' },
          { text: 'Aumenta proporcionalmente a la masa del proyectil.', correct: false, explanation: 'Incorrecto. La masa no interviene en la aceleración gravitatoria ni existe aceleración horizontal en el modelo ideal.' },
        ],
      },
      {
        id: 'q1-2',
        prompt: 'Una esfera A se dispara horizontalmente desde una mesa y en el mismo instante una esfera B se deja caer en reposo desde la misma altura. ¿Cuál toca primero el suelo?',
        options: [
          { text: 'La esfera B, porque solo recorre la distancia vertical sin tener que avanzar.', correct: false, explanation: 'Incorrecto. El movimiento vertical de ambas es idéntico porque parten con vy0 = 0 y caen bajo la misma aceleración g.' },
          { text: 'Llegan exactamente al mismo tiempo.', correct: true, explanation: 'Correcto. El avance horizontal de la esfera A no retarda su descenso vertical: ambas caen simultáneamente en virtud del principio de independencia de Galileo.' },
          { text: 'La esfera A, porque la velocidad horizontal le otorga mayor energía de caída.', correct: false, explanation: 'Incorrecto. La velocidad horizontal no aporta aceleración hacia abajo.' },
        ],
      },
    ],
  },
  {
    id: 'descomposicion',
    number: '1.2',
    title: 'Descomposición Vectorial del Lanzamiento',
    tagline: 'Distribución trigonométrica de la velocidad inicial',
    mecCap: 'MEC Res. 12506 (pág. 251): Resuelve problemas referidos a magnitudes vectoriales y proyecciones en componentes ortogonales.',
    objective: 'Determinar con precisión analítica las componentes ortogonales vx y vy0 a partir del módulo v0 y el ángulo de tiro θ.',
    content: [
      'Al momento del disparo, el proyectil abandona el punto de partida con una velocidad inicial de módulo v0, orientada con una inclinación angular θ respecto del plano horizontal.',
      'Dado que los cálculos de avance y elevación se resuelven en ejes perpendiculares independientes, es un paso obligado descomponer el vector velocidad inicial en sus dos componentes ortogonales utilizando trigonometría básica.',
      'El cateto adyacente al ángulo de tiro se ubica sobre el eje horizontal, por lo que la componente horizontal se obtiene mediante la función coseno: vx = v0 · cos(θ). Dado que no existe aceleración en X, esta componente conserva exactamente el mismo valor numérico durante todo el vuelo.',
      'El cateto opuesto al ángulo de tiro se ubica sobre el eje vertical, por lo que la velocidad vertical inicial se calcula con la función seno: vy0 = v0 · sen(θ). Esta componente disminuye de inmediato por la acción frenadora de la gravedad.',
    ],
    formulas: [
      {
        name: 'Componente horizontal de la velocidad',
        code: 'vx = v0 · cos(θ)',
        meaning: 'Velocidad constante de avance sobre el terreno. Válida para cualquier instante t.',
      },
      {
        name: 'Componente vertical en el origen (t = 0)',
        code: 'vy0 = v0 · sen(θ)',
        meaning: 'Impulso vertical inicial antes de que la aceleración gravitatoria comience a frenar la subida.',
      },
      {
        name: 'Módulo de velocidad en cualquier instante t',
        code: 'v(t) = √(vx² + vy(t)²)',
        meaning: 'Rapidez instantánea real del objeto en su trayectoria.',
      },
    ],
    examNote: 'Error frecuente en evaluaciones: usar radianes en la calculadora cuando el ejercicio indica grados sexagesimales, o confundir sen(θ) con cos(θ). Verificá que la calculadora esté configurada en modo DEG.',
    questions: [
      {
        id: 'q2-1',
        prompt: 'Se lanza un dron con v0 = 20 m/s formando un ángulo de 30° sobre la horizontal. ¿Cuánto vale su velocidad horizontal constante?',
        options: [
          { text: '10 m/s', correct: false, explanation: 'Incorrecto. 10 m/s corresponde a la componente vertical inicial: vy0 = 20 · sen(30°) = 20 · 0,5 = 10 m/s.' },
          { text: '17,32 m/s', correct: true, explanation: 'Correcto. vx = v0 · cos(30°) = 20 · (√3 / 2) ≈ 20 · 0,866 = 17,32 m/s.' },
          { text: '20 m/s', correct: false, explanation: 'Incorrecto. 20 m/s es la velocidad total diagonal, no la componente horizontal.' },
        ],
      },
      {
        id: 'q2-2',
        prompt: 'Si se incrementa el ángulo de lanzamiento de 20° a 70° manteniendo constante v0, ¿qué ocurre con las componentes vx y vy0?',
        options: [
          { text: 'vx disminuye y vy0 aumenta.', correct: true, explanation: 'Correcto. Al elevar el ángulo, cos(θ) disminuye y sen(θ) se incrementa: el proyectil gana impulso vertical pero pierde avance horizontal.' },
          { text: 'Ambas componentes aumentan simultáneamente.', correct: false, explanation: 'Incorrecto. La energía total inicial es constante; si una componente sube, la otra disminuye para conservar v0² = vx² + vy0².' },
          { text: 'vx aumenta y vy0 disminuye.', correct: false, explanation: 'Incorrecto. El coseno disminuye al crecer el ángulo de 0° a 90°.' },
        ],
      },
    ],
  },
  {
    id: 'altura-maxima',
    number: '1.3',
    title: 'Cúspide y Altura Máxima',
    tagline: 'Extinción de la velocidad vertical y punto de inflexión cinemático',
    mecCap: 'MEC Res. 12506 (pág. 251): Aplica las expresiones del punto más alto (Hmax) y tiempo de subida en problemas de tiro parabólico.',
    objective: 'Deducir algebraicamente la cota vertical máxima Hmax a partir de la condición física de velocidad vertical nula.',
    content: [
      'Durante la fase ascendente del vuelo, la aceleración gravitatoria ejerce una acción retardatriz continua sobre la componente vertical: vy(t) = vy0 - g · t. Cada segundo que pasa, el objeto pierde 9,8 m/s de rapidez hacia arriba.',
      'Llega un instante preciso en el que toda la velocidad vertical se ha consumido. Este punto representa el ápice o cúspide de la parábola, donde ocurre la condición física fundamental: vy = 0.',
      'Despejando el tiempo de subida a partir de vy = 0: 0 = vy0 - g · tsubida, de donde se obtiene tsubida = vy0 / g = (v0 · sen(θ)) / g.',
      'Sustituyendo tsubida en la ecuación horaria de posición vertical y(t), se obtiene la expresión general de la altura máxima sobre el nivel de lanzamiento: Hmax = (v0² · sen²(θ)) / (2 · g).',
      'Es indispensable notar que en la cúspide el objeto no se detiene en el espacio: su velocidad total no es cero, sino que equivale exactamente a su velocidad horizontal constante vx.',
    ],
    formulas: [
      {
        name: 'Tiempo requerido para alcanzar la cúspide',
        code: 'tsubida = (v0 · sen(θ)) / g',
        detail: 'Instante en el que la componente vertical vy se hace nula.',
      },
      {
        name: 'Cota de Altura Máxima alcanzada',
        code: 'Hmax = (v0² · sen²(θ)) / (2 · g)',
        detail: 'Elevación vertical máxima respecto del origen de coordenadas.',
      },
    ],
    examNote: 'Pregunta clásica de prueba: "¿Cuál es la velocidad del proyectil en el punto de altura máxima?". La respuesta correcta es v = vx = v0 · cos(θ). Nunca respondas cero, a menos que el tiro haya sido puramente vertical (θ = 90°).',
    questions: [
      {
        id: 'q3-1',
        prompt: 'Con v0 = 19,6 m/s, ángulo de 45° y g = 9,8 m/s², ¿cuál es la altura máxima alcanzada?',
        options: [
          { text: '9,8 metros', correct: true, explanation: 'Correcto. sen²(45°) = 0,5. Hmax = (19,6² · 0,5) / (2 · 9,8) = (384,16 · 0,5) / 19,6 = 192,08 / 19,6 = 9,8 m.' },
          { text: '19,6 metros', correct: false, explanation: 'Incorrecto. 19,6 m resultaría si sen²(θ) fuera 1 (tiro a 90°).' },
          { text: '4,9 metros', correct: false, explanation: 'Incorrecto. Revisá el cálculo del denominador 2g = 19,6.' },
        ],
      },
      {
        id: 'q3-2',
        prompt: 'En el punto culminante de la altura máxima, ¿qué valor tiene la aceleración del proyectil?',
        options: [
          { text: '0 m/s², porque el objeto no sube ni baja en ese instante.', correct: false, explanation: 'Incorrecto. Si la aceleración fuera cero, el objeto se quedaría flotando en el aire indefinidamente por inercia.' },
          { text: '9,8 m/s² dirigida hacia abajo.', correct: true, explanation: 'Correcto. La gravedad no se detiene jamás: la aceleración gravitatoria g actúa de manera ininterrumpida hacia el centro de la Tierra.' },
          { text: 'Depende de la velocidad horizontal.', correct: false, explanation: 'Incorrecto. La aceleración gravitatoria es independiente de la velocidad que lleve el cuerpo.' },
        ],
      },
    ],
  },
  {
    id: 'tiempo-vuelo',
    number: '1.4',
    title: 'Tiempo de Vuelo y Simetría Temporal',
    tagline: 'Duración total del recorrido y simetría de trayectorias',
    mecCap: 'MEC Res. 12506 (pág. 251): Deduce e interpreta el tiempo de vuelo total (T) en trayectorias simétricas sobre terreno llano.',
    objective: 'Demostrar que en terreno nivelado el tiempo de caída equivale al tiempo de subida y calcular la duración completa del evento.',
    content: [
      'Cuando un proyectil aterriza a la misma cota vertical desde la que despegó (y = y0 = 0), el movimiento presenta una simetría geométrica y temporal perfecta.',
      'La desaceleración gravitatoria que experimenta el cuerpo en el ascenso es exactamente de la misma magnitud que la aceleración que experimenta durante el descenso. Por ende, el tiempo que el cuerpo tarda en descender desde la cúspide hasta el suelo es idéntico al tiempo que le tomó subir: tbajada = tsubida.',
      'El tiempo de vuelo total (T) es, por consiguiente, el doble del tiempo de subida: T = 2 · tsubida = (2 · v0 · sen(θ)) / g.',
      'Esta misma simetría se verifica en el vector velocidad: al tocar tierra, la componente horizontal vx se mantiene idéntica, mientras que la componente vertical vy final tiene el mismo módulo que vy0 pero con sentido opuesto (-vy0). Por conservación de la energía, el proyectil impacta con exactamente la misma rapidez v0 con la que inició el vuelo.',
    ],
    formulas: [
      {
        name: 'Tiempo de vuelo total en terreno llano',
        code: 'T = (2 · v0 · sen(θ)) / g',
        detail: 'Válido cuando la cota inicial y final coinciden (y0 = yf).',
      },
      {
        name: 'Simetría temporal del evento',
        code: 'tbajada = tsubida = T / 2',
        detail: 'El tiempo de descenso iguala al tiempo de ascenso.',
      },
    ],
    examNote: 'Atención a la condición de validez: la fórmula T = 2 · vy0 / g solo es aplicable si el lanzamiento y la caída ocurren a la misma altura. Si se lanza desde una elevación (y0 > 0), debe resolverse la ecuación cuadrática completa 0 = y0 + vy0·t - 0,5·g·t².',
    questions: [
      {
        id: 'q4-1',
        prompt: 'Un dron despega en terreno plano con v0 = 20 m/s, ángulo de 30° y gravedad de aula g = 10 m/s². ¿Cuánto dura el vuelo completo?',
        options: [
          { text: '1 segundo', correct: false, explanation: 'Incorrecto. 1 segundo es el tiempo de subida: tsubida = (20 · 0,5) / 10 = 1 s. El vuelo total es el doble.' },
          { text: '2 segundos', correct: true, explanation: 'Correcto. T = 2 · (v0 · sen(30°)) / g = 2 · 10 / 10 = 2 segundos.' },
          { text: '4 segundos', correct: false, explanation: 'Incorrecto. Revisá la sustitución de la fórmula T = (2 · vy0) / g.' },
        ],
      },
      {
        id: 'q4-2',
        prompt: 'Si un proyectil tarda 3 segundos en subir y aterriza en el mismo plano horizontal de partida, ¿cuánto tiempo transcurre en la fase de descenso?',
        options: [
          { text: 'Menos de 3 segundos, porque la gravedad lo acelera hacia abajo.', correct: false, explanation: 'Incorrecto. La aceleración de frenada al subir y de aceleración al bajar tienen exactamente la misma magnitud g.' },
          { text: 'Exactamente 3 segundos.', correct: true, explanation: 'Correcto. En suelo nivelado, la simetría del MRUV garantiza que tsubida = tbajada = 3 segundos.' },
          { text: 'Depende del peso del objeto.', correct: false, explanation: 'Incorrecto. En caída libre la masa no interviene en el tiempo de vuelo.' },
        ],
      },
    ],
  },
  {
    id: 'alcance',
    number: '1.5',
    title: 'Alcance Horizontal y Ángulo Óptimo',
    tagline: 'Deducción de la distancia máxima y la demostración de 45°',
    curriculumRef: 'MEC Res. 12506 (pág. 251): Determina el alcance horizontal máximo (R) y el ángulo óptimo de tiro.',
    objective: 'Demostrar analíticamente que 45° produce el alcance máximo sobre suelo horizontal aplicando identidades trigonométricas.',
    content: [
      'El alcance horizontal (R) es la distancia que recorre el proyectil sobre el suelo antes de aterrizar. Puesto que en el eje horizontal el movimiento es uniforme, la distancia es simplemente el producto de la velocidad horizontal por el tiempo total de vuelo: R = vx · T.',
      'Sustituyendo las expresiones ya conocidas: R = [v0 · cos(θ)] · [(2 · v0 · sen(θ)) / g] = (v0² / g) · [2 · sen(θ) · cos(θ)].',
      'Aplicando la identidad trigonométrica del ángulo doble 2 · sen(θ) · cos(θ) = sen(2θ), la expresión del alcance se simplifica a la fórmula fundamental: R = (v0² · sen(2 · θ)) / g.',
      'Para maximizar el alcance R manteniendo fija la velocidad de disparo v0, debemos maximizar el factor sen(2θ). El valor máximo que puede adoptar la función seno en matemáticas es 1. Por consiguiente: sen(2θ) = 1  =>  2θ = 90°  =>  θ = 45°.',
      'Queda así formalmente demostrado que 45° es el ángulo óptimo para obtener la mayor distancia horizontal sobre terreno horizontal sin fricción del aire.',
    ],
    formulas: [
      {
        name: 'Ecuación general del alcance horizontal',
        code: 'R = (v0² · sen(2 · θ)) / g',
        detail: 'Calcula la distancia recorrida para cualquier ángulo θ en terreno nivelado.',
      },
      {
        name: 'Alcance máximo teórico (a 45°)',
        code: 'Rmax = v0² / g',
        detail: 'Caso extremo cuando sen(2 · 45°) = sen(90°) = 1.',
      },
      {
        name: 'Relación entre altura y alcance a 45°',
        code: 'Hmax = R / 4',
        detail: 'A 45°, la altura máxima es siempre exactamente la cuarta parte del alcance total.',
      },
    ],
    examNote: 'Propiedad geométrica útil para exámenes: en un lanzamiento con ángulo de 45°, la altura máxima alcanzada es siempre exactamente igual a R / 4. Si el alcance fue de 100 metros, la altura máxima fue de 25 metros.',
    questions: [
      {
        id: 'q5-1',
        prompt: 'Un puesto sanitario está a 40 metros de distancia en terreno nivelado. Si se lanza con v0 = 20 m/s y g = 10 m/s², ¿qué ángulo logra llegar exactamente?',
        options: [
          { text: '30°', correct: false, explanation: 'Incorrecto. A 30°, R = (400 · sen(60°)) / 10 = 40 · 0,866 = 34,64 m (se queda corto).' },
          { text: '45°', correct: true, explanation: 'Correcto. Con v0 = 20 m/s, el alcance máximo es 20² / 10 = 40 m. Para lograr los 40 m requeridos se necesita sen(2θ) = 1, es decir, θ = 45°.' },
          { text: '60°', correct: false, explanation: 'Incorrecto. A 60° el alcance es 34,64 m, igual que a 30°.' },
        ],
      },
      {
        id: 'q5-2',
        prompt: 'Si se duplica la velocidad inicial de lanzamiento (2 · v0) manteniendo el mismo ángulo, ¿cómo cambia el alcance horizontal?',
        options: [
          { text: 'Se duplica (2 · R).', correct: false, explanation: 'Incorrecto. El alcance depende de la velocidad al cuadrado, no de forma lineal.' },
          { text: 'Se cuadruplica (4 · R).', correct: true, explanation: 'Correcto. Como R es proporcional a v0², al duplicar la velocidad: (2 · v0)² = 4 · v0². El alcance se multiplica por cuatro.' },
          { text: 'Permanece constante.', correct: false, explanation: 'Incorrecto. La velocidad es el factor determinante del alcance.' },
        ],
      },
    ],
  },
  {
    id: 'complementarios',
    number: '1.6',
    title: 'Simetría de Ángulos Complementarios',
    tagline: 'Por qué dos trayectorias distintas impactan en el mismo blanco',
    curriculumRef: 'MEC Res. 12506 (pág. 251): Propiedades trigonométricas y simetría balística.',
    objective: 'Comprender por qué pares de ángulos que suman 90° producen idéntico alcance horizontal pero diferentes cotas y tiempos.',
    content: [
      'Una de las propiedades más notables de la balística clásica es que para cualquier objetivo ubicado a una distancia menor que Rmax, existen dos ángulos de disparo diferentes que alcanzan exactamente el mismo punto.',
      'Estos dos ángulos son complementarios: su suma es estrictamente igual a 90° (θ1 + θ2 = 90°). Por ejemplo: 30° y 60°; 20° y 70°; 15° y 75°.',
      'La justificación matemática proviene de la identidad trigonométrica del seno de ángulos suplementarios: sen(180° - α) = sen(α). Sustituyendo θ2 = 90° - θ1: sen(2 · (90° - θ1)) = sen(180° - 2θ1) = sen(2θ1). Por lo tanto, el factor sen(2θ) arroja el mismo resultado exacto para ambos ángulos.',
      'Diferencias cinemáticas fundamentales:',
      '• El tiro con ángulo bajo (ejemplo, 30°): es un tiro rasante. Permanece poco tiempo en el aire, alcanza poca altura máxima y llega rápidamente al objetivo.',
      '• El tiro con ángulo alto (ejemplo, 60°): es un tiro elevado o de mortero. Alcanza una altura mucho mayor y permanece más tiempo suspendido, pero aterriza en la misma coordenada horizontal.',
    ],
    formulas: [
      {
        name: 'Relación de ángulos complementarios',
        code: 'θ1 + θ2 = 90°',
        detail: 'Pares complementarios con idéntico alcance R.',
      },
      {
        name: 'Igualdad analítica de alcance',
        code: 'R(30°) = R(60°) = (v0² · sen(60°)) / g',
        detail: 'sen(2 · 30°) = sen(60°) y sen(2 · 60°) = sen(120°) = sen(60°).',
      },
    ],
    examNote: 'Trampa recurrente: creer que por tener igual alcance tienen igual tiempo de vuelo o igual altura. El tiro con ángulo mayor siempre permanece más tiempo en el aire y alcanza mayor elevación que su par complementario.',
    questions: [
      {
        id: 'q6-1',
        prompt: 'Un dron lanzado a 35° con rapidez de 20 m/s alcanza una distancia de 37,6 m. ¿Con qué otro ángulo lanzado con la misma rapidez alcanzará exactamente 37,6 m?',
        options: [
          { text: '55°', correct: true, explanation: 'Correcto. El ángulo complementario es 90° - 35° = 55°.' },
          { text: '70°', correct: false, explanation: 'Incorrecto. 70° es el doble del ángulo, no su complementario.' },
          { text: '45°', correct: false, explanation: 'Incorrecto. A 45° alcanzaría la distancia máxima posible, superior a 37,6 m.' },
        ],
      },
      {
        id: 'q6-2',
        prompt: 'Entre dos disparos complementarios a 30° y 60° con igual rapidez inicial v0, ¿cuál de los dos permanece más tiempo en el aire?',
        options: [
          { text: 'Permanecen el mismo tiempo en el aire.', correct: false, explanation: 'Incorrecto. El tiempo de vuelo depende de vy0 = v0 · sen(θ); a mayor ángulo, mayor componente vertical.' },
          { text: 'El de 60°, porque tiene mayor velocidad vertical inicial.', correct: true, explanation: 'Correcto. sen(60°) ≈ 0,866 es mucho mayor que sen(30°) = 0,5. El tiro a 60° sube más alto y tarda 1,73 veces más en descender.' },
          { text: 'El de 30°, porque tiene mayor velocidad horizontal.', correct: false, explanation: 'Incorrecto. La velocidad horizontal no modifica la duración de la caída.' },
        ],
      },
    ],
  },
  {
    id: 'trayectoria',
    number: '1.7',
    title: 'Ecuación Cartesiana de la Trayectoria',
    tagline: 'La ecuación parabólica y(x) sin el parámetro tiempo',
    curriculumRef: 'MEC Res. 12506 (pág. 251): Ecuación analítica de la trayectoria cartesiana.',
    objective: 'Eliminar el parámetro tiempo para obtener la función y = f(x) y analizar su estructura matemática.',
    content: [
      'En la práctica de ingeniería y balística, frecuentemente se desea conocer la altura y del proyectil en función de su avance horizontal x, sin necesidad de calcular previamente el instante de tiempo t en que se encuentra.',
      'Para ello se despeja el tiempo t de la ecuación horizontal MRU: x = vx · t  =>  t = x / vx = x / [v0 · cos(θ)].',
      'Sustituyendo t en la ecuación vertical MRUV: y(x) = v0 · sen(θ) · [x / (v0 · cos(θ))] - 0,5 · g · [x / (v0 · cos(θ))]².',
      'Simplificando: sen(θ) / cos(θ) = tan(θ), y desarrollando el término cuadrático: y(x) = x · tan(θ) - [g / (2 · v0² · cos²(θ))] · x².',
      'Esta es la ecuación canónica de una parábola de la forma y(x) = A · x - B · x², donde el coeficiente cuadrático es negativo (-B), lo que demuestra rigurosamente la concavidad hacia abajo de la trayectoria física.',
    ],
    formulas: [
      {
        name: 'Ecuación cartesiana de la trayectoria y(x)',
        code: 'y(x) = x · tan(θ) - (g / (2 · v0² · cos²(θ))) · x²',
        meaning: 'Determina la cota y para cualquier coordenada x sin calcular el tiempo.',
      },
      {
        name: 'Interpretación física de los términos',
        code: 'y(x) = avance_recto(x) - caída_gravitatoria(x)',
        meaning: 'El término lineal representa la recta inercial; el cuadrático representa la caída acumulada.',
      },
    ],
    examNote: 'Cuidado al despejar: en el término cuadrático, tanto v0 como cos(θ) están elevados al cuadrado. El cálculo es [2 · (v0)² · (cos(θ))²].',
    questions: [
      {
        id: 'q7-1',
        prompt: 'En la ecuación y(x) = x · tan(θ) - B · x², ¿qué representaría el término x · tan(θ) si la gravedad fuera cero (g = 0)?',
        options: [
          { text: 'Una línea recta que continúa indefinidamente con pendiente tan(θ).', correct: true, explanation: 'Correcto. Sin gravedad, el término cuadrático se anula y el objeto viaja en línea recta continua con pendiente igual al ángulo de disparo.' },
          { text: 'Una circunferencia perfecta.', correct: false, explanation: 'Incorrecto. x · tan(θ) es una función lineal de primer grado (una recta).' },
          { text: 'Un punto estático en el origen.', correct: false, explanation: 'Incorrecto. La velocidad horizontal transportaría al objeto indefinidamente.' },
        ],
      },
      {
        id: 'q7-2',
        prompt: 'Si en la ecuación de trayectoria y(x) hacemos y = 0, ¿qué puntos notables representan las dos soluciones de x?',
        options: [
          { text: 'El punto de origen (x = 0) y el punto de altura máxima.', correct: false, explanation: 'Incorrecto. La altura máxima ocurre cuando vy = 0 (en x = R / 2).' },
          { text: 'El punto de despegue (x = 0) y el punto de alcance final (x = R).', correct: true, explanation: 'Correcto. Las dos intersecciones de la parábola con el suelo (y = 0) son el origen del disparo y el impacto final.' },
          { text: 'El tiempo de subida y el tiempo de bajada.', correct: false, explanation: 'Incorrecto. x mide distancias en metros, no tiempos.' },
        ],
      },
    ],
  },
];

export default function TheorySection() {
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0].id);
  const [completedModules, setCompletedModules] = useState(() => {
    return new Set(readJSON(STORAGE_KEY, []));
  });
  const [answers, setAnswers] = useState({});

  // Mini-laboratorio interactivo de balística
  const [labAngle, setLabAngle] = useState(45);
  const [labSpeed, setLabSpeed] = useState(20);
  const [labGravity, setLabGravity] = useState(9.8);

  const activeModuleIndex = MODULES.findIndex(m => m.id === activeModuleId);
  const activeModule = MODULES[activeModuleIndex] ?? MODULES[0];

  // Cálculos en tiempo real del mini-laboratorio
  const labCalculations = useMemo(() => {
    const rad = (labAngle * Math.PI) / 180;
    const vx = labSpeed * Math.cos(rad);
    const vy0 = labSpeed * Math.sin(rad);
    const hMax = (vy0 * vy0) / (2 * labGravity);
    const timeOfFlight = (2 * vy0) / labGravity;
    const range = vx * timeOfFlight;
    return {
      vx: Number(vx.toFixed(2)),
      vy0: Number(vy0.toFixed(2)),
      hMax: Number(hMax.toFixed(2)),
      timeOfFlight: Number(timeOfFlight.toFixed(2)),
      range: Number(range.toFixed(2)),
    };
  }, [labAngle, labSpeed, labGravity]);

  // Generación del trazado SVG de la trayectoria
  const trajectoryPoints = useMemo(() => {
    const rad = (labAngle * Math.PI) / 180;
    const vx = labSpeed * Math.cos(rad);
    const vy0 = labSpeed * Math.sin(rad);
    const totalTime = (2 * vy0) / labGravity;
    const maxR = Math.max(10, labCalculations.range);
    const maxH = Math.max(5, labCalculations.hMax);
    const points = [];
    const steps = 30;
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * totalTime;
      const x = vx * t;
      const y = Math.max(0, vy0 * t - 0.5 * labGravity * t * t);
      // Mapeo a viewBox SVG: ancho 400 (padding 30..370), alto 180 (piso 150, techo 20)
      const svgX = 30 + (x / maxR) * 340;
      const svgY = 150 - (y / maxH) * 120;
      points.push(`${svgX.toFixed(1)},${svgY.toFixed(1)}`);
    }
    return points.join(' ');
  }, [labAngle, labSpeed, labGravity, labCalculations]);

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const currentQuestions = activeModule.questions;
  const isCurrentModuleComplete = useMemo(() => {
    return currentQuestions.every(q => {
      const selected = answers[q.id];
      return selected !== undefined && q.options[selected]?.correct === true;
    });
  }, [currentQuestions, answers]);

  const toggleCompleteCurrent = () => {
    setCompletedModules(prev => {
      const next = new Set(prev);
      if (next.has(activeModule.id)) {
        next.delete(activeModule.id);
      } else {
        next.add(activeModule.id);
      }
      writeJSON(STORAGE_KEY, [...next]);
      return next;
    });
  };

  const progressPercent = Math.round((completedModules.size / MODULES.length) * 100);

  const goToNext = () => {
    if (activeModuleIndex < MODULES.length - 1) {
      setActiveModuleId(MODULES[activeModuleIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrev = () => {
    if (activeModuleIndex > 0) {
      setActiveModuleId(MODULES[activeModuleIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="theory-course-container card" aria-label="Plataforma de Teoría MEC: Movimiento Parabólico">
      {/* Encabezado del curso */}
      <header className="theory-course-header">
        <div className="theory-header-meta">
          <span className="chip chip-mec">MEC Paraguay · Bachillerato Científico</span>
          <span className="chip chip-consolidated">Resolución N.º 12506</span>
        </div>
        <h2>Unidad Curricular: Movimiento Parabólico y Balística Clásica</h2>
        <p className="theory-header-desc">
          Plan Específico en Ciencias Básicas y Tecnología (Pág. 251). Estudio analítico de la cinemática en dos dimensiones, deducción de expresiones y laboratorio de simulación.
        </p>

        {/* Barra de progreso general */}
        <div className="theory-progress-panel" role="region" aria-label="Progreso del curso">
          <div className="theory-progress-labels">
            <span>
              Progreso del tema: <strong>{completedModules.size} de {MODULES.length} lecciones completadas</strong>
            </span>
            <span className="theory-progress-pct">{progressPercent}%</span>
          </div>
          <div className="theory-progress-bar-track" aria-hidden="true">
            <div
              className="theory-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Disposición tipo Cisco NetAcad: Navegador lateral / Contenido principal */}
      <div className="theory-course-layout">
        {/* Navegador de Lecciones (Sidebar) */}
        <nav className="theory-course-nav" aria-label="Índice de lecciones">
          <div className="theory-nav-title">Índice del Módulo</div>
          <ol className="theory-lesson-list">
            {MODULES.map((module, idx) => {
              const isCompleted = completedModules.has(module.id);
              const isActive = activeModule.id === module.id;
              return (
                <li key={module.id}>
                  <button
                    type="button"
                    className={`theory-lesson-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
                    onClick={() => setActiveModuleId(module.id)}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className="theory-lesson-status" aria-hidden="true">
                      {isCompleted ? (
                        <span className="theory-status-check">OK</span>
                      ) : (
                        <span className="theory-status-num">{idx + 1}</span>
                      )}
                    </span>
                    <span className="theory-lesson-info">
                      <strong className="theory-lesson-title">{module.title}</strong>
                      <small className="theory-lesson-sub">{module.number}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Área de Contenido Principal de la Lección */}
        <main className="theory-course-content">
          <article className="theory-lesson-article" key={activeModule.id}>
            {/* Banner de la Lección Activa */}
            <div className="theory-lesson-banner">
              <div className="theory-banner-badges">
                <span className="theory-badge-index">Lección {activeModule.number}</span>
                <span className="theory-badge-curriculum">{activeModule.mecCap}</span>
              </div>
              <h3 className="theory-lesson-heading">{activeModule.title}</h3>
              <p className="theory-lesson-tagline">{activeModule.tagline}</p>
            </div>

            {/* Objetivo instruccional */}
            <div className="theory-block theory-objective-block">
              <strong>Objetivo de Aprendizaje:</strong>
              <p>{activeModule.objective}</p>
            </div>

            {/* Desarrollo teórico */}
            <div className="theory-block theory-body-block">
              <h4>Fundamentación Física</h4>
              {activeModule.content.map((paragraph, index) => (
                <p key={index}><MathText text={paragraph} /></p>
              ))}
            </div>

            {/* Fórmulas y deducción matemática */}
            <div className="theory-block theory-math-block">
              <h4>Expresiones Matemáticas y Variables</h4>
              <div className="theory-formula-grid">
                {activeModule.formulas.map((formula, index) => (
                  <div key={index} className="theory-formula-card">
                    <span className="theory-formula-header">{formula.name}</span>
                    <div className="theory-formula-code-box">
                      <Formula text={formula.code} />
                    </div>
                    <p className="theory-formula-details">{formula.detail || formula.meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerta de examen */}
            <div className="theory-block theory-exam-block">
              <div className="theory-block-label">Criterio Crítico de Examen</div>
              <p><MathText text={activeModule.examNote} /></p>
            </div>

            {/* Mini-Laboratorio Interactivo (Cisco Lab Sandbox) */}
            <div className="theory-block theory-sandbox-block">
              <div className="theory-sandbox-header">
                <span className="panel-eyebrow">LABORATORIO INTERACTIVO</span>
                <h4>Simulador de Parámetros de Balística</h4>
                <p>
                  Ajustá los controles deslizantes para observar cómo varían instantáneamente las componentes, la altura y el alcance según el modelo ideal del MEC.
                </p>
              </div>

              <div className="theory-sandbox-controls">
                <div className="theory-slider-group">
                  <label htmlFor="theory-angle-slider">
                    <span>Ángulo de tiro (θ):</span>
                    <strong>{labAngle}°</strong>
                  </label>
                  <input
                    id="theory-angle-slider"
                    type="range"
                    min="10"
                    max="85"
                    step="1"
                    value={labAngle}
                    onChange={e => setLabAngle(Number(e.target.value))}
                    className="theory-range-slider"
                  />
                </div>

                <div className="theory-slider-group">
                  <label htmlFor="theory-speed-slider">
                    <span>Velocidad inicial (v0):</span>
                    <strong>{labSpeed} m/s</strong>
                  </label>
                  <input
                    id="theory-speed-slider"
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={labSpeed}
                    onChange={e => setLabSpeed(Number(e.target.value))}
                    className="theory-range-slider"
                  />
                </div>

                <div className="theory-slider-group">
                  <label htmlFor="theory-gravity-select">
                    <span>Gravedad (g):</span>
                    <strong>{labGravity} m/s²</strong>
                  </label>
                  <select
                    id="theory-gravity-select"
                    value={labGravity}
                    onChange={e => setLabGravity(Number(e.target.value))}
                    className="quiz-input theory-select"
                  >
                    <option value="9.8">9,8 m/s² (Estándar MEC / SI)</option>
                    <option value="10">10,0 m/s² (Convención de aula)</option>
                  </select>
                </div>
              </div>

              {/* Botones de preajustes rápidos */}
              <div className="theory-presets-row" role="group" aria-label="Preajustes balísticos">
                <button
                  type="button"
                  className="btn btn-secondary theory-preset-btn"
                  onClick={() => setLabAngle(45)}
                >
                  Alcance Máximo (45°)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary theory-preset-btn"
                  onClick={() => setLabAngle(30)}
                >
                  Tiro Rasante (30°)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary theory-preset-btn"
                  onClick={() => setLabAngle(60)}
                >
                  Tiro Elevado (60°)
                </button>
              </div>

              {/* Gráfico SVG de la curva en tiempo real */}
              <div className="theory-canvas-box" aria-hidden="true">
                <svg viewBox="0 0 400 180" className="theory-trajectory-svg">
                  {/* Cuadrícula técnica de fondo */}
                  <line x1="30" y1="150" x2="370" y2="150" stroke="#cbd5e1" strokeWidth="2" />
                  <line x1="30" y1="20" x2="30" y2="150" stroke="#cbd5e1" strokeWidth="2" />
                  <line x1="30" y1="85" x2="370" y2="85" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="200" y1="20" x2="200" y2="150" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Curva de trayectoria continua */}
                  <polyline
                    fill="none"
                    stroke="#1d5bd8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={trajectoryPoints}
                  />

                  {/* Etiquetas de los ejes */}
                  <text x="35" y="32" fill="#64748b" fontSize="10" fontFamily="sans-serif">Eje Y (Altura)</text>
                  <text x="330" y="165" fill="#64748b" fontSize="10" fontFamily="sans-serif">Eje X (Alcance)</text>
                </svg>
              </div>

              {/* Tabla de Métricas calculadas al instante */}
              <div className="theory-metrics-grid">
                <div className="theory-metric-item">
                  <small>Componente vx</small>
                  <strong>{labCalculations.vx} m/s</strong>
                </div>
                <div className="theory-metric-item">
                  <small>Componente vy0</small>
                  <strong>{labCalculations.vy0} m/s</strong>
                </div>
                <div className="theory-metric-item">
                  <small>Altura Máxima (Hmax)</small>
                  <strong>{labCalculations.hMax} m</strong>
                </div>
                <div className="theory-metric-item">
                  <small>Tiempo de Vuelo (T)</small>
                  <strong>{labCalculations.timeOfFlight} s</strong>
                </div>
                <div className="theory-metric-item is-highlight">
                  <small>Alcance Total (R)</small>
                  <strong>{labCalculations.range} m</strong>
                </div>
              </div>
            </div>

            {/* Comprobación de Conocimiento (Cisco Knowledge Check) */}
            <div className="theory-block theory-quiz-block">
              <div className="theory-block-label">Comprobación de Comprensión</div>
              <h4>Autoevaluación de la Lección</h4>
              <p>
                Respondé correctamente a las dos preguntas para validar tu aprendizaje y habilitar la finalización de esta lección.
              </p>

              <div className="theory-questions-list">
                {activeModule.questions.map((question, qIdx) => {
                  const selectedIndex = answers[question.id];
                  const hasAnswered = selectedIndex !== undefined;
                  const isCorrect = hasAnswered && question.options[selectedIndex]?.correct;

                  return (
                    <div key={question.id} className="theory-question-card">
                      <p className="theory-question-prompt">
                        <strong>Pregunta {qIdx + 1}:</strong> {question.prompt}
                      </p>

                      <div className="theory-options-list" role="radiogroup">
                        {question.options.map((option, optIdx) => {
                          const isSelected = selectedIndex === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              className={`theory-option-btn ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => handleSelectOption(question.id, optIdx)}
                            >
                              <span className="theory-option-marker">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="theory-option-text">{option.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div
                          className={`theory-feedback-box ${isCorrect ? 'is-correct' : 'is-incorrect'}`}
                          role="status"
                        >
                          <strong>{isCorrect ? 'Respuesta Correcta' : 'Respuesta Incorrecta'}</strong>
                          <p>{question.options[selectedIndex].explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón de marcar lección como completada */}
              <div className="theory-completion-row">
                <button
                  type="button"
                  className={`btn ${completedModules.has(activeModule.id) ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleCompleteCurrent}
                >
                  <Icon name="class" size={18} />
                  <span>
                    {completedModules.has(activeModule.id)
                      ? 'Lección completada (Desmarcar)'
                      : 'Marcar lección como comprendida'}
                  </span>
                </button>
                {isCurrentModuleComplete && !completedModules.has(activeModule.id) && (
                  <span className="theory-qualify-note">
                    ¡Comprobación aprobada! Podés marcar la lección y avanzar.
                  </span>
                )}
              </div>
            </div>

            {/* Barra de navegación inferior entre lecciones */}
            <footer className="theory-lesson-nav-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goToPrev}
                disabled={activeModuleIndex === 0}
              >
                Anterior
              </button>
              <span className="theory-page-indicator">
                {activeModuleIndex + 1} de {MODULES.length}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={goToNext}
                disabled={activeModuleIndex === MODULES.length - 1}
              >
                Siguiente Lección
              </button>
            </footer>
          </article>
        </main>
      </div>
    </section>
  );
}
