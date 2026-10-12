import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Upload, X, Save, Loader2, ImagePlus, Plus,
  Tag, AlertCircle, GripVertical, ChevronUp, ChevronDown,
  Trash2, Type, AlignLeft, List, Quote, Image as ImageIcon,
  Minus, Hash, Eye, EyeOff, FileText, Layers,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

// ─── ID generator ─────────────────────────────────────────
let _idCtr = Date.now();
const uid = () => String(++_idCtr);

// ─── New block factory ─────────────────────────────────────
function newBlock(type, tab = "desc") {
  const id = uid();
  const base = { id, _idx: id, type, _tab: tab };
  const map = {
    heading:    { ...base, text: "", align: "left" },
    subheading: { ...base, text: "", align: "left" },
    paragraph:  { ...base, text: "", align: "left" },
    quote:      { ...base, text: "" },
    list:       { ...base, items: [""] },
    image:      { ...base, url: "", caption: "", _file: null },
    divider:    base,
  };
  return map[type] || base;
}

function stripHtml(html = "") { return html.replace(/<[^>]*>/g, ""); }

// ─── Block Item Component ──────────────────────────────────
function BlockItem({ block, index, total, onChange, onMove, onDelete, onFileSelect }) {
  const [focused, setFocused] = useState(false);
  const fileRef = useRef();
  const upd = p => onChange({ ...block, ...p });

  const textBlock = (type, cls, placeholder) => (
    <div>
      <div contentEditable suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); upd({ text: e.target.innerHTML }); }}
        dangerouslySetInnerHTML={{ __html: block.text }}
        data-placeholder={placeholder}
        className={`w-full outline-none bg-transparent min-h-[28px] ${cls} empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300`}
      />
    </div>
  );

  return (
    <div className={`group relative flex gap-2 items-start rounded-xl p-2 transition ${focused ? "bg-slate-50" : "hover:bg-slate-50/60"}`}>
      {/* Sort controls */}
      <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
        <GripVertical size={14} className="text-slate-300 cursor-grab" />
        <button onClick={() => onMove(index, -1)} disabled={index === 0}
          className="text-slate-300 hover:text-slate-500 disabled:opacity-20 p-0.5"><ChevronUp size={12} /></button>
        <button onClick={() => onMove(index, 1)} disabled={index === total - 1}
          className="text-slate-300 hover:text-slate-500 disabled:opacity-20 p-0.5"><ChevronDown size={12} /></button>
      </div>

      <div className="flex-1 min-w-0">
        {block.type === "heading" && textBlock("heading", "text-lg font-bold text-slate-800", "Tiêu đề lớn...")}
        {block.type === "subheading" && textBlock("subheading", "text-base font-semibold text-slate-700", "Tiêu đề nhỏ...")}
        {block.type === "paragraph" && textBlock("paragraph", "text-sm text-slate-600 leading-relaxed", "Nhập nội dung đoạn văn...")}
        {block.type === "quote" && (
          <div contentEditable suppressContentEditableWarning
            onFocus={() => setFocused(true)}
            onBlur={e => { setFocused(false); upd({ text: e.target.innerHTML }); }}
            dangerouslySetInnerHTML={{ __html: block.text }}
            data-placeholder="Trích dẫn..."
            className="w-full outline-none bg-transparent text-sm italic text-slate-500 border-l-4 border-[#ec5b13] pl-4 min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"
          />
        )}
        {block.type === "list" && (
          <div className="flex flex-col gap-1">
            {(block.items || [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ec5b13] shrink-0" />
                <input value={item}
                  onChange={e => { const items = [...block.items]; items[i] = e.target.value; upd({ items }); }}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); const items = [...block.items]; items.splice(i + 1, 0, ""); upd({ items }); }
                    if (e.key === "Backspace" && !item && block.items.length > 1) { e.preventDefault(); upd({ items: block.items.filter((_, j) => j !== i) }); }
                  }}
                  placeholder="Mục danh sách..."
                  className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-300"
                />
              </div>
            ))}
            <button onClick={() => upd({ items: [...block.items, ""] })}
              className="text-xs text-[#ec5b13]/60 hover:text-[#ec5b13] mt-1 w-fit transition">+ Thêm mục</button>
          </div>
        )}
        {block.type === "image" && (
          <div>
            {block.url ? (
              <div className="relative group/img">
                <img src={block.url} alt={block.caption} className="w-full rounded-xl object-cover max-h-56" />
                <button onClick={() => upd({ url: "", _file: null })}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover/img:opacity-100 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#ec5b13]/40 transition">
                <ImageIcon size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Click để chọn ảnh</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files[0]; if (!f) return;
                    upd({ url: URL.createObjectURL(f), _file: f });
                    onFileSelect?.(block._idx, f);
                  }} />
              </div>
            )}
            <input value={block.caption || ""} onChange={e => upd({ caption: e.target.value })}
              placeholder="Chú thích ảnh (tùy chọn)"
              className="mt-2 w-full bg-transparent text-xs text-slate-400 outline-none placeholder-slate-300 border-b border-slate-100 py-1 focus:border-[#ec5b13] transition" />
          </div>
        )}
        {block.type === "divider" && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        )}
      </div>

      <button onClick={() => onDelete(index)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition shrink-0 mt-0.5">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

const BLOCK_TYPES = [
  { type: "heading",    icon: Type,       label: "Tiêu đề lớn" },
  { type: "subheading", icon: Hash,       label: "Tiêu đề nhỏ" },
  { type: "paragraph",  icon: AlignLeft,  label: "Đoạn văn" },
  { type: "quote",      icon: Quote,      label: "Trích dẫn" },
  { type: "list",       icon: List,       label: "Danh sách" },
  { type: "image",      icon: ImageIcon,  label: "Hình ảnh" },
  { type: "divider",    icon: Minus,      label: "Đường kẻ" },
];

// ─── Block Editor ──────────────────────────────────────────
function BlockEditor({ tab, blocks, onChange, pendingFiles, onFileSelect }) {
  const [showMenu, setShowMenu] = useState(false);
  const tabBlocks = blocks.filter(b => b._tab === tab);

  const addBlock = (type) => {
    onChange([...blocks, newBlock(type, tab)]);
    setShowMenu(false);
  };

  const updateBlock = (blockId, updated) => {
    onChange(blocks.map(b => b.id === blockId ? updated : b));
  };

  const moveBlock = (localIdx, dir) => {
    const ids = tabBlocks.map(b => b.id);
    const newIdx = localIdx + dir;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[localIdx], ids[newIdx]] = [ids[newIdx], ids[localIdx]];
    const order = Object.fromEntries(ids.map((id, i) => [id, i]));
    const reordered = [...blocks].sort((a, b) => {
      const ai = order[a.id] ?? 999; const bi = order[b.id] ?? 999;
      return a._tab === tab && b._tab === tab ? ai - bi : 0;
    });
    onChange(reordered);
  };

  const deleteBlock = (localIdx) => {
    const id = tabBlocks[localIdx]?.id;
    onChange(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-[200px]">
      {tabBlocks.length === 0 && (
        <div className="text-center py-12 text-slate-300 text-sm">
          Chưa có nội dung — bấm "Thêm block" để bắt đầu
        </div>
      )}
      <div className="flex flex-col gap-1">
        {tabBlocks.map((block, i) => (
          <BlockItem key={block.id} block={block} index={i} total={tabBlocks.length}
            onChange={upd => updateBlock(block.id, upd)}
            onMove={moveBlock}
            onDelete={deleteBlock}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>

      {/* Add block button */}
      <div className="relative mt-3">
        <button onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2.5 w-full justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-[#ec5b13]/40 text-slate-400 hover:text-[#ec5b13] text-sm transition font-bold">
          <Plus size={14} /> Thêm block
        </button>
        {showMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 overflow-hidden">
            <div className="grid grid-cols-4 gap-0 p-2">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)}
                  className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 rounded-xl transition">
                  <bt.icon size={18} className="text-[#ec5b13]/70" />
                  <span className="text-[10px] text-slate-500">{bt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN Add.js ───────────────────────────────────────────
export default function Add() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const tabParam = searchParams.get("tab") || "info";
  const [activeTab,  setActiveTab]  = useState(tabParam);

  // Form thông tin cơ bản
  const [form, setForm] = useState({
    name: "", category_id: "", brand: "",
    price: "", stock: "", expiry_date: "", description: "",
  });

  // Nhiều ảnh
  const [images,    setImages]    = useState([]); // [{url, file?, isNew}]
  const [uploading, setUploading] = useState(false);

  // Nội dung blocks (3 tab)
  const [blocks,       setBlocks]       = useState([]);
  const [pendingFiles, setPendingFiles] = useState({});
  const [savingContent, setSavingContent] = useState(false);
  const [previewTab,   setPreviewTab]   = useState("desc");
  const [showPreview,  setShowPreview]  = useState(false);

  // Modal tạo danh mục
  const [catModal,      setCatModal]      = useState(false);
  const [catForm,       setCatForm]       = useState({ name: "", description: "" });
  const [catSaving,     setCatSaving]     = useState(false);
  const [catError,      setCatError]      = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const fetchCategories = () =>
    fetch(`${API}/product/categories/`)
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});

  useEffect(() => { fetchCategories(); }, []);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/product/${editId}/detail/`).then(r => r.json()),
      fetch(`${API}/product/${editId}/content/`).then(r => r.json()).catch(() => ({ content: null })),
    ]).then(([detail, cont]) => {
      setForm({
        name:        detail.name || "",
        category_id: detail.category_id || "",
        brand:       detail.brand || "",
        price:       detail.price || "",
        stock:       detail.stock || "",
        expiry_date: detail.expiry_date || "",
        description: detail.description || "",
      });
      // Load ảnh
      const imgs = [];
      if (detail.images?.length) {
        detail.images.forEach(img => {
          const url = img?.url || img;
          if (url) imgs.push({ url, isNew: false });
        });
      } else if (detail.image) {
        imgs.push({ url: detail.image, isNew: false });
      }
      setImages(imgs);
      // Load blocks
      if (cont?.content?.blocks) {
        setBlocks(cont.content.blocks.map(b => ({
          ...b, id: b.id || uid(), _idx: b._idx || b.id || uid(), _tab: b._tab || "desc"
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [editId, isEdit]);

  // Upload nhiều ảnh
  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const preview = URL.createObjectURL(file);
        setImages(prev => [...prev, { url: preview, file, isNew: true }]);
      }
      toast.success(`Đã thêm ${files.length} ảnh. Ảnh sẽ được upload khi lưu.`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  // Tạo danh mục
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) { setCatError("Vui lòng nhập tên danh mục."); return; }
    setCatSaving(true); setCatError("");
    try {
      const res  = await fetch(`${API}/product/category/create/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name.trim(), description: catForm.description.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCategories();
        const newId = data.category?.id || data.id;
        if (newId) setForm(f => ({ ...f, category_id: String(newId) }));
        setCatModal(false); setCatForm({ name: "", description: "" });
        toast.success(`Đã tạo danh mục "${catForm.name.trim()}"!`);
      } else setCatError(data.error || "Có lỗi xảy ra.");
    } catch { setCatError("Không thể kết nối server."); }
    finally { setCatSaving(false); }
  };

  // Validate
  const validate = () => {
    if (!form.name.trim()) return "Tên sản phẩm không được để trống.";
    if (!form.category_id) return "Vui lòng chọn danh mục.";
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) return "Giá sản phẩm không hợp lệ.";
    if (form.stock === "" || isNaN(form.stock) || Number(form.stock) < 0) return "Tồn kho không hợp lệ.";
    return null;
  };

  // Upload ảnh block lên Cloudinary
  const uploadBlockImages = async (blocksToUpload) => {
    const updated = [...blocksToUpload];
    for (let i = 0; i < updated.length; i++) {
      const b = updated[i];
      if (b.type === "image" && b._file) {
        try {
          const fd = new FormData();
          fd.append("file", b._file);
          fd.append("upload_preset", "luxeglow_products");
          fd.append("folder", "luxeglow/product_content");
          const res = await fetch("https://api.cloudinary.com/v1_1/dhpncxnqb/image/upload", { method: "POST", body: fd });
          if (res.ok) { const d = await res.json(); updated[i] = { ...b, url: d.secure_url, _file: null }; }
        } catch {}
      }
    }
    return updated;
  };

  // Upload ảnh sản phẩm lên Cloudinary
  const uploadProductImages = async () => {
    const result = [];
    for (const img of images) {
      if (img.file) {
        try {
          const fd = new FormData();
          fd.append("file", img.file);
          fd.append("upload_preset", "luxeglow_products");
          fd.append("folder", "luxeglow/products");
          const res = await fetch("https://api.cloudinary.com/v1_1/dhpncxnqb/image/upload", { method: "POST", body: fd });
          if (res.ok) { const d = await res.json(); result.push(d.secure_url); }
          else result.push(img.url);
        } catch { result.push(img.url); }
      } else {
        result.push(img.url);
      }
    }
    return result;
  };

  // Lưu thông tin sản phẩm
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      // Upload ảnh
      const imageUrls = await uploadProductImages();
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        images: imageUrls,
        image: imageUrls[0] || "",
        ...(isEdit && { id: editId }),
      };
      const endpoint = isEdit ? `${API}/product/update/` : `${API}/product/create/`;
      const res  = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        const pid = isEdit ? editId : (data.product_id || data.id);
        // Lưu nội dung block
        if (pid && blocks.length > 0) {
          await saveContent(pid);
        }
        toast.success(isEdit ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");
        setTimeout(() => navigate("/admin/adminproduct"), 1000);
      } else toast.error(data.error || "Có lỗi xảy ra.");
    } catch (err) { toast.error("Không thể kết nối server."); }
    finally { setSaving(false); }
  };

  // Lưu nội dung (blocks) riêng
  const saveContent = async (pid) => {
    setSavingContent(true);
    try {
      const uploadedBlocks = await uploadBlockImages(blocks);
      const cleanBlocks = uploadedBlocks.map(({ _file, ...rest }) => rest);
      const fd = new FormData();
      fd.append("product_id", pid || editId);
      fd.append("blocks", JSON.stringify(cleanBlocks));
      const res = await fetch(`${API}/product/content/save/`, { method: "POST", body: fd });
      if (res.ok) {
        setBlocks(uploadedBlocks);
        toast.success("Đã lưu nội dung sản phẩm!");
      } else toast.error("Không thể lưu nội dung.");
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSavingContent(false); }
  };

  const CONTENT_TABS = [
    { id: "desc",       label: "Mô tả",      icon: FileText },
    { id: "ingredient", label: "Thành phần",  icon: Layers },
    { id: "guide",      label: "Hướng dẫn",   icon: AlignLeft },
  ];

  // Block renderer cho preview
  const BlockPreview = ({ blocks: blist }) => (
    <div className="flex flex-col gap-4 text-sm">
      {blist.map((b, i) => {
        if (b.type === "heading") return <h2 key={i} className="text-xl font-bold text-slate-900" dangerouslySetInnerHTML={{ __html: b.text }} />;
        if (b.type === "subheading") return <h3 key={i} className="text-base font-semibold text-slate-700" dangerouslySetInnerHTML={{ __html: b.text }} />;
        if (b.type === "paragraph") return <div key={i} className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: b.text }} />;
        if (b.type === "quote") return <blockquote key={i} className="border-l-4 border-[#ec5b13] pl-4 italic text-slate-500" dangerouslySetInnerHTML={{ __html: b.text }} />;
        if (b.type === "list") return <ul key={i} className="flex flex-col gap-1.5">{(b.items || []).map((item, j) => <li key={j} className="flex items-start gap-2 text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-[#ec5b13] shrink-0 mt-1.5" /><span>{item}</span></li>)}</ul>;
        if (b.type === "image") return b.url ? <img key={i} src={b.url} alt={b.caption || ""} className="w-full rounded-xl" /> : null;
        if (b.type === "divider") return <div key={i} className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-200" /><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><div className="flex-1 h-px bg-slate-200" /></div>;
        return null;
      })}
    </div>
  );

  if (loading) return (
    <div className="flex min-h-screen bg-[#f8f7f5]">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ec5b13]" size={48} />
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />

      {/* ── Modal tạo danh mục ── */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCatModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ec5b13]/10 flex items-center justify-center"><Tag size={20} className="text-[#ec5b13]" /></div>
                <h2 className="text-lg font-black text-slate-800">Tạo danh mục mới</h2>
              </div>
              <button onClick={() => setCatModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tên danh mục *</label>
                <input type="text" value={catForm.name} autoFocus
                  onChange={e => { setCatForm(f => ({ ...f, name: e.target.value })); setCatError(""); }}
                  placeholder="Ví dụ: Serum, Kem dưỡng..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Mô tả</label>
                <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Mô tả ngắn..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition resize-none" />
              </div>
              {catError && <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200"><AlertCircle size={16} /> {catError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCatModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
                <button type="submit" disabled={catSaving} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#ec5b13] text-white rounded-xl font-black hover:bg-[#d44e0f] transition disabled:opacity-60">
                  {catSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#f8f7f5]/95 backdrop-blur-sm border-b border-slate-200 px-8 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/adminproduct")}
              className="flex items-center gap-2 text-slate-400 hover:text-[#ec5b13] font-bold text-sm transition">
              <ChevronLeft size={20} /> Quay lại
            </button>
            <h1 className="text-xl font-black text-slate-800">
              {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h1>
          </div>
          <div className="flex gap-3">
            {isEdit && activeTab === "content" && (
              <button onClick={() => saveContent(editId)} disabled={savingContent}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition disabled:opacity-60">
                {savingContent ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Lưu nội dung
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#ec5b13] text-white rounded-xl font-black text-sm hover:bg-[#d44e0f] transition shadow-lg shadow-[#ec5b13]/30 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "Cập nhật" : "Thêm sản phẩm"}
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Tabs điều hướng */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit mb-8 shadow-sm">
            {[
              { id: "info",    label: "Thông tin",  icon: Tag },
              { id: "images",  label: "Hình ảnh",   icon: ImagePlus },
              { id: "content", label: "Nội dung",   icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === id ? "bg-[#ec5b13] text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* ── TAB: Thông tin ── */}
          {activeTab === "info" && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <h2 className="font-black text-slate-800 text-base border-b border-slate-100 pb-4">Thông tin cơ bản</h2>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tên sản phẩm *</label>
                  <input name="name" type="text" value={form.name} onChange={handleChange}
                    placeholder="Ví dụ: Serum Vitamin C Luxe Glow..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Danh mục *</label>
                    <div className="flex gap-2">
                      <select name="category_id" value={form.category_id} onChange={handleChange}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition">
                        <option value="">— Chọn danh mục —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={() => { setCatForm({ name: "", description: "" }); setCatError(""); setCatModal(true); }}
                        className="shrink-0 w-11 flex items-center justify-center bg-[#ec5b13]/10 hover:bg-[#ec5b13] text-[#ec5b13] hover:text-white rounded-xl transition font-black">
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Thương hiệu</label>
                    <input name="brand" type="text" value={form.brand} onChange={handleChange}
                      placeholder="Luxe Organic, CeraVe..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Giá bán (đ) *</label>
                    <input name="price" type="number" min={0} value={form.price} onChange={handleChange}
                      placeholder="350000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
                    {form.price && !isNaN(form.price) && (
                      <p className="text-xs text-slate-400 mt-1 font-bold">{Number(form.price).toLocaleString()}đ</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tồn kho *</label>
                    <input name="stock" type="number" min={0} value={form.stock} onChange={handleChange}
                      placeholder="100"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Hạn sử dụng</label>
                  <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition" />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Mô tả ngắn</label>
                  <textarea name="description" value={form.description} onChange={handleChange}
                    rows={3} placeholder="Mô tả ngắn hiển thị trên trang sản phẩm..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#ec5b13] transition resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Hình ảnh ── */}
          {activeTab === "images" && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-black text-slate-800 text-base">Hình ảnh sản phẩm</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ảnh đầu tiên sẽ là ảnh đại diện. Có thể thêm nhiều ảnh.</p>
                  </div>
                  <label className={`flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-black hover:bg-[#d44e0f] transition cursor-pointer shadow-lg shadow-[#ec5b13]/20 ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <Plus size={15} /> Thêm ảnh
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesUpload} disabled={uploading} />
                  </label>
                </div>

                {images.length === 0 ? (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 hover:border-[#ec5b13] rounded-2xl cursor-pointer transition-all group bg-slate-50">
                    <Upload className="text-slate-300 group-hover:text-[#ec5b13] mb-3 transition" size={36} />
                    <p className="text-sm font-bold text-slate-400 group-hover:text-[#ec5b13] transition">Click để tải ảnh lên</p>
                    <p className="text-xs text-slate-300 mt-1">Hỗ trợ nhiều ảnh cùng lúc</p>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesUpload} />
                  </label>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((img, i) => (
                      <div key={i} className="relative group/img aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 hover:border-[#ec5b13]/30 transition">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-2 left-2 bg-[#ec5b13] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            Ảnh chính
                          </div>
                        )}
                        {img.isNew && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            Mới
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2">
                          {i > 0 && (
                            <button onClick={() => setImages(p => { const a = [...p]; [a[0], a[i]] = [a[i], a[0]]; return a; })}
                              className="px-2 py-1 bg-white text-slate-700 rounded-lg text-[10px] font-black hover:bg-[#ec5b13] hover:text-white transition">
                              Đặt chính
                            </button>
                          )}
                          <button onClick={() => removeImage(i)}
                            className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center text-white hover:bg-red-600 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Nút thêm ảnh inline */}
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#ec5b13] flex flex-col items-center justify-center cursor-pointer transition group bg-slate-50">
                      <Plus size={24} className="text-slate-300 group-hover:text-[#ec5b13] transition" />
                      <span className="text-[10px] text-slate-300 group-hover:text-[#ec5b13] transition mt-1">Thêm ảnh</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesUpload} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Nội dung ── */}
          {activeTab === "content" && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
              {/* Editor */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Sub-tabs */}
                <div className="border-b border-slate-100 px-6 pt-5">
                  <div className="flex gap-1">
                    {CONTENT_TABS.map(({ id, label, icon: Icon }) => (
                      <button key={id}
                        onClick={() => { setPreviewTab(id); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${previewTab === id ? "bg-[#ec5b13]/10 text-[#ec5b13]" : "text-slate-400 hover:text-slate-600"}`}>
                        <Icon size={13} /> {label}
                        <span className="ml-1 bg-slate-100 text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {blocks.filter(b => b._tab === id).length}
                        </span>
                      </button>
                    ))}
                    <div className="ml-auto">
                      <button onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${showPreview ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"}`}>
                        {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                        Preview
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <BlockEditor
                    tab={previewTab}
                    blocks={blocks}
                    onChange={setBlocks}
                    pendingFiles={pendingFiles}
                    onFileSelect={(idx, file) => setPendingFiles(p => ({ ...p, [idx]: file }))}
                  />
                </div>
              </div>

              {/* Preview panel */}
              {showPreview && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 text-sm">Preview</h3>
                    <span className="text-xs text-slate-400 font-bold px-2.5 py-1 bg-slate-50 rounded-full">
                      {CONTENT_TABS.find(t => t.id === previewTab)?.label}
                    </span>
                  </div>
                  {blocks.filter(b => b._tab === previewTab).length > 0 ? (
                    <div className="prose prose-sm max-w-none">
                      <BlockPreview blocks={blocks.filter(b => b._tab === previewTab)} />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-300">
                      <Eye size={28} className="mx-auto mb-2" strokeWidth={1} />
                      <p className="text-xs">Chưa có nội dung để preview</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}