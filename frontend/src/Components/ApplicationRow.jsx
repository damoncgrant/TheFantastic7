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
      <span className="application-row-arrow" aria-hidden="true">›</span>
    </article>
  );
}

const emptyApplicationsCopy = {
  all: {
    title: 'No outgoing applications',
    description: 'Swipe right on a job to send your first application.',
    showSwipeButton: true,
  },
  applied: {
    title: 'No applications waiting on a response',
    description: 'Swipe right on a job to send your first application.',
    showSwipeButton: true,
  },
  interview: {
    title: 'You have no applications with interviews',
    description: 'Interview invites from employers will show up here.',
    showSwipeButton: false,
  },
  offer: {
    title: 'You have no applications with offers',
    description: 'Offers from employers will show up here.',
    showSwipeButton: false,
  },
  rejected: {
    title: 'You have no rejected applications',
    description: 'Good news — keep an eye on your other applications.',
    showSwipeButton: false,
  },
};

export function EmptyApplications({ filter = 'all' }) {
  const { title, description, showSwipeButton } = emptyApplicationsCopy[filter] ?? emptyApplicationsCopy.all;

  return (
    <section className="empty-applications">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {showSwipeButton && (
          <a className="primary-button button-link swipe-button" href="#swipe">
            <span className="swipe-button-copy">
              <strong>Start swiping</strong>
              <small>Find jobs to apply to</small>
            </span>
            <span className="swipe-button-icon" aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </section>
  );
}
