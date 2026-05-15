import Sidebar from "../components/Sidebar";
import SubjectCard from "../components/SubjectCard";

import { subjects } from "../data/mockData";

function Subjects({ setPage }) {
  const savedQuests = localStorage.getItem("quests");
  const quests = savedQuests ? JSON.parse(savedQuests) : [];

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Subjects 📚</h1>

        <p>
          Track each IB subject and see the quests connected to it.
        </p>

        <div className="subjects-grid" style={{ marginTop: "30px" }}>
          {subjects.map((subject, index) => {
            const subjectQuests = quests.filter(
              (quest) => quest.subject === subject.name
            );

            return (
              <div className="subject-card" key={index}>
                <SubjectCard subject={subject} />

                <h3 style={{ marginTop: "20px" }}>Active Quests</h3>

                {subjectQuests.length === 0 ? (
                  <p>No active quests for this subject.</p>
                ) : (
                  <ul style={{ marginTop: "10px" }}>
                    {subjectQuests.map((quest, questIndex) => (
                      <li key={questIndex}>
                        {quest.title} — {quest.difficulty}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default Subjects;