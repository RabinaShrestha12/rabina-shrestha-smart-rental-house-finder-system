import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function ProviderChat() {
  const { req_id } = useParams(); // route: /provider/chat/:req_id
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef(null);

  const showToast = (type, msg) => setToast({ type, msg });

  const loadMessages = async () => {
    setLoading(true);
    try {
      // ✅ CORRECT BACKEND ENDPOINT (matches your urls.py)
      const res = await api.get(`provider/maintenance/${req_id}/messages/`);
      setMessages(res.data || []);
      showToast("info", "");
    } catch (e) {
      // show real backend error (important!)
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Could not load messages (check API URL / token).";
      showToast("error", msg);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const sendMessage = async () => {
    const clean = text.trim();
    if (!clean) return;

    try {
      // ✅ CORRECT BACKEND ENDPOINT
      const res = await api.post(`provider/maintenance/${req_id}/messages/send/`, {
        text: clean,
      });
      setText("");
      setMessages((prev) => [...prev, res.data]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to send message.";
      showToast("error", msg);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req_id]);

  return (
    <Shell>
      <div style={styles.wrap}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>Chat (Maintenance #{req_id})</h2>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              Provider ↔ Owner communication
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.btnGhost} onClick={() => nav("/provider")}>
              Back
            </button>
            <button style={styles.btnGhost} onClick={loadMessages}>
              Refresh
            </button>
          </div>
        </div>

        <div style={styles.chatBox}>
          {loading ? (
            <div style={styles.info}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={styles.info}>No messages yet.</div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.msg,
                  ...(m.sender_username ? {} : {}),
                }}
              >
                <div style={styles.msgMeta}>
                  <b>{m.sender_username || "User"}</b>{" "}
                  <span style={{ opacity: 0.7, fontSize: 12 }}>
                    {m.created_at ? String(m.created_at).replace("T", " ").slice(0, 19) : ""}
                  </span>
                </div>
                <div style={styles.msgText}>{m.text}</div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={text}
            placeholder="Type message... (Enter to send)"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button style={styles.btnPrimary} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </Shell>
  );
}

const styles = {
  wrap: { maxWidth: 1000, margin: "0 auto", padding: 16 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
  },
  chatBox: {
    marginTop: 14,
    height: 420,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.03)",
  },
  info: { opacity: 0.85, padding: 8 },
  msg: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    marginBottom: 10,
  },
  msgMeta: { marginBottom: 6 },
  msgText: { lineHeight: 1.45 },
  inputRow: { display: "flex", gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnPrimary: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(124,58,237,0.55)",
    background: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
};