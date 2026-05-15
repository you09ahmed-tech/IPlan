function IntegrityCard({ integrity }) {
  function getIntegrityColor() {
    if (integrity >= 90) return "#22c55e";
    if (integrity >= 70) return "#eab308";
    return "#ef4444";
  }

  return (
    <div className="subject-card">
      <h2>Integrity Score 🛡️</h2>

      <p>
        Your score reflects fair and realistic study behavior.
      </p>

      <div
        style={{
          width: "100%",
          height: "14px",
          background: "#2d2d44",
          borderRadius: "999px",
          marginTop: "20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${integrity}%`,
            height: "100%",
            background: getIntegrityColor(),
          }}
        ></div>
      </div>

      <h3 style={{ marginTop: "15px" }}>
        {integrity}% Integrity
      </h3>

      <p style={{ marginTop: "10px", color: "#cbd5e1" }}>
        Higher integrity means more trustworthy XP rewards.
      </p>
    </div>
  );
}

export default IntegrityCard;