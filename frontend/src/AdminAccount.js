import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Eye, EyeOff, Save, Loader2,
  AlertCircle, CheckCircle, Shield,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

export default function AdminAccount() {
  const navigate = useNavigate();
  const toast    = useToast();
  const admin    = JSON.parse(sessionStorage.getItem("admin") || "null");

  // Profile
  const [profile,      setProfile]      = useState({
    full_name: admin?.hoten || admin?.full_name || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password:     "",
    confirm_password: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  const [passError,   setPassError]   = useState("");

  if (!admin) {
    navigate("/admin", { replace: true });
    return null;
  }

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim()) {
      toast.error("Họ tên không được để trống.");
      return;
    }
    setSavingProfile(true);
    try {
      // Cập nhật localStorage tạm (backend chưa có API update admin profile)
      const updated = { ...admin, hoten: profile.full_name.trim(), full_name: profile.full_name.trim() };
      sessionStorage.setItem("admin", JSON.stringify(updated));
      toast.success("Đã cập nhật thông tin tài khoản!");
    } catch {
      toast.error("Không thể lưu thông tin.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError("");

    if (!passwords.current_password) return setPassError("Vui lòng nhập mật khẩu hiện tại.");
    if (!passwords.new_password)     return setPassError("Vui lòng nhập mật khẩu mới.");
    if (passwords.new_password.length < 6) return setPassError("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (passwords.new_password !== passwords.confirm_password) return setPassError("Mật khẩu xác nhận không khớp.");

    setSavingPass(true);
    try {
      const res  = await fetch(`${API}/staff/change-password/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          admin_id:         admin.id,
          current_password: passwords.current_password,
          new_password:     passwords.new_password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đổi mật khẩu thành công!");
        setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      } else {
        setPassError(data.error || "Mật khẩu hiện tại không đúng.");
      }
    } catch {
      setPassError("Không thể kết nối server.");
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Tài khoản</h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý thông tin và bảo mật tài khoản</p>
        </div>

        <div className="max-w-2xl space-y-6">

          {/* Thông tin tài khoản */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-[#ec5b13]/10 rounded-xl flex items-center justify-center">
                <User size={18} className="text-[#ec5b13]" />
              </div>
              <h2 className="font-black text-slate-800 text-base">Thông tin tài khoản</h2>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[#ec5b13] flex items-center justify-center text-white text-2xl font-black shrink-0">
                {(admin.hoten || admin.full_name || admin.username || "A")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-800 text-lg">{admin.hoten || admin.full_name || admin.username}</p>
                <p className="text-sm text-slate-400">{admin.tendangnhap || admin.username}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${admin.role === 1 ? "bg-[#ec5b13]/10 text-[#ec5b13]" : "bg-slate-100 text-slate-500"}`}>
                  {admin.role === 1 ? "Quản trị viên" : "Nhân viên"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tên đăng nhập</label>
                <input
                  value={admin.tendangnhap || admin.username || ""}
                  disabled
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-300 font-bold mt-1">Tên đăng nhập không thể thay đổi</p>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Họ và tên</label>
                <input
                  value={profile.full_name}
                  onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Nhập họ và tên..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="mt-5 flex items-center gap-2 px-6 py-3 bg-[#ec5b13] text-white rounded-xl font-black text-sm hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/20 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu thay đổi
            </button>
          </div>

          {/* Đổi mật khẩu */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Lock size={18} className="text-blue-500" />
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-base">Đổi mật khẩu</h2>
                <p className="text-xs text-slate-400 font-medium">Mật khẩu mới phải có ít nhất 6 ký tự</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Mật khẩu hiện tại */}
              {[
                { label: "Mật khẩu hiện tại", key: "current_password", show: showCurrent, setShow: setShowCurrent },
                { label: "Mật khẩu mới",      key: "new_password",     show: showNew,     setShow: setShowNew     },
                { label: "Xác nhận mật khẩu", key: "confirm_password", show: showConfirm, setShow: setShowConfirm },
              ].map(({ label, key, show, setShow }) => (
                <div key={key}>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={passwords[key]}
                      onChange={e => { setPasswords({ ...passwords, [key]: e.target.value }); setPassError(""); }}
                      className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
                    />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              ))}

              {passError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" /> {passError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPass}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-black text-sm hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {savingPass ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Đổi mật khẩu
              </button>
            </form>
          </div>

          {/* Bảo mật */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-green-600" />
              </div>
              <h2 className="font-black text-slate-800 text-base">Thông tin bảo mật</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Mã tài khoản", value: admin.id },
                { label: "Quyền hạn",    value: admin.role === 1 ? "Quản trị viên (cấp cao nhất)" : "Nhân viên" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}