import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Lock, LockOpen, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000";

export default function Resetpassword() {
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();
  const toast    = useToast();

  const validatePassword = (pass) => {
    if (!pass)              return "Vui lòng nhập mật khẩu";
    if (pass.includes(" ")) return "Mật khẩu không được chứa dấu cách";
    if (pass.length < 6)    return "Mật khẩu phải có ít nhất 6 ký tự";
    return "";
  };

  const handleSubmit = async () => {
    const newErrors = {};
    const passError = validatePassword(password);
    if (passError) newErrors.password = passError;
    if (!confirm)                   newErrors.confirm = "Vui lòng nhập lại mật khẩu";
    else if (confirm.includes(" ")) newErrors.confirm = "Mật khẩu không được chứa dấu cách";
    else if (password !== confirm)  newErrors.confirm = "Mật khẩu không trùng khớp";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const email = sessionStorage.getItem("reset_email");
    if (!email) {
      toast.error("Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.");
      navigate("/login/forgot_password");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.removeItem("reset_email");
        toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
        navigate("/login");
      } else {
        toast.error(data.message || data.error || "Có lỗi xảy ra.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
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
            <KeyRound size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Tạo mật khẩu mới</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Mật khẩu mới phải có ít nhất 6 ký tự và không chứa dấu cách.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">Mật khẩu mới</label>
            <div className="relative group">
              <Lock size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2d5a27] transition-colors" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Nhập mật khẩu mới"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                className={`w-full h-12 pl-11 pr-11 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2
                  ${errors.password ? "border-red-400 focus:ring-red-400/20" : "border-slate-200 focus:ring-[#2d5a27]/20 focus:border-[#2d5a27]"}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 text-red-500 text-xs ml-1 mt-0.5">
                <AlertCircle size={14} className="shrink-0" /> <span>{errors.password}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">Xác nhận mật khẩu</label>
            <div className="relative group">
              <LockOpen size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2d5a27] transition-colors" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: "" })); }}
                className={`w-full h-12 pl-11 pr-11 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2
                  ${errors.confirm ? "border-red-400 focus:ring-red-400/20" : "border-slate-200 focus:ring-[#2d5a27]/20 focus:border-[#2d5a27]"}`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirm && (
              <p className="flex items-center gap-1 text-red-500 text-xs ml-1 mt-0.5">
                <AlertCircle size={14} className="shrink-0" /> <span>{errors.confirm}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-[#2d5a27] hover:bg-[#2d5a27]/90 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#2d5a27]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Đang cập nhật...</> : <><CheckCircle size={18} /> Xác nhận</>}
          </button>
        </div>

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