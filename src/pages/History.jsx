import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { loadCompletedQuests } from "../firebase/completedQuests";

function History({ user, setPage }) {
  const [completedQuests, setCompletedQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompletedQuests() {
      const data = await loadCompletedQuests(user.uid);

      setCompletedQuests(data);
      setLoading(false);
    }

    fetchCompletedQuests();
  }, [user]);

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Quest History 📜</h1>

        <p>Review completed quests and track your real study progress.</p>

        {loading ? (
          <p style={{ marginTop: "30px" }}>Loading history...</p>
        ) : completedQuests.length === 0 ? (
          <div className="subject-card" style={{ marginTop: "30px" }}>
            <p>No completed quests yet.</p>
          </div>
        ) : (
          <div className="quests-grid" style={{ marginTop: "30px" }}>
            {completedQuests.map((quest, index) => (
              <div className="quest-card" key={quest.completedId || index}>
                <h3>{quest.title}</h3>
                <p>
                  {quest.subject} • {quest.difficulty}
                </p>
                <p>+{quest.xp} XP earned</p>
                <p>
                  Completed:{" "}
                  {new Date(quest.completedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default History;