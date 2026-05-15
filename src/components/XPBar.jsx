function XPBar() {
  return (
    <div className="xp-card">
      <div>
        <h1>Level 7 Scholar</h1>
        <p>2,850 / 4,000 XP</p>
      </div>

      <div className="xp-bar">
        <div className="xp-fill"></div>
      </div>

      <div className="stats">
        <span>🔥 6 day streak</span>
        <span>🛡️ 92% integrity</span>
        <span>⏱️ 14h focus</span>
      </div>
    </div>
  );
}

export default XPBar;