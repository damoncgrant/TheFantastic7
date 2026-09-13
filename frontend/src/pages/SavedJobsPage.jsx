import PageHeader from '../Components/PageHeader.jsx';
import { savedJobs } from '../appData.js';

export default function SavedJobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Come back anytime"
        title="Saved jobs"
        description="Roles worth a closer look before you apply."
        action={<button className="primary-button" type="button">Find more jobs</button>}
      />

      <section className="saved-grid" aria-label="Saved job listings">
        {savedJobs.map((job) => (
          <article className="saved-card" key={`${job.company}-${job.role}`}>
            <div className="saved-card-top">
              <span className="company-mark" aria-hidden="true">{job.company.charAt(0)}</span>
              <button className="bookmark-button" type="button" aria-label={`Remove ${job.role} from saved jobs`}>
                Saved
              </button>
            </div>
            <div>
              <h2>{job.role}</h2>
              <p>{job.company}</p>
            </div>
            <div className="job-meta">
              <span>{job.location}</span>
              <span>{job.type}</span>
            </div>
            <button className="secondary-button" type="button">View job</button>
          </article>
        ))}
      </section>
    </>
  );
}
