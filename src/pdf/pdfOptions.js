// Opciones de la ficha PDF (módulo liviano: lo usa el panel sin cargar jsPDF).

/** Temas de color (principal, suave, oscuro). "gris" es ideal para fotocopias. */
export const PDF_THEMES = {
  azul: { main: [29, 91, 216], soft: [232, 240, 254], dark: [12, 21, 39] },
  verde: { main: [22, 128, 72], soft: [226, 245, 234], dark: [10, 44, 28] },
  naranja: { main: [217, 104, 25], soft: [254, 239, 226], dark: [60, 30, 10] },
  violeta: { main: [112, 72, 232], soft: [240, 235, 255], dark: [34, 20, 70] },
  gris: { main: [55, 65, 81], soft: [241, 243, 245], dark: [17, 24, 39] },
};

export const DEFAULT_PDF_OPTIONS = {
  title: '', teacher: '', school: '', course: '',
  theme: 'azul', workArea: 'lines', difficulty: 'all', scenario: 'all', maxExercises: 0, shuffle: false,
  includeInstructions: true, includeAssumptions: true, includeFormulas: true, includeGraphs: true, includeAnswers: true, includeReferences: true,
};

// Mezcla estable según una semilla: la misma ficha se puede regenerar igual.
function seededShuffle(list, seed) {
  const copy = [...list];
  let state = seed || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Ejercicios que entran en la ficha según las opciones elegidas. */
export function selectPdfExercises(base, options = DEFAULT_PDF_OPTIONS, seed = 1) {
  let list = base.filter(item => (options.difficulty === 'all' || item.difficulty?.toLocaleLowerCase('es') === options.difficulty)
    && (options.scenario === 'all' || item.scenario === options.scenario));
  if (options.shuffle) list = seededShuffle(list, seed);
  if (options.maxExercises > 0) list = list.slice(0, options.maxExercises);
  return list;
}
