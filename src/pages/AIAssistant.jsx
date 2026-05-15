import { useState } from "react";
import Sidebar from "../components/Sidebar";

function AIAssistant({ setPage }) {
  const [topic, setTopic] = useState("");
  const [projectType, setProjectType] = useState("Extended Essay (EE)");
  const [subject, setSubject] = useState("Math AA HL");
  const [feedback, setFeedback] = useState(null);

  function analyzeQuestion() {
    if (topic.trim() === "") return;

    setFeedback({
      clarity: "Good — your topic is understandable.",
      focus: "Needs narrowing so it fits IB scope.",
      feasibility: "Feasible if you use accessible data and sources.",
      depth: "Strong analytical potential if you compare causes, effects, or evidence.",
      refined: `To what extent does ${topic} affect student performance in ${subject}?`,
      alternatives: [
        `How significant is the relationship between ${topic} and academic achievement in ${subject}?`,
        `To what extent can ${topic} explain differences in student outcomes?`,
        `How does ${topic} influence decision-making or performance within an IB context?`,
      ],
      outline: [
        "Introduction: context, rationale, and research question",
        "Methodology: explain how evidence/data will be collected",
        "Background: define key terms and concepts",
        "Analysis Section 1: main argument or data pattern",
        "Analysis Section 2: counterargument or limitation",
        "Conclusion: answer the research question clearly",
      ],
      sources: [
        "IB subject guide or syllabus",
        "Academic journal articles from Google Scholar",
        "Credible books or textbooks",
        "Primary data, survey, experiment, or case study if relevant",
      ],
    });
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>AI Research Assistant 🧠</h1>

        <p>
          Refine EE and IA research questions, generate outlines, and structure
          your research.
        </p>

        <div className="quest-form" style={{ marginTop: "30px" }}>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option>Extended Essay (EE)</option>
            <option>Internal Assessment (IA)</option>
          </select>

          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option>Math AA HL</option>
            <option>Physics HL</option>
            <option>Chemistry HL</option>
            <option>English SL</option>
          </select>

          <input
            placeholder="Enter your topic or draft research question..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <button onClick={analyzeQuestion}>Analyze</button>
        </div>

        {feedback && (
          <>
            <div className="subject-card" style={{ marginTop: "30px" }}>
              <h2>Research Question Evaluation</h2>
              <p>Project type: {projectType}</p>
              <p>Subject: {subject}</p>
              <p>Clarity: {feedback.clarity}</p>
              <p>Focus: {feedback.focus}</p>
              <p>Feasibility: {feedback.feasibility}</p>
              <p>Analytical depth: {feedback.depth}</p>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Refined Research Question</h2>
              <p>{feedback.refined}</p>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Alternative Research Questions</h2>
              <ul>
                {feedback.alternatives.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Generated Outline</h2>
              <ul>
                {feedback.outline.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="subject-card" style={{ marginTop: "20px" }}>
              <h2>Suggested Source Types</h2>
              <ul>
                {feedback.sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="subject-card" style={{ marginTop: "20px" }}>
          <h2>Academic Integrity Notice</h2>
          <p>
            AI guidance is for support only. Your final EE or IA must be your own
            original work.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AIAssistant;