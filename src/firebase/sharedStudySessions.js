import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./config";

function generateInviteCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

function buildCalendarSession(sharedSession) {
  return {
    id: sharedSession.id,
    title: sharedSession.title,
    goal: sharedSession.goal,
    subject: sharedSession.subject || "",
    taskType: "Shared Study Session",

    dueDate: sharedSession.date,
    date: sharedSession.date,
    time: sharedSession.time,

    duration: sharedSession.duration || "60 minutes",
    durationMinutes: sharedSession.durationMinutes || 60,

    focus: "Collaborative study session with accountability.",

    tasks: [
      "Join the meeting on time.",
      "Share the goal for the session.",
      "Work together or silently with accountability.",
      "Confirm what was completed before leaving.",
    ],

    successCondition:
      "The shared study session is completed with focused progress.",
    dontWorryAbout:
      "Do not worry about perfection. The goal is to make real progress together.",

    source: "Shared Study Session",
    sharedSessionId: sharedSession.id,
    meetingLink: sharedSession.meetingLink || "",
    inviteCode: sharedSession.inviteCode,

    status: "planned",
    createdAt: new Date().toISOString(),

    baseXpAwarded: false,
    collaborationBonusAwarded: false,
    accountabilityBonusAwarded: false,
    xpEarned: 0,
  };
}

async function createCalendarCopyForUser(userId, sharedSession) {
  const sessionRef = doc(
    db,
    "users",
    userId,
    "sessions",
    sharedSession.id
  );

  const calendarSession = buildCalendarSession(sharedSession);

  await setDoc(sessionRef, calendarSession, { merge: true });

  return calendarSession;
}

export async function createSharedStudySession(userId, sessionData) {
  const sharedSessionRef = doc(collection(db, "sharedStudySessions"));
  const inviteCode = generateInviteCode();

  const sharedSession = {
    id: sharedSessionRef.id,
    title: sessionData.title,
    subject: sessionData.subject || "",
    goal: sessionData.goal,
    date: sessionData.date,
    time: sessionData.time,
    duration: sessionData.duration || "60 minutes",
    durationMinutes: sessionData.durationMinutes || 60,
    meetingLink: sessionData.meetingLink || "",
    inviteCode,
    createdBy: userId,
    participants: [userId],
    completedParticipants: [],
    createdAt: new Date().toISOString(),
  };

  await setDoc(sharedSessionRef, sharedSession);

  await createCalendarCopyForUser(userId, sharedSession);

  return sharedSession;
}

export async function joinSharedStudySessionByCode(userId, inviteCode) {
  const cleanedCode = inviteCode.trim().toUpperCase();

  const sessionsRef = collection(db, "sharedStudySessions");
  const sessionQuery = query(
    sessionsRef,
    where("inviteCode", "==", cleanedCode)
  );

  const snapshot = await getDocs(sessionQuery);

  if (snapshot.empty) {
    throw new Error("No shared study session found with this invite code.");
  }

  const sessionDoc = snapshot.docs[0];
  const sharedSession = sessionDoc.data();

  if ((sharedSession.participants || []).includes(userId)) {
    await createCalendarCopyForUser(userId, sharedSession);

    return {
      ...sharedSession,
      alreadyJoined: true,
    };
  }

  await updateDoc(doc(db, "sharedStudySessions", sharedSession.id), {
    participants: arrayUnion(userId),
  });

  const updatedSharedSession = {
    ...sharedSession,
    participants: [...(sharedSession.participants || []), userId],
  };

  await createCalendarCopyForUser(userId, updatedSharedSession);

  return {
    ...updatedSharedSession,
    alreadyJoined: false,
  };
}

export async function loadSharedStudySessionsForUser(userId) {
  const sessionsRef = collection(db, "sharedStudySessions");
  const sessionQuery = query(
    sessionsRef,
    where("participants", "array-contains", userId)
  );

  const snapshot = await getDocs(sessionQuery);

  return snapshot.docs.map((doc) => doc.data());
}

export async function markSharedStudySessionCompleted(sessionId, userId) {
  const sessionRef = doc(db, "sharedStudySessions", sessionId);

  await updateDoc(sessionRef, {
    completedParticipants: arrayUnion(userId),
  });
}

export async function updateSharedStudySessionDetails(sessionId, updates) {
  const sessionRef = doc(db, "sharedStudySessions", sessionId);

  await updateDoc(sessionRef, updates);
}

export async function deleteSharedStudySession(sessionId) {
  const sessionRef = doc(db, "sharedStudySessions", sessionId);

  await deleteDoc(sessionRef);
}