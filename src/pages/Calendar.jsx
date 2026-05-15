import Sidebar from "../components/Sidebar";

const days = [
  { day: "Mon", load: "Low", color: "#22c55e" },
  { day: "Tue", load: "Medium", color: "#eab308" },
  { day: "Wed", load: "High", color: "#ef4444" },
  { day: "Thu", load: "Medium", color: "#eab308" },
  { day: "Fri", load: "Low", color: "#22c55e" },
  { day: "Sat", load: "High", color: "#ef4444" },
  { day: "Sun", load: "Low", color: "#22c55e" },
];

function Calendar({ setPage }) {
  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Calendar + IB Pressure Map 📅</h1>
        <p>See which days are overloaded before burnout happens.</p>

        <div className="subjects-grid" style={{ marginTop: "30px" }}>
          {days.map((day, index) => (
            <div className="subject-card" key={index}>
              <h2>{day.day}</h2>
              <p>{day.load} workload</p>

              <div
                style={{
                  height: "12px",
                  borderRadius: "999px",
                  background: day.color,
                  marginTop: "15px",
                }}
              ></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Calendar;