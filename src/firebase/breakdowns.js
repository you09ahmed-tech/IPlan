import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function saveBreakdown(userId, breakdown) {
  const breakdownRef = doc(
    collection(db, "users", userId, "breakdowns")
  );

  const breakdownWithId = {
    ...breakdown,
    id: breakdownRef.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(breakdownRef, breakdownWithId);

  return breakdownWithId;
}

export async function loadBreakdowns(userId) {
  const breakdownsRef = collection(db, "users", userId, "breakdowns");
  const snapshot = await getDocs(breakdownsRef);

  return snapshot.docs.map((doc) => doc.data());
}