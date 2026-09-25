import { useState } from 'react';
import { jsPDF } from 'jspdf';
import exercisesData from '../data/exercises.json';
import conceptsData from '../data/concepts.json';
import glossaryData from '../data/glossary.json';

/**
 * Genera el documento PDF A4 de la Ficha de Estudio GuaranIA.
 * 100% en el cliente sin llamadas a internet (ideal para modo avión).
 */
export function generateGuaraniaPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // --- Paleta Oficial de Colores Kyre'y-devs ---
  const COLOR_VERDE = [27, 77, 62];       // #1B4D3E - Verde Monte Atlántico
  const COLOR_TIERRA = [192, 74, 38];     // #C04A26 - Tierra Colorada
  const COLOR_AZUL = [2, 132, 199];       // #0284C7 - Azul Itaipú
  const COLOR_GRIS = [31, 41, 55];        // #1F2937 - Gris Carbón
  const COLOR_CLARO = [240, 245, 243];    // Fondo tenue institucional

  let y = 14;

  // --- ENCABEZADO INSTITUCIONAL ---
  doc.setFillColor(...COLOR_VERDE);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GUARANIA • Ficha de Aula e Imprimible', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Física de 3.º de Bachillerato | MEC Paraguay • Movimiento Parabólico', margin + 6, y + 14);
  doc.text('Kyhyje\'ỹ IA — Alto Paraná', pageWidth - margin - 6, y + 14, { align: 'right' });

  y += 26;

  // --- DATOS DEL ESTUDIANTE / AULA ---
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 12, 1, 1, 'S');

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Colegio / Institución: ____________________________________________________', margin + 4, y + 5);
  doc.text('Estudiante: _______________________________________   Sección: _________   Fecha: ____/____/2026', margin + 4, y + 9.5);

  y += 16;

  // --- SECCIÓN 1: CAJA RESUMEN DE FÓRMULAS CURRICULARES (MEC) ---
  doc.setFillColor(...COLOR_CLARO);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');
  doc.setDrawColor(...COLOR_AZUL);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'S');

  doc.setTextColor(...COLOR_AZUL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Fórmulas Clave de Cinemática 2D (Ecuaciones Horarias)', margin + 4, y + 6);

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Columna 1: Componentes
  doc.text('• Componente Horizontal (MRU):', margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('  vx = v0 · cos(θ)   [constante]', margin + 4, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.text('• Componente Vertical (MRUV):', margin + 4, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.text('  vy(t) = v0 · sen(θ) - g · t', margin + 4, y + 25);

  // Columna 2: Parámetros globales de vuelo (suelo horizontal)
  const col2X = margin + (contentWidth / 2);
  doc.setFont('helvetica', 'normal');
  doc.text('• Posición Horizontal: x(t) = x0 + vx · t', col2X, y + 12);
  doc.text('• Posición Vertical: y(t) = y0 + vy · t - 0.5 · g · t²', col2X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text('• Tiempo de Vuelo: T = 2 · vy / g', col2X, y + 21);
  doc.text('• Alcance Horizontal: R = (v0² · sen(2θ)) / g', col2X, y + 25);

  y += 34;

  // --- SECCIÓN 2: PROBLEMAS DE APLICACIÓN EN ALTO PARANÁ ---
  doc.setTextColor(...COLOR_TIERRA);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. Misiones de Vuelo y Resolución (Convención de Aula: g = 10 m/s²)', margin, y + 4);

  y += 7;

  // Problema 1: Componentes
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(210, 215, 220);
  doc.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, 'S');

  doc.setTextColor(...COLOR_VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Misión 1 (Hernandarias) — Descomposición del Vector Velocidad', margin + 4, y + 5);

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(
    'Un dron despega desde la base con v0 = 20 m/s a un ángulo θ = 30° respecto al suelo. Calculá:',
    margin + 4,
    y + 9.5,
  );
  doc.text('a) La componente horizontal de velocidad vx = v0 · cos(30°).', margin + 6, y + 14);
  doc.text('b) La componente vertical inicial vy = v0 · sen(30°).', margin + 6, y + 18);

  // Espacio cuadriculado para resolver
  doc.setDrawColor(225, 230, 235);
  doc.setLineWidth(0.2);
  doc.rect(margin + 4, y + 21, contentWidth - 8, 10, 'S');
  doc.setTextColor(150, 155, 160);
  doc.setFontSize(7);
  doc.text('Espacio para desarrollo y cálculos:', margin + 6, y + 25);
  doc.text('Respuesta: vx ≈ 17,32 m/s  |  vy = 10 m/s', pageWidth - margin - 8, y + 29, { align: 'right' });

  y += 38;

  // Problema 2: Tiempo de vuelo y alcance
  doc.setDrawColor(210, 215, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 36, 1.5, 1.5, 'S');

  doc.setTextColor(...COLOR_VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Misión 2 (Río Acaray) — Tiempo en el Aire y Alcance Horizontal', margin + 4, y + 5);

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(
    'Con los datos del despegue anterior (v0 = 20 m/s, θ = 30°, vy = 10 m/s, vx ≈ 17,32 m/s) y g = 10 m/s²:',
    margin + 4,
    y + 9.5,
  );
  doc.text('a) ¿Cuánto tiempo dura el vuelo completo hasta tocar el suelo (T = 2 · vy / g)?', margin + 6, y + 14);
  doc.text('b) ¿Qué distancia horizontal total logra cruzar el dron (R = vx · T)?', margin + 6, y + 18);

  doc.setDrawColor(225, 230, 235);
  doc.setLineWidth(0.2);
  doc.rect(margin + 4, y + 21, contentWidth - 8, 12, 'S');
  doc.setTextColor(150, 155, 160);
  doc.setFontSize(7);
  doc.text('Espacio para desarrollo y cálculos:', margin + 6, y + 25);
  doc.text('Respuesta: T = 2,0 s  |  R ≈ 34,64 metros', pageWidth - margin - 8, y + 31, { align: 'right' });

  y += 40;

  // Problema 3: Puesto a 40 metros
  doc.setDrawColor(210, 215, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 36, 1.5, 1.5, 'S');

  doc.setTextColor(...COLOR_VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Misión 3 (Entrega Sanitaria) — Ajuste de Ángulo de Entrega', margin + 4, y + 5);

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(
    'Un puesto médico se encuentra a 40 metros del dron. Si la velocidad inicial de lanzamiento es 20 m/s:',
    margin + 4,
    y + 9.5,
  );
  doc.text('a) Aplicando R = (v0² · sen(2θ)) / g con R = 40, hallá el valor de sen(2θ).', margin + 6, y + 14);
  doc.text('b) ¿Qué ángulo de lanzamiento θ garantiza la entrega exacta en el puesto?', margin + 6, y + 18);

  doc.setDrawColor(225, 230, 235);
  doc.setLineWidth(0.2);
  doc.rect(margin + 4, y + 21, contentWidth - 8, 12, 'S');
  doc.setTextColor(150, 155, 160);
  doc.setFontSize(7);
  doc.text('Espacio para desarrollo y cálculos:', margin + 6, y + 25);
  doc.text('Respuesta: sen(2θ) = 1,0  ->  2θ = 90°  ->  θ = 45°', pageWidth - margin - 8, y + 31, { align: 'right' });

  y += 40;

  // --- SECCIÓN 3: GLOSARIO JOPARA & AUTOEVALUACIÓN KYHYJE'Ỹ ---
  doc.setFillColor(...COLOR_CLARO);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLOR_VERDE);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'S');

  doc.setTextColor(...COLOR_VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. Glosario Técnico Jopara & Filosofía Kyhyje\'ỹ', margin + 4, y + 5);

  doc.setTextColor(...COLOR_GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('• Pe trayectoria: el camino curvo del dron.', margin + 4, y + 9.5);
  doc.text('• Pe gravedad: aceleración que atrae el dron con -0.5·g·t².', margin + 4, y + 13.5);
  doc.text('• La componente vertical: fuerza de elevación vy = v0 · sen(θ).', margin + 4, y + 17.5);
  doc.text('• Kyhyje\'ỹ: aprender sin miedo a equivocarse; el error es ajuste de trayectoria.', margin + 4, y + 21.5);

  const col2Glos = margin + (contentWidth / 2);
  doc.text('• Pe alcance: distancia horizontal alcanzada (R).', col2Glos, y + 9.5);
  doc.text('• Sen(60°) = Sen(120°): 30° y 60° logran el mismo alcance.', col2Glos, y + 13.5);
  doc.text('• 45° = alcance máximo para cualquier velocidad dada.', col2Glos, y + 17.5);
  doc.text('• Nivel de Confianza: tu progreso solo suma, nunca retrocede.', col2Glos, y + 21.5);

  // --- PIE DE PÁGINA ---
  y = 285;
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setTextColor(120, 125, 130);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(
    'Proyecto GuaranIA • Kyre\'y-devs • Hackathon Kyhyje\'ỹ IA 2026 • Documento imprimible 100% offline (sin internet)',
    margin,
    y + 4,
  );
  doc.text('Página 1 de 1', pageWidth - margin, y + 4, { align: 'right' });

  // Guardar archivo directamente
  doc.save('Ficha_Aula_GuaranIA_Movimiento_Parabolico.pdf');
}

/**
 * Componente React que renderiza la interfaz y el botón de descarga del PDF.
 */
export default function PrintableSheet({ className = '' }) {
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDownload = () => {
    try {
      setDownloading(true);
      generateGuaraniaPdf();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.error('Error generando PDF de aula:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`printable-sheet-wrapper ${className}`}>
      <button
        type="button"
        className="btn btn-primary btn-download-pdf"
        onClick={handleDownload}
        disabled={downloading}
        style={{
          backgroundColor: '#1B4D3E',
          color: '#ffffff',
          fontWeight: '600',
          padding: '10px 18px',
          borderRadius: '8px',
          border: 'none',
          cursor: downloading ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <span>📄</span>
        <span>{downloading ? 'Generando PDF...' : 'Descargar Ficha Aula PDF'}</span>
      </button>
      {success && (
        <span
          className="pdf-success-badge"
          style={{
            color: '#1B4D3E',
            fontSize: '0.85rem',
            marginLeft: '12px',
            fontWeight: '500',
          }}
          role="status"
        >
          ✓ ¡Ficha descargada con éxito en modo offline!
        </span>
      )}
    </div>
  );
}
