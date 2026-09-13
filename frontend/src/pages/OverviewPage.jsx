import { useEffect, useState } from 'react';
import PageHeader from '../Components/PageHeader.jsx';
import { ApplicationRow, EmptyApplications } from '../Components/ApplicationRow.jsx';

function greetingForTime(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewPage({ profile, applications, applicationsLoading, onSelectJob }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const applicationStats = [
    { label: 'Applications sent', value: applications.length },
    { label: 'Interviews', value: applications.filter((application) => application.stage === 'interview').length },
    { label: 'Offers', value: applications.filter((application) => application.stage === 'offer').length },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Your job search, organized"
        title={`${greetingForTime(now)}, ${profile.name}.`}
        description="Keep moving toward work that fits your life."
        action={<a className="secondary-button button-link" href="#resume">Edit resume</a>}
      />

      <section className="swipe-card" aria-labelledby="swipe-heading">
        <div>
          <p className="eyebrow">More opportunities. More life.</p>
          <h2 id="swipe-heading">Find your next fit.</h2>
          <p>Review roles chosen around your skills and preferences.</p>
        </div>
        <a className="primary-button button-link swipe-button" href="#swipe">
          <span className="swipe-button-copy">
            <strong>Start swiping</strong>
            <small>Find jobs to apply to</small>
          </span>
          <span className="swipe-button-icon" aria-hidden="true">→</span>
        </a>
      </section>

      <section className="stats-grid" aria-label="Application summary">
        {applicationStats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-panel" aria-labelledby="recent-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stay in the loop</p>
            <h2 id="recent-heading">Recent applications</h2>
          </div>
          <a href="#applications">View all</a>
        </div>
        {applicationsLoading ? null : applications.length === 0 ? (
          <EmptyApplications />
        ) : (
          <div className="application-list">
            {applications.slice(0, 3).map((application) => (
              <ApplicationRow application={application} onSelectJob={onSelectJob} key={application.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
