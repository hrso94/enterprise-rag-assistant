import { useState, useEffect } from "react";

const styles = {
  container: {
    maxWidth: "1000px",
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
  title: {
    fontSize: "28px",
    margin: "0 0 8px 0",
    color: "#333",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "0",
  },
  section: {
    marginBottom: "24px",
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: "18px",
    margin: "0 0 12px 0",
    color: "#333",
  },
  input: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontFamily: "inherit",
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
  buttonSmall: {
    padding: "4px 8px",
    marginLeft: "4px",
    fontSize: "12px",
    background: "#0070f3",
  },
  buttonDanger: {
    background: "#d32f2f",
    marginLeft: "8px",
  },
  status: {
    marginTop: "8px",
    fontSize: "12px",
    color: "#666",
  },
  history: {
    maxHeight: "400px",
    overflowY: "auto",
  },
  historyItem: {
    marginBottom: "12px",
    padding: "12px",
    background: "#f0f7ff",
    borderLeft: "3px solid #0070f3",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  historyQ: {
    fontWeight: "600",
    color: "#0070f3",
    marginBottom: "4px",
    fontSize: "13px",
  },
  historyA: {
    fontSize: "13px",
    color: "#333",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },
  footer: {
    marginTop: "24px",
    padding: "16px",
    background: "#f0f0f0",
    borderRadius: "4px",
    textAlign: "center",
    color: "#666",
    fontSize: "12px",
  },
  modal: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "1000",
  },
  modalContent: {
    background: "#fff",
    borderRadius: "8px",
    padding: "24px",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  modalClose: {
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
    marginBottom: "16px",
    fontWeight: "bold",
  },
};

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("ragHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("ragHistory", JSON.stringify(newHistory));
  };

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }

    setStatus("Reading file...");
    const text = await file.text();
    setFileName(file.name);

    setStatus("Uploading and processing...");
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, content: text }),
    });

    const data = await res.json();
    setStatus(data.ok ? `✓ Uploaded: ${file.name}` : `Error: ${data.error}`);
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setStatus("Searching documents...");
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (data.answer) {
      const newItem = { question, answer: data.answer, time: new Date().toLocaleTimeString() };
      saveHistory([newItem, ...history]);
      setQuestion("");
      setStatus("✓ Done");
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  const clearHistory = () => {
    if (window.confirm("Clear conversation history?")) {
      saveHistory([]);
      setStatus("History cleared");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 RAG Agent</h1>
        <p style={styles.subtitle}>Upload documents and ask questions powered by AI retrieval</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📄 Upload Document</h2>
        <input type="file" style={styles.input} onChange={handleUpload} accept=".txt,.md,.pdf,.docx,.json" />
        {fileName && <div style={{ marginTop: "8px", fontSize: "13px", color: "#0070f3" }}>✓ {fileName}</div>}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>❓ Ask Question</h2>
        <form onSubmit={handleAsk}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to know?"
            style={{ ...styles.input, width: "100%", minHeight: "36px" }}
          />
          <button style={styles.button} type="submit">
            Ask
          </button>
        </form>
        <div style={styles.status}>{status}</div>
      </div>

      <div style={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={styles.sectionTitle}>💬 Conversation History ({history.length})</h2>
          {history.length > 0 && (
            <button style={{ ...styles.button, ...styles.buttonDanger, margin: 0 }} onClick={clearHistory}>
              Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p style={{ color: "#999", margin: "0", fontSize: "13px" }}>No questions yet. Ask something above.</p>
        ) : (
          <div style={styles.history}>
            {history.map((item, idx) => (
              <div
                key={idx}
                style={{ ...styles.historyItem, background: selectedItem === idx ? "#e3f2fd" : "#f0f7ff" }}
                onClick={() => setSelectedItem(idx)}
              >
                <div style={styles.historyQ}>Q: {item.question}</div>
                <div style={styles.historyA}>{item.answer}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>{item.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem !== null && (
        <div style={styles.modal} onClick={() => setSelectedItem(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalClose} onClick={() => setSelectedItem(null)}>
              ✕
            </div>
            <h3 style={{ margin: "0 0 12px 0" }}>{history[selectedItem].question}</h3>
            <div style={{ ...styles.historyA, background: "#f9f9f9", padding: "12px", borderRadius: "4px" }}>
              {history[selectedItem].answer}
            </div>
            <div style={{ marginTop: "12px", fontSize: "11px", color: "#999" }}>
              {history[selectedItem].time}
            </div>
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <p style={{ margin: "0" }}>💡 Tip: Upload multiple documents to search across all of them. Click history items to see full answers.</p>
      </div>
    </div>
  );
}
