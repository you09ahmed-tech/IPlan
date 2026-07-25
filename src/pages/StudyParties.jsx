import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import {
  createSharedStudySession,
  joinSharedStudySessionByCode,
  loadSharedStudySessionsForUser,
  markSharedStudySessionCompleted,
  updateSharedStudySessionDetails,
  deleteSharedStudySession,
} from "../firebase/sharedStudySessions";
import {
  loadStudySessions,
  updateStudySession,
  deleteStudySession,
} from "../firebase/sessions";
import { addNotification } from "../utils/notifications";

const BASE_SHARED_SESSION_XP = 40;
const COLLABORATION_BONUS_XP = 15;
const ACCOUNTABILITY_BONUS_XP = 15;
const REMINDER_WINDOW_MINUTES = 30;

function isSessionToday(session) {
  if (!session.date) {
    return false;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return session.date === todayKey;
}

function isSessionStartingSoon(session) {
  if (!session.date || !session.time) {
    return false;
  }

  const sessionDateTime = new Date(`${session.date}T${session.time}:00`);

  if (Number.isNaN(sessionDateTime.getTime())) {
    return false;
  }

  const diffMinutes = (sessionDateTime.getTime() - Date.now()) / (1000 * 60);

  return diffMinutes >= 0 && diffMinutes <= REMINDER_WINDOW_MINUTES;
}

function StudyParties({ setPage, setXP }) {
  const [sharedSessions, setSharedSessions] = useState([]);
  const [userCalendarSessions, setUserCalendarSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [customDurationMinutes, setCustomDurationMinutes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [lastCreatedCode, setLastCreatedCode] = useState("");

  const [rewardMessage, setRewardMessage] = useState(null);

  const [editingLinkSessionId, setEditingLinkSessionId] = useState(null);
  const [linkDraft, setLinkDraft] = useState("");

  const [editingDelaySessionId, setEditingDelaySessionId] = useState(null);
  const [delayDate, setDelayDate] = useState("");
  const [delayTime, setDelayTime] = useState("");

  const completionRewardXP =
    BASE_SHARED_SESSION_XP + COLLABORATION_BONUS_XP;

  useEffect(() => {
    loadSessions();
  }, []);

  function checkForMissingLinkReminders(sessions, currentUserId) {
    sessions.forEach((session) => {
      if (session.createdBy !== currentUserId) {
        return;
      }

      if (session.meetingLink) {
        return;
      }

      if (isSessionToday(session) || isSessionStartingSoon(session)) {
        addNotification(
          `Your Study Party "${session.title}" starts soon. Add a meeting link.`,
          `missing-link-${session.id}`
        );
      }
    });
  }

  async function loadSessions() {
    setLoading(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setSharedSessions([]);
        setUserCalendarSessions([]);
        setLoading(false);
        return;
      }

      const savedSharedSessions = await loadSharedStudySessionsForUser(
        currentUser.uid
      );

      const savedCalendarSessions = await loadStudySessions(currentUser.uid);

      const sortedSessions = (savedSharedSessions || []).sort((a, b) => {
        const firstDate = `${a.date || ""} ${a.time || ""}`;
        const secondDate = `${b.date || ""} ${b.time || ""}`;

        return firstDate.localeCompare(secondDate);
      });

      setSharedSessions(sortedSessions);
      setUserCalendarSessions(savedCalendarSessions || []);
      checkForMissingLinkReminders(sortedSessions, currentUser.uid);
    } catch (error) {
      console.error("Error loading shared study sessions:", error);
      alert("IPlan could not load your shared study sessions.");
    } finally {
      setLoading(false);
    }
  }

  function isValidMeetingLink(link) {
    if (link.trim() === "") {
      return true;
    }

    return link.startsWith("https://") || link.startsWith("http://");
  }

  function getFinalDurationMinutes() {
    if (durationMinutes === "custom") {
      return Number(customDurationMinutes);
    }

    return Number(durationMinutes);
  }

  function getUserCalendarCopy(sharedSessionId) {
    return userCalendarSessions.find((session) => {
      return (
        session.sharedSessionId === sharedSessionId ||
        session.id === sharedSessionId
      );
    });
  }

  function getUserSessionStatus(sharedSessionId) {
    const calendarCopy = getUserCalendarCopy(sharedSessionId);

    if (!calendarCopy) {
      return "planned";
    }

    return calendarCopy.status || "planned";
  }

  function hasCompletionXpBeenAwarded(sharedSessionId) {
    const calendarCopy = getUserCalendarCopy(sharedSessionId);

    if (!calendarCopy) {
      return false;
    }

    return Boolean(
      calendarCopy.xpAwarded ||
        calendarCopy.baseXpAwarded ||
        calendarCopy.collaborationBonusAwarded
    );
  }

  function hasAccountabilityBonusBeenAwarded(sharedSessionId) {
    const calendarCopy = getUserCalendarCopy(sharedSessionId);

    if (!calendarCopy) {
      return false;
    }

    return Boolean(calendarCopy.accountabilityBonusAwarded);
  }

  function canClaimAccountabilityBonus(session) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return false;
    }

    const completedParticipants = session.completedParticipants || [];
    const userStatus = getUserSessionStatus(session.id);

    return (
      userStatus === "completed" &&
      completedParticipants.includes(currentUser.uid) &&
      completedParticipants.length >= 2 &&
      !hasAccountabilityBonusBeenAwarded(session.id)
    );
  }

  function formatDate(value) {
    if (!value) {
      return "No date";
    }

    try {
      const parsedDate = new Date(`${value}T12:00:00`);

      return parsedDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  async function handleCreateSharedSession(event) {
    event.preventDefault();

    if (!auth.currentUser) {
      alert("You must be logged in to create a shared study session.");
      return;
    }

    if (title.trim() === "") {
      alert("Please enter a session title.");
      return;
    }

    if (goal.trim() === "") {
      alert("Please enter the session goal.");
      return;
    }

    if (!date) {
      alert("Please choose a date.");
      return;
    }

    if (!time) {
      alert("Please choose a time.");
      return;
    }

    if (
      durationMinutes === "custom" &&
      (!customDurationMinutes || Number(customDurationMinutes) <= 0)
    ) {
      alert("Please enter a valid custom duration.");
      return;
    }

    if (!isValidMeetingLink(meetingLink)) {
      alert("Please enter a meeting link starting with http:// or https://");
      return;
    }

    const finalDurationMinutes = getFinalDurationMinutes();

    try {
      const createdSession = await createSharedStudySession(
        auth.currentUser.uid,
        {
          title: title.trim(),
          subject: subject.trim(),
          goal: goal.trim(),
          date,
          time,
          duration: `${finalDurationMinutes} minutes`,
          durationMinutes: finalDurationMinutes,
          meetingLink: meetingLink.trim(),
        }
      );

      setLastCreatedCode(createdSession.inviteCode);

      setTitle("");
      setSubject("");
      setGoal("");
      setDate("");
      setTime("");
      setDurationMinutes("60");
      setCustomDurationMinutes("");
      setMeetingLink("");

      await loadSessions();

      alert(
        `Shared session created. Send this invite code to your friend: ${createdSession.inviteCode}`
      );
    } catch (error) {
      console.error("Error creating shared study session:", error);
      alert("IPlan could not create this shared study session.");
    }
  }

  async function handleJoinSharedSession(event) {
    event.preventDefault();

    if (!auth.currentUser) {
      alert("You must be logged in to join a shared study session.");
      return;
    }

    if (joinCode.trim() === "") {
      alert("Please enter an invite code.");
      return;
    }

    try {
      const joinedSession = await joinSharedStudySessionByCode(
        auth.currentUser.uid,
        joinCode
      );

      setJoinCode("");

      await loadSessions();

      if (joinedSession.alreadyJoined) {
        alert(
          "You already joined this session. It has been added to your calendar again if needed."
        );
      } else {
        alert(
          "You joined the shared study session. It has been added to your calendar."
        );
      }
    } catch (error) {
      console.error("Error joining shared study session:", error);
      alert(error.message || "IPlan could not join this shared study session.");
    }
  }

  async function handleCompleteSharedSession(sharedSessionId) {
    if (!auth.currentUser) {
      alert("You must be logged in to complete this session.");
      return;
    }

    const calendarCopy = getUserCalendarCopy(sharedSessionId);

    if (!calendarCopy) {
      alert("IPlan could not find this session in your calendar.");
      return;
    }

    if (hasCompletionXpBeenAwarded(sharedSessionId)) {
      alert("Completion XP has already been awarded for this session.");
      return;
    }

    try {
      await updateStudySession(auth.currentUser.uid, calendarCopy.id, {
        status: "completed",
        completedAt: new Date().toISOString(),

        baseXpAwarded: true,
        collaborationBonusAwarded: true,
        xpAwarded: true,

        baseXpEarned: BASE_SHARED_SESSION_XP,
        collaborationBonusEarned: COLLABORATION_BONUS_XP,
        xpEarned: completionRewardXP,

        rewardType: "collaboration",
      });

      await markSharedStudySessionCompleted(
        sharedSessionId,
        auth.currentUser.uid
      );

      if (setXP) {
        setXP((currentXP) => currentXP + completionRewardXP);
      }

      setRewardMessage({
        title: calendarCopy.title || "Shared Study Session",
        xp: completionRewardXP,
        bonus: `Collaboration Bonus +${COLLABORATION_BONUS_XP} XP`,
        badge: "Accountability Session Completed",
        note:
          "If your partner also completes this session, you can claim an extra accountability bonus.",
      });

      await loadSessions();
    } catch (error) {
      console.error("Error completing shared session:", error);
      alert("IPlan could not mark this session as completed.");
    }
  }

  async function handleClaimAccountabilityBonus(session) {
    if (!auth.currentUser) {
      alert("You must be logged in to claim this bonus.");
      return;
    }

    const calendarCopy = getUserCalendarCopy(session.id);

    if (!calendarCopy) {
      alert("IPlan could not find this session in your calendar.");
      return;
    }

    if (!canClaimAccountabilityBonus(session)) {
      alert(
        "The accountability bonus is not ready yet. Your partner must complete the session too."
      );
      return;
    }

    try {
      const previousXpEarned = Number(calendarCopy.xpEarned || 0);
      const updatedXpEarned =
        previousXpEarned + ACCOUNTABILITY_BONUS_XP;

      await updateStudySession(auth.currentUser.uid, calendarCopy.id, {
        accountabilityBonusAwarded: true,
        accountabilityBonusEarned: ACCOUNTABILITY_BONUS_XP,
        xpEarned: updatedXpEarned,
      });

      if (setXP) {
        setXP((currentXP) => currentXP + ACCOUNTABILITY_BONUS_XP);
      }

      setRewardMessage({
        title: calendarCopy.title || "Shared Study Session",
        xp: ACCOUNTABILITY_BONUS_XP,
        bonus: "Accountability Bonus",
        badge: "Both Students Completed",
        note:
          "Your partner completed the session too. You earned the accountability bonus.",
      });

      await loadSessions();
    } catch (error) {
      console.error("Error claiming accountability bonus:", error);
      alert("IPlan could not claim this accountability bonus.");
    }
  }

  function copyInviteCode(code) {
    navigator.clipboard.writeText(code);
    alert(`Invite code copied: ${code}`);
  }

  function startEditingLink(session) {
    setEditingLinkSessionId(session.id);
    setLinkDraft(session.meetingLink || "");
    setEditingDelaySessionId(null);
  }

  function cancelEditingLink() {
    setEditingLinkSessionId(null);
    setLinkDraft("");
  }

  async function handleSaveMeetingLink(session) {
    const trimmedLink = linkDraft.trim();

    if (!trimmedLink) {
      alert("Please paste a meeting link first.");
      return;
    }

    if (!(trimmedLink.startsWith("https://") || trimmedLink.startsWith("http://"))) {
      alert("Please enter a meeting link starting with http:// or https://");
      return;
    }

    try {
      await updateSharedStudySessionDetails(session.id, {
        meetingLink: trimmedLink,
      });

      cancelEditingLink();
      addNotification(`A meeting link was added to "${session.title}".`);
      await loadSessions();
    } catch (error) {
      console.error("Error adding meeting link:", error);
      alert("Something went wrong while saving the meeting link.");
    }
  }

  function startEditingDelay(session) {
    setEditingDelaySessionId(session.id);
    setDelayDate(session.date || "");
    setDelayTime(session.time || "");
    setEditingLinkSessionId(null);
  }

  function cancelEditingDelay() {
    setEditingDelaySessionId(null);
    setDelayDate("");
    setDelayTime("");
  }

  async function handleDelaySession(session) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to reschedule this session.");
      return;
    }

    if (!delayDate || !delayTime) {
      alert("Please choose a new date and time.");
      return;
    }

    try {
      await updateSharedStudySessionDetails(session.id, {
        date: delayDate,
        time: delayTime,
      });

      const calendarCopy = getUserCalendarCopy(session.id);

      if (calendarCopy) {
        await updateStudySession(currentUser.uid, calendarCopy.id, {
          date: delayDate,
          time: delayTime,
          status: "planned",
        });
      }

      cancelEditingDelay();
      addNotification(
        `You rescheduled "${session.title}" to ${formatDate(delayDate)} at ${delayTime}.`
      );
      await loadSessions();
    } catch (error) {
      console.error("Error delaying shared session:", error);
      alert("Something went wrong while rescheduling this session.");
    }
  }

  async function handleDeleteSession(session) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to delete this session.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${session.title}"? Other students who joined will no longer see it as active. This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const calendarCopy = getUserCalendarCopy(session.id);

      if (calendarCopy) {
        await deleteStudySession(currentUser.uid, calendarCopy.id);
      }

      await deleteSharedStudySession(session.id);
      addNotification(`You deleted "${session.title}".`);
      await loadSessions();
    } catch (error) {
      console.error("Error deleting shared session:", error);
      alert("Something went wrong while deleting this session.");
    }
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        {rewardMessage && (
          <section className="reward-celebration-card">
            <div>
              <p className="reward-label">Reward unlocked</p>

              <h2>+{rewardMessage.xp} XP earned 🎉</h2>

              <p>
                You completed{" "}
                <strong>{rewardMessage.title}</strong>.
              </p>

              {rewardMessage.note && (
                <p>{rewardMessage.note}</p>
              )}
            </div>

            <div className="reward-badges">
              <span>{rewardMessage.bonus}</span>
              <span>{rewardMessage.badge}</span>
            </div>

            <button
              type="button"
              onClick={() => setRewardMessage(null)}
            >
              Nice
            </button>
          </section>
        )}

        <section className="xp-card">
          <p className="eyebrow">Collaborative Study</p>
          <h1>Study Parties</h1>

          <p>Study with a friend in real time using a shared session and invite code.</p>

          <div className="stats">
            <span>👥 Shared Sessions: {sharedSessions.length}</span>
            <span>🏆 Complete: {completionRewardXP} XP</span>
            <span>🤝 Accountability: +{ACCOUNTABILITY_BONUS_XP} XP</span>
          </div>
        </section>

        <section className="subject-card">
          <h2>Create Shared Study Session</h2>

          <p style={{ marginTop: "10px" }}>
            Create a session, paste your Zoom or meeting link, then send the
            generated invite code to your friend.
          </p>

          <form
            className="study-party-form"
            onSubmit={handleCreateSharedSession}
          >
            <input
              type="text"
              placeholder="Session title, e.g. Physics IA Work Session"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />

            <input
              type="text"
              placeholder="Subject, e.g. Physics"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />

            <textarea
              placeholder="Session goal, e.g. Finish the introduction together"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />

            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />

            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            >
              <option value="25">25 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
              <option value="custom">Custom</option>
            </select>

            {durationMinutes === "custom" && (
              <input
                type="number"
                min="1"
                placeholder="Custom duration in minutes"
                value={customDurationMinutes}
                onChange={(event) =>
                  setCustomDurationMinutes(event.target.value)
                }
              />
            )}

            <input
              type="url"
              placeholder="Meeting link, e.g. https://zoom.us/..."
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
            />

            <button type="submit">Create Session + Generate Code</button>
          </form>

          {lastCreatedCode && (
            <div className="subject-card" style={{ marginTop: "22px" }}>
              <h3>Latest Invite Code</h3>

              <p style={{ marginTop: "10px" }}>
                Send this code to your friend so they can join the session:
              </p>

              <div className="invite-code-box">
                <strong>{lastCreatedCode}</strong>

                <button
                  type="button"
                  onClick={() => copyInviteCode(lastCreatedCode)}
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="subject-card" style={{ marginTop: "30px" }}>
          <h2>Join a Friend’s Session</h2>

          <p style={{ marginTop: "10px" }}>
            Enter the 6-character invite code your friend sent you. Once you
            join, the session will appear in your calendar too.
          </p>

          <form className="join-session-form" onSubmit={handleJoinSharedSession}>
            <input
              type="text"
              placeholder="Enter invite code, e.g. K7P2Q9"
              value={joinCode}
              maxLength={6}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
            />

            <button type="submit">Join Session</button>
          </form>
        </section>

        <h2 className="section-title">Your Shared Study Sessions</h2>

        {loading && (
          <section className="subject-card">
            <h2>Loading shared sessions...</h2>

            <p style={{ marginTop: "10px" }}>
              IPlan is checking your shared study sessions.
            </p>
          </section>
        )}

        {!loading && sharedSessions.length === 0 && (
          <section className="subject-card">
            <h2>No shared sessions yet</h2>

            <p style={{ marginTop: "10px" }}>
              Create a session above or join one using a friend’s invite code.
            </p>
          </section>
        )}

        {!loading && sharedSessions.length > 0 && (
          <div className="study-party-grid">
            {sharedSessions.map((session) => {
              const userStatus = getUserSessionStatus(session.id);
              const isCompleted = userStatus === "completed";
              const completionXpAwarded =
                hasCompletionXpBeenAwarded(session.id);
              const accountabilityAwarded =
                hasAccountabilityBonusBeenAwarded(session.id);
              const completedParticipants =
                session.completedParticipants || [];
              const accountabilityReady =
                canClaimAccountabilityBonus(session);
              const isOrganizer =
                session.createdBy === auth.currentUser?.uid;

              return (
                <article key={session.id} className="study-party-card">
                  <h3>{session.title}</h3>

                  <p>
                    Goal: <strong>{session.goal}</strong>
                  </p>

                  <p>
                    Subject:{" "}
                    <strong>{session.subject || "No subject added"}</strong>
                  </p>

                  <p>
                    Time:{" "}
                    <strong>
                      {formatDate(session.date)} at {session.time}
                    </strong>
                  </p>

                  <p>
                    Duration:{" "}
                    <strong>{session.duration || "60 minutes"}</strong>
                  </p>

                  <p>
                    Invite Code: <strong>{session.inviteCode}</strong>
                  </p>

                  <p>
                    Participants:{" "}
                    <strong>{(session.participants || []).length}</strong>
                  </p>

                  <p>
                    Completed Participants:{" "}
                    <strong>{completedParticipants.length}</strong>
                  </p>

                  <p>
                    Your Status:{" "}
                    <strong>{isCompleted ? "Completed" : "Planned"}</strong>
                  </p>

                  <p>
                    Completion Reward:{" "}
                    <strong>
                      {completionXpAwarded
                        ? `${completionRewardXP} XP claimed`
                        : `${completionRewardXP} XP available`}
                    </strong>
                  </p>

                  <p>
                    Accountability Bonus:{" "}
                    <strong>
                      {accountabilityAwarded
                        ? `${ACCOUNTABILITY_BONUS_XP} XP claimed`
                        : accountabilityReady
                        ? `${ACCOUNTABILITY_BONUS_XP} XP ready`
                        : "Waiting for both students"}
                    </strong>
                  </p>

                  {editingLinkSessionId === session.id ? (
                    <div className="party-inline-edit">
                      <label>Meeting link</label>
                      <input
                        type="url"
                        placeholder="https://zoom.us/..."
                        value={linkDraft}
                        onChange={(event) => setLinkDraft(event.target.value)}
                      />

                      <div className="party-inline-edit-actions">
                        <button
                          type="button"
                          onClick={() => handleSaveMeetingLink(session)}
                        >
                          Save Link
                        </button>

                        <button type="button" onClick={cancelEditingLink}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : editingDelaySessionId === session.id ? (
                    <div className="party-inline-edit">
                      <label>New date</label>
                      <input
                        type="date"
                        value={delayDate}
                        onChange={(event) => setDelayDate(event.target.value)}
                      />

                      <label>New time</label>
                      <input
                        type="time"
                        value={delayTime}
                        onChange={(event) => setDelayTime(event.target.value)}
                      />

                      <div className="party-inline-edit-actions">
                        <button
                          type="button"
                          onClick={() => handleDelaySession(session)}
                        >
                          Save New Time
                        </button>

                        <button type="button" onClick={cancelEditingDelay}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="study-party-actions">
                      {session.meetingLink ? (
                        <a
                          href={session.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="join-party-link"
                        >
                          Join Meeting
                        </a>
                      ) : (
                        <span className="no-meeting-link">
                          Meeting link not added yet
                        </span>
                      )}

                      {isOrganizer && !session.meetingLink && (
                        <button
                          type="button"
                          onClick={() => startEditingLink(session)}
                        >
                          Add Meeting Link
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => copyInviteCode(session.inviteCode)}
                      >
                        Copy Code
                      </button>

                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCompleteSharedSession(session.id)
                          }
                        >
                          Complete + Earn {completionRewardXP} XP
                        </button>
                      )}

                      {accountabilityReady && (
                        <button
                          type="button"
                          onClick={() =>
                            handleClaimAccountabilityBonus(session)
                          }
                        >
                          Claim +{ACCOUNTABILITY_BONUS_XP} XP
                        </button>
                      )}

                      {isCompleted &&
                        completionXpAwarded &&
                        accountabilityAwarded && (
                          <span className="no-meeting-link">
                            All Rewards Claimed
                          </span>
                        )}

                      {isOrganizer && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => startEditingDelay(session)}
                        >
                          Delay
                        </button>
                      )}

                      {isOrganizer && (
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => handleDeleteSession(session)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudyParties;