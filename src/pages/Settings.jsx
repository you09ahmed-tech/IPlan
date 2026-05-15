import Sidebar from "../components/Sidebar";

function Settings({ setPage, mode, setMode }) {
  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Settings ⚙️</h1>

        <p>Choose how IBStudyQuest should feel while you study.</p>

        <div className="subject-card" style={{ marginTop: "30px" }}>
          <h2>UI Mode</h2>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{
              marginTop: "15px",
              padding: "12px",
              borderRadius: "10px",
              background: "#2d2d44",
              color: "white",
              border: "1px solid #3f3f5f",
            }}
          >
            <option value="gamer">Gamer</option>
            <option value="minimalist">Minimalist</option>
            <option value="academic">Academic</option>
          </select>

          <p style={{ marginTop: "15px" }}>
            Current mode: {mode}
          </p>
        </div>
      </main>
    </div>
  );
}

export default Settings;