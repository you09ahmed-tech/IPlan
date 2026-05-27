import { db } from "./config";

import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

export async function saveUserData(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data);
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

export async function loadUserData(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    return null;
  }
}