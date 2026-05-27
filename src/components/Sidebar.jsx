import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

function Sidebar({ setPage }) {
  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <aside className="sidebar">
      <h2>IPlan</h2>

      <nav>
        <button onClick={() => setPage("dashboard")}>
          Dashboard
        </button>

        <button onClick={() => setPage("subjects")}>
          Subjects
        </button>

        <button onClick={() => setPage("focus")}>
          Focus Mode
        </button>

        <button onClick={() => setPage("analytics")}>
          Analytics
        </button>

        <button onClick={() => setPage("history")}>
          Quest History
        </button>

        <button onClick={() => setPage("ai")}>
          AI Assistant
        </button>

        <button onClick={() => setPage("planner")}>
          AI Planner
        </button>

        <button onClick={() => setPage("plans")}>
          Saved Plans
        </button>

        <button onClick={() => setPage("calendar")}>
          Calendar
        </button>

        <button onClick={() => setPage("parties")}>
          Study Parties
        </button>

        <button onClick={() => setPage("settings")}>
          Settings
        </button>

        <button onClick={() => setPage("reality")}>
          Reality Mode
        </button>

        <button onClick={handleLogout}>
          Log Out
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;