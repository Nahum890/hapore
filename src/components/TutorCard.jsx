export default function TutorCard({ tutor }) {
  const message = tutor?.message ?? '¡Mba\'éichapa! Eju, jahechami Física juntos.';

  return (
    <section className="card tutor-card" aria-label="Tutor Jopara">
      <div className="tutor-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" focusable="false">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="10" r="1.4" fill="currentColor" />
          <circle cx="15" cy="10" r="1.4" fill="currentColor" />
          <path d="M8.5 14.5 Q 12 17 15.5 14.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="tutor-body">
        <p className="tutor-message" role="status">{message}</p>
        {tutor?.esHint && <p className="tutor-es-hint">{tutor.esHint}</p>}
        {tutor?.followUp && <p className="tutor-follow-up">{tutor.followUp}</p>}
        <p className="tutor-source">
          Tutor offline por reglas{tutor?.source ? ` · ${tutor.source}` : ''}
        </p>
      </div>
    </section>
  );
}
