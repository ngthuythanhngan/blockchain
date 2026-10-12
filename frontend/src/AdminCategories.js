import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import {
  Plus, Edit3, Trash2, RefreshCw, Loader2,
  ImagePlus, X, Save, AlertCircle, Tag, Check,
} from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhpncxnqb/image/upload";

// ── Modal thêm / sửa danh mục ──
function CategoryModal({ open, onClose, onSave, saving, initial }) {
  const toast = useToast();
  const [form,       setForm]       = useState({ name: "", description: "", image: "" });
  const [preview,    setPreview]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({ name: initial.name || "", description: initial.description || "", image: initial.image || "" });
      setPreview(initial.image || "");
    } else {
      setForm({ name: "", description: "", image: "" });
      setPreview("");
    }
    setError("");
  }, [open, initial]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "luxeglow_products");
      fd.append("folder", "luxeglow/categories");
      const res = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, image: data.secure_url }));
        setPreview(data.secure_url);
        toast.success("Upload ảnh thành công!");
      } else {
        toast.error("Upload thất bại. Nhập URL thủ công.");
      }
    } catch { toast.error("Không thể upload ảnh."); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Tên danh mục không được để trống.");
    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ec5b13]/10 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-[#ec5b13]" />
            </div>
            <h2 className="text-lg font-black text-slate-800">
              {initial ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
              Tên danh mục <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(""); }}
              placeholder="Ví dụ: Kem dưỡng da, Serum..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
              Mô tả <span className="text-slate-300">(tùy chọn)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn về danh mục..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition resize-none"
            />
          </div>

          {/* Ảnh */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
              Ảnh danh mục <span className="text-slate-300">(tùy chọn)</span>
            </label>

            {/* Preview */}
            {preview ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 mb-2">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button type="button"
                  onClick={() => { setPreview(""); setForm(f => ({ ...f, image: "" })); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition">
                  <X size={11} />
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-[#ec5b13]" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[#ec5b13] rounded-xl cursor-pointer transition group mb-2">
                {uploading
                  ? <Loader2 size={18} className="text-[#ec5b13] animate-spin shrink-0" />
                  : <ImagePlus size={18} className="text-slate-400 group-hover:text-[#ec5b13] transition shrink-0" />
                }
                <span className="text-sm text-slate-400 group-hover:text-[#ec5b13] font-medium transition">
                  {uploading ? "Đang upload..." : "Chọn ảnh từ máy (PNG, JPG, WebP)"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}

            {/* URL thủ công */}
            <input
              type="url"
              value={form.image}
              onChange={e => { setForm(f => ({ ...f, image: e.target.value })); if (e.target.value) setPreview(e.target.value); }}
              placeholder="Hoặc nhập URL ảnh trực tiếp..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ec5b13] transition"
            />
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
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</>
                : <><Save size={16} /> {initial ? "Lưu thay đổi" : "Tạo danh mục"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════
export default function AdminCategories() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);   // category đang sửa
  const [deleteId,   setDeleteId]   = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/product/categories/`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { toast.error("Không thể tải danh mục."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const admin = JSON.parse(sessionStorage.getItem("admin") || "null");
    if (!admin) { navigate("/admin", { replace: true }); return; }
    fetchCategories();
  }, [navigate, fetchCategories]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const endpoint = editing
        ? `${API}/product/category/update/`
        : `${API}/product/category/create/`;
      const body = editing
        ? { id: editing.id, ...form }
        : form;

      const res  = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success(editing ? "Đã cập nhật danh mục!" : `Đã tạo danh mục "${form.name}"!`);
        setModal(false);
        setEditing(null);
        fetchCategories();
      } else {
        toast.error(data.error || "Không thể lưu danh mục.");
      }
    } catch { toast.error("Không thể kết nối server."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      // Backend chưa có API xóa danh mục riêng — dùng update với name rỗng
      // Hoặc nếu có thể dùng cách khác. Tạm thời thông báo.
      toast.error("Không thể xóa danh mục đang có sản phẩm liên kết.");
    } catch { toast.error("Không thể kết nối server."); }
    finally { setDeleteId(null); }
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setModal(true);
  };

  const CAT_COLORS = [
    "bg-emerald-50", "bg-rose-50", "bg-blue-50",
    "bg-amber-50",   "bg-purple-50", "bg-teal-50",
  ];

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />

      <CategoryModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
        initial={editing}
      />

      {/* Modal xác nhận xóa */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Xóa danh mục?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              Chỉ có thể xóa danh mục không có sản phẩm nào liên kết.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">Xóa</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản lý danh mục</h1>
            <p className="text-slate-400 text-sm mt-1">{categories.length} danh mục</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchCategories}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/30">
              <Plus size={18} /> Thêm danh mục
            </button>
          </div>
        </div>

        {/* Grid danh mục */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                <div className="aspect-square bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded" />
                  <div className="h-3 bg-slate-100 animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-24">
            <Tag className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold text-lg mb-4">Chưa có danh mục nào</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-[#ec5b13] text-white rounded-xl font-black hover:bg-[#d44e0f] transition">
              Tạo danh mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {categories.map((cat, i) => (
              <div key={cat.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#ec5b13]/20 hover:shadow-lg transition-all">
                {/* Ảnh */}
                <div className={`relative aspect-square overflow-hidden ${cat.image ? "bg-slate-50" : CAT_COLORS[i % CAT_COLORS.length]}`}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-black text-white/60">{cat.name[0]}</span>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(cat)}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-[#ec5b13] transition shadow-lg">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => setDeleteId(cat.id)}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-red-500 transition shadow-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Badge có ảnh / chưa có */}
                  <div className="absolute top-2 left-2">
                    {cat.image ? (
                      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500 text-white uppercase">
                        <Check size={9} /> Có ảnh
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase">
                        Chưa có ảnh
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-slate-800 truncate">{cat.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">#{cat.id}</span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{cat.description}</p>
                  )}
                  <button onClick={() => openEdit(cat)}
                    className="w-full mt-3 py-2 border border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-[#ec5b13] hover:text-[#ec5b13] rounded-xl transition">
                    {cat.image ? "Đổi ảnh / Sửa" : "+ Thêm ảnh"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}