import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRecruiterJob,
  fetchRecruiterDashboard,
  removeRecruiterJobPhoto,
  reviewCandidateApplication,
  updateRecruiterJob,
  uploadRecruiterJobPhoto,
} from './api.js';
import DMPage from './DMPage.jsx';
import NotificationsPage, { useNotifications } from './NotificationsPage.jsx';

const recruiterNavigation = [
  { id: 'recruiter-overview', label: 'Overview' },
  { id: 'recruiter-jobs', label: 'Job postings' },
  { id: 'recruiter-candidates', label: 'Candidates' },
  { id: 'recruiter-messages', label: 'Messages' },
  { id: 'recruiter-notifications', label: 'Notifications' },
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
      {job.photo_url ? (
        <img className="recruiter-job-photo" src={job.photo_url} alt={`${job.title} at ${job.company.name}`} />
      ) : (
        <span className="recruiter-job-icon" aria-hidden="true">J</span>
      )}
      <div>
        <strong>{job.title}</strong>
        <span>{job.company.name} · {job.applicant_count} applicants · {job.new_applicant_count} new</span>
      </div>
      <span className={`recruiter-active-status${job.is_active ? '' : ' inactive'}`}>
        {job.is_active ? 'Active' : 'Closed'}
      </span>
      <a className="secondary-button compact-button button-link" href={`#recruiter-manage-job?job=${job.id}`}>
        Manage
      </a>
    </article>
  );
}

function candidateInitials(candidate) {
  return candidate.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ManagedApplicantRow({ candidate }) {
  const appliedDate = new Date(candidate.applied_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="recruiter-applicant-row">
      {candidate.photo_url ? (
        <img className="recruiter-applicant-avatar recruiter-applicant-photo" src={candidate.photo_url} alt={`${candidate.name}'s profile`} />
      ) : (
        <span className="recruiter-applicant-avatar" aria-hidden="true">{candidateInitials(candidate)}</span>
      )}
      <div className="recruiter-applicant-details">
        <strong>{candidate.name}</strong>
        <span>{candidate.headline || 'Candidate'} · Applied {appliedDate}</span>
      </div>
      {candidate.skills?.length > 0 && (
        <div className="recruiter-applicant-skills" aria-label={`${candidate.name}'s skills`}>
          {candidate.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      )}
      <span className={`candidate-stage stage-${candidate.stage}`}>{candidate.stage_label}</span>
      {candidate.recruiter_decision === 'pending' && (
        <a className="secondary-button compact-button button-link" href="#recruiter-candidates">Review</a>
      )}
    </article>
  );
}

function applicantBelongsToJob(candidate, job) {
  if (!job) return false;

  // Prefer the database id. The title/company fallback also handles dashboard data
  // that was already loaded before job_id was added to the API response.
  if (candidate.job_id !== undefined && candidate.job_id !== null) {
    return String(candidate.job_id) === String(job.id);
  }
  return candidate.job_title === job.title && candidate.company_name === job.company.name;
}

function CandidateResumePanel({ candidate, imageError, onImageError }) {
  return (
    <aside className="recruiter-resume-panel" aria-labelledby="candidate-resume-heading">
      <div className="recruiter-resume-heading">
        <div>
          <p className="eyebrow">Submitted document</p>
          <h2 id="candidate-resume-heading">Candidate resume</h2>
        </div>
        {candidate.resume && <span>{candidate.resume.name}</span>}
      </div>
      {!candidate.resume ? (
        <div className="recruiter-resume-empty">
          <strong>No resume submitted</strong>
          <p>This candidate does not have a saved resume available.</p>
        </div>
      ) : imageError ? (
        <div className="recruiter-resume-empty" role="alert">
          <strong>Resume preview unavailable</strong>
          <p>The saved resume could not be rendered. The candidate can update it and apply again.</p>
        </div>
      ) : (
        <img src={candidate.resume.image_url} alt={`${candidate.name}'s submitted resume`} onError={onImageError} />
      )}
    </aside>
  );
}

function RecruiterCandidateSwiper({ candidates, onCandidateReviewed }) {
  const [queue, setQueue] = useState(candidates);
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState(null);
  const [error, setError] = useState('');
  const [resumeImageError, setResumeImageError] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const current = queue[0];

  useEffect(() => setQueue(candidates), [candidates]);
  useEffect(() => setResumeImageError(false), [current?.application_id]);

  const commitSwipe = useCallback(async (direction) => {
    if (!current || exiting) return;
    setError('');
    setExiting(direction);
    try {
      await reviewCandidateApplication(current.application_id, direction);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setQueue((items) => items.slice(1));
      setDragX(0);
      setExiting(null);
      await onCandidateReviewed();
    } catch (reviewError) {
      setDragX(0);
      setExiting(null);
      setError(reviewError.message || 'Could not update this application.');
    }
  }, [current, exiting, onCandidateReviewed]);

  if (!current) {
    return (
      <section className="recruiter-swipe-empty">
        <span aria-hidden="true">✓</span>
        <h2>Candidate queue complete</h2>
        <p>New applicants will appear here when they apply to one of your jobs.</p>
      </section>
    );
  }

  const initials = candidateInitials(current);
  const keywords = current.keywords?.length
    ? current.keywords
    : current.skills?.length ? current.skills : [current.job_title, 'Applicant'];
  const cardTransform = exiting
    ? `translateX(${exiting === 'right' ? '125%' : '-125%'}) rotate(${exiting === 'right' ? '12deg' : '-12deg'})`
    : `translateX(${dragX}px) rotate(${dragX / 28}deg)`;

  function beginDrag(event) {
    dragging.current = true;
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (dragging.current && !exiting) setDragX(event.clientX - startX.current);
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > 90) commitSwipe('right');
    else if (dragX < -90) commitSwipe('left');
    else setDragX(0);
  }

  return (
    <section className="recruiter-swipe-screen" aria-label="Candidate review">
      <div className="recruiter-swipe-progress">
        <span>{queue.length} awaiting review</span>
        <span>Drag or use the buttons</span>
      </div>

      <div className="recruiter-review-layout">
        <article
          className={`recruiter-swipe-card${exiting ? ' is-exiting' : ''}`}
          style={{ transform: cardTransform }}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="recruiter-swipe-portrait">
            <span className="recruiter-swipe-label">Candidate profile</span>
            {current.photo_url ? (
              <img className="recruiter-swipe-photo" src={current.photo_url} alt={`${current.name}'s profile`} />
            ) : (
              <span className="recruiter-swipe-avatar" aria-hidden="true">{initials}</span>
            )}
            {Math.abs(dragX) > 55 && (
              <span className={`recruiter-swipe-stamp ${dragX > 0 ? 'offer' : 'reject'}`}>
                {dragX > 0 ? 'Offer' : 'Reject'}
              </span>
            )}
          </div>
          <div className="recruiter-swipe-details">
            <div>
              <h2>{current.name}</h2>
              <p>{current.headline || 'Candidate'}</p>
            </div>
            <p className="recruiter-applied-role">Applied for <strong>{current.job_title}</strong> at {current.company_name}</p>
            {current.bio && <p className="recruiter-candidate-bio">{current.bio}</p>}
            <div className="recruiter-swipe-skills" aria-label="Candidate keywords">
              {keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
            </div>
          </div>
        </article>

        <CandidateResumePanel
          candidate={current}
          imageError={resumeImageError}
          onImageError={() => setResumeImageError(true)}
        />
      </div>

      <div className="recruiter-swipe-actions">
        <button className="recruiter-reject-button" type="button" onClick={() => commitSwipe('left')} disabled={Boolean(exiting)}>
          <span aria-hidden="true">×</span> Reject
        </button>
        <button className="recruiter-offer-button" type="button" onClick={() => commitSwipe('right')} disabled={Boolean(exiting)}>
          Make offer <span aria-hidden="true">✓</span>
        </button>
      </div>
      {error && <p className="recruiter-form-error recruiter-swipe-error" role="alert">{error}</p>}
    </section>
  );
}

function DataState({ loading, error, empty, children }) {
  if (loading) return <p className="recruiter-data-state" role="status">Loading recruiter data…</p>;
  if (error) return <p className="recruiter-data-state error" role="alert">{error}</p>;
  if (empty) return <p className="recruiter-data-state">Nothing here yet.</p>;
  return children;
}

function RecruiterOverview({ name, data, loading, error }) {
  const stats = data?.stats ?? { open_positions: 0, new_applicants: 0, offers: 0 };
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
        <article className="stat-card"><span>Offers</span><strong>{stats.offers}</strong></article>
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

function RecruiterCandidates({ data, loading, error, onCandidateReviewed }) {
  const allCandidates = data?.candidates ?? [];
  const candidates = allCandidates.filter((candidate) => candidate.recruiter_decision === 'pending');

  let content;
  if (loading) {
    content = <DataState loading />;
  } else if (error) {
    content = <DataState error={error} />;
  } else if (allCandidates.length === 0) {
    content = (
      <section className="recruiter-candidates-empty" aria-labelledby="no-candidates-heading">
        <div className="recruiter-empty-count" aria-hidden="true">
          <strong>0</strong>
          <span>Applicants</span>
        </div>
        <div className="recruiter-empty-copy">
          <p className="eyebrow">Your candidate queue is empty</p>
          <h2 id="no-candidates-heading">No candidates have applied yet</h2>
          <p>When someone applies to one of your job postings, their profile will appear here for you to review.</p>
          <div className="recruiter-empty-actions">
            <a className="primary-button button-link" href="#recruiter-jobs">View job postings</a>
            <a className="secondary-button button-link" href="#recruiter-new-job">Post another job</a>
          </div>
        </div>
      </section>
    );
  } else if (candidates.length === 0) {
    content = (
      <section className="recruiter-candidates-empty compact" aria-labelledby="reviewed-candidates-heading">
        <div className="recruiter-empty-count complete" aria-hidden="true">✓</div>
        <div className="recruiter-empty-copy">
          <p className="eyebrow">Review complete</p>
          <h2 id="reviewed-candidates-heading">You’ve reviewed every applicant</h2>
          <p>There are no pending candidates right now. New applications will appear here automatically.</p>
        </div>
      </section>
    );
  } else {
    content = <RecruiterCandidateSwiper candidates={candidates} onCandidateReviewed={onCandidateReviewed} />;
  }

  return (
    <>
      <RecruiterHeader
        eyebrow="Discover talent"
        title="Candidates"
        description="Swipe right to make an offer, or left to reject an application."
      />
      {content}
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
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function selectPhoto(event) {
    const selectedPhoto = event.target.files?.[0] ?? null;
    if (!selectedPhoto) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selectedPhoto.type)) {
      setError('Choose a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (selectedPhoto.size > 5 * 1024 * 1024) {
      setError('Choose a job photo smaller than 5 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setPhoto(selectedPhoto);
  }

  async function submitJob(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createRecruiterJob({
        ...form,
        requirements: form.requirements.split(',').map((item) => item.trim()).filter(Boolean),
      }, photo);
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
        <label className="recruiter-photo-field">
          Job photo <span className="recruiter-optional-label">Optional · PNG, JPEG, or WebP · maximum 5 MB</span>
          <span className="recruiter-photo-upload">
            {photoPreview ? (
              <img src={photoPreview} alt="Selected job preview" />
            ) : (
              <span className="recruiter-photo-placeholder" aria-hidden="true">Add photo</span>
            )}
            <span className="recruiter-photo-controls">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectPhoto} />
              <small>{photo ? photo.name : 'This image will be shown at the top of the applicant swipe card.'}</small>
            </span>
          </span>
        </label>
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

function ManageJobPage({ data, loading, error, jobId, onJobUpdated }) {
  const job = data?.jobs?.find((item) => String(item.id) === String(jobId));
  // The dashboard contains applicants for every recruiter posting; scope this list to the selected job.
  const applicants = (data?.candidates ?? []).filter((candidate) => applicantBelongsToJob(candidate, job));
  const pendingApplicantCount = applicants.filter((candidate) => candidate.recruiter_decision === 'pending').length;
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Reset the editor whenever a different posting is selected or refreshed.
  useEffect(() => {
    if (!job) return;
    setForm({
      company_name: job.company.name,
      title: job.title,
      location: job.location,
      compensation: job.compensation,
      employment_type: job.employment_type,
      description: job.description,
      requirements: job.requirements.join(', '),
    });
  }, [job]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFeedback('');
  }

  function selectPhoto(event) {
    const selectedPhoto = event.target.files?.[0] ?? null;
    if (!selectedPhoto) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selectedPhoto.type)) {
      setFormError('Choose a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (selectedPhoto.size > 5 * 1024 * 1024) {
      setFormError('Choose a job photo smaller than 5 MB.');
      event.target.value = '';
      return;
    }
    setFormError('');
    setFeedback('');
    setPhoto(selectedPhoto);
  }

  async function saveJob(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFeedback('');
    try {
      await updateRecruiterJob(job.id, {
        ...form,
        requirements: form.requirements.split(',').map((item) => item.trim()).filter(Boolean),
      });
      if (photo) await uploadRecruiterJobPhoto(job.id, photo);
      setPhoto(null);
      await onJobUpdated();
      setFeedback('Job posting updated.');
    } catch (saveError) {
      setFormError(saveError.message || 'Could not update this job.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removePhoto() {
    setSubmitting(true);
    setFormError('');
    setFeedback('');
    try {
      await removeRecruiterJobPhoto(job.id);
      setPhoto(null);
      await onJobUpdated();
      setFeedback('Job photo removed.');
    } catch (removeError) {
      setFormError(removeError.message || 'Could not remove this job photo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleJobStatus() {
    setSubmitting(true);
    setFormError('');
    setFeedback('');
    try {
      await updateRecruiterJob(job.id, { is_active: !job.is_active });
      await onJobUpdated();
      setFeedback(job.is_active ? 'Job posting closed.' : 'Job posting reopened.');
    } catch (statusError) {
      setFormError(statusError.message || 'Could not change this job’s status.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <DataState loading />;
  if (error) return <DataState error={error} />;
  if (!jobId || !job || !form) {
    return <DataState error="This job posting could not be found, or it does not belong to your account." />;
  }

  return (
    <>
      <RecruiterHeader
        eyebrow="Manage opportunity"
        title={job.title}
        description={`Edit the posting applicants see for ${job.company.name}.`}
        action={<a className="secondary-button button-link" href="#recruiter-jobs">Back to postings</a>}
      />

      <section className="recruiter-manage-summary" aria-label="Posting summary">
        <span className={`recruiter-active-status${job.is_active ? '' : ' inactive'}`}>
          {job.is_active ? 'Open and visible' : 'Closed'}
        </span>
        <span>{job.applicant_count} applicants</span>
        <span>{job.new_applicant_count} awaiting review</span>
      </section>

      <form className="recruiter-job-form content-panel page-panel" onSubmit={saveJob}>
        <div className="recruiter-form-grid">
          <label>Company name<input name="company_name" value={form.company_name} onChange={updateField} maxLength="120" required /></label>
          <label>Job title<input name="title" value={form.title} onChange={updateField} maxLength="160" required /></label>
          <label>Location<input name="location" value={form.location} onChange={updateField} maxLength="120" required /></label>
          <label>Compensation<input name="compensation" value={form.compensation} onChange={updateField} maxLength="120" required /></label>
          <label>
            Employment type
            <select name="employment_type" value={form.employment_type} onChange={updateField}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
            </select>
          </label>
          <label>Requirements<input name="requirements" value={form.requirements} onChange={updateField} placeholder="React, JavaScript, Git" /></label>
        </div>
        <div className="recruiter-photo-field">
          <strong>Job photo <span className="recruiter-optional-label">Optional · PNG, JPEG, or WebP · maximum 5 MB</span></strong>
          <div className="recruiter-photo-upload">
            {photoPreview || job.photo_url ? (
              <img src={photoPreview || job.photo_url} alt="Current job preview" />
            ) : (
              <span className="recruiter-photo-placeholder" aria-hidden="true">No photo</span>
            )}
            <span className="recruiter-photo-controls">
              <input
                key={photo ? photo.name : job.photo_url}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Replace job photo"
                onChange={selectPhoto}
              />
              <small>{photo ? `${photo.name} will replace the current photo when you save.` : 'Choose a new image to replace the current job photo.'}</small>
              {job.photo_url && !photo && (
                <button className="recruiter-remove-photo" type="button" onClick={removePhoto} disabled={submitting}>
                  Remove current photo
                </button>
              )}
            </span>
          </div>
        </div>
        <label>
          Job description
          <textarea name="description" value={form.description} onChange={updateField} rows="7" required />
        </label>
        {formError && <p className="recruiter-form-error" role="alert">{formError}</p>}
        {feedback && <p className="recruiter-form-success" role="status">{feedback}</p>}
        <div className="recruiter-form-actions recruiter-manage-actions">
          <button className="secondary-button recruiter-status-button" type="button" onClick={toggleJobStatus} disabled={submitting}>
            {job.is_active ? 'Close posting' : 'Reopen posting'}
          </button>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="content-panel recruiter-manage-applicants" aria-labelledby="managed-applicants-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{applicants.length} total · {pendingApplicantCount} awaiting review</p>
            <h2 id="managed-applicants-heading">Applicants</h2>
          </div>
          {pendingApplicantCount > 0 && <a href="#recruiter-candidates">Review pending</a>}
        </div>

        {applicants.length > 0 ? (
          <div className="recruiter-applicant-list">
            {applicants.map((candidate) => (
              <ManagedApplicantRow candidate={candidate} key={candidate.application_id} />
            ))}
          </div>
        ) : (
          <div className="recruiter-job-applicants-empty">
            <span aria-hidden="true">0</span>
            <div>
              <h3>No applicants for this job yet</h3>
              <p>Candidate profiles will appear here after someone swipes right and applies.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

const recruiterPages = {
  'recruiter-overview': RecruiterOverview,
  'recruiter-jobs': RecruiterJobs,
  'recruiter-candidates': RecruiterCandidates,
  'recruiter-messages': DMPage,
  'recruiter-notifications': NotificationsPage,
  'recruiter-new-job': NewJobPage,
  'recruiter-manage-job': ManageJobPage,
};

function getRecruiterPage(route) {
  const page = route.split('?')[0];
  return Object.hasOwn(recruiterPages, page) ? page : 'recruiter-overview';
}

function getManagedJobId(route) {
  return new URLSearchParams(route.split('?')[1] || '').get('job');
}

export default function RecruiterApp({ user, onLogout }) {
  const [activeRoute, setActiveRoute] = useState(() => window.location.hash.slice(1) || 'recruiter-overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activePage = getRecruiterPage(activeRoute);
  const ActivePage = recruiterPages[activePage];
  const displayName = user.name || user.email;
  const notifications = useNotifications(Boolean(user), user.email);

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
  }, [activeRoute, loadDashboard]);

  // Candidate details can change in another signed-in window; refresh when the
  // recruiter returns so newly saved profile pictures appear without a hard reload.
  useEffect(() => {
    const refreshDashboard = () => loadDashboard();
    window.addEventListener('focus', refreshDashboard);
    return () => window.removeEventListener('focus', refreshDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    const updatePage = () => setActiveRoute(window.location.hash.slice(1) || 'recruiter-overview');
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
              {item.id === 'recruiter-messages' && notifications.unreadMessageCount > 0 && <span className="notification-count" aria-label={`${notifications.unreadMessageCount} unread messages`}>{notifications.unreadMessageCount}</span>}
              {item.id === 'recruiter-notifications' && notifications.unreadCount > 0 && <span className="notification-count" aria-label={`${notifications.unreadCount} unread notifications`}>{notifications.unreadCount}</span>}
            </a>
          ))}
        </nav>

        <div className="recruiter-account">
          <span className="avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
          <span><strong>{displayName}</strong><small>Recruiter</small></span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard recruiter-dashboard" key={activeRoute}>
        <div className="recruiter-workspace-bar" aria-label="Current workspace">
          <span className="recruiter-workspace-icon" aria-hidden="true">R</span>
          <span><strong>Recruiter Workspace</strong><small>Hiring and candidate management</small></span>
          <span className="recruiter-mode-pill">Recruiter mode</span>
        </div>
        <ActivePage
          user={user}
          messagesRoute="recruiter-messages"
          name={displayName}
          data={data}
          loading={loading}
          error={error}
          jobId={getManagedJobId(activeRoute)}
          onJobCreated={loadDashboard}
          onJobUpdated={loadDashboard}
          onCandidateReviewed={loadDashboard}
          notifications={notifications}
        />
      </main>
    </div>
  );
}
