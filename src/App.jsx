import { useEffect, useState } from "react";

import Dashboard from "./pages/Dashboard";
import FocusMode from "./pages/FocusMode";
import Subjects from "./pages/Subjects";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import RealityMode from "./pages/RealityMode";
import Onboarding from "./pages/Onboarding";
import StudyParties from "./pages/StudyParties";

function App() {
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    const savedOnboarding = localStorage.getItem("hasOnboarded");
    return savedOnboarding ? JSON.parse(savedOnboarding) : false;
  });

  const [page, setPage] = useState("dashboard");

  const [xp, setXP] = useState(() => {
    const savedXP = localStorage.getItem("xp");
    return savedXP ? JSON.parse(savedXP) : 2850;
  });

  const [streak, setStreak] = useState(() => {
    const savedStreak = localStorage.getItem("streak");
    return savedStreak ? JSON.parse(savedStreak) : 1;
  });

  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem("mode");
    return savedMode ? JSON.parse(savedMode) : "gamer";
  });

  useEffect(() => {
    localStorage.setItem("hasOnboarded", JSON.stringify(hasOnboarded));
  }, [hasOnboarded]);

  useEffect(() => {
    localStorage.setItem("xp", JSON.stringify(xp));
  }, [xp]);

  useEffect(() => {
    localStorage.setItem("streak", JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    localStorage.setItem("mode", JSON.stringify(mode));
  }, [mode]);

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
          setPage={setPage}
          xp={xp}
          setXP={setXP}
          streak={streak}
          setStreak={setStreak}
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

      {page === "analytics" && (
        <Analytics setPage={setPage} xp={xp} />
      )}

      {page === "ai" && <AIAssistant setPage={setPage} />}

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