import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import {
  Tag, Plus, X, Loader2, RefreshCw, Search,
  Calendar, Percent, AlertCircle, CheckCircle,
  XCircle, Clock,
} from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

// ─── Status Badge ─────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    { label: "Đang hoạt động", cls: "bg-green-50 text-green-700 border-green-200" },
    expired:   { label: "Hết hạn",        cls: "bg-red-50 text-red-600 border-red-200" },
    scheduled: { label: "Chưa bắt đầu",   cls: "bg-amber-50 text-amber-600 border-amber-200" },
  };
  const { label, cls } = map[status] || { label: status, cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Voucher Modal ─────────────────────────────────────────
function VoucherModal({ open, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: "", code: "", discount_type: "%",
    discount_value: "", start_date: "", end_date: "", limit: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ name: "", code: "", discount_type: "%", discount_value: "", start_date: "", end_date: "", limit: "" });
      setError("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim())              return setError("Vui lòng nhập tên chương trình.");
    if (!form.code.trim())              return setError("Vui lòng nhập mã giảm giá.");
    if (!form.discount_value || Number(form.discount_value) <= 0)
                                        return setError("Vui lòng nhập giá trị giảm hợp lệ.");
    if (form.discount_type === "%" && Number(form.discount_value) > 100)
                                        return setError("Phần trăm giảm không được vượt quá 100%.");
    if (!form.start_date || !form.end_date) return setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
    if (form.start_date > form.end_date)    return setError("Ngày kết thúc phải sau ngày bắt đầu.");
    onSave({
      ...form,
      code:           form.code.trim().toUpperCase(),
      discount_value: Number(form.discount_value),
      limit:          form.limit ? Number(form.limit) : null,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ec5b13]/10 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-[#ec5b13]" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Tạo voucher mới</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tên chương trình *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ví dụ: Khuyến mãi tháng 3..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Mã giảm giá *</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SALE30"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black tracking-widest uppercase focus:outline-none focus:border-[#ec5b13] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Loại giảm *</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#ec5b13] transition"
              >
                <option value="%">Phần trăm (%)</option>
                <option value="VND">Số tiền (VNĐ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
                Giá trị giảm * {form.discount_type === "%" ? "(1–100)" : "(VNĐ)"}
              </label>
              <div className="relative">
                <input
                  type="number" min={1}
                  max={form.discount_type === "%" ? 100 : undefined}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={form.discount_type === "%" ? "30" : "50000"}
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  {form.discount_type === "%" ? "%" : "đ"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Giới hạn dùng</label>
              <input
                type="number" min={1}
                value={form.limit}
                onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
                placeholder="Không giới hạn"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Ngày bắt đầu *</label>
              <input
                type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Ngày kết thúc *</label>
              <input
                type="date" value={form.end_date} min={form.start_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#ec5b13] text-white rounded-xl font-black hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/30 disabled:opacity-60">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Đang tạo...</> : <><Plus size={16} /> Tạo voucher</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────
export default function AdminSales() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [vouchers,    setVouchers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [tabFilter,   setTabFilter]   = useState("all");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deactivating,setDeactivating]= useState(null);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/voucher/list/`);
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch {
      toast.error("Không thể tải danh sách voucher.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const admin = JSON.parse(sessionStorage.getItem("admin") || "null");
    if (!admin) { navigate("/admin", { replace: true }); return; }
    fetchVouchers();
  }, [navigate, fetchVouchers]);

  // ── FIX: parse response text trước để tránh lỗi JSON khi server trả 201 ──
  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/voucher/create/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      let data = {};
      try { data = await res.json(); } catch {}

      if (res.ok || res.status === 201) {
        toast.success(`Đã tạo voucher "${payload.code}" thành công!`);
        setModalOpen(false);
        fetchVouchers();
      } else {
        toast.error(data.error || `Lỗi ${res.status}: Không thể tạo voucher.`);
      }
    } catch (err) {
      // Chỉ báo lỗi network thật sự
      toast.error("Không thể kết nối server. Kiểm tra lại backend.");
      console.error("[Voucher create error]", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id, code) => {
    setDeactivating(id);
    try {
      const res = await fetch(`${API}/voucher/deactivate/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success(`Đã vô hiệu hóa voucher "${code}".`);
        fetchVouchers();
      } else {
        toast.error("Không thể vô hiệu hóa voucher.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setDeactivating(null);
    }
  };

  const filtered = vouchers.filter(v => {
    const matchSearch = !search.trim() ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tabFilter === "all" || v.status === tabFilter;
    return matchSearch && matchTab;
  });

  const stats = {
    total:   vouchers.length,
    active:  vouchers.filter(v => v.status === "active").length,
    expired: vouchers.filter(v => v.status === "expired").length,
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />

      <VoucherModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        saving={saving}
      />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản lý khuyến mãi</h1>
            <p className="text-slate-400 text-sm mt-1">{vouchers.length} voucher</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchVouchers}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/30"
            >
              <Plus size={18} /> Tạo voucher
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "Tổng voucher",   value: stats.total,   icon: Tag,         color: "bg-[#ec5b13]" },
            { label: "Đang hoạt động", value: stats.active,  icon: CheckCircle, color: "bg-green-500" },
            { label: "Đã hết hạn",     value: stats.expired, icon: XCircle,     color: "bg-red-400" },
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

        {/* Filter */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus-within:border-[#ec5b13] transition">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm mã voucher, tên chương trình..."
                className="outline-none bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 flex-1"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: "all",       label: "Tất cả" },
                { id: "active",    label: "Đang hoạt động" },
                { id: "scheduled", label: "Sắp diễn ra" },
                { id: "expired",   label: "Hết hạn" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setTabFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black border transition-all whitespace-nowrap ${
                    tabFilter === f.id
                      ? "bg-[#ec5b13] text-white border-[#ec5b13]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
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
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Tag className="mx-auto text-slate-200 mb-4" size={56} />
              <p className="text-slate-400 font-bold">Không có voucher nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Mã voucher", "Tên chương trình", "Giảm", "Thời gian", "Đã dùng", "Trạng thái", ""].map(h => (
                      <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-slate-400 shrink-0" />
                          <span className="font-black text-slate-800 tracking-widest text-sm">{v.code}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-700 text-sm max-w-[200px] truncate">{v.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1 font-black text-[#ec5b13] text-sm whitespace-nowrap">
                          {v.discount_type === "%" ? (
                            <><Percent size={13} /> {v.discount_value}%</>
                          ) : (
                            <>{Number(v.discount_value).toLocaleString()}đ</>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-bold whitespace-nowrap">
                          <Calendar size={13} />
                          {new Date(v.start_date).toLocaleDateString("vi-VN")} — {new Date(v.end_date).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-slate-600">
                          {v.used}{v.limit ? `/${v.limit}` : ""} lần
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-4">
                        {v.status === "active" && (
                          <button
                            onClick={() => handleDeactivate(v.id, v.code)}
                            disabled={deactivating === v.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl text-xs font-bold text-red-500 hover:bg-red-100 transition disabled:opacity-60"
                          >
                            {deactivating === v.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <XCircle size={13} />
                            }
                            Vô hiệu
                          </button>
                        )}
                        {v.status === "scheduled" && (
                          <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                            <Clock size={13} /> Chưa bắt đầu
                          </div>
                        )}
                      </td>
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