// Fetches the applications a candidate has actually applied to, for the
// dashboard's "recent applications" / "all applications" lists.
export async function fetchApplications(candidateId, options) {
  const response = await fetch(
    `/api/candidate/applications/?candidate_id=${encodeURIComponent(candidateId)}`,
    options,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data.applications;
}
