import React, { useCallback, useEffect, useRef, useState } from "react";
import ImageDescription from "./Components/ImageDescription";
import TextDescription from "./Components/TextDescription";
import SwipeButton from "./Components/SwipeButton";
import JobDetail from "./Components/JobDetail.jsx";

/**
 * JobSwiper
 * A Tinder-style swipe interface for job listings.
 * Each card has two stacked pieces: ImageDescription (logo or resume art)
 * and TextDescription (the job description itself). Two stamp-style
 * buttons anchored to the left/right edges of the screen handle the
 * reject / accept decisions, and the card itself is draggable too.
 */

const ACCENT_COLORS = ["#3F6B4F", "#8C4432", "#4B6283", "#7B5B8D"];

function toCard(job, index) {
  const companyName = job.company.name;
  return {
    ...job,
    company: companyName,
    imageType: "logo",
    initials: companyName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
    accent: ACCENT_COLORS[index % ACCENT_COLORS.length],
    tags: [job.employment_type, job.compensation, ...job.requirements],
  };
}

export default function JobSwiper({ candidateId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState(null); // "left" | "right" | null
  const [selectedJob, setSelectedJob] = useState(null); // NEW
  const dragging = useRef(false);
  const startX = useRef(0);

  const current = jobs[0];

  useEffect(() => {
    const controller = new AbortController();

    async function loadDeck() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/jobs/deck/?candidate_id=${encodeURIComponent(candidateId)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load jobs");
        setJobs(data.jobs.map(toCard));
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "Could not load jobs");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDeck();
    return () => controller.abort();
  }, [candidateId]);

  const commitSwipe = useCallback(async (direction) => {
    if (!current || exiting) return;
    setExiting(direction);
    try {
      const response = await fetch(`/api/jobs/${current.id}/swipe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, decision: direction }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save swipe");
      setTimeout(() => {
        setJobs((previous) => direction === "left" ? [...previous.slice(1), previous[0]] : previous.slice(1));
        setExiting(null);
        setDragX(0);
      }, 220);
    } catch (swipeError) {
      setExiting(null);
      setDragX(0);
      setError(swipeError.message || "Could not save swipe");
    }
  }, [candidateId, current, exiting]);

  const onPointerDown = (e) => {
    dragging.current = true;
    startX.current = e.clientX;
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > 110) commitSwipe("right");
    else if (dragX < -110) commitSwipe("left");
    else setDragX(0);
  };

  const cardTransform = exiting
    ? exiting === "right"
      ? "translateX(600px) rotate(18deg)"
      : "translateX(-600px) rotate(-18deg)"
    : `translateX(${dragX}px) rotate(${dragX / 22}deg)`;

  // Deals with the job pop up
  if (selectedJob) {
      return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#14161C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "Georgia, serif",
      }}
    >
      {loading ? (
        <div style={{ color: "#F4EFE2", fontSize: 15 }}>Loading jobs…</div>
      ) : current ? (
        <>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              width: 340,
              height: 480,
              background: "#EFE9DA",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
              cursor: "grab",
              transform: cardTransform,
              transition: exiting ? "transform 0.22s ease-out" : dragX === 0 ? "transform 0.15s ease-out" : "none",
              userSelect: "none",
            }}
          >
            <ImageDescription job={current} />
            <TextDescription job={current} />
          </div>

          <SwipeButton side="left" label="reject" color="#8C4432" onClick={() => commitSwipe("left")} />
          <SwipeButton side="right" label="accept" color="#3F6B4F" onClick={() => commitSwipe("right")} />

          <button
            onClick={(e) => {
              e.stopPropagation(); // don't let the drag handlers see this as a swipe
              setSelectedJob(current);
            }}
          >
            BUTTON
          </button>
        </>
      ) : (
        <div style={{ color: "#8A8578", fontSize: 15 }}>No more listings — check back later.</div>
      )}
      {error && <p role="alert" style={{ position: "fixed", bottom: 24, color: "#F4EFE2" }}>{error}</p>}
    </div>
  );
}
