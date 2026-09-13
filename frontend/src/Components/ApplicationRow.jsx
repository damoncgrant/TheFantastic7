export function ApplicationRow({ application, onSelectJob }) {
  const statusClass = application.status.toLowerCase();

  return (
    <article
      className={`application-row application-${statusClass}`}
      onClick={() => onSelectJob(application)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelectJob(application);
      }}
    >
      {application.profile ? (
        <img
          className="company-profile"
          src={application.profile}
          alt={`Company contact for ${application.company}`}
        />
      ) : (
        <span className="company-mark" aria-hidden="true">
          {application.company.charAt(0)}
        </span>
      )}
      <div className="application-details">
        <strong>{application.role}</strong>
        <span>{application.company}{application.date ? ` • ${application.date}` : ''}</span>
      </div>
      <span className={`status ${statusClass}`}>
        {application.status}
      </span>
    </article>
  );
}

export function EmptyApplications() {
  return (
    <section className="empty-applications">
      <div>
        <h2>No outgoing applications</h2>
        <p>Swipe right on a job to send your first application.</p>
        <a className="primary-button button-link swipe-button" href="#swipe">
          <span className="swipe-button-copy">
            <strong>Start swiping</strong>
            <small>Find jobs to apply to</small>
          </span>
          <span className="swipe-button-icon" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
