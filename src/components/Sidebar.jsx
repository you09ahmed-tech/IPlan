function Sidebar({ setPage }) {
  return (
    <aside className="sidebar">
      <h2>IBStudyQuest</h2>

      <nav>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("subjects")}>Subjects</button>
        <button onClick={() => setPage("focus")}>Focus Mode</button>
        <button onClick={() => setPage("analytics")}>Analytics</button>
        <button onClick={() => setPage("ai")}>AI Assistant</button>
        <button onClick={() => setPage("calendar")}>Calendar</button>
        <button onClick={() => setPage("parties")}>Study Parties</button>
        <button onClick={() => setPage("settings")}>Settings</button>
        <button onClick={() => setPage("reality")}>Reality Mode</button>
      </nav>
    </aside>
  );
}

export default Sidebar;