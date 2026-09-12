import React from "react";

/**
 * JobDetail
 * Full job description page. Takes the job object to display and an
 * onBack callback — the caller decides what "back" means (swipe deck,
 * applications list, etc), so this component stays reusable from
 * either entry point.
 */
export default function JobDetail({ job, onBack }) {
  if (!job) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fdf3d1",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: "#272522",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "8px 0 20px",
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>{"\u2190"}</span>
          Back
        </button>

        <div
          style={{
            background: "#EFE9DA",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              padding: "26px 26px 20px",
              borderBottom: "1px solid #c76503",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                flexShrink: 0,
                borderRadius: job.imageType === "logo" ? "50%" : "6px",
                background: job.accent,
                color: "#F4EFE2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {job.initials}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, color: "#26251F", lineHeight: 1.2 }}>
                {job.title}
              </h1>
              <div
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12.5,
                  color: "#7A7362",
                  marginTop: 6,
                }}
              >
                {job.company} · {job.location}
              </div>
            </div>
          </div>

          <div style={{ padding: "22px 26px 26px" }}>
            {job.status && (
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: job.accent,
                  border: `1px solid ${job.accent}`,
                  borderRadius: 3,
                  padding: "3px 9px",
                  marginBottom: 16,
                }}
              >
                {job.status}
              </div>
            )}

            <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.65, color: "#3A382F" }}>
              {job.description}
            </p>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#7A7362",
                  }}
                >
                  What you'd do
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#3A382F", fontSize: 14.5, lineHeight: 1.6 }}>
                  {job.responsibilities.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(job.tags || []).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: "1px solid #C9BFA4",
                    color: "#5C5847",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
