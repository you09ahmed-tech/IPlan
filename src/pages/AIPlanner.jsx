import { useState } from "react";

import Sidebar from "../components/Sidebar";

import { savePlan } from "../firebase/plans";
import { saveStudySession } from "../firebase/sessions";

import { auth } from "../firebase/config";

function AIPlanner({ setPage }) {
  const [goal, setGoal] = useState("");
  const [hours, setHours] = useState("");
  const [plan, setPlan] = useState(null);
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedTimes, setSelectedTimes] = useState({});

  function buildSessions(availableHours) {
    const sessionCount = availableHours <= 2 ? 2 : availableHours <= 5 ? 4 : 6;

    return Array.from({ length: sessionCount }, (_, index) => ({
      title: `Session ${index + 1}`,
      duration: "45 minutes",
      focus:
        index === 0
          ? "Understand the task, define the outcome, and prepare materials."
          : index === sessionCount - 1
          ? "Review, improve, polish, and prepare the final version."
          : "Complete deep focused work on the most important section.",
      tasks: [
        "Open all required materials",
        "Set a clear mini-goal for this session",
        "Work without distractions",
        "Write down what you completed",
        "Write what must happen next",
      ],
    }));
  }

  async function generatePlan() {
    if (goal.trim() === "" || hours.trim() === "") {
      alert("Please enter a goal and available hours.");
      return;
    }

    const availableHours = parseInt(hours);

    const sessions = buildSessions(availableHours);

    const generatedPlan = {
      goal,
      hours: availableHours,
      summary: `Your goal is to work on: ${goal}`,
      sessions,
      advice:
        availableHours <= 2
          ? "You have limited time. Focus only on the highest-impact tasks."
          : availableHours <= 5
          ? "Balanced workload detected. Use focused sessions with short breaks."
          : "You have strong availability. Prioritize deep work and avoid multitasking.",
    };

    setPlan(generatedPlan);
    setSelectedDates({});
    setSelectedTimes({});

    try {
      if (auth.currentUser) {
        await savePlan(auth.currentUser.uid, generatedPlan);
        console.log("Plan saved successfully.");
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Plan generated, but saving the plan failed.");
    }
  }

  async function saveSessionsToCalendar() {
    if (!plan) {
      alert("Generate a plan first.");
      return;
    }

    if (!auth.currentUser) {
      alert("You must be logged in to save sessions.");
      return;
    }

    const hasMissingDates = plan.sessions.some(
      (_, index) => !selectedDates[index]
    );

    if (hasMissingDates) {
      alert("Please choose a date for every session before adding to calendar.");
      return;
    }

    const sessionsToSave = plan.sessions.map((session, index) => ({
      ...session,
      goal: plan.goal,
      date: selectedDates[index],
      time: selectedTimes[index] || "16:00",
      status: "planned",
    }));

    try {
      for (const session of sessionsToSave) {
        const savedSession = await saveStudySession(
          auth.currentUser.uid,
          session
        );

        console.log("Saved session:", savedSession);
      }

      alert(`${sessionsToSave.length} sessions added to your calendar.`);
      setPage("calendar");
    } catch (error) {
      console.error("Error saving sessions:", error);
      alert("Something went wrong while saving sessions. Check the console.");
    }
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>AI Planner 🧠📅</h1>

        <p>
          Turn big academic goals into detailed study sessions and schedule them
          into your dated calendar.
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

              <p>Available time: {plan.hours} hours</p>

              <p>{plan.advice}</p>
            </div>

            <div className="subjects-grid" style={{ marginTop: "30px" }}>
              {plan.sessions.map((session, index) => (
                <div className="quest-card" key={index}>
                  <h3>{session.title}</h3>

                  <p>{session.focus}</p>

                  <p>Duration: {session.duration}</p>

                  <label style={{ display: "block", marginTop: "12px" }}>
                    Choose date
                  </label>

                  <input
                    type="date"
                    value={selectedDates[index] || ""}
                    onChange={(e) =>
                      setSelectedDates({
                        ...selectedDates,
                        [index]: e.target.value,
                      })
                    }
                    style={{
                      marginTop: "8px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                    }}
                  />

                  <label style={{ display: "block", marginTop: "12px" }}>
                    Choose time
                  </label>

                  <input
                    type="time"
                    value={selectedTimes[index] || "16:00"}
                    onChange={(e) =>
                      setSelectedTimes({
                        ...selectedTimes,
                        [index]: e.target.value,
                      })
                    }
                    style={{
                      marginTop: "8px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                    }}
                  />

                  <h4 style={{ marginTop: "15px" }}>
                    What to do
                  </h4>

                  <ul>
                    {session.tasks.map((task, taskIndex) => (
                      <li key={taskIndex}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              className="back-btn"
              style={{ marginTop: "30px" }}
              onClick={saveSessionsToCalendar}
            >
              Add Sessions to Calendar
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default AIPlanner;