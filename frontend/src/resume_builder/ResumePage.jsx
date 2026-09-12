import { useEffect, useRef, useState } from 'react';
import ResumeBuilder from './ResumeBuilder.jsx';

export default function ResumePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('resume.png');
  const [showBuilder, setShowBuilder] = useState(false);
  const request = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  function chooseFile(event) {
    const selectedFile = event.target.files[0] || null;
    setImageUrl('');
    setError('');
    setDetails('');
    event.target.value = '';
    if (selectedFile) renderLatex(selectedFile);
  }

  async function requestImage(url, body, headers, name) {
    setError('');
    setDetails('');
    setImageUrl('');
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const tokenResponse = await fetch('/api/csrf/', { signal: controller.signal });
      if (!tokenResponse.ok) throw new Error('Could not connect to the backend. Check that Django is running.');
      const { csrfToken } = await tokenResponse.json();
      const response = await fetch(url, {
        method: 'POST', body,
        headers: { 'X-CSRFToken': csrfToken, ...headers },
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDetails(data.details || '');
        throw new Error(data.error || `Could not render the resume (HTTP ${response.status}).`);
      }
      if (!response.headers.get('content-type')?.includes('image/png')) {
        throw new Error('The server did not return a resume image. Check that Django is running.');
      }
      setImageUrl(URL.createObjectURL(await response.blob()));
      setImageName(name);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Could not render the resume.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function renderLatex(selectedFile) {
    if (!selectedFile.name.toLowerCase().endsWith('.tex') || selectedFile.size > 1024 * 1024 || !selectedFile.size) {
      setError('Choose a nonempty .tex file smaller than 1 MB.');
      return;
    }
    const body = new FormData();
    body.append('file', selectedFile);
    requestImage('/api/resumes/render/', body, {}, selectedFile.name.replace(/\.tex$/i, '.png'));
  }

  function renderBuilder(resume) {
    const name = resume.contact.name.trim() || 'resume';
    requestImage('/api/resumes/build/', JSON.stringify(resume), { 'Content-Type': 'application/json' }, `${name}.png`);
  }

  return (
    <section className={`resume-page${imageUrl ? ' has-preview' : ''}`}>
      <h1>Your resume</h1>
      <p>Create a resume, import your own LaTeX, or come back later.</p>
      {busy && <p role="status">Compiling your resume. This may take up to 40 seconds.</p>}
      {error && <div role="alert" className="error">
        <p>{error}</p>
        {details && <details><summary>Compiler details</summary><pre>{details}</pre></details>}
      </div>}
      {imageUrl && <section className="preview" aria-label="Resume preview">
        <div className="preview-heading">
          <h2>Resume preview</h2>
          <a href={imageUrl} download={imageName}>Download image</a>
        </div>
        <img className="resume-preview-image" src={imageUrl} alt="Rendered resume preview" />
      </section>}
      {showBuilder ? <ResumeBuilder busy={busy} onRender={renderBuilder} onClose={() => setShowBuilder(false)} /> : <div className="resume-options">
        <div className="option">
          <h2>Create a resume</h2>
          <p>Build your resume using Jake’s template.</p>
          <button onClick={() => setShowBuilder(true)} disabled={busy}>Open builder</button>
        </div>
        <div className="option">
          <h2>Import LaTeX</h2>
          <p>Select a .tex file to render it immediately.</p>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".tex"
            onChange={chooseFile}
            disabled={busy}
            aria-label="LaTeX file"
          />
          <button onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? 'Rendering…' : imageUrl ? 'Import another .tex file' : 'Import .tex file'}
          </button>
        </div>
        <div className="option">
          <h2>Decide later</h2>
          <p>You can return to this tab whenever you’re ready.</p>
          <a href="#home">Skip for now</a>
        </div>
      </div>}
    </section>
  );
}
