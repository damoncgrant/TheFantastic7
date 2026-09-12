import { useCallback, useEffect, useRef, useState } from 'react';

const ACCENT_COLORS = ['#3F6B4F', '#8C4432', '#4B6283', '#7B5B8D'];

function toCard(job, index) {
  const company = job.company.name;
  return { ...job, company, initials: company.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(), accent: ACCENT_COLORS[index % ACCENT_COLORS.length], tags: [job.employment_type, job.compensation, ...job.requirements] };
}

export default function JobSwiper({ candidateId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const current = jobs[0];

  useEffect(() => {
    const controller = new AbortController();
    async function loadDeck() {
      try {
        setLoading(true); setError('');
        const response = await fetch(`/api/jobs/deck/?candidate_id=${encodeURIComponent(candidateId)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load jobs');
        setJobs(data.jobs.map(toCard));
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Could not load jobs');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    loadDeck();
    return () => controller.abort();
  }, [candidateId]);

  const commitSwipe = useCallback(async (direction) => {
    if (!current || exiting) return;
    setError(''); setExiting(direction);
    try {
      const response = await fetch(`/api/jobs/${current.id}/swipe/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_id: candidateId, decision: direction }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save swipe');
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setJobs((items) => direction === 'left' ? [...items.slice(1), items[0]] : items.slice(1));
      setDragX(0); setExiting(null);
    } catch (swipeError) { setDragX(0); setExiting(null); setError(swipeError.message || 'Could not save swipe'); }
  }, [candidateId, current, exiting]);

  function beginDrag(event) { dragging.current = true; startX.current = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId); }
  function moveDrag(event) { if (dragging.current && !exiting) setDragX(event.clientX - startX.current); }
  function endDrag() { if (!dragging.current) return; dragging.current = false; if (dragX > 90) commitSwipe('right'); else if (dragX < -90) commitSwipe('left'); else setDragX(0); }

  if (loading) return <p className="candidate-swipe-state" role="status">Loading opportunities…</p>;
  if (error && !current) return <p className="candidate-swipe-state error" role="alert">{error}</p>;
  if (!current) return <section className="candidate-swipe-empty"><span aria-hidden="true">✓</span><h2>You’re all caught up</h2><p>New opportunities will appear here when they are posted.</p></section>;

  const cardTransform = exiting ? `translateX(${exiting === 'right' ? '125%' : '-125%'}) rotate(${exiting === 'right' ? '12deg' : '-12deg'})` : `translateX(${dragX}px) rotate(${dragX / 28}deg)`;
  return (
    <section className="candidate-swipe-screen recruiter-swipe-screen" aria-label="Job review">
      <div className="recruiter-swipe-progress"><span>{jobs.length} opportunities waiting</span><span>Drag or use the buttons</span></div>
      <article className={`recruiter-swipe-card${exiting ? ' is-exiting' : ''}`} style={{ transform: cardTransform }} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="candidate-swipe-company" style={{ '--company-accent': current.accent }}>
          <span className="recruiter-swipe-label">Company</span><span className="recruiter-swipe-avatar" aria-hidden="true">{current.initials}</span>
          {Math.abs(dragX) > 55 && <span className={`recruiter-swipe-stamp ${dragX > 0 ? 'offer' : 'reject'}`}>{dragX > 0 ? 'Apply' : 'Pass'}</span>}
        </div>
        <div className="recruiter-swipe-details candidate-swipe-details">
          <div><h2>{current.title}</h2><p>{current.company} · {current.location}</p></div>
          <p className="candidate-swipe-description">{current.description}</p>
          <div className="recruiter-swipe-skills" aria-label="Job details">{current.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
      </article>
      <div className="recruiter-swipe-actions">
        <button className="recruiter-reject-button" type="button" onClick={() => commitSwipe('left')} disabled={Boolean(exiting)}><span aria-hidden="true">×</span> Pass</button>
        <button className="recruiter-offer-button" type="button" onClick={() => commitSwipe('right')} disabled={Boolean(exiting)}>Apply <span aria-hidden="true">✓</span></button>
      </div>
      {error && <p className="recruiter-form-error recruiter-swipe-error" role="alert">{error}</p>}
    </section>
  );
}
