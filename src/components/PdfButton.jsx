import { useRef, useState } from 'react';
import exercises from '../data/exercises.json';
import concepts from '../data/concepts.json';
import { readJSON } from '../utils/storage.js';
import { decodeClassConfig, temaMatchesSubtemas } from '../utils/classCode.js';

// Standard PDF fonts support Spanish accents; spell out unsupported mathematical glyphs.
export function printableText(value) {
  return String(value ?? '').replaceAll('θ','ángulo').replaceAll('≈','aprox.').replaceAll('√','raíz de ')
    .replaceAll('→','->').replaceAll('−','-').replace(/[–—]/g,'-').replaceAll('·','*')
    .replace(/[^\x20-\x7e\u00a0-\u00ff\n]/g,'');
}
export async function createStudyPdf(config = null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const available = exercises.filter(item=>temaMatchesSubtemas(item.topic,config?.subtemas));
  const selected = config ? available.slice(0,config.ejercicios) : [...new Map(available.map(item=>[item.topic,item])).values()];
  const conceptIds = new Set(selected.map(item=>item.expectedConcept));
  const green = [27,77,62], ink = [31,41,55];
  let y = 40;
  const header = () => {
    doc.setFillColor(...green); doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.text('GuaranIA | Ficha de aula',16,13);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text('Física - Aprendé, practicá y revisá tu razonamiento',16,21);
    doc.setTextColor(...ink); y=40;
  };
  const ensure = height => { if(y+height>274){doc.addPage();header();} };
  const text = (value,{size=10,bold=false,indent=0}={}) => {
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
    const lines=doc.splitTextToSize(printableText(value),178-indent);
    const height=lines.length*5;
    ensure(height+4);doc.text(lines,16+indent,y);y+=height+3;
  };
  header();
  text('Nombre: __________________________________   Fecha: ______________',{size:9});
  text('Antes de empezar',{size:14,bold:true});
  text('Trabajá con las unidades indicadas. Cada problema especifica sus datos; la gravedad puede ser 9,8 o 10 m/s². Mostrá la fórmula y el procedimiento.');
  for(const concept of concepts.filter(item=>conceptIds.has(item.id))) {
    text(concept.name + ': ' + (concept.formula || concept.definition),{size:9});
  }
  y+=4;
  selected.forEach((exercise,index)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(10);
    const lines=doc.splitTextToSize(printableText(exercise.question),178);
    ensure(18+lines.length*5+29);
    text((index+1)+'. '+exercise.topic,{size:12,bold:true});
    text(exercise.question);
    doc.setDrawColor(210,220,215);
    for(let line=0;line<3;line++){doc.line(16,y+7+line*7,194,y+7+line*7);}
    y+=33;
  });
  doc.addPage();header();
  text('Guía de revisión',{size:15,bold:true});
  text('Compará después de resolver. Un resultado diferente es una oportunidad para revisar datos, unidades y operaciones.');
  selected.forEach((exercise,index)=>{
    ensure(35);
    text((index+1)+'. '+exercise.topic,{bold:true});
    text('Resultado: '+String(exercise.correctAnswer).replace('.',',')+' '+exercise.unit);
    text(exercise.hints.at(-1),{size:9});
  });
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);doc.setDrawColor(210,220,215);doc.line(16,281,194,281);
    doc.setTextColor(80,90,85);doc.setFont('helvetica','normal');doc.setFontSize(8);
    doc.text('GuaranIA - Ficha generada en el dispositivo, disponible sin conexión',16,287);
    doc.text(page+' / '+pages,194,287,{align:'right'});
  }
  return doc;
}
export default function PdfButton() {
  const [generating,setGenerating]=useState(false),[status,setStatus]=useState('');
  const lock=useRef(false);
  const download=async()=>{
    if(lock.current)return;
    lock.current=true;setGenerating(true);setStatus('');
    try{
      const config=decodeClassConfig(readJSON('guarania:classCode',null));
      const doc=await createStudyPdf(config);
      doc.save('Ficha_Aula_GuaranIA.pdf');setStatus('Ficha descargada. Incluye ejercicios y guía de revisión.');
    }catch{setStatus('No se pudo generar la ficha. Probá nuevamente.');}
    finally{lock.current=false;setGenerating(false);}
  };
  return <div className="pdf-button"><button type="button" className="btn btn-light" onClick={download} disabled={generating} aria-label="Descargar ficha de aula en PDF" aria-busy={generating}>{generating?'Generando…':'Ficha PDF'}</button>{status&&<p className="pdf-status" role="status" onClick={()=>setStatus('')}>{status}</p>}</div>;
}
