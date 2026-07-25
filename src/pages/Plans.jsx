import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";

import {
  deletePlan,
  loadPlans,
} from "../firebase/plans";

import {
  saveStudySession,
} from "../firebase/sessions";

import {
  saveQuest,
} from "../firebase/quests";

function Plans({ setPage, quests = [], setQuests }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionScheduleInputs, setSessionScheduleInputs] = useState({});
  const [savingActionId, setSavingActionId] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await loadPlans(user.uid);
        const safePlans = data || [];

        setPlans(safePlans);
        prepareDefaultScheduleInputs(safePlans);
      } catch (error) {
        console.error("Error loading saved plans:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  function getTodayString(offsetDays = 0) {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);

    return date.toISOString().split("T")[0];
  }

  function getDefaultTime(index) {
    const defaultTimes = ["17:00", "18:00", "19:00", "16:30", "20:00"];

    return defaultTimes[index % defaultTimes.length];
  }

  function prepareDefaultScheduleInputs(planList) {
    const nextInputs = {};

    planList.forEach((plan) => {
      const sessions = getPlanSessions(plan);

      nextInputs[plan.id] = {};

      sessions.forEach((session, index) => {
        nextInputs[plan.id][index] = {
          date: session.date || getTodayString(index),
          time: session.time || getDefaultTime(index),
        };
      });
    });

    setSessionScheduleInputs(nextInputs);
  }

  function getPlanTitle(plan) {
    return (
      plan.goal ||
      plan.title ||
      plan.taskTitle ||
      plan.task ||
      "Untitled saved plan"
    );
  }

  function getPlanSubject(plan) {
    return plan.subject || "General";
  }

  function getPlanTaskType(plan) {
    return plan.taskType || plan.type || "Study Plan";
  }

  function getPlanHours(plan) {
    if (plan.hours) {
      return `${plan.hours} hours available`;
    }

    if (plan.totalHours) {
      return `${plan.totalHours} hours total`;
    }

    if (plan.estimatedHours) {
      return `${plan.estimatedHours} hours estimated`;
    }

    if (plan.totalMinutes) {
      return `${plan.totalMinutes} minutes estimated`;
    }

    if (plan.estimatedMinutes) {
      return `${plan.estimatedMinutes} minutes estimated`;
    }

    return "No time estimate added";
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

  function normalizeSession(session, index, plan) {
    if (typeof session === "string") {
      return {
        title: session,
        focus: "Complete this part of the saved plan.",
        duration: "45 minutes",
        durationMinutes: 45,
        steps: [session],
        successCondition: "This part of the plan has meaningful progress.",
        dontWorryAbout:
          "Do not aim for perfection. Focus on making progress.",
      };
    }

    const durationMinutes =
      session.durationMinutes ||
      session.estimatedMinutes ||
      parseDurationToMinutes(session.duration);

    return {
      title:
        session.title ||
        session.goal ||
        session.task ||
        `Session ${index + 1}: ${getPlanTitle(plan)}`,
      focus:
        session.focus ||
        session.description ||
        session.goal ||
        "Complete this part of the saved plan.",
      duration: session.duration || `${durationMinutes} minutes`,
      durationMinutes,
      steps: session.steps || session.tasks || session.subtasks || [],
      successCondition:
        session.successCondition ||
        "This session has real progress toward the saved plan.",
      dontWorryAbout:
        session.dontWorryAbout ||
        "Do not aim for perfection. Focus on the highest-impact next step.",
    };
  }

  function getPlanSessions(plan) {
    if (Array.isArray(plan.sessions) && plan.sessions.length > 0) {
      return plan.sessions.map((session, index) =>
        normalizeSession(session, index, plan)
      );
    }

    if (Array.isArray(plan.schedule) && plan.schedule.length > 0) {
      return plan.schedule.map((session, index) =>
        normalizeSession(session, index, plan)
      );
    }

    if (Array.isArray(plan.steps) && plan.steps.length > 0) {
      return plan.steps.map((step, index) =>
        normalizeSession(step, index, plan)
      );
    }

    if (Array.isArray(plan.milestones) && plan.milestones.length > 0) {
      return plan.milestones.map((milestone, index) =>
        normalizeSession(milestone, index, plan)
      );
    }

    return [];
  }

  function getPlanSteps(plan) {
    if (Array.isArray(plan.milestones) && plan.milestones.length > 0) {
      return plan.milestones;
    }

    if (Array.isArray(plan.steps) && plan.steps.length > 0) {
      return plan.steps.map((step) => {
        if (typeof step === "string") {
          return step;
        }

        return step.title || step.task || step.description || "Untitled step";
      });
    }

    const sessions = getPlanSessions(plan);

    if (sessions.length > 0) {
      return sessions.map((session) => session.title);
    }

    return [];
  }

  function getPlanAdvice(plan) {
    return (
      plan.advice ||
      plan.recommendation ||
      plan.notes ||
      plan.summary ||
      plan.nextBestAction ||
      "No extra advice added for this plan."
    );
  }

  function formatCreatedAt(createdAt) {
    if (!createdAt) {
      return "Date not available";
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "Date not available";
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function updateSessionSchedule(planId, sessionIndex, field, value) {
    setSessionScheduleInputs((currentInputs) => ({
      ...currentInputs,
      [planId]: {
        ...(currentInputs[planId] || {}),
        [sessionIndex]: {
          ...(currentInputs[planId]?.[sessionIndex] || {}),
          [field]: value,
        },
      },
    }));
  }

  function getQuestXPFromDifficulty(taskDifficulty) {
    if (taskDifficulty === "Easy") return 40;
    if (taskDifficulty === "Medium") return 80;
    if (taskDifficulty === "Hard") return 120;

    return 80;
  }

  function isPlanTracked(plan) {
    const planTitle = getPlanTitle(plan);

    return quests.some((quest) => {
      return (
        quest.linkedPlanId === plan.id ||
        quest.linkedPlanTitle === planTitle ||
        quest.title === planTitle
      );
    });
  }

  function buildActiveTaskFromPlan(plan) {
    const planTitle = getPlanTitle(plan);
    const planSteps = getPlanSteps(plan);

    const estimatedMinutes =
      plan.totalMinutes ||
      plan.estimatedMinutes ||
      Math.round(Number(plan.estimatedHours || plan.hours || 1) * 60);

    return {
      title: planTitle,
      subject: getPlanSubject(plan),
      taskType: plan.taskType || "Saved Plan",
      priority: plan.priority || "Medium",
      difficulty: plan.difficulty || "Medium",
      dueDate: plan.dueDate || "",
      estimatedMinutes,
      xp: getQuestXPFromDifficulty(plan.difficulty || "Medium"),
      subtasks: planSteps,
      completed: false,
      source: "Saved Plans",
      linkedPlanId: plan.id,
      linkedPlanTitle: planTitle,
      createdAt: new Date().toISOString(),
    };
  }

  async function handleTrackPlan(plan) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    if (isPlanTracked(plan)) {
      setPage("dashboard");
      return;
    }

    try {
      setSavingActionId(`track-${plan.id}`);

      const taskToSave = buildActiveTaskFromPlan(plan);
      const savedTask = await saveQuest(user.uid, taskToSave);

      if (setQuests) {
        setQuests([savedTask, ...quests]);
      }

      alert("This saved plan is now being tracked on your Dashboard.");
    } catch (error) {
      console.error("Error tracking saved plan:", error);
      alert("Something went wrong while tracking this saved plan.");
    } finally {
      setSavingActionId("");
    }
  }

  async function handleAddPlanToCalendar(plan) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const sessions = getPlanSessions(plan);

    if (sessions.length === 0) {
      alert("This plan does not have sessions or steps to add to Calendar.");
      return;
    }

    const missingSchedule = sessions.find((session, index) => {
      const scheduleInput = sessionScheduleInputs[plan.id]?.[index];

      return !scheduleInput?.date || !scheduleInput?.time;
    });

    if (missingSchedule) {
      alert("Please choose a date and time for every session.");
      return;
    }

    try {
      setSavingActionId(`calendar-${plan.id}`);

      for (let index = 0; index < sessions.length; index++) {
        const session = sessions[index];
        const scheduleInput = sessionScheduleInputs[plan.id][index];

        await saveStudySession(user.uid, {
          title: session.title,
          goal: getPlanTitle(plan),
          subject: getPlanSubject(plan),
          taskType: plan.taskType || "Saved Plan",
          priority: plan.priority || "Medium",
          difficulty: plan.difficulty || "Medium",
          dueDate: plan.dueDate || "",
          date: scheduleInput.date,
          time: scheduleInput.time,
          duration: session.duration,
          durationMinutes: session.durationMinutes,
          focus: session.focus,
          tasks: session.steps || [],
          successCondition: session.successCondition,
          dontWorryAbout: session.dontWorryAbout,
          source: "Saved Plan",
          savedPlanId: plan.id,
          status: "planned",
        });
      }

      alert("Saved plan sessions added to your Calendar.");
      setPage("calendar");
    } catch (error) {
      console.error("Error adding saved plan to calendar:", error);
      alert("Something went wrong while adding this plan to Calendar.");
    } finally {
      setSavingActionId("");
    }
  }

  async function handleDeletePlan(planId) {
    const user = auth.currentUser;

    if (!user || !planId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this saved plan? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePlan(user.uid, planId);

      setPlans((currentPlans) =>
        currentPlans.filter((plan) => plan.id !== planId)
      );
    } catch (error) {
      console.error("Error deleting saved plan:", error);
      alert("Something went wrong while deleting this plan.");
    }
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Saved Planning Work</p>
            <h1>Saved Plans 📁</h1>

            <p>
              Review full study plans, schedule them into your Calendar later,
              or track them on your Dashboard when you are ready to work.
            </p>
          </div>

          <button type="button" onClick={() => setPage("breakdown")}>
            Create New Plan
          </button>
        </div>

        {loading ? (
          <section className="empty-state-card">
            <h2>Loading saved plans...</h2>
            <p>Please wait while IPlan loads your saved planning work.</p>
          </section>
        ) : plans.length === 0 ? (
          <section className="empty-state-card">
            <h2>No saved plans yet</h2>

            <p>
              Use AI Breakdown Planner to create a larger study plan. Saved
              plans will appear here so you can return to them later.
            </p>

            <button
              type="button"
              onClick={() => setPage("breakdown")}
              style={{ marginTop: "18px" }}
            >
              Open AI Breakdown
            </button>
          </section>
        ) : (
          <div className="saved-plans-grid">
            {plans.map((plan, index) => {
              const sessions = getPlanSessions(plan);
              const tracked = isPlanTracked(plan);

              return (
                <article className="saved-plan-card upgraded" key={plan.id || index}>
                  <div className="saved-plan-top">
                    <div>
                      <p className="plan-label">
                        {getPlanTaskType(plan)}
                      </p>

                      <h2>{getPlanTitle(plan)}</h2>

                      <p className="plan-date">
                        Saved: {formatCreatedAt(plan.createdAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="danger-btn small"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="plan-meta-row">
                    <div>
                      <span>Subject</span>
                      <strong>{getPlanSubject(plan)}</strong>
                    </div>

                    <div>
                      <span>Time</span>
                      <strong>{getPlanHours(plan)}</strong>
                    </div>

                    <div>
                      <span>Sessions / Steps</span>
                      <strong>{sessions.length}</strong>
                    </div>
                  </div>

                  <div className="plan-advice-box">
                    <h3>Advice</h3>
                    <p>{getPlanAdvice(plan)}</p>
                  </div>

                  {sessions.length > 0 ? (
                    <div className="saved-plan-schedule-box">
                      <h3>Schedule this plan</h3>

                      <p>
                        Choose dates and times if you want to add this saved
                        plan to your Calendar.
                      </p>

                      <div className="saved-plan-session-list">
                        {sessions.map((session, sessionIndex) => (
                          <div
                            className="saved-plan-session-row"
                            key={sessionIndex}
                          >
                            <div>
                              <strong>{session.title}</strong>
                              <span>{session.duration}</span>
                            </div>

                            <div className="saved-plan-session-inputs">
                              <input
                                type="date"
                                value={
                                  sessionScheduleInputs[plan.id]?.[
                                    sessionIndex
                                  ]?.date || ""
                                }
                                onChange={(event) =>
                                  updateSessionSchedule(
                                    plan.id,
                                    sessionIndex,
                                    "date",
                                    event.target.value
                                  )
                                }
                              />

                              <input
                                type="time"
                                value={
                                  sessionScheduleInputs[plan.id]?.[
                                    sessionIndex
                                  ]?.time || ""
                                }
                                onChange={(event) =>
                                  updateSessionSchedule(
                                    plan.id,
                                    sessionIndex,
                                    "time",
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="plan-schedule-box">
                      <h3>No sessions saved</h3>

                      <p>
                        This saved plan does not include sessions or steps yet.
                      </p>
                    </div>
                  )}

                  <div className="saved-plan-action-row">
                    <div className="plan-action-item">
                      <button
                        type="button"
                        className="plan-action-button"
                        onClick={() => handleAddPlanToCalendar(plan)}
                        disabled={savingActionId === `calendar-${plan.id}`}
                      >
                        {savingActionId === `calendar-${plan.id}`
                          ? "Adding..."
                          : "Add to Calendar"}
                      </button>

                      <p className="plan-action-description">
                        Use this when you are ready to schedule this saved plan
                        into real dated study sessions.
                      </p>
                    </div>

                    <div className="plan-action-item">
                      <button
                        type="button"
                        className="plan-action-button"
                        onClick={() => handleTrackPlan(plan)}
                        disabled={savingActionId === `track-${plan.id}`}
                      >
                        {tracked
                          ? "View on Dashboard"
                          : savingActionId === `track-${plan.id}`
                          ? "Tracking..."
                          : "Track on Dashboard"}
                      </button>

                      <p className="plan-action-description">
                        {tracked
                          ? "This plan is already being tracked as an active task."
                          : "Use this when you are actively working on this saved plan now."}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Plans;