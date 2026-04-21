import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ProviderInbox() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const arrify = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const getJobTitle = (j) =>
    j?.title || j?.issue_title || j?.subject || `Job #${j?.id}`;

  const getJobStatus = (j) => j?.status || j?.job_status || "pending";

  const getJobCategory = (j) => j?.category || "other";

  const getJobPriority = (j) => j?.priority || "medium";

  const getJobCreatedAt = (j) =>
    j?.created_at || j?.created || j?.timestamp || "";

  const getLastMessage = (j) =>
    j?.last_message ||
    j?.latest_message ||
    j?.recent_message ||
    j?.message_preview ||
    "";

  const hasLastImage = (j) =>
    Boolean(
      j?.last_message_image ||
      j?.latest_message_image ||
      j?.recent_message_image ||
      j?.last_image ||
      j?.image
    );

  const formatDate = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  };

  const loadInbox = async () => {
    try {
      setLoading(true);
      const res = await api.get("provider/inbox/");
      setJobs(arrify(res.data));
    } catch (err) {
      console.error("Inbox load failed:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          <p className="text-sm text-slate-600 mt-1">
            View assigned jobs and open chat with owner.
          </p>
        </div>

        <button
          onClick={loadInbox}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 shadow-sm">
          No assigned maintenance jobs yet.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 cursor-pointer hover:bg-slate-50 transition shadow-sm"
              onClick={() => navigate(`/provider/chat/${j.id}`)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-slate-900">
                    {getJobTitle(j)}
                  </div>

                  <div className="text-sm text-slate-600 mt-1">
                    Category: {getJobCategory(j)} | Priority: {getJobPriority(j)}
                  </div>
                </div>

                <div className="text-sm text-slate-600 font-medium">
                  {getJobStatus(j)}
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-2">
                Created: {formatDate(getJobCreatedAt(j))}
              </div>

              {getLastMessage(j) || hasLastImage(j) ? (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Latest message
                  </div>

                  {getLastMessage(j) ? (
                    <div className="text-sm text-slate-700 line-clamp-2">
                      {getLastMessage(j)}
                    </div>
                  ) : null}

                  {hasLastImage(j) ? (
                    <div className="text-xs text-blue-700 mt-1">
                      📷 Image attached
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="text-sm text-blue-700 mt-3 font-medium">
                Open chat →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}