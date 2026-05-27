import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import LevelCard from "../components/LevelCard";
import SubjectCard from "../components/SubjectCard";
import QuestCard from "../components/QuestCard";
import DailyGoals from "../components/DailyGoals";

import { subjects } from "../data/mockData";

import {
  saveQuest,
  removeQuest,
} from "../firebase/quests";

import {
  saveCompletedQuest,
} from "../firebase/completedQuests";

import "../styles/dashboard.css";

function Dashboard({
  user,
  setPage,
  xp,
  setXP,
  streak,
  setStreak,
  quests,
  setQuests,
}) {
  const [completedQuests, setCompletedQuests] = useState(() => {
    const savedCompleted = localStorage.getItem("completedQuests");

    return savedCompleted ? JSON.parse(savedCompleted) : 0;
  });

  const [focusMinutes] = useState(() => {
    const savedFocusMinutes = localStorage.getItem("focusMinutes");

    return savedFocusMinutes ? JSON.parse(savedFocusMinutes) : 0;
  });

  const [newQuest, setNewQuest] = useState({
    title: "",
    subject: "Math AA HL",
    difficulty: "Easy",
    subtasks: "",
  });

  useEffect(() => {
    localStorage.setItem(
      "completedQuests",
      JSON.stringify(completedQuests)
    );
  }, [completedQuests]);

  function getXP(difficulty) {
    if (difficulty === "Easy") return 40;
    if (difficulty === "Medium") return 80;
    if (difficulty === "Hard") return 120;

    return 40;
  }

  async function addQuest(event) {
    event.preventDefault();

    if (newQuest.title.trim() === "") return;

    const subtaskArray = newQuest.subtasks
      .split(",")
      .map((subtask) => subtask.trim())
      .filter((subtask) => subtask !== "");

    const questToAdd = {
      title: newQuest.title,
      subject: newQuest.subject,
      difficulty: newQuest.difficulty,
      xp: getXP(newQuest.difficulty),
      subtasks: subtaskArray,
      completed: false,
    };

    const savedQuest = await saveQuest(user.uid, questToAdd);

    setQuests([savedQuest, ...quests]);

    setNewQuest({
      title: "",
      subject: "Math AA HL",
      difficulty: "Easy",
      subtasks: "",
    });
  }

  async function completeQuest(indexToComplete) {
    const completedQuest = quests[indexToComplete];

    setXP(xp + completedQuest.xp);

    setStreak(streak + 1);

    setCompletedQuests(completedQuests + 1);

    await saveCompletedQuest(user.uid, {
      ...completedQuest,
      completed: true,
    });

    await removeQuest(user.uid, completedQuest.id);

    setQuests(
      quests.filter((_, index) => index !== indexToComplete)
    );
  }

  async function deleteQuest(indexToDelete) {
    const questToRemove = quests[indexToDelete];

    if (questToRemove.id) {
      await removeQuest(user.uid, questToRemove.id);
    }

    setQuests(
      quests.filter((_, index) => index !== indexToDelete)
    );
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "42px" }}>
            IPlan 🚀
          </h1>

          <p style={{ color: "#9ca3af", marginTop: "10px" }}>
            The productivity operating system for ambitious students.
          </p>
        </div>

        <LevelCard xp={xp} streak={streak} />

        <section>
          <h2 className="section-title">Daily Progress</h2>

          <DailyGoals
            completedQuests={completedQuests}
            focusMinutes={focusMinutes}
          />
        </section>

        <section>
          <h2 className="section-title">Add New Quest</h2>

          <form className="quest-form" onSubmit={addQuest}>
            <input
              type="text"
              placeholder="Example: Finish Biology notes"
              value={newQuest.title}
              onChange={(e) =>
                setNewQuest({
                  ...newQuest,
                  title: e.target.value,
                })
              }
            />

            <select
              value={newQuest.subject}
              onChange={(e) =>
                setNewQuest({
                  ...newQuest,
                  subject: e.target.value,
                })
              }
            >
              {subjects.map((subject, index) => (
                <option key={index} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </select>

            <select
              value={newQuest.difficulty}
              onChange={(e) =>
                setNewQuest({
                  ...newQuest,
                  difficulty: e.target.value,
                })
              }
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            <input
              type="text"
              placeholder="Subtasks separated by commas"
              value={newQuest.subtasks}
              onChange={(e) =>
                setNewQuest({
                  ...newQuest,
                  subtasks: e.target.value,
                })
              }
            />

            <button type="submit">Add Quest</button>
          </form>
        </section>

        <section>
          <h2 className="section-title">Today's Quests</h2>

          <div className="quests-grid">
            {quests.length === 0 ? (
              <div className="subject-card">
                <p>No quests yet. Add your first quest above.</p>
              </div>
            ) : (
              quests.map((quest, index) => (
                <div key={quest.id || index}>
                  <QuestCard
                    quest={quest}
                    onComplete={() => completeQuest(index)}
                  />

                  <button
                    className="delete-btn"
                    onClick={() => deleteQuest(index)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="section-title">Subjects</h2>

          <div className="subjects-grid">
            {subjects.map((subject, index) => (
              <SubjectCard key={index} subject={subject} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;