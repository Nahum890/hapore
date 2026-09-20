import { useState } from 'react';
import { generateGuaraniaPdf } from './PrintableSheet.jsx';

export default function PdfButton() {
  const [generating, setGenerating] = useState(false);

  const handleClick = () => {
    try {
      setGenerating(true);
      generateGuaraniaPdf();
    } catch (error) {
      console.error('Error generando Ficha Aula PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pdf-button">
      <button
        type="button"
        className="btn btn-light"
        onClick={handleClick}
        disabled={generating}
        title="Descargar Ficha de Estudio en PDF para imprimir sin internet"
      >
        {generating ? 'Generando...' : '📄 Ficha Aula PDF'}
      </button>
    </div>
  );
}
