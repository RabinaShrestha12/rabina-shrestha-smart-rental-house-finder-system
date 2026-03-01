// src/pages/tenant/RoommateFinder.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

export default function RoommateFinder() {
  const nav = useNavigate();
  const { role, isAuthed, email } = useAuth();

  const [profile, setProfile] = useState({
    gender: "any",
    preferred_gender: "any",
    min_budget: "",
    max_budget: "",
    city: "",
    preferred_area: "",
    move_in_date: "",
    stay_length_months: "",
    smoker: false,
    pets_ok: true,
    tidy_level: 3,
    quiet_level: 3,
    bio: "",
    is_active: true,
  });

  const [matches, setMatches] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const axiosErr = (e, fallback) => {
    const data = e?.response?.data;
    if (!data) return e?.message || fallback;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return fallback;
    }
  };

  const toIntOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  };

  const toFloatOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? null : n;
  };

  useEffect(() => {
    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
      return;
    }
  }, [isAuthed, role, nav]);

  const loadMyProfile = async () => {
    setLoadingProfile(true);
    setToast({ type: "info", msg: "" });

    try {
      const res = await api.get("tenant/roommates/profile/");
      const data = res?.data || {};
      setProfile((p) => ({
        ...p,
        ...data,
        min_budget: data.min_budget ?? "",
        max_budget: data.max_budget ?? "",
        stay_length_months: data.stay_length_months ?? "",
        move_in_date: data.move_in_date ?? "",
        tidy_level: data.tidy_level ?? 3,
        quiet_level: data.quiet_level ?? 3,
        smoker: !!data.smoker,
        pets_ok: data.pets_ok !== false,
        is_active: data.is_active !== false,
        city: data.city ?? "",
        preferred_area: data.preferred_area ?? "",
        bio: data.bio ?? "",
        gender: (data.gender || "any").toLowerCase(),
        preferred_gender: (data.preferred_gender || "any").toLowerCase(),
      }));
    } catch (e) {
      console.log("LOAD PROFILE ERROR:", e?.response?.data);
      setToast({ type: "error", msg: axiosErr(e, "Failed to load profile.") });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isAuthed && role === "tenant") loadMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  const saveProfile = async () => {
    setSaving(true);
    setToast({ type: "info", msg: "" });

    try {
      const payload = {
        gender: (profile.gender || "any").toLowerCase(),
        preferred_gender: (profile.preferred_gender || "any").toLowerCase(),
        city: (profile.city || "").trim(),
        preferred_area: (profile.preferred_area || "").trim(),
        bio: (profile.bio || "").trim(),

        min_budget: toFloatOrNull(profile.min_budget),
        max_budget: toFloatOrNull(profile.max_budget),
        stay_length_months: toIntOrNull(profile.stay_length_months),
        tidy_level: toIntOrNull(profile.tidy_level) ?? 3,
        quiet_level: toIntOrNull(profile.quiet_level) ?? 3,

        smoker: !!profile.smoker,
        pets_ok: !!profile.pets_ok,
        is_active: profile.is_active !== false,

        move_in_date: profile.move_in_date ? profile.move_in_date : null,
      };

      const res = await api.put("tenant/roommates/profile/", payload);
      setProfile((p) => ({ ...p, ...(res?.data || {}) }));
      setToast({ type: "success", msg: "Profile saved ✅" });
    } catch (e) {
      console.log("SAVE PROFILE ERROR:", e?.response?.data);
      setToast({ type: "error", msg: axiosErr(e, "Request failed with status code 400") });
    } finally {
      setSaving(false);
    }
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    setToast({ type: "info", msg: "" });

    try {
      const res = await api.get("tenant/roommates/matches/?min_score=0.4&limit=20");
      setMatches(res?.data?.results || []);
      setToast({
        type: "success",
        msg: `Found ${res?.data?.count ?? (res?.data?.results?.length || 0)} matches ✅`,
      });
    } catch (e) {
      console.log("LOAD MATCHES ERROR:", e?.response?.data);
      setToast({ type: "error", msg: axiosErr(e, "Failed to load matches.") });
    } finally {
      setLoadingMatches(false);
    }
  };

  const sendRequest = async (toUserId) => {
    setToast({ type: "info", msg: "" });

    if (!toUserId) {
      setToast({ type: "error", msg: "Missing user_id for this match." });
      return;
    }

    try {
      const res = await api.post("tenant/roommates/request/send/", {
        to_user: toUserId,
        message: "Hi! I think we could be good roommates 🙂",
      });

      // ✅ if backend returns "already pending", treat as OK
      if (res?.data?.detail === "Request already pending") {
        setToast({ type: "info", msg: "Request already pending ✅" });
      } else {
        setToast({ type: "success", msg: "Request sent ✅" });
      }
    } catch (e) {
      console.log("SEND REQUEST ERROR:", e?.response?.data);
      setToast({ type: "error", msg: axiosErr(e, "Failed to send request.") });
    }
  };

  return (
    <Shell
      title="Roommate Finder"
      subtitle={`Welcome ${email || "Tenant"}. Create your profile and find matches.`}
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            ← Dashboard
          </button>

          <button
            onClick={() => nav("/tenant/roommates/requests")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            📨 Requests
          </button>
        </div>
      }
    >
      {toast.msg && (
        <div
          className={`mb-3 rounded-xl border p-3 text-sm whitespace-pre-wrap ${
            toast.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-200"
              : toast.type === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-white/10 bg-white/5 text-slate-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="text-sm font-semibold mb-3">My Roommate Profile</div>

          {loadingProfile ? (
            <div className="text-sm text-slate-300">Loading profile…</div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="any">My gender: Any</option>
                  <option value="male">My gender: Male</option>
                  <option value="female">My gender: Female</option>
                  <option value="other">My gender: Other</option>
                </select>

                <select
                  value={profile.preferred_gender}
                  onChange={(e) => setProfile((p) => ({ ...p, preferred_gender: e.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="any">Prefer: Any</option>
                  <option value="male">Prefer: Male</option>
                  <option value="female">Prefer: Female</option>
                  <option value="other">Prefer: Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={profile.min_budget ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, min_budget: e.target.value }))}
                  placeholder="Min budget"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={profile.max_budget ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, max_budget: e.target.value }))}
                  placeholder="Max budget"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={profile.city ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
                <input
                  value={profile.preferred_area ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, preferred_area: e.target.value }))}
                  placeholder="Preferred area"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={profile.move_in_date ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, move_in_date: e.target.value }))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />

                <input
                  type="number"
                  value={profile.stay_length_months ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, stay_length_months: e.target.value }))}
                  placeholder="Stay length (months)"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={!!profile.smoker}
                    onChange={(e) => setProfile((p) => ({ ...p, smoker: e.target.checked }))}
                  />
                  Smoker
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={!!profile.pets_ok}
                    onChange={(e) => setProfile((p) => ({ ...p, pets_ok: e.target.checked }))}
                  />
                  Pets OK
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-300">
                  Tidy level: {profile.tidy_level}
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={profile.tidy_level ?? 3}
                    onChange={(e) => setProfile((p) => ({ ...p, tidy_level: Number(e.target.value) }))}
                    className="w-full"
                  />
                </label>

                <label className="text-xs text-slate-300">
                  Quiet level: {profile.quiet_level}
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={profile.quiet_level ?? 3}
                    onChange={(e) => setProfile((p) => ({ ...p, quiet_level: Number(e.target.value) }))}
                    className="w-full"
                  />
                </label>
              </div>

              <textarea
                value={profile.bio ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                placeholder="Short bio (optional)"
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={profile.is_active !== false}
                  onChange={(e) => setProfile((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Actively looking for roommate
              </label>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Profile"}
                </button>

                <button
                  onClick={loadMatches}
                  disabled={loadingMatches}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-60"
                >
                  {loadingMatches ? "Finding…" : "Find Matches"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Matches */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="text-sm font-semibold mb-3">Suggested Roommates</div>

          {matches.length === 0 ? (
            <div className="text-sm text-slate-300">
              No matches yet. Save your profile then click <b>Find Matches</b>.
            </div>
          ) : (
            <div className="grid gap-3">
              {matches.map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{m.username}</div>
                      <div className="text-xs text-slate-300">
                        {m.city || "—"} {m.preferred_area ? `• ${m.preferred_area}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-slate-200">
                      Score: <b>{m.match_score}</b>
                    </div>
                  </div>

                  {Array.isArray(m.match_reasons) && m.match_reasons.length > 0 && (
                    <ul className="mt-2 text-xs text-slate-300 list-disc ml-5">
                      {m.match_reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => sendRequest(m.user_id)}
                      className="rounded-2xl border border-white/10 bg-emerald-600/30 px-3 py-2 text-xs hover:bg-emerald-600/40 transition"
                    >
                      Send Request
                    </button>

                    <button
                      onClick={() => nav("/tenant/roommates/requests")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                    >
                      View Requests →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}