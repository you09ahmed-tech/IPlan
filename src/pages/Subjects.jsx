import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import {
  deleteSubject,
  loadSubjects,
  saveSubject,
} from "../firebase/subjects";
import { loadQuests } from "../firebase/quests";
import { loadCompletedQuests } from "../firebase/completedQuests";
import { calculateSubjectStats } from "../utils/subjectStats";

const defaultSubjectColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#be123c",
];

function Subjects({ setPage }) {
  const [subjects, setSubjects] = useState([]);
  const [quests, setQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectLevel, setSubjectLevel] = useState("HL");
  const [subjectColor, setSubjectColor] = useState(defaultSubjectColors[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    async function loadPageData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const savedSubjects = await loadSubjects(user.uid);
        const savedQuests = await loadQuests(user.uid);
        const savedCompletedQuests = await loadCompletedQuests(user.uid);

        setSubjects(savedSubjects || []);
        setQuests(savedQuests || []);
        setCompletedQuests(savedCompletedQuests || []);
      } catch (error) {
        console.error("Error loading subjects page:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [user]);

  async function handleAddSubject(event) {
    event.preventDefault();

    if (!user) {
      alert("You need to be logged in to add subjects.");
      return;
    }

    const cleanedName = subjectName.trim();

    if (!cleanedName) {
      alert("Please enter a subject name.");
      return;
    }

    const subjectAlreadyExists = subjects.some(
      (subject) =>
        subject.name.toLowerCase().trim() === cleanedName.toLowerCase()
    );

    if (subjectAlreadyExists) {
      alert("This subject already exists.");
      return;
    }

    try {
      setSaving(true);

      const newSubject = await saveSubject(user.uid, {
        name: cleanedName,
        level: subjectLevel,
        color: subjectColor,
        progress: 0,
      });

      setSubjects((currentSubjects) => [...currentSubjects, newSubject]);
      setSubjectName("");
      setSubjectLevel("HL");
      setSubjectColor(defaultSubjectColors[0]);
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Something went wrong while saving the subject.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubject(subjectId, subjectNameToDelete) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${subjectNameToDelete}? This will remove the subject from your subjects page.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSubject(user.uid, subjectId);

      setSubjects((currentSubjects) =>
        currentSubjects.filter((subject) => subject.id !== subjectId)
      );
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Something went wrong while deleting the subject.");
    }
  }


  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Subject System</p>
            <h1>Subjects 📚</h1>
            <p>Add your IB subjects to personalize tasks, breakdowns, and priorities.</p>
          </div>
        </div>

        <section className="subject-manager-card">
          <div>
            <h2>Add a subject</h2>
            <p>
              Start by adding your current IB subjects. Later, IPlan will use
              this to recommend what to work on first.
            </p>
          </div>

          <form className="subject-form" onSubmit={handleAddSubject}>
            <div className="form-group">
              <label>Subject name</label>
              <input
                type="text"
                placeholder="Example: Biology, Business, Math AA"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Level</label>
              <select
                value={subjectLevel}
                onChange={(event) => setSubjectLevel(event.target.value)}
              >
                <option value="HL">HL</option>
                <option value="SL">SL</option>
                <option value="Core">Core</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="subject-color-row">
                {defaultSubjectColors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={
                      subjectColor === color
                        ? "subject-color-dot active"
                        : "subject-color-dot"
                    }
                    style={{ background: color }}
                    onClick={() => setSubjectColor(color)}
                    aria-label={`Choose ${color}`}
                  />
                ))}
              </div>
            </div>

            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Subject"}
            </button>
          </form>
        </section>

        {loading ? (
          <section className="empty-state-card">
            <h2>Loading subjects...</h2>
            <p>Please wait while IPlan loads your subjects.</p>
          </section>
        ) : subjects.length === 0 ? (
          <section className="empty-state-card">
            <h2>No subjects yet</h2>
            <p>
              Add your IB subjects above. This will make the planner,
              breakdowns, and dashboard more personalized.
            </p>
          </section>
        ) : (
          <div className="subjects-grid">
            {subjects.map((subject) => {
              const stats = calculateSubjectStats(
                subject.name,
                quests,
                completedQuests
              );

              return (
                <article className="subject-card upgraded" key={subject.id}>
                  <div
                    className="subject-card-accent"
                    style={{ background: subject.color }}
                  />

                  <div className="subject-card-top">
                    <div>
                      <h2>{subject.name}</h2>
                      <p>{subject.level}</p>
                    </div>

                    <button
                      className="danger-btn small"
                      type="button"
                      onClick={() =>
                        handleDeleteSubject(subject.id, subject.name)
                      }
                    >
                      Delete
                    </button>
                  </div>

                  <div className="subject-stats-row">
                    <div className="subject-stat-chip">
                      <span className="stat-label">Active</span>
                      <strong className="stat-value">
                        {stats.activeQuestCount}{" "}
                        <small>
                          quest{stats.activeQuestCount === 1 ? "" : "s"}
                        </small>
                      </strong>
                    </div>

                    <div className="subject-stat-chip">
                      <span className="stat-label">XP</span>
                      <strong className="stat-value">
                        {stats.xpEarned} <small>earned</small>
                      </strong>
                    </div>

                    <div className="subject-stat-chip">
                      <span className="stat-label">Progress</span>
                      <strong className="stat-value">{stats.progress}%</strong>
                    </div>
                  </div>

                  <div className="subject-progress-track">
                    <div
                      className="subject-progress-fill"
                      style={{
                        width: `${stats.progress}%`,
                        background: subject.color,
                      }}
                    />
                  </div>

                  {stats.totalQuestCount === 0 ? (
                    <p className="subject-muted-text">
                      No active quests for this subject yet.
                    </p>
                  ) : (
                    <p className="subject-muted-text">
                      {stats.completedQuestCount} of {stats.totalQuestCount}{" "}
                      quest{stats.totalQuestCount === 1 ? "" : "s"} completed
                      for this subject.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Subjects;