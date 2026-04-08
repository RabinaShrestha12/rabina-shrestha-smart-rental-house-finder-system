import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import {
  Users,
  UserPlus,
  MessageSquare,
  Settings,
  MapPin,
  Sparkles,
  ChevronRight,
  Info,
  Banknote,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export default function RoommateFinder() {
  const nav = useNavigate();
  const { role, isAuthed } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";

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
    return fallback;
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
    if (!isAuthed || role !== "tenant") {
      nav("/auth", { replace: true });
    }
  }, [isAuthed, role, nav]);

  const loadMyProfile = async () => {
    setLoadingProfile(true);
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
        gender: (data.gender || "any").toLowerCase(),
        preferred_gender: (data.preferred_gender || "any").toLowerCase(),
      }));
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to load profile.") });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isAuthed && role === "tenant") loadMyProfile();
  }, [isAuthed, role]);

  const saveProfile = async () => {
    setSaving(true);
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
      setToast({ type: "success", msg: "Profile updated successfully ✅" });
    } catch (e) {
      setToast({ type: "error", msg: "Failed to save profile changes." });
    } finally {
      setSaving(false);
    }
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await api.get("tenant/roommates/matches/?min_score=0.4&limit=20");
      setMatches(res?.data?.results || []);
      setToast({
        type: "success",
        msg: `Found ${res?.data?.results?.length || 0} compatible matches!`,
      });
    } catch (e) {
      setToast({
        type: "error",
        msg: "No matches found. Try broadening your criteria.",
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  const sendRequest = async (toUserId) => {
    try {
      await api.post("tenant/roommates/request/send/", {
        to_user: toUserId,
        message: "Hi! I think we could be good roommates 🙂",
      });
      setToast({ type: "success", msg: "Connection request delivered!" });
    } catch (e) {
      setToast({
        type: "info",
        msg: "You have already sent a request to this person.",
      });
    }
  };

  const FormSection = ({ title, children, icon: Icon }) => (
    <div className="space-y-4">
      <h3
        className={`mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${
          isDark ? "text-blue-200/70" : "text-neutral-400"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-blue-500" />} {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );

  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition-all ${
    isDark
      ? "border-white/10 bg-[#123a64] text-white placeholder:text-blue-100/45 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      : "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5"
  }`;

  const selectClass = `w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition-all ${
    isDark
      ? "border-white/10 bg-[#123a64] text-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      : "border-neutral-200 bg-white text-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5"
  }`;

  return (
    <Shell
      title="Roommate Sync"
      subtitle="Find compatible housemates based on lifestyle, budget, and location preferences."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => nav("/tenant/roommates/requests")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
              isDark
                ? "border border-blue-400/20 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Inbox
          </button>

          <button
            onClick={() => nav("/tenant")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
              isDark
                ? "border border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <ArrowLeft className="h-4 w-4" /> Back Dashboard
          </button>
        </div>
      }
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[450px_1fr]">
        <div
          className={`space-y-10 rounded-[40px] border p-8 ${
            isDark
              ? "border-white/10 bg-[#0f3258]/95 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
              : "border-neutral-100 bg-neutral-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`flex items-center gap-3 text-2xl font-black tracking-tight ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              <Settings className="h-6 w-6 text-blue-500" /> My Profile
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                profile.is_active
                  ? isDark
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border border-emerald-100 bg-emerald-50 text-emerald-600"
                  : isDark
                  ? "border border-red-400/20 bg-red-500/10 text-red-300"
                  : "border border-red-100 bg-red-50 text-red-600"
              }`}
            >
              {profile.is_active ? "Visible" : "Hidden"}
            </span>
          </div>

          {toast.msg && (
            <div
              className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-bold ${
                toast.type === "success"
                  ? isDark
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "bg-emerald-50 text-emerald-700"
                  : isDark
                  ? "border border-blue-400/20 bg-blue-500/10 text-blue-100"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              <Info className="h-4 w-4" /> {toast.msg}
            </div>
          )}

          <div className="space-y-8">
            <FormSection title="Demographics" icon={Users}>
              <select
                value={profile.gender}
                onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                className={selectClass}
              >
                <option value="any">My Gender: Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <select
                value={profile.preferred_gender}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, preferred_gender: e.target.value }))
                }
                className={selectClass}
              >
                <option value="any">Prefer: Any</option>
                <option value="male">Prefer: Male</option>
                <option value="female">Prefer: Female</option>
              </select>
            </FormSection>

            <FormSection title="Budget & Location" icon={MapPin}>
              <div className="relative">
                <Banknote
                  className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    isDark ? "text-blue-200/60" : "text-neutral-400"
                  }`}
                />
                <input
                  type="number"
                  value={profile.min_budget}
                  onChange={(e) => setProfile((p) => ({ ...p, min_budget: e.target.value }))}
                  placeholder="Min Budget"
                  className={`${inputClass} pl-11 pr-4`}
                />
              </div>

              <div className="relative">
                <Banknote
                  className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    isDark ? "text-blue-200/60" : "text-neutral-400"
                  }`}
                />
                <input
                  type="number"
                  value={profile.max_budget}
                  onChange={(e) => setProfile((p) => ({ ...p, max_budget: e.target.value }))}
                  placeholder="Max Budget"
                  className={`${inputClass} pl-11 pr-4`}
                />
              </div>

              <input
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                placeholder="Target City"
                className={`${inputClass} md:col-span-2`}
              />
            </FormSection>

            <FormSection title="Living Habits" icon={Sparkles}>
              <div
                className={`col-span-2 space-y-4 rounded-2xl border p-4 ${
                  isDark
                    ? "border-white/10 bg-[#123a64]"
                    : "border-neutral-100 bg-white"
                }`}
              >
                <div>
                  <div
                    className={`mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest ${
                      isDark ? "text-blue-100/70" : "text-neutral-400"
                    }`}
                  >
                    <span>Tidy Level</span>
                    <span className="text-blue-500">{profile.tidy_level}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={profile.tidy_level}
                    onChange={(e) => setProfile((p) => ({ ...p, tidy_level: e.target.value }))}
                    className={`h-1.5 w-full appearance-none rounded-full ${
                      isDark ? "bg-white/10 accent-blue-500" : "bg-neutral-100 accent-blue-600"
                    }`}
                  />
                </div>

                <div>
                  <div
                    className={`mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest ${
                      isDark ? "text-blue-100/70" : "text-neutral-400"
                    }`}
                  >
                    <span>Quiet Level</span>
                    <span className="text-violet-500">{profile.quiet_level}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={profile.quiet_level}
                    onChange={(e) => setProfile((p) => ({ ...p, quiet_level: e.target.value }))}
                    className={`h-1.5 w-full appearance-none rounded-full ${
                      isDark
                        ? "bg-white/10 accent-violet-500"
                        : "bg-neutral-100 accent-purple-600"
                    }`}
                  />
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-4">
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors ${
                    isDark
                      ? "border-white/10 bg-[#123a64] hover:bg-[#174876]"
                      : "border-neutral-100 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={profile.smoker}
                    onChange={(e) => setProfile((p) => ({ ...p, smoker: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`text-xs font-bold ${
                      isDark ? "text-blue-50" : "text-neutral-700"
                    }`}
                  >
                    Smoker
                  </span>
                </label>

                <label
                  className={`flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors ${
                    isDark
                      ? "border-white/10 bg-[#123a64] hover:bg-[#174876]"
                      : "border-neutral-100 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={profile.pets_ok}
                    onChange={(e) => setProfile((p) => ({ ...p, pets_ok: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`text-xs font-bold ${
                      isDark ? "text-blue-50" : "text-neutral-700"
                    }`}
                  >
                    Pets OK
                  </span>
                </label>
              </div>
            </FormSection>

            <div
              className={`space-y-4 border-t pt-6 ${
                isDark ? "border-white/10" : "border-neutral-100"
              }`}
            >
              <label
                className={`group flex cursor-pointer items-center gap-3 rounded-[24px] border px-6 py-4 ${
                  isDark
                    ? "border-blue-400/20 bg-blue-500/10"
                    : "border-blue-100 bg-blue-50/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={profile.is_active}
                  onChange={(e) => setProfile((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-5 w-5 rounded-full border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div
                    className={`mb-1 text-sm font-black leading-none ${
                      isDark ? "text-blue-50" : "text-blue-900"
                    }`}
                  >
                    Actively Seeking Roommates
                  </div>
                  <div
                    className={`text-[10px] font-medium uppercase tracking-widest ${
                      isDark ? "text-blue-100/70" : "text-blue-600/70"
                    }`}
                  >
                    Appear in global match results
                  </div>
                </div>
              </label>

              <button
                onClick={saveProfile}
                disabled={saving || loadingProfile}
                className={`w-full rounded-[24px] py-4 text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all active:scale-95 ${
                  isDark
                    ? "bg-blue-600 shadow-blue-900/30 hover:bg-blue-700"
                    : "bg-neutral-900 shadow-neutral-900/10 hover:bg-black"
                }`}
              >
                {saving ? "Processing..." : "Commit Profile Updates"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div
            className={`flex flex-col justify-between gap-6 border-b pb-6 md:flex-row md:items-center ${
              isDark ? "border-white/10" : "border-neutral-100"
            }`}
          >
            <div>
              <h2
                className={`text-3xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Compatible Matches
              </h2>
              <p className={isDark ? "font-medium text-blue-100/70" : "font-medium text-neutral-500"}>
                Synced based on lifestyle overlap and budget alignment.
              </p>
            </div>

            <button
              onClick={loadMatches}
              disabled={loadingMatches}
              className="flex items-center gap-2 rounded-[24px] bg-blue-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all active:scale-95 hover:bg-blue-700"
            >
              {loadingMatches ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Find Compatible Mates
            </button>
          </div>

          {matches.length === 0 ? (
            <div
              className={`flex h-[400px] flex-col items-center justify-center rounded-[40px] border p-12 text-center ${
                isDark
                  ? "border-white/10 bg-[#0f3258]/95"
                  : "border-dashed border-neutral-200 bg-neutral-50"
              }`}
            >
              <Users className={`mb-6 h-16 w-16 ${isDark ? "text-blue-200/20" : "text-neutral-200"}`} />
              <h3
                className={`text-lg font-black uppercase tracking-widest ${
                  isDark ? "text-blue-100/60" : "text-neutral-400"
                }`}
              >
                No active Syncs
              </h3>
              <p
                className={`mt-2 max-w-xs text-sm font-medium ${
                  isDark ? "text-blue-100/55" : "text-neutral-400"
                }`}
              >
                Adjust your profile and click search to find compatible roommates in your city.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className={`group flex flex-col justify-between rounded-[32px] border p-8 transition-all duration-500 hover:-translate-y-1 ${
                    isDark
                      ? "border-white/10 bg-[#0f3258]/95 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-blue-400/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
                      : "border-neutral-100 bg-white shadow-sm hover:border-blue-100 hover:shadow-2xl"
                  }`}
                >
                  <div>
                    <div className="mb-6 flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-600 text-xl font-black text-white">
                        {m.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="text-right">
                        <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-500">
                          Match Score
                        </div>
                        <div
                          className={`text-3xl font-black leading-none ${
                            isDark ? "text-white" : "text-neutral-900"
                          }`}
                        >
                          {Math.round((m.match_score || 0) * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div
                        className={`mb-1 text-xl font-black ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {m.username}
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          className={`flex items-center gap-1 text-xs font-bold ${
                            isDark ? "text-blue-100/65" : "text-neutral-400"
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" /> {m.city || "Nepal"}
                        </div>

                        {m.max_budget && (
                          <div
                            className={`flex items-center gap-1 text-xs font-bold ${
                              isDark ? "text-blue-100/65" : "text-neutral-400"
                            }`}
                          >
                            <Banknote className="h-3.5 w-3.5" /> Max Rs {m.max_budget}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-8 flex flex-wrap gap-2">
                      {m.match_reasons?.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isDark
                              ? "border-white/10 bg-[#123a64] text-blue-100/75"
                              : "border-neutral-100 bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => sendRequest(m.user_id)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4" /> Request
                    </button>

                    <button
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        isDark
                          ? "border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                          : "border-neutral-100 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      Profile <ChevronRight className="h-4 w-4" />
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