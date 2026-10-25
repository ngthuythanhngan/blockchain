
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Đồng bộ thông tin người dùng
  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(JSON.parse(sessionStorage.getItem("user")));
      } catch {
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("userUpdated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("userUpdated", syncUser);
    };
  }, []);

  // Đóng menu tài khoản khi nhấn ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    window.dispatchEvent(new Event("userUpdated"));
    navigate("/");
  };

  const navItems = [
    { label: "Trang chủ", path: "/" },
    { label: "Sản phẩm", path: "/product" },
    { label: "Blog", path: "/blog" },
  ];

  return (
    <nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24 py-4 border-b border-primary/10 sticky top-0 bg-white/80 backdrop-blur-md z-50">
      {/* Logo thương hiệu */}
      <div className="flex items-center gap-12">
        <Link
          to="/"
          onClick={() =>
            location.pathname === "/" &&
            window.scrollTo({ top: 0, behavior: "instant" })
          }
          className="text-2xl font-black tracking-tighter text-primary"
        >
          LUXE GLOW
        </Link>

        {/* Các mục điều hướng */}
        <div className="hidden md:flex items-center gap-8 text-base font-semibold">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : item.path === "/blog"
                ? location.pathname.startsWith("/blog")
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() =>
                  isActive &&
                  window.scrollTo({
                    top: 0,
                    behavior: "instant",
                  })
                }
                className="text-slate-700 hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Khu vực đăng nhập */}
      <div className="flex items-center gap-6">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden text-primary text-xs font-bold">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
              </div>

              <span className="hidden sm:block text-sm font-bold text-slate-700">
                {user.fullname}
              </span>

              <ChevronDown
                size={14}
                className={`transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-primary/10 rounded-xl shadow-xl overflow-hidden z-[60]">
                <button
                  onClick={() => {
                    navigate("/information");
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition text-slate-600"
                >
                  <Settings size={15} />
                  Tài khoản của tôi
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-slate-100"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </nav>
  );
}
