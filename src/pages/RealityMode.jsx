import Sidebar from "../components/Sidebar";

function RealityMode({ setPage }) {
  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Reality Mode 🧘</h1>

        <p>
          A calm study space with no XP, levels, streaks, or game pressure.
        </p>

        <div className="subject-card" style={{ marginTop: "30px" }}>
          <h2>Pure Study Mode</h2>

          <p>
            Use this mode when you want to focus without rewards, competition,
            or progress pressure.
          </p>
        </div>

        <div className="subject-card" style={{ marginTop: "20px" }}>
          <h2>Today’s Focus</h2>

          <ul>
            <li>Choose one important task</li>
            <li>Work deeply for 25 minutes</li>
            <li>Reflect briefly after finishing</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default RealityMode;