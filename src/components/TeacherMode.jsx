export default function TeacherMode({ attempts, confidence }) {
  return (
    <section className="card teacher-mode" aria-label="Modo docente">
      <h2>Modo docente</h2>
      <p className="teacher-note">
        Módulo en desarrollo: permitirá revisar el progreso del aula desde la perspectiva del docente.
      </p>
      <ul className="teacher-stats">
        <li>Intentos registrados: {attempts}</li>
        <li>Confianza actual: {Math.round(confidence)}%</li>
      </ul>
      {/* TODO: modo docente completo (próximas iteraciones). */}
    </section>
  );
}
