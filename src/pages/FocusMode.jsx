import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import {
  loadFocusCityProgress,
  saveFocusCityProgress,
} from "../firebase/focusCity";
import { removeQuest } from "../firebase/quests";
import { saveCompletedQuest } from "../firebase/completedQuests";
import { updateStudySession } from "../firebase/sessions";

const DEFAULT_CITY_PROGRESS = {
  completedSessions: 0,
  totalFocusMinutes: 0,
  trees: 0,
  roads: 0,
  buildings: 0,
  lastRewardXp: 0,
};

const FOCUS_TASK_STORAGE_KEY = "iplanFocusTask";
const STUDY_PREFERENCES_KEY = "iplanStudyPreferences";
const DURATION_PRESETS = ["15", "25", "45", "60"];

function loadStoredFocusTask() {
  try {
    const savedTask = localStorage.getItem(FOCUS_TASK_STORAGE_KEY);
    return savedTask ? JSON.parse(savedTask) : null;
  } catch (error) {
    console.error("Error reading saved focus task:", error);
    return null;
  }
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultFocusMinutes() {
  try {
    const saved = localStorage.getItem(STUDY_PREFERENCES_KEY);
    const prefs = saved ? JSON.parse(saved) : null;
    const minutes = Number(prefs?.defaultFocusMinutes);

    return DURATION_PRESETS.includes(String(minutes)) ? minutes : 25;
  } catch (error) {
    console.error("Error reading study preferences:", error);
    return 25;
  }
}

function getPriorityBadgeClass(priority) {
  if (priority === "High") return "priority-high";
  if (priority === "Low") return "priority-low";
  return "priority-medium";
}

function getDifficultyBadgeClass(difficulty) {
  if (difficulty === "Hard") return "difficulty-hard";
  if (difficulty === "Easy") return "difficulty-easy";
  return "difficulty-medium";
}

function FocusMode({ setPage, xp, setXP, setStreak, quests, setQuests }) {
  const [focusItem, setFocusItem] = useState(loadStoredFocusTask);

  const [durationChoice, setDurationChoice] = useState(() => {
    const savedTask = loadStoredFocusTask();
    const minutes = Number(savedTask?.estimatedMinutes) || getDefaultFocusMinutes();
    return DURATION_PRESETS.includes(String(minutes)) ? String(minutes) : "custom";
  });

  const [customMinutes, setCustomMinutes] = useState(() => {
    const savedTask = loadStoredFocusTask();
    const minutes = Number(savedTask?.estimatedMinutes) || getDefaultFocusMinutes();
    return DURATION_PRESETS.includes(String(minutes)) ? "" : String(minutes);
  });

  const [focusStatus, setFocusStatus] = useState("ready");
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const savedTask = loadStoredFocusTask();
    const minutes = Number(savedTask?.estimatedMinutes) || getDefaultFocusMinutes();
    return minutes * 60;
  });
  const [cityProgress, setCityProgress] = useState(DEFAULT_CITY_PROGRESS);
  const [loadingCity, setLoadingCity] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [showCityModal, setShowCityModal] = useState(false);

  const selectedMinutes = useMemo(() => {
    if (durationChoice === "custom") {
      return Number(customMinutes || 0);
    }

    return Number(durationChoice);
  }, [durationChoice, customMinutes]);

  const progressPercent = useMemo(() => {
    const totalSeconds = selectedMinutes * 60;

    if (!totalSeconds) {
      return 0;
    }

    const completedSeconds = totalSeconds - secondsLeft;
    return Math.min(100, Math.max(0, (completedSeconds / totalSeconds) * 100));
  }, [selectedMinutes, secondsLeft]);

  useEffect(() => {
    if (!focusItem) {
      return;
    }

    setSecondsLeft(selectedMinutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadCity() {
      setLoadingCity(true);

      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setCityProgress(DEFAULT_CITY_PROGRESS);
          return;
        }

        const savedProgress = await loadFocusCityProgress(currentUser.uid);

        if (savedProgress) {
          setCityProgress({
            completedSessions: savedProgress.completedSessions || 0,
            totalFocusMinutes: savedProgress.totalFocusMinutes || 0,
            trees: savedProgress.trees || 0,
            roads: savedProgress.roads || 0,
            buildings: savedProgress.buildings || 0,
            lastRewardXp: savedProgress.lastRewardXp || 0,
          });
        }
      } catch (error) {
        console.error("Error loading Focus City:", error);
        alert("IPlan could not load your Focus City progress.");
      } finally {
        setLoadingCity(false);
      }
    }

    loadCity();
  }, []);

  useEffect(() => {
    if (focusStatus !== "active") {
      return;
    }

    if (secondsLeft <= 0) {
      completeFocusSession();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((currentSeconds) => currentSeconds - 1);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStatus, secondsLeft]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && focusStatus === "active") {
        failFocusSession(
          "Focus session ended because you switched tabs or left the page."
        );
      }
    }

    function handleBeforeUnload(event) {
      if (focusStatus === "active") {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [focusStatus]);

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  function getRewardXp(minutes) {
    return Math.max(10, Math.round(minutes));
  }

  function getNextCityPiece(minutes) {
    if (minutes <= 25) {
      return "tree";
    }

    if (minutes <= 50) {
      return "road";
    }

    return "building";
  }

  function startFocusSession() {
    if (!selectedMinutes || selectedMinutes <= 0) {
      alert("Please choose a valid focus duration.");
      return;
    }

    setSecondsLeft(selectedMinutes * 60);
    setFocusStatus("active");
    setSessionMessage(
      "Focus started. Stay on this page until the timer finishes."
    );
  }

  function failFocusSession(message) {
    setFocusStatus("failed");
    setSecondsLeft(selectedMinutes * 60);
    setSessionMessage(
      message ||
        "Focus session failed. Your previous city progress is safe, but this session did not add anything."
    );
  }

  function saveFocusMinutesLocally(minutes) {
    try {
      const previousMinutes = Number(
        JSON.parse(localStorage.getItem("focusMinutes") || "0")
      );

      localStorage.setItem(
        "focusMinutes",
        JSON.stringify(previousMinutes + minutes)
      );
    } catch (error) {
      console.error("Error saving focus minutes locally:", error);
    }
  }

  function saveTodayFocusMinutes(minutes) {
    try {
      const todayKey = getDateKey(new Date());
      const saved = localStorage.getItem("iplanFocusMinutesToday");
      const parsed = saved ? JSON.parse(saved) : null;

      const currentMinutes =
        parsed && parsed.date === todayKey ? Number(parsed.minutes) || 0 : 0;

      localStorage.setItem(
        "iplanFocusMinutesToday",
        JSON.stringify({ date: todayKey, minutes: currentMinutes + minutes })
      );
    } catch (error) {
      console.error("Error saving today's focus minutes:", error);
    }
  }

  function clearFocusTask() {
    localStorage.removeItem(FOCUS_TASK_STORAGE_KEY);
    setFocusItem(null);
  }

  async function completeLinkedQuest() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return " You must be logged in to complete the linked task.";
    }

    const confirmed = window.confirm(
      `Mark "${focusItem.title}" as fully complete? Choose Cancel if you only made progress and still want to work on it later.`
    );

    if (!confirmed) {
      return " Your linked task is still active on your Dashboard.";
    }

    const linkedQuest = (quests || []).find(
      (quest) => quest.id === focusItem.linkedId
    );

    if (!linkedQuest) {
      return " IPlan could not find the linked task, so it was not changed.";
    }

    try {
      await saveCompletedQuest(currentUser.uid, {
        ...linkedQuest,
        completed: true,
      });

      await removeQuest(currentUser.uid, linkedQuest.id);

      if (setQuests) {
        setQuests((currentQuests) =>
          (currentQuests || []).filter((quest) => quest.id !== linkedQuest.id)
        );
      }

      if (setStreak) {
        setStreak((currentStreak) => currentStreak + 1);
      }

      if (setXP && linkedQuest.xp) {
        setXP((currentXP) => currentXP + linkedQuest.xp);
      }

      clearFocusTask();

      return ` "${focusItem.title}" was marked complete on your Dashboard.`;
    } catch (error) {
      console.error("Error completing linked quest from Focus Mode:", error);
      return " Something went wrong while completing the linked task.";
    }
  }

  async function completeLinkedSession() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return " You must be logged in to update the linked session.";
    }

    try {
      await updateStudySession(currentUser.uid, focusItem.linkedId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      clearFocusTask();

      return ` "${focusItem.title}" was marked completed on your Calendar.`;
    } catch (error) {
      console.error("Error completing linked session from Focus Mode:", error);
      return " Something went wrong while updating the linked session.";
    }
  }

  async function completeFocusSession() {
    const rewardXp = getRewardXp(selectedMinutes);
    const nextSessionNumber = cityProgress.completedSessions + 1;
    const newPiece = getNextCityPiece(selectedMinutes);

    const updatedProgress = {
      ...cityProgress,
      completedSessions: nextSessionNumber,
      totalFocusMinutes: cityProgress.totalFocusMinutes + selectedMinutes,
      trees:
        newPiece === "tree"
          ? cityProgress.trees + 1
          : cityProgress.trees,
      roads:
        newPiece === "road"
          ? cityProgress.roads + 1
          : cityProgress.roads,
      buildings:
        newPiece === "building"
          ? cityProgress.buildings + 1
          : cityProgress.buildings,
      lastRewardXp: rewardXp,
    };

    try {
      if (auth.currentUser) {
        await saveFocusCityProgress(auth.currentUser.uid, updatedProgress);
      }

      setCityProgress(updatedProgress);
      saveFocusMinutesLocally(selectedMinutes);
      saveTodayFocusMinutes(selectedMinutes);

      if (setXP) {
        setXP((currentXP) => currentXP + rewardXp);
      }

      setFocusStatus("completed");
      setSecondsLeft(selectedMinutes * 60);

      let completionMessage = `Focus complete. You earned ${rewardXp} XP and added a ${newPiece} to your city.`;

      if (focusItem) {
        if (focusItem.sourceType === "quest") {
          completionMessage += await completeLinkedQuest();
        } else if (focusItem.sourceType === "session") {
          completionMessage += await completeLinkedSession();
        }
      }

      setSessionMessage(completionMessage);
    } catch (error) {
      console.error("Error saving Focus City progress:", error);
      alert("IPlan could not save your Focus City progress.");
    }
  }

  function resetSession() {
    setFocusStatus("ready");
    setSecondsLeft(selectedMinutes * 60);
    setSessionMessage("");
  }

  function renderCityTiles(large) {
    const tiles = [];
    const buildingSizes = ["short", "medium", "tall"];
    const buildingPalettes = ["a", "b", "c"];

    for (let index = 0; index < cityProgress.trees; index++) {
      const isPark = index % 4 === 3;
      tiles.push({ type: isPark ? "park" : "tree", key: `tree-${index}` });
    }

    for (let index = 0; index < cityProgress.roads; index++) {
      tiles.push({
        type: "road",
        variant: index % 3 === 2 ? "cross" : "straight",
        key: `road-${index}`,
      });
    }

    for (let index = 0; index < cityProgress.buildings; index++) {
      tiles.push({
        type: "building",
        size: buildingSizes[index % buildingSizes.length],
        palette: buildingPalettes[index % buildingPalettes.length],
        key: `building-${index}`,
      });
    }

    if (focusStatus === "active") {
      tiles.push({ type: "construction", key: "construction" });
    }

    if (tiles.length === 0) {
      return (
        <div className="city-empty-state">
          <div className="city-empty-seed" />
          <p>Complete your first focus session to start building.</p>
        </div>
      );
    }

    const limit = large ? 96 : 48;

    return tiles.slice(0, limit).map((tile) => (
      <div
        key={tile.key}
        className={`city-tile city-tile-${tile.type}${
          tile.size ? ` city-tile-${tile.size}` : ""
        }`}
      >
        {tile.type === "tree" && (
          <>
            <div className="city-tile-shadow" />
            <div className="city-tree">
              <div className="city-tree-canopy" />
              <div className="city-tree-trunk" />
            </div>
          </>
        )}

        {tile.type === "park" && (
          <>
            <div className="city-tile-shadow" />
            <div className="city-park">
              <div className="city-park-path" />
              <div className="city-tree city-tree-small city-tree-offset-a">
                <div className="city-tree-canopy" />
                <div className="city-tree-trunk" />
              </div>
              <div className="city-tree city-tree-small city-tree-offset-b">
                <div className="city-tree-canopy" />
                <div className="city-tree-trunk" />
              </div>
            </div>
          </>
        )}

        {tile.type === "road" && (
          <div
            className={`city-road${
              tile.variant === "cross" ? " city-road-cross" : ""
            }`}
          >
            <div className="city-road-line city-road-line-h" />
            {tile.variant === "cross" && (
              <div className="city-road-line city-road-line-v" />
            )}
          </div>
        )}

        {tile.type === "building" && (
          <>
            <div className="city-tile-shadow" />
            <div
              className={`city-building city-building-palette-${tile.palette}`}
            >
              <div className="city-building-roof" />
              <div className="city-building-body">
                <div className="city-building-window" />
                <div className="city-building-window" />
                <div className="city-building-window" />
                <div className="city-building-window" />
              </div>
            </div>
          </>
        )}

        {tile.type === "construction" && (
          <>
            <div className="city-construction-pattern" />
            <div className="city-crane">
              <div className="city-crane-mast" />
              <div className="city-crane-arm" />
            </div>
          </>
        )}
      </div>
    ));
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        {focusItem && (
          <section className="current-focus-card">
            <div className="current-focus-header">
              <div>
                <p className="eyebrow">Current Focus</p>
                <h2>{focusItem.title}</h2>

                <p className="priority-subject">
                  {focusItem.subject || "General"} • {focusItem.taskType || "Task"}
                </p>
              </div>

              <div className="task-badges">
                <span
                  className={`task-badge ${getPriorityBadgeClass(
                    focusItem.priority
                  )}`}
                >
                  {focusItem.priority || "Medium"} Priority
                </span>

                <span
                  className={`task-badge ${getDifficultyBadgeClass(
                    focusItem.difficulty
                  )}`}
                >
                  {focusItem.difficulty || "Medium"}
                </span>
              </div>
            </div>

            <div className="current-focus-meta">
              <div>
                <span>Estimated duration</span>
                <strong>
                  {focusItem.estimatedMinutes
                    ? `${focusItem.estimatedMinutes} minutes`
                    : focusItem.duration || "Not set"}
                </strong>
              </div>

              <div>
                <span>Source</span>
                <strong>
                  {focusItem.sourceType === "session"
                    ? "Calendar session"
                    : "Active task"}
                </strong>
              </div>
            </div>

            {focusItem.recommendedFirstStep && (
              <div className="priority-explanation-box">
                <h3>First recommended step</h3>
                <p>{focusItem.recommendedFirstStep}</p>
              </div>
            )}

            {focusItem.subtasks && focusItem.subtasks.length > 0 && (
              <div className="task-subtasks">
                <p>Steps for this focus session</p>
                <ul>
                  {focusItem.subtasks.map((subtask, index) => (
                    <li key={index}>{subtask}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="current-focus-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={clearFocusTask}
              >
                Clear Focus Task
              </button>
            </div>
          </section>
        )}

        <section className="xp-card">
          <p className="eyebrow">Deep Work</p>
          <h1>{focusItem ? "Focus Session" : "Focus City"}</h1>

          <p>
            {focusItem
              ? "Stay on this page until the timer finishes, or complete the session early once you have made real progress."
              : "Choose a focus duration, stay on this page, and build your city one completed session at a time."}
          </p>

          <div className="stats">
            <span>⭐ XP: {xp}</span>
            <span>🔥 Completed Sessions: {cityProgress.completedSessions}</span>
            <span>⏱️ Focus Minutes: {cityProgress.totalFocusMinutes}</span>
          </div>
        </section>

        <section className="focus-city-layout">
          <div className="focus-control-panel">
            <h2>Start Focus Session</h2>

            <p>
              If you switch tabs, leave this page, or close the tab, the active
              session resets. Your previous city progress stays saved.
            </p>

            <div className="focus-duration-grid">
              <button
                type="button"
                className={durationChoice === "15" ? "duration-option active" : "duration-option"}
                onClick={() => setDurationChoice("15")}
                disabled={focusStatus === "active"}
              >
                15 min
              </button>

              <button
                type="button"
                className={durationChoice === "25" ? "duration-option active" : "duration-option"}
                onClick={() => setDurationChoice("25")}
                disabled={focusStatus === "active"}
              >
                25 min
              </button>

              <button
                type="button"
                className={durationChoice === "45" ? "duration-option active" : "duration-option"}
                onClick={() => setDurationChoice("45")}
                disabled={focusStatus === "active"}
              >
                45 min
              </button>

              <button
                type="button"
                className={durationChoice === "60" ? "duration-option active" : "duration-option"}
                onClick={() => setDurationChoice("60")}
                disabled={focusStatus === "active"}
              >
                60 min
              </button>

              <button
                type="button"
                className={durationChoice === "custom" ? "duration-option active" : "duration-option"}
                onClick={() => setDurationChoice("custom")}
                disabled={focusStatus === "active"}
              >
                Custom
              </button>
            </div>

            {durationChoice === "custom" && (
              <input
                type="number"
                min="1"
                placeholder="Custom minutes"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
                disabled={focusStatus === "active"}
                className="focus-custom-input"
              />
            )}

            <div className="focus-timer-card">
              <p className="focus-status-label">
                {focusStatus === "ready" && "Ready"}
                {focusStatus === "active" && "Focus in progress"}
                {focusStatus === "completed" && "Session completed"}
                {focusStatus === "failed" && "Session reset"}
              </p>

              <h2>{formatTime(secondsLeft)}</h2>

              <div className="focus-progress-bar">
                <div style={{ width: `${progressPercent}%` }} />
              </div>

              {sessionMessage && (
                <p className="focus-session-message">{sessionMessage}</p>
              )}

              <div className="focus-actions">
                {focusStatus !== "active" && (
                  <button type="button" onClick={startFocusSession}>
                    Start Focus
                  </button>
                )}

                {focusStatus === "active" && (
                  <button type="button" onClick={completeFocusSession}>
                    Complete Focus Session
                  </button>
                )}

                {focusStatus === "active" && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() =>
                      failFocusSession(
                        "Focus session stopped manually. No new city progress was added."
                      )
                    }
                  >
                    Stop Session
                  </button>
                )}

                {(focusStatus === "completed" || focusStatus === "failed") && (
                  <button type="button" onClick={resetSession}>
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="focus-city-panel">
            <div className="focus-city-panel-header">
              <h2>Your Focus City</h2>

              {!loadingCity && cityProgress.completedSessions > 0 && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCityModal(true)}
                >
                  Expand City
                </button>
              )}
            </div>

            <p>Short sessions plant trees, medium ones lay roads, longer ones raise buildings.</p>

            {loadingCity ? (
              <div className="subject-card">
                <h3>Loading city...</h3>
              </div>
            ) : (
              <div className="city-grid">{renderCityTiles()}</div>
            )}

            <div className="city-stats-grid">
              <div>
                <strong>{cityProgress.trees}</strong>
                <span>Trees</span>
              </div>

              <div>
                <strong>{cityProgress.roads}</strong>
                <span>Roads</span>
              </div>

              <div>
                <strong>{cityProgress.buildings}</strong>
                <span>Buildings</span>
              </div>
            </div>
          </div>
        </section>

        {showCityModal && (
          <div
            className="calendar-modal-overlay"
            onClick={() => setShowCityModal(false)}
          >
            <div
              className="calendar-modal city-expand-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="calendar-modal-close"
                onClick={() => setShowCityModal(false)}
              >
                ×
              </button>

              <h2>Your Focus City</h2>
              <p>Every completed focus session adds something new.</p>

              <div className="city-grid city-grid-large">
                {renderCityTiles(true)}
              </div>

              <div className="city-stats-grid city-stats-grid-expanded">
                <div>
                  <strong>{cityProgress.trees}</strong>
                  <span>Trees</span>
                </div>

                <div>
                  <strong>{cityProgress.roads}</strong>
                  <span>Roads</span>
                </div>

                <div>
                  <strong>{cityProgress.buildings}</strong>
                  <span>Buildings</span>
                </div>

                <div>
                  <strong>{cityProgress.completedSessions}</strong>
                  <span>Sessions</span>
                </div>

                <div>
                  <strong>{cityProgress.totalFocusMinutes}</strong>
                  <span>Minutes</span>
                </div>
              </div>

              <button
                type="button"
                className="calendar-close-btn"
                onClick={() => setShowCityModal(false)}
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

export default FocusMode;
