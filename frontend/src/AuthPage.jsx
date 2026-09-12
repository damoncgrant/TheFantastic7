// Login/signup screen shown to a signed-out user. Toggles between the two
// modes and, when signing up, asks whether the account is an applicant or
// an employer.
import { useState } from 'react';
import { login, signup } from './api.js';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('applicant');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = isSignup
        ? await signup({ email, password, name, role })
        : await login({ email, password });
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card content-panel">
        <p className="eyebrow">{isSignup ? 'Create your account' : 'Welcome back'}</p>
        <h1>{isSignup ? 'Join jobbler' : 'Log in to jobbler'}</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                maxLength={150}
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </label>

          {isSignup && (
            <fieldset className="role-fieldset">
              <legend>I am an...</legend>
              <div className="role-options">
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="applicant"
                    checked={role === 'applicant'}
                    onChange={(event) => setRole(event.target.value)}
                  />
                  Applicant
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="employer"
                    checked={role === 'employer'}
                    onChange={(event) => setRole(event.target.value)}
                  />
                  Employer
                </label>
              </div>
            </fieldset>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <button
          className="link-button"
          type="button"
          onClick={() => {
            setError('');
            setMode(isSignup ? 'login' : 'signup');
          }}
        >
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
