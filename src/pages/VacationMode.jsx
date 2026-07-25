import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import { loadSubjects } from "../firebase/subjects";
import { savePlan } from "../firebase/plans";
import { saveStudySession } from "../firebase/sessions";

const DRAFT_KEY = "iplanVacationModeDraft";
const MAX_RANGE_DAYS = 120;
const LONG_RANGE_WARNING_DAYS = 60;
const HIGH_SESSION_COUNT_WARNING = 60;
const BREAK_MINUTES = 15;

const WEEK_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const SUBJECT_KEYWORDS = [
  { subject: "Biology", keywords: ["biology", "bio"] },
  { subject: "Chemistry", keywords: ["chemistry", "chem"] },
  { subject: "Physics", keywords: ["physics"] },
  { subject: "Mathematics", keywords: ["math", "maths"] },
  { subject: "English", keywords: ["english"] },
  { subject: "Business Management", keywords: ["business"] },
  { subject: "Economics", keywords: ["economics", "econ"] },
  { subject: "History", keywords: ["history"] },
  { subject: "Psychology", keywords: ["psychology", "psych"] },
  { subject: "Computer Science", keywords: ["computer science", "programming", "cs "] },
];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function detectSubjectForTask(taskLine, savedSubjects) {
  const lower = taskLine.toLowerCase();

  const matchedSaved = (savedSubjects || []).find(
    (subject) => subject.name && lower.includes(subject.name.toLowerCase())
  );

  if (matchedSaved) {
    return matchedSaved.name;
  }

  const matchedKeyword = SUBJECT_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword))
  );

  return matchedKeyword ? matchedKeyword.subject : "General";
}

function isPriorityTask(taskLine, deadlineNotes) {
  if (!deadlineNotes || !deadlineNotes.trim()) {
    return false;
  }

  const lowerNotes = deadlineNotes.toLowerCase();
  const lowerTask = taskLine.toLowerCase();

  return lowerTask
    .split(/\s+/)
    .some((word) => word.length > 4 && lowerNotes.includes(word));
}

function parseTaskLines(tasksText) {
  return tasksText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function getDateRangeDays(startDate, endDate, restDays) {
  const days = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayName = cursor.toLocaleDateString(undefined, { weekday: "long" });

    days.push({
      date: formatDateKey(cursor),
      dayName,
      isRestDay: restDays.includes(dayName),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getSessionLengthRange(intensity) {
  if (intensity === "Light") return { min: 30, max: 45 };
  if (intensity === "Intense") return { min: 60, max: 75 };
  return { min: 45, max: 60 };
}

function getMaxSessionsPerDay(intensity) {
  if (intensity === "Light") return 2;
  if (intensity === "Intense") return 4;
  return 3;
}

function buildSessionPlanForDay(hoursPerDay, intensity, isLongRange) {
  const range = getSessionLengthRange(intensity);
  const availableMinutes = Math.round(hoursPerDay * 60);
  const idealSessionLength = Math.round((range.min + range.max) / 2);

  if (availableMinutes <= 0) {
    return { sessionMinutes: 0, sessionsCount: 0 };
  }

  if (availableMinutes < range.min) {
    return { sessionMinutes: Math.max(15, availableMinutes), sessionsCount: 1 };
  }

  // Long ranges stay lighter on purpose — one focused session per study day
  // instead of stacking multiple, so the plan doesn't balloon into hundreds
  // of sessions.
  const maxSessions = isLongRange ? 1 : getMaxSessionsPerDay(intensity);
  const sessionsCount = Math.min(
    maxSessions,
    Math.max(1, Math.floor(availableMinutes / idealSessionLength))
  );

  return { sessionMinutes: idealSessionLength, sessionsCount };
}

function addMinutesToTime(timeString, minutesToAdd) {
  const [hours, minutes] = (timeString || "10:00").split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const newHours = Math.floor(wrapped / 60);
  const newMinutes = wrapped % 60;

  return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
}

function buildRecoveryAdvice(intensity, hoursPerDay, restDaysCount, isLongRange) {
  const messages = [];

  if (isLongRange) {
    messages.push(
      "Long plans are harder to follow, so IPlan scheduled one lighter session per study day instead of stacking multiple sessions and overloading every day."
    );
  }

  if (hoursPerDay >= 6) {
    messages.push(
      "6 or more hours a day is a lot to sustain during a break. Consider lowering your available hours so you have real energy left for rest."
    );
  } else if (hoursPerDay >= 4 && intensity === "Intense") {
    messages.push(
      "This combines high hours with Intense mode. Make sure the gaps between sessions are real breaks, not just time on paper."
    );
  }

  if (restDaysCount === 0) {
    messages.push(
      "You haven't set aside any rest days. Even one full rest day during this period will help you actually sustain the plan."
    );
  }

  if (intensity === "Light") {
    messages.push(
      "This is a light plan. It won't cover everything quickly, but it is realistic and easier to actually stick to."
    );
  } else if (intensity === "Balanced") {
    messages.push(
      "This is a balanced plan. Stick to the session lengths above rather than trying to push through extra work in one sitting."
    );
  } else {
    messages.push(
      "This is an intense plan. Treat the rest days and gaps between sessions as required, not optional."
    );
  }

  messages.push(
    "Missing a session does not break this plan. If you fall behind, just continue with the next scheduled session — you don't need to catch up all at once."
  );

  return messages;
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error loading vacation mode draft:", error);
    return null;
  }
}

function loadStudyPreferences() {
  try {
    const saved = localStorage.getItem("iplanStudyPreferences");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error reading study preferences:", error);
    return null;
  }
}

function VacationMode({ setPage }) {
  const draft = loadDraft();
  const studyPreferences = draft ? null : loadStudyPreferences();

  const [savedSubjects, setSavedSubjects] = useState([]);

  const [planName, setPlanName] = useState(draft?.planName || "");
  const [startDate, setStartDate] = useState(draft?.startDate || "");
  const [endDate, setEndDate] = useState(draft?.endDate || "");
  const [hoursPerDay, setHoursPerDay] = useState(draft?.hoursPerDay || "2");
  const [preferredStartTime, setPreferredStartTime] = useState(
    draft?.preferredStartTime || studyPreferences?.preferredStartTime || "10:00"
  );
  const [restDays, setRestDays] = useState(
    draft?.restDays ||
      (studyPreferences?.weekendAvailable === false ? ["Saturday", "Sunday"] : [])
  );
  const [intensity, setIntensity] = useState(
    draft?.intensity || studyPreferences?.defaultIntensity || "Balanced"
  );
  const [tasksText, setTasksText] = useState(draft?.tasksText || "");
  const [deadlineNotes, setDeadlineNotes] = useState(draft?.deadlineNotes || "");
  const [generatedPlan, setGeneratedPlan] = useState(draft?.generatedPlan || null);
  const [viewMode, setViewMode] = useState(draft?.viewMode || "compact");

  const [savingPlan, setSavingPlan] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  useEffect(() => {
    async function loadUserSubjects() {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      try {
        const subjects = await loadSubjects(user.uid);
        setSavedSubjects(subjects || []);
      } catch (error) {
        console.error("Error loading subjects for vacation mode:", error);
      }
    }

    loadUserSubjects();
  }, []);

  useEffect(() => {
    const draftToSave = {
      planName,
      startDate,
      endDate,
      hoursPerDay,
      preferredStartTime,
      restDays,
      intensity,
      tasksText,
      deadlineNotes,
      generatedPlan,
      viewMode,
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftToSave));
  }, [
    planName,
    startDate,
    endDate,
    hoursPerDay,
    preferredStartTime,
    restDays,
    intensity,
    tasksText,
    deadlineNotes,
    generatedPlan,
    viewMode,
  ]);

  function toggleRestDay(day) {
    setRestDays((current) =>
      current.includes(day)
        ? current.filter((existingDay) => existingDay !== day)
        : [...current, day]
    );
  }

  function generateCatchUpPlan() {
    if (!startDate || !endDate) {
      alert("Please choose a start date and an end date.");
      return;
    }

    if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      alert("The end date cannot be before the start date.");
      return;
    }

    const dayCount =
      Math.round(
        (new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    if (dayCount > MAX_RANGE_DAYS) {
      alert(
        `Please choose a shorter date range (${MAX_RANGE_DAYS} days or fewer) so this catch-up plan stays realistic.`
      );
      return;
    }

    const isLongRange = dayCount > LONG_RANGE_WARNING_DAYS;

    const hours = Number(hoursPerDay);

    if (!hours || hours < 0.5) {
      alert("Please enter a valid number of available hours per day (at least 0.5).");
      return;
    }

    const taskLines = parseTaskLines(tasksText);

    if (taskLines.length === 0) {
      alert("Please add at least one task or subject to catch up on.");
      return;
    }

    if (restDays.length >= 7) {
      alert("You have selected every day as a rest day. Please leave at least one study day.");
      return;
    }

    const rangeDays = getDateRangeDays(startDate, endDate, restDays);
    const studyDays = rangeDays.filter((day) => !day.isRestDay);

    if (studyDays.length === 0) {
      alert(
        "There are no available study days in this date range with the rest days you selected. Please adjust your dates or rest days."
      );
      return;
    }

    const tasks = taskLines.map((line) => ({
      title: line,
      subject: detectSubjectForTask(line, savedSubjects),
      isPriority: isPriorityTask(line, deadlineNotes),
    }));

    const sortedTasks = [...tasks].sort(
      (a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)
    );

    let slotIndex = 0;

    const dailyPlan = rangeDays.map((day) => {
      if (day.isRestDay) {
        return { ...day, sessions: [], totalMinutes: 0 };
      }

      const { sessionMinutes, sessionsCount } = buildSessionPlanForDay(
        hours,
        intensity,
        isLongRange
      );
      const sessions = [];
      let currentTime = preferredStartTime || "10:00";

      for (let index = 0; index < sessionsCount; index++) {
        const task = sortedTasks[slotIndex % sortedTasks.length];
        slotIndex++;

        sessions.push({
          title: `${task.subject}: ${task.title}`,
          goal: task.title,
          subject: task.subject,
          taskType: "Vacation Mode",
          date: day.date,
          time: currentTime,
          duration: `${sessionMinutes} minutes`,
          durationMinutes: sessionMinutes,
          focus: `Make direct, focused progress on ${task.title}.`,
          tasks: [
            task.title,
            "Note down exactly where you stopped so the next session can pick up immediately.",
          ],
          source: "Vacation Mode",
          status: "planned",
        });

        currentTime = addMinutesToTime(currentTime, sessionMinutes + BREAK_MINUTES);
      }

      const totalMinutes = sessions.reduce(
        (sum, session) => sum + session.durationMinutes,
        0
      );

      return { ...day, sessions, totalMinutes };
    });

    const totalSessions = dailyPlan.reduce((sum, day) => sum + day.sessions.length, 0);
    const totalAvailableHours = Math.round(studyDays.length * hours * 10) / 10;
    const advice = buildRecoveryAdvice(intensity, hours, restDays.length, isLongRange);

    setGeneratedPlan({
      planName: planName.trim() || "Catch-up Plan",
      startDate,
      endDate,
      hoursPerDay: hours,
      preferredStartTime,
      restDays,
      intensity,
      tasks: taskLines,
      deadlineNotes,
      studyDaysCount: studyDays.length,
      totalAvailableHours,
      totalSessions,
      dailyPlan,
      advice,
      generatedAt: new Date().toISOString(),
    });
  }

  async function handleSaveToSavedPlans() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to save this plan.");
      return;
    }

    if (!generatedPlan) {
      return;
    }

    const allSessions = generatedPlan.dailyPlan.flatMap((day) => day.sessions);

    const planToSave = {
      title: generatedPlan.planName,
      goal: generatedPlan.planName,
      type: "Vacation Mode Plan",
      source: "Vacation Mode",
      startDate: generatedPlan.startDate,
      endDate: generatedPlan.endDate,
      intensity: generatedPlan.intensity,
      totalHours: generatedPlan.totalAvailableHours,
      sessions: allSessions,
      schedule: allSessions.map((session) => session.title),
      steps: generatedPlan.tasks,
      advice: generatedPlan.advice.join(" "),
      savedFrom: "Vacation Mode",
      savedAt: new Date().toISOString(),
    };

    try {
      setSavingPlan(true);
      await savePlan(currentUser.uid, planToSave);
      alert("Catch-up plan saved to Saved Plans.");
      setPage("plans");
    } catch (error) {
      console.error("Error saving vacation mode plan:", error);
      alert("Something went wrong while saving this plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleAddSessionsToCalendar() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to add sessions.");
      return;
    }

    if (!generatedPlan) {
      return;
    }

    const allSessions = generatedPlan.dailyPlan.flatMap((day) => day.sessions);

    if (allSessions.length === 0) {
      alert("There are no sessions to add yet. Generate a plan first.");
      return;
    }

    const highCountWarning =
      allSessions.length > HIGH_SESSION_COUNT_WARNING
        ? "That's a large number of sessions to schedule at once. "
        : "";

    const confirmed = window.confirm(
      `${highCountWarning}This will add ${allSessions.length} sessions to your Calendar between ${formatDisplayDate(
        generatedPlan.startDate
      )} and ${formatDisplayDate(generatedPlan.endDate)}. Continue?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setAddingToCalendar(true);

      for (const session of allSessions) {
        await saveStudySession(currentUser.uid, {
          title: session.title,
          goal: session.goal,
          subject: session.subject,
          taskType: "Vacation Mode",
          date: session.date,
          time: session.time,
          duration: session.duration,
          durationMinutes: session.durationMinutes,
          focus: session.focus,
          tasks: session.tasks,
          source: "Vacation Mode",
          status: "planned",
        });
      }

      alert("Catch-up sessions added to your Calendar.");
      setPage("calendar");
    } catch (error) {
      console.error("Error adding vacation mode sessions to calendar:", error);
      alert("Something went wrong while adding sessions to your Calendar.");
    } finally {
      setAddingToCalendar(false);
    }
  }

  function handleClearPlan() {
    const confirmed = window.confirm(
      "Clear this catch-up plan and form? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setPlanName("");
    setStartDate("");
    setEndDate("");
    setHoursPerDay("2");
    setPreferredStartTime("10:00");
    setRestDays([]);
    setIntensity("Balanced");
    setTasksText("");
    setDeadlineNotes("");
    setGeneratedPlan(null);
    setViewMode("compact");
    localStorage.removeItem(DRAFT_KEY);
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Catch-up Planner</p>
            <h1>Vacation Mode 🌴</h1>

            <p>
              A realistic recovery plan for holidays or catch-up weeks —
              rule-based, not live AI.
            </p>
          </div>
        </div>

        <section className="breakdown-input-card">
          <div className="breakdown-input-intro">
            <h2>Plan Details</h2>
          </div>

          <div className="breakdown-form-grid">
            <div className="form-group full-width">
              <label>Plan name</label>
              <input
                type="text"
                placeholder="July Chemistry IA catch-up"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Available hours per day</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={hoursPerDay}
                onChange={(event) => setHoursPerDay(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Preferred study start time</label>
              <input
                type="time"
                value={preferredStartTime}
                onChange={(event) => setPreferredStartTime(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Intensity</label>
              <select
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
              >
                <option>Light</option>
                <option>Balanced</option>
                <option>Intense</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Rest days (no sessions scheduled)</label>
              <div className="vacation-restday-grid">
                {WEEK_DAYS.map((day) => (
                  <button
                    type="button"
                    key={day}
                    className={
                      restDays.includes(day)
                        ? "duration-option active"
                        : "duration-option"
                    }
                    onClick={() => toggleRestDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Main subjects/tasks to catch up on (one per line)</label>
              <textarea
                placeholder={
                  "Chemistry IA conclusion\nMath revision: integration\nBusiness Management case study\nEnglish IO practice"
                }
                value={tasksText}
                onChange={(event) => setTasksText(event.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Optional deadline pressure notes</label>
              <textarea
                placeholder="Chemistry IA is due first. Math test is after vacation."
                value={deadlineNotes}
                onChange={(event) => setDeadlineNotes(event.target.value)}
              />
            </div>

            <div className="breakdown-actions full-width">
              <button type="button" onClick={generateCatchUpPlan}>
                Generate Catch-up Plan
              </button>
            </div>
          </div>
        </section>

        {!generatedPlan && (
          <section className="empty-state-card">
            <h2>No plan generated yet</h2>

            <p>
              Fill in the form above and click "Generate Catch-up Plan" to see
              a realistic day-by-day schedule here.
            </p>
          </section>
        )}

        {generatedPlan && (
          <>
            <section className="vacation-summary-grid">
              <div className="vacation-summary-tile">
                <span>Date Range</span>
                <strong>
                  {formatShortDate(generatedPlan.startDate)} →{" "}
                  {formatShortDate(generatedPlan.endDate)}
                </strong>
              </div>

              <div className="vacation-summary-tile">
                <span>Study Days</span>
                <strong>{generatedPlan.studyDaysCount}</strong>
              </div>

              <div className="vacation-summary-tile">
                <span>Total Hours</span>
                <strong>{generatedPlan.totalAvailableHours}h</strong>
              </div>

              <div className="vacation-summary-tile">
                <span>Sessions</span>
                <strong>{generatedPlan.totalSessions}</strong>
              </div>

              <div className="vacation-summary-tile">
                <span>Intensity</span>
                <strong>{generatedPlan.intensity}</strong>
              </div>
            </section>

            <section className="vacation-advice-card">
              <p className="eyebrow">Recovery Advice</p>

              {generatedPlan.advice.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </section>

            <div className="vacation-view-toggle-row">
              <h2 className="section-title">Daily Plan</h2>

              <div className="google-calendar-view-toggle">
                <button
                  type="button"
                  className={viewMode === "compact" ? "active" : ""}
                  onClick={() => setViewMode("compact")}
                >
                  Compact View
                </button>

                <button
                  type="button"
                  className={viewMode === "detailed" ? "active" : ""}
                  onClick={() => setViewMode("detailed")}
                >
                  Detailed View
                </button>
              </div>
            </div>

            <div className="vacation-timeline">
              {generatedPlan.dailyPlan.map((day) => (
                <div
                  className={`vacation-day-row ${day.isRestDay ? "rest-day" : ""}`}
                  key={day.date}
                >
                  <div className="vacation-day-row-header">
                    <div className="vacation-day-row-date">
                      <strong>{day.dayName}</strong>
                      <span>{formatShortDate(day.date)}</span>
                    </div>

                    <span
                      className={`vacation-day-badge ${day.isRestDay ? "rest" : ""}`}
                    >
                      {day.isRestDay ? "Rest Day" : `${day.totalMinutes} min`}
                    </span>
                  </div>

                  {!day.isRestDay && (
                    <div className="vacation-session-table">
                      {day.sessions.map((session, index) => (
                        <div className="vacation-session-line" key={index}>
                          <span className="vacation-session-line-time">
                            {session.time}
                          </span>

                          <span className="vacation-session-line-title">
                            {session.title}
                          </span>

                          <span className="vacation-session-line-duration">
                            {session.duration}
                          </span>

                          {viewMode === "detailed" && (
                            <span className="vacation-session-line-focus">
                              {session.focus}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="breakdown-action-row">
              <div className="plan-action-item">
                <button
                  type="button"
                  className="plan-action-button"
                  onClick={handleSaveToSavedPlans}
                  disabled={savingPlan}
                >
                  {savingPlan ? "Saving..." : "Save to Saved Plans"}
                </button>

                <p className="plan-action-description">
                  Keep this catch-up plan for later without scheduling it yet.
                </p>
              </div>

              <div className="plan-action-item">
                <button
                  type="button"
                  className="plan-action-button"
                  onClick={handleAddSessionsToCalendar}
                  disabled={addingToCalendar}
                >
                  {addingToCalendar ? "Adding..." : "Add Sessions to Calendar"}
                </button>

                <p className="plan-action-description">
                  Schedule every session above into your real Calendar.
                </p>
              </div>

              <div className="plan-action-item">
                <button
                  type="button"
                  className="plan-action-button"
                  onClick={handleClearPlan}
                >
                  Clear Plan
                </button>

                <p className="plan-action-description">
                  Remove this generated plan and start the form over.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default VacationMode;
