import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "./config";

export async function loadFocusCityProgress(userId) {
  const progressRef = doc(db, "users", userId, "focusCity", "progress");
  const snapshot = await getDoc(progressRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function saveFocusCityProgress(userId, progress) {
  const progressRef = doc(db, "users", userId, "focusCity", "progress");

  await setDoc(
    progressRef,
    {
      ...progress,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}