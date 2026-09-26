import { useEffect, useRef, useState } from 'react';

const STEPS = [
  {
    number: '01', label: 'Practicar', title: 'Probá un ejercicio',
    description: 'Elegí una situación (dron, básquetbol o paredón), leé el ejercicio, escribí tu respuesta y tocá “Comprobar con el simulador”. La escena de abajo usa los datos de ese ejercicio y muestra el resultado.',
    tip: 'Cada acierto suma XP (sube tu nivel) y confianza (cuánto acertás sin pistas). Ninguna de las dos baja si te equivocás. Mirá el panel de la derecha.',
  },
  {
    number: '02', label: 'Repasar', title: 'Aprendé con tarjetas',
    description: 'Elegí cuántas tarjetas querés estudiar. Leé la pregunta, girá la tarjeta para ver la respuesta y decidí si ya la sabés o querés verla otra vez.',
    tip: 'Después del mazo empieza el cuestionario.',
  },
  {
    number: '03', label: 'Conversar', title: 'Preguntale al tutor',
    description: 'En “Tutor” elegí Cuestionario para repasar fichas y practicar, o Chat libre para preguntar sin completar el repaso.',
    tip: 'El tutor libre también puede ayudarte sin conexión.',
  },
  {
    number: '04', label: 'Aula', title: 'Compartí una clase',
    description: 'En “Aula” podés crear un código para elegir temas y ejercicios, o ingresar el código de tu docente. Ahí también están los conceptos y el glosario.',
    tip: 'La ficha PDF se descarga desde la cabecera.',
  },
];

export default function Onboarding({ open, onDismiss, onStart, role = 'alumno' }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      setStep(0);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  const current = step === 3 && role === 'alumno'
    ? { number: '04', label: 'Mi clase', title: 'Usá el código de tu docente', description: 'Ingresalo en “Mi clase” para ver los materiales que preparó. Tu progreso se guarda en este dispositivo.', tip: 'También podés practicar por tu cuenta sin código.' }
    : step === 3
      ? { number: '04', label: 'Aula', title: 'Elegí una herramienta', description: 'En “Aula” podés compartir una clase con un código, crear un ejercicio o proyectar un simulador, ejercicio o concepto.', tip: 'El código ajusta los materiales en el dispositivo del alumno; su progreso no se envía a esta pantalla.' }
      : STEPS[step];
  return (
    <dialog ref={dialogRef} className="onboarding-dialog" aria-labelledby="onboarding-title" onCancel={event => { event.preventDefault(); onDismiss(); }} onClick={event => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="onboarding-shell">
        <div className="onboarding-top"><span className="onboarding-brand">GuaranIA / PyFis IA · Guía rápida</span><button type="button" className="onboarding-close" aria-label="Cerrar guía" onClick={onDismiss}>×</button></div>
        <p className="onboarding-progress-label">Tarjeta {step + 1} de {STEPS.length}</p>
        <div className="onboarding-progress" aria-hidden="true">{STEPS.map((item, index) => <span key={item.number} className={index <= step ? 'is-active' : ''} />)}</div>
        <article className="onboarding-card" key={current.number}>
          <div className="onboarding-card-head"><span className="onboarding-number">{current.number}</span><span className="onboarding-label">{current.label}</span></div>
          <h2 id="onboarding-title">{current.title}</h2>
          <p>{current.description}</p>
          <div className="onboarding-tip"><strong>Consejo</strong><span>{current.tip}</span></div>
        </article>
        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={onDismiss}>Omitir guía</button>
          <div className="onboarding-steps">
            {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(value => value - 1)}>Anterior</button>}
            {step < STEPS.length - 1
              ? <button type="button" className="btn btn-primary" onClick={() => setStep(value => value + 1)}>Siguiente</button>
              : <button type="button" className="btn btn-primary" onClick={onStart}>Empezar a practicar</button>}
          </div>
        </div>
      </div>
    </dialog>
  );
}
