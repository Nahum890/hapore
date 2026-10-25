// Tabla de trazabilidad tema → programa del MEC para la página de
// presentación. Se carga solo al abrirla (usa los mismos datos que la app).
import { TOPICS, topicCurriculum, pickLang } from '../curriculum/topics/index.js';
import { SOURCES } from '../curriculum/sources.js';
import { GUIDE_SCHEDULES } from '../curriculum/curriculum.js';

export default function MecTable({ language }) {
  const es = language === 'es';
  return <div className="lp-mec-table-wrap">
    <table className="lp-mec-table">
      <thead><tr><th>{es ? 'Tema' : 'Tema'}</th><th>{es ? 'Dónde figura en el MEC' : 'Moõpa oĩ MEC-pe'}</th><th>{es ? 'Priorización 2021' : 'Priorización 2021'}</th></tr></thead>
      <tbody>{TOPICS.map(topic => {
        const { placements } = topicCurriculum(topic.id);
        return <tr key={topic.id}>
          <th scope="row">{pickLang(topic.name, language)}</th>
          <td>{placements.map(({ course, capacity }, index) => <span key={index}>
            {pickLang(course.name, language)} {pickLang(course.planName, language)}{capacity.n ? `, cap. ${capacity.n}` : ''}
            <small> — {course.base ? `${SOURCES.A.resolution}, ${course.base.pages}` : `${pickLang(SOURCES.C.short, language)}, ${GUIDE_SCHEDULES[course.id]?.pages ?? ''}`}</small>
          </span>)}</td>
          <td>{placements.filter(p => p.course.prio).map(({ course, capacity }, index) => <span key={index}>
            {pickLang(course.name, language)}: {capacity.prio !== null ? `n.º ${capacity.prio}` : (es ? 'no figura' : 'ndaipóri')}
          </span>)}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
