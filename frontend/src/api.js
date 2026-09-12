// Fetch helpers for the Django auth API. Handles reading the CSRF cookie
// and attaching it as a header, which Django's session auth requires on
// every unsafe (non-GET) request.
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
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
