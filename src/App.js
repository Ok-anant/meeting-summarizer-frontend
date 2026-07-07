import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [view, setView] = useState("home"); // "home" or "history"

  // Check if URL has a meeting ID (from extension link)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/meeting\/(\d+)/);
    if (match) {
      fetchMeeting(parseInt(match[1]));
      setView("history");
    }
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/meetings");
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error("Could not fetch meetings");
    }
  };

  const fetchMeeting = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/meetings/${id}`);
      const data = await res.json();
      if (data.success) setSelectedMeeting(data);
    } catch (err) {
      console.error("Could not fetch meeting");
    }
  };

  const handleSummarize = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError("Failed to generate summary.");
    } catch {
      setError("Could not reach the server.");
    }
    setLoading(false);
  };

  const handleFileSummarize = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/summarize-media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error || "Failed.");
    } catch {
      setError("Could not reach the server.");
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <h1>🎙️ Meeting Summarizer</h1>

      {/* Navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setView("home")}
          style={{ marginRight: "1rem", opacity: view === "home" ? 1 : 0.5 }}
        >
          New Summary
        </button>
        <button
          onClick={() => { setView("history"); fetchMeetings(); }}
          style={{ opacity: view === "history" ? 1 : 0.5 }}
        >
          History ({meetings.length})
        </button>
      </div>

      {/* Home View */}
      {view === "home" && (
        <>
          <textarea
            rows={8}
            placeholder="Paste your meeting transcript here..."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
          <button onClick={handleSummarize} disabled={loading}>
            {loading ? "Summarizing..." : "Summarize Text"}
          </button>

          <div className="upload-section">
            <p>— OR —</p>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={e => setFile(e.target.files[0])}
            />
            <button onClick={handleFileSummarize} disabled={loading || !file}>
              {loading ? "Processing..." : "Summarize Audio/Video"}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {result && <SummaryDisplay data={result} />}
        </>
      )}

      {/* History View */}
      {view === "history" && (
        <div>
          {selectedMeeting && (
            <div style={{ marginBottom: "2rem" }}>
              <button onClick={() => setSelectedMeeting(null)}>← Back to list</button>
              <p style={{ color: "#888", fontSize: "0.85rem", margin: "0.5rem 0" }}>
                {selectedMeeting.source} · {new Date(selectedMeeting.created_at).toLocaleString()}
              </p>
              <SummaryDisplay data={selectedMeeting.data} />
            </div>
          )}

          {!selectedMeeting && (
            meetings.length === 0 ? (
              <p style={{ color: "#888" }}>No meetings yet. Use the extension or upload a file.</p>
            ) : (
              meetings.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  style={{
                    background: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "0.75rem",
                    cursor: "pointer",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "0.9rem" }}>
                    Meeting #{m.id} · {m.source}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", color: "#888", fontSize: "0.8rem" }}>
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
                    {m.summary.summary?.[0] || "No summary available"}
                  </p>
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

function SummaryDisplay({ data }) {
  return (
    <div className="results">
      <div className="section">
        <h2>📋 Summary</h2>
        <ul>{data.summary?.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>
      <div className="section">
        <h2>✅ Key Decisions</h2>
        {data.key_decisions?.length > 0
          ? <ul>{data.key_decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
          : <p className="empty">No decisions recorded.</p>}
      </div>
      <div className="section">
        <h2>🎯 Action Items</h2>
        {data.action_items?.length > 0
          ? <table>
              <thead><tr><th>Task</th><th>Deadline</th></tr></thead>
              <tbody>
                {data.action_items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.task}</td>
                    <td>{item.deadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          : <p className="empty">No action items.</p>}
      </div>
      <div className="section">
        <h2>❓ Unresolved</h2>
        {data.unresolved?.length > 0
          ? <ul>{data.unresolved.map((q, i) => <li key={i}>{q}</li>)}</ul>
          : <p className="empty">No unresolved questions.</p>}
      </div>
    </div>
  );
}