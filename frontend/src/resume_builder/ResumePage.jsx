import { useEffect, useRef, useState } from 'react';
import { apiRequest, fetchCsrf } from '../api.js';
import ResumeBuilder, { emptyResume, normalizeResume } from './ResumeBuilder.jsx';

const displayDate = (timestamp) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
const newResume = () => ({ id: null, name: 'Untitled resume', data: emptyResume(), isDefault: false, source: 'builder' });

function deserializeResume(resume) {
  return {
    id: resume.id,
    name: resume.name,
    latex: resume.latex,
    data: resume.builderData ? normalizeResume(resume.builderData) : null,
    source: resume.builderData ? 'builder' : 'latex',
    isDefault: resume.isDefault,
    updatedAt: resume.updatedAt,
  };
}

export default function ResumePage() {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('resume.png');
  const [resumes, setResumes] = useState([]);
  const [editingResume, setEditingResume] = useState(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const request = useRef(null);
  const deletingResumes = useRef(new Set());
  const fileInput = useRef(null);
  const createMenu = useRef(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => { loadResumes(); }, []);
  useEffect(() => {
    if (!showCreateOptions) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!createMenu.current?.contains(event.target)) setShowCreateOptions(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [showCreateOptions]);

  async function loadResumes() {
    setLoading(true);
    try {
      const { resumes: savedResumes } = await apiRequest('/api/resumes/');
      setResumes(savedResumes.map(deserializeResume));
    } catch (err) {
      setError(err.message || 'Could not load your resumes.');
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary(url, method, payload) {
    await fetchCsrf();
    const response = await apiRequest(url, { method, body: JSON.stringify(payload) });
    const saved = deserializeResume(response.resume);
    setResumes((current) => {
      const withoutSaved = current.filter((resume) => resume.id !== saved.id).map((resume) => ({ ...resume, isDefault: saved.isDefault ? false : resume.isDefault }));
      return [saved, ...withoutSaved].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
    });
    setEditingResume(saved);
    return saved;
  }

  async function requestImage(url, body, headers, name) {
    setError(''); setDetails(''); setImageUrl(''); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const tokenResponse = await fetch('/api/csrf/', { signal: controller.signal });
      if (!tokenResponse.ok) throw new Error('Could not connect to the backend. Check that Django is running.');
      const { csrfToken } = await tokenResponse.json();
      const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken, ...headers }, signal: controller.signal });
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

  function renderLatex(latex, filename = 'resume.png') {
    const body = new FormData();
    body.append('file', new Blob([latex], { type: 'application/x-tex' }), filename.replace(/\.png$/i, '.tex'));
    requestImage('/api/resumes/render/', body, {}, filename);
  }

  function openNewResume() { setImageUrl(''); setError(''); setDetails(''); setShowCreateOptions(false); setEditingResume(newResume()); }
  function openResume(resume) {
    setImageUrl(''); setError(''); setDetails(''); setEditingResume(resume);
    if (resume.source === 'latex') renderLatex(resume.latex, `${resume.name}.png`);
    else renderResume(resume.data);
  }
  function closeResume() { setImageUrl(''); setEditingResume(null); }

  async function importLatex(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.tex') || !file.size || file.size > 1024 * 1024) { setError('Choose a nonempty .tex file smaller than 1 MB.'); return; }
    try {
      const latex = await file.text();
      await saveToLibrary('/api/resumes/', 'POST', { name: file.name.replace(/\.tex$/i, '') || 'Imported resume', latex });
      setShowCreateOptions(false);
      closeResume();
    } catch (err) { setError(err.message || 'Could not import that LaTeX file.'); }
  }

  async function saveResume({ name, data }) {
    try {
      const url = editingResume.id ? `/api/resumes/${editingResume.id}/` : '/api/resumes/';
      await saveToLibrary(url, editingResume.id ? 'PATCH' : 'POST', { name, builderData: data });
    } catch (err) { setError(err.message || 'Could not save your resume.'); throw err; }
  }

  async function saveImportedResume({ name, latex }) {
    try {
      await saveToLibrary(`/api/resumes/${editingResume.id}/`, 'PATCH', { name, latex });
    } catch (err) { setError(err.message || 'Could not save your resume.'); throw err; }
  }

  async function copyBuilderResume({ name, data }) {
    try {
      await saveToLibrary('/api/resumes/', 'POST', { name: `${name} Copy`, builderData: data });
      closeResume();
    } catch (err) { setError(err.message || 'Could not copy your resume.'); }
  }

  async function copyImportedResume({ name, latex }) {
    try {
      await saveToLibrary('/api/resumes/', 'POST', { name: `${name} Copy`, latex });
      closeResume();
    } catch (err) { setError(err.message || 'Could not copy your resume.'); }
  }

  async function setDefault(id) {
    try {
      await fetchCsrf();
      const response = await apiRequest(`/api/resumes/${id}/default/`, { method: 'POST' });
      const selected = deserializeResume(response.resume);
      setResumes((current) => [selected, ...current.filter((resume) => resume.id !== id).map((resume) => ({ ...resume, isDefault: false }))]);
    } catch (err) { setError(err.message || 'Could not update the default resume.'); }
  }

  async function deleteResume(id) {
    if (deletingResumes.current.has(id)) return;
    const resume = resumes.find((item) => item.id === id);
    if (!resume || !window.confirm(`Delete “${resume.name}”? This cannot be undone.`)) return;
    deletingResumes.current.add(id);
    const previousResumes = resumes;
    setResumes((current) => {
      const remaining = current.filter((item) => item.id !== id);
      if (!resume.isDefault || remaining.length === 0) return remaining;
      return remaining.map((item, index) => ({ ...item, isDefault: index === 0 }));
    });
    try {
      await fetchCsrf();
      await apiRequest(`/api/resumes/${id}/`, { method: 'DELETE' });
    } catch (err) {
      setResumes(previousResumes);
      setError(err.message || 'Could not delete that resume.');
    } finally {
      deletingResumes.current.delete(id);
    }
  }

  const builderResume = editingResume && resumes.find((resume) => resume.id === editingResume.id) || editingResume;
  const createOptions = showCreateOptions && <div className="create-resume-options" role="group" aria-label="Create resume options"><button className="secondary" onClick={openNewResume} disabled={busy}>Use resume builder</button><button className="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>Import LaTeX</button></div>;
  return <section className={`resume-page${imageUrl ? ' has-preview' : ''}`}>
    <input ref={fileInput} className="visually-hidden" type="file" accept=".tex" onChange={importLatex} disabled={busy} aria-label="LaTeX file" />
    <div className="resume-library-heading"><div><p className="eyebrow">Your master profile</p><h1>Your resumes</h1><p>Keep versions tailored to different opportunities and choose one default resume.</p></div>{editingResume ? <button className="primary-button" onClick={closeResume} disabled={busy}>Back to resumes</button> : resumes.length > 0 && <div className="resume-create-control" ref={createMenu}><button onClick={() => setShowCreateOptions((current) => !current)} disabled={busy}>Create new resume</button>{createOptions}</div>}</div>
    {loading && <p role="status">Loading your resumes…</p>}
    {busy && <p role="status">Compiling your resume. This may take up to 40 seconds.</p>}
    {error && <div role="alert" className="error"><p>{error}</p>{details && <details><summary>Compiler details</summary><pre>{details}</pre></details>}</div>}
    {editingResume && (busy || imageUrl) && <section className={`preview${busy ? ' is-loading' : ''}`} aria-label="Resume preview"><div className="preview-heading"><h2>Resume preview</h2>{imageUrl && !busy && <a className="primary-button" href={imageUrl} download={imageName}>Download image</a>}</div>{busy ? <div className="resume-preview-loading" role="status"><span className="loading-spinner" aria-hidden="true" /><span>Rendering your resume…</span></div> : <img className="resume-preview-image" src={imageUrl} alt="Rendered resume preview" />}</section>}
    {!loading && (editingResume ? builderResume.source === 'latex' ? <LatexResumeEditor key={builderResume.id} busy={busy} initialName={builderResume.name} initialLatex={builderResume.latex} onSave={saveImportedResume} onRender={(latex) => renderLatex(latex, `${builderResume.name}.png`)} onCopy={copyImportedResume} onClose={closeResume} hideClose /> : <ResumeBuilder key={builderResume.id || 'new'} busy={busy} initialResume={builderResume.data} initialName={builderResume.name} onSave={saveResume} onRender={renderResume} onCopy={builderResume.id ? copyBuilderResume : undefined} onClose={closeResume} hideClose closeOnSave /> : resumes.length === 0 ? <section className="empty-resumes"><div><h2>Create your first resume</h2><p>Start with the builder, then save tailored versions here.</p><div className="resume-create-control" ref={createMenu}><button onClick={() => setShowCreateOptions((current) => !current)} disabled={busy}>Create new resume</button>{createOptions}</div></div></section> : <section className="resume-library" aria-label="Saved resumes">{resumes.map((resume) => <article className={`resume-card${resume.isDefault ? ' is-default' : ''}`} key={resume.id}><button className="resume-card-main" onClick={() => openResume(resume)} aria-label={`Edit ${resume.name}`}><div><h2>{resume.name}</h2><p>{resume.source === 'latex' ? 'Imported LaTeX resume' : resume.data.contact.name || 'No contact name yet'}</p></div><span>Updated {displayDate(resume.updatedAt)}</span></button><div className="resume-card-actions">{resume.isDefault ? <span className="default-badge">Default</span> : <button className="secondary-button compact-button" onClick={() => setDefault(resume.id)}>Set as default</button>}<button className="secondary-button compact-button" onClick={() => openResume(resume)}>Edit</button><button className="secondary-button compact-button danger-button" onClick={() => deleteResume(resume.id)}>Delete</button></div></article>)}</section>)}
  </section>;
}

function LatexResumeEditor({ busy, initialName, initialLatex, onSave, onRender, onCopy, onClose, hideClose = false }) {
  const [name, setName] = useState(initialName);
  const [latex, setLatex] = useState(initialLatex || '');
  const [saved, setSaved] = useState(false);
  const save = async (showStatus = true) => { await onSave({ name: name.trim() || 'Imported resume', latex }); if (showStatus) setSaved(true); };
  const saveAndRender = async () => { await save(false); onRender(latex); };
  const saveAndClose = async () => { await save(); onClose(); };
  const copy = async () => { await onCopy({ name: name.trim() || 'Imported resume', latex }); };
  return <section className="builder" aria-label="LaTeX resume editor"><div className="builder-heading"><div><h2>Edit imported LaTeX</h2><p>Your source is saved with this resume and can be edited or rendered again.</p></div>{!hideClose && <button className="secondary" onClick={onClose} disabled={busy}>Back to resumes</button>}</div><div className="builder-scroll"><label className="field"><span>Resume name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field latex-source"><span>LaTeX source</span><textarea value={latex} onChange={(event) => setLatex(event.target.value)} rows="20" spellCheck="false" /></label></div><div className="builder-actions">{saved && <span className="save-status" role="status">Saved</span>}<button className="secondary-button" onClick={copy} disabled={busy}>Make a copy</button><button className="render-button" onClick={saveAndRender} disabled={busy}>{busy ? 'Rendering…' : 'Render'}</button><button className="secondary-button" onClick={saveAndClose} disabled={busy}>Save resume</button></div></section>;
}
