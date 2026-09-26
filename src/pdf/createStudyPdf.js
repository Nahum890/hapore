import { jsPDF } from 'jspdf';
import { toTextbookPlain } from '../utils/mathText.js';

// NotoSans no trae ≈ ni →: se reemplazan para que el PDF no muestre huecos.
const pdfMath = text => toTextbookPlain(text).replace(/≈/g, '~').replace(/\s*→\s*/g, '; ');
import notoSansUrl from './assets/NotoSans-Regular.ttf?url';
import { concepts, exercises, scienceSources, localizeCatalogItem } from '../data/catalogs.js';
import { DEFAULT_LANGUAGE, translate } from '../i18n/messages.js';
import { selectClassExercises } from '../utils/classCode.js';

const PAGE = { width: 210, height: 297, margin: 16, bottom: 278 };
const SCENARIO_MESSAGE = { dron: 'pdf.scenario.dron', basketball: 'pdf.scenario.basketball', wall: 'pdf.scenario.wall' };
const DIFFICULTY_MESSAGE = { básico: 'pdf.difficulty.basico', intermedio: 'pdf.difficulty.intermedio', avanzado: 'pdf.difficulty.avanzado' };
const green = [23, 72, 59], ink = [31, 41, 55], soft = [92, 109, 100];
const formatNumber = value => String(value).replace('.', ',');

async function registerUnicodeFont(doc) {
  const response = await fetch(notoSansUrl);
  if (!response.ok) throw new Error('No se pudo cargar la fuente Unicode para el PDF.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const base64 = btoa(binary);
  doc.addFileToVFS('NotoSans-Regular.ttf', base64);
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

export async function createStudyPdf({ config = null, language = DEFAULT_LANGUAGE, now = new Date() } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  await registerUnicodeFont(doc);
  const displayExercises = config ? selectClassExercises(exercises, config) : exercises;
  const localized = displayExercises.map(item => localizeCatalogItem(item, language));
  const localizedConcepts = concepts.map(item => localizeCatalogItem(item, language));
  const refs = getRelevantSources(displayExercises);
  const isJopara = language !== 'es';
  const label = key => translate(language, key);
  doc.setProperties({ title: label('pdf.title'), subject: label('pdf.subtitle'), author: 'PyFis IA · Kyre’y-devs', creator: 'PyFis IA' });

  let y = 40, page = 1;
  const drawHeader = () => {
    doc.setFillColor(...green); doc.rect(0, 0, PAGE.width, 29, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('NotoSans', 'normal'); doc.setFontSize(18);
    doc.text('PyFis IA · ' + label('pdf.title'), PAGE.margin, 13);
    doc.setFontSize(9); doc.text(label('pdf.subtitle'), PAGE.margin, 21);
    doc.setTextColor(...ink); y = 39;
  };
  const addPage = () => { doc.addPage(); page += 1; drawHeader(); };
  const addText = (value, { size = 10, indent = 0, color = ink, gap = 3 } = {}) => {
    doc.setFont('NotoSans', 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(value ?? ''), PAGE.width - PAGE.margin * 2 - indent);
    const lineHeight = size * 0.42;
    let offset = 0;
    while (offset < lines.length) {
      let available = Math.floor((PAGE.bottom - y) / lineHeight);
      if (available < 1) {
        addPage();
        available = Math.floor((PAGE.bottom - y) / lineHeight);
      }
      const count = Math.min(available, lines.length - offset);
      doc.text(lines.slice(offset, offset + count), PAGE.margin + indent, y);
      y += count * lineHeight;
      offset += count;
      if (offset < lines.length) {
        y += gap;
        addPage();
      }
    }
    y += gap;
  };
  const addSection = title => {
    y += 3; addText(title, { size: 14, color: green, gap: 4 });
  };
  drawHeader();
  addText(`${label('pdf.name')}: ____________________________________     ${label('pdf.date')}: ${now.toLocaleDateString('es-PY')}`, { size: 9 });
  addSection(label('pdf.before'));
  addText(label('pdf.instructions'));
  if (isJopara) addText(label('pdf.joparaNote'), { size: 8, color: soft });
  addSection(label('pdf.assumptionsTitle'));
  addText(label('pdf.assumptions'), { size: 9 });

  const conceptIds = new Set(displayExercises.map(item => item.expectedConcept));
  const relevantConcepts = localizedConcepts.filter(item => conceptIds.has(item.id));
  if (relevantConcepts.length) {
    addSection(label('pdf.relations'));
    for (const concept of relevantConcepts) addText(`${concept.name}: ${pdfMath(concept.formula || concept.definition)}`, { size: 9 });
  }

  addSection(label('pdf.exercises'));
  localized.forEach((exercise, index) => {
    const scenario = SCENARIO_MESSAGE[exercise.scenario];
    const difficulty = DIFFICULTY_MESSAGE[exercise.difficulty?.toLocaleLowerCase('es')];
    addText(`${index + 1}. ${exercise.topic}${scenario ? ' · ' + label(scenario) : ''} · ${difficulty ? label(difficulty) : exercise.difficulty}`, { size: 11, color: green, gap: 2 });
    addText(pdfMath(exercise.question), { size: 9, indent: 3, gap: 4 });
    for (let line = 0; line < 2; line += 1) {
      if (y + 8 > PAGE.bottom) addPage();
      doc.setDrawColor(205, 218, 209); doc.line(PAGE.margin + 3, y + 4, PAGE.width - PAGE.margin, y + 4); y += 8;
    }
  });

  addPage(); addSection(label('pdf.review'));
  localized.forEach((exercise, index) => {
    addText(`${index + 1}. ${exercise.topic}`, { size: 10, color: green, gap: 2 });
    addText(`${label('pdf.answer')}: ${formatNumber(exercise.correctAnswer)} ${exercise.unit}`, { size: 9, indent: 3 });
    if (exercise.hints?.length) addText(pdfMath(exercise.hints.at(-1)), { size: 8, indent: 3 });
  });

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

  const pages = doc.getNumberOfPages();
  for (let current = 1; current <= pages; current += 1) {
    doc.setPage(current); doc.setDrawColor(210, 220, 215); doc.line(PAGE.margin, 284, PAGE.width - PAGE.margin, 284);
    doc.setFont('NotoSans', 'normal'); doc.setFontSize(7); doc.setTextColor(...soft);
    doc.text(label('pdf.footer'), PAGE.margin, 289); doc.text(`${label('pdf.page')} ${current} / ${pages}`, PAGE.width - PAGE.margin, 289, { align: 'right' });
  }
  return doc;
}

export async function downloadStudyPdf(options = {}) {
  const doc = await createStudyPdf(options);
  doc.save('PyFis_IA_Ficha_Aula.pdf');
  return doc;
}
