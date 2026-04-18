import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import Toast from "../../components/Toast";
import api from "../../api/axios";
import {
  ArrowLeft,
  LayoutDashboard,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
} from "lucide-react";

export default function OwnerContractPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // change this if your add property route is different
  const ADD_PROPERTY_ROUTE = "/owner/add-property";

  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const parseApiError = (err, fallback) => {
    const data = err?.response?.data;
    if (!data) return fallback;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const value = data[firstKey];
      if (Array.isArray(value) && value.length) return value[0];
      if (typeof value === "string") return value;
    }

    return fallback;
  };

  const loadAgreement = async () => {
    setLoading(true);
    try {
      const res = await api.get("owner/platform-agreement/");
      setAgreement(res.data);
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to load agreement."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreement();
  }, []);

  const respondToAgreement = async (action) => {
    setWorking(true);
    try {
      const res = await api.post("owner/platform-agreement/respond/", { action });
      setAgreement(res.data);

      setToast({
        type: "success",
        msg:
          action === "accept"
            ? "Agreement accepted successfully. You can now add property."
            : "Agreement rejected successfully.",
      });
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to update agreement."),
      });
    } finally {
      setWorking(false);
    }
  };

  const accepted = agreement?.status === "accepted";
  const rejected = agreement?.status === "rejected";
  const pending = !agreement || agreement?.status === "pending";

  const badgeClass = accepted
    ? isDark
      ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : rejected
    ? isDark
      ? "border border-red-400/30 bg-red-500/10 text-red-300"
      : "border border-red-200 bg-red-50 text-red-700"
    : isDark
    ? "border border-amber-400/30 bg-amber-500/10 text-amber-300"
    : "border border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Shell title="Owner Contract">
      <div
        className={`min-h-screen w-full px-6 py-10 lg:px-10 xl:px-14 ${
          isDark
            ? "bg-gradient-to-br from-[#071a31] via-[#0b2340] to-[#0a1f38]"
            : "bg-gradient-to-br from-[#eef8ff] via-[#e7f4ff] to-[#d8efff]"
        }`}
      >
        <div className="mx-auto w-full max-w-[1500px]">
          <div
            className={`rounded-[34px] border p-8 lg:p-10 xl:p-14 ${
              isDark
                ? "border-sky-200/10 bg-[#0f2744]/80 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
                : "border-sky-200 bg-[#dff2ff] shadow-[0_20px_60px_rgba(14,165,233,0.10)]"
            }`}
          >
            <div className="mx-auto w-full max-w-[980px]">
              <div
                className={`rounded-[30px] border p-8 lg:p-10 xl:p-12 ${
                  isDark
                    ? "border-sky-200/10 bg-white/5"
                    : "border-sky-200 bg-white"
                }`}
              >
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2
                      className={`text-3xl font-black lg:text-4xl ${
                        isDark ? "text-white" : "text-sky-800"
                      }`}
                    >
                      Property Listing Agreement
                    </h2>

                    <p
                      className={`mt-4 text-base leading-8 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      Please read this agreement carefully before listing your
                      property on our platform.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-4 py-2 text-xs font-bold ${badgeClass}`}
                      >
                        Status: {agreement?.status || "loading"}
                      </span>

                      {agreement?.accepted_at ? (
                        <span
                          className={`text-xs ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Accepted at:{" "}
                          {new Date(agreement.accepted_at).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => navigate("/owner")}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:scale-[1.02] ${
                        isDark
                          ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)]"
                          : "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.20)]"
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </button>

                    <button
                      onClick={loadAgreement}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
                        isDark
                          ? "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>

                    <button
                      onClick={() => navigate(-1)}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
                        isDark
                          ? "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div
                    className={`mb-8 rounded-3xl border p-6 ${
                      isDark
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    Loading agreement...
                  </div>
                ) : null}

                <div className="space-y-10">
                  <section>
                    <h3
                      className={`text-2xl font-black ${
                        isDark ? "text-sky-300" : "text-sky-700"
                      }`}
                    >
                      1. Purpose of Agreement
                    </h3>
                    <p
                      className={`mt-4 text-[17px] leading-9 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      This agreement outlines the terms and conditions between
                      the property owner and the platform. By listing your
                      property, you agree to follow the rules and payment
                      structure defined below.
                    </p>
                  </section>

                  <section>
                    <h3
                      className={`text-2xl font-black ${
                        isDark ? "text-sky-300" : "text-sky-700"
                      }`}
                    >
                      2. Commission Structure
                    </h3>

                    <div
                      className={`mt-5 rounded-[24px] border p-6 lg:p-8 ${
                        isDark
                          ? "border-sky-300/20 bg-sky-500/5"
                          : "border-sky-200 bg-sky-50"
                      }`}
                    >
                      <div className="space-y-6">
                        <div className="flex items-start gap-3">
                          <BadgeCheck
                            className={`mt-1 h-5 w-5 shrink-0 ${
                              isDark ? "text-emerald-300" : "text-emerald-600"
                            }`}
                          />
                          <div
                            className={`text-[16px] leading-8 ${
                              isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                          >
                            When a tenant books your property, the{" "}
                            <strong>first payment</strong> will be divided as:
                            <div className="mt-2 ml-2">
                              <div>
                                <strong>20%</strong> → Platform
                              </div>
                              <div>
                                <strong>80%</strong> → Property Owner
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <BadgeCheck
                            className={`mt-1 h-5 w-5 shrink-0 ${
                              isDark ? "text-emerald-300" : "text-emerald-600"
                            }`}
                          />
                          <p
                            className={`text-[16px] leading-8 ${
                              isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                          >
                            This commission applies{" "}
                            <strong>ONLY to the first payment</strong> made by a
                            tenant.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <BadgeCheck
                            className={`mt-1 h-5 w-5 shrink-0 ${
                              isDark ? "text-emerald-300" : "text-emerald-600"
                            }`}
                          />
                          <p
                            className={`text-[16px] leading-8 ${
                              isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                          >
                            Any <strong>future payments from the SAME tenant</strong>{" "}
                            will go <strong>100% to the owner</strong>.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <BadgeCheck
                            className={`mt-1 h-5 w-5 shrink-0 ${
                              isDark ? "text-emerald-300" : "text-emerald-600"
                            }`}
                          />
                          <div
                            className={`text-[16px] leading-8 ${
                              isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                          >
                            If the tenant leaves and a{" "}
                            <strong>new tenant rents the same property</strong>,
                            then:
                            <div className="mt-2 ml-2">
                              <div>
                                The first payment of the new tenant will again
                                follow:
                              </div>
                              <div className="mt-1">
                                <strong>20%</strong> → Platform and{" "}
                                <strong>80%</strong> → Owner
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3
                      className={`text-2xl font-black ${
                        isDark ? "text-sky-300" : "text-sky-700"
                      }`}
                    >
                      3. Why This Contract Is Necessary
                    </h3>
                    <ul
                      className={`mt-4 space-y-3 text-[16px] leading-8 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      <li>• It creates transparency between the platform and the owner.</li>
                      <li>• It clearly explains the first-payment commission rule.</li>
                      <li>• It prevents confusion about future tenant payments.</li>
                      <li>• It helps both owners and the platform work fairly.</li>
                    </ul>
                  </section>

                  <section>
                    <h3
                      className={`text-2xl font-black ${
                        isDark ? "text-sky-300" : "text-sky-700"
                      }`}
                    >
                      4. Owner Responsibilities
                    </h3>
                    <ul
                      className={`mt-4 space-y-3 text-[16px] leading-8 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      <li>• Provide correct property details before listing.</li>
                      <li>• Keep contact information accurate and active.</li>
                      <li>• Respect booking and rental commitments.</li>
                      <li>• Follow platform rules while using the website.</li>
                    </ul>
                  </section>
                </div>

                <div
                  className={`mt-10 rounded-[26px] border p-6 ${
                    isDark
                      ? "border-white/10 bg-white/5"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-12 w-12 items-center justify-center rounded-2xl ${
                          isDark ? "bg-white/10" : "bg-white"
                        }`}
                      >
                        <FileText
                          className={`h-5 w-5 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        />
                      </div>

                      <div>
                        <h3
                          className={`text-lg font-black ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Agreement Action
                        </h3>

                        <p
                          className={`mt-1 text-sm ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Accept once. After that, you can add many properties without accepting again.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!accepted ? (
                        <>
                          <button
                            onClick={() => respondToAgreement("accept")}
                            disabled={working}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {working ? "Saving..." : "Accept Agreement"}
                          </button>

                          <button
                            onClick={() => respondToAgreement("reject")}
                            disabled={working}
                            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => navigate(ADD_PROPERTY_ROUTE)}
                          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Continue to Add Property
                        </button>
                      )}
                    </div>
                  </div>

                  {accepted ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Agreement accepted once. Now this owner can add many properties.
                    </div>
                  ) : pending ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      Please accept the agreement first. Without acceptance, property add will be blocked.
                    </div>
                  ) : rejected ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-red-400/20 bg-red-500/10 text-red-200"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      Agreement is rejected. Accept it when you want to add a property.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {toast.msg ? (
          <Toast
            type={toast.type}
            message={toast.msg}
            onClose={() => setToast({ type: "info", msg: "" })}
          />
        ) : null}
      </div>
    </Shell>
  );
}