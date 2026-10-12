// ════════════════════════════════════════════════════
// Forgotpassword.js — Updated with Toast
// ════════════════════════════════════════════════════
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockOpen, Mail, AlertCircle, Loader2, Send } from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000";

export default function Forgotpassword() {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSendOTP = async () => {
    setError("");

    if (!email.trim())                              { setError("Vui lòng nhập email"); return; }
    if (email.includes(" "))                        { setError("Email không được chứa dấu cách"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email không hợp lệ"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      if (res.ok || res.status === 500) {
        sessionStorage.setItem("reset_email", email);
        toast.info("Mã OTP đã được gửi đến email của bạn.");
        navigate("/login/forgot_password/otp");
        return;
      }

      const data = await res.json();
      setError(data.message || "Có lỗi xảy ra");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fcfdfc] font-display relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle at 2px 2px, rgba(45,90,39,0.05) 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/2 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#2d5a27]/10 rounded-full blur-3xl" />
      </div>
      <div className="fixed bottom-0 left-0 -z-10 w-1/3 h-1/2 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#2d5a27]/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-xl font-black tracking-tight text-slate-900 uppercase">Luxe Glow</span>
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl p-10 shadow-2xl shadow-[#2d5a27]/5 border border-slate-100 mt-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#2d5a27]/10 flex items-center justify-center mb-4 text-[#2d5a27]">
            <LockOpen size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Quên mật khẩu</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Nhập email của bạn để nhận mã OTP đặt lại mật khẩu.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
          <div className="relative group">
            <Mail size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2d5a27] transition-colors" />
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className={`w-full h-12 pl-11 pr-4 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2
                ${error
                  ? "border-red-400 focus:ring-red-400/20 focus:border-red-400"
                  : "border-slate-200 focus:ring-[#2d5a27]/20 focus:border-[#2d5a27]"
                }`}
            />
          </div>
          {error && (
            <p className="flex items-center gap-1 text-red-500 text-xs ml-1 mt-0.5">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>

        <button
          onClick={handleSendOTP}
          disabled={loading}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#2d5a27] hover:bg-[#2d5a27]/90 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#2d5a27]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Đang gửi...</> : <><Send size={18} /> Gửi OTP</>}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Nhớ mật khẩu rồi?{" "}
            <a href="/login" className="text-[#2d5a27] font-bold hover:underline ml-1">Đăng nhập</a>
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 text-center text-slate-400 text-xs">
        <p>© 2024 Luxe Glow Cosmetics. All rights reserved.</p>
      </div>
    </div>
  );
}