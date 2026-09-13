import { useEffect, useRef, useState } from 'react';
import PageHeader from '../Components/PageHeader.jsx';
import { ApplicationRow, EmptyApplications } from '../Components/ApplicationRow.jsx';
import { applicationFilters } from '../appData.js';

const initialDateStart = new Date(2026, 0, 1);

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function dateFromInput(value, useEndOfDay = false) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return useEndOfDay ? endOfDay(date) : date;
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DateRangeFilter({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function closeWhenClickingOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', closeWhenClickingOutside);
    return () => document.removeEventListener('mousedown', closeWhenClickingOutside);
  }, []);

  const dateLabelOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  return (
    <div className="date-filter-group">
      <span className="date-filter-label">Date range</span>
      <div className="date-filter" ref={popoverRef}>
        <button
          type="button"
          className="date-filter-button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="date-filter-icon" aria-hidden="true">📅</span>
          <span>{startDate.toLocaleDateString(undefined, dateLabelOptions)} — {endDate.toLocaleDateString(undefined, dateLabelOptions)}</span>
        </button>

        {open && (
          <div className="date-popover" role="dialog" aria-label="Select date range">
            <label>
              From
              <input
                type="date"
                value={dateInputValue(startDate)}
                max={dateInputValue(endDate)}
                onChange={(event) => onChange(dateFromInput(event.target.value), endDate)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={dateInputValue(endDate)}
                min={dateInputValue(startDate)}
                onChange={(event) => onChange(startDate, dateFromInput(event.target.value, true))}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage({ applications, applicationsLoading, onSelectJob }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeDateStart, setActiveDateStart] = useState(initialDateStart);
  const [activeDateEnd, setActiveDateEnd] = useState(() => endOfDay(new Date()));
  const filteredApplications = applications
    .filter((application) => activeFilter === 'all' || application.stage === activeFilter)
    .filter((application) => {
      const appliedDate = application.date instanceof Date ? application.date : new Date(application.date);
      return appliedDate >= activeDateStart && appliedDate <= activeDateEnd;
    });

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

      <DateRangeFilter
        startDate={activeDateStart}
        endDate={activeDateEnd}
        onChange={(startDate, endDate) => {
          setActiveDateStart(startDate);
          setActiveDateEnd(endDate);
        }}
      />

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
          <EmptyApplications filter={activeFilter} />
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
