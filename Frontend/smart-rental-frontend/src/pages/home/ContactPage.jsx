import React, { useMemo, useState } from "react";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";
import { MapPin, Phone, Mail, Send } from "lucide-react";

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const ui = useMemo(() => {
    return {
      page: isDark
        ? "min-h-screen bg-gradient-to-br from-[#071a31] via-[#0b2340] to-[#0a1f38]"
        : "min-h-screen bg-gradient-to-br from-[#eef8ff] via-[#e3f4ff] to-[#d6eeff]",

      wrap: "mx-auto w-full max-w-[1400px] px-6 py-12 lg:px-10 xl:px-14",

      heroGrid: "grid grid-cols-1 gap-10 xl:grid-cols-[1.25fr_0.9fr] items-stretch",

      leftCard: isDark
        ? "rounded-[32px] border border-sky-200/15 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-md lg:p-10 xl:p-12"
        : "rounded-[32px] border border-sky-200 bg-white p-8 shadow-[0_20px_60px_rgba(14,165,233,0.10)] lg:p-10 xl:p-12",

      rightCard: isDark
        ? "rounded-[32px] border border-sky-200/15 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-md lg:p-10 xl:p-12"
        : "rounded-[32px] border border-sky-200 bg-white p-8 shadow-[0_20px_60px_rgba(14,165,233,0.10)] lg:p-10 xl:p-12",

      miniTitle: isDark
        ? "text-sm font-extrabold uppercase tracking-[0.20em] text-sky-300"
        : "text-sm font-extrabold uppercase tracking-[0.20em] text-sky-600",

      bigTitle: isDark
        ? "mt-3 text-[38px] font-black leading-tight text-white lg:text-[46px] xl:text-[52px]"
        : "mt-3 text-[38px] font-black leading-tight text-sky-800 lg:text-[46px] xl:text-[52px]",

      subText: isDark
        ? "mt-5 max-w-2xl text-[15px] leading-8 text-sky-50/80 lg:text-base"
        : "mt-5 max-w-2xl text-[15px] leading-8 text-slate-600 lg:text-base",

      label: isDark
        ? "mb-2 block text-sm font-bold text-sky-100"
        : "mb-2 block text-sm font-bold text-slate-700",

      input: isDark
        ? "w-full rounded-[18px] border border-sky-200/20 bg-white/10 px-5 py-4 text-sm text-white outline-none placeholder:text-sky-100/45 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-400/10"
        : "w-full rounded-[18px] border border-sky-200 bg-[#f8fdff] px-5 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",

      textarea: isDark
        ? "w-full rounded-[20px] border border-sky-200/20 bg-white/10 px-5 py-4 text-sm text-white outline-none placeholder:text-sky-100/45 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-400/10"
        : "w-full rounded-[20px] border border-sky-200 bg-[#f8fdff] px-5 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",

      submitBtn: isDark
        ? "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500 px-9 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(14,165,233,0.30)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_16px_34px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
        : "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 px-9 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(14,165,233,0.28)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_16px_34px_rgba(14,165,233,0.34)] disabled:cursor-not-allowed disabled:opacity-70",

      sectionTitle: isDark
        ? "text-[34px] font-black text-white lg:text-[42px] xl:text-[48px]"
        : "text-[34px] font-black text-sky-800 lg:text-[42px] xl:text-[48px]",

      infoRow: isDark
        ? "flex items-start gap-5 border-b border-white/10 py-7 last:border-b-0"
        : "flex items-start gap-5 border-b border-sky-100 py-7 last:border-b-0",

      iconBox: isDark
        ? "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300 shadow-sm"
        : "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm",

      infoHead: isDark
        ? "text-2xl font-black text-white"
        : "text-2xl font-black text-sky-800",

      infoText: isDark
        ? "mt-2 text-base leading-8 text-sky-50/80"
        : "mt-2 text-base leading-8 text-slate-600",
    };
  }, [isDark]);

  const onChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const submitForm = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setToast({ type: "error", msg: "Please enter your name." });
      return;
    }
    if (!form.email.trim()) {
      setToast({ type: "error", msg: "Please enter your email." });
      return;
    }
    if (!form.phone.trim()) {
      setToast({ type: "error", msg: "Please enter your phone number." });
      return;
    }
    if (!form.message.trim()) {
      setToast({ type: "error", msg: "Please write your message." });
      return;
    }

    try {
      setSending(true);

      await api.post("public/contact/", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      setToast({
        type: "success",
        msg: "Your message has been submitted successfully.",
      });

      setForm(INITIAL_FORM);
    } catch (err) {
      setToast({
        type: "error",
        msg:
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to submit contact form.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell>
      <div className={ui.page}>
        <div className={ui.wrap}>
          <div className={ui.heroGrid}>
            <div className={ui.leftCard}>
              <div className={ui.miniTitle}>Contact Us</div>

              <h1 className={ui.bigTitle}>
                Get every single
                <br />
                update here
              </h1>

              <p className={ui.subText}>
                Have questions about rooms, bookings, providers, or support?
                Send us a message and we will get back to you soon.
              </p>

              <form className="mt-10 space-y-6" onSubmit={submitForm}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <label className={ui.label}>Your Name*</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className={ui.label}>Your Email*</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <label className={ui.label}>Phone*</label>
                    <input
                      type="text"
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className={ui.label}>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Enter subject"
                    />
                  </div>
                </div>

                <div>
                  <label className={ui.label}>Message*</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={onChange}
                    rows={8}
                    className={ui.textarea}
                    placeholder="Write your message here..."
                  />
                </div>

                <button type="submit" disabled={sending} className={ui.submitBtn}>
                  <Send size={18} />
                  {sending ? "Submitting..." : "Submit Now"}
                </button>
              </form>
            </div>

            <div className={ui.rightCard}>
              <h2 className={ui.sectionTitle}>Get Answers & Advice</h2>

              <div className="mt-10">
                <div className={ui.infoRow}>
                  <div className={ui.iconBox}>
                    <MapPin size={30} />
                  </div>
                  <div>
                    <h3 className={ui.infoHead}>Address</h3>
                    <p className={ui.infoText}>Morang, Nepal</p>
                  </div>
                </div>

                <div className={ui.infoRow}>
                  <div className={ui.iconBox}>
                    <Phone size={30} />
                  </div>
                  <div>
                    <h3 className={ui.infoHead}>Phone</h3>
                    <p className={ui.infoText}>9827376839</p>
                  </div>
                </div>

                <div className={ui.infoRow}>
                  <div className={ui.iconBox}>
                    <Mail size={30} />
                  </div>
                  <div>
                    <h3 className={ui.infoHead}>E-Mail</h3>
                    <p className={ui.infoText}>
                      rentsnepal@gmail.com
                      <br />
                      info@rentsnepal.com.np
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {toast?.msg ? (
            <div className="mt-6">
              <Toast
                type={toast.type || "info"}
                message={toast.msg}
                onClose={() => setToast({ type: "info", msg: "" })}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}