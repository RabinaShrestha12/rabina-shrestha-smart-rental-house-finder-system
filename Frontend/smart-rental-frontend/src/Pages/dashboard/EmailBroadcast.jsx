import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import { 
  Send, Users, Mail, Type, CheckCircle2, 
  AlertCircle, Search, RefreshCw, ChevronRight, X
} from "lucide-react";

export default function EmailBroadcast() {
  const nav = useNavigate();
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
        <button onClick={() => nav("/admin/dashboard")} className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl transition-all">
          <X className="w-5 h-5" />
        </button>
      )}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Status Alert */}
        {status.text && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${
            status.kind === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
          }`}>
             {status.kind === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
             {status.text}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Composer Canvas */}
          <div className="bg-white rounded-[40px] border border-neutral-100 p-8 md:p-10 shadow-sm flex flex-col h-[700px]">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                   <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Composer</h2>
             </div>

             <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100 gap-1 shrink-0">
                  <button type="button" onClick={() => setSendMode("all")} className={`py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${sendMode === "all" ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:bg-neutral-100"}`}>
                    Global Cast
                  </button>
                  <button type="button" onClick={() => setSendMode("selected")} className={`py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${sendMode === "selected" ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:bg-neutral-100"}`}>
                    Targeted
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Category</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none appearance-none">
                      <option value="announcement">Announcement</option>
                      <option value="update">System Update</option>
                      <option value="warning">Account Warning</option>
                      <option value="promotion">Marketing Promotion</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Subject Line</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Engaging title..." className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col relative min-h-[200px]">
                  <textarea 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    placeholder="Compose your broadcast message here..." 
                    className="w-full h-full resize-none bg-neutral-50 border border-neutral-200 rounded-[24px] p-6 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none"
                  />
                  <div className="absolute right-4 bottom-4 text-[10px] font-black uppercase tracking-widest text-neutral-300">
                    Markdown Supported
                  </div>
                </div>
             </div>

             <div className="mt-8 shrink-0">
                <button 
                  onClick={onSend} 
                  disabled={!canSend || sending}
                  className="w-full h-[72px] bg-neutral-900 hover:bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-neutral-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Dispatch Transmission</>}
                </button>
             </div>
          </div>

          {/* Directory Panel */}
          <div className="bg-neutral-50/50 rounded-[40px] border border-neutral-100 p-8 md:p-10 flex flex-col h-[700px]">
             <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white shadow-sm text-neutral-900 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5" />
                   </div>
                   <h2 className="text-xl font-black text-neutral-900 tracking-tight">Directory</h2>
                </div>
                {sendMode === "selected" && (
                  <div className="flex gap-2">
                     <button onClick={selectAllFiltered} className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-[10px] font-black text-neutral-600 uppercase tracking-widest hover:bg-neutral-50 transition-all">Select All</button>
                     <button onClick={clearSelected} className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 transition-all">Clear</button>
                  </div>
                )}
             </div>

             <div className="relative mb-6 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                  placeholder="Filter directory by handle, email, or role..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none shadow-sm"
                />
             </div>

             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {loadingUsers ? (
                  [1,2,3,4].map(i => <div key={i} className="h-[72px] bg-white border border-neutral-100 rounded-[20px] animate-pulse" />)
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-sm font-medium text-neutral-400 italic">No users found matching query.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const e = u.email || "";
                    const checked = selectedEmails.includes(e);
                    const isSelectable = sendMode === "selected" && e;

                    return (
                      <div key={u.id || e} 
                        onClick={() => { if(isSelectable) toggleEmail(e) }}
                        className={`flex items-center justify-between p-4 bg-white border rounded-[20px] transition-all ${
                          isSelectable ? 'cursor-pointer hover:border-blue-200' : 'opacity-70 border-neutral-100'
                        } ${checked ? 'border-blue-500 shadow-md shadow-blue-500/10' : 'border-neutral-100'}`}
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-xs font-black text-neutral-900 border border-neutral-200">
                               {(u.username || "X").charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <div className="text-sm font-black text-neutral-900 leading-tight flex items-center gap-2">
                                 {u.username || "Unknown"}
                                 {u.role && <span className="px-2 py-[2px] bg-neutral-100 rounded-full text-[9px] uppercase tracking-widest text-neutral-500">{u.role}</span>}
                               </div>
                               <div className="text-xs font-medium text-neutral-500">{e || "No valid email"}</div>
                            </div>
                         </div>
                         {sendMode === "selected" && (
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-200 bg-neutral-50'}`}>
                               {checked && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                         )}
                      </div>
                    )
                  })
                )}
             </div>

             {sendMode !== "selected" && (
                <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 shrink-0">
                   <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                   <div>
                     <div className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Global Mode Active</div>
                     <p className="text-[10px] text-blue-700/80 font-medium leading-relaxed">This transmission will be dispatched to the entire user directory. Switch to Targeted Mode to cherry-pick specific recipients.</p>
                   </div>
                </div>
             )}
          </div>

        </div>
      </div>
    </Shell>
  );
}
