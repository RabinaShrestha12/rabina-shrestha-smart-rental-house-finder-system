import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ProviderInbox() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadInbox = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/provider/inbox/");
      setJobs(res.data || []);
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Messages</h2>

        <button
          onClick={loadInbox}
          className="px-3 py-2 rounded bg-gray-900 text-white"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="border rounded p-3 bg-gray-50">
          No assigned maintenance jobs yet.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="border rounded p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => navigate(`/provider/chat/${j.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{j.title || `Job #${j.id}`}</div>
                <div className="text-sm text-gray-600">{j.status}</div>
              </div>

              <div className="text-sm text-gray-600 mt-1">
                Category: {j.category} | Priority: {j.priority}
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Created: {String(j.created_at).slice(0, 19).replace("T", " ")}
              </div>

              <div className="text-sm text-blue-700 mt-2">
                Open chat →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}