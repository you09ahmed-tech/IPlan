import { useEffect, useState } from "react";

function FocusMode({ xp, setXP, setPage }) {
  const [seconds, setSeconds] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  useEffect(() => {
    let timer;

    if (isRunning && seconds > 0) {
      timer = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    }

    if (seconds === 0 && !rewarded) {
      const savedFocusMinutes = localStorage.getItem("focusMinutes");
      const currentFocusMinutes = savedFocusMinutes
        ? JSON.parse(savedFocusMinutes)
        : 0;

      localStorage.setItem(
        "focusMinutes",
        JSON.stringify(currentFocusMinutes + 25)
      );

      setXP(xp + 150);
      setRewarded(true);
      setIsRunning(false);
    }

    return () => clearInterval(timer);
  }, [isRunning, seconds, rewarded, setXP, xp]);

  function formatTime() {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  function resetTimer() {
    setSeconds(1500);
    setIsRunning(false);
    setRewarded(false);
  }

  return (
    <div className="focus-page">
      <button onClick={() => setPage("dashboard")} className="back-btn">
        ← Back to Dashboard
      </button>

      <h1>Focus Mode ⏱️</h1>

      <p>Complete real study sessions to earn effort-based XP.</p>

      <div className="focus-card">
        <h2>{formatTime()}</h2>

        <button onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? "Pause Session" : "Start Session"}
        </button>

        <button onClick={resetTimer}>Reset</button>
      </div>

      <p className="integrity-note">
        +150 XP and +25 focus minutes only awarded after completing the full
        session.
      </p>
    </div>
  );
}

export default FocusMode;