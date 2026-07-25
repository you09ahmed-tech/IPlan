import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";

const STUDY_PREFERENCES_KEY = "iplanStudyPreferences";
const FOCUS_TASK_KEY = "iplanFocusTask";
const CHAT_HISTORY_KEY = "iplanPlanningChatMessages";
const VACATION_DRAFT_KEY = "iplanVacationModeDraft";

const modeDetails = {
  minimalist: {
    title: "Minimalist",
    description:
      "A clean, distraction-free workspace for focused planning and studying.",
  },
  gamer: {
    title: "Gamer",
    description:
      "A darker, energetic interface built around progress, XP, and motivation.",
  },
  academic: {
    title: "Academic",
    description:
      "A warm study-focused theme that feels closer to notebooks, libraries, and school work.",
  },
};

function loadStudyPreferences() {
  try {
    const saved = localStorage.getItem(STUDY_PREFERENCES_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error loading study preferences:", error);
    return null;
  }
}

function Settings({ setPage, mode, setMode, user }) {
  const savedPreferences = loadStudyPreferences();

  const [defaultFocusMinutes, setDefaultFocusMinutes] = useState(
    savedPreferences?.defaultFocusMinutes || "25"
  );
  const [preferredStartTime, setPreferredStartTime] = useState(
    savedPreferences?.preferredStartTime || "10:00"
  );
  const [weekendAvailable, setWeekendAvailable] = useState(
    savedPreferences?.weekendAvailable !== undefined
      ? savedPreferences.weekendAvailable
      : true
  );
  const [defaultIntensity, setDefaultIntensity] = useState(
    savedPreferences?.defaultIntensity || "Balanced"
  );

  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const preferencesToSave = {
      defaultFocusMinutes,
      preferredStartTime,
      weekendAvailable,
      defaultIntensity,
    };

    localStorage.setItem(
      STUDY_PREFERENCES_KEY,
      JSON.stringify(preferencesToSave)
    );
  }, [defaultFocusMinutes, preferredStartTime, weekendAvailable, defaultIntensity]);

  function handleModeChange(newMode) {
    setMode(newMode);
  }

  function handleClearFocusTask() {
    const confirmed = window.confirm(
      "Clear your current focus task? This only removes the link on Focus Mode — it does not delete or complete the task itself."
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(FOCUS_TASK_KEY);
    setStatusMessage("Current focus task cleared.");
  }

  function handleResetLocalStats() {
    const confirmed = window.confirm(
      "Reset today's focus minutes back to zero? This only affects the Daily Goals counter on your Dashboard — your actual completed quests, sessions, and lifetime Focus City progress are not affected."
    );

    if (!confirmed) {
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    localStorage.setItem(
      "iplanFocusMinutesToday",
      JSON.stringify({ date: `${year}-${month}-${day}`, minutes: 0 })
    );

    setStatusMessage("Today's focus minutes reset to zero.");
  }

  function handleClearChatHistory() {
    const confirmed = window.confirm(
      "Clear your AI Assistant planning chat history? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(CHAT_HISTORY_KEY);
    setStatusMessage("AI Assistant chat history cleared.");
  }

  function handleClearVacationDraft() {
    const confirmed = window.confirm(
      "Clear your saved Vacation Mode form and generated plan draft? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(VACATION_DRAFT_KEY);
    setStatusMessage("Vacation Mode draft cleared.");
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Preferences</p>
            <h1>Settings ⚙️</h1>

            <p>
              Manage your account, appearance, study preferences, and local
              data.
            </p>
          </div>
        </div>

        <section className="subject-card">
          <h2>Account</h2>

          <div className="settings-account-grid">
            <div>
              <span>App</span>
              <strong>IPlan</strong>
            </div>

            <div>
              <span>Signed in as</span>
              <strong>{user?.email || "Not available"}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Local beta / testing mode</strong>
            </div>
          </div>

          <p style={{ marginTop: "16px" }}>
            Your progress, XP, streak, quests, calendar sessions, and
            selected mode are saved to your IPlan account in Firestore.
          </p>
        </section>

        <section className="subject-card" style={{ marginTop: "24px" }}>
          <h2>Appearance</h2>

          <p style={{ marginTop: "10px" }}>
            Switch between different visual styles depending on how you want
            IPlan to feel.
          </p>

          <div className="mode-grid">
            {Object.keys(modeDetails).map((modeKey) => (
              <button
                type="button"
                key={modeKey}
                onClick={() => handleModeChange(modeKey)}
                className={
                  mode === modeKey ? "mode-option active" : "mode-option"
                }
              >
                <h3>{modeDetails[modeKey].title}</h3>

                <p>{modeDetails[modeKey].description}</p>

                <p style={{ marginTop: "15px", fontWeight: "800" }}>
                  {mode === modeKey ? "Selected" : "Choose this mode"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="breakdown-input-card" style={{ marginTop: "24px" }}>
          <div className="breakdown-input-intro">
            <h2>Study Preferences</h2>

            <p>
              These defaults are used to prefill Focus Mode and Vacation
              Mode so you don't have to re-enter them every time.
            </p>
          </div>

          <div className="breakdown-form-grid">
            <div className="form-group">
              <label>Default focus duration</label>
              <select
                value={defaultFocusMinutes}
                onChange={(event) => setDefaultFocusMinutes(event.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="25">25 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
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
              <label>Default intensity</label>
              <select
                value={defaultIntensity}
                onChange={(event) => setDefaultIntensity(event.target.value)}
              >
                <option>Light</option>
                <option>Balanced</option>
                <option>Intense</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Weekend availability</label>
              <div className="google-calendar-view-toggle">
                <button
                  type="button"
                  className={weekendAvailable ? "active" : ""}
                  onClick={() => setWeekendAvailable(true)}
                >
                  Available on weekends
                </button>

                <button
                  type="button"
                  className={!weekendAvailable ? "active" : ""}
                  onClick={() => setWeekendAvailable(false)}
                >
                  Prefer rest on weekends
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="subject-card danger-zone-card" style={{ marginTop: "24px" }}>
          <p className="eyebrow settings-danger-eyebrow">Danger Zone</p>
          <h2>Data Controls</h2>

          <p style={{ marginTop: "10px" }}>
            These actions only affect local device data or draft state. Your
            saved tasks, sessions, subjects, and completed history in
            Firestore are never touched by these buttons.
          </p>

          <div className="settings-danger-row">
            <div>
              <strong>Clear active focus task</strong>
              <p>
                Removes the task currently linked to Focus Mode. Does not
                delete or complete the task itself.
              </p>
            </div>

            <button type="button" className="danger-btn" onClick={handleClearFocusTask}>
              Clear
            </button>
          </div>

          <div className="settings-danger-row">
            <div>
              <strong>Reset today's focus minutes</strong>
              <p>
                Resets today's focus minutes shown in Daily Goals back to
                zero. Quests completed today update automatically at
                midnight, so there's nothing to reset there.
              </p>
            </div>

            <button type="button" className="danger-btn" onClick={handleResetLocalStats}>
              Reset
            </button>
          </div>

          <div className="settings-danger-row">
            <div>
              <strong>Clear AI Assistant chat history</strong>
              <p>
                Removes your saved planning chat conversation. Any tasks or
                plans you already tracked or saved from it are not affected.
              </p>
            </div>

            <button type="button" className="danger-btn" onClick={handleClearChatHistory}>
              Clear
            </button>
          </div>

          <div className="settings-danger-row">
            <div>
              <strong>Clear Vacation Mode draft</strong>
              <p>
                Removes your saved Vacation Mode form and generated plan
                draft. Plans you already saved or scheduled are not affected.
              </p>
            </div>

            <button
              type="button"
              className="danger-btn"
              onClick={handleClearVacationDraft}
            >
              Clear
            </button>
          </div>

          {statusMessage && (
            <p className="settings-status-note">{statusMessage}</p>
          )}
        </section>

        <section className="subject-card" style={{ marginTop: "24px" }}>
          <h2>About IPlan</h2>

          <p style={{ marginTop: "10px" }}>
            IPlan is currently in beta. Features, layouts, and planning logic
            may change as the app evolves.
          </p>

          <p style={{ marginTop: "10px" }}>
            The AI Assistant, AI Breakdown Planner, and Vacation Mode all use
            built-in, rule-based planning logic based on IB task types,
            subjects, stages, and deadlines. They are not connected to a live
            AI model right now, so they will not write your IA, EE, or
            essays for you.
          </p>
        </section>
      </main>
    </div>
  );
}

export default Settings;
