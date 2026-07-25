function DailyGoals({ completedQuests, focusMinutes }) {
  const questGoal = 3;
  const focusGoal = 60;

  const safeCompletedQuests = Number(completedQuests) || 0;
  const safeFocusMinutes = Number(focusMinutes) || 0;

  const questExceeded = safeCompletedQuests > questGoal;
  const focusExceeded = safeFocusMinutes > focusGoal;

  const questProgress = Math.min((safeCompletedQuests / questGoal) * 100, 100);
  const focusProgress = Math.min((safeFocusMinutes / focusGoal) * 100, 100);

  return (
    <div className="subject-card daily-goals-card">
      <h2>Daily Goals</h2>

      <p>Today's progress toward your quest and focus targets.</p>

      <div className="daily-goal-row">
        <div className="daily-goal-row-header">
          <strong>Quests completed today</strong>

          {questExceeded && (
            <span className="goal-exceeded-badge">Goal exceeded</span>
          )}
        </div>

        <p className="daily-goal-value">
          {safeCompletedQuests}
          <span>/ {questGoal} goal</span>
        </p>

        <div className="small-bar">
          <div style={{ width: `${questProgress}%` }} />
        </div>
      </div>

      <div className="daily-goal-row">
        <div className="daily-goal-row-header">
          <strong>Focus minutes today</strong>

          {focusExceeded && (
            <span className="goal-exceeded-badge">Goal exceeded</span>
          )}
        </div>

        <p className="daily-goal-value">
          {safeFocusMinutes}
          <span>/ {focusGoal} min goal</span>
        </p>

        <div className="small-bar">
          <div style={{ width: `${focusProgress}%` }} />
        </div>
      </div>
    </div>
  );
}

export default DailyGoals;
