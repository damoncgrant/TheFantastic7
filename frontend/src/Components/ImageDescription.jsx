

function ImageDescription({ job }) {
  const hasPhoto = Boolean(job.photo_url);
  return (
    <div
      style={{
        height: "58%",
        background: "#E4DCC7",
        borderBottom: "1px solid #C9BFA4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "#7A7362",
          textTransform: "uppercase",
        }}
      >
        {hasPhoto ? "Job photo" : job.imageType === "logo" ? "Company logo" : "Resume on file"}
      </div>
      {hasPhoto ? (
        <img
          src={job.photo_url}
          alt={`${job.title} at ${job.company}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: job.imageType === "logo" ? "50%" : "6px",
            background: job.accent,
            color: "#F4EFE2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 34,
            fontWeight: 700,
            boxShadow: "0 2px 0 rgba(0,0,0,0.15) inset",
          }}
        >
          {job.initials}
        </div>
      )}
    </div>
  );
}


export default ImageDescription;
