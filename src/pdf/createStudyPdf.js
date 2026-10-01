import { jsPDF } from 'jspdf';
import { toTextbookPlain } from '../utils/mathText.js';
import notoSansUrl from './assets/NotoSans-Regular.ttf?url';
import { concepts, exercises, scienceSources, localizeCatalogItem } from '../data/catalogs.js';
import { DEFAULT_LANGUAGE, translate } from '../i18n/messages.js';
import { selectClassExercises } from '../utils/classCode.js';
import { createLaunch, evaluateTrajectory, maxHeight, range, timeOfFlight } from '../physics/projectileMotion.js';
import { DEFAULT_PDF_OPTIONS, PDF_THEMES, selectPdfExercises } from './pdfOptions.js';

// NotoSans no trae ≈ ni →: se reemplazan para que el PDF no muestre huecos.
const pdfMath = text => toTextbookPlain(text).replace(/≈/g, '~').replace(/\s*→\s*/g, '; ');

const PAGE = { width: 210, height: 297, margin: 15, bottom: 279 };
const SCENARIO_MESSAGE = { dron: 'pdf.scenario.dron', basketball: 'pdf.scenario.basketball', wall: 'pdf.scenario.wall' };
const DIFFICULTY_MESSAGE = { básico: 'pdf.difficulty.basico', intermedio: 'pdf.difficulty.intermedio', avanzado: 'pdf.difficulty.avanzado' };
const VALUE_UNITS = { v0: 'm/s', angle: '°', angleA: '°', angleB: '°', gravity: 'm/s²', vx: 'm/s', t: 's', targetDistance: 'm' };

export { DEFAULT_PDF_OPTIONS, PDF_THEMES, selectPdfExercises };

const ink = [15, 23, 42], soft = [100, 116, 139], lineMuted = [214, 222, 232];
const formatNumber = value => String(value).replace('.', ',');

async function registerUnicodeFont(doc) {
  const response = await fetch(notoSansUrl);
  if (!response.ok) throw new Error('No se pudo cargar la fuente Unicode para el PDF.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  doc.addFileToVFS('NotoSans-Regular.ttf', btoa(binary));
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans', 'normal');
}

export function getRelevantSources(selected = exercises) {
  const topics = new Set(selected.map(item => item.topic));
  return scienceSources.filter(source => source.supports.some(support =>
    [...topics].some(topic => topic.toLocaleLowerCase('es').includes(support.toLocaleLowerCase('es'))
      || support.toLocaleLowerCase('es').includes(topic.toLocaleLowerCase('es')))
  ));
}

export async function createStudyPdf({ config = null, language = DEFAULT_LANGUAGE, now = new Date(), options: rawOptions = {} } = {}) {
  const options = { ...DEFAULT_PDF_OPTIONS, ...rawOptions };
  const theme = PDF_THEMES[options.theme] ?? PDF_THEMES.azul;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  await registerUnicodeFont(doc);
  const base = config ? selectClassExercises(exercises, config) : exercises;
  const displayExercises = selectPdfExercises(base, options, now.getDate() + now.getMonth() * 31);
  const localized = displayExercises.map(item => localizeCatalogItem(item, language));
  const localizedConcepts = concepts.map(item => localizeCatalogItem(item, language));
  const refs = getRelevantSources(displayExercises);
  const isJopara = language !== 'es';
  const label = key => translate(language, key);
  const title = options.title.trim() || label('pdf.title');
  doc.setProperties({ title, subject: label('pdf.subtitle'), author: options.teacher.trim() || 'PyFis IA · Kyre’y-devs', creator: 'PyFis IA' });

  let y = 0;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const setText = (size, color = ink) => { doc.setFont('NotoSans', 'normal'); doc.setFontSize(size); doc.setTextColor(...color); };

  // Encabezado: banda de color con una parábola decorativa y los datos del docente.
  const drawHeader = (first) => {
    const h = first ? 38 : 20;
    doc.setFillColor(...theme.dark); doc.rect(0, 0, PAGE.width, h, 'F');
    doc.setFillColor(...theme.main); doc.rect(0, h, PAGE.width, 1.6, 'F');
    doc.setDrawColor(...theme.main); doc.setLineWidth(0.8);
    const arc = [];
    for (let i = 0; i <= 24; i += 1) { const tt = i / 24; arc.push([118 + tt * 80, h - 5 - Math.sin(Math.PI * tt) * (h - 12)]); }
    for (let i = 1; i < arc.length; i += 1) doc.line(arc[i - 1][0], arc[i - 1][1], arc[i][0], arc[i][1]);
    doc.setFillColor(255, 255, 255); doc.circle(arc[12][0], arc[12][1], 1.4, 'F');
    doc.setLineWidth(0.2);
    setText(first ? 19 : 12, [255, 255, 255]);
    doc.text(first ? title : `${title} · PyFis IA`, PAGE.margin, first ? 15 : 12.5);
    if (first) {
      setText(9, [203, 213, 225]);
      doc.text(label('pdf.subtitle'), PAGE.margin, 22);
      const meta = [options.teacher.trim() && `${label('pdf.teacherLabel')}: ${options.teacher.trim()}`, options.school.trim(), options.course.trim() && `${label('pdf.courseLabel')}: ${options.course.trim()}`].filter(Boolean).join('   ·   ');
      if (meta) { setText(9, [255, 255, 255]); doc.text(meta, PAGE.margin, 30); }
    }
    y = h + 9;
  };
  const addPage = () => { doc.addPage(); drawHeader(false); };
  const ensure = height => { if (y + height > PAGE.bottom) addPage(); };
  const addText = (value, { size = 10, indent = 0, color = ink, gap = 3, width = contentWidth - indent } = {}) => {
    setText(size, color);
    const lines = doc.splitTextToSize(String(value ?? ''), width);
    const lineHeight = size * 0.42;
    for (const line of lines) { ensure(lineHeight); doc.text(line, PAGE.margin + indent, y); y += lineHeight; }
    y += gap;
  };
  const addSection = text => {
    ensure(14);
    y += 2;
    doc.setFillColor(...theme.main); doc.roundedRect(PAGE.margin, y - 4.2, 2.2, 6, 1, 1, 'F');
    setText(13, theme.main); doc.text(text, PAGE.margin + 5, y);
    y += 6;
  };
  const infoBox = (text, { size = 9 } = {}) => {
    setText(size);
    const lines = doc.splitTextToSize(String(text), contentWidth - 10);
    const h = lines.length * size * 0.42 + 6;
    ensure(h + 3);
    doc.setFillColor(...theme.soft); doc.setDrawColor(...theme.soft); doc.roundedRect(PAGE.margin, y - 4, contentWidth, h, 2.5, 2.5, 'F');
    setText(size); doc.text(lines, PAGE.margin + 5, y + 0.5);
    y += h + 2;
  };

  drawHeader(true);
  // Datos del alumno en una franja con casilleros.
  doc.setDrawColor(...lineMuted); doc.roundedRect(PAGE.margin, y - 5, contentWidth, 10, 2, 2, 'S');
  setText(9, soft);
  doc.text(`${label('pdf.name')}:`, PAGE.margin + 4, y + 1.2);
  doc.line(PAGE.margin + 22, y + 1.8, PAGE.margin + 110, y + 1.8);
  doc.text(`${label('pdf.date')}: ${now.toLocaleDateString('es-PY')}`, PAGE.margin + 116, y + 1.2);
  y += 12;

  if (options.includeInstructions) {
    addSection(label('pdf.before'));
    infoBox(label('pdf.instructions'));
    if (isJopara) addText(label('pdf.joparaNote'), { size: 8, color: soft });
  }
  if (options.includeAssumptions) {
    addSection(label('pdf.assumptionsTitle'));
    addText(label('pdf.assumptions'), { size: 9 });
  }

  const conceptIds = new Set(displayExercises.map(item => item.expectedConcept));
  const relevantConcepts = localizedConcepts.filter(item => conceptIds.has(item.id));
  if (options.includeFormulas && relevantConcepts.length) {
    addSection(label('pdf.relations'));
    const colWidth = (contentWidth - 4) / 2;
    const cards = relevantConcepts.map(concept => ({ name: concept.name, body: pdfMath(concept.formula || concept.definition) }));
    for (let i = 0; i < cards.length; i += 2) {
      const pair = cards.slice(i, i + 2).map(card => ({ ...card, lines: (setText(8.5), doc.splitTextToSize(card.body, colWidth - 8)) }));
      const h = Math.max(...pair.map(card => card.lines.length)) * 3.6 + 11;
      ensure(h + 2);
      pair.forEach((card, index) => {
        const x = PAGE.margin + index * (colWidth + 4);
        doc.setFillColor(255, 255, 255); doc.setDrawColor(...theme.main); doc.setLineWidth(0.35); doc.roundedRect(x, y - 3, colWidth, h, 2, 2, 'FD'); doc.setLineWidth(0.2);
        setText(8, theme.main); doc.text(card.name.toUpperCase(), x + 4, y + 1.5);
        setText(8.5); doc.text(card.lines, x + 4, y + 6.5);
      });
      y += h + 3;
    }
  }

  // Mini gráfico de la trayectoria (solo si el ejercicio trae v0 y ángulo).
  const drawMiniGraph = (exercise, x, top, w, h) => {
    const values = exercise.values ?? {};
    if (!(values.v0 > 0) || !(Number.isFinite(values.angle))) return false;
    const launch = createLaunch(values.v0, values.angle, { gravity: values.gravity ?? 9.8 });
    const points = evaluateTrajectory(launch, { step: Math.max(timeOfFlight(launch) / 30, 0.01) });
    if (points.length < 2) return false;
    const maxX = Math.max(range(launch), 1) * 1.1, maxY = Math.max(maxHeight(launch), 1) * 1.3;
    doc.setFillColor(...theme.soft); doc.roundedRect(x, top, w, h, 1.5, 1.5, 'F');
    const ox = x + 5, oy = top + h - 4, gw = w - 8, gh = h - 8;
    doc.setDrawColor(...soft); doc.line(ox, oy, ox + gw, oy); doc.line(ox, oy, ox, oy - gh);
    doc.setDrawColor(...theme.main); doc.setLineWidth(0.6);
    for (let i = 1; i < points.length; i += 1) {
      doc.line(ox + (points[i - 1].x / maxX) * gw, oy - (points[i - 1].y / maxY) * gh, ox + (points[i].x / maxX) * gw, oy - (points[i].y / maxY) * gh);
    }
    doc.setLineWidth(0.2);
    setText(6.5, soft); doc.text('x', ox + gw - 1, oy + 3); doc.text('y', ox - 3, oy - gh + 2);
    return true;
  };

  addSection(label('pdf.exercises'));
  localized.forEach((exercise, index) => {
    const scenario = SCENARIO_MESSAGE[exercise.scenario];
    const difficulty = DIFFICULTY_MESSAGE[exercise.difficulty?.toLocaleLowerCase('es')];
    const hasGraph = options.includeGraphs && exercise.values?.v0 > 0 && Number.isFinite(exercise.values?.angle);
    const graphW = hasGraph ? 44 : 0;
    const textWidth = contentWidth - 16 - (hasGraph ? graphW + 4 : 0);
    setText(9.5);
    const qLines = doc.splitTextToSize(pdfMath(exercise.question), textWidth);
    const chips = Object.entries(exercise.values ?? {}).map(([key, value]) => `${translate(language, `value.${key}`) === `value.${key}` ? key : translate(language, `value.${key}`)}: ${formatNumber(value)} ${VALUE_UNITS[key] ?? ''}`.trim());
    const work = options.workArea === 'grid' ? 30 : options.workArea === 'lines' ? 22 : 0;
    const textH = Math.max(qLines.length * 4 + 9, hasGraph ? 30 : 0);
    const cardH = 9 + textH + (chips.length ? 8 : 0) + work + 4;
    ensure(cardH + 3);
    const top = y - 4;
    doc.setDrawColor(...lineMuted); doc.setFillColor(255, 255, 255); doc.roundedRect(PAGE.margin, top, contentWidth, cardH, 3, 3, 'FD');
    // Número del ejercicio y etiquetas
    doc.setFillColor(...theme.main); doc.circle(PAGE.margin + 7, top + 7, 4, 'F');
    setText(9, [255, 255, 255]); doc.text(String(index + 1), PAGE.margin + 7, top + 8.3, { align: 'center' });
    setText(8.5, theme.main);
    doc.text(`${exercise.topic}${scenario ? ' · ' + label(scenario) : ''} · ${difficulty ? label(difficulty) : exercise.difficulty}`, PAGE.margin + 14, top + 8.2);
    setText(9.5); doc.text(qLines, PAGE.margin + 14, top + 15);
    if (hasGraph) drawMiniGraph(exercise, PAGE.margin + contentWidth - graphW - 4, top + 12, graphW, 26);
    let cy = top + 9 + textH;
    if (chips.length) {
      let cx = PAGE.margin + 14;
      setText(8);
      for (const chip of chips) {
        const w = doc.getTextWidth(chip) + 6;
        if (cx + w > PAGE.margin + contentWidth - 4) break;
        doc.setFillColor(...theme.soft); doc.roundedRect(cx, cy - 4, w, 6, 1.5, 1.5, 'F');
        setText(8, theme.dark); doc.text(chip, cx + 3, cy);
        cx += w + 3;
      }
      cy += 6;
    }
    if (options.workArea === 'lines') {
      doc.setDrawColor(...lineMuted);
      for (let line = 1; line <= 3; line += 1) doc.line(PAGE.margin + 14, cy + line * 6.5, PAGE.margin + contentWidth - 5, cy + line * 6.5);
    } else if (options.workArea === 'grid') {
      doc.setDrawColor(232, 236, 242); doc.setLineWidth(0.15);
      const gx0 = PAGE.margin + 14, gx1 = PAGE.margin + contentWidth - 5, gy0 = cy + 2, gy1 = cy + work - 1;
      for (let gx = gx0; gx <= gx1; gx += 5) doc.line(gx, gy0, gx, gy1);
      for (let gy = gy0; gy <= gy1; gy += 5) doc.line(gx0, gy, gx1, gy);
      doc.setLineWidth(0.2);
    }
    y = top + cardH + 7;
  });

  if (options.includeAnswers) {
    addPage(); addSection(label('pdf.review'));
    // Tabla de respuestas: número, resultado y resolución resumida.
    localized.forEach((exercise, index) => {
      const hint = exercise.hints?.length ? pdfMath(exercise.hints.at(-1)) : '';
      setText(8);
      const hintLines = hint ? doc.splitTextToSize(hint, contentWidth - 50) : [];
      const h = Math.max(9, hintLines.length * 3.4 + 5);
      ensure(h + 1);
      if (index % 2 === 0) { doc.setFillColor(...theme.soft); doc.rect(PAGE.margin, y - 4, contentWidth, h, 'F'); }
      setText(9, theme.main); doc.text(`${index + 1}.`, PAGE.margin + 3, y);
      setText(9.5); doc.text(`${formatNumber(exercise.correctAnswer)} ${exercise.unit}`, PAGE.margin + 12, y);
      if (hintLines.length) { setText(8, soft); doc.text(hintLines, PAGE.margin + 46, y); }
      y += h;
    });
  }

  if (options.includeReferences) {
    addPage(); addSection(label('pdf.references'));
    for (const source of refs) {
      addText(`${source.authors.join(', ')} (${source.publicationYear}). ${source.title}, ${source.edition}, ${source.section}. ${source.institution}.`, { size: 8 });
      addText(`${source.page}. DOI: ${source.doi ?? 'no asignado'}. ${label('pdf.accessed')}: ${now.toISOString().slice(0, 10)}.`, { size: 8, indent: 2 });
      addText(`${source.url} · ${label('pdf.license')}: ${source.license}.`, { size: 8, indent: 2, color: soft });
      const supports = language === 'es' ? source.supports : (source.supportsJopara ?? source.supports);
      const assumptions = language === 'es' ? source.assumptions : (source.assumptionsJopara ?? source.assumptions);
      addText(`${label('pdf.supports')}: ${supports.join('; ')}.`, { size: 8, indent: 2 });
      addText(`${label('pdf.modelAssumptions')}: ${assumptions}.`, { size: 8, indent: 2 });
    }
    addText(label('pdf.attribution'), { size: 8, color: soft });
  }

  const pages = doc.getNumberOfPages();
  for (let current = 1; current <= pages; current += 1) {
    doc.setPage(current); doc.setDrawColor(...lineMuted); doc.line(PAGE.margin, 285, PAGE.width - PAGE.margin, 285);
    setText(7, soft);
    doc.text(label('pdf.footer'), PAGE.margin, 290);
    doc.text(`${label('pdf.page')} ${current} / ${pages}`, PAGE.width - PAGE.margin, 290, { align: 'right' });
  }
  return doc;
}

export async function downloadStudyPdf(options = {}) {
  const doc = await createStudyPdf(options);
  const name = String(options.options?.title ?? '').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40);
  doc.save(`${name || 'PyFis_IA_Ficha_Aula'}.pdf`);
  return doc;
}

