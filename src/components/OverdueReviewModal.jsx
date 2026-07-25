import { useState } from "react";

import { saveQuest, updateQuest } from "../firebase/quests";
import { updateStudySession } from "../firebase/sessions";

const REASON_OPTIONS = [
  { value: "urgent", label: "I was working on something more urgent" },
  { value: "busy", label: "My day was too busy" },
  { value: "not-important", label: "The task is no longer important" },
  { value: "due-date-changed", label: "The due date changed" },
  { value: "underestimated", label: "I underestimated how long it would take" },
  { value: "stuck", label: "I was stuck and did not know how to start" },
  { value: "procrastinated", label: "I procrastinated" },
  { value: "other", label: "Other" },
];

function getTodayDateString() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return today.toISOString().split("T")[0];
}

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setHours(12, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow.toISOString().split("T")[0];
}

function getRecommendation(kind, reason) {
  if (reason === "urgent") {
    return {
      headline: "This looks like a priority trade-off.",
      description:
        "Working on something more urgent is a normal part of managing a heavy IB workload. This does not mean the plan failed.",
      actionType:
        kind === "session" ? "reschedule-tomorrow" : "create-recovery-quest",
      actionSummary:
        kind === "session"
          ? "The safest next step is to reschedule this session to tomorrow at the same length."
          : "The safest next step is to keep this task active and add a short 20-minute recovery task for today.",
    };
  }

  if (reason === "busy") {
    return {
      headline: "This looks like a time overload issue.",
      description:
        "Your day did not have enough space for this task. Shrinking the next attempt makes it easier to actually start.",
      actionType:
        kind === "session" ? "reschedule-short" : "create-recovery-quest",
      actionSummary:
        kind === "session"
          ? "The safest next step is to reschedule this to tomorrow as a shorter 25-minute recovery session."
          : "The safest next step is to add a shorter 25-minute recovery task for today without changing your deadline.",
    };
  }

  if (reason === "not-important") {
    return {
      headline: "This task may no longer be relevant.",
      description:
        "If this is no longer worth your time, it should not keep pressuring you from your priority list.",
      actionType: kind === "session" ? "archive-session" : "archive-quest",
      actionSummary:
        kind === "session"
          ? "The safest next step is to archive this session so it stops showing as overdue."
          : "The safest next step is to archive this task. It will leave your active list but will not be deleted.",
      requiresConfirmCheckbox: true,
    };
  }

  if (reason === "due-date-changed") {
    return {
      headline: "This looks like a scheduling detail that needs updating.",
      description:
        "If the real deadline moved, IPlan should reflect that. Confirm the corrected date below before applying.",
      actionType:
        kind === "session" ? "change-session-date" : "change-due-date",
      actionSummary:
        kind === "session"
          ? "The safest next step is to update this session to the corrected date."
          : "The safest next step is to update the official due date for this task.",
      requiresDateInput: true,
      requiresConfirmCheckbox: true,
    };
  }

  if (reason === "underestimated") {
    return {
      headline: "This looks like a task clarity or sizing issue.",
      description:
        "Breaking the remaining work into smaller sessions usually makes a task feel far more manageable.",
      actionType: kind === "session" ? "reschedule-tomorrow" : "open-breakdown",
      actionSummary:
        kind === "session"
          ? "The safest next step is to reschedule this session to tomorrow, then use AI Breakdown Planner to split the remaining work."
          : "The safest next step is to open AI Breakdown Planner and split this task into smaller sessions.",
    };
  }

  if (reason === "stuck") {
    return {
      headline: "This looks like a task clarity issue.",
      description:
        "Starting is hard when the next step is not obvious. A structured breakdown usually fixes this quickly.",
      actionType: kind === "session" ? "reschedule-tomorrow" : "open-breakdown",
      actionSummary:
        kind === "session"
          ? "The safest next step is to reschedule this session to tomorrow, then open AI Breakdown Planner for a clear starting point."
          : "The safest next step is to open AI Breakdown Planner to turn this into a clear next step.",
    };
  }

  if (reason === "procrastinated") {
    return {
      headline: "This is a normal motivation dip, not a failure.",
      description:
        "The goal now is to lower the barrier to starting, not to catch up all at once. No guilt needed.",
      actionType:
        kind === "session" ? "reschedule-today-short" : "create-recovery-quest",
      actionSummary:
        kind === "session"
          ? "The safest next step is to reschedule this to a short 20-minute starter session today."
          : "The safest next step is to add a short 15 to 20 minute starter task for today.",
    };
  }

  return {
    headline: "This can be resolved with a simple next step.",
    description:
      "When the reason is unclear, the safest move is a small, low-pressure action rather than no action at all.",
    actionType:
      kind === "session" ? "reschedule-tomorrow" : "create-recovery-quest",
    actionSummary:
      kind === "session"
        ? "The safest next step is to reschedule this session to tomorrow."
        : "The safest next step is to add a short recovery task for today, or edit this task manually.",
  };
}

function formatItemDate(dateString) {
  if (!dateString) {
    return "No date set";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OverdueReviewModal({
  item,
  user,
  onClose,
  onQuestUpdated,
  onQuestCreated,
  onSessionUpdated,
  onNavigate,
}) {
  const [reason, setReason] = useState("urgent");
  const [note, setNote] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDateInput, setNewDateInput] = useState(item?.date || "");
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [manualDate, setManualDate] = useState(item?.date || "");
  const [manualTime, setManualTime] = useState(item?.time || "");
  const [manualStatus, setManualStatus] = useState(
    item?.kind === "session" ? "planned" : "active"
  );

  if (!item) {
    return null;
  }

  const recommendation = getRecommendation(item.kind, reason);

  async function applyRecommendation() {
    if (!user) {
      alert("You need to be logged in to apply this change.");
      return;
    }

    if (recommendation.requiresConfirmCheckbox && !confirmChecked) {
      alert("Please confirm the checkbox before applying this change.");
      return;
    }

    if (recommendation.requiresDateInput && !newDateInput) {
      alert("Please choose the corrected date first.");
      return;
    }

    try {
      setSaving(true);

      switch (recommendation.actionType) {
        case "reschedule-tomorrow": {
          const updates = { date: getTomorrowDateString(), status: "planned" };
          await updateStudySession(user.uid, item.id, updates);
          onSessionUpdated(item.id, updates);
          break;
        }

        case "reschedule-short": {
          const updates = {
            date: getTomorrowDateString(),
            durationMinutes: 25,
            duration: "25 minutes",
            status: "planned",
          };
          await updateStudySession(user.uid, item.id, updates);
          onSessionUpdated(item.id, updates);
          break;
        }

        case "reschedule-today-short": {
          const updates = {
            date: getTodayDateString(),
            durationMinutes: 20,
            duration: "20 minutes",
            status: "planned",
          };
          await updateStudySession(user.uid, item.id, updates);
          onSessionUpdated(item.id, updates);
          break;
        }

        case "change-session-date": {
          const updates = { date: newDateInput, status: "planned" };
          await updateStudySession(user.uid, item.id, updates);
          onSessionUpdated(item.id, updates);
          break;
        }

        case "archive-session": {
          const confirmed = window.confirm(
            "Archive this session? It will be hidden from your active plan but not deleted."
          );

          if (!confirmed) {
            setSaving(false);
            return;
          }

          const updates = { status: "archived" };
          await updateStudySession(user.uid, item.id, updates);
          onSessionUpdated(item.id, updates);
          break;
        }

        case "archive-quest": {
          const confirmed = window.confirm(
            "Archive this task? It will be hidden from your active list but not deleted."
          );

          if (!confirmed) {
            setSaving(false);
            return;
          }

          const updates = { status: "archived" };
          await updateQuest(user.uid, item.id, updates);
          onQuestUpdated(item.id, updates);
          break;
        }

        case "change-due-date": {
          const updates = { dueDate: newDateInput };
          await updateQuest(user.uid, item.id, updates);
          onQuestUpdated(item.id, updates);
          break;
        }

        case "create-recovery-quest": {
          const isShort = reason === "busy" || reason === "procrastinated";

          const recoveryQuest = {
            title: `Recovery step: ${item.title}`,
            subject: item.subject,
            taskType: item.taskType || "Homework",
            priority: item.priority || "Medium",
            difficulty: "Easy",
            dueDate: getTodayDateString(),
            estimatedMinutes: isShort ? 20 : 25,
            xp: 40,
            subtasks: [],
            completed: false,
            status: "active",
            source: "Overdue Recovery",
            linkedQuestId: item.kind === "quest" ? item.id : "",
            createdAt: new Date().toISOString(),
          };

          const savedQuest = await saveQuest(user.uid, recoveryQuest);
          onQuestCreated(savedQuest);
          break;
        }

        case "open-breakdown": {
          onNavigate("breakdown");
          setSaving(false);
          return;
        }

        default:
          break;
      }

      alert("IPlan updated this item based on your recommendation.");
      onClose();
    } catch (error) {
      console.error("Error applying overdue recommendation:", error);
      alert("Something went wrong while applying this recommendation.");
    } finally {
      setSaving(false);
    }
  }

  async function saveManualChanges() {
    if (!user) {
      alert("You need to be logged in to save changes.");
      return;
    }

    try {
      setSaving(true);

      if (item.kind === "session") {
        const updates = {
          date: manualDate,
          time: manualTime,
          status: manualStatus,
        };

        await updateStudySession(user.uid, item.id, updates);
        onSessionUpdated(item.id, updates);
      } else {
        const updates = {
          dueDate: manualDate,
          status: manualStatus,
        };

        await updateQuest(user.uid, item.id, updates);
        onQuestUpdated(item.id, updates);
      }

      alert("Changes saved.");
      onClose();
    } catch (error) {
      console.error("Error saving manual overdue changes:", error);
      alert("Something went wrong while saving your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="calendar-modal-overlay">
      <div className="calendar-modal overdue-review-modal">
        <button type="button" className="calendar-modal-close" onClick={onClose}>
          &times;
        </button>

        <h2>Review Overdue Task</h2>

        <p>
          Missing a task does not mean the plan failed. Let&apos;s understand
          what happened and choose the next best action.
        </p>

        <div className="overdue-item-summary">
          <p className="priority-label">
            {item.kind === "session" ? "Calendar session" : "Active task"}
          </p>

          <h3>{item.title}</h3>

          <div className="overdue-item-meta">
            <span>{item.subject}</span>
            <span>
              {item.kind === "session" ? "Scheduled: " : "Due: "}
              {formatItemDate(item.date)}
            </span>
          </div>
        </div>

        {!manualMode ? (
          <>
            <div className="form-group full-width">
              <label>Why is this overdue?</label>
              <select
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setConfirmChecked(false);
                }}
              >
                {REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Add context (optional)</label>
              <textarea
                className="calendar-edit-textarea"
                placeholder="Example: I had to finish my Chemistry IA first, so I did not have time for this session."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="overdue-recommendation-box priority-explanation-box">
              <h3>IPlan recommendation</h3>
              <p>{recommendation.headline}</p>
              <p>{recommendation.description}</p>
              <p>
                <strong>{recommendation.actionSummary}</strong>
              </p>

              {recommendation.requiresDateInput && (
                <div className="form-group">
                  <label>Corrected date</label>
                  <input
                    type="date"
                    value={newDateInput}
                    onChange={(event) => setNewDateInput(event.target.value)}
                  />
                </div>
              )}

              {recommendation.requiresConfirmCheckbox && (
                <label className="overdue-confirm-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(event) => setConfirmChecked(event.target.checked)}
                  />
                  {reason === "due-date-changed"
                    ? "I confirm the official deadline changed."
                    : "I understand this will move the item out of my active list."}
                </label>
              )}
            </div>

            <div className="overdue-review-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={applyRecommendation}
                disabled={saving}
              >
                {saving ? "Applying..." : "Apply Recommendation"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setManualMode(true)}
              >
                Edit Manually
              </button>

              <button type="button" className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="overdue-manual-edit">
              {item.kind === "session" ? (
                <>
                  <div className="form-group">
                    <label>Session date</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(event) => setManualDate(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Session time</label>
                    <input
                      type="time"
                      value={manualTime}
                      onChange={(event) => setManualTime(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={manualStatus}
                      onChange={(event) => setManualStatus(event.target.value)}
                    >
                      <option value="planned">Planned</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Due date</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(event) => setManualDate(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={manualStatus}
                      onChange={(event) => setManualStatus(event.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="backlog">Backlog</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="overdue-review-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={saveManualChanges}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setManualMode(false)}
              >
                Back to Recommendation
              </button>

              <button type="button" className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OverdueReviewModal;
