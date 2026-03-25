import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function getBackendBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  );
}

function buildFullMediaUrl(raw) {
  if (!raw) return "";

  const value = String(raw).trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${getBackendBaseUrl()}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${getBackendBaseUrl()}/${value}`;
  }

  return `${getBackendBaseUrl()}/media/${value}`;
}

function getMsgText(m) {
  return m?.text || m?.message || m?.body || m?.content || "";
}

function getMsgImage(m) {
  const raw =
    m?.image_url ||
    m?.image ||
    m?.picture ||
    m?.photo ||
    m?.file ||
    m?.attachment ||
    m?.media ||
    m?.media_url ||
    "";
  return buildFullMediaUrl(raw);
}

export default function ProviderChat() {
  const { req_id } = useParams(); // route: /provider/chat/:req_id
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (type, msg) => setToast({ type, msg });

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const normalizeMessages = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.messages)) return data.messages;
    return [];
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get(`provider/maintenance/${req_id}/messages/`);
      setMessages(normalizeMessages(res.data));
      showToast("info", "");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Could not load messages (check API URL / token).";
      showToast("error", msg);
      setMessages([]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req_id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please choose a valid image file.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    const clean = text.trim();

    if (!clean && !selectedImage) {
      showToast("error", "Type a message or choose an image first.");
      return;
    }

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("text", clean);
      formData.append("message", clean);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const res = await api.post(
        `provider/maintenance/${req_id}/messages/send/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setText("");
      clearSelectedImage();
      setMessages((prev) => [...prev, res.data]);
      scrollBottom();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to send message.";
      showToast("error", msg);
    } finally {
      setSending(false);
    }
  };

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
            messages.map((m) => {
              const msgImage = getMsgImage(m);
              const msgText = getMsgText(m);

              return (
                <div key={m.id} style={styles.msg}>
                  <div style={styles.msgMeta}>
                    <b>{m.sender_username || m.sender_name || "User"}</b>{" "}
                    <span style={{ opacity: 0.7, fontSize: 12 }}>
                      {m.created_at
                        ? String(m.created_at).replace("T", " ").slice(0, 19)
                        : ""}
                    </span>
                  </div>

                  {msgImage ? (
                    <div style={styles.imageWrap}>
                      <img
                        src={msgImage}
                        alt="chat upload"
                        style={styles.messageImage}
                        onError={(e) => {
                          console.log("Provider chat image failed:", msgImage, m);
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}

                  {msgText ? <div style={styles.msgText}>{msgText}</div> : null}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div style={styles.composer}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

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

            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              Image
            </button>

            <button
              style={styles.btnPrimary}
              onClick={sendMessage}
              disabled={sending}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>

          <div style={styles.fileRow}>
            {selectedImage ? (
              <span style={styles.fileName}>{selectedImage.name}</span>
            ) : (
              <span style={styles.fileHint}>No image selected</span>
            )}
          </div>

          {previewUrl ? (
            <div style={styles.previewCard}>
              <img src={previewUrl} alt="preview" style={styles.previewImage} />
              <button
                type="button"
                style={styles.removeBtn}
                onClick={clearSelectedImage}
                disabled={sending}
              >
                Remove Image
              </button>
            </div>
          ) : null}
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
  msgText: { lineHeight: 1.45, marginTop: 8 },
  imageWrap: {
    marginTop: 6,
  },
  messageImage: {
    maxWidth: 240,
    width: "100%",
    maxHeight: 240,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    display: "block",
  },
  composer: {
    marginTop: 12,
  },
  inputRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 220,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  fileRow: {
    marginTop: 8,
  },
  fileName: {
    fontSize: 13,
    opacity: 0.9,
    wordBreak: "break-all",
  },
  fileHint: {
    fontSize: 13,
    opacity: 0.65,
  },
  previewCard: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
  },
  previewImage: {
    maxWidth: 180,
    maxHeight: 180,
    width: "100%",
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
  },
  removeBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
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