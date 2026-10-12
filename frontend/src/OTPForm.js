import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertCircle, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000";

export default function OTPForm() {
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate  = useNavigate();
  const toast     = useToast();

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) { setError("Vui lòng nhập đủ 6 số"); return; }

    const email = sessionStorage.getItem("reset_email");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/verify-otp/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, otp: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Xác minh OTP thành công!");
        navigate("/login/forgot_password/otp/reset_password");
      } else {
        setError(data.message || "OTP không chính xác.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    const email = sessionStorage.getItem("reset_email");
    setError("");
    setOtp(["", "", "", "", "", ""]);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (res.ok || res.status === 500) {
        setCountdown(60);
        setCanResend(false);
        inputRefs.current[0]?.focus();
        toast.info("Đã gửi lại mã OTP.");
        return;
      }
      const data = await res.json();
      setError(data.message || "Không thể gửi lại OTP.");
    } catch {
      setError("Không thể kết nối server");
    }
  };

  const email = sessionStorage.getItem("reset_email") || "";

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
            <Mail size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Nhập mã OTP</h1>
          <p className="text-sm text-slate-500 leading-relaxed">Mã xác minh đã được gửi đến</p>
          <p className="text-sm font-semibold text-[#2d5a27] mt-1 truncate max-w-full">{email}</p>
        </div>

        <div className="flex justify-center gap-3 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-12 h-14 text-center text-xl font-bold bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2
                ${error
                  ? "border-red-400 focus:ring-red-400/20 focus:border-red-400 text-red-500"
                  : digit
                    ? "border-[#2d5a27] focus:ring-[#2d5a27]/20 focus:border-[#2d5a27] text-[#2d5a27]"
                    : "border-slate-200 focus:ring-[#2d5a27]/20 focus:border-[#2d5a27] text-slate-900"
                }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-red-500 text-sm mb-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          {canResend ? (
            <button onClick={handleResend} className="flex items-center gap-1.5 text-sm font-semibold text-[#2d5a27] hover:underline transition-colors">
              <RefreshCw size={16} /> Gửi lại OTP
            </button>
          ) : (
            <p className="text-sm text-slate-400">
              Gửi lại sau <span className="font-semibold text-slate-700">{countdown}s</span>
            </p>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#2d5a27] hover:bg-[#2d5a27]/90 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#2d5a27]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Đang xác nhận...</> : <><CheckCircle size={18} /> Xác nhận</>}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Không nhận được mã?{" "}
            <a href="/login/forgot_password" className="text-[#2d5a27] font-bold hover:underline ml-1">Thử lại</a>
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 text-center text-slate-400 text-xs">
        <p>© 2024 Luxe Glow Cosmetics. All rights reserved.</p>
      </div>
    </div>
  );
}