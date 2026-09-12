import React, { useState, useRef, useCallback } from "react";
import ImageDescription from "./Components/ImageDescription";
import TextDescription from "./Components/TextDescription";
import SwipeButton from "./Components/SwipeButton";

/**
 * JobSwiper
 * A Tinder-style swipe interface for job listings.
 * Each card has two stacked pieces: ImageDescription (logo or resume art)
 * and TextDescription (the job description itself). Two stamp-style
 * buttons anchored to the left/right edges of the screen handle the
 * reject / accept decisions, and the card itself is draggable too.
 */

const JOBS = [
  {
    id: 1,
    company: "Northwind Robotics",
    location: "Edmonton, AB · On-site",
    title: "Firmware Engineer, Intern",
    imageType: "logo",
    initials: "NR",
    accent: "#3F6B4F",
    description:
      "Northwind builds warehouse robots that don't trip over their own cables. You'd work on the motor-control firmware, alongside two senior engineers who will absolutely make fun of your variable names.",
    tags: ["C++", "Embedded", "4 months"],
  },
  {
    id: 2,
    company: "Resume: Priya Shah",
    location: "Applying for: Frontend Developer",
    title: "3rd-year Computing Science",
    imageType: "resume",
    initials: "PS",
    accent: "#8C4432",
    description:
      "Built and shipped two React side projects, TA'd intro programming for a semester, and led a hackathon team of four to a top-3 finish. Looking for a summer internship on a small product team.",
    tags: ["React", "TypeScript", "Available May"],
  },
  {
    id: 3,
    company: "Ledgerline",
    location: "Remote · Canada",
    title: "Backend Developer",
    imageType: "logo",
    initials: "LL",
    accent: "#3F6B4F",
    description:
      "Ledgerline is a small accounting startup rebuilding invoicing from scratch. You'd own the reconciliation service end-to-end. Slow-paced, well-documented codebase, no on-call.",
    tags: ["Python", "Postgres", "Remote"],
  },
];


export default function JobSwiper() {
  const [jobs, setJobs] = useState(JOBS);
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState(null); // "left" | "right" | null
  const dragging = useRef(false);
  const startX = useRef(0);

  const current = jobs[0];

  const commitSwipe = useCallback((direction) => {
    setExiting(direction);
    setTimeout(() => {
      setJobs((prev) => prev.slice(1));
      setExiting(null);
      setDragX(0);
    }, 220);
  }, []);

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
      {current ? (
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
        </>
      ) : (
        <div style={{ color: "#8A8578", fontSize: 15 }}>No more listings — check back later.</div>
      )}
    </div>
  );
}
