import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function savePlan(userId, plan) {
  const planRef = doc(collection(db, "users", userId, "plans"));

  const planWithId = {
    ...plan,
    id: planRef.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(planRef, planWithId);

  return planWithId;
}

export async function loadPlans(userId) {
  const plansRef = collection(db, "users", userId, "plans");
  const snapshot = await getDocs(plansRef);

  return snapshot.docs.map((doc) => doc.data());
}

export async function deletePlan(userId, planId) {
  const planRef = doc(db, "users", userId, "plans", planId);
  await deleteDoc(planRef);
}