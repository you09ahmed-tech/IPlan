import Sidebar from "../components/Sidebar";

const GUIDE_SECTIONS = [
  {
    heading: "Plan",
    items: [
      {
        title: "Dashboard",
        description:
          "Your daily command center — shows what to work on first and tracks real progress.",
        page: "dashboard",
      },
      {
        title: "Today's Priority",
        description:
          "IPlan's #1 recommended task or session right now, with a reason and a next step.",
        page: null,
      },
      {
        title: "AI Assistant",
        description:
          "Describe a task in plain language and get a specific, rule-based next step.",
        page: "ai",
      },
      {
        title: "AI Breakdown Planner",
        description:
          "Turn a large IB task into sessions, milestones, and next actions.",
        page: "breakdown",
      },
      {
        title: "Vacation Mode",
        description:
          "Build a realistic catch-up schedule for holidays or breaks, with rest days respected.",
        page: "vacation",
      },
    ],
  },
  {
    heading: "Act",
    items: [
      {
        title: "Saved Plans",
        description: "Store larger plans so you can schedule or track them later.",
        page: "plans",
      },
      {
        title: "Calendar",
        description: "See and manage your planned study sessions.",
        page: "calendar",
      },
      {
        title: "Focus Mode",
        description:
          "Run a distraction-free timer linked to your current task, and grow your Focus City.",
        page: "focus",
      },
      {
        title: "Study Parties",
        description:
          "Study with a friend in real time using a shared session and invite code.",
        page: "parties",
      },
    ],
  },
  {
    heading: "Review",
    items: [
      {
        title: "Study History",
        description: "A record of everything you've completed, filterable by subject and type.",
        page: "history",
      },
      {
        title: "Analytics",
        description:
          "Real insight into your workload — deadline pressure, consistency, and pressure points.",
        page: "analytics",
      },
      {
        title: "Subjects",
        description: "Manage your IB subjects — they power tasks, breakdowns, and priorities everywhere.",
        page: "subjects",
      },
      {
        title: "Settings",
        description: "Choose your theme, set defaults, and manage local app data.",
        page: "settings",
      },
    ],
  },
];

function Guide({ setPage }) {
  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">How IPlan Works</p>
            <h1>IPlan Guide</h1>
            <p>A one-line reference for every feature.</p>
          </div>

          <button type="button" className="secondary-btn" onClick={() => setPage("dashboard")}>
            Back to Dashboard
          </button>
        </div>

        {GUIDE_SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="section-title">{section.heading}</h2>

            <div className="guide-grid">
              {section.items.map((item) => (
                <div className="guide-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  {item.page && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setPage(item.page)}
                    >
                      Open
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export default Guide;
