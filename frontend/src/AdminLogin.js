import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [form, setForm]       = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Nếu đã đăng nhập admin, chuyển thẳng vào dashboard
  const stored = JSON.parse(sessionStorage.getItem("admin") || "null");
  if (stored) {
    navigate("/admin/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim()) return setError("Vui lòng nhập tên đăng nhập.");
    if (!form.password)        return setError("Vui lòng nhập mật khẩu.");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/admin/login/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: form.username.trim(), password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("admin", JSON.stringify(data.admin));
        toast.success(`Chào mừng, ${data.admin?.hoten || data.admin?.tendangnhap}!`);
        navigate("/admin/dashboard");
      } else {
        setError(data.error || "Tên đăng nhập hoặc mật khẩu không đúng.");
      }
    } catch {
      setError("Không thể kết nối server. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4 font-['Manrope']">
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-2xl font-black text-white tracking-tight">LUXE ADMIN</span>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-800 mb-1">Đăng nhập quản trị</h1>
            <p className="text-slate-400 text-sm">Chỉ dành cho nhân viên và quản trị viên.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
                Tên đăng nhập
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={18} />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => { setForm({ ...form, username: e.target.value }); setError(""); }}
                  placeholder="admin"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
                Mật khẩu
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={18} />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setError(""); }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#ec5b13] transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ec5b13] text-white font-black py-4 rounded-2xl hover:bg-[#d44e0f] transition-all shadow-lg shadow-[#ec5b13]/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Đang đăng nhập...</>
                : "Đăng nhập"
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
              ← Quay về trang chủ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}