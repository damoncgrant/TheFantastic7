// Fetch helpers for the Django auth API. Handles reading the CSRF cookie
// and attaching it as a header, which Django's session auth requires on
// every unsafe (non-GET) request.
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      'X-CSRFToken': getCookie('csrftoken') ?? '',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

export function fetchCsrf(options) {
  return apiRequest('/api/auth/csrf/', options);
}

export function fetchCurrentUser(options) {
  return apiRequest('/api/auth/me/', options);
}

export function signup({ email, password, name, role }) {
  return apiRequest('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  });
}

export function login({ email, password }) {
  return apiRequest('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiRequest('/api/auth/logout/', { method: 'POST' });
}

export function fetchRecruiterDashboard(options) {
  return apiRequest('/api/recruiter/dashboard/', options);
}

export function createRecruiterJob(job, photo) {
  if (photo) {
    const formData = new FormData();
    Object.entries(job).forEach(([key, value]) => {
      formData.append(key, key === 'requirements' ? JSON.stringify(value) : value);
    });
    formData.append('photo', photo);
    return apiRequest('/api/recruiter/jobs/', {
      method: 'POST',
      body: formData,
    });
  }
  return apiRequest('/api/recruiter/jobs/', {
    method: 'POST',
    body: JSON.stringify(job),
  });
}

export function updateRecruiterJob(jobId, changes) {
  return apiRequest(`/api/recruiter/jobs/${jobId}/`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function uploadRecruiterJobPhoto(jobId, photo) {
  const formData = new FormData();
  formData.append('photo', photo);
  return apiRequest(`/api/recruiter/jobs/${jobId}/photo/`, {
    method: 'POST',
    body: formData,
  });
}

export function removeRecruiterJobPhoto(jobId) {
  return apiRequest(`/api/recruiter/jobs/${jobId}/photo/`, { method: 'DELETE' });
}

export function uploadCandidateProfilePhoto(photo) {
  const formData = new FormData();
  formData.append('photo', photo);
  return apiRequest('/api/candidate/profile/photo/', {
    method: 'POST',
    body: formData,
  });
}

export function removeCandidateProfilePhoto() {
  return apiRequest('/api/candidate/profile/photo/', { method: 'DELETE' });
}

export function reviewCandidateApplication(applicationId, decision) {
  return apiRequest(`/api/applications/${applicationId}/swipe/`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}

export function fetchConversations(options) {
  return apiRequest('/api/conversations/', options);
}

export function fetchMessages(applicationId, options) {
  return apiRequest(`/api/applications/${applicationId}/messages/`, options);
}

export function sendMessage(applicationId, body) {
  return apiRequest(`/api/applications/${applicationId}/messages/send/`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function createResume(payload) {
  await fetchCsrf();
  return apiRequest('/api/resumes/', { method: 'POST', body: JSON.stringify(payload) });
}
