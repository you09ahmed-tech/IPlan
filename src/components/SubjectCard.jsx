function SubjectCard({ subject }) {
  return (
    <div className="subject-card">
      <h3>{subject.name}</h3>
      <p>{subject.xp} XP earned</p>

      <div className="small-bar">
        <div style={{ width: `${subject.progress}%` }}></div>
      </div>

      <span>{subject.progress}% complete</span>
    </div>
  );
}

export default SubjectCard;