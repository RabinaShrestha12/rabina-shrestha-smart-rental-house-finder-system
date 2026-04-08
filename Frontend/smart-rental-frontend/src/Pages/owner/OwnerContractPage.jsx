import React from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import { ArrowLeft, LayoutDashboard, BadgeCheck } from "lucide-react";

export default function OwnerContractPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
                      <li>
                        • It creates transparency between the platform and the
                        owner.
                      </li>
                      <li>
                        • It clearly explains the first-payment commission rule.
                      </li>
                      <li>
                        • It prevents confusion about future tenant payments.
                      </li>
                      <li>
                        • It helps both owners and the platform work fairly.
                      </li>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}