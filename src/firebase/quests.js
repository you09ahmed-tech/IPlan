import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function saveQuest(userId, quest) {
  const questRef = doc(collection(db, "users", userId, "quests"));

  const questWithId = {
    ...quest,
    id: questRef.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(questRef, questWithId);

  return questWithId;
}

export async function loadQuests(userId) {
  const questsRef = collection(db, "users", userId, "quests");
  const snapshot = await getDocs(questsRef);

  return snapshot.docs.map((doc) => doc.data());
}

export async function removeQuest(userId, questId) {
  const questRef = doc(db, "users", userId, "quests", questId);

  await deleteDoc(questRef);
}