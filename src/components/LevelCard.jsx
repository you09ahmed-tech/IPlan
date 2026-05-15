function LevelCard({ xp, streak }) {
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXP = xp % 500;
  const progress = (currentLevelXP / 500) * 100;

  return (
    <div className="xp-card">
      <h1>Level {level} Scholar</h1>

      <p>{currentLevelXP} / 500 XP to next level</p>

      <div className="xp-bar">
        <div
          className="xp-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="stats">
        <span>⭐ Total XP: {xp}</span>
        <span>🔥 Streak: {streak} days</span>
        <span>🛡️ Integrity: 92%</span>
      </div>
    </div>
  );
}

export default LevelCard;