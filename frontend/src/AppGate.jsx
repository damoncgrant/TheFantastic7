// Gates the app behind login. Shows AuthPage until a session exists, then
// renders the existing App unchanged. Kept separate from App.jsx so the
// dashboard code doesn't need to be touched to add auth.
import { useEffect, useState } from 'react';
import App from './App.jsx';
import AuthPage from './AuthPage.jsx';
import RecruiterApp from './RecruiterApp.jsx';
import ResumeOnboarding from './resume_builder/ResumeOnboarding.jsx';
import { fetchCsrf, fetchCurrentUser, logout } from './api.js';

// "employer" is the current database value for recruiter accounts.
const recruiterRoles = new Set(['employer', 'recruiter']);

const isResumeOnboardingPreview = () => new URLSearchParams(window.location.search).get('onboarding') === 'resume';

function clearResumeOnboardingPreview() {
  const url = new URL(window.location.href);
  url.searchParams.delete('onboarding');
  window.history.replaceState({}, '', url);
}

export default function AppGate() {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [showResumeOnboarding, setShowResumeOnboarding] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        await fetchCsrf({ signal: controller.signal });
        const { user: currentUser } = await fetchCurrentUser({ signal: controller.signal });
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'guest');
        setShowResumeOnboarding(Boolean(currentUser && isResumeOnboardingPreview()));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus('guest');
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      setStatus('guest');
    }
  }

  if (status === 'loading') {
    return <p role="status">Loading…</p>;
  }

  if (status === 'authenticated' && user) {
    if (recruiterRoles.has(user.role)) {
      return <RecruiterApp user={user} onLogout={handleLogout} />;
    }
    if (showResumeOnboarding) {
      return <ResumeOnboarding onComplete={(destination) => {
        setShowResumeOnboarding(false);
        clearResumeOnboardingPreview();
        if (destination === 'resume') window.location.hash = '#resume';
      }} />;
    }
    return <App user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthPage
      onAuthenticated={(authedUser, { isNewAccount } = {}) => {
        setUser(authedUser);
        setStatus('authenticated');
        setShowResumeOnboarding(Boolean(isNewAccount || isResumeOnboardingPreview()));
      }}
    />
  );
}
