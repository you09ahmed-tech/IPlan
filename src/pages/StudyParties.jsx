import Sidebar from "../components/Sidebar";

function StudyParties({ setPage }) {
  const partyMembers = [
    { name: "Youssef", focus: 120, quests: 5 },
    { name: "Maya", focus: 95, quests: 4 },
    { name: "Omar", focus: 80, quests: 3 },
  ];

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Study Parties 🤝</h1>

        <p>
          Small accountability groups for healthy studying. No global
          leaderboard, no toxic competition.
        </p>

        <div className="subject-card" style={{ marginTop: "30px" }}>
          <h2>Your Party</h2>
          <p>IB Warriors — 3 members</p>
        </div>

        <div className="subjects-grid" style={{ marginTop: "30px" }}>
          {partyMembers.map((member, index) => (
            <div className="subject-card" key={index}>
              <h3>{member.name}</h3>
              <p>Focus time: {member.focus} min</p>
              <p>Quests completed: {member.quests}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default StudyParties;