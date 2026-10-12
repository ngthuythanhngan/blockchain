import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, RefreshCw, BarChart2,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

function StatCard({ title, value, trend, trendLabel, icon: Icon, color, loading }) {
  const isPositive = trend && !trend.startsWith("-");
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trend}
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-8 bg-slate-100 animate-pulse rounded-xl w-3/4"></div>
      ) : (
        <div className="text-3xl font-black text-slate-800">{value}</div>
      )}
      <p className="text-slate-400 text-sm font-medium mt-1">{title}</p>
      {trendLabel && <p className="text-xs text-slate-300 font-medium mt-0.5">{trendLabel}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    "Đang xử lý": "bg-amber-50 text-amber-600",
    "Đang giao":   "bg-blue-50 text-blue-600",
    "Hoàn thành":  "bg-green-50 text-green-600",
    "Đã hủy":      "bg-red-50 text-red-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${map[status] || "bg-slate-50 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────
function MiniBarChart({ data, xKey, yKey, color = "#ec5b13", formatX, formatY }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold">Chưa có dữ liệu</div>
  );
  const max = Math.max(...data.map(r => r[yKey]), 1);
  return (
    <div className="flex items-end gap-1.5 h-48 w-full">
      {data.map((r, i) => {
        const pct = (r[yKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer min-w-0">
            <div className="relative w-full">
              <div
                className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                style={{ height: `${Math.max(pct * 1.7, 4)}px`, background: color }}
              />
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                {formatY ? formatY(r[yKey]) : r[yKey]}
              </div>
            </div>
            <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">
              {formatX ? formatX(r[xKey]) : r[xKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Revenue Dashboard ────────────────────────────────────
function RevenueDashboard() {
  const [viewMode, setViewMode] = useState("month");
  const [data,     setData]     = useState([]);
  const [catData,  setCatData]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  const VIEWS = [
    { id: "day",   label: "Theo ngày",     api: "revenue/day",   xKey: "date",  yKey: "revenue" },
    { id: "month", label: "Theo tháng",    api: "revenue/month", xKey: "month", yKey: "revenue" },
    { id: "year",  label: "Theo năm",      api: "revenue/year",  xKey: "year",  yKey: "revenue" },
    { id: "cat",   label: "Theo danh mục", api: null,            xKey: null,    yKey: null },
  ];

  const current = VIEWS.find(v => v.id === viewMode);

  const fetchRevenue = useCallback(async (mode) => {
    setLoading(true);
    try {
      if (mode === "cat") {
        const res  = await fetch(`${API}/admin/dashboard/revenue/product/`);
        const json = await res.json();
        setCatData(json.data || []);
      } else {
        const view = VIEWS.find(v => v.id === mode);
        const res  = await fetch(`${API}/admin/dashboard/${view.api}/`);
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRevenue(viewMode); }, [viewMode, fetchRevenue]);

  const fmtMoney = (v) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return `${(v / 1e3).toFixed(0)}K`;
  };
  const fmtX = {
    day:   (v) => v?.slice(5),
    month: (v) => v?.slice(5),
    year:  (v) => String(v),
  };

  const totalRevenue = viewMode !== "cat"
    ? data.reduce((s, r) => s + (r[current?.yKey] || 0), 0)
    : catData.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = viewMode !== "cat"
    ? data.reduce((s, r) => s + (r.orders || 0), 0)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ec5b13]/10 rounded-xl flex items-center justify-center">
            <BarChart2 size={18} className="text-[#ec5b13]" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-base">Biểu đồ doanh thu</h2>
            <p className="text-xs text-slate-400 font-medium">Xem chi tiết theo từng kỳ</p>
          </div>
        </div>
        <button onClick={() => fetchRevenue(viewMode)}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 px-6 pt-4">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === v.id
                ? "bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-black text-slate-800">
              {loading ? "—" : `${(totalRevenue / 1e6).toFixed(1)}M đ`}
            </p>
          </div>
          {totalOrders !== null ? (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Tổng đơn hàng</p>
              <p className="text-2xl font-black text-slate-800">
                {loading ? "—" : totalOrders}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Sản phẩm top</p>
              <p className="text-2xl font-black text-slate-800">
                {loading ? "—" : catData.length}
              </p>
            </div>
          )}
        </div>

        {/* Chart / Table */}
        {loading ? (
          <div className="flex items-end gap-2 h-48">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 bg-slate-100 animate-pulse rounded-t-lg"
                style={{ height: `${30 + i * 15}%` }} />
            ))}
          </div>
        ) : viewMode !== "cat" ? (
          <MiniBarChart
            data={data.slice(-30)}
            xKey={current.xKey}
            yKey={current.yKey}
            color="#ec5b13"
            formatX={fmtX[viewMode]}
            formatY={fmtMoney}
          />
        ) : (
          <div className="space-y-3">
            {catData.length === 0 ? (
              <div className="text-center py-12 text-slate-300 text-sm font-bold">Chưa có dữ liệu</div>
            ) : catData.map((r, i) => {
              const maxRev = catData[0]?.revenue || 1;
              const pct    = (r.revenue / maxRev) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-lg bg-[#ec5b13]/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-[#ec5b13]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-slate-700 truncate">{r.product_name}</p>
                      <span className="text-sm font-black text-[#ec5b13] ml-2 whitespace-nowrap">
                        {(r.revenue / 1e6).toFixed(1)}M đ
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-[#ec5b13] h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                      Đã bán: {r.quantity} sản phẩm
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [overview, setOverview]     = useState(null);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const overviewRes  = await fetch(`${API}/admin/dashboard/overview/`);
      const overviewData = await overviewRes.json();
      setOverview(overviewData.overview);
      setOrders(overviewData.recent_orders || []);
      if (isRefresh) toast.success("Dữ liệu đã được làm mới!");
    } catch {
      if (isRefresh) toast.error("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const admin = JSON.parse(sessionStorage.getItem("admin") || "null");
    if (!admin) { navigate("/admin", { replace: true }); return; }
    fetchData();
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Tổng quan hoạt động kinh doanh</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Doanh thu tháng này"
            value={loading ? "—" : `${((overview?.this_month_revenue || 0) / 1e6).toFixed(1)}M đ`}
            trend={overview?.revenue_trend}
            trendLabel="so với tháng trước"
            icon={TrendingUp}
            color="bg-[#ec5b13]"
            loading={loading}
          />
          <StatCard
            title="Đơn hàng mới"
            value={loading ? "—" : overview?.new_orders || 0}
            icon={ShoppingBag}
            color="bg-blue-500"
            loading={loading}
          />
          <StatCard
            title="Khách hàng mới"
            value={loading ? "—" : overview?.new_customers_this_month || 0}
            trend={overview?.customers_trend}
            trendLabel="so với tháng trước"
            icon={Users}
            color="bg-[#2D5A27]"
            loading={loading}
          />
          <StatCard
            title="Sản phẩm sắp hết"
            value={loading ? "—" : overview?.low_stock_count || 0}
            icon={AlertTriangle}
            color="bg-amber-500"
            loading={loading}
          />
        </div>

        {/* Revenue Dashboard — full width */}
        <RevenueDashboard />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="xl:col-span-1 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-black text-slate-800 text-lg mb-5">Thống kê nhanh</h2>
            <div className="space-y-4">
              {[
                { label: "Tổng khách hàng", value: overview?.total_customers || 0, icon: Users, color: "text-blue-500" },
                { label: "Tổng sản phẩm", value: overview?.total_products || 0, icon: Package, color: "text-[#2D5A27]" },
                { label: "Tổng doanh thu", value: `${((overview?.total_revenue || 0) / 1e6).toFixed(1)}M đ`, icon: TrendingUp, color: "text-[#ec5b13]" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                  <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 font-bold">{label}</p>
                    <p className="font-black text-slate-800">{loading ? "—" : value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
              {[
                { label: "Quản lý sản phẩm", path: "/admin/adminproduct" },
                { label: "Quản lý đơn hàng", path: "/admin/orders" },
                { label: "Quản lý khách hàng", path: "/admin/customer" },
              ].map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#ec5b13] transition flex items-center justify-between group"
                >
                  {label} <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
            <h2 className="font-black text-slate-800 text-lg">Đơn hàng gần đây</h2>
            <button
              onClick={() => navigate("/admin/orders")}
              className="text-xs font-bold text-[#ec5b13] hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowUpRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl"></div>)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    {["Mã đơn", "Khách hàng", "Ngày đặt", "Tổng tiền", "Trạng thái"].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-bold text-sm">Chưa có đơn hàng nào</td></tr>
                  ) : orders.map(order => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 font-black text-[#ec5b13] text-sm">#{order.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{order.customer_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{new Date(order.date).toLocaleDateString("vi-VN")}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{order.total?.toLocaleString()}đ</td>
                      <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}