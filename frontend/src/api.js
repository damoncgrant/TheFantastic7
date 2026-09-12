// Fetch helpers for the Django auth API. Handles reading the CSRF cookie
// and attaching it as a header, which Django's session auth requires on
// every unsafe (non-GET) request.
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
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

export function fetchCsrf() {
  return request('/api/auth/csrf/');
}

export function fetchCurrentUser() {
  return request('/api/auth/me/');
}

export function signup({ email, password, role }) {
  return request('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export function login({ email, password }) {
  return request('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request('/api/auth/logout/', { method: 'POST' });
}
