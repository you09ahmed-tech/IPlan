import SubtaskList from "./SubtaskList";

function QuestCard({ quest, onComplete }) {
  function formatDueDate(dateString) {
    if (!dateString) {
      return "No due date";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${dateString}T00:00:00`);
    const differenceInDays = Math.round(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (differenceInDays < 0) {
      return `Overdue by ${Math.abs(differenceInDays)} day${
        Math.abs(differenceInDays) === 1 ? "" : "s"
      }`;
    }

    if (differenceInDays === 0) {
      return "Due today";
    }

    if (differenceInDays === 1) {
      return "Due tomorrow";
    }

    return dueDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function getPriorityClass(priority) {
    if (priority === "High") return "priority-high";
    if (priority === "Medium") return "priority-medium";
    if (priority === "Low") return "priority-low";

    return "priority-medium";
  }

  function getDifficultyClass(difficulty) {
    if (difficulty === "Hard") return "difficulty-hard";
    if (difficulty === "Medium") return "difficulty-medium";
    if (difficulty === "Easy") return "difficulty-easy";

    return "difficulty-medium";
  }

  return (
    <div className="quest-card upgraded-task-card">
      <div className="task-card-main">
        <div className="task-card-header">
          <div>
            <p className="task-type-label">
              {quest.taskType || "General Task"}
            </p>

            <h3>{quest.title}</h3>
          </div>

          <div className="task-badges">
            <span className={`task-badge ${getPriorityClass(quest.priority)}`}>
              {quest.priority || "Medium"} Priority
            </span>

            <span
              className={`task-badge ${getDifficultyClass(quest.difficulty)}`}
            >
              {quest.difficulty || "Medium"}
            </span>
          </div>
        </div>

        <div className="task-meta-grid">
          <div>
            <span>Subject</span>
            <strong>{quest.subject || "General"}</strong>
          </div>

          <div>
            <span>Due date</span>
            <strong>{formatDueDate(quest.dueDate)}</strong>
          </div>

          <div>
            <span>Estimated time</span>
            <strong>
              {quest.estimatedMinutes
                ? `${quest.estimatedMinutes} min`
                : "Not set"}
            </strong>
          </div>

          <div>
            <span>Reward</span>
            <strong>+{quest.xp || 40} XP</strong>
          </div>
        </div>

        {quest.subtasks && quest.subtasks.length > 0 ? (
          <div className="task-subtasks">
            <p>Subtasks</p>
            <SubtaskList subtasks={quest.subtasks} />
          </div>
        ) : (
          <p className="task-no-subtasks">
            No subtasks added yet. You can break this down later using AI
            Breakdown.
          </p>
        )}
      </div>

      <div className="quest-actions upgraded-task-actions">
        <button onClick={onComplete}>
          Complete Task
        </button>
      </div>
    </div>
  );
}

export default QuestCard;