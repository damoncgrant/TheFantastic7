import { useState } from 'react';
import PageHeader from '../Components/PageHeader.jsx';
import { ApplicationRow, EmptyApplications } from '../Components/ApplicationRow.jsx';
import { applicationFilters } from '../appData.js';

export default function ApplicationsPage({ applications, applicationsLoading, onSelectJob }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const filteredApplications = activeFilter === 'all'
    ? applications
    : applications.filter((application) => application.stage === activeFilter);

  return (
    <>
      <PageHeader
        eyebrow="Track your progress"
        title="Applications"
        description="Every opportunity and update in one place."
      />

      <section className="filter-row" aria-label="Application filters">
        {applicationFilters.map((filter) => (
          <button
            className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveFilter(filter)}
            key={filter}
          >
            {filter === 'all' ? 'All' : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`}
          </button>
        ))}
      </section>

      <section className="content-panel page-panel" aria-labelledby="all-applications-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{filteredApplications.length} shown</p>
            <h2 id="all-applications-heading">
              {activeFilter === 'all' ? 'All applications' : `${activeFilter.charAt(0).toUpperCase()}${activeFilter.slice(1)} applications`}
            </h2>
          </div>
        </div>
        {applicationsLoading ? (
          <p>Loading applications…</p>
        ) : filteredApplications.length === 0 ? (
          <EmptyApplications />
        ) : (
          <div className="application-list">
            {filteredApplications.map((application) => (
              <ApplicationRow application={application} onSelectJob={onSelectJob} key={application.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
