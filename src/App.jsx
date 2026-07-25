import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase/config";
import { loadUserData, saveUserData } from "./firebase/firestore";
import { loadQuests } from "./firebase/quests";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import Subjects from "./pages/Subjects";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import Breakdown from "./pages/Breakdown";
import Plans from "./pages/Plans";
import Calendar from "./pages/Calendar";
import VacationMode from "./pages/VacationMode";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import StudyParties from "./pages/StudyParties";
import History from "./pages/History";
import Guide from "./pages/Guide";

import "./styles/dashboard.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quests, setQuests] = useState([]);
  const [mode, setMode] = useState("minimalist");
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        try {
          const savedData = await loadUserData(currentUser.uid);
          const savedQuests = await loadQuests(currentUser.uid);

          if (savedData) {
            setXP(savedData.xp || 0);
            setStreak(savedData.streak || 0);
            setMode(savedData.mode || "minimalist");
            setHasOnboarded(savedData.hasOnboarded || false);
          }

          setQuests(savedQuests || []);
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    async function saveCurrentUserData() {
      try {
        await saveUserData(user.uid, {
          xp,
          streak,
          mode,
          hasOnboarded,
        });
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    }

    saveCurrentUserData();
  }, [user, xp, streak, mode, hasOnboarded]);

  if (authLoading) {
    return (
      <div className={`app ${mode}`}>
        <main className="main-content">
          <h1>Loading IPlan...</h1>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`app ${mode}`}>
        <Auth />
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className={`app ${mode}`}>
        <Onboarding
          mode={mode}
          setMode={setMode}
          setHasOnboarded={setHasOnboarded}
        />
      </div>
    );
  }

  return (
    <div className={`app ${mode}`}>
      {page === "dashboard" && (
        <Dashboard
          user={user}
          xp={xp}
          setXP={setXP}
          streak={streak}
          setStreak={setStreak}
          quests={quests}
          setQuests={setQuests}
          setPage={setPage}
        />
      )}

      {page === "subjects" && <Subjects setPage={setPage} />}

      {page === "focus" && (
        <FocusMode
          setPage={setPage}
          xp={xp}
          setXP={setXP}
          streak={streak}
          setStreak={setStreak}
          quests={quests}
          setQuests={setQuests}
        />
      )}

      {page === "analytics" && <Analytics setPage={setPage} />}

      {page === "history" && <History setPage={setPage} />}

      {page === "ai" && (
        <AIAssistant
          setPage={setPage}
          quests={quests}
          setQuests={setQuests}
        />
      )}

      {page === "breakdown" && (
        <Breakdown
          setPage={setPage}
          quests={quests}
          setQuests={setQuests}
        />
      )}

      {page === "plans" && (
        <Plans
          setPage={setPage}
          quests={quests}
          setQuests={setQuests}
        />
    )}

      {page === "calendar" && <Calendar setPage={setPage} />}

      {page === "vacation" && <VacationMode setPage={setPage} />}

      {page === "parties" && (
        <StudyParties
          setPage={setPage}
          setXP={setXP}
        />
      )}

      {page === "settings" && (
        <Settings
          setPage={setPage}
          mode={mode}
          setMode={setMode}
          user={user}
        />
      )}

      {page === "guide" && <Guide setPage={setPage} />}
    </div>
  );
}

export default App;