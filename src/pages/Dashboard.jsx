import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import LevelCard from "../components/LevelCard";
import SubjectCard from "../components/SubjectCard";
import QuestCard from "../components/QuestCard";
import DailyGoals from "../components/DailyGoals";
import OverdueReviewModal from "../components/OverdueReviewModal";

import {
  saveQuest,
  removeQuest,
} from "../firebase/quests";

import {
  saveCompletedQuest,
  loadCompletedQuests,
} from "../firebase/completedQuests";

import {
  loadStudySessions,
} from "../firebase/sessions";

import {
  loadSubjects,
} from "../firebase/subjects";

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
  const [allCompletedQuests, setAllCompletedQuests] = useState([]);

  const [todayFocusMinutes] = useState(() => {
    try {
      const saved = localStorage.getItem("iplanFocusMinutesToday");

      if (!saved) {
        return 0;
      }

      const parsed = JSON.parse(saved);
      return parsed.date === getDateKey(new Date()) ? Number(parsed.minutes) || 0 : 0;
    } catch (error) {
      console.error("Error reading today's focus minutes:", error);
      return 0;
    }
  });

  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [dashboardSubjects, setDashboardSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [reviewItem, setReviewItem] = useState(null);

  const [newQuest, setNewQuest] = useState({
    title: "",
    subject: "",
    taskType: "Homework",
    difficulty: "Medium",
    priority: "Medium",
    dueDate: "",
    estimatedMinutes: "45",
    subtasks: "",
  });

  useEffect(() => {
    async function loadDashboardCompletedQuests() {
      if (!user) {
        return;
      }

      try {
        const savedCompletedQuests = await loadCompletedQuests(user.uid);
        setAllCompletedQuests(savedCompletedQuests || []);
      } catch (error) {
        console.error("Error loading completed quests for dashboard:", error);
      }
    }

    loadDashboardCompletedQuests();
  }, [user]);

  useEffect(() => {
    async function loadDashboardSubjects() {
      if (!user) {
        setSubjectsLoading(false);
        return;
      }

      try {
        setSubjectsLoading(true);

        const savedSubjects = await loadSubjects(user.uid);
        const safeSubjects = savedSubjects || [];

        setDashboardSubjects(safeSubjects);

        if (safeSubjects.length > 0) {
          setNewQuest((currentQuest) => ({
            ...currentQuest,
            subject: currentQuest.subject || safeSubjects[0].name,
          }));
        }
      } catch (error) {
        console.error("Error loading dashboard subjects:", error);
      } finally {
        setSubjectsLoading(false);
      }
    }

    loadDashboardSubjects();
  }, [user]);

  useEffect(() => {
    async function loadDashboardSessions() {
      if (!user) {
        setSessionsLoading(false);
        return;
      }

      try {
        setSessionsLoading(true);

        const savedSessions = await loadStudySessions(user.uid);
        setAllSessions(savedSessions || []);
      } catch (error) {
        console.error("Error loading dashboard sessions:", error);
      } finally {
        setSessionsLoading(false);
      }
    }

    loadDashboardSessions();
  }, [user]);

  function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today;
  }

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getDaysUntil(dateString) {
    if (!dateString) {
      return null;
    }

    const today = getTodayStart();
    const date = new Date(`${dateString}T00:00:00`);

    return Math.round(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  function getXP(difficulty) {
    if (difficulty === "Easy") return 40;
    if (difficulty === "Medium") return 80;
    if (difficulty === "Hard") return 120;

    return 40;
  }

  function getPriorityWeight(priority) {
    if (priority === "High") return 40;
    if (priority === "Medium") return 25;
    if (priority === "Low") return 10;

    return 20;
  }

  function getDifficultyWeight(difficulty) {
    if (difficulty === "Hard") return 25;
    if (difficulty === "Medium") return 15;
    if (difficulty === "Easy") return 5;

    return 10;
  }

  function getTaskTypeWeight(taskType) {
    if (taskType === "IA") return 30;
    if (taskType === "EE") return 35;
    if (taskType === "TOK") return 25;
    if (taskType === "Exam Prep") return 28;
    if (taskType === "Revision") return 22;
    if (taskType === "CAS") return 12;

    return 10;
  }

  function getDeadlineWeight(daysUntilDue) {
    if (daysUntilDue === null) return 0;
    if (daysUntilDue < 0) return 70;
    if (daysUntilDue === 0) return 60;
    if (daysUntilDue === 1) return 48;
    if (daysUntilDue <= 3) return 38;
    if (daysUntilDue <= 7) return 24;
    if (daysUntilDue <= 14) return 12;

    return 4;
  }

  function getDeadlineRisk(daysUntilDue) {
    if (daysUntilDue === null) {
      return {
        label: "No deadline",
        className: "risk-neutral",
        explanation: "This item has no due date, so it is ranked mostly by priority and difficulty.",
      };
    }

    if (daysUntilDue < 0) {
      return {
        label: "Overdue",
        className: "risk-danger",
        explanation: "This item is already overdue and needs a recovery decision.",
      };
    }

    if (daysUntilDue === 0) {
      return {
        label: "Due today",
        className: "risk-danger",
        explanation: "This item is due today, so delaying it creates immediate pressure.",
      };
    }

    if (daysUntilDue <= 2) {
      return {
        label: "High deadline risk",
        className: "risk-warning",
        explanation: "This item is due very soon, so starting now reduces deadline pressure.",
      };
    }

    if (daysUntilDue <= 7) {
      return {
        label: "Medium deadline risk",
        className: "risk-medium",
        explanation: "This item is due within a week, so it should stay visible.",
      };
    }

    return {
      label: "Low deadline risk",
      className: "risk-low",
      explanation: "This item is not immediately due, but it may still matter because of priority or difficulty.",
    };
  }

  function getEstimatedMinutes(item) {
    if (item.estimatedMinutes) {
      return Number(item.estimatedMinutes);
    }

    if (item.durationMinutes) {
      return Number(item.durationMinutes);
    }

    if (item.duration) {
      const match = String(item.duration).match(/\d+/);

      if (match) {
        return Number(match[0]);
      }
    }

    return 45;
  }

  function getRecommendedAction(item) {
    if (item.kind === "session") {
      if (item.daysUntilDue < 0) {
        return "Open Calendar and decide whether to complete, reschedule, or review this missed session.";
      }

      if (item.daysUntilDue === 0) {
        return "Start this scheduled session today, even if you only complete the first focused step.";
      }

      return "Open Calendar and prepare for this upcoming session.";
    }

    if (item.daysUntilDue < 0) {
      return "Review why this task became overdue, then reschedule or split it into a smaller next action.";
    }

    if (item.taskType === "IA" || item.taskType === "EE") {
      return "Start with one concrete section instead of trying to finish the whole task.";
    }

    if (item.taskType === "Revision" || item.taskType === "Exam Prep") {
      return "Start with active recall or practice questions from your weakest topic.";
    }

    if (item.difficulty === "Hard") {
      return "Work for 25 minutes only. The goal is to reduce resistance and create progress.";
    }

    return "Start with the first subtask or a 25-minute focus session.";
  }

  function scoreSession(session) {
    const daysUntilDue = getDaysUntil(session.date);
    const estimatedMinutes = getEstimatedMinutes(session);

    let score = 0;

    score += getDeadlineWeight(daysUntilDue);
    score += 25;

    if (estimatedMinutes <= 30) score += 8;
    if (estimatedMinutes > 60) score += 6;

    if (session.priority === "High") score += 20;
    if (session.difficulty === "Hard") score += 12;

    return {
      kind: "session",
      id: session.id,
      title: session.title || session.goal || "Untitled study session",
      subject: session.subject || "General",
      taskType: session.taskType || "Calendar Session",
      priority: session.priority || "Medium",
      difficulty: session.difficulty || "Medium",
      date: session.date,
      time: session.time || "",
      duration: session.duration || `${estimatedMinutes} minutes`,
      estimatedMinutes,
      daysUntilDue,
      priorityScore: score,
      source: session,
    };
  }

  function scoreQuest(quest) {
    const daysUntilDue = getDaysUntil(quest.dueDate);
    const estimatedMinutes = getEstimatedMinutes(quest);

    let score = 0;

    score += getPriorityWeight(quest.priority);
    score += getDifficultyWeight(quest.difficulty);
    score += getTaskTypeWeight(quest.taskType);
    score += getDeadlineWeight(daysUntilDue);

    if (estimatedMinutes <= 30) score += 8;
    if (estimatedMinutes > 90 && quest.difficulty === "Hard") score += 10;

    return {
      kind: "quest",
      id: quest.id,
      title: quest.title,
      subject: quest.subject || "General",
      taskType: quest.taskType || "Task",
      priority: quest.priority || "Medium",
      difficulty: quest.difficulty || "Medium",
      date: quest.dueDate || "",
      time: "",
      duration: quest.estimatedMinutes
        ? `${quest.estimatedMinutes} minutes`
        : "Start with 25 minutes",
      estimatedMinutes,
      daysUntilDue,
      priorityScore: score,
      source: quest,
    };
  }

  const todayCompletedQuestsCount = useMemo(() => {
    const todayKey = getDateKey(new Date());

    return allCompletedQuests.filter((quest) => {
      if (!quest.completedAt) {
        return false;
      }

      const completedDate = new Date(quest.completedAt);

      if (Number.isNaN(completedDate.getTime())) {
        return false;
      }

      return getDateKey(completedDate) === todayKey;
    }).length;
  }, [allCompletedQuests]);

  const activeQuests = useMemo(() => {
    return quests.filter((quest) => {
      const status = quest.status || "active";
      return status === "active" && !quest.completed;
    });
  }, [quests]);

  const activeSessions = useMemo(() => {
    return allSessions.filter((session) => {
      return session.status !== "completed" && session.status !== "archived";
    });
  }, [allSessions]);

  const upcomingSessions = useMemo(() => {
    const today = getTodayStart();

    return activeSessions
      .filter((session) => session.date)
      .filter((session) => {
        const sessionDate = new Date(`${session.date}T00:00:00`);
        return sessionDate >= today;
      })
      .sort((a, b) => {
        const dateA = `${a.date || ""} ${a.time || ""}`;
        const dateB = `${b.date || ""} ${b.time || ""}`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 4);
  }, [activeSessions]);

  const todayPriority = useMemo(() => {
    const scoredSessions = activeSessions
      .filter((session) => session.date)
      .map(scoreSession);

    const scoredQuests = activeQuests.map(scoreQuest);

    const allCandidates = [...scoredSessions, ...scoredQuests];

    if (allCandidates.length === 0) {
      return null;
    }

    const sortedCandidates = allCandidates.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      const aDays = a.daysUntilDue ?? 999;
      const bDays = b.daysUntilDue ?? 999;

      return aDays - bDays;
    });

    const topItem = sortedCandidates[0];
    const risk = getDeadlineRisk(topItem.daysUntilDue);

    const reasonParts = [
      risk.explanation,
      `IPlan scored this at ${topItem.priorityScore} because of its deadline, priority, difficulty, task type, and estimated effort.`,
    ];

    if (topItem.kind === "session") {
      reasonParts.push("It is a scheduled Calendar session, so it represents work you already planned.");
    } else {
      reasonParts.push("It is an active Dashboard task, so it represents work you chose to track.");
    }

    return {
      ...topItem,
      label: topItem.kind === "session" ? "Calendar priority" : "Task priority",
      riskLabel: risk.label,
      riskClass: risk.className,
      reason: reasonParts.join(" "),
      recommendedAction: getRecommendedAction(topItem),
      actionText: topItem.kind === "session" ? "Open Calendar" : "Start Focus",
      actionPage: topItem.kind === "session" ? "calendar" : "focus",
      canReviewOverdue: topItem.daysUntilDue !== null && topItem.daysUntilDue < 0,
    };
  }, [activeSessions, activeQuests]);

  function formatSessionDate(dateString) {
    if (!dateString) {
      return "No date";
    }

    const today = getTodayStart();

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sessionDate = new Date(`${dateString}T00:00:00`);

    if (sessionDate.getTime() === today.getTime()) {
      return "Today";
    }

    if (sessionDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    return sessionDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  async function addQuest(event) {
    event.preventDefault();

    if (!user) {
      alert("You need to be logged in to add quests.");
      return;
    }

    if (newQuest.title.trim() === "") {
      alert("Please enter a quest title.");
      return;
    }

    if (!newQuest.subject) {
      alert("Please add at least one subject first.");
      return;
    }

    const subtaskArray = newQuest.subtasks
      .split(",")
      .map((subtask) => subtask.trim())
      .filter((subtask) => subtask !== "");

    const estimatedMinutesNumber = Number(newQuest.estimatedMinutes) || 45;

    const questToAdd = {
      title: newQuest.title.trim(),
      subject: newQuest.subject,
      taskType: newQuest.taskType,
      difficulty: newQuest.difficulty,
      priority: newQuest.priority,
      dueDate: newQuest.dueDate || "",
      estimatedMinutes: estimatedMinutesNumber,
      xp: getXP(newQuest.difficulty),
      subtasks: subtaskArray,
      completed: false,
      status: "active",
      createdAt: new Date().toISOString(),
      source: "Manual Quest",
    };

    const savedQuest = await saveQuest(user.uid, questToAdd);

    setQuests([savedQuest, ...quests]);

    setNewQuest({
      title: "",
      subject: dashboardSubjects[0]?.name || "",
      taskType: "Homework",
      difficulty: "Medium",
      priority: "Medium",
      dueDate: "",
      estimatedMinutes: "45",
      subtasks: "",
    });
  }

  async function completeQuest(questToComplete) {
    setXP(xp + (questToComplete.xp || 0));
    setStreak(streak + 1);

    const savedCompletedQuest = await saveCompletedQuest(user.uid, {
      ...questToComplete,
      completed: true,
    });

    setAllCompletedQuests((current) => [savedCompletedQuest, ...current]);

    if (questToComplete.id) {
      await removeQuest(user.uid, questToComplete.id);
    }

    setQuests(quests.filter((quest) => quest.id !== questToComplete.id));
  }

  async function deleteQuest(questToRemove) {
    const confirmed = window.confirm(
      "Delete this task? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    if (questToRemove.id) {
      await removeQuest(user.uid, questToRemove.id);
    }

    setQuests(quests.filter((quest) => quest.id !== questToRemove.id));
  }

  function handleQuestUpdated(questId, updates) {
    setQuests(
      quests.map((quest) =>
        quest.id === questId ? { ...quest, ...updates } : quest
      )
    );
  }

  function handleQuestCreated(newQuest) {
    setQuests([newQuest, ...quests]);
  }

  function handleSessionUpdated(sessionId, updates) {
    setAllSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  }

  function handleReviewNavigate(targetPage) {
    setReviewItem(null);
    setPage(targetPage);
  }

  function startFocusFromPriority() {
    if (!todayPriority) {
      setPage("focus");
      return;
    }

    const rawSource = todayPriority.source || {};

    const subtasks =
      todayPriority.kind === "session"
        ? Array.isArray(rawSource.tasks)
          ? rawSource.tasks
          : Array.isArray(rawSource.subtasks)
          ? rawSource.subtasks
          : []
        : Array.isArray(rawSource.subtasks)
        ? rawSource.subtasks
        : [];

    const focusTask = {
      title: todayPriority.title,
      subject: todayPriority.subject,
      taskType: todayPriority.taskType,
      priority: todayPriority.priority,
      difficulty: todayPriority.difficulty,
      estimatedMinutes: todayPriority.estimatedMinutes,
      duration: todayPriority.duration,
      subtasks,
      recommendedFirstStep: subtasks[0] || todayPriority.recommendedAction,
      sourceType: todayPriority.kind,
      linkedId: todayPriority.id,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem("iplanFocusTask", JSON.stringify(focusTask));
    setPage("focus");
  }

  function handlePriorityActionClick() {
    if (todayPriority && todayPriority.actionPage === "focus") {
      startFocusFromPriority();
      return;
    }

    setPage(todayPriority.actionPage);
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="dashboard-hero">
          <p className="eyebrow">Your IB command center</p>
          <h1 className="ip-wordmark">IPlan</h1>
          <p>Know what to do first, and stay consistent with your workload.</p>
        </div>

        <div className="guide-banner">
          <div className="guide-banner-icon" aria-hidden="true">?</div>
          <div className="guide-banner-text">
            <strong>New to IPlan? Start with the Guide</strong>
            <span>See what each part of the app is for and how to use it well.</span>
          </div>
          <button type="button" className="guide-banner-btn" onClick={() => setPage("guide")}>
            Open Guide →
          </button>
        </div>

        <LevelCard xp={xp} streak={streak} />

        <section>
          <h2 className="section-title">Today’s Priority</h2>

          {sessionsLoading ? (
            <div className="today-priority-card priority-v2">
              <p>Finding your most important task...</p>
            </div>
          ) : todayPriority ? (
            <div className="today-priority-card priority-v2">
              <div className="priority-v2-header">
                <div>
                  <p className="priority-label">{todayPriority.label}</p>
                  <h2>{todayPriority.title}</h2>

                  <p className="priority-subject">
                    {todayPriority.subject} • {todayPriority.duration}
                  </p>
                </div>

                <div className={`deadline-risk-pill ${todayPriority.riskClass}`}>
                  {todayPriority.riskLabel}
                </div>
              </div>

              <div className="priority-score-row">
                <div>
                  <span>Priority score</span>
                  <strong>{todayPriority.priorityScore}</strong>
                </div>

                <div>
                  <span>Task type</span>
                  <strong>{todayPriority.taskType}</strong>
                </div>

                <div>
                  <span>Difficulty</span>
                  <strong>{todayPriority.difficulty}</strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>{todayPriority.priority}</strong>
                </div>
              </div>

              <div className="priority-explanation-box">
                <h3>Why this first?</h3>
                <p>{todayPriority.reason}</p>
              </div>

              <div className="priority-explanation-box">
                <h3>Recommended next action</h3>
                <p>{todayPriority.recommendedAction}</p>
              </div>

              <div className="priority-actions">
                <button type="button" onClick={handlePriorityActionClick}>
                  {todayPriority.actionText}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPage("calendar")}
                >
                  Open Calendar
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPage("breakdown")}
                >
                  Plan Another Task
                </button>

                {todayPriority.canReviewOverdue && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setReviewItem(todayPriority)}
                  >
                    Review Overdue
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="today-priority-card empty-priority">
              <div>
                <p className="priority-label">No priority yet</p>
                <h2>Create your first plan</h2>

                <p className="priority-reason">
                  Add a quest or use AI Breakdown Planner so IPlan can tell you
                  what to work on first.
                </p>
              </div>

              <button type="button" onClick={() => setPage("breakdown")}>
                Use AI Breakdown
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="section-title">Your Next Study Sessions</h2>

          {sessionsLoading ? (
            <div className="subject-card">
              <p>Loading your upcoming sessions...</p>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="subject-card">
              <h3>No planned sessions yet</h3>

              <p style={{ marginTop: "10px" }}>
                Use AI Breakdown Planner to turn a heavy task into scheduled
                study sessions.
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPage("breakdown")}
                style={{ marginTop: "18px" }}
              >
                Plan a Task
              </button>
            </div>
          ) : (
            <div className="subjects-grid">
              {upcomingSessions.map((session, index) => (
                <div className="quest-card" key={session.id || index}>
                  <h3>{session.title || session.goal}</h3>

                  <p style={{ marginTop: "10px" }}>
                    {formatSessionDate(session.date)} at{" "}
                    {session.time || "No time"}
                  </p>

                  <p style={{ marginTop: "10px" }}>
                    Goal: {session.goal || "No goal added"}
                  </p>

                  {session.subject && (
                    <p style={{ marginTop: "10px" }}>
                      Subject: {session.subject}
                    </p>
                  )}

                  {session.duration && (
                    <p style={{ marginTop: "10px" }}>
                      Duration: {session.duration}
                    </p>
                  )}

                  {session.focus && (
                    <p style={{ marginTop: "10px" }}>
                      Focus: {session.focus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setPage("calendar")}
            style={{ marginTop: "20px" }}
          >
            Open Calendar
          </button>
        </section>

        <section>
          <h2 className="section-title">Daily Progress</h2>

          <DailyGoals
            completedQuests={todayCompletedQuestsCount}
            focusMinutes={todayFocusMinutes}
          />
        </section>

        <section>
          <h2 className="section-title">Add New IB Task</h2>

          <form className="quest-form upgraded-quest-form" onSubmit={addQuest}>
            <div className="form-group full-width">
              <label>Task title</label>
              <input
                type="text"
                placeholder="Example: Draft Biology IA method section"
                value={newQuest.title}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    title: event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Subject</label>
              <select
                value={newQuest.subject}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    subject: event.target.value,
                  })
                }
                disabled={dashboardSubjects.length === 0}
              >
                {dashboardSubjects.length === 0 ? (
                  <option value="">Add a subject first</option>
                ) : (
                  dashboardSubjects.map((subject) => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name} {subject.level ? `(${subject.level})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label>IB task type</label>
              <select
                value={newQuest.taskType}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    taskType: event.target.value,
                  })
                }
              >
                <option>Homework</option>
                <option>Revision</option>
                <option>Exam Prep</option>
                <option>IA</option>
                <option>EE</option>
                <option>TOK</option>
                <option>CAS</option>
                <option>Reading</option>
                <option>Project</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={newQuest.priority}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    priority: event.target.value,
                  })
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select
                value={newQuest.difficulty}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    difficulty: event.target.value,
                  })
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due date</label>
              <input
                type="date"
                value={newQuest.dueDate}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    dueDate: event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Estimated minutes</label>
              <input
                type="number"
                min="5"
                step="5"
                value={newQuest.estimatedMinutes}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    estimatedMinutes: event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group full-width">
              <label>Subtasks</label>
              <input
                type="text"
                placeholder="Example: Find sources, write outline, draft method"
                value={newQuest.subtasks}
                onChange={(event) =>
                  setNewQuest({
                    ...newQuest,
                    subtasks: event.target.value,
                  })
                }
              />
            </div>

            <button type="submit" className="primary-btn full-width">
              Add IB Task
            </button>
          </form>

          {dashboardSubjects.length === 0 && (
            <p style={{ marginTop: "12px", color: "var(--muted)" }}>
              Add your subjects first so tasks can be linked to your real IB
              workload.
            </p>
          )}
        </section>

        <section>
          <h2 className="section-title">Today's Quests</h2>

          <div className="quests-grid">
            {activeQuests.length === 0 ? (
              <div className="subject-card">
                <p>No quests yet. Add your first IB task above.</p>
              </div>
            ) : (
              activeQuests.map((quest) => (
                <div key={quest.id}>
                  <QuestCard
                    quest={quest}
                    onComplete={() => completeQuest(quest)}
                  />

                  <button
                    className="delete-btn"
                    onClick={() => deleteQuest(quest)}
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

          {subjectsLoading ? (
            <div className="subject-card">
              <p>Loading subjects...</p>
            </div>
          ) : dashboardSubjects.length === 0 ? (
            <div className="subject-card">
              <h3>No subjects added yet</h3>

              <p style={{ marginTop: "10px" }}>
                Add your IB subjects so IPlan can personalize your quests,
                breakdowns, calendar sessions, and daily priorities.
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPage("subjects")}
                style={{ marginTop: "18px" }}
              >
                Add Subjects
              </button>
            </div>
          ) : (
            <div className="subjects-grid">
              {dashboardSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  quests={quests}
                  completedQuests={allCompletedQuests}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {reviewItem && (
        <OverdueReviewModal
          item={reviewItem}
          user={user}
          onClose={() => setReviewItem(null)}
          onQuestUpdated={handleQuestUpdated}
          onQuestCreated={handleQuestCreated}
          onSessionUpdated={handleSessionUpdated}
          onNavigate={handleReviewNavigate}
        />
      )}
    </div>
  );
}

export default Dashboard;
