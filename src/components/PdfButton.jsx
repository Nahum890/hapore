import { useState } from 'react';

export default function PdfButton() {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="pdf-button">
      <button
        type="button"
        className="btn btn-light"
        aria-expanded={showNote}
        onClick={() => setShowNote((value) => !value)}
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
