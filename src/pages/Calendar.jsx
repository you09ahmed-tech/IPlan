import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { loadStudySessions, updateStudySession } from "../firebase/sessions";
import { auth } from "../firebase/config";

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Calendar({ setPage }) {
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function fetchSessions() {
      const data = await loadStudySessions(auth.currentUser.uid);

      setSessions(data);
      setLoading(false);
    }

    fetchSessions();
  }, []);

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function getSessionsForDate(dateKey) {
    return sessions.filter((session) => session.date === dateKey);
  }

  function getMonthGridDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);

    gridStart.setDate(firstOfMonth.getDate() - startOffset);

    const days = [];

    for (let index = 0; index < 42; index++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
      });
    }

    return days;
  }

  function getWeekDays() {
    const date = new Date(currentDate);
    const day = (date.getDay() + 6) % 7;
    const monday = new Date(date);

    monday.setDate(date.getDate() - day);

    return Array.from({ length: 7 }, (_, index) => {
      const weekDay = new Date(monday);

      weekDay.setDate(monday.getDate() + index);

      return {
        date: weekDay,
        isCurrentMonth: true,
      };
    });
  }

  function getVisibleDays() {
    if (viewMode === "day") {
      return [
        {
          date: currentDate,
          isCurrentMonth: true,
        },
      ];
    }

    if (viewMode === "week") {
      return getWeekDays();
    }

    return getMonthGridDays();
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrevious() {
    const newDate = new Date(currentDate);

    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    }

    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    }

    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    }

    setCurrentDate(newDate);
  }

  function goNext() {
    const newDate = new Date(currentDate);

    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    }

    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    }

    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    }

    setCurrentDate(newDate);
  }

  function getTitle() {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (viewMode === "week") {
      const firstDay = getWeekDays()[0].date;

      return `Week of ${firstDay.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return currentDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  async function completeSession(session) {
    await updateStudySession(auth.currentUser.uid, session.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    const updatedSessions = sessions.map((currentSession) =>
      currentSession.id === session.id
        ? {
            ...currentSession,
            status: "completed",
            completedAt: new Date().toISOString(),
          }
        : currentSession
    );

    setSessions(updatedSessions);

    if (selectedDate) {
      setSelectedDate({
        ...selectedDate,
        sessions: updatedSessions.filter(
          (updatedSession) => updatedSession.date === selectedDate.dateKey
        ),
      });
    }
  }

  return (
    <div className="dashboard calendar-page">
      <Sidebar setPage={setPage} />

      <main className="main-content calendar-main">
        <div className="calendar-header">
          <div>
            <h1>Calendar 📅</h1>
            <p>View and manage your study sessions.</p>
          </div>
        </div>

        <section className="calendar-shell">
          <div className="calendar-toolbar">
            <button onClick={goToday}>
              Today
            </button>

            <button onClick={goPrevious}>
              ‹
            </button>

            <button onClick={goNext}>
              ›
            </button>

            <h2>{getTitle()}</h2>

            <div className="calendar-view-toggle">
              <button
                className={viewMode === "month" ? "active" : ""}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>

              <button
                className={viewMode === "week" ? "active" : ""}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>

              <button
                className={viewMode === "day" ? "active" : ""}
                onClick={() => setViewMode("day")}
              >
                Day
              </button>
            </div>
          </div>

          {loading ? (
            <p className="calendar-loading">Loading calendar...</p>
          ) : (
            <>
              {viewMode === "month" && (
                <div className="calendar-week-labels">
                  {weekLabels.map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
              )}

              <div
                className={
                  viewMode === "month"
                    ? "calendar-grid month-grid"
                    : "calendar-grid compact-grid"
                }
              >
                {getVisibleDays().map(({ date, isCurrentMonth }) => {
                  const dateKey = formatDate(date);
                  const daySessions = getSessionsForDate(dateKey);
                  const completedCount = daySessions.filter(
                    (session) => session.status === "completed"
                  ).length;

                  return (
                    <button
                      key={dateKey}
                      className={`calendar-day ${
                        isCurrentMonth ? "" : "muted"
                      } ${daySessions.length > 0 ? "has-session" : ""}`}
                      onClick={() =>
                        setSelectedDate({
                          date,
                          dateKey,
                          sessions: daySessions,
                        })
                      }
                    >
                      <span className="calendar-day-number">
                        {date.getDate()}
                      </span>

                      {daySessions.length > 0 && (
                        <div className="calendar-day-meta">
                          <span className="session-dot"></span>
                          <span>
                            {daySessions.length} session
                            {daySessions.length > 1 ? "s" : ""}
                          </span>

                          {completedCount > 0 && (
                            <span className="completed-mini">
                              {completedCount} done
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <span>
                  <span className="legend-dot planned"></span>
                  Sessions scheduled
                </span>

                <span>
                  <span className="legend-dot completed"></span>
                  Sessions completed
                </span>
              </div>
            </>
          )}
        </section>

        <p className="calendar-footer-note">
          Stay consistent. Small steps every day lead to big results. 🧠
        </p>

        {selectedDate && (
          <div className="calendar-modal-overlay">
            <div className="calendar-modal">
              <button
                className="calendar-modal-close"
                onClick={() => setSelectedDate(null)}
              >
                ×
              </button>

              <h2>
                {selectedDate.date.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>

              <p>
                {selectedDate.sessions.length} session
                {selectedDate.sessions.length === 1 ? "" : "s"} scheduled
              </p>

              {selectedDate.sessions.length === 0 ? (
                <div className="calendar-empty-modal">
                  No study sessions scheduled for this day.
                </div>
              ) : (
                <div className="calendar-modal-list">
                  {selectedDate.sessions.map((session) => (
                    <div className="calendar-session-card" key={session.id}>
                      <div>
                        <h3>{session.title}</h3>
                        <p>{session.goal}</p>
                        <p>
                          {session.time} • {session.duration}
                        </p>
                      </div>

                      <span
                        className={
                          session.status === "completed"
                            ? "status-pill completed"
                            : "status-pill planned"
                        }
                      >
                        {session.status === "completed"
                          ? "Completed"
                          : "Planned"}
                      </span>

                      <h4>What to do</h4>

                      <ul>
                        {session.tasks.map((task, index) => (
                          <li key={index}>{task}</li>
                        ))}
                      </ul>

                      {session.status !== "completed" && (
                        <button
                          className="complete-session-btn"
                          onClick={() => completeSession(session)}
                        >
                          ✓ Mark as Completed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                className="calendar-close-btn"
                onClick={() => setSelectedDate(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Calendar;