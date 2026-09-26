import { useState } from 'react';
import Icon from './Icon.jsx';

export default function CurriculumBadge() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón flotante en la esquina inferior */}
      <aside className="curriculum-corner-badge" aria-label="Fuente y trazabilidad curricular">
        <button
          type="button"
          className="curriculum-badge-btn"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Verificación curricular: Resolución MEC N.º 12506 y OpenStax Physics"
        >
          <span className="curriculum-badge-icon" aria-hidden="true"><Icon name="class" size={16} /></span>
          <span className="curriculum-badge-text">
            <strong>MEC Res. 12506</strong>
            <small>Física contrastada</small>
          </span>
        </button>
      </aside>

      {/* Modal con los detalles y enlaces de la fuente */}
      {open && (
        <div
          className="curriculum-dialog-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="curriculum-dialog card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="curriculum-dialog-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="curriculum-dialog-header">
              <span className="panel-eyebrow">TRAZABILIDAD Y ACREDITACIÓN</span>
              <h2 id="curriculum-dialog-title">Marco Curricular y Fuentes Oficiales</h2>
              <button
                type="button"
                className="curriculum-close-btn"
                onClick={() => setOpen(false)}
                aria-label="Cerrar detalles de fuentes"
              >
                ✕
              </button>
            </div>

            <div className="curriculum-dialog-body">
              <section className="curriculum-source-block">
                <div className="curriculum-source-tag">
                  <span className="chip chip-consolidated">Fuente Oficial Principal</span>
                </div>
                <h3>Ministerio de Educación y Ciencias (MEC) — Paraguay</h3>
                <p>
                  <strong>Documento:</strong> Actualización Curricular del Bachillerato Científico:
                  Plan Común y Plan Específico en Ciencias Básicas y Tecnología.
                </p>
                <p>
                  <strong>Normativa legal:</strong> Aprobado por <strong>Resolución MEC N.º 12506</strong>.
                </p>
                <p>
                  <strong>Contenidos contrastados:</strong> Mecánica, Movimiento Parabólico (3.º curso, pág. 251),
                  Calorimetría y Equilibrio Térmico (1.º y 3.º cursos, págs. 142 y 252), Óptica Geométrica (2.º curso, págs. 143-144),
                  Cinemática y Ley de Hooke (1.º curso, págs. 140-141).
                </p>
                <a
                  href="https://www.mec.gov.py/cms_v2/adjuntos/6838"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary curriculum-source-link"
                >
                  <span>Ver documento oficial del MEC</span>
                  <Icon name="arrow" size={16} />
                </a>
              </section>

              <section className="curriculum-source-block">
                <div className="curriculum-source-tag">
                  <span className="chip">Respaldo Teórico Internacional</span>
                </div>
                <h3>OpenStax, Rice University</h3>
                <p>
                  <strong>Obra:</strong> <em>College Physics 2e</em> & <em>Physics</em> (Edición digital).
                </p>
                <p>
                  <strong>Licencia:</strong> Creative Commons Attribution 4.0 International (CC BY 4.0).
                </p>
                <p>
                  <strong>Cálculo:</strong> Verificado con motor determinista de física sin alucinaciones numéricas.
                </p>
                <a
                  href="https://openstax.org/books/college-physics-2e"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary curriculum-source-link"
                >
                  <span>Consultar OpenStax Physics</span>
                  <Icon name="arrow" size={16} />
                </a>
              </section>
            </div>

            <div className="curriculum-dialog-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setOpen(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
