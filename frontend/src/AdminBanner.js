import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, Image, Video, X, Save, Loader2,
  RefreshCw, ChevronUp, ChevronDown, Eye, AlertTriangle,
  Upload, Youtube, ToggleLeft, ToggleRight, Link,
  GripVertical, ChevronLeft, ChevronRight,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

// ─── Video URL helper ────────────────────────────────────────
function normalizeVideoUrl(url = "") {
  const s = url.trim(); if (!s) return { embed: "", type: "unknown" };
  let m = s.match(/(?:youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!m) m = s.match(/youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return { embed: `https://www.youtube.com/embed/${m[1]}?rel=0`, type: "youtube" };
  let gm = s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (!gm) gm = s.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]+)/);
  if (gm) return { embed: `https://drive.google.com/file/d/${gm[1]}/preview`, type: "gdrive" };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(s)) return { embed: s, type: "direct" };
  return { embed: s, type: "unknown" };
}

// ─── Banner Slider Preview ───────────────────────────────────
function BannerPreview({ items, autoPlay, interval }) {
  const [current, setCurrent] = useState(0);
  const total = items.length;
  useEffect(() => {
    if (!autoPlay || total <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % total), interval || 4000);
    return () => clearInterval(t);
  }, [autoPlay, interval, total]);

  if (!total) return (
    <div className="h-44 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-2">
      <Image size={28} strokeWidth={1}/>
      <p className="text-sm">Chưa có item nào</p>
    </div>
  );

  const item = items[current];
  return (
    <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-900 select-none">
      {item.media_type === "video" ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2">
          <Video size={28} className="text-white/30"/>
          <p className="text-white/40 text-xs truncate max-w-xs px-4">{item.media_url}</p>
        </div>
      ) : (
        <img src={item.media_url} alt={item.caption} className="w-full h-full object-cover"/>
      )}
      {item.caption && (
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <p className="text-white text-xs font-bold">{item.caption}</p>
        </div>
      )}
      {total > 1 && (
        <>
          <button onClick={e=>{e.stopPropagation();setCurrent(c=>(c-1+total)%total);}}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
            <ChevronLeft size={14}/>
          </button>
          <button onClick={e=>{e.stopPropagation();setCurrent(c=>(c+1)%total);}}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition">
            <ChevronRight size={14}/>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {items.map((_,i)=>(
              <button key={i} onClick={()=>setCurrent(i)} className={`rounded-full transition-all ${i===current?"w-5 h-1.5 bg-white":"w-1.5 h-1.5 bg-white/50"}`}/>
            ))}
          </div>
        </>
      )}
      <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">{current+1}/{total}</div>
    </div>
  );
}

// ─── Add Item Modal ──────────────────────────────────────────
function AddItemModal({ bannerId, onClose, onAdded }) {
  const toast = useToast();
  const [mode,      setMode]      = useState("image");   // image | video_file | video_url
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState("");
  const [videoUrl,  setVideoUrl]  = useState("");
  const [videoErr,  setVideoErr]  = useState("");
  const [caption,   setCaption]   = useState("");
  const [linkUrl,   setLinkUrl]   = useState("");
  const [loading,   setLoading]   = useState(false);

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const validateVideoUrl = () => {
    const { type } = normalizeVideoUrl(videoUrl);
    if (!videoUrl.trim()) { setVideoErr("Nhập URL"); return false; }
    if (type === "unknown") { setVideoErr("Chỉ hỗ trợ YouTube, Google Drive, .mp4"); return false; }
    setVideoErr(""); return true;
  };

  const handleSubmit = async () => {
    if (mode === "image" && !file) { toast.error("Vui lòng chọn ảnh"); return; }
    if (mode === "video_file" && !file) { toast.error("Vui lòng chọn video"); return; }
    if (mode === "video_url" && !validateVideoUrl()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("banner_id",  bannerId);
      fd.append("caption",    caption);
      fd.append("link_url",   linkUrl);
      fd.append("sort_order", "0");
      if (mode === "image") { fd.append("media_type","image"); fd.append("file",file); }
      else if (mode === "video_file") { fd.append("media_type","video"); fd.append("file",file); }
      else { fd.append("media_type","video"); fd.append("video_url",videoUrl.trim()); }
      const res  = await fetch(`${API}/banner/item/add/`, { method:"POST", body:fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Lỗi thêm item"); return; }
      toast.success("Đã thêm item vào banner!");
      onAdded();
    } catch { toast.error("Không thể kết nối server"); }
    finally { setLoading(false); }
  };

  const videoPreviewEmbed = videoUrl ? normalizeVideoUrl(videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800">Thêm item vào banner</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl mb-5">
          {[{id:"image",l:"🖼 Ảnh"},{id:"video_file",l:"🎥 Video file"},{id:"video_url",l:"🔗 YouTube/Drive"}].map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setFile(null);setPreview("");setVideoUrl("");setVideoErr("");}}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition ${mode===m.id?"bg-white shadow text-slate-800 border border-slate-200":"text-slate-500 hover:text-slate-700"}`}>
              {m.l}
            </button>
          ))}
        </div>

        {/* IMAGE / VIDEO FILE */}
        {(mode==="image"||mode==="video_file") && (
          <div className="mb-4">
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
              {mode==="image"?"Chọn ảnh":"Chọn video"}
            </label>
            {preview ? (
              <div className="relative rounded-xl overflow-hidden h-36 bg-slate-100">
                {mode==="image"
                  ? <img src={preview} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2"><Video size={28} className="text-slate-400"/><span className="text-xs text-slate-500 px-4 text-center">{file?.name}</span></div>
                }
                <button onClick={()=>{setFile(null);setPreview("");}} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white"><X size={13}/></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#2D5A27]/40 transition">
                <Upload size={20} className="text-slate-300 mb-1"/>
                <span className="text-xs text-slate-400">{mode==="image"?"Click để chọn ảnh (≤50MB)":"Click để chọn video (≤50MB)"}</span>
                <input type="file" accept={mode==="image"?"image/*":"video/*"} className="hidden" onChange={handleFile}/>
              </label>
            )}
          </div>
        )}

        {/* VIDEO URL */}
        {mode==="video_url" && (
          <div className="mb-4">
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">URL Video</label>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3">
              <Youtube size={16} className="text-blue-500 shrink-0"/>
              <p className="text-[11px] text-blue-600">Hỗ trợ <strong>YouTube</strong>, <strong>Google Drive</strong>, hoặc link .mp4 trực tiếp</p>
            </div>
            <input value={videoUrl} onChange={e=>{setVideoUrl(e.target.value);setVideoErr("");}}
              onBlur={()=>videoUrl&&validateVideoUrl()}
              placeholder="https://youtu.be/... hoặc drive.google.com/..."
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none transition ${videoErr?"border-red-400":"border-slate-200 focus:border-[#2D5A27]"}`}/>
            {videoErr&&<p className="text-red-500 text-[11px] mt-1">{videoErr}</p>}
            {/* Preview YouTube realtime */}
            {videoPreviewEmbed?.type==="youtube"&&(
              <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black">
                <iframe src={videoPreviewEmbed.embed} className="w-full h-full" allowFullScreen title="preview"/>
              </div>
            )}
            {videoPreviewEmbed?.type==="gdrive"&&(
              <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-xl text-[11px] text-green-600">✅ Google Drive hợp lệ — sẽ hiển thị sau khi lưu</div>
            )}
          </div>
        )}

        {/* Caption & Link */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">Chú thích (tùy chọn)</label>
            <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Nội dung hiển thị trên banner..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition"/>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">Liên kết khi click (tùy chọn)</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus-within:border-[#2D5A27] transition">
              <Link size={14} className="text-slate-400 shrink-0"/>
              <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..."
                className="flex-1 bg-transparent text-sm outline-none"/>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold transition">Hủy</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#2D5A27] text-white text-sm font-black hover:bg-[#1f3f1b] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Item Modal ─────────────────────────────────────────
function EditItemModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [caption,  setCaption]  = useState(item.caption || "");
  const [linkUrl,  setLinkUrl]  = useState(item.link_url || "");
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/banner/item/update/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, caption, link_url: linkUrl }),
      });
      if (res.ok) { toast.success("Đã cập nhật item!"); onSaved(); }
      else toast.error("Lỗi cập nhật");
    } catch { toast.error("Lỗi kết nối"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800">Chỉnh sửa item</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        {/* Thumbnail preview */}
        <div className="h-24 rounded-xl overflow-hidden bg-slate-100 mb-4 flex items-center justify-center">
          {item.media_type==="video"
            ? <div className="flex flex-col items-center gap-1 text-slate-400"><Video size={24}/><span className="text-xs">Video</span></div>
            : <img src={item.media_url} alt="" className="w-full h-full object-cover"/>
          }
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">Chú thích</label>
            <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Chú thích hiển thị..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition"/>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">Liên kết khi click</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus-within:border-[#2D5A27] transition">
              <Link size={14} className="text-slate-400 shrink-0"/>
              <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..."
                className="flex-1 bg-transparent text-sm outline-none"/>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold transition">Hủy</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#2D5A27] text-white text-sm font-black hover:bg-[#1f3f1b] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Banner Modal ─────────────────────────────────────
function CreateBannerModal({ onClose, onCreated }) {
  const toast = useToast();
  const [title,    setTitle]    = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [interval, setInterval_] = useState(4000);
  const [loading,  setLoading]  = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/banner/create/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), is_active: true, auto_play: autoPlay, interval }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Lỗi tạo banner"); return; }
      toast.success("Tạo banner thành công!");
      onCreated();
    } catch { toast.error("Lỗi kết nối"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800">Tạo banner mới</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tên banner</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="VD: Banner trang chủ..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition"
              onKeyDown={e=>e.key==="Enter"&&handleCreate()}/>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-700">Tự động chuyển slide</p>
              <p className="text-xs text-slate-400">Auto slideshow</p>
            </div>
            <button onClick={()=>setAutoPlay(!autoPlay)}
              className={`relative w-11 h-6 rounded-full transition-all ${autoPlay?"bg-[#2D5A27]":"bg-slate-300"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${autoPlay?"left-6":"left-1"}`}/>
            </button>
          </div>
          {autoPlay && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Thời gian mỗi slide</label>
              <div className="flex gap-2">
                {[2000,3000,4000,5000,6000].map(ms=>(
                  <button key={ms} onClick={()=>setInterval_(ms)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition ${interval===ms?"bg-[#2D5A27] text-white border-[#2D5A27]":"bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                    {ms/1000}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold transition">Hủy</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#2D5A27] text-white text-sm font-black hover:bg-[#1f3f1b] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Tạo banner
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Banner Card ─────────────────────────────────────────────
function BannerCard({ banner, onRefresh }) {
  const toast = useToast();
  const [expanded,  setExpanded]  = useState(false);
  const [addItem,   setAddItem]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [toggling,  setToggling]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const toggleActive = async () => {
    setToggling(true);
    try {
      const res = await fetch(`${API}/banner/update/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id: banner.id, is_active: !banner.is_active }),
      });
      if (res.ok) { toast.success(banner.is_active?"Đã tắt banner":"Đã bật banner"); onRefresh(); }
    } catch { toast.error("Lỗi cập nhật"); }
    finally { setToggling(false); }
  };

  const deleteBanner = async () => {
    if (!window.confirm(`Xóa banner "${banner.title || `#${banner.id}`}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/banner/delete/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id: banner.id }),
      });
      if (res.ok) { toast.success("Đã xóa banner"); onRefresh(); }
    } catch { toast.error("Lỗi xóa"); }
    finally { setDeleting(false); }
  };

  const deleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API}/banner/item/delete/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id: itemId }),
      });
      if (res.ok) { toast.success("Đã xóa item"); onRefresh(); }
      else toast.error("Lỗi xóa item");
    } catch { toast.error("Lỗi kết nối"); }
  };

  const moveItem = async (items, fromIdx, dir) => {
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= items.length) return;
    const newOrder = [...items.map(i => i.id)];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    try {
      await fetch(`${API}/banner/item/reorder/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ order: newOrder }),
      });
      onRefresh();
    } catch { toast.error("Lỗi sắp xếp"); }
  };

  const items = banner.items || [];

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${banner.is_active?"border-[#2D5A27]/20":"border-slate-100 opacity-75"}`}>
      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${banner.is_active?"bg-[#2D5A27] shadow-lg shadow-[#2D5A27]/40":"bg-slate-300"}`}/>
          <div>
            <h3 className="font-black text-slate-800">{banner.title || `Banner #${banner.id}`}</h3>
            <p className="text-xs text-slate-400">
              {items.length} items
              {banner.auto_play ? ` · Auto ${banner.interval/1000}s` : " · Manual"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle active */}
          <button onClick={toggleActive} disabled={toggling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50">
            {toggling ? <Loader2 size={14} className="animate-spin text-slate-400"/>
              : banner.is_active
                ? <ToggleRight size={18} className="text-[#2D5A27]"/>
                : <ToggleLeft size={18} className="text-slate-400"/>
            }
            <span className={banner.is_active?"text-[#2D5A27]":"text-slate-400"}>
              {banner.is_active?"Đang bật":"Đã tắt"}
            </span>
          </button>
          {/* Preview toggle */}
          <button onClick={()=>setExpanded(!expanded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition ${expanded?"bg-slate-800 text-white border-slate-800":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Eye size={14}/> {expanded?"Ẩn":"Xem"}
          </button>
          {/* Delete */}
          <button onClick={deleteBanner} disabled={deleting}
            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition disabled:opacity-50">
            {deleting?<Loader2 size={15} className="animate-spin"/>:<Trash2 size={15}/>}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/30">
          {/* Slider preview */}
          <BannerPreview items={items} autoPlay={banner.auto_play} interval={banner.interval}/>

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Danh sách items ({items.length})</h4>
              <button onClick={()=>setAddItem(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition">
                <Plus size={13}/> Thêm item
              </button>
            </div>

            {items.length === 0 ? (
              <div onClick={()=>setAddItem(true)} className="flex flex-col items-center py-10 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#2D5A27]/40 transition text-slate-300 gap-2">
                <Image size={28} strokeWidth={1}/>
                <p className="text-sm">Click để thêm ảnh/video đầu tiên</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition group">
                    <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0"/>

                    {/* Thumbnail */}
                    <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                      {item.media_type==="video"
                        ? <Video size={16} className="text-slate-400"/>
                        : <img src={item.media_url} alt="" className="w-full h-full object-cover"/>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.media_type==="video"?"bg-blue-50 text-blue-600":"bg-[#2D5A27]/8 text-[#2D5A27]"}`}>
                          {item.media_type==="video"?"🎥 Video":"🖼 Ảnh"}
                        </span>
                        <span className="text-[10px] text-slate-400">#{item.id}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">
                        {item.caption || <span className="text-slate-300 italic">Không có chú thích</span>}
                      </p>
                      {item.link_url && (
                        <p className="text-[10px] text-[#2D5A27] truncate flex items-center gap-1"><Link size={9}/>{item.link_url}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>moveItem(items,idx,-1)} disabled={idx===0} title="Lên"
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition"><ChevronUp size={13}/></button>
                      <button onClick={()=>moveItem(items,idx,1)} disabled={idx===items.length-1} title="Xuống"
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition"><ChevronDown size={13}/></button>
                      <button onClick={()=>setEditItem(item)} title="Sửa chú thích & link"
                        className="p-1 rounded-lg hover:bg-[#2D5A27]/10 text-slate-400 hover:text-[#2D5A27] transition"><Edit2 size={13}/></button>
                      <button onClick={()=>{if(window.confirm("Xóa item này?"))deleteItem(item.id);}} title="Xóa"
                        className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><Trash2 size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings row */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 bg-white rounded-xl p-3 border border-slate-100">
            <span className="font-bold text-slate-600">Cài đặt:</span>
            <span>Auto play: <strong className={banner.auto_play?"text-[#2D5A27]":"text-slate-400"}>{banner.auto_play?"Bật":"Tắt"}</strong></span>
            {banner.auto_play&&<span>Interval: <strong className="text-slate-700">{banner.interval/1000}s</strong></span>}
            <span>Trạng thái: <strong className={banner.is_active?"text-[#2D5A27]":"text-slate-400"}>{banner.is_active?"Đang hiển thị":"Ẩn"}</strong></span>
          </div>
        </div>
      )}

      {/* Modals */}
      {addItem && (
        <AddItemModal bannerId={banner.id} onClose={()=>setAddItem(false)} onAdded={()=>{setAddItem(false);onRefresh();}}/>
      )}
      {editItem && (
        <EditItemModal item={editItem} onClose={()=>setEditItem(null)} onSaved={()=>{setEditItem(null);onRefresh();}}/>
      )}
    </div>
  );
}

// ─── MAIN AdminBanner ────────────────────────────────────────
export default function AdminBanner() {
  const toast = useToast();
  const [banners,  setBanners]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/banner/list/`);
      const data = await res.json();
      setBanners(data.banners || []);
    } catch { toast.error("Không thể tải banner"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const activeBanners = banners.filter(b => b.is_active);

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar/>
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản lý Banner</h1>
            <p className="text-slate-400 text-sm mt-1">
              {banners.length} banner · {activeBanners.length} đang bật
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchBanners}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition">
              <RefreshCw size={16} className={loading?"animate-spin":""}/>
            </button>
            <button onClick={()=>setCreating(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20">
              <Plus size={16}/> Tạo banner
            </button>
          </div>
        </div>

        {/* Multi-active warning */}
        {activeBanners.length > 1 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-6">
            <AlertTriangle size={18} className="text-amber-500 shrink-0"/>
            <p className="text-sm font-bold text-amber-700">
              Có {activeBanners.length} banner đang bật. Hệ thống sẽ hiển thị banner đầu tiên (#{activeBanners[0]?.id}).
              Hãy tắt bớt các banner không cần thiết.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {label:"Tổng banner",value:banners.length,color:"bg-slate-700"},
            {label:"Đang bật",value:activeBanners.length,color:"bg-[#2D5A27]"},
            {label:"Tổng items",value:banners.reduce((s,b)=>s+(b.items?.length||0),0),color:"bg-[#ec5b13]"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center`}>
                <Image size={20} className="text-white"/>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{loading?"—":s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Banners */}
        {loading ? (
          <div className="space-y-4">{[...Array(2)].map((_,i)=><div key={i} className="h-24 bg-white rounded-2xl animate-pulse"/>)}</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100">
            <Image className="mx-auto text-slate-200 mb-4" size={64} strokeWidth={1}/>
            <h3 className="text-xl font-black text-slate-800 mb-2">Chưa có banner nào</h3>
            <p className="text-slate-400 mb-6">Tạo banner để hiển thị hình ảnh/video quảng cáo trên website</p>
            <button onClick={()=>setCreating(true)}
              className="px-6 py-3 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20">
              Tạo banner đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {banners.map(banner=>(
              <BannerCard key={banner.id} banner={banner} onRefresh={fetchBanners}/>
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateBannerModal onClose={()=>setCreating(false)} onCreated={()=>{setCreating(false);fetchBanners();}}/>
      )}
    </div>
  );
}
