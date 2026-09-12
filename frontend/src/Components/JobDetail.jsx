/**
 * JobDetail
 * Full-page view of an application, shown when a user clicks a row on the
 * Overview or Applications page. `job` is the flattened application object
 * from applications.js, which carries the full job posting under `job.job`.
 */
export default function JobDetail({ job: application, onBack }) {
  if (!application) return null;

  const job = application.job || {};
  const companyName = job.company?.name || application.company;
  const avatarSrc = application.profile || job.photo_url || job.company?.logo_url;
  const statusClass = (application.status || '').toLowerCase();

  return (
    <div className="dashboard job-detail-page">
      <button className="link-button back-link" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back
      </button>

      <header className="page-header job-detail-header">
        <div className="job-detail-identity">
          {avatarSrc ? (
            <img className="company-profile job-detail-avatar" src={avatarSrc} alt="" />
          ) : (
            <span className="company-mark job-detail-avatar" aria-hidden="true">
              {(companyName || '?').charAt(0)}
            </span>
          )}
          <div>
            <h1>{job.title || application.role}</h1>
            <p>{[companyName, job.location].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {application.status && <span className={`status ${statusClass}`}>{application.status}</span>}
      </header>

      <section className="content-panel page-panel job-detail-panel">
        <div className="job-meta">
          {application.date && <span>Applied {application.date}</span>}
          {job.compensation && <span>{job.compensation}</span>}
          {job.employment_type && <span>{job.employment_type}</span>}
        </div>

        {job.description && (
          <div className="resume-section">
            <h3>About the role</h3>
            <p>{job.description}</p>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="resume-section">
            <h3>What you'd bring</h3>
            <div className="skill-list">
              {job.requirements.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
