import React from "react";

/**
 * JobDetail
 * Full job description page. Takes the job object to display and an
 * onBack callback — the caller decides what "back" means (swipe deck,
 * applications list, etc), so this component stays reusable from
 * either entry point.
 */
export default function JobDetail({ job, onBack }) {
  if (!job) return null;

  return (
    <div>
      <div>
        <button onClick={onBack}>
          Back
        </button>

        <div>
          <div>
            <div>
              {job.initials}
            </div>
            <div>
              <h1>
                {job.title}
              </h1>
              <div>
                {job.company} · {job.location}
              </div>
            </div>
          </div>

          <div>
            {job.status}

            <p>
              {job.description}
            </p>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <div>
                <h3>
                  What you'd do
                </h3>
                <ul>
                  {job.responsibilities.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              {(job.tags || []).map((tag) => (
                <span key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
