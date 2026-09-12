import { useState } from 'react';
import { getInitials, getProfileStorageKey } from './profile';

const personalFields = [
  { name: 'name', label: 'Full name', autoComplete: 'name', required: true, maxLength: 100 },
  { name: 'headline', label: 'Professional headline', autoComplete: 'organization-title', placeholder: 'e.g. Software Developer', maxLength: 120 },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@example.com', maxLength: 254 },
  { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel', placeholder: 'e.g. +1 780 555 0123', maxLength: 40 },
  { name: 'location', label: 'Location', autoComplete: 'address-level2', placeholder: 'City, province or state', maxLength: 160 },
];

const linkFields = [
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/your-name', maxLength: 500 },
  { name: 'website', label: 'Website or portfolio URL', type: 'url', autoComplete: 'url', placeholder: 'https://your-website.com', maxLength: 500 },
];

function ProfileField({ field, value, onChange }) {
  const { label, ...inputProps } = field;
  return (
    <label className="profile-field">
      {label}{field.required && <span className="field-hint"> (required)</span>}
      <input {...inputProps} value={value} onChange={onChange} />
    </label>
  );
}

export default function ProfilePage({ profile, onSave, accountEmail }) {
  const [draft, setDraft] = useState(() => ({ ...profile }));
  const [feedback, setFeedback] = useState(null);
  const hasChanges = Object.keys(profile).some((key) => draft[key] !== profile[key]);

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  }

  function saveProfile(event) {
    event.preventDefault();
    const nextProfile = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (!nextProfile.name) {
      setFeedback({ error: true, message: 'Please enter your full name.' });
      event.currentTarget.elements.namedItem('name').focus();
      return;
    }
    try {
      window.localStorage.setItem(getProfileStorageKey(accountEmail), JSON.stringify(nextProfile));
      onSave(nextProfile);
      setDraft(nextProfile);
      setFeedback({ message: 'Your profile has been saved.' });
    } catch {
      setFeedback({ error: true, message: 'Your profile could not be saved in this browser. Please try again.' });
    }
  }

  function resetProfile(event) {
    event.preventDefault();
    setDraft({ ...profile });
    setFeedback({ message: 'Unsaved changes discarded.' });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Make it yours</p>
          <h1>Personal profile</h1>
          <p>A little about you. A stronger start to your next opportunity.</p>
        </div>
      </header>

      <form className="profile-editor" onSubmit={saveProfile} onReset={resetProfile}>
        <section className="content-panel page-panel" aria-labelledby="personal-details-heading">
          <div className="profile-nameplate">
            <span className="avatar profile-avatar" aria-hidden="true">{getInitials(draft.name)}</span>
            <div>
              <h2>{draft.name.trim() || 'Your name'}</h2>
              <p>{draft.headline.trim() || 'Your professional headline'}</p>
            </div>
            <span className="completion">Job seeker</span>
          </div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">The essentials</p>
              <h2 id="personal-details-heading">Personal details</h2>
            </div>
          </div>
          <div className="profile-fields">
            {personalFields.map((field) => <ProfileField key={field.name} field={field} value={draft[field.name]} onChange={updateField} />)}
          </div>
        </section>

        <section className="content-panel" aria-labelledby="about-you-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your story</p>
              <h2 id="about-you-heading">About you</h2>
            </div>
          </div>
          <label className="profile-field">
            Bio
            <textarea name="bio" rows={4} maxLength={1000} aria-describedby="bio-hint" placeholder="Share your interests, experience, and what you’re looking for next." value={draft.bio} onChange={updateField} />
          </label>
          <p className="field-hint bio-hint" id="bio-hint">A short introduction to what makes you, you. {draft.bio.length}/1,000 characters</p>
          <div className="profile-fields">
            {linkFields.map((field) => <ProfileField key={field.name} field={field} value={draft[field.name]} onChange={updateField} />)}
          </div>
        </section>

        <div className="profile-footer">
          <div>
            <p className="field-hint profile-storage-note">Changes are saved in this browser.</p>
            <p className={`profile-feedback ${feedback?.error ? 'error' : ''}`} role="status">
              {feedback?.message || (hasChanges ? 'You have unsaved changes.' : '')}
            </p>
          </div>
          <div className="profile-actions">
            <button className="secondary-button" type="reset" disabled={!hasChanges}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!hasChanges}>Save changes</button>
          </div>
        </div>
      </form>
    </>
  );
}
