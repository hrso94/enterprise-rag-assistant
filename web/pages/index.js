import { useState, useEffect } from "react";

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: "#f9f9f9",
    minHeight: "100vh",
  },
  header: {
    marginBottom: "32px",
    borderBottom: "3px solid #0070f3",
    paddingBottom: "16px",
  },
  title: { fontSize: "26px", margin: "0 0 6px 0", color: "#1a1a1a", fontWeight: "700" },
  subtitle: { fontSize: "13px", color: "#666", margin: "0" },
  section: {
    marginBottom: "20px",
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  sectionTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 12px 0", color: "#333" },
  input: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontFamily: "inherit",
    outline: "none",
  },
  button: {
    padding: "8px 16px",
    marginLeft: "8px",
    background: "#0070f3",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  buttonDanger: { background: "#d32f2f" },
  status: { marginTop: "8px", fontSize: "12px", color: "#666" },
  historyItem: {
    marginBottom: "12px",
    padding: "14px",
    background: "#f8fbff",
    borderLeft: "3px solid #0070f3",
    borderRadius: "4px",
  },
  historyQ: { fontWeight: "600", color: "#0070f3", marginBottom: "6px", fontSize: "13px" },
  historyA: { fontSize: "13px", color: "#222", whiteSpace: "pre-wrap", lineHeight: "1.6" },
  sources: {
    marginTop: "8px",
    fontSize: "11px",
    color: "#666",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  sourceTag: {
    background: "#e8f0fe",
    color: "#1a56db",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "500",
  },
  meta: { fontSize: "11px", color: "#aaa", marginTop: "4px" },
  modal: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modalContent: {
    background: "#fff", borderRadius: "8px", padding: "24px",
    maxWidth: "640px", width: "90%", maxHeight: "80vh", overflowY: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("ragHistory");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const persistHistory = (next) => {
    setHistory(next);
    localStorage.setItem("ragHistory", JSON.stringify(next));
  };

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("File too large (max 10 MB)");
      return;
    }

    setUploadStatus("Reading file...");
    const content = await file.text();

    setUploadStatus("Indexing document...");
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, content }),
    });

    const data = await res.json();
    setUploadStatus(
      data.ok
        ? `Indexed: ${file.name} (${data.chunkCount} chunks)`
        : `Error: ${data.error}`
    );
    e.target.value = "";
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setQueryStatus("Searching...");
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question }),
    });

    const data = await res.json();

    if (data.answer) {
      const entry = {
        question,
        answer: data.answer,
        sources: data.sources || [],
        retrievedChunks: data.retrievedChunks ?? 0,
        time: new Date().toLocaleTimeString(),
      };
      persistHistory([entry, ...history]);
      setQuestion("");
      setQueryStatus("");
    } else {
      setQueryStatus(`Error: ${data.error}`);
    }
  }

  const clearHistory = () => {
    if (window.confirm("Clear conversation history?")) {
      persistHistory([]);
      setSelectedIdx(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Enterprise RAG Assistant</h1>
        <p style={styles.subtitle}>Upload documents and ask questions powered by hybrid semantic search</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Upload Document</h2>
        <input
          type="file"
          style={styles.input}
          onChange={handleUpload}
          accept=".txt,.md,.pdf,.docx,.json"
        />
        {uploadStatus && <div style={styles.status}>{uploadStatus}</div>}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Ask a Question</h2>
        <form onSubmit={handleAsk} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to know?"
            style={{ ...styles.input, flexGrow: 1 }}
          />
          <button style={styles.button} type="submit">Ask</button>
        </form>
        {queryStatus && <div style={styles.status}>{queryStatus}</div>}
      </div>

      <div style={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
            Conversation History {history.length > 0 && `(${history.length})`}
          </h2>
          {history.length > 0 && (
            <button
              style={{ ...styles.button, ...styles.buttonDanger, marginLeft: 0, padding: "6px 12px", fontSize: "12px" }}
              onClick={clearHistory}
            >
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p style={{ color: "#999", margin: 0, fontSize: "13px" }}>No questions yet.</p>
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              style={{ ...styles.historyItem, cursor: "pointer" }}
              onClick={() => setSelectedIdx(idx)}
            >
              <div style={styles.historyQ}>{item.question}</div>
              <div style={styles.historyA}>
                {item.answer.length > 300 ? item.answer.slice(0, 300) + "..." : item.answer}
              </div>
              {item.sources?.length > 0 && (
                <div style={styles.sources}>
                  <span style={{ color: "#999" }}>Sources:</span>
                  {item.sources.map((s, i) => (
                    <span key={i} style={styles.sourceTag}>{s}</span>
                  ))}
                  <span style={{ color: "#bbb" }}>· {item.retrievedChunks} chunks</span>
                </div>
              )}
              <div style={styles.meta}>{item.time}</div>
            </div>
          ))
        )}
      </div>

      {selectedIdx !== null && (
        <div style={styles.modal} onClick={() => setSelectedIdx(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{ fontSize: "20px", cursor: "pointer", color: "#666", marginBottom: "12px" }}
              onClick={() => setSelectedIdx(null)}
            >
              ✕
            </div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1a1a1a" }}>
              {history[selectedIdx].question}
            </h3>
            <div style={{ ...styles.historyA, background: "#f9f9f9", padding: "12px", borderRadius: "4px" }}>
              {history[selectedIdx].answer}
            </div>
            {history[selectedIdx].sources?.length > 0 && (
              <div style={{ ...styles.sources, marginTop: "12px" }}>
                <span style={{ color: "#999" }}>Sources:</span>
                {history[selectedIdx].sources.map((s, i) => (
                  <span key={i} style={styles.sourceTag}>{s}</span>
                ))}
                <span style={{ color: "#bbb" }}>
                  · {history[selectedIdx].retrievedChunks} chunks retrieved
                </span>
              </div>
            )}
            <div style={{ ...styles.meta, marginTop: "8px" }}>{history[selectedIdx].time}</div>
          </div>
        </div>
      )}
    </div>
  );
}
