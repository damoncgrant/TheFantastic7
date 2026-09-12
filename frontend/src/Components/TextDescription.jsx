function TextDescription({ job }) {
  return (
    <div
      style={{
        height: "42%",
        padding: "18px 20px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflow: "hidden",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 21,
            color: "#26251F",
            lineHeight: 1.2,
          }}
        >
          {job.title}
        </h2>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            color: "#7A7362",
            marginTop: 4,
          }}
        >
          {job.company} · {job.location}
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 14.5,
          lineHeight: 1.55,
          color: "#3A382F",
          overflow: "hidden",
        }}
      >
        {job.description}
      </p>

      <div style={{ display: "flex", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
        {job.tags.map((tag) => (
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
  );
}


export default TextDescription;