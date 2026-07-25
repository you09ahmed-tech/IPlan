import { calculateSubjectStats } from "../utils/subjectStats";

function SubjectCard({ subject, quests, completedQuests }) {
  const stats = calculateSubjectStats(subject.name, quests, completedQuests);

  return (
    <div className="subject-card dashboard-subject-card">
      <div
        className="dashboard-subject-accent"
        style={{ background: subject.color || "var(--primary)" }}
      />

      <h3>{subject.name}</h3>

      <p>
        {subject.level ? `${subject.level} • ` : ""}
        {stats.xpEarned} XP earned
      </p>

      <div className="small-bar">
        <div
          style={{
            width: `${stats.progress}%`,
            background: subject.color || "var(--primary)",
          }}
        />
      </div>

      <span>{stats.progress}% complete</span>
    </div>
  );
}

export default SubjectCard;
