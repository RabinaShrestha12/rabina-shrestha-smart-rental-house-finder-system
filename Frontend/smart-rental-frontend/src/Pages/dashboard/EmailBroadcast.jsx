import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import { 
  Send, Users, Mail, Type, CheckCircle2, 
  AlertCircle, Search, RefreshCw, ChevronRight, X, LayoutDashboard
} from "lucide-react";

export default function EmailBroadcast() {
  const nav = useNavigate();
  const { isDark } = useTheme();
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);

  const [sendMode, setSendMode] = useState("all"); // "all" | "selected"
  const [selectedEmails, setSelectedEmails] = useState([]);

  const [type, setType] = useState("announcement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ kind: "", text: "" });

  const [q, setQ] = useState("");

  // Theme Constants
  const cardBg = isDark ? "bg-white/5 border-white/10 backdrop-blur-md" : "bg-white border-neutral-100 shadow-sm";
  const headerText = isDark ? "text-white" : "text-neutral-900";
  const mutedText = isDark ? "text-slate-400" : "text-neutral-400";
  const inputText = isDark ? "text-slate-200" : "text-neutral-700";
  const inputFill = isDark ? "bg-white/5 border-white/10" : "bg-neutral-50 border-neutral-200";
  const btnSecondary = isDark 
    ? "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10" 
    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUsers(true);
        setStatus({ kind: "", text: "" });
        const res = await api.get("admin/users/");
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setUsers(list);
      } catch (e) {
        setStatus({ kind: "error", text: "Failed to load directory. Verify admin permissions." });
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => { mounted = false; };
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

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && (sendMode === "all" || selectedEmails.length > 0);

  const onSend = async () => {
    setStatus({ kind: "", text: "" });
    if (!canSend) {
      setStatus({ kind: "error", text: "Please complete subject, message, and recipients." });
      return;
    }
    try {
      setSending(true);
      const payload = {
        send_to: sendMode,
        recipients: sendMode === "selected" ? selectedEmails : [],
        subject,
        message,
        type,
      };
      const res = await api.post("admin/send-email/", payload);
      setStatus({ kind: "success", text: `Broadcast dispatched successfully ${res?.data?.count ? `to ${res.data.count} users` : ''}!` });
      setSubject(""); setMessage(""); setSelectedEmails([]); setSendMode("all"); setType("announcement");
    } catch (e) {
      setStatus({ kind: "error", text: "Failed to transmit broadcast. Check SMTP configurations." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell
      title="Global Broadcast"
      subtitle="Dispatch announcements, updates, and promotions to the user base."
      right={(
        <button 
          onClick={() => nav("/admin")} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all shadow-lg font-black text-[10px] uppercase tracking-widest ${
            isDark 
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20" 
              : "bg-neutral-900 hover:bg-black text-white shadow-neutral-900/10"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
      )}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 pb-20">
        
        {/* Composer Canvas */}
        <div className={`rounded-[40px] border p-8 md:p-10 shadow-sm flex flex-col h-[700px] ${cardBg}`}>
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                 <Mail className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-black tracking-tight ${headerText}`}>Composer</h2>
           </div>

           <div className="space-y-6 flex-1 flex flex-col">
              <div className={`grid grid-cols-2 p-1.5 rounded-2xl border gap-1 shrink-0 ${inputFill}`}>
                <button type="button" onClick={() => setSendMode("all")} className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${sendMode === "all" ? `${isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'}` : `${mutedText} hover:bg-white/5`}`}>
                  Global Cast
                </button>
                <button type="button" onClick={() => setSendMode("selected")} className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${sendMode === "selected" ? `${isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'}` : `${mutedText} hover:bg-white/5`}`}>
                  Targeted
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 ${mutedText}`}>Category</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className={`w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none appearance-none ${inputFill} ${inputText}`}>
                    <option value="announcement" className={isDark ? "bg-slate-900" : ""}>Announcement</option>
                    <option value="update" className={isDark ? "bg-slate-900" : ""}>System Update</option>
                    <option value="warning" className={isDark ? "bg-slate-900" : ""}>Account Warning</option>
                    <option value="promotion" className={isDark ? "bg-slate-900" : ""}>Marketing Promotion</option>
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 ${mutedText}`}>Subject Line</label>
                  <div className="relative">
                    <Type className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Engaging title..." className={`w-full pl-11 pr-4 py-3 border rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none ${inputFill} ${inputText}`} />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col relative min-h-[200px]">
                <textarea 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Compose your broadcast message here..." 
                  className={`w-full h-full resize-none border rounded-[24px] p-6 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none ${inputFill} ${inputText}`}
                />
                <div className={`absolute right-4 bottom-4 text-[10px] font-black uppercase tracking-widest ${mutedText} opacity-40`}>
                  Markdown Supported
                </div>
              </div>
           </div>

           <div className="mt-8 shrink-0">
              <button 
                onClick={onSend} 
                disabled={!canSend || sending}
                className="w-full h-[72px] bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
              >
                {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Dispatch Transmission</>}
              </button>
           </div>
        </div>

        {/* Directory Panel */}
        <div className={`rounded-[40px] border p-8 md:p-10 flex flex-col h-[700px] ${cardBg}`}>
           <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 shadow-sm rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white' : 'bg-white text-neutral-900'}`}>
                    <Users className="w-5 h-5" />
                 </div>
                 <h2 className={`text-xl font-black tracking-tight ${headerText}`}>Directory</h2>
              </div>
              {sendMode === "selected" && (
                <div className="flex gap-2">
                   <button onClick={selectAllFiltered} className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${btnSecondary}`}>Select All</button>
                   <button onClick={clearSelected} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/20 transition-all">Clear</button>
                </div>
              )}
           </div>

           <div className="relative mb-6 shrink-0">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
              <input 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                placeholder="Filter directory..." 
                className={`w-full pl-11 pr-4 py-3 border rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none shadow-sm ${inputFill} ${inputText}`}
              />
           </div>

           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {loadingUsers ? (
                [1,2,3,4].map(i => <div key={i} className={`h-[72px] border rounded-[20px] animate-pulse ${inputFill}`} />)
              ) : filteredUsers.length === 0 ? (
                <div className={`text-center py-12 text-sm font-medium italic ${mutedText}`}>No users found matching query.</div>
              ) : (
                filteredUsers.map((u) => {
                  const e = u.email || "";
                  const checked = selectedEmails.includes(e);
                  const isSelectable = sendMode === "selected" && e;

                  return (
                    <div key={u.id || e} 
                      onClick={() => { if(isSelectable) toggleEmail(e) }}
                      className={`flex items-center justify-between p-4 border rounded-[20px] transition-all ${
                        isSelectable ? 'cursor-pointer hover:border-blue-500/30' : 'opacity-70'
                      } ${checked ? 'bg-blue-600/5 border-blue-500 shadow-md shadow-blue-500/5' : `${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-neutral-100'}`}`}
                    >
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border ${isDark ? 'bg-white/10 text-white border-white/10' : 'bg-neutral-100 text-neutral-900 border-neutral-200'}`}>
                             {(u.username || "X").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                             <div className={`text-sm font-black leading-tight flex items-center gap-2 ${headerText}`}>
                               <span className="truncate">{u.username || "Unknown"}</span>
                               {u.role && <span className={`px-2 py-[2px] rounded-full text-[9px] uppercase tracking-widest ${isDark ? 'bg-white/10 text-slate-400' : 'bg-neutral-100 text-neutral-500'}`}>{u.role}</span>}
                             </div>
                             <div className={`text-xs font-medium truncate ${mutedText}`}>{e || "No valid email"}</div>
                          </div>
                       </div>
                       {sendMode === "selected" && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600 text-white' : `${isDark ? 'border-white/10 bg-white/5' : 'border-neutral-200 bg-neutral-50'}`}`}>
                             {checked && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                       )}
                    </div>
                  )
                })
              )}
           </div>

           {sendMode !== "selected" && (
              <div className={`mt-6 p-4 border rounded-2xl flex items-start gap-3 shrink-0 ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50/50 border-blue-100'}`}>
                 <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                 <div>
                   <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>Global Mode Active</div>
                   <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-blue-400/70' : 'text-blue-700/80'}`}>This transmission will be dispatched to the entire user directory.</p>
                 </div>
              </div>
           )}
        </div>
      </div>

      {status.text && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[24px] border flex items-center gap-3 text-sm font-bold shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 z-[999] ${
          status.kind === "success" 
           ? "bg-emerald-500 text-white border-emerald-400" 
           : "bg-red-500 text-white border-red-400"
        }`}>
           {status.kind === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
           {status.text}
           <button onClick={() => setStatus({kind:"", text:""})} className="ml-2 hover:bg-white/20 p-1 rounded-full"><X className="w-4 h-4"/></button>
        </div>
      )}
    </Shell>
  );
}
