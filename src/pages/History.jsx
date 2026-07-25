import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import { loadCompletedQuests } from "../firebase/completedQuests";
import { loadStudySessions } from "../firebase/sessions";

const RECENT_WINDOW_DAYS = 30;

function isWithinRecentWindow(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);

  return date >= cutoff;
}

function History({ setPage }) {
  const [completedQuests, setCompletedQuests] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setErrorMessage("");

      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setCompletedQuests([]);
          setCompletedSessions([]);
          setLoading(false);
          return;
        }

        const quests = await loadCompletedQuests(currentUser.uid);
        const sessions = await loadStudySessions(currentUser.uid);

        const finishedSessions = (sessions || []).filter((session) => {
          return session.status === "completed";
        });

        setCompletedQuests(quests || []);
        setCompletedSessions(finishedSessions || []);
      } catch (error) {
        console.error("Error loading study history:", error);
        setErrorMessage(
          "IPlan could not load your study history right now. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  function formatDate(value) {
    if (!value) {
      return "No date saved";
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  const subjectOptions = useMemo(() => {
    const subjects = new Set();

    completedQuests.forEach((quest) => subjects.add(quest.subject || "General"));
    completedSessions.forEach((session) => subjects.add(session.subject || "General"));

    return Array.from(subjects).sort();
  }, [completedQuests, completedSessions]);

  const taskTypeOptions = useMemo(() => {
    const types = new Set();

    completedQuests.forEach((quest) => types.add(quest.taskType || "Other"));
    completedSessions.forEach((session) => {
      if (session.taskType) {
        types.add(session.taskType);
      }
    });

    return Array.from(types).sort();
  }, [completedQuests, completedSessions]);

  const filteredQuests = useMemo(() => {
    return completedQuests.filter((quest) => {
      const subject = quest.subject || "General";
      const taskType = quest.taskType || "Other";

      if (subjectFilter !== "all" && subject !== subjectFilter) {
        return false;
      }

      if (taskTypeFilter !== "all" && taskType !== taskTypeFilter) {
        return false;
      }

      if (
        dateFilter === "recent" &&
        !isWithinRecentWindow(quest.completedAt || quest.createdAt || quest.date)
      ) {
        return false;
      }

      return true;
    });
  }, [completedQuests, subjectFilter, taskTypeFilter, dateFilter]);

  const filteredSessions = useMemo(() => {
    return completedSessions.filter((session) => {
      const subject = session.subject || "General";
      const taskType = session.taskType || "Other";

      if (subjectFilter !== "all" && subject !== subjectFilter) {
        return false;
      }

      if (taskTypeFilter !== "all" && taskType !== taskTypeFilter) {
        return false;
      }

      if (
        dateFilter === "recent" &&
        !isWithinRecentWindow(session.completedAt || session.date)
      ) {
        return false;
      }

      return true;
    });
  }, [completedSessions, subjectFilter, taskTypeFilter, dateFilter]);

  const totalXpEarned = useMemo(() => {
    const questXp = filteredQuests.reduce(
      (total, quest) => total + Number(quest.xp || 0),
      0
    );

    const sessionXp = filteredSessions.reduce(
      (total, session) => total + Number(session.xpEarned || 0),
      0
    );

    return questXp + sessionXp;
  }, [filteredQuests, filteredSessions]);

  const mostCompletedSubject = useMemo(() => {
    const counts = {};

    filteredQuests.forEach((quest) => {
      const subject = quest.subject || "General";
      counts[subject] = (counts[subject] || 0) + 1;
    });

    filteredSessions.forEach((session) => {
      const subject = session.subject || "General";
      counts[subject] = (counts[subject] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return null;
    }

    return { subject: entries[0][0], count: entries[0][1] };
  }, [filteredQuests, filteredSessions]);

  const totalCompletedRaw = completedQuests.length + completedSessions.length;
  const hasActiveFilters =
    subjectFilter !== "all" || taskTypeFilter !== "all" || dateFilter !== "all";

  function resetFilters() {
    setSubjectFilter("all");
    setTaskTypeFilter("all");
    setDateFilter("all");
  }

  const summaryStats = [
    { label: "Completed Tasks", value: filteredQuests.length },
    { label: "Completed Sessions", value: filteredSessions.length },
    { label: "XP Earned", value: totalXpEarned },
    {
      label: "Most Completed Subject",
      value: mostCompletedSubject ? mostCompletedSubject.subject : "—",
    },
  ];

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Completed Work</p>
            <h1>Study History 📚</h1>

            <p>A record of everything you've completed.</p>
          </div>
        </div>

        {loading && (
          <section className="empty-state-card">
            <h2>Loading Study History...</h2>
            <p>IPlan is checking your completed work.</p>
          </section>
        )}

        {!loading && errorMessage && (
          <section className="empty-state-card">
            <h2>Something went wrong</h2>
            <p>{errorMessage}</p>
          </section>
        )}

        {!loading && !errorMessage && totalCompletedRaw === 0 && (
          <section className="empty-state-card">
            <h2>No completed work yet</h2>

            <p>
              Complete your first focus session or quest and it will show up
              here as a record of real progress.
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "18px" }}
              onClick={() => setPage("dashboard")}
            >
              Go to Dashboard
            </button>
          </section>
        )}

        {!loading && !errorMessage && totalCompletedRaw > 0 && (
          <>
            <section className="analytics-overview-grid">
              {summaryStats.map((stat) => (
                <div className="analytics-stat-tile" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </section>

            <section className="analytics-card history-filter-card">
              <h2>Filters</h2>

              <div className="history-filter-row">
                <div className="form-group">
                  <label>Subject</label>
                  <select
                    value={subjectFilter}
                    onChange={(event) => setSubjectFilter(event.target.value)}
                  >
                    <option value="all">All Subjects</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Task Type</label>
                  <select
                    value={taskTypeFilter}
                    onChange={(event) => setTaskTypeFilter(event.target.value)}
                  >
                    <option value="all">All Task Types</option>
                    {taskTypeOptions.map((taskType) => (
                      <option key={taskType} value={taskType}>
                        {taskType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Time Range</label>
                  <div className="google-calendar-view-toggle">
                    <button
                      type="button"
                      className={dateFilter === "all" ? "active" : ""}
                      onClick={() => setDateFilter("all")}
                    >
                      All Time
                    </button>

                    <button
                      type="button"
                      className={dateFilter === "recent" ? "active" : ""}
                      onClick={() => setDateFilter("recent")}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="secondary-btn history-reset-btn"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </section>

            {filteredQuests.length === 0 && filteredSessions.length === 0 ? (
              <section className="empty-state-card">
                <h2>No completed work matches these filters</h2>
                <p>Try a different subject, task type, or time range.</p>
              </section>
            ) : (
              <>
                {filteredQuests.length > 0 && (
                  <>
                    <h2 className="section-title">Completed Quests</h2>

                    <div className="history-grid">
                      {filteredQuests.map((quest, index) => (
                        <article
                          key={quest.id || quest.completedId || index}
                          className="history-card"
                        >
                          <div className="history-card-main">
                            <h3>{quest.title || quest.name || "Completed Quest"}</h3>
                            <p>Hover to view details</p>
                          </div>

                          <div className="history-details">
                            <p>
                              Subject:{" "}
                              <strong>{quest.subject || "No subject saved"}</strong>
                            </p>

                            <p>
                              Task type:{" "}
                              <strong>{quest.taskType || "Not set"}</strong>
                            </p>

                            <p>
                              XP earned: <strong>{quest.xp || 0}</strong>
                            </p>

                            <p>
                              Completed:{" "}
                              <strong>
                                {formatDate(
                                  quest.completedAt ||
                                    quest.createdAt ||
                                    quest.date
                                )}
                              </strong>
                            </p>

                            <p>
                              Original due date:{" "}
                              <strong>
                                {quest.dueDate
                                  ? formatDate(quest.dueDate)
                                  : "No due date saved"}
                              </strong>
                            </p>

                            <p>
                              Source: <strong>{quest.source || "Manual"}</strong>
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}

                {filteredSessions.length > 0 && (
                  <>
                    <h2 className="section-title">Completed Study Sessions</h2>

                    <div className="history-grid">
                      {filteredSessions.map((session, index) => (
                        <article
                          key={session.id || index}
                          className="history-card"
                        >
                          <div className="history-card-main">
                            <h3>
                              {session.title || session.goal || "Completed Session"}
                            </h3>
                            <p>Hover to view details</p>
                          </div>

                          <div className="history-details">
                            <p>
                              Session:{" "}
                              <strong>
                                {session.title || "No session title saved"}
                              </strong>
                            </p>

                            <p>
                              Subject:{" "}
                              <strong>{session.subject || "No subject saved"}</strong>
                            </p>

                            <p>
                              Task type:{" "}
                              <strong>{session.taskType || "Not set"}</strong>
                            </p>

                            <p>
                              Completed:{" "}
                              <strong>
                                {formatDate(session.completedAt || session.date)}
                              </strong>
                            </p>

                            <p>
                              Duration:{" "}
                              <strong>
                                {session.duration || "No duration saved"}
                              </strong>
                            </p>

                            {session.focus && (
                              <p>
                                Focus: <strong>{session.focus}</strong>
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default History;
