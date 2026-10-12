import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Edit3, Trash2, Package, RefreshCw,
  Loader2, ChevronLeft, ChevronRight, Star, Check, X, FileText,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";
const PAGE_SIZE = 12;

// ── Màu nền avatar danh mục ──
const CAT_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
];

// ════════════════════════════════════════════════
// Section: Quản lý danh mục nổi bật trang chủ
// ════════════════════════════════════════════════
function FeaturedCategoriesSection({ categories }) {
  const toast = useToast();

  const [selected, setSelected] = useState([]);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState([]);
  const [saving,   setSaving]   = useState(false);

  // Load từ backend khi mount
  useEffect(() => {
    fetch(`${API}/home/featured-categories/`)
      .then(r => r.json())
      .then(d => {
        const ids = d.featured_ids || [];
        setSelected(ids);
        // Sync localStorage để Home.js dùng ngay khi chưa fetch
        localStorage.setItem("featured_category_ids", JSON.stringify(ids));
      })
      .catch(() => {
        // Fallback localStorage
        try {
          const saved = JSON.parse(localStorage.getItem("featured_category_ids") || "[]");
          setSelected(saved);
        } catch {}
      });
  }, []);

  const startEdit = () => {
    setDraft([...selected]);
    setEditing(true);
  };

  const toggleDraft = (id) => {
    setDraft(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setDraft(categories.map(c => c.id));
  const clearAll  = () => setDraft([]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/home/save-featured-categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: draft }),
      });
      if (res.ok) {
        setSelected(draft);
        localStorage.setItem("featured_category_ids", JSON.stringify(draft));
        toast.success(`Đã lưu ${draft.length} danh mục nổi bật!`);
        setEditing(false);
      } else {
        toast.error("Không thể lưu. Thử lại.");
      }
    } catch {
      // Fallback localStorage nếu backend lỗi
      setSelected(draft);
      localStorage.setItem("featured_category_ids", JSON.stringify(draft));
      toast.success(`Đã lưu ${draft.length} danh mục nổi bật! (local)`);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setEditing(false);

  const selectedCats = selected
    .map(id => categories.find(c => String(c.id) === String(id)))
    .filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ec5b13]/10 rounded-xl flex items-center justify-center">
            <Star size={18} className="text-[#ec5b13]" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-base">Danh mục nổi bật trang chủ</h2>
            <p className="text-xs text-slate-400 font-medium">
              Chọn bao nhiêu danh mục cũng được — tất cả sẽ hiển thị trên trang chủ
            </p>
          </div>
        </div>
        {!editing ? (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition">
            <Edit3 size={15} /> Chỉnh sửa
          </button>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
              <Check size={13} /> Chọn tất cả
            </button>
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
              <X size={13} /> Bỏ tất cả
            </button>
            <button onClick={cancel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition">
              <X size={15} /> Hủy
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
              Lưu ({draft.length})
            </button>
          </div>
        )}
      </div>

      {/* Chế độ xem */}
      {!editing ? (
        selectedCats.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
            <Star className="mx-auto text-slate-200 mb-2" size={32} />
            <p className="text-slate-400 text-sm font-bold">Chưa chọn danh mục nổi bật nào.</p>
            <p className="text-slate-300 text-xs mt-1">Nhấn "Chỉnh sửa" để cấu hình</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedCats.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${CAT_COLORS[i % CAT_COLORS.length]}`}>
                  {cat.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{cat.name}</p>
                </div>
                <Star size={11} className="text-[#ec5b13] shrink-0" fill="#ec5b13" />
              </div>
            ))}
          </div>
        )
      ) : (
        /* Chế độ chỉnh sửa */
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400">
              Đã chọn <span className="text-[#ec5b13] font-black">{draft.length}</span>/{categories.length} danh mục.
              Nhấn để chọn/bỏ chọn:
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
            {categories.map((cat, i) => {
              const isSelected = draft.includes(cat.id);
              return (
                <button key={cat.id} onClick={() => toggleDraft(cat.id)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-[#ec5b13] bg-[#ec5b13]/5"
                      : "border-slate-100 bg-slate-50 hover:border-[#ec5b13]/40 hover:bg-[#ec5b13]/5"
                  }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${CAT_COLORS[i % CAT_COLORS.length]}`}>
                    {cat.name[0]}
                  </div>
                  <p className="text-sm font-bold text-slate-700 truncate flex-1">{cat.name}</p>
                  {isSelected && (
                    <div className="w-5 h-5 bg-[#ec5b13] rounded-full flex items-center justify-center text-white shrink-0">
                      <Check size={11} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════
export default function AdminProduct() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [products,      setProducts]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [search,        setSearch]        = useState("");
  const [catFilter,     setCatFilter]     = useState("");
  const [deleteId,      setDeleteId]      = useState(null);
  const [importModal,   setImportModal]   = useState(null);
  const [importQty,     setImportQty]     = useState(1);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/product/categories/`)
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (search.trim()) params.set("search", search.trim());
      if (catFilter)     params.set("category", catFilter);
      const res  = await fetch(`${API}/product/list/?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [page, search, catFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, catFilter]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/product/delete/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Đã xóa sản phẩm thành công.");
        fetchProducts();
      } else {
        toast.error("Không thể xóa sản phẩm.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleImportStock = async () => {
    if (!importModal || importQty < 1) return;
    setImportLoading(true);
    try {
      const res = await fetch(`${API}/product/import/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: importModal.id, quantity: importQty }),
      });
      if (res.ok) {
        toast.success(`Đã nhập thêm ${importQty} sản phẩm vào kho!`);
        fetchProducts();
        setImportModal(null);
        setImportQty(1);
      } else {
        toast.error("Không thể nhập kho. Vui lòng thử lại.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setImportLoading(false);
    }
  };

  const stockColor = stock => {
    if (stock === 0) return "text-red-600 bg-red-50";
    if (stock <= 10) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản lý sản phẩm</h1>
            <p className="text-slate-400 text-sm mt-1">{total} sản phẩm</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => navigate("/admin/adminproduct/add")}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/30"
            >
              <Plus size={18} /> Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* ── SECTION DANH MỤC NỔI BẬT ── */}
        <FeaturedCategoriesSection categories={categories} />

        {/* Filter bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus-within:border-[#ec5b13] transition">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên sản phẩm, thương hiệu..."
                className="outline-none bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 flex-1"
              />
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:border-[#ec5b13] transition"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Grid sản phẩm */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                <div className="aspect-square bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold text-lg">Không có sản phẩm nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map(p => (
              <div key={p.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#ec5b13]/20 hover:shadow-lg transition-all">
                <div className="relative aspect-square overflow-hidden bg-slate-50">
                  <img
                    src={p.image || "https://via.placeholder.com/300?text=No+Image"}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.stock <= 10 && (
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${p.stock === 0 ? "bg-red-500 text-white" : "bg-amber-400 text-white"}`}>
                        {p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/adminproduct/add?edit=${p.id}`)}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-[#ec5b13] transition shadow-lg"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/adminproduct/add?edit=${p.id}&tab=content`)}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-blue-500 transition shadow-lg"
                      title="Chỉnh sửa nội dung"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-red-500 transition shadow-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{p.brand}</p>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">{p.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#ec5b13] text-sm">{p.price?.toLocaleString()}đ</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${stockColor(p.stock)}`}>
                      {p.stock > 0 ? `Còn ${p.stock}` : "Hết"}
                    </span>
                  </div>
                  <button
                    onClick={() => { setImportModal({ id: p.id, name: p.name }); setImportQty(1); }}
                    className="w-full mt-3 py-2 border border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-[#ec5b13] hover:text-[#ec5b13] rounded-xl transition"
                  >
                    + Nhập kho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-[#ec5b13] disabled:opacity-40 transition">
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${p === page ? "bg-[#ec5b13] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#ec5b13]"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-[#ec5b13] disabled:opacity-40 transition">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>

      {/* Modal xóa */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Xóa sản phẩm?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập kho */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-[#ec5b13]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Package className="text-[#ec5b13]" size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-1">Nhập kho</h3>
            <p className="text-slate-400 text-sm text-center mb-6 line-clamp-1">{importModal.name}</p>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setImportQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-black text-lg transition">-</button>
              <input
                type="number" min={1} value={importQty}
                onChange={e => setImportQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center font-black text-2xl text-slate-800 border border-slate-200 rounded-xl py-2 focus:outline-none focus:border-[#ec5b13]"
              />
              <button onClick={() => setImportQty(q => q + 1)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-black text-lg transition">+</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setImportModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
              <button onClick={handleImportStock} disabled={importLoading} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-xl font-bold hover:bg-[#d44e0f] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {importLoading ? <Loader2 size={16} className="animate-spin" /> : null} Nhập kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}