import SubtaskList from "./SubtaskList";

function QuestCard({ quest, onComplete }) {
  return (
    <div className="quest-card">
      <div>
        <h3>{quest.title}</h3>

        <p>
          {quest.subject} • {quest.difficulty}
        </p>

        <SubtaskList subtasks={quest.subtasks} />
      </div>

      <div className="quest-actions">
        <strong>+{quest.xp} XP</strong>

        <button onClick={onComplete}>
          Complete
        </button>
      </div>
    </div>
  );
}

export default QuestCard;