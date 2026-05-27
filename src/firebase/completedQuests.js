import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function saveCompletedQuest(userId, quest) {
  const completedQuestRef = doc(
    collection(db, "users", userId, "completedQuests")
  );

  const completedQuest = {
    ...quest,
    completedId: completedQuestRef.id,
    completedAt: new Date().toISOString(),
  };

  await setDoc(completedQuestRef, completedQuest);

  return completedQuest;
}

export async function loadCompletedQuests(userId) {
  const completedQuestsRef = collection(
    db,
    "users",
    userId,
    "completedQuests"
  );

  const snapshot = await getDocs(completedQuestsRef);

  return snapshot.docs.map((doc) => doc.data());
}