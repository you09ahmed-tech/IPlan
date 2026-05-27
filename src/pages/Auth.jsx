import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../firebase/config";

function Auth() {
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleAuth(event) {
    event.preventDefault();

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="focus-page">
      <h1>IPlan</h1>
      <p>Sign in to save your progress across devices.</p>

      <form className="focus-card" onSubmit={handleAuth}>
        <h2>{isSignup ? "Create Account" : "Log In"}</h2>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "12px", marginBottom: "10px", width: "100%" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "12px", marginBottom: "10px", width: "100%" }}
        />

        <button type="submit">
          {isSignup ? "Sign Up" : "Log In"}
        </button>

        <button type="button" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Already have an account?" : "Need an account?"}
        </button>
      </form>
    </div>
  );
}

export default Auth;