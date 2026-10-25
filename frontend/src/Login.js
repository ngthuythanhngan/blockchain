import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullname: "", email: "", password: "" });
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // ── ĐĂNG NHẬP / ĐĂNG KÝ THƯỜNG ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) return setError("Vui lòng nhập email.");
    if (!/^[^\s@]+@(gmail\.com|student\.ctuet\.edu\.vn)$/.test(form.email.trim().toLowerCase()))
      return setError("Email phải là @gmail.com hoặc @student.ctuet.edu.vn.");
    if (!form.password) return setError("Vui lòng nhập mật khẩu.");
    if (/\s/.test(form.password)) return setError("Mật khẩu không được chứa khoảng trắng.");
    if (!isLogin && !form.fullname.trim()) return setError("Vui lòng nhập họ tên.");
    if (!isLogin && form.password.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự.");

    setLoading(true);
    try {
      const endpoint = isLogin ? `${API}/auth/login/` : `${API}/auth/register/`;
      const body = isLogin
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : { email: form.email.trim().toLowerCase(), password: form.password, fullname: form.fullname.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      sessionStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("userUpdated"));
      toast.success(isLogin ? "Đăng nhập thành công!" : "Đăng ký thành công! Chào mừng bạn.");
      navigate("/");
    } catch {
      setError("Không thể kết nối server. Vui lòng kiểm tra kết nối.");
    } finally {
      setLoading(false);
    }
  };

  // ── ĐĂNG NHẬP GOOGLE ──
  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const info = await infoRes.json();

        const res = await fetch(`${API}/auth/google/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            google_id: info.sub,
            email: info.email,
            fullname: info.name,
            avatar: info.picture,
          }),
        });
        const data = await res.json();

        if (res.ok || res.status === 201) {
          sessionStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("userUpdated"));
          toast.success("Đăng nhập Google thành công!");
          navigate("/");
        } else {
          setError(data.error || "Đăng nhập Google thất bại.");
        }
      } catch {
        setError("Không thể kết nối với Google. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Đăng nhập Google bị hủy hoặc thất bại."),
  });

  return (
    <div className="min-h-screen bg-[#F0F2F0] flex items-center justify-center p-4 font-['Manrope']">
      <div className="w-full max-w-[1000px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[700px]">

        {/* CỘT TRÁI */}
        <div className="md:w-[45%] relative hidden md:block">
          <img
            src="https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1974&auto=format&fit=crop"
            alt="Skincare"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D5A27]/90 via-[#2D5A26]/60 to-transparent"></div>
          <div className="relative h-full z-10 p-12 flex flex-col justify-between text-white">
            <div>
              <span className="text-4xl font-black tracking-tighter uppercase text-[#2D5A27]">Luxe Glow</span>
              <h1 className="text-4xl font-bold leading-tight mt-6">
                Xác thực mỹ phẩm <br /> an tâm làm đẹp.
              </h1>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl">
              <p className="text-sm font-medium leading-relaxed italic">
                "Minh bạch nguồn gốc, xác thực thông tin, bảo vệ niềm tin người tiêu dùng."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=32" alt="avatar" />
                </div>
                <div>
                  <p className="text-xs font-bold">Anna Nguyễn</p>
                  <p className="text-[10px] opacity-70">Founder of Luxe Glow</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="md:w-[55%] p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-extrabold text-[#121A11] mb-2">
                {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLogin ? "Chào mừng bạn quay trở lại với Luxe Glow!" : "Đăng ký để khám phá và xác minh nguồn gốc mỹ phẩm."}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2D5A27] transition-colors" size={20} />
                  <input
                    name="fullname"
                    type="text"
                    placeholder="Họ và tên của bạn"
                    value={form.fullname}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27] outline-none transition-all"
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2D5A27] transition-colors" size={20} />
                <input
                  name="email"
                  type="email"
                  placeholder="Email đăng nhập"
                  value={form.email}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27] outline-none transition-all"
                  onChange={handleChange}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2D5A27] transition-colors" size={20} />
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Mật khẩu"
                  value={form.password}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#2D5A27]/10 focus:border-[#2D5A27] outline-none transition-all"
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2D5A27]"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button type="button" onClick={() => navigate("/login/forgot_password")} className="text-xs font-bold text-[#2D5A27] hover:opacity-70">
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2D5A27] text-white font-bold py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-lg shadow-[#2D5A27]/20 flex items-center justify-center gap-2 group mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <>{isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ NGAY"}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Hoặc đăng nhập qua</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={() => loginGoogle()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-700 text-sm disabled:opacity-60"
              >
                <FcGoogle size={20} /> Đăng nhập với Google
              </button>

              <div className="pt-6 text-center">
                <p className="text-slate-500 text-sm">
                  {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(""); setForm({ fullname: "", email: "", password: "" }); }}
                    className="text-[#2D5A27] font-extrabold hover:underline"
                  >
                    {isLogin ? "Tạo tài khoản" : "Đăng nhập ngay"}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}