function Onboarding({ setHasOnboarded, mode, setMode }) {
  function enterDashboard() {
    setHasOnboarded(true);
  }

  return (
    <div className="focus-page">
      <h1>Welcome to IBStudyQuest 🚀</h1>

      <p>
        Set up your IB subjects and choose how you want the app to support you.
      </p>

      <div className="focus-card">
        <h2>Choose Your Mode</h2>

        <button onClick={() => setMode("minimalist")}>
          Minimalist
        </button>

        <button onClick={() => setMode("gamer")}>
          Gamer
        </button>

        <button onClick={() => setMode("academic")}>
          Academic
        </button>

        <p style={{ marginTop: "15px" }}>
          Selected mode: {mode}
        </p>
      </div>

      <div className="focus-card">
        <h2>Your IB Subjects</h2>

        <p>
          For now, subjects are using demo data. Later, you’ll customize HL and
          SL subjects here.
        </p>
      </div>

      <button className="back-btn" onClick={enterDashboard}>
        Enter Dashboard
      </button>
    </div>
  );
}

export default Onboarding;