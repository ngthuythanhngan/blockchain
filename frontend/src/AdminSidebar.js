import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart,
  Users, Menu, X, Tag, LogOut, UserCircle, Layers,
  FileText, Image, Bell,
} from "lucide-react";

const API = "http://localhost:8000/api";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [badge,  setBadge]  = useState(0);   // tổng pending chưa xử lý

  const admin = JSON.parse(sessionStorage.getItem("admin") || "null");

  // Fetch badge số thông báo mỗi 30 giây
  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const res  = await fetch(`${API}/admin/notifications/`);
        const data = await res.json();
        if (res.ok) setBadge(data.total_pending || 0);
      } catch {}
    };
    fetchBadge();
    const timer = setInterval(fetchBadge, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("admin");
    navigate("/admin", { replace: true });
  };

  const navItems = [
    {
      icon:  <LayoutDashboard size={20} />,
      label: "Tổng quan",
      path:  "/admin/dashboard",
      match: (p) => p === "/admin/dashboard",
    },
    {
      icon:  <Package size={20} />,
      label: "Sản phẩm",
      path:  "/admin/adminproduct",
      match: (p) => p.includes("/admin/adminproduct"),
    },
    {
      icon:  <ShoppingCart size={20} />,
      label: "Đơn hàng",
      path:  "/admin/orders",
      match: (p) => p.startsWith("/admin/orders"),
    },
    {
      icon:  <Users size={20} />,
      label: "Khách hàng",
      path:  "/admin/customer",
      match: (p) => p === "/admin/customer",
    },
    {
      icon:  <Tag size={20} />,
      label: "Khuyến mãi",
      path:  "/admin/sales",
      match: (p) => p === "/admin/sales",
    },
    {
      icon:  <Layers size={20} />,
      label: "Danh mục",
      path:  "/admin/categories",
      match: (p) => p === "/admin/categories",
    },
    {
      icon:  <UserCircle size={20} />,
      label: "Tài khoản",
      path:  "/admin/account",
      match: (p) => p === "/admin/account",
    },
    {
      icon:  <FileText size={20} />,
      label: "Blog",
      path:  "/admin/blog",
      match: (p) => p.startsWith("/admin/blog"),
    },
    {
      icon:  <Image size={20} />,
      label: "Banner",
      path:  "/admin/banner",
      match: (p) => p.startsWith("/admin/banner"),
    },
    {
      icon:  <Bell size={20} />,
      label: "Thông báo",
      path:  "/admin/notifications",
      match: (p) => p.startsWith("/admin/notifications"),
      badge: badge,   // số chưa xử lý
    },
  ];

  return (
    <aside
      className={`${
        isOpen ? "w-72" : "w-20"
      } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50 flex-shrink-0 h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        {isOpen && (
          <span className="font-black text-xl tracking-tighter text-[#ec5b13]">
            LUXE ADMIN
          </span>
        )}
      </div>

      {/* Thông tin admin */}
      {isOpen && admin && (
        <div className="mx-4 mb-2 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ec5b13] flex items-center justify-center text-white font-black text-sm shrink-0">
              {(admin.hoten || admin.full_name || admin.username || "A")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 text-sm truncate">
                {admin.hoten || admin.full_name || admin.username}
              </p>
              <p className="text-[10px] font-bold text-slate-400 truncate">
                {admin.role === 1 ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.match(location.pathname);
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.match(location.pathname)) {
                  window.scrollTo({ top: 0, behavior: "instant" });
                } else {
                  navigate(item.path);
                }
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                active
                  ? "bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/20"
                  : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className={`relative ${active ? "text-white" : "text-slate-400 group-hover:text-[#ec5b13]"}`}>
                {item.icon}
                {/* Badge dot khi sidebar thu gọn */}
                {!isOpen && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-black">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              {isOpen && (
                <span className="font-bold text-sm tracking-tight flex-1 text-left">{item.label}</span>
              )}
              {/* Badge số khi sidebar mở */}
              {isOpen && item.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  active ? "bg-white/30 text-white" : "bg-red-100 text-red-600"
                }`}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Đăng xuất + Toggle */}
      <div className="p-4 border-t border-slate-100 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} className="shrink-0" />
          {isOpen && <span className="font-bold text-sm">Đăng xuất</span>}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </aside>
  );
}