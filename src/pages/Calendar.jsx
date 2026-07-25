import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";

import {
  loadStudySessions,
  updateStudySession,
  deleteStudySession,
} from "../firebase/sessions";

import { auth } from "../firebase/config";

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayHours = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

function Calendar({ setPage }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedSession, setSelectedSession] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    duration: "",
    focus: "",
    tasks: "",
  });

  useEffect(() => {
    async function fetchSessions() {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await loadStudySessions(user.uid);
        setSessions(data || []);
      } catch (error) {
        console.error("Error loading calendar sessions:", error);
        alert("IPlan could not load your calendar sessions.");
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => (session.status || "planned") !== "archived");
  }, [sessions]);

  const sessionStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const planned = visibleSessions.filter(
      (session) => getSessionStatus(session) !== "completed"
    );

    const completed = visibleSessions.filter(
      (session) => getSessionStatus(session) === "completed"
    );

    const overdue = planned.filter((session) => {
      if (!session.date) {
        return false;
      }

      const sessionDate = new Date(`${session.date}T00:00:00`);
      return sessionDate < today;
    });

    return {
      planned: planned.length,
      completed: completed.length,
      overdue: overdue.length,
    };
  }, [visibleSessions]);

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getTodayKey() {
    return formatDateKey(new Date());
  }

  function getCurrentDateKey() {
    return formatDateKey(currentDate);
  }

  function getSessionTitle(session) {
    return (
      session.title ||
      session.goal ||
      session.taskTitle ||
      session.task ||
      "Untitled study session"
    );
  }

  function getSessionGoal(session) {
    return (
      session.goal ||
      session.focus ||
      session.successCondition ||
      "Complete this planned study session."
    );
  }

  function getSessionTasks(session) {
    if (Array.isArray(session.tasks)) {
      return session.tasks;
    }

    if (Array.isArray(session.subtasks)) {
      return session.subtasks;
    }

    if (session.focus) {
      return [session.focus];
    }

    return [];
  }

  function getSessionStatus(session) {
    return session.status || "planned";
  }

  function parseDurationToMinutes(duration) {
    if (!duration) {
      return 45;
    }

    const match = String(duration).match(/\d+/);

    if (!match) {
      return 45;
    }

    return Number(match[0]);
  }

  function getSessionDurationMinutes(session) {
    if (session.durationMinutes) {
      return Number(session.durationMinutes);
    }

    if (session.estimatedMinutes) {
      return Number(session.estimatedMinutes);
    }

    if (session.duration) {
      return parseDurationToMinutes(session.duration);
    }

    return 45;
  }

  function getSessionDuration(session) {
    return `${getSessionDurationMinutes(session)} minutes`;
  }

  function parseTimeToMinutes(timeValue) {
    if (!timeValue) {
      return null;
    }

    const rawTime = String(timeValue).trim().toUpperCase();

    const twelveHourMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

    if (twelveHourMatch) {
      let hour = Number(twelveHourMatch[1]);
      const minute = Number(twelveHourMatch[2]);
      const period = twelveHourMatch[3];

      if (period === "PM" && hour !== 12) {
        hour += 12;
      }

      if (period === "AM" && hour === 12) {
        hour = 0;
      }

      return hour * 60 + minute;
    }

    const twentyFourHourMatch = rawTime.match(/^(\d{1,2}):(\d{2})$/);

    if (twentyFourHourMatch) {
      const hour = Number(twentyFourHourMatch[1]);
      const minute = Number(twentyFourHourMatch[2]);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }

      return hour * 60 + minute;
    }

    return null;
  }

  function getSessionHourKey(session) {
    const minutes = parseTimeToMinutes(session.time);

    if (minutes === null) {
      return "unscheduled";
    }

    const hour = Math.floor(minutes / 60);

    return `${String(hour).padStart(2, "0")}:00`;
  }

  function getSessionSortValue(session) {
    const minutes = parseTimeToMinutes(session.time);

    if (minutes === null) {
      return 9999;
    }

    return minutes;
  }

  function formatHourLabel(hour) {
    const [hourString] = hour.split(":");
    const hourNumber = Number(hourString);

    if (hourNumber === 0) {
      return "12 AM";
    }

    if (hourNumber < 12) {
      return `${hourNumber} AM`;
    }

    if (hourNumber === 12) {
      return "12 PM";
    }

    return `${hourNumber - 12} PM`;
  }

  function formatSessionDate(dateString) {
    if (!dateString) {
      return "No date";
    }

    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isOverdue(session) {
    const status = getSessionStatus(session);

    if (!session.date || status === "completed" || status === "archived") {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDate = new Date(`${session.date}T00:00:00`);

    return sessionDate < today;
  }

  function getSessionsForDate(dateKey) {
    return visibleSessions
      .filter((session) => session.date === dateKey)
      .sort((a, b) => getSessionSortValue(a) - getSessionSortValue(b));
  }

  function getMonthGridDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstOfMonth = new Date(year, month, 1);
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

  function openDay(date) {
    setCurrentDate(new Date(date));
    setViewMode("day");
    setSelectedSession(null);
    setEditingSessionId(null);
  }

  function startEditing(session) {
    const tasks = getSessionTasks(session);

    setEditingSessionId(session.id);

    setEditForm({
      date: session.date || "",
      time: session.time || "16:00",
      duration: getSessionDuration(session),
      focus: session.focus || getSessionGoal(session),
      tasks: tasks.join(", "),
    });
  }

  function cancelEditing() {
    setEditingSessionId(null);

    setEditForm({
      date: "",
      time: "",
      duration: "",
      focus: "",
      tasks: "",
    });
  }

  async function saveEditedSession(session) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const durationMinutes = parseDurationToMinutes(editForm.duration);

    const updatedSession = {
      date: editForm.date,
      time: editForm.time,
      duration: `${durationMinutes} minutes`,
      durationMinutes,
      focus: editForm.focus,
      tasks: editForm.tasks
        .split(",")
        .map((task) => task.trim())
        .filter((task) => task !== ""),
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateStudySession(user.uid, session.id, updatedSession);

      const updatedSessions = sessions.map((currentSession) =>
        currentSession.id === session.id
          ? {
              ...currentSession,
              ...updatedSession,
            }
          : currentSession
      );

      setSessions(updatedSessions);

      setSelectedSession((currentSession) =>
        currentSession && currentSession.id === session.id
          ? {
              ...currentSession,
              ...updatedSession,
            }
          : currentSession
      );

      cancelEditing();
    } catch (error) {
      console.error("Error updating session:", error);
      alert("Something went wrong while saving this session.");
    }
  }

  async function completeSession(session) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const completedAt = new Date().toISOString();

    try {
      await updateStudySession(user.uid, session.id, {
        status: "completed",
        completedAt,
      });

      const updatedSessions = sessions.map((currentSession) =>
        currentSession.id === session.id
          ? {
              ...currentSession,
              status: "completed",
              completedAt,
            }
          : currentSession
      );

      setSessions(updatedSessions);

      setSelectedSession((currentSession) =>
        currentSession && currentSession.id === session.id
          ? {
              ...currentSession,
              status: "completed",
              completedAt,
            }
          : currentSession
      );
    } catch (error) {
      console.error("Error completing session:", error);
      alert("Something went wrong while completing this session.");
    }
  }

  async function archiveSession(session) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const confirmArchive = window.confirm(
      "Archive this session? It will be removed from your calendar but not deleted."
    );

    if (!confirmArchive) {
      return;
    }

    try {
      await updateStudySession(user.uid, session.id, { status: "archived" });

      const updatedSessions = sessions.map((currentSession) =>
        currentSession.id === session.id
          ? { ...currentSession, status: "archived" }
          : currentSession
      );

      setSessions(updatedSessions);
      setSelectedSession(null);
      setEditingSessionId(null);
    } catch (error) {
      console.error("Error archiving session:", error);
      alert("Something went wrong while archiving this session.");
    }
  }

  async function deleteSession(session) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this session?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteStudySession(user.uid, session.id);

      const updatedSessions = sessions.filter(
        (currentSession) => currentSession.id !== session.id
      );

      setSessions(updatedSessions);
      setSelectedSession(null);
      setEditingSessionId(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Something went wrong while deleting this session.");
    }
  }

  function renderMonthView() {
    return (
      <>
        <div className="google-calendar-week-labels">
          {weekLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="google-month-grid">
          {getMonthGridDays().map(({ date, isCurrentMonth }) => {
            const dateKey = formatDateKey(date);
            const daySessions = getSessionsForDate(dateKey);
            const completedCount = daySessions.filter(
              (session) => getSessionStatus(session) === "completed"
            ).length;
            const overdueCount = daySessions.filter((session) =>
              isOverdue(session)
            ).length;

            return (
              <button
                key={dateKey}
                className={`google-month-day ${
                  isCurrentMonth ? "" : "muted"
                } ${dateKey === getTodayKey() ? "today" : ""} ${
                  daySessions.length > 0 ? "has-session" : ""
                }`}
                onClick={() => openDay(date)}
              >
                <div className="google-month-day-top">
                  <span>{date.getDate()}</span>

                  {dateKey === getTodayKey() && <strong>Today</strong>}
                </div>

                <div className="google-month-session-preview">
                  {daySessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className={`month-session-chip ${
                        getSessionStatus(session) === "completed"
                          ? "completed"
                          : isOverdue(session)
                          ? "overdue"
                          : "planned"
                      }`}
                    >
                      <span>{session.time || "No time"}</span>
                      {getSessionTitle(session)}
                    </div>
                  ))}

                  {daySessions.length > 3 && (
                    <p>+{daySessions.length - 3} more</p>
                  )}

                  {completedCount > 0 && (
                    <small>{completedCount} completed</small>
                  )}

                  {overdueCount > 0 && (
                    <small className="overdue-text">
                      {overdueCount} overdue
                    </small>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderWeekView() {
    return (
      <div className="google-week-grid">
        {getWeekDays().map(({ date }) => {
          const dateKey = formatDateKey(date);
          const daySessions = getSessionsForDate(dateKey);

          return (
            <button
              key={dateKey}
              className={`google-week-day ${
                dateKey === getTodayKey() ? "today" : ""
              }`}
              onClick={() => openDay(date)}
            >
              <span>
                {date.toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </span>

              <strong>{date.getDate()}</strong>

              <p>
                {daySessions.length} session
                {daySessions.length === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  function renderDayView() {
    const dateKey = getCurrentDateKey();
    const daySessions = getSessionsForDate(dateKey);

    const sessionsInVisibleHours = daySessions.filter((session) => {
      const hourKey = getSessionHourKey(session);
      return dayHours.includes(hourKey);
    });

    const unscheduledSessions = daySessions.filter((session) => {
      const hourKey = getSessionHourKey(session);
      return !dayHours.includes(hourKey);
    });

    return (
      <div className="google-day-view stable-day-view">
        <div className="google-day-header">
          <div>
            <p>
              {currentDate.toLocaleDateString(undefined, {
                weekday: "long",
              })}
            </p>

            <h2>{currentDate.getDate()}</h2>
          </div>

          <span>
            {daySessions.length} session
            {daySessions.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="google-day-agenda">
          {dayHours.map((hour) => {
            const hourSessions = sessionsInVisibleHours.filter((session) => {
              return getSessionHourKey(session) === hour;
            });

            return (
              <div className="google-day-hour-row" key={hour}>
                <div className="google-day-hour-label">
                  {formatHourLabel(hour)}
                </div>

                <div className="google-day-hour-content">
                  {hourSessions.length === 0 ? (
                    <div className="empty-hour-line"></div>
                  ) : (
                    hourSessions.map((session) => (
                      <button
                        key={session.id}
                        className={`google-day-session-card ${
                          getSessionStatus(session) === "completed"
                            ? "completed"
                            : isOverdue(session)
                            ? "overdue"
                            : "planned"
                        }`}
                        onClick={() => {
                          setSelectedSession(session);
                          setEditingSessionId(null);
                        }}
                      >
                        <strong>{getSessionTitle(session)}</strong>

                        <span>
                          {session.time || "No time"} •{" "}
                          {getSessionDuration(session)}
                        </span>

                        {session.subject && <small>{session.subject}</small>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {unscheduledSessions.length > 0 && (
            <div className="google-day-hour-row">
              <div className="google-day-hour-label">Other</div>

              <div className="google-day-hour-content">
                {unscheduledSessions.map((session) => (
                  <button
                    key={session.id}
                    className={`google-day-session-card ${
                      getSessionStatus(session) === "completed"
                        ? "completed"
                        : isOverdue(session)
                        ? "overdue"
                        : "planned"
                    }`}
                    onClick={() => {
                      setSelectedSession(session);
                      setEditingSessionId(null);
                    }}
                  >
                    <strong>{getSessionTitle(session)}</strong>

                    <span>
                      {session.time || "No time"} •{" "}
                      {getSessionDuration(session)}
                    </span>

                    {session.subject && <small>{session.subject}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard calendar-page">
      <Sidebar setPage={setPage} />

      <main className="main-content calendar-main">
        <div className="google-calendar-page-header">
          <div>
            <p className="eyebrow">Study Schedule</p>
            <h1>Calendar 📅</h1>

            <p>
              View your month, pick a day, and manage sessions in a clean daily
              schedule.
            </p>
          </div>

          <button type="button" onClick={() => setPage("breakdown")}>
            Plan New Task
          </button>
        </div>

        <section className="calendar-stats-row">
          <div>
            <span>{sessionStats.planned}</span>
            <p>Planned</p>
          </div>

          <div>
            <span>{sessionStats.completed}</span>
            <p>Completed</p>
          </div>

          <div className={sessionStats.overdue > 0 ? "danger-stat" : ""}>
            <span>{sessionStats.overdue}</span>
            <p>Overdue</p>
          </div>
        </section>

        <section className="google-calendar-shell">
          <div className="google-calendar-toolbar">
            <button type="button" onClick={goToday}>
              Today
            </button>

            <div className="google-calendar-nav">
              <button type="button" onClick={goPrevious}>
                ‹
              </button>

              <button type="button" onClick={goNext}>
                ›
              </button>
            </div>

            <h2>{getTitle()}</h2>

            <div className="google-calendar-view-toggle">
              <button
                type="button"
                className={viewMode === "month" ? "active" : ""}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>

              <button
                type="button"
                className={viewMode === "week" ? "active" : ""}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>

              <button
                type="button"
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
              {viewMode === "month" && renderMonthView()}
              {viewMode === "week" && renderWeekView()}
              {viewMode === "day" && renderDayView()}
            </>
          )}
        </section>

        {selectedSession && (
          <div className="calendar-modal-overlay">
            <div className="calendar-modal google-event-modal">
              <button
                className="calendar-modal-close"
                onClick={() => {
                  setSelectedSession(null);
                  setEditingSessionId(null);
                }}
              >
                ×
              </button>

              {editingSessionId === selectedSession.id ? (
                <>
                  <h2>Edit Session</h2>

                  <label>Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        date: event.target.value,
                      })
                    }
                    className="calendar-edit-input"
                  />

                  <label>Time</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        time: event.target.value,
                      })
                    }
                    className="calendar-edit-input"
                  />

                  <label>Duration</label>
                  <input
                    type="text"
                    value={editForm.duration}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        duration: event.target.value,
                      })
                    }
                    className="calendar-edit-input"
                  />

                  <label>Focus</label>
                  <textarea
                    value={editForm.focus}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        focus: event.target.value,
                      })
                    }
                    className="calendar-edit-textarea"
                  />

                  <label>Tasks separated by commas</label>
                  <textarea
                    value={editForm.tasks}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        tasks: event.target.value,
                      })
                    }
                    className="calendar-edit-textarea"
                  />

                  <div className="calendar-session-actions">
                    <button
                      className="complete-session-btn"
                      onClick={() => saveEditedSession(selectedSession)}
                    >
                      Save Changes
                    </button>

                    <button
                      className="delete-session-btn"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="session-type-label">
                    {selectedSession.taskType ||
                      selectedSession.source ||
                      "Study Session"}
                  </p>

                  <h2>{getSessionTitle(selectedSession)}</h2>

                  <p className="session-goal-text">
                    {getSessionGoal(selectedSession)}
                  </p>

                  <div className="event-detail-grid">
                    <div>
                      <span>Date</span>
                      <strong>
                        {formatSessionDate(selectedSession.date)}
                      </strong>
                    </div>

                    <div>
                      <span>Time</span>
                      <strong>{selectedSession.time || "No time"}</strong>
                    </div>

                    <div>
                      <span>Duration</span>
                      <strong>{getSessionDuration(selectedSession)}</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong
                        className={`event-status-value status-${
                          getSessionStatus(selectedSession) === "completed"
                            ? "completed"
                            : isOverdue(selectedSession)
                            ? "overdue"
                            : "planned"
                        }`}
                      >
                        {getSessionStatus(selectedSession) === "completed"
                          ? "Completed"
                          : isOverdue(selectedSession)
                          ? "Overdue"
                          : "Planned"}
                      </strong>
                    </div>
                  </div>

                  {selectedSession.subject && (
                    <p className="subject-line">
                      <strong>Subject:</strong> {selectedSession.subject}
                    </p>
                  )}

                  {selectedSession.meetingLink && (
                    <a
                      href={selectedSession.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open meeting link
                    </a>
                  )}

                  <h3>What to do</h3>

                  {getSessionTasks(selectedSession).length > 0 ? (
                    <ul className="session-task-list">
                      {getSessionTasks(selectedSession).map((task, index) => (
                        <li key={index}>{task}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-tasks-text">
                      No specific task list saved for this session.
                    </p>
                  )}

                  <div className="calendar-session-actions">
                    {getSessionStatus(selectedSession) !== "completed" && (
                      <button
                        className="complete-session-btn"
                        onClick={() => completeSession(selectedSession)}
                      >
                        ✓ Mark as Completed
                      </button>
                    )}

                    <button
                      className="complete-session-btn"
                      onClick={() => startEditing(selectedSession)}
                    >
                      Edit Session
                    </button>

                    {getSessionStatus(selectedSession) !== "completed" && (
                      <button
                        className="archive-session-btn"
                        onClick={() => archiveSession(selectedSession)}
                      >
                        Archive Session
                      </button>
                    )}

                    <button
                      className="delete-session-btn"
                      onClick={() => deleteSession(selectedSession)}
                    >
                      Delete Session
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Calendar;