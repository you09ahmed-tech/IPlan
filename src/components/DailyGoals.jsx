function DailyGoals({ completedQuests, focusMinutes }) {
  const questGoal = 3;
  const focusGoal = 60;

  const questProgress = Math.min((completedQuests / questGoal) * 100, 100);
  const focusProgress = Math.min((focusMinutes / focusGoal) * 100, 100);

  return (
    <div className="subject-card">
      <h2>Daily Goals 🎯</h2>

      <p>Complete quests and focus time to stay consistent.</p>

      <div style={{ marginTop: "20px" }}>
        <strong>Quests Completed</strong>
        <p>
          {completedQuests} / {questGoal}
        </p>

        <div className="small-bar">
          <div style={{ width: `${questProgress}%` }}></div>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <strong>Focus Minutes</strong>
        <p>
          {focusMinutes} / {focusGoal} minutes
        </p>

        <div className="small-bar">
          <div style={{ width: `${focusProgress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default DailyGoals;