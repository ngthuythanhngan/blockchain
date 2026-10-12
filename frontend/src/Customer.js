import { useState, useEffect, useCallback } from "react";
import { Search, Users, RefreshCw, Eye, X, Mail, Phone, ShoppingBag, TrendingUp } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

function CustomerModal({ customer, onClose }) {
  if (!customer) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800">Chi tiết khách hàng</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100">
            {customer.avatar
              ? <img src={customer.avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#ec5b13]">{customer.name[0]}</div>
            }
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{customer.name}</h3>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${customer.login_type === "google" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}>
              {customer.login_type === "google" ? "Google Account" : "Tài khoản thường"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: Mail,       label: "Email",           value: customer.email },
            { icon: Phone,      label: "Điện thoại",      value: customer.phone || "Chưa cập nhật" },
            { icon: ShoppingBag, label: "Tổng đơn hàng",  value: `${customer.total_orders} đơn` },
            { icon: TrendingUp, label: "Tổng chi tiêu",   value: `${customer.total_spend?.toLocaleString()}đ` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Icon size={18} className="text-[#ec5b13] shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</p>
                <p className="text-sm font-bold text-slate-700">{value}</p>
              </div>
            </div>
          ))}
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ngày tham gia</p>
            <p className="text-sm font-bold text-slate-700">
              {customer.join_date ? new Date(customer.join_date).toLocaleDateString("vi-VN") : "—"}
            </p>
          </div>
          {customer.last_order_date && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Đơn hàng gần nhất</p>
              <p className="text-sm font-bold text-slate-700">{new Date(customer.last_order_date).toLocaleDateString("vi-VN")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customer() {
  const toast = useToast();
  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState(null);
  const [loginFilter, setLoginFilter] = useState("all");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res  = await fetch(`${API}/admin/customers/?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
      toast.error("Không thể tải danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = loginFilter === "all"
    ? customers
    : customers.filter(c => c.login_type === loginFilter);

  const totalRevenue = customers.reduce((s, c) => s + (c.total_spend || 0), 0);
  const totalOrders  = customers.reduce((s, c) => s + (c.total_orders || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
          <h1 className="text-3xl font-black text-slate-800">Quản lý khách hàng</h1>
            <p className="text-slate-400 text-sm mt-1">{customers.length} khách hàng</p>
          </div>
          <button
            onClick={() => fetchCustomers()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "Tổng khách hàng", value: customers.length,                              icon: Users,       color: "bg-[#ec5b13]" },
            { label: "Tổng đơn hàng",   value: totalOrders,                                   icon: ShoppingBag, color: "bg-blue-500" },
            { label: "Tổng doanh thu",  value: `${(totalRevenue / 1e6).toFixed(1)}M đ`,       icon: TrendingUp,  color: "bg-[#2D5A27]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{loading ? "—" : value}</p>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus-within:border-[#ec5b13] transition">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, SĐT..."
                className="outline-none bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 flex-1 rounded-[10px]"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: "all",    label: "Tất cả" },
                { id: "normal", label: "Thường" },
                { id: "google", label: "Google" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLoginFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${loginFilter === f.id ? "bg-[#ec5b13] text-white border-[#ec5b13]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl"></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="mx-auto text-slate-200 mb-4" size={56} />
              <p className="text-slate-400 font-bold">Không có khách hàng nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Khách hàng", "Loại TK", "Điện thoại", "Tham gia", "Đơn hàng", "Chi tiêu", ""].map(h => (
                      <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {c.avatar
                              ? <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center font-black text-[#ec5b13] text-sm">{c.name[0]}</div>
                            }
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${c.login_type === "google" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}>
                          {c.login_type === "google" ? "Google" : "Thường"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{c.phone || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {c.join_date ? new Date(c.join_date).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-black text-slate-700">
                          <ShoppingBag size={12} /> {c.total_orders}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-[#ec5b13] text-sm whitespace-nowrap">
                        {c.total_spend?.toLocaleString()}đ
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-[#ec5b13]/10 hover:text-[#ec5b13] transition"
                        >
                          <Eye size={14} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <CustomerModal customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}