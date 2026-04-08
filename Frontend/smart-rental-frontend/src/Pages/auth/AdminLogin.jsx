import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ShieldAlert, Lock, Mail, ChevronRight, Home } from "lucide-react";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginAdmin(email, password);
      if ((data.role || "").toLowerCase() === "admin") {
        nav("/admin");
      } else {
        setError("Unauthorized access. Admin credentials required.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Authentication failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Back to Home */}
      <button 
        onClick={() => nav("/")}
        className="absolute top-8 left-8 text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
      >
        <Home className="w-4 h-4" /> Back to Website
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 mb-6 shadow-2xl shadow-red-500/10">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">System Management</h1>
          <p className="text-neutral-500 font-medium tracking-wide">Authorized Personnel Only</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[32px] shadow-2xl shadow-black/50">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Admin Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-600 group-focus-within:text-red-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="admin@luxerentals.com"
                  className="block w-full pl-12 pr-4 py-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-white placeholder:text-neutral-700 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all font-mono text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Secret Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-600 group-focus-within:text-red-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="block w-full pl-12 pr-4 py-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-white placeholder:text-neutral-700 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all font-mono text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-red-900/20 group mt-4"
            >
              {loading ? "Authenticating..." : "Initialize Access"}
              {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.3em]">
            Physical Terminal Security Active
          </p>
        </div>
      </div>
    </div>
  );
}
