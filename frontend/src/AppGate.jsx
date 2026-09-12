// Gates the app behind login. Shows AuthPage until a session exists, then
// renders the existing App unchanged. Kept separate from App.jsx so the
// dashboard code doesn't need to be touched to add auth.
import { useEffect, useState } from 'react';
import App from './App.jsx';
import AuthPage from './AuthPage.jsx';
import { fetchCsrf, fetchCurrentUser } from './api.js';

export default function AppGate() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        await fetchCsrf({ signal: controller.signal });
        const { user } = await fetchCurrentUser({ signal: controller.signal });
        setStatus(user ? 'authenticated' : 'guest');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus('guest');
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, []);

  if (status === 'loading') {
    return <p role="status">Loading…</p>;
  }

  if (status === 'authenticated') {
    return <App />;
  }

  return <AuthPage onAuthenticated={() => setStatus('authenticated')} />;
}
