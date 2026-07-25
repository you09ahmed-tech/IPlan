function Onboarding({ mode, setMode, setHasOnboarded }) {
  function finishOnboarding() {
    setHasOnboarded(true);
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-hero">
        <h1>Welcome to IPlan 🚀</h1>

        <p>
          Choose how you want IPlan to feel while it helps you organize your
          schoolwork.
        </p>
      </section>

      <section className="onboarding-card">
        <h2>Choose Your Mode</h2>

        <div className="mode-grid">
          <button
            type="button"
            className={mode === "minimalist" ? "mode-option active" : "mode-option"}
            onClick={() => setMode("minimalist")}
          >
            <h3>Minimalist</h3>
            <p>Clean, calm, and distraction-free.</p>
          </button>

          <button
            type="button"
            className={mode === "gamer" ? "mode-option active" : "mode-option"}
            onClick={() => setMode("gamer")}
          >
            <h3>Gamer</h3>
            <p>Dark, energetic, and progress-focused.</p>
          </button>

          <button
            type="button"
            className={mode === "academic" ? "mode-option active" : "mode-option"}
            onClick={() => setMode("academic")}
          >
            <h3>Academic</h3>
            <p>Warm, focused, and study-centered.</p>
          </button>
        </div>

        <p className="selected-mode">
          Selected mode: <strong>{mode}</strong>
        </p>
      </section>

      <section className="onboarding-card">
        <h2>Your Subjects</h2>

        <p>
          Add your real IB subjects, levels, and colors on the Subjects page
          once you're in — they power your tasks, breakdowns, calendar
          sessions, and daily priorities everywhere in the app.
        </p>
      </section>

      <button
        type="button"
        className="primary-action"
        onClick={finishOnboarding}
      >
        Enter Dashboard
      </button>
    </main>
  );
}

export default Onboarding;