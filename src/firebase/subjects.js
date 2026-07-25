import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "./config";

export async function loadSubjects(userId) {
  const subjectsRef = collection(db, "users", userId, "subjects");
  const snapshot = await getDocs(subjectsRef);

  return snapshot.docs.map((doc) => doc.data());
}

export async function saveSubject(userId, subject) {
  const subjectRef = doc(collection(db, "users", userId, "subjects"));

  const subjectWithId = {
    ...subject,
    id: subjectRef.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(subjectRef, subjectWithId);

  return subjectWithId;
}

export async function deleteSubject(userId, subjectId) {
  const subjectRef = doc(db, "users", userId, "subjects", subjectId);
  await deleteDoc(subjectRef);
}