import { useState } from 'react';

export default function PdfButton({ onPdf }) {
  const [showNote, setShowNote] = useState(false);

  const handleClick = () => {
    if (typeof onPdf === 'function') {
      onPdf();
      return;
    }
    setShowNote((value) => !value);
  };

  return (
    <div className="pdf-button">
      <button
        type="button"
        className="btn btn-light"
        aria-expanded={showNote}
        onClick={handleClick}
      >
        Ficha Aula PDF
      </button>
      {showNote && (
        <p className="pdf-note" role="status">
          Módulo en desarrollo: la Ficha Aula PDF estará disponible pronto.
        </p>
      )}
      {/* TODO: generar el PDF del aula en el cliente (próximo commit). */}
    </div>
  );
}
