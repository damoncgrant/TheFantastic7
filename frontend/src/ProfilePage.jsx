import { useEffect, useRef, useState } from 'react';
import { getInitials, getProfileStorageKey, hasProfileChanges } from './profile';
import { prepareProfilePicture } from './profilePicture';

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

export default function ProfilePage({ profile, onSave, accountEmail, onLogout }) {
  const [draft, setDraft] = useState(() => ({ ...profile }));
  const [feedback, setFeedback] = useState(null);
  const [pictureError, setPictureError] = useState('');
  const [processingPicture, setProcessingPicture] = useState(false);
  const pictureInput = useRef(null);
  const pictureRequest = useRef(0);
  const hasChanges = hasProfileChanges(profile, draft);

  useEffect(() => () => { pictureRequest.current += 1; }, []);

  async function choosePicture(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++pictureRequest.current;
    setPictureError('');
    setFeedback(null);
    setProcessingPicture(true);
    try {
      const picture = await prepareProfilePicture(file);
      if (request === pictureRequest.current) {
        setDraft((current) => ({ ...current, picture }));
      }
    } catch (error) {
      if (request === pictureRequest.current) setPictureError(error.message);
    } finally {
      if (request === pictureRequest.current) setProcessingPicture(false);
    }
  }

  function removePicture() {
    pictureRequest.current += 1;
    setProcessingPicture(false);
    setPictureError('');
    setFeedback(null);
    setDraft((current) => ({ ...current, picture: '' }));
  }

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  }

  function saveProfile(event) {
    event.preventDefault();
    if (processingPicture) return;
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
    pictureRequest.current += 1;
    setProcessingPicture(false);
    setPictureError('');
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
        <button className="secondary-button" type="button" onClick={onLogout}>Log out</button>
      </header>

      <form className="profile-editor" onSubmit={saveProfile} onReset={resetProfile}>
        <section className="content-panel page-panel" aria-labelledby="personal-details-heading">
          <div className="profile-nameplate">
            <button className="avatar profile-avatar profile-picture-button" type="button"
              onClick={() => pictureInput.current.click()} disabled={processingPicture}
              aria-label={draft.picture ? 'Change profile picture' : 'Choose profile picture'}
              aria-describedby="picture-hint" title="Choose profile picture">
              {draft.picture ? <img src={draft.picture} alt="" /> : getInitials(draft.name)}
            </button>
            <div>
              <h2>{draft.name.trim() || 'Your name'}</h2>
              <p>{draft.headline.trim() || 'Your professional headline'}</p>
            </div>
            <span className="completion">Job seeker</span>
          </div>
          <div className="profile-picture-controls">
            <input ref={pictureInput} type="file" accept="image/jpeg,image/png,image/webp"
              aria-label="Choose profile picture" onChange={choosePicture} hidden />
            {draft.picture && <div className="profile-picture-actions">
              <button className="secondary-button" type="button" onClick={removePicture}>Remove picture</button>
            </div>}
            <p className="field-hint" id="picture-hint">Click your profile picture to choose a JPG, PNG, or WebP, up to 5 MB. Your picture will be cropped to a square. Select Save changes to keep it.</p>
            <p className="field-hint" role="status">{processingPicture ? 'Preparing your picture…' : ''}</p>
            {pictureError && <p className="picture-error" role="alert">{pictureError}</p>}
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
            <button className="secondary-button" type="reset" disabled={!hasChanges && !processingPicture}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!hasChanges || processingPicture}>Save changes</button>
          </div>
        </div>
      </form>
    </>
  );
}
