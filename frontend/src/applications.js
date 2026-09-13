// Fetches the applications a candidate has actually applied to, for the
// dashboard's "recent applications" list and stat counts. Flattens the
// API's nested job/company shape and keeps the raw `stage` value so
// callers can compute counts per stage (applied/interview/offer/rejected).
export async function fetchApplications(candidateId, options) {
  const response = await fetch(
    `/api/applications/?candidate_id=${encodeURIComponent(candidateId)}`,
    options,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data.applications.map((application) => ({
    id: application.id,
    stage: application.stage,
    company: application.job.company.name,
    role: application.job.title,
    date: new Date(application.applied_at),
    status: application.stage_label,
    // Prefer the posting photo uploaded by the recruiter, then fall back to its company logo.
    profile: application.job.photo_url || application.job.company.logo_url,
    // Full job details, kept around for the job detail screen.
    job: application.job,
  }));
}
