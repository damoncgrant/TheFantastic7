import { useRef, useState } from 'react';
import { createResume } from '../api.js';
import ResumeBuilder, { emptyResume } from './ResumeBuilder.jsx';

export default function ResumeOnboarding({ onComplete }) {
  const [step, setStep] = useState('choose');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);

  async function saveBuilder({ name, data }) {
    setSaving(true);
    setError('');
    try {
      await createResume({ name, builderData: data });
      onComplete('resume');
    } catch (err) {
      setError(err.message || 'Could not save your resume.');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function importLatex(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.tex') || !file.size || file.size > 1024 * 1024) {
      setError('Choose a nonempty .tex file smaller than 1 MB.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createResume({ name: file.name.replace(/\.tex$/i, '') || 'Imported resume', latex: await file.text() });
      onComplete('resume');
    } catch (err) {
      setError(err.message || 'Could not import that LaTeX file.');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'builder') {
    return <div className="auth-shell onboarding-builder resume-page"><ResumeBuilder busy={saving} initialResume={emptyResume()} initialName="My resume" onSave={saveBuilder} onClose={() => setStep('choose')} hideRender hideClose /></div>;
  }

  return <div className="auth-shell"><section className="onboarding-card content-panel" aria-labelledby="resume-onboarding-title">
    {step === 'choose' ? <>
      <p className="eyebrow">One strong first step</p>
      <h1 id="resume-onboarding-title">Start your resume?</h1>
      <p className="onboarding-copy">A thoughtful resume gives your job search a strong foundation.</p>
      <div className="onboarding-options">
        <button className="onboarding-option" type="button" onClick={() => setStep('builder')}><strong>Use the builder</strong><span>Build a polished resume step by step.</span></button>
        <button className="onboarding-option" type="button" onClick={() => setStep('latex')}><strong>Import LaTeX</strong><span>Bring your existing .tex resume with you.</span></button>
      </div>
      <button className="link-button onboarding-skip" type="button" onClick={() => onComplete()}>I’ll do this later</button>
    </> : <>
      <p className="eyebrow">Bring your own</p>
      <h1 id="resume-onboarding-title">Import your LaTeX</h1>
      <p className="onboarding-copy">Upload a nonempty .tex file up to 1 MB. You can edit and render it later from your resume library.</p>
      <input ref={fileInput} className="visually-hidden" type="file" accept=".tex" onChange={importLatex} disabled={saving} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        <button className="primary-button" type="button" onClick={() => fileInput.current?.click()} disabled={saving}>{saving ? 'Importing…' : 'Choose .tex file'}</button>
        <button className="link-button" type="button" onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </div>
    </>}
  </section></div>;
}
