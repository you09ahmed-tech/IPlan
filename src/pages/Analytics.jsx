import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import { loadQuests } from "../firebase/quests";
import { loadCompletedQuests } from "../firebase/completedQuests";
import { loadStudySessions } from "../firebase/sessions";
import { loadSubjects } from "../firebase/subjects";
import { loadFocusCityProgress } from "../firebase/focusCity";

const HEAVY_TASK_TYPES = ["IA", "EE", "TOK"];

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDateKey(date) {
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

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRiskClass(daysUntil) {
  if (daysUntil === null) return "risk-neutral";
  if (daysUntil < 0) return "risk-danger";
  if (daysUntil === 0) return "risk-danger";
  if (daysUntil <= 2) return "risk-warning";
  if (daysUntil <= 7) return "risk-medium";
  return "risk-low";
}

function formatDaysLabel(daysUntil) {
  if (daysUntil === null) return "No date";
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)}d`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil}d`;
}

function readLocalFocusMinutes() {
  try {
    const saved = localStorage.getItem("focusMinutes");
    return saved ? Number(JSON.parse(saved)) || 0 : 0;
  } catch (error) {
    console.error("Error reading local focus minutes:", error);
    return 0;
  }
}

function Analytics({ setPage }) {
  const [quests, setQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [cityProgress, setCityProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAnalyticsData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const [
          loadedQuests,
          loadedCompletedQuests,
          loadedSessions,
          loadedSubjects,
          loadedCityProgress,
        ] = await Promise.all([
          loadQuests(currentUser.uid),
          loadCompletedQuests(currentUser.uid),
          loadStudySessions(currentUser.uid),
          loadSubjects(currentUser.uid),
          loadFocusCityProgress(currentUser.uid),
        ]);

        setQuests(loadedQuests || []);
        setCompletedQuests(loadedCompletedQuests || []);
        setSessions(loadedSessions || []);
        setSubjects(loadedSubjects || []);
        setCityProgress(loadedCityProgress);
      } catch (error) {
        console.error("Error loading analytics data:", error);
        setErrorMessage(
          "IPlan could not load your analytics right now. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalyticsData();
  }, []);

  const activeQuests = useMemo(() => {
    return quests.filter((quest) => {
      const status = quest.status || "active";
      return status === "active" && !quest.completed;
    });
  }, [quests]);

  const archivedOrBacklogQuests = useMemo(() => {
    return quests.filter(
      (quest) => quest.status === "archived" || quest.status === "backlog"
    );
  }, [quests]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => (session.status || "planned") !== "archived");
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return visibleSessions.filter((session) => session.status === "completed");
  }, [visibleSessions]);

  const overdueQuests = useMemo(() => {
    return activeQuests.filter((quest) => {
      const daysUntil = getDaysUntil(quest.dueDate);
      return daysUntil !== null && daysUntil < 0;
    });
  }, [activeQuests]);

  const overdueSessions = useMemo(() => {
    return visibleSessions.filter((session) => {
      if (session.status === "completed") {
        return false;
      }

      const daysUntil = getDaysUntil(session.date);
      return daysUntil !== null && daysUntil < 0;
    });
  }, [visibleSessions]);

  const overdueCount = overdueQuests.length + overdueSessions.length;
  const completedSessionsCount = completedSessions.length;

  const focusMinutes =
    cityProgress?.totalFocusMinutes ?? readLocalFocusMinutes();

  const tasksBySubject = useMemo(() => {
    const counts = {};

    activeQuests.forEach((quest) => {
      const subject = quest.subject || "General";
      counts[subject] = (counts[subject] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeQuests]);

  const tasksByType = useMemo(() => {
    const counts = {};

    activeQuests.forEach((quest) => {
      const taskType = quest.taskType || "Other";
      counts[taskType] = (counts[taskType] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([taskType, count]) => ({ taskType, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeQuests]);

  const maxSubjectCount = Math.max(1, ...tasksBySubject.map((item) => item.count));
  const maxTypeCount = Math.max(1, ...tasksByType.map((item) => item.count));

  const upcomingDeadlineItems = useMemo(() => {
    const questItems = activeQuests
      .filter((quest) => quest.dueDate)
      .map((quest) => ({
        id: quest.id,
        title: quest.title,
        subject: quest.subject || "General",
        daysUntil: getDaysUntil(quest.dueDate),
        kind: "Task",
      }));

    const sessionItems = visibleSessions
      .filter((session) => session.status !== "completed" && session.date)
      .map((session) => ({
        id: session.id,
        title: session.title || session.goal || "Study session",
        subject: session.subject || "General",
        daysUntil: getDaysUntil(session.date),
        kind: "Session",
      }));

    return [...questItems, ...sessionItems]
      .filter((item) => item.daysUntil !== null && item.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);
  }, [activeQuests, visibleSessions]);

  const mostDelayedSubject = useMemo(() => {
    const counts = {};

    overdueQuests.forEach((quest) => {
      const subject = quest.subject || "General";
      counts[subject] = (counts[subject] || 0) + 1;
    });

    overdueSessions.forEach((session) => {
      const subject = session.subject || "General";
      counts[subject] = (counts[subject] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return null;
    }

    return { subject: entries[0][0], count: entries[0][1] };
  }, [overdueQuests, overdueSessions]);

  const weeklyConsistency = useMemo(() => {
    const today = getTodayStart();
    const days = [];

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateKey = formatDateKey(date);

      const hasQuestActivity = completedQuests.some((quest) => {
        if (!quest.completedAt) {
          return false;
        }

        const completedDate = new Date(quest.completedAt);
        return !Number.isNaN(completedDate.getTime()) && formatDateKey(completedDate) === dateKey;
      });

      const hasSessionActivity = completedSessions.some((session) => {
        const rawDate = session.completedAt || session.date;

        if (!rawDate) {
          return false;
        }

        const completedDate = new Date(
          session.completedAt ? session.completedAt : `${session.date}T00:00:00`
        );

        return !Number.isNaN(completedDate.getTime()) && formatDateKey(completedDate) === dateKey;
      });

      days.push({
        dateKey,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        active: hasQuestActivity || hasSessionActivity,
        isToday: dateKey === formatDateKey(today),
      });
    }

    return days;
  }, [completedQuests, completedSessions]);

  const totalCompletedItems = completedQuests.length + completedSessionsCount;
  const hasEnoughConsistencyData = totalCompletedItems >= 3;
  const activeDaysCount = weeklyConsistency.filter((day) => day.active).length;

  const suggestedInsight = useMemo(() => {
    if (
      subjects.length === 0 &&
      activeQuests.length === 0 &&
      completedQuests.length === 0
    ) {
      return "Add your subjects and your first IB task so IPlan can start giving you real insights about your workload.";
    }

    if (mostDelayedSubject && overdueCount > 0) {
      return `Your highest pressure subject right now is ${mostDelayedSubject.subject} because it has the most overdue or due-soon work.`;
    }

    if (
      completedQuests.length >= 3 &&
      completedSessionsCount < Math.ceil(completedQuests.length / 2)
    ) {
      return "You are completing tasks, but your sessions are not being completed as consistently. Try scheduling shorter, more realistic sessions.";
    }

    const heavyTypeCount = activeQuests.filter((quest) =>
      HEAVY_TASK_TYPES.includes(quest.taskType)
    ).length;

    if (activeQuests.length > 0 && heavyTypeCount / activeQuests.length >= 0.5) {
      return "Most of your active workload is IA/EE/TOK style work, so avoid adding too many small low-priority tasks on top of it.";
    }

    if (activeQuests.length === 0 && visibleSessions.length === 0) {
      return "You have no active tasks or sessions right now. Use AI Breakdown Planner to turn your next assignment into a clear plan.";
    }

    if (hasEnoughConsistencyData && activeDaysCount <= 2) {
      return "Your focus consistency has been low this week. Try one short session today to restart momentum — it does not need to be long.";
    }

    return "Your workload looks manageable right now. Keep using Today's Priority on your Dashboard to stay ahead of deadlines.";
  }, [
    subjects,
    activeQuests,
    completedQuests,
    mostDelayedSubject,
    overdueCount,
    completedSessionsCount,
    visibleSessions,
    hasEnoughConsistencyData,
    activeDaysCount,
  ]);

  const hasAnyData =
    subjects.length > 0 ||
    quests.length > 0 ||
    completedQuests.length > 0 ||
    sessions.length > 0;

  const overviewStats = [
    { label: "Active Tasks", value: activeQuests.length },
    { label: "Completed Tasks", value: completedQuests.length },
    { label: "Focus Minutes", value: focusMinutes },
    { label: "Completed Sessions", value: completedSessionsCount },
    { label: "Overdue Items", value: overdueCount, danger: overdueCount > 0 },
    { label: "Archived / Backlog", value: archivedOrBacklogQuests.length },
  ];

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Study Insights</p>
            <h1>Analytics 📊</h1>

            <p>
              Understand your real IB workload, deadline pressure, and study
              consistency.
            </p>
          </div>
        </div>

        {loading ? (
          <section className="empty-state-card">
            <h2>Loading analytics...</h2>
            <p>IPlan is reviewing your subjects, tasks, and sessions.</p>
          </section>
        ) : errorMessage ? (
          <section className="empty-state-card">
            <h2>Something went wrong</h2>
            <p>{errorMessage}</p>
          </section>
        ) : !hasAnyData ? (
          <section className="empty-state-card">
            <h2>No data yet</h2>

            <p>
              Add your subjects, create a few tasks, and complete a focus
              session or two so IPlan can show you real insights here.
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => setPage("subjects")}
            >
              Add Subjects
            </button>
          </section>
        ) : (
          <>
            <section className="analytics-overview-grid">
              {overviewStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`analytics-stat-tile ${stat.danger ? "danger-stat" : ""}`}
                >
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </section>

            <section className="analytics-columns">
              <div className="analytics-card">
                <h2>Tasks by Subject</h2>

                {tasksBySubject.length === 0 ? (
                  <p className="analytics-muted-note">
                    No active tasks yet. Add a task to see this breakdown.
                  </p>
                ) : (
                  tasksBySubject.map((item) => (
                    <div className="analytics-bar-row" key={item.subject}>
                      <div className="analytics-bar-label">
                        <span>{item.subject}</span>
                        <strong>{item.count}</strong>
                      </div>

                      <div className="small-bar">
                        <div
                          style={{
                            width: `${Math.round(
                              (item.count / maxSubjectCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="analytics-card">
                <h2>Tasks by Task Type</h2>

                {tasksByType.length === 0 ? (
                  <p className="analytics-muted-note">
                    No active tasks yet. Add a task to see this breakdown.
                  </p>
                ) : (
                  tasksByType.map((item) => (
                    <div className="analytics-bar-row" key={item.taskType}>
                      <div className="analytics-bar-label">
                        <span>{item.taskType}</span>
                        <strong>{item.count}</strong>
                      </div>

                      <div className="small-bar">
                        <div
                          style={{
                            width: `${Math.round(
                              (item.count / maxTypeCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="analytics-card">
              <h2>Upcoming Deadline Pressure</h2>

              {upcomingDeadlineItems.length === 0 ? (
                <p className="analytics-muted-note">
                  Nothing is due in the next 7 days. You are ahead of your
                  workload right now.
                </p>
              ) : (
                <div className="analytics-deadline-list">
                  {upcomingDeadlineItems.map((item) => (
                    <div
                      className="analytics-deadline-row"
                      key={`${item.kind}-${item.id}`}
                    >
                      <div>
                        <p className="task-type-label">
                          {item.kind} • {item.subject}
                        </p>
                        <strong>{item.title}</strong>
                      </div>

                      <span
                        className={`deadline-risk-pill ${getRiskClass(
                          item.daysUntil
                        )}`}
                      >
                        {formatDaysLabel(item.daysUntil)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="analytics-columns">
              <div className="analytics-card">
                <h2>Weekly Focus Consistency</h2>

                {hasEnoughConsistencyData ? (
                  <>
                    <div className="consistency-row">
                      {weeklyConsistency.map((day) => (
                        <div
                          key={day.dateKey}
                          className={`consistency-day ${
                            day.active ? "active" : ""
                          } ${day.isToday ? "today" : ""}`}
                        >
                          <span>{day.label}</span>
                        </div>
                      ))}
                    </div>

                    <p className="analytics-muted-note" style={{ marginTop: "14px" }}>
                      {activeDaysCount} of the last 7 days had completed work.
                    </p>
                  </>
                ) : (
                  <p className="analytics-muted-note">
                    Complete a few more tasks or sessions to unlock your
                    weekly consistency view.
                  </p>
                )}
              </div>

              <div className="analytics-card">
                <h2>Most Delayed Subject</h2>

                {mostDelayedSubject ? (
                  <div className="next-action-box">
                    <p>
                      <strong>{mostDelayedSubject.subject}</strong> currently
                      has the most overdue or due-soon work (
                      {mostDelayedSubject.count} item
                      {mostDelayedSubject.count === 1 ? "" : "s"}).
                    </p>
                  </div>
                ) : (
                  <p className="analytics-muted-note">
                    Nothing is overdue right now. Nice work staying on
                    schedule.
                  </p>
                )}
              </div>
            </section>

            <section className="insight-card">
              <p className="eyebrow">IPlan Insight</p>
              <p>{suggestedInsight}</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Analytics;
