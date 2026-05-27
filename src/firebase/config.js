import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGbl-24KdzjXI7E8IzgSnLdcrhdZHoXy8",
  authDomain: "iplan-a2bd0.firebaseapp.com",
  projectId: "iplan-a2bd0",
  storageBucket: "iplan-a2bd0.firebasestorage.app",
  messagingSenderId: "1011025593721",
  appId: "1:1011025593721:web:ee84e6d2b3b392001e9ba8",
  measurementId: "G-7E7489EPWC"
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;