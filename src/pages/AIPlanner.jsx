import { useState } from "react";

import Sidebar from "../components/Sidebar";

import { savePlan } from "../firebase/plans";

import { auth } from "../firebase/config";

function AIPlanner({ setPage }) {
  const [goal, setGoal] = useState("");
  const [hours, setHours] = useState("");
  const [plan, setPlan] = useState(null);

  async function generatePlan() {
    if (goal.trim() === "" || hours.trim() === "") return;

    const availableHours = parseInt(hours);

    let sessions = [];

    if (availableHours <= 2) {
      sessions = [
        "Session 1: Focus only on the highest-priority section",
        "Session 2: Quick review and refinement",
      ];
    } else if (availableHours <= 5) {
      sessions = [
        "Session 1: Understand the task and requirements",
        "Session 2: Build the main structure",
        "Session 3: Complete core work",
        "Session 4: Review and improve",
      ];
    } else {
      sessions = [
        "Session 1: Research and planning",
        "Session 2: Build foundations",
        "Session 3: Deep focused work",
        "Session 4: Finish remaining sections",
        "Session 5: Review and optimize",
        "Session 6: Final polish",
      ];
    }

    let advice = "";

    if (availableHours <= 2) {
      advice =
        "You have limited time. Focus only on the highest-impact tasks.";
    } else if (availableHours <= 5) {
      advice =
        "Balanced workload detected. Use focused sessions with short breaks.";
    } else {
      advice =
        "You have strong availability. Prioritize deep work and avoid multitasking.";
    }

    const generatedPlan = {
      goal,
      hours: availableHours,
      summary: `Your goal is to work on: ${goal}`,
      schedule: sessions,
      advice,
    };

    setPlan(generatedPlan);

    await savePlan(auth.currentUser.uid, generatedPlan);
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>AI Planner 🧠📅</h1>

        <p>
          Turn big academic goals into realistic study sessions.
        </p>

        <div className="quest-form" style={{ marginTop: "30px" }}>
          <input
            type="text"
            placeholder="Example: Finish my Math IA draft"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          <input
            type="number"
            placeholder="Hours available this week"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />

          <button type="button" onClick={generatePlan}>
            Generate Plan
          </button>
        </div>

        {plan && (
          <>
            <div className="subject-card" style={{ marginTop: "30px" }}>
              <h2>Plan Summary</h2>

              <p>{plan.summary}</p>

              <p>Available time: {hours} hours</p>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Suggested Study Sessions</h2>

              <ul>
                {plan.schedule.map((session, index) => (
                  <li key={index}>{session}</li>
                ))}
              </ul>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Smart Advice</h2>

              <p>{plan.advice}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AIPlanner;