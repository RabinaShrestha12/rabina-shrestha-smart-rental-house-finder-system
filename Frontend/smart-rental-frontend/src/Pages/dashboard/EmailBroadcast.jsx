import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios"; // ✅ your axios instance (baseURL should be .../api/)

export default function EmailBroadcast() {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);

  const [sendMode, setSendMode] = useState("all"); // "all" | "selected"
  const [selectedEmails, setSelectedEmails] = useState([]);

  const [type, setType] = useState("announcement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ kind: "", text: "" }); // success | error

  // search/filter
  const [q, setQ] = useState("");

  // ✅ LOAD USERS (Admin only)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingUsers(true);
        setStatus({ kind: "", text: "" });

        // ✅ MATCHES DJANGO: path("admin/users/", list_all_users)
        // If axios baseURL ends with /api/, this becomes: /api/admin/users/
        const res = await api.get("admin/users/");

        if (!mounted) return;

        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setUsers(list);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to load users. Check admin permission and endpoint /api/admin/users/";
        setStatus({ kind: "error", text: msg });
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;

    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return email.includes(t) || username.includes(t) || role.includes(t);
    });
  }, [users, q]);

  const toggleEmail = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email]
    );
  };

  const selectAllFiltered = () => {
    const emails = filteredUsers.map((u) => u.email).filter(Boolean);
    setSelectedEmails((prev) => Array.from(new Set([...prev, ...emails])));
  };

  const clearSelected = () => setSelectedEmails([]);

  const canSend =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    (sendMode === "all" || selectedEmails.length > 0);

  // ✅ SEND EMAIL
  const onSend = async () => {
    setStatus({ kind: "", text: "" });

    if (!canSend) {
      setStatus({
        kind: "error",
        text: "Please enter Subject + Message, and select recipients.",
      });
      return;
    }

    try {
      setSending(true);

      // ✅ MATCHES DJANGO: path("admin/send-email/", admin_send_email)
      // If axios baseURL ends with /api/, this becomes: /api/admin/send-email/
      const payload = {
        send_to: sendMode, // "all" | "selected"
        recipients: sendMode === "selected" ? selectedEmails : [],
        subject,
        message,
        type,
      };

      const res = await api.post("admin/send-email/", payload);

      const count = res?.data?.count;
      setStatus({
        kind: "success",
        text: count ? `Email sent successfully ✅ (sent to ${count} users)` : "Email sent successfully ✅",
      });

      // reset form
      setSubject("");
      setMessage("");
      setSelectedEmails([]);
      setSendMode("all");
      setType("announcement");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "Failed to send email. Check backend endpoint /api/admin/send-email/ and SMTP settings.";
      setStatus({ kind: "error", text: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Broadcast</h1>
            <p className="text-sm text-gray-600">
              Send an announcement/update to all users or selected users.
            </p>
          </div>
        </div>

        {/* Status */}
        {status.text ? (
          <div
            className={[
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              status.kind === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
          >
            {status.text}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {/* LEFT: Compose */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Compose</h2>

            {/* Send mode */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Recipients
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSendMode("all")}
                  className={[
                    "rounded-full border px-4 py-2 text-sm",
                    sendMode === "all"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
                  ].join(" ")}
                >
                  Send to all users
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode("selected")}
                  className={[
                    "rounded-full border px-4 py-2 text-sm",
                    sendMode === "selected"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
                  ].join(" ")}
                >
                  Send to selected users
                </button>
              </div>

              {sendMode === "selected" ? (
                <p className="mt-2 text-xs text-gray-600">
                  Selected: <b>{selectedEmails.length}</b>
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-600">
                  This will send to all users (backend decides which users).
                </p>
              )}
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Email Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              >
                <option value="announcement">Announcement</option>
                <option value="update">Update</option>
                <option value="warning">Warning</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., New Feature Update"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                placeholder="Write your email content here..."
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <p className="mt-2 text-xs text-gray-500">
                Tip: Keep your email short & clear.
              </p>
            </div>

            <button
              type="button"
              onClick={onSend}
              disabled={!canSend || sending}
              className={[
                "w-full rounded-lg px-4 py-2 text-sm font-semibold",
                !canSend || sending
                  ? "cursor-not-allowed bg-gray-200 text-gray-500"
                  : "bg-gray-900 text-white hover:bg-black",
              ].join(" ")}
            >
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>

          {/* RIGHT: User Selector */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>

              {sendMode === "selected" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Select all (filtered)
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by email / username / role..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* List */}
            <div className="max-h-[520px] overflow-auto rounded-lg border border-gray-100">
              {loadingUsers ? (
                <div className="p-4 text-sm text-gray-600">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No users found.</div>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((u) => {
                    const email = u.email || "";
                    const checked = selectedEmails.includes(email);

                    return (
                      <li key={u.id || email} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {u.username || "User"}
                              {u.role ? (
                                <span className="ml-2 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
                                  {u.role}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-600">
                              {email || "No email"}
                            </div>
                          </div>

                          {sendMode === "selected" ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!email}
                              onChange={() => toggleEmail(email)}
                              className="mt-1 h-4 w-4"
                              title={!email ? "User has no email" : "Select user"}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {sendMode !== "selected" ? (
              <p className="mt-3 text-xs text-gray-500">
                Switch to “selected users” to choose recipients.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
