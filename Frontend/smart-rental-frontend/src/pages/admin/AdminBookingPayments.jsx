import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import { 
  Building2, Users, Receipt, CheckCircle2,
  AlertCircle, DollarSign, Wallet, ArrowRightLeft,
  RefreshCw, ChevronRight, Hash, LayoutDashboard
} from "lucide-react";

export default function AdminBookingPayments() {
  const nav = useNavigate();
  const { isDark } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteMap, setNoteMap] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  // Theme Constants
  const cardBg = isDark ? "bg-white/5 border-white/10 backdrop-blur-md" : "bg-white border-neutral-100 shadow-sm";
  const headerText = isDark ? "text-white" : "text-neutral-900";
  const mutedText = isDark ? "text-slate-400" : "text-neutral-400";
  const inputText = isDark ? "text-slate-200" : "text-neutral-700";
  const inputFill = isDark ? "bg-white/5 border-white/10" : "bg-neutral-50 border-neutral-200";

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/booking-payments/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setPayments(list);
    } catch (err) {
      setToast({ type: "error", msg: "Failed to synchronize payment records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "info", msg: "" }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const markOwnerPaid = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/booking-payments/${id}/owner-paid/`, {
        owner_payout_note: noteMap[id] || "Owner paid by admin",
      });
      setToast({ type: "success", msg: "Payout logged successfully." });
      fetchPayments();
    } catch (err) {
      setToast({ type: "error", msg: "Failed to allocate owner funds." });
    } finally {
      setProcessingId(null);
    }
  };

  const StatPanel = ({ title, value, sub, icon: Icon, color = "blue" }) => (
    <div className={`rounded-[32px] p-8 border flex items-center gap-6 ${cardBg}`}>
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
         isDark ? `bg-${color}-500/10 text-${color}-400` : `bg-${color}-50 text-${color}-600`
       }`}>
          <Icon className="w-7 h-7" />
       </div>
       <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>{title}</div>
          <div className={`text-3xl font-black leading-none mb-1 ${headerText}`}>{value}</div>
          {sub && <div className={`text-xs font-bold ${mutedText}`}>{sub}</div>}
       </div>
    </div>
  );

  const pendingPayouts = payments.filter(p => p.payment_status === "COMPLETE" && p.owner_payout_status !== "paid").length;
  const totalVolume = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const platformRevenue = payments.reduce((acc, p) => acc + Number(p.admin_share_amount || 0), 0);

  return (
    <Shell
      title="Financial Ledger"
      subtitle="Monitor transactional flow, platform revenue, and owner payouts."
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
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {toast.msg && (
          <div className={`p-4 rounded-[24px] border flex items-center gap-3 text-sm font-bold shadow-sm transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
              : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}>
             {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
             {toast.msg}
          </div>
        )}

        {/* Global Stats */}
        <div className="grid md:grid-cols-3 gap-6">
           <StatPanel 
             title="Gross Volume" 
             value={`Rs ${totalVolume.toLocaleString()}`} 
             sub="Total transaction flow"
             icon={ArrowRightLeft}
             color="blue"
           />
           <StatPanel 
             title="Platform Revenue" 
             value={`Rs ${platformRevenue.toLocaleString()}`} 
             sub="20% platform share"
             icon={Wallet}
             color="emerald"
           />
           <StatPanel 
             title="Pending Payouts" 
             value={pendingPayouts} 
             sub="Due to property owners"
             icon={Receipt}
             color="amber"
           />
        </div>

        {/* Sync Action */}
        <div className={`flex items-center justify-between p-6 border shadow-sm rounded-[32px] ${cardBg}`}>
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-neutral-50'}`}>
                 <RefreshCw className={`w-5 h-5 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
              </div>
              <div>
                 <div className={`text-sm font-black ${headerText}`}>Transaction Synchronization</div>
                 <p className={`text-[11px] font-medium ${mutedText}`}>Keep records aligned with payment gateway</p>
              </div>
           </div>
           <button 
             onClick={fetchPayments} 
             className={`px-6 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all ${
               isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10' : 'bg-neutral-900 hover:bg-black text-white'
             }`}
           >
              Sync Ledger
           </button>
        </div>

        {/* List of Payments */}
        <div className="space-y-6">
           {loading ? (
              <div className="space-y-4">
                 {[1,2,3].map(i => <div key={i} className={`h-64 rounded-[40px] border animate-pulse ${cardBg}`} />)}
              </div>
           ) : payments.length === 0 ? (
              <div className={`py-40 flex flex-col items-center text-center ${mutedText}`}>
                 <Receipt className="w-20 h-20 opacity-10 mb-6" />
                 <h3 className="text-sm font-black uppercase tracking-widest">No Transactions Found</h3>
              </div>
           ) : (
              payments.map((p) => {
                 const needsPayout = p.payment_status === "COMPLETE" && p.owner_payout_status !== "paid";
                 const isPaid = p.payment_status === "COMPLETE";

                 return (
                    <div key={p.id} className={`rounded-[40px] border shadow-sm p-8 transition-all hover:shadow-xl ${cardBg}`}>
                       <div className="flex flex-col lg:flex-row gap-8">
                          <div className="flex-1 space-y-6">
                             {/* Header Row */}
                             <div className="flex items-center justify-between">
                                <div>
                                   <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                      }`}>
                                        Payment: {p.payment_status}
                                      </span>
                                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        p.owner_payout_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                      }`}>
                                        Payout: {p.owner_payout_status}
                                      </span>
                                   </div>
                                   <h3 className={`text-xl font-black flex items-center gap-2 ${headerText}`}>
                                      <Building2 className="w-5 h-5 text-blue-500" /> {p.listing_title || `Property #${p.listing}`}
                                   </h3>
                                </div>
                                <div className="text-right">
                                   <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Transaction Total</div>
                                   <div className={`text-3xl font-black ${headerText}`}>Rs {Number(p.amount).toLocaleString()}</div>
                                </div>
                             </div>

                             {/* Breakdown Grid */}
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className={`p-4 rounded-[20px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-neutral-100'}`}>
                                   <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-2 ${mutedText}`}>
                                      <Users className="w-3.5 h-3.5 text-blue-400" /> Tenant
                                   </div>
                                   <div className={`text-xs font-bold break-all ${headerText}`}>{p.tenant_name || 'N/A'}</div>
                                </div>
                                <div className={`p-4 rounded-[20px] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-neutral-100'}`}>
                                   <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-2 ${mutedText}`}>
                                      <Building2 className="w-3.5 h-3.5 text-blue-400" /> Owner
                                   </div>
                                   <div className={`text-xs font-bold break-all ${headerText}`}>{p.owner_name || 'N/A'}</div>
                                </div>
                                <div className={`p-4 rounded-[20px] border border-l-4 border-l-emerald-500 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-neutral-100'}`}>
                                   <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${mutedText}`}>Platform Revenue</div>
                                   <div className="text-base font-black text-emerald-500">Rs {Number(p.admin_share_amount).toLocaleString()}</div>
                                </div>
                                <div className={`p-4 rounded-[20px] border border-l-4 border-l-amber-500 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-neutral-100'}`}>
                                   <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${mutedText}`}>Owner Payout</div>
                                   <div className="text-base font-black text-amber-500">Rs {Number(p.owner_share_amount).toLocaleString()}</div>
                                </div>
                             </div>

                             {/* Metadata */}
                             <div className={`flex flex-wrap items-center gap-4 text-[10px] font-bold px-4 py-2.5 rounded-full border border-dashed ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}>
                                <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> TXN: {p.transaction_uuid}</div>
                                <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-neutral-300'}`} />
                                <div className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> REF: {p.ref_id || 'N/A'}</div>
                             </div>
                          </div>

                          {/* Actions Section */}
                          {needsPayout && (
                             <div className={`lg:w-[320px] rounded-[32px] border p-6 flex flex-col justify-between shadow-sm ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                                <div>
                                   <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                                      <Wallet className="w-4 h-4" /> Action Required
                                   </div>
                                   <textarea 
                                     placeholder="e.g. Bank transfer ID #123"
                                     value={noteMap[p.id] || ""}
                                     onChange={(e) => setNoteMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                     className={`w-full border rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none resize-none h-24 mb-4 ${inputFill} ${isDark ? 'text-slate-200' : 'text-neutral-700'}`}
                                   />
                                </div>
                                <button 
                                  onClick={() => markOwnerPaid(p.id)}
                                  disabled={processingId === p.id}
                                  className="w-full py-3.5 bg-neutral-900 hover:bg-black text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-neutral-900/10 transition-all disabled:opacity-50"
                                >
                                  {processingId === p.id ? "Processing..." : "Log Disbursement"}
                                </button>
                             </div>
                          )}
                       </div>
                    </div>
                 )
              })
           )}
        </div>
      </div>
    </Shell>
  );
}