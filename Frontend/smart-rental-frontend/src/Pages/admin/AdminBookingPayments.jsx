import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { 
  Building2, Users, Receipt, CheckCircle2, 
  AlertCircle, DollarSign, Wallet, ArrowRightLeft,
  RefreshCw, ChevronRight, Hash
} from "lucide-react";

export default function AdminBookingPayments() {
  const nav = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteMap, setNoteMap] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/booking-payments/");
      setPayments(res.data || []);
    } catch (err) {
      setToast({ type: "error", msg: "Failed to synchronize payment records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

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
    <div className="bg-white rounded-[32px] p-8 border border-neutral-100 shadow-sm flex items-center gap-6">
       <div className={`w-14 h-14 bg-${color}-50 text-${color}-600 rounded-2xl flex items-center justify-center shrink-0`}>
          <Icon className="w-7 h-7" />
       </div>
       <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{title}</div>
          <div className="text-3xl font-black text-neutral-900 leading-none mb-1">{value}</div>
          {sub && <div className="text-xs font-bold text-neutral-400">{sub}</div>}
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
        <button onClick={() => nav("/admin/dashboard")} className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl transition-all">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      )}
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {toast.msg && (
          <div className={`p-4 rounded-[24px] border flex items-center gap-3 text-sm font-bold shadow-sm transition-all ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
          }`}>
             {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
             {toast.msg}
          </div>
        )}

        {/* Action Belt */}
        <div className="flex items-center justify-between p-6 bg-white border border-neutral-100 shadow-sm rounded-[32px]">
           <button onClick={fetchPayments} className="px-6 py-3 bg-neutral-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Ledger
           </button>
           <div className="px-4 py-2 bg-neutral-50 rounded-full border border-neutral-200 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
              Live Gateway Active
           </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatPanel title="Processing Queue" value={pendingPayouts} sub="Awaiting manual owner disbursement" icon={Wallet} color="amber" />
           <StatPanel title="Gross Volume" value={`Rs ${totalVolume.toLocaleString()}`} sub="Total transaction volume" icon={ArrowRightLeft} color="blue" />
           <StatPanel title="Captured Revenue" value={`Rs ${platformRevenue.toLocaleString()}`} sub="Platform commission generated" icon={DollarSign} color="emerald" />
        </div>

        {/* Payments Ledger */}
        <div className="bg-white border border-neutral-100 rounded-[40px] shadow-sm p-8">
           <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                 <Receipt className="w-6 h-6 text-blue-600" /> Transaction Register
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{payments.length} Records</span>
           </div>

           {loading ? (
             <div className="space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-neutral-50 border border-neutral-100 rounded-[24px] animate-pulse" />)}
             </div>
           ) : payments.length === 0 ? (
             <div className="text-center py-20 text-neutral-400">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <div className="font-bold">No Transactions Processed</div>
             </div>
           ) : (
             <div className="space-y-6">
                {payments.map((p) => {
                   const isPaid = p.payment_status === "COMPLETE";
                   const needsPayout = isPaid && p.owner_payout_status !== "paid";
                   
                   return (
                     <div key={p.id} className={`p-6 rounded-[32px] border transition-all ${
                       needsPayout ? 'bg-amber-50/30 border-amber-200 shadow-sm' : 'bg-neutral-50/50 border-neutral-100 hover:border-neutral-200'
                     }`}>
                        <div className="flex flex-col lg:flex-row gap-8 justify-between">
                           
                           {/* Details Section */}
                           <div className="flex-1 space-y-6">
                              <div className="flex items-start justify-between gap-4">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                         isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                       }`}>
                                         Tenant: {p.payment_status}
                                       </span>
                                       <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                         p.owner_payout_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                       }`}>
                                         Owner: {p.owner_payout_status}
                                       </span>
                                    </div>
                                    <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2 mt-2">
                                       <Building2 className="w-4 h-4 text-blue-500" /> {p.listing_title}
                                    </h3>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Total Authorized</div>
                                    <div className="text-2xl font-black text-neutral-900">Rs {p.amount}</div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 <div className="bg-white p-4 rounded-[20px] border border-neutral-100">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                                       <Users className="w-3.5 h-3.5 text-blue-400" /> Tenant
                                    </div>
                                    <div className="text-xs font-bold text-neutral-900 break-all">{p.tenant_name}</div>
                                 </div>
                                 <div className="bg-white p-4 rounded-[20px] border border-neutral-100">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                                       <Building2 className="w-3.5 h-3.5 text-blue-400" /> Owner
                                    </div>
                                    <div className="text-xs font-bold text-neutral-900 break-all">{p.owner_name}</div>
                                 </div>
                                 <div className="bg-white p-4 rounded-[20px] border border-neutral-100 border-l-4 border-l-emerald-500">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Platform Cut ({p.admin_share_percent}%)</div>
                                    <div className="text-base font-black text-emerald-600">Rs {p.admin_share_amount}</div>
                                 </div>
                                 <div className="bg-white p-4 rounded-[20px] border border-neutral-100 border-l-4 border-l-amber-500">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Owner Cut ({p.owner_share_percent}%)</div>
                                    <div className="text-base font-black text-amber-600">Rs {p.owner_share_amount}</div>
                                 </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-bold text-neutral-400 bg-white px-4 py-2.5 rounded-full border border-neutral-100 inline-flex">
                                 <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> TXN: {p.transaction_uuid}</div>
                                 <div className="w-1 h-1 bg-neutral-200 rounded-full" />
                                 <div>REF: {p.ref_id || 'N/A'}</div>
                              </div>
                           </div>

                           {/* Actions Section */}
                           {needsPayout && (
                             <div className="lg:w-[320px] bg-white rounded-[24px] border border-amber-100 p-6 flex flex-col justify-between shadow-sm">
                                <div>
                                   <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                                      <Wallet className="w-4 h-4" /> Action Required
                                   </div>
                                   <textarea 
                                     placeholder="e.g. Wire transfer ref #8483"
                                     value={noteMap[p.id] || ""}
                                     onChange={(e) => setNoteMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                     className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none resize-none h-24 mb-4"
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
                })}
             </div>
           )}
        </div>
      </div>
    </Shell>
  );
}