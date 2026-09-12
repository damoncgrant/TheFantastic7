import { useEffect, useRef, useState } from 'react';
import ResumeBuilder, { emptyResume, normalizeResume } from './ResumeBuilder.jsx';

const RESUMES_KEY = 'thefantastic7-resumes';
const LEGACY_RESUME_KEY = 'thefantastic7-resume-builder';
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createResume = (data = emptyResume()) => ({ id: newId(), name: 'Untitled resume', data: normalizeResume(data), updatedAt: Date.now(), isDefault: false });

function loadResumes() {
  try {
    const saved = JSON.parse(localStorage.getItem(RESUMES_KEY));
    if (Array.isArray(saved)) {
      const resumes = saved.filter((resume) => resume && typeof resume === 'object' && resume.id).map((resume) => ({ ...resume, name: typeof resume.name === 'string' && resume.name.trim() ? resume.name : 'Untitled resume', data: normalizeResume(resume.data), updatedAt: Number(resume.updatedAt) || Date.now() }));
      let foundDefault = false;
      const normalized = resumes.map((resume) => {
        const isDefault = Boolean(resume.isDefault) && !foundDefault;
        if (isDefault) foundDefault = true;
        return { ...resume, isDefault };
      });
      return [...normalized.filter((resume) => resume.isDefault), ...normalized.filter((resume) => !resume.isDefault)];
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_RESUME_KEY));
    if (legacy && typeof legacy === 'object') {
      const migrated = [{ ...createResume(legacy), name: legacy.contact?.name?.trim() || 'My resume', isDefault: true }];
      localStorage.setItem(RESUMES_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* An unavailable or malformed storage entry should not block the library. */ }
  return [];
}

const displayDate = (timestamp) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(timestamp);

export default function ResumePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('resume.png');
  const [resumes, setResumes] = useState(loadResumes);
  const [editingResume, setEditingResume] = useState(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const request = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  function updateResumes(update) { setResumes((current) => { const next = typeof update === 'function' ? update(current) : update; localStorage.setItem(RESUMES_KEY, JSON.stringify(next)); return next; }); }

  async function requestImage(url, body, headers, name) {
    setError(''); setDetails(''); setImageUrl(''); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const tokenResponse = await fetch('/api/csrf/', { signal: controller.signal });
      if (!tokenResponse.ok) throw new Error('Could not connect to the backend. Check that Django is running.');
      const { csrfToken } = await tokenResponse.json();
      const response = await fetch(url, { method: 'POST', body, headers: { 'X-CSRFToken': csrfToken, ...headers }, signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setDetails(data.details || ''); throw new Error(data.error || `Could not render the resume (HTTP ${response.status}).`); }
      if (!response.headers.get('content-type')?.includes('image/png')) throw new Error('The server did not return a resume image. Check that Django is running.');
      setImageUrl(URL.createObjectURL(await response.blob())); setImageName(name);
    } catch (err) { if (err.name !== 'AbortError') setError(err.message || 'Could not render the resume.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function renderResume(resume) {
    const contactName = typeof resume.contact?.name === 'string' ? resume.contact.name.trim() : '';
    requestImage('/api/resumes/build/', JSON.stringify(resume), { 'Content-Type': 'application/json' }, `${contactName || 'resume'}.png`);
  }
  function importLatex(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.tex') || !file.size || file.size > 1024 * 1024) {
      setError('Choose a nonempty .tex file smaller than 1 MB.');
      return;
    }
    file.text().then((latex) => {
      const imported = { ...createResume(), name: file.name.replace(/\.tex$/i, '') || 'Imported resume', source: 'latex', latex };
      updateResumes((current) => [{ ...imported, isDefault: current.length === 0 }, ...current]);
      setShowCreateOptions(false);
    }).catch(() => setError('Could not read that LaTeX file.'));
  }
  function renderLatex(latex, filename = 'resume.png') {
    const body = new FormData();
    body.append('file', new Blob([latex], { type: 'application/x-tex' }), filename.replace(/\.png$/i, '.tex'));
    requestImage('/api/resumes/render/', body, {}, filename);
  }
  function openNewResume() { setImageUrl(''); setError(''); setDetails(''); setShowCreateOptions(false); setEditingResume(createResume()); }
  function openResume(resume) {
    setImageUrl('');
    setError('');
    setDetails('');
    setEditingResume(resume);
    if (resume.source === 'latex') renderLatex(resume.latex || '', `${resume.name}.png`);
    else renderResume(resume.data);
  }
  function closeResume() {
    setImageUrl('');
    setEditingResume(null);
  }
  function saveResume({ name, data }) {
    const saved = { ...editingResume, name, data: normalizeResume(data), updatedAt: Date.now() };
    updateResumes((current) => {
      const exists = current.some((resume) => resume.id === saved.id);
      return exists ? current.map((resume) => resume.id === saved.id ? { ...saved, isDefault: resume.isDefault } : resume) : [{ ...saved, isDefault: current.length === 0 }, ...current];
    });
    setEditingResume((current) => ({ ...current, ...saved }));
  }
  function saveImportedResume({ name, latex }) {
    const saved = { ...editingResume, name, latex, source: 'latex', updatedAt: Date.now() };
    updateResumes((current) => current.map((resume) => resume.id === saved.id ? { ...saved, isDefault: resume.isDefault } : resume));
    setEditingResume(saved);
  }
  function setDefault(id) {
    updateResumes((current) => {
      const selected = current.find((resume) => resume.id === id);
      if (!selected) return current;
      return [{ ...selected, isDefault: true }, ...current.filter((resume) => resume.id !== id).map((resume) => ({ ...resume, isDefault: false }))];
    });
  }
  function deleteResume(id) {
    const resume = resumes.find((item) => item.id === id);
    if (!resume || !window.confirm(`Delete “${resume.name}”? This cannot be undone.`)) return;
    updateResumes((current) => { const remaining = current.filter((item) => item.id !== id); const hasDefault = remaining.some((item) => item.isDefault); return remaining.map((item, index) => ({ ...item, isDefault: hasDefault ? item.isDefault : index === 0 })); });
  }

  const activeResume = editingResume && resumes.find((resume) => resume.id === editingResume.id);
  const builderResume = activeResume || editingResume;
  const createOptions = showCreateOptions && <div className="create-resume-options" role="group" aria-label="Create resume options">
    <button className="secondary" onClick={openNewResume} disabled={busy}>Use resume builder</button>
    <button className="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>Import LaTeX</button>
  </div>;
  return <section className={`resume-page${imageUrl ? ' has-preview' : ''}`}>
    <input ref={fileInput} className="visually-hidden" type="file" accept=".tex" onChange={importLatex} disabled={busy} aria-label="LaTeX file" />
    <div className="resume-library-heading"><div><p className="eyebrow">Your master profile</p><h1>Your resumes</h1><p>Keep versions tailored to different opportunities and choose one default resume.</p></div>{!editingResume && resumes.length > 0 && <div className="resume-create-control"><button onClick={() => setShowCreateOptions((current) => !current)} disabled={busy}>Create new resume</button>{createOptions}</div>}</div>
    {busy && <p role="status">Compiling your resume. This may take up to 40 seconds.</p>}
    {error && <div role="alert" className="error"><p>{error}</p>{details && <details><summary>Compiler details</summary><pre>{details}</pre></details>}</div>}
    {editingResume && (busy || imageUrl) && <section className={`preview${busy ? ' is-loading' : ''}`} aria-label="Resume preview"><div className="preview-heading"><h2>Resume preview</h2>{imageUrl && !busy && <a href={imageUrl} download={imageName}>Download image</a>}</div>{busy ? <div className="resume-preview-loading" role="status"><span className="loading-spinner" aria-hidden="true" /><span>Rendering your resume…</span></div> : <img className="resume-preview-image" src={imageUrl} alt="Rendered resume preview" />}</section>}
    {editingResume ? builderResume.source === 'latex' ? <LatexResumeEditor key={builderResume.id} busy={busy} initialName={builderResume.name} initialLatex={builderResume.latex} onSave={saveImportedResume} onRender={(latex) => renderLatex(latex, `${builderResume.name}.png`)} onClose={closeResume} /> : <ResumeBuilder key={builderResume.id} busy={busy} initialResume={builderResume.data} initialName={builderResume.name} onSave={saveResume} onRender={renderResume} onClose={closeResume} /> : resumes.length === 0 ? <section className="empty-resumes"><div><h2>Create your first resume</h2><p>Start with the builder, then save tailored versions here.</p><button onClick={() => setShowCreateOptions((current) => !current)} disabled={busy}>Create new resume</button>{createOptions}</div></section> : <section className="resume-library" aria-label="Saved resumes">
      {resumes.map((resume) => <article className={`resume-card${resume.isDefault ? ' is-default' : ''}`} key={resume.id}><button className="resume-card-main" onClick={() => openResume(resume)} aria-label={`Edit ${resume.name}`}><div><h2>{resume.name}</h2><p>{resume.source === 'latex' ? 'Imported LaTeX resume' : resume.data.contact.name || 'No contact name yet'}</p></div><span>Updated {displayDate(resume.updatedAt)}</span></button><div className="resume-card-actions">{resume.isDefault ? <span className="default-badge">Default</span> : <button className="secondary small-button" onClick={() => setDefault(resume.id)}>Set as default</button>}<button className="secondary small-button" onClick={() => openResume(resume)}>Edit</button><button className="remove-button" onClick={() => deleteResume(resume.id)}>Delete</button></div></article>)}
    </section>}
  </section>;
}

function LatexResumeEditor({ busy, initialName, initialLatex, onSave, onRender, onClose }) {
  const [name, setName] = useState(initialName);
  const [latex, setLatex] = useState(initialLatex || '');
  const [saved, setSaved] = useState(false);
  const save = () => { onSave({ name: name.trim() || 'Imported resume', latex }); setSaved(true); };
  const saveAndRender = () => { save(); onRender(latex); };
  return <section className="builder" aria-label="LaTeX resume editor">
    <div className="builder-heading"><div><h2>Edit imported LaTeX</h2><p>Your source is saved with this resume and can be edited or rendered again.</p></div><button className="secondary" onClick={onClose} disabled={busy}>Back to resumes</button></div>
    <div className="builder-scroll"><label className="field"><span>Resume name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field latex-source"><span>LaTeX source</span><textarea value={latex} onChange={(event) => setLatex(event.target.value)} rows="20" spellCheck="false" /></label></div>
    <div className="builder-actions">{saved && <span className="save-status" role="status">Saved</span>}<button className="secondary" onClick={save}>Save resume</button><button className="render-button" onClick={saveAndRender} disabled={busy}>{busy ? 'Rendering…' : 'Save & render'}</button></div>
  </section>;
}
