function SwipeButton({ side, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        position: "fixed",
        top: "50%",
        [side]: 28,
        transform: "translateY(-50%)",
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: `2.5px solid ${color}`,
        background: "transparent",
        color: color,
        fontSize: 26,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.12s ease, background 0.12s ease",
        fontFamily: "Georgia, serif",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(-50%) scale(0.92)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(-50%) scale(1)")}
    >
      {label === "reject" ? "\u2715" : "\u2713"}
    </button>
  );
}


export default SwipeButton;