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
import AIPlanner from "./pages/AIPlanner";
import Plans from "./pages/Plans";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import RealityMode from "./pages/RealityMode";
import Onboarding from "./pages/Onboarding";
import StudyParties from "./pages/StudyParties";
import History from "./pages/History";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [xp, setXP] = useState(2850);
  const [streak, setStreak] = useState(1);
  const [mode, setMode] = useState("gamer");
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        const data = await loadUserData(currentUser.uid);
        const cloudQuests = await loadQuests(currentUser.uid);

        if (data) {
          setHasOnboarded(data.hasOnboarded ?? false);
          setXP(data.xp ?? 2850);
          setStreak(data.streak ?? 1);
          setMode(data.mode ?? "gamer");
        }

        setQuests(cloudQuests);
        setCloudLoaded(true);
      } else {
        setCloudLoaded(false);
        setQuests([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !cloudLoaded) return;

    saveUserData(user.uid, {
      hasOnboarded,
      xp,
      streak,
      mode,
      updatedAt: new Date().toISOString(),
    });
  }, [user, cloudLoaded, hasOnboarded, xp, streak, mode]);

  if (authLoading || (user && !cloudLoaded)) {
    return <div className="focus-page">Loading IPlan...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  if (!hasOnboarded) {
    return (
      <Onboarding
        setPage={setPage}
        setHasOnboarded={setHasOnboarded}
        mode={mode}
        setMode={setMode}
      />
    );
  }

  return (
    <div className={`app-mode ${mode}`}>
      {page === "dashboard" && (
        <Dashboard
          user={user}
          setPage={setPage}
          xp={xp}
          setXP={setXP}
          streak={streak}
          setStreak={setStreak}
          quests={quests}
          setQuests={setQuests}
        />
      )}

      {page === "focus" && (
        <FocusMode
          setPage={setPage}
          xp={xp}
          setXP={setXP}
          streak={streak}
          setStreak={setStreak}
        />
      )}

      {page === "subjects" && <Subjects setPage={setPage} />}

      {page === "analytics" && <Analytics setPage={setPage} xp={xp} />}

      {page === "history" && <History user={user} setPage={setPage} />}

      {page === "ai" && <AIAssistant setPage={setPage} />}

      {page === "planner" && <AIPlanner setPage={setPage} />}

      {page === "plans" && <Plans setPage={setPage} />}

      {page === "calendar" && <Calendar setPage={setPage} />}

      {page === "settings" && (
        <Settings setPage={setPage} mode={mode} setMode={setMode} />
      )}

      {page === "reality" && <RealityMode setPage={setPage} />}

      {page === "parties" && <StudyParties setPage={setPage} />}
    </div>
  );
}

export default App;