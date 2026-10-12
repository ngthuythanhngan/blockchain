import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, Settings, ChevronDown } from "lucide-react";

/**
 * Navbar dùng chung cho toàn bộ trang User.
 * Props:
 *   - searchable: bool  — hiện ô tìm kiếm (default true)
 *   - onSearch: fn(q)   — callback khi Enter trong ô tìm kiếm
 */
export default function Navbar({ searchable = true, onSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("user")); } catch { return null; }
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Đồng bộ user từ các tab khác
  useEffect(() => {
    const syncUser = () => {
      try { setUser(JSON.parse(sessionStorage.getItem("user"))); } catch { setUser(null); }
    };
    const updateCart = () => {
      try {
        const cart = JSON.parse(sessionStorage.getItem("cart") || "[]");
        setCartCount(cart.reduce((s, i) => s + i.quantity, 0));
      } catch { setCartCount(0); }
    };

    syncUser();
    updateCart();

    window.addEventListener("storage", syncUser);
    window.addEventListener("userUpdated", syncUser);
    window.addEventListener("cartUpdated", updateCart);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("userUpdated", syncUser);
      window.removeEventListener("cartUpdated", updateCart);
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("cart");         // ← thêm dòng này
    setUser(null);
    setDropdownOpen(false);
    window.dispatchEvent(new Event("cartUpdated")); // ← và dòng này
    navigate("/");
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        navigate(`/product?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-primary/10 sticky top-0 bg-white/80 backdrop-blur-md z-50">
      {/* Logo + Links */}
      <div className="flex items-center gap-12">
        <Link to="/" onClick={() => location.pathname === "/" && window.scrollTo({ top: 0, behavior: "instant" })} className="text-2xl font-black tracking-tighter text-primary">
          LUXE GLOW
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-70">
          <Link
            to="/product"
            onClick={() => location.pathname === "/product" && window.scrollTo({ top: 0, behavior: "instant" })}
            className={`transition-colors hover:text-primary ${location.pathname === "/product" ? "text-primary font-bold opacity-100" : ""}`}
          >
            Sản phẩm
          </Link>
          <Link
            to="/sale"
            onClick={() => location.pathname === "/sale" && window.scrollTo({ top: 0, behavior: "instant" })}
            className="hover:text-primary transition-colors"
          >Khuyến mãi</Link>
          <Link
            to="/blog"
            onClick={() => location.pathname.startsWith("/blog") && window.scrollTo({ top: 0, behavior: "instant" })}
            className={`transition-colors hover:text-primary ${location.pathname.startsWith("/blog") ? "text-primary font-bold opacity-100" : ""}`}
          >
            Blog
          </Link>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Search */}
        {searchable && (
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm mỹ phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        )}

        {/* Cart */}
        <button onClick={() => navigate("/cart")} className="relative hover:text-primary transition-colors">
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </button>

        {/* User */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden text-primary text-xs font-bold">
                {user.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <User size={18} />}
              </div>
              <span className="hidden sm:block text-sm font-bold text-slate-700">{user.fullname}</span>
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-primary/10 rounded-xl shadow-xl overflow-hidden z-[60]">
                <button
                  onClick={() => { navigate("/information"); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition text-slate-600"
                >
                  <Settings size={15} /> Tài khoản của tôi
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-slate-100"
                >
                  <LogOut size={15} /> Đăng xuất
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