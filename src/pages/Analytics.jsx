import Sidebar from "../components/Sidebar";
import IntegrityCard from "../components/IntegrityCard";

import {
  subjects,
  quests,
} from "../data/mockData";

function Analytics({ setPage, xp }) {
  const totalSubjectXP = subjects.reduce(
    (sum, subject) => sum + subject.xp,
    0
  );

  const totalQuestXP = quests.reduce(
    (sum, quest) => sum + quest.xp,
    0
  );

  const integrity = 92;

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Analytics 📊</h1>

        <p>
          Understand your study progress and effort
          patterns.
        </p>

        <div
          className="subjects-grid"
          style={{ marginTop: "30px" }}
        >
          <div className="subject-card">
            <h3>Total XP</h3>
            <p>{xp} XP</p>
          </div>

          <div className="subject-card">
            <h3>Subject XP</h3>
            <p>{totalSubjectXP} XP tracked</p>
          </div>

          <div className="subject-card">
            <h3>Quest XP Available</h3>
            <p>{totalQuestXP} XP</p>
          </div>

          <div className="subject-card">
            <h3>Study Balance</h3>

            <p>
              Math and Physics need consistent
              attention.
            </p>
          </div>

          <IntegrityCard integrity={integrity} />
        </div>
      </main>
    </div>
  );
}

export default Analytics;