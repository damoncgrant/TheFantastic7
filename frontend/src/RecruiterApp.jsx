import { useCallback, useEffect, useState } from 'react';
import { createRecruiterJob, fetchRecruiterDashboard } from './api.js';

const recruiterNavigation = [
  { id: 'recruiter-overview', label: 'Overview' },
  { id: 'recruiter-jobs', label: 'Job postings' },
  { id: 'recruiter-candidates', label: 'Candidates' },
];

function RecruiterHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function JobRow({ job }) {
  return (
    <article className="recruiter-job-row">
      <span className="recruiter-job-icon" aria-hidden="true">J</span>
      <div>
        <strong>{job.title}</strong>
        <span>{job.company.name} · {job.applicant_count} applicants · {job.new_applicant_count} new</span>
      </div>
      <span className={`recruiter-active-status${job.is_active ? '' : ' inactive'}`}>
        {job.is_active ? 'Active' : 'Closed'}
      </span>
      <button className="secondary-button compact-button" type="button">Manage</button>
    </article>
  );
}

function CandidateCard({ candidate }) {
  const initials = candidate.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="recruiter-candidate-card">
      <span className="candidate-avatar" aria-hidden="true">{initials}</span>
      <div>
        <strong>{candidate.name}</strong>
        <span>{candidate.headline || 'Candidate'} · {candidate.job_title}</span>
      </div>
      <span className="candidate-stage">{candidate.stage_label}</span>
      {candidate.skills?.length > 0 && (
        <div className="candidate-skills" aria-label="Candidate skills">
          {candidate.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      )}
      <button className="secondary-button compact-button" type="button">Review</button>
    </article>
  );
}

function DataState({ loading, error, empty, children }) {
  if (loading) return <p className="recruiter-data-state" role="status">Loading recruiter data…</p>;
  if (error) return <p className="recruiter-data-state error" role="alert">{error}</p>;
  if (empty) return <p className="recruiter-data-state">Nothing here yet.</p>;
  return children;
}

function RecruiterOverview({ name, data, loading, error }) {
  const stats = data?.stats ?? { open_positions: 0, new_applicants: 0, interviews: 0 };
  const jobs = data?.jobs ?? [];
  const activeJobs = jobs.filter((job) => job.is_active);

  return (
    <>
      <RecruiterHeader
        eyebrow="Recruiter workspace"
        title={`Welcome back, ${name}.`}
        description="Review candidates and keep your hiring pipeline moving."
        action={<a className="primary-button button-link" href="#recruiter-new-job">Post a job</a>}
      />

      <section className="recruiter-hero" aria-labelledby="recruiter-hero-heading">
        <div>
          <p className="eyebrow">Candidate review</p>
          <h2 id="recruiter-hero-heading">
            {stats.new_applicants === 1 ? '1 new candidate is ready.' : `${stats.new_applicants} new candidates are ready.`}
          </h2>
          <p>Review applicants across your active job postings.</p>
        </div>
        <a className="recruiter-review-button" href="#recruiter-candidates">
          Review candidates <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="stats-grid" aria-label="Recruiting summary">
        <article className="stat-card"><span>Open positions</span><strong>{stats.open_positions}</strong></article>
        <article className="stat-card"><span>New applicants</span><strong>{stats.new_applicants}</strong></article>
        <article className="stat-card"><span>Interviews</span><strong>{stats.interviews}</strong></article>
      </section>

      <section className="content-panel recruiter-section" aria-labelledby="active-jobs-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Hiring pipeline</p><h2 id="active-jobs-heading">Active job postings</h2></div>
          <a href="#recruiter-jobs">View all</a>
        </div>
        <DataState loading={loading} error={error} empty={!activeJobs.length}>
          <div className="recruiter-job-list">
            {activeJobs.slice(0, 3).map((job) => <JobRow job={job} key={job.id} />)}
          </div>
        </DataState>
      </section>
    </>
  );
}

function RecruiterJobs({ data, loading, error }) {
  const jobs = data?.jobs ?? [];
  return (
    <>
      <RecruiterHeader
        eyebrow="Manage opportunities"
        title="Job postings"
        description="Create roles and follow applicant activity."
        action={<a className="primary-button button-link" href="#recruiter-new-job">Post a job</a>}
      />
      <section className="content-panel page-panel" aria-labelledby="job-postings-heading">
        <div className="section-heading">
          <div><p className="eyebrow">{jobs.filter((job) => job.is_active).length} open</p><h2 id="job-postings-heading">Your postings</h2></div>
        </div>
        <DataState loading={loading} error={error} empty={!jobs.length}>
          <div className="recruiter-job-list">
            {jobs.map((job) => <JobRow job={job} key={job.id} />)}
          </div>
        </DataState>
      </section>
    </>
  );
}

function RecruiterCandidates({ data, loading, error }) {
  const candidates = data?.candidates ?? [];
  return (
    <>
      <RecruiterHeader
        eyebrow="Discover talent"
        title="Candidates"
        description="Review applicants across your job postings."
      />
      <DataState loading={loading} error={error} empty={!candidates.length}>
        <section className="recruiter-candidate-grid" aria-label="Candidates">
          {candidates.map((candidate) => (
            <CandidateCard candidate={candidate} key={candidate.application_id} />
          ))}
        </section>
      </DataState>
    </>
  );
}

function NewJobPage({ onJobCreated }) {
  const [form, setForm] = useState({
    company_name: '',
    title: '',
    location: '',
    compensation: '',
    employment_type: 'Full-time',
    description: '',
    requirements: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitJob(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createRecruiterJob({
        ...form,
        requirements: form.requirements.split(',').map((item) => item.trim()).filter(Boolean),
      });
      await onJobCreated();
      window.location.hash = 'recruiter-jobs';
    } catch (submitError) {
      setError(submitError.message || 'Could not post this job.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <RecruiterHeader
        eyebrow="Create an opportunity"
        title="Post a job"
        description="Publish a role directly to the applicant swipe deck."
      />
      <form className="recruiter-job-form content-panel page-panel" onSubmit={submitJob}>
        <div className="recruiter-form-grid">
          <label>Company name<input name="company_name" value={form.company_name} onChange={updateField} maxLength="120" required /></label>
          <label>Job title<input name="title" value={form.title} onChange={updateField} maxLength="160" required /></label>
          <label>Location<input name="location" value={form.location} onChange={updateField} maxLength="120" required /></label>
          <label>Compensation<input name="compensation" value={form.compensation} onChange={updateField} maxLength="120" placeholder="$70,000–$90,000" required /></label>
          <label>
            Employment type
            <select name="employment_type" value={form.employment_type} onChange={updateField}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
            </select>
          </label>
          <label>Requirements<input name="requirements" value={form.requirements} onChange={updateField} placeholder="React, JavaScript, Git" /></label>
        </div>
        <label>
          Job description
          <textarea name="description" value={form.description} onChange={updateField} rows="7" required />
        </label>
        {error && <p className="recruiter-form-error" role="alert">{error}</p>}
        <div className="recruiter-form-actions">
          <a className="secondary-button button-link" href="#recruiter-jobs">Cancel</a>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish job'}
          </button>
        </div>
      </form>
    </>
  );
}

const recruiterPages = {
  'recruiter-overview': RecruiterOverview,
  'recruiter-jobs': RecruiterJobs,
  'recruiter-candidates': RecruiterCandidates,
  'recruiter-new-job': NewJobPage,
};

function getRecruiterPage() {
  const page = window.location.hash.slice(1);
  return Object.hasOwn(recruiterPages, page) ? page : 'recruiter-overview';
}

export default function RecruiterApp({ user, onLogout }) {
  const [activePage, setActivePage] = useState(getRecruiterPage);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ActivePage = recruiterPages[activePage];
  const displayName = user.name || user.email;

  const loadDashboard = useCallback(async (options) => {
    try {
      setLoading(true);
      setError('');
      const dashboard = await fetchRecruiterDashboard(options);
      setData(dashboard);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message || 'Could not load recruiter data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const updatePage = () => setActivePage(getRecruiterPage());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  return (
    <div className="app-shell recruiter-shell">
      <aside className="sidebar" aria-label="Recruiter navigation">
        <a className="brand" href="#recruiter-overview" aria-label="Jobbler recruiter home">
          <span className="brand-mark">J</span>
          <span className="recruiter-brand-name">jobbler <small>hire</small></span>
        </a>
        <span className="workspace-label">Hiring workspace</span>

        <nav className="nav-links">
          {recruiterNavigation.map((item) => (
            <a className={`nav-link ${activePage === item.id ? 'active' : ''}`} href={`#${item.id}`} aria-current={activePage === item.id ? 'page' : undefined} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="recruiter-account">
          <span className="avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
          <span><strong>{displayName}</strong><small>Recruiter</small></span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard recruiter-dashboard" key={activePage}>
        <div className="recruiter-workspace-bar" aria-label="Current workspace">
          <span className="recruiter-workspace-icon" aria-hidden="true">R</span>
          <span><strong>Recruiter Workspace</strong><small>Hiring and candidate management</small></span>
          <span className="recruiter-mode-pill">Recruiter mode</span>
        </div>
        <ActivePage name={displayName} data={data} loading={loading} error={error} onJobCreated={loadDashboard} />
      </main>
    </div>
  );
}
