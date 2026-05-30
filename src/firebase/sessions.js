import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function saveStudySession(userId, session) {
  const sessionRef = doc(collection(db, "users", userId, "sessions"));

  const sessionWithId = {
    ...session,
    id: sessionRef.id,
    status: session.status || "planned",
    createdAt: new Date().toISOString(),
  };

  await setDoc(sessionRef, sessionWithId);

  return sessionWithId;
}

export async function loadStudySessions(userId) {
  const sessionsRef = collection(db, "users", userId, "sessions");
  const snapshot = await getDocs(sessionsRef);

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    status: doc.data().status || "planned",
  }));
}

export async function updateStudySession(userId, sessionId, updates) {
  const sessionRef = doc(db, "users", userId, "sessions", sessionId);

  await updateDoc(sessionRef, updates);
}