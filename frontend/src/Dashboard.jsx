// Placeholder screen shown once a user is logged in, until the real
// post-login experience is built.
import { logout } from './api.js';

export default function Dashboard({ user, onLoggedOut }) {
  async function handleLogout() {
    await logout();
    onLoggedOut();
  }

  return (
    <main>
      <h1>Welcome</h1>
      <p>
        Logged in as {user.email} ({user.role})
      </p>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}
