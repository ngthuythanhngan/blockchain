import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight,
  Loader2, Package, Shield, Truck, Send, X,
  MessageCircle, ZoomIn, Heart, ImagePlus, Play,
  Reply, Trash2, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";
const MAX_MB = 100;

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)     return "Vừa xong";
  if (diff < 3600)   return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function totalMB(files) {
  return files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
}

// ═══════════════════════════════════════════════════════
// STAR PICKER
// ═══════════════════════════════════════════════════════
function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)} className="transition-transform hover:scale-110">
          <Star size={size}
            fill={(hover || value) >= s ? "#f59e0b" : "none"}
            stroke={(hover || value) >= s ? "#f59e0b" : "#d1d5db"} />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STAR DISPLAY
// ═══════════════════════════════════════════════════════
function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          fill={s <= value ? "#f59e0b" : "none"}
          stroke={s <= value ? "#f59e0b" : "#d1d5db"} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// IMAGE SLIDER
// ═══════════════════════════════════════════════════════
function ImageSlider({ images }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef(null);
  const thumbsRef = useRef(null);

  const prev = useCallback(() => setActive(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const h = e => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     setZoomed(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next]);

  useEffect(() => {
    if (!thumbsRef.current) return;
    const el = thumbsRef.current.children[active];
    if (el) el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  if (!images.length) return null;
  return (
    <div className="select-none">
      <div className="relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm mb-3 cursor-pointer group"
        onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchStart.current === null) return;
          const diff = touchStart.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
          touchStart.current = null;
        }}
        onClick={() => setZoomed(true)}>
        <div className="aspect-square">
          <img key={active} src={images[active]} alt={`Ảnh ${active + 1}`} className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/80 backdrop-blur-sm rounded-full p-2"><ZoomIn size={18} className="text-slate-600" /></div>
        </div>
        {images.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-[#2D5A27] opacity-0 group-hover:opacity-100 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={e => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-[#2D5A27] opacity-0 group-hover:opacity-100 transition-all">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setActive(i); }}
                  className={`rounded-full transition-all ${i === active ? "w-5 h-1.5 bg-[#2D5A27]" : "w-1.5 h-1.5 bg-white/70"}`} />
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-black/40 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
              {active + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === active ? "border-[#2D5A27] shadow-md" : "border-slate-100 opacity-70 hover:opacity-100"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><X size={20} /></button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><ChevronLeft size={20} /></button>
              <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><ChevronRight size={20} /></button>
            </>
          )}
          <img src={images[active]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MEDIA PREVIEW
// ═══════════════════════════════════════════════════════
function MediaPreview({ media, onRemove }) {
  if (!media || !media.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {media.map((m, i) => (
        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
          {m.type === "video"
            ? <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <Play size={20} className="text-white" />
                <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-40" muted />
              </div>
            : <img src={m.url} alt="" className="w-full h-full object-cover" />
          }
          {onRemove && (
            <button onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition">
              <X size={10} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MEDIA UPLOAD BOX
// ═══════════════════════════════════════════════════════
function MediaUploadBox({ files, onFilesChange, uploading }) {
  const inputRef = useRef();

  const handlePick = e => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const combined = [...files, ...picked];
    if (totalMB(combined) > MAX_MB) {
      alert(`Tổng dung lượng vượt ${MAX_MB}MB. Vui lòng chọn ít file hơn.`);
      return;
    }
    onFilesChange(combined);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <button type="button" disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition disabled:opacity-50">
          <ImagePlus size={14} /> Thêm ảnh/video
        </button>
        {files.length > 0 && (
          <span className="text-[10px] text-slate-400 font-bold">
            {files.length} file · {totalMB(files).toFixed(1)}MB / {MAX_MB}MB
          </span>
        )}
      </div>
      <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handlePick} />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((f, i) => {
            const isVideo = f.type.startsWith("video/");
            const url = URL.createObjectURL(f);
            return (
              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                {isVideo
                  ? <div className="w-full h-full flex items-center justify-center bg-slate-700"><Play size={16} className="text-white" /></div>
                  : <img src={url} alt="" className="w-full h-full object-cover" />
                }
                <button onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition">
                  <X size={9} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BLOCK RENDERER
// ═══════════════════════════════════════════════════════
function BlockRenderer({ block }) {
  const align = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";
  switch (block.type) {
    case "heading":    return <h2 className={`text-2xl font-black text-slate-800 leading-snug ${align}`} dangerouslySetInnerHTML={{ __html: block.text }} />;
    case "subheading": return <h3 className={`text-lg font-bold text-slate-700 leading-snug ${align}`} dangerouslySetInnerHTML={{ __html: block.text }} />;
    case "paragraph":  return <p className={`text-slate-600 leading-relaxed text-sm ${align}`} dangerouslySetInnerHTML={{ __html: block.text }} />;
    case "quote":
      return <blockquote className="border-l-4 border-[#2D5A27] pl-5 py-1 bg-[#2D5A27]/5 rounded-r-xl">
        <p className="text-slate-600 italic text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: block.text }} />
      </blockquote>;
    case "list":
      return <ul className="space-y-1.5 pl-2">
        {(block.items || []).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#2D5A27] shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ul>;
    case "image":
      return block.url ? <figure className="rounded-2xl overflow-hidden border border-slate-100">
        <img src={block.url} alt={block.caption || ""} className="w-full object-cover" />
        {block.caption && <figcaption className="text-xs text-slate-400 text-center py-2 px-4 bg-slate-50">{block.caption}</figcaption>}
      </figure> : null;
    case "video":
      return block.embed ? <div className="rounded-2xl overflow-hidden border border-slate-100 aspect-video">
        <iframe src={block.embed} title="video" className="w-full h-full" allowFullScreen />
      </div> : null;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════
function Avatar({ src, name, size = 9 }) {
  const cls = `w-${size} h-${size} rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center font-black text-[#2D5A27] text-sm`;
  return (
    <div className={cls}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (name?.[0] || "?")}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// REVIEW CARD — 1 đánh giá (không có chức năng sửa)
// ═══════════════════════════════════════════════════════
function ReviewCard({ review, user, onReplySuccess }) {
  const toast = useToast();
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const admin = isAdminRoute
    ? JSON.parse(sessionStorage.getItem("admin") || "null")
    : null;

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent,  setReplyContent]  = useState("");
  const [replyFiles,    setReplyFiles]    = useState([]);
  const [submitting,    setSubmitting]    = useState(false);

  const handleAdminReply = async () => {
    if (!replyContent.trim()) { toast.error("Vui lòng nhập nội dung phản hồi."); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("review_id", review.id);
      fd.append("admin_id",  admin?.id || admin?.maadmin || "");
      fd.append("content",   replyContent.trim());
      replyFiles.forEach(f => fd.append("files", f));
      const res  = await fetch(`${API}/admin/reply/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã gửi phản hồi!");
        setReplyContent(""); setReplyFiles([]); setShowReplyForm(false);
        onReplySuccess && onReplySuccess(review.id, data.reply);
      } else {
        toast.error(data.error || "Không thể gửi phản hồi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex gap-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
      <Avatar src={review.customer_avatar} name={review.customer_name} size={10} />
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="font-black text-slate-800 text-sm">{review.customer_name}</span>
          <Stars value={review.rating} size={13} />
          <span className="text-xs text-slate-400">{timeAgo(review.date)}</span>
        </div>

        {/* Nội dung */}
        {review.content && (
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{review.content}</p>
        )}

        {/* Media đính kèm */}
        {review.media?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {review.media.map((m, i) => (
              <div key={i}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer"
                onClick={() => window.open(m.url, "_blank")}>
                {m.type === "video"
                  ? <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Play size={18} className="text-white" />
                      <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-30" muted />
                    </div>
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />
                }
              </div>
            ))}
          </div>
        )}

        {/* Admin replies */}
        {review.replies?.map(rep => (
          <div key={rep.id} className="mt-3 ml-2 pl-4 border-l-2 border-[#2D5A27]/30 rounded-r-xl">
            <div className="bg-[#2D5A27]/5 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-[#2D5A27] flex items-center justify-center text-white text-[10px] font-black shrink-0">A</div>
                <span className="text-xs font-black text-[#2D5A27]">{rep.admin_name}</span>
                <span className="text-[10px] text-slate-400">{timeAgo(rep.created_at)}</span>
              </div>
              <p className="text-sm text-slate-600 ml-8 leading-relaxed">{rep.content}</p>
              {rep.media?.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-8 mt-2">
                  {rep.media.map((m, i) => (
                    <div key={i}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 cursor-pointer"
                      onClick={() => window.open(m.url, "_blank")}>
                      {m.type === "video"
                        ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={14} className="text-white" /></div>
                        : <img src={m.url} alt="" className="w-full h-full object-cover" />
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Admin reply button */}
        {admin && (
          <div className="mt-3">
            <button onClick={() => setShowReplyForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A27] hover:text-[#1f3f1b] transition">
              <Reply size={13} /> Trả lời (Admin)
            </button>
            {showReplyForm && (
              <div className="mt-2 ml-2 p-3 bg-[#2D5A27]/5 rounded-xl border border-[#2D5A27]/10">
                <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="Nhập phản hồi của bạn..." rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D5A27] transition" />
                <MediaUploadBox files={replyFiles} onFilesChange={setReplyFiles} uploading={submitting} />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleAdminReply} disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition disabled:opacity-60">
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Gửi
                  </button>
                  <button onClick={() => { setShowReplyForm(false); setReplyContent(""); setReplyFiles([]); }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMMENT CARD — 1 bình luận (đệ quy)
// ═══════════════════════════════════════════════════════
function CommentCard({ comment, productId, user, depth = 0, onUpdate }) {
  const toast = useToast();
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const admin = isAdminRoute
    ? JSON.parse(sessionStorage.getItem("admin") || "null")
    : null;

  const [liked,        setLiked]        = useState(comment.liked || false);
  const [likeCount,    setLikeCount]    = useState(comment.like_count || 0);
  const [showReply,    setShowReply]    = useState(false);
  const [showChildren, setShowChildren] = useState(depth < 2);
  const [replyText,    setReplyText]    = useState("");
  const [replyFiles,   setReplyFiles]   = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const [editing,      setEditing]      = useState(false);
  const [editText,     setEditText]     = useState(comment.content || "");
  const [editMedia,    setEditMedia]    = useState(comment.media || []);
  const [editFiles,    setEditFiles]    = useState([]);
  const [saving,       setSaving]       = useState(false);

  const [showAdminReply,  setShowAdminReply]  = useState(false);
  const [adminReplyText,  setAdminReplyText]  = useState("");
  const [adminReplyFiles, setAdminReplyFiles] = useState([]);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const handleLike = async () => {
    if (!user) { toast.info("Đăng nhập để thích bình luận."); return; }
    try {
      const res  = await fetch(`${API}/comment/like/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: comment.id, customer_id: user.id }),
      });
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikeCount(data.like_count); }
    } catch { toast.error("Lỗi kết nối."); }
  };

  const handleReply = async () => {
    if (!user) { toast.info("Đăng nhập để bình luận."); return; }
    if (!replyText.trim()) { toast.error("Vui lòng nhập nội dung."); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("customer_id", user.id);
      fd.append("product_id",  productId);
      fd.append("content",     replyText.trim());
      fd.append("parent_id",   comment.id);
      replyFiles.forEach(f => fd.append("files", f));

      const res  = await fetch(`${API}/comment/create/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã trả lời!");
        setReplyText(""); setReplyFiles([]); setShowReply(false);
        setShowChildren(true);
        onUpdate && onUpdate();
      } else {
        toast.error(data.error || "Không thể gửi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa bình luận này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/comment/delete/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: comment.id, customer_id: user?.id }),
      });
      if (res.ok) { toast.success("Đã xóa bình luận."); onUpdate && onUpdate(); }
      else toast.error("Không thể xóa.");
    } catch { toast.error("Lỗi kết nối."); }
    finally { setDeleting(false); }
  };

  const handleEdit = async () => {
    if (!editText.trim()) { toast.error("Nội dung không được để trống."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("comment_id",  comment.id);
      fd.append("customer_id", user.id);
      fd.append("content",     editText.trim());
      fd.append("keep_media",  JSON.stringify(editMedia));
      editFiles.forEach(f => fd.append("files", f));

      const res  = await fetch(`${API}/comment/update/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đã cập nhật bình luận!");
        setEditing(false);
        setEditFiles([]);
        onUpdate && onUpdate();
      } else {
        toast.error(data.error || "Không thể cập nhật.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSaving(false); }
  };

  const handleAdminReply = async () => {
    if (!adminReplyText.trim()) { toast.error("Vui lòng nhập nội dung."); return; }
    setAdminSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("comment_id", comment.id);
      fd.append("admin_id",   admin?.id || admin?.maadmin || "");
      fd.append("content",    adminReplyText.trim());
      adminReplyFiles.forEach(f => fd.append("files", f));

      const res  = await fetch(`${API}/comment/admin-reply/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã trả lời!");
        setAdminReplyText(""); setAdminReplyFiles([]); setShowAdminReply(false);
        onUpdate && onUpdate();
      } else {
        toast.error(data.error || "Không thể gửi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setAdminSubmitting(false); }
  };

  const isOwner = user && String(user.id) === String(comment.customer_id);
  const replies = comment.replies || [];
  const adminReplies = comment.admin_replies || [];

  return (
    <div className={`flex gap-3 ${depth > 0 ? "mt-3" : ""}`}>
      <Avatar src={comment.customer_avatar} name={comment.customer_name} size={depth === 0 ? 9 : 8} />

      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-black text-slate-800 text-sm">{comment.customer_name}</span>
            <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
            {comment.updated_at && comment.updated_at !== comment.created_at && (
              <span className="text-[10px] text-slate-300 italic">(đã chỉnh sửa)</span>
            )}
          </div>

          {!editing && (
            <>
              <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
              {comment.media?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {comment.media.map((m, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      {m.type === "video"
                        ? <div className="w-full h-full flex items-center justify-center bg-slate-800 cursor-pointer"
                            onClick={() => window.open(m.url, "_blank")}>
                            <Play size={18} className="text-white" />
                            <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-30" muted />
                          </div>
                        : <img src={m.url} alt="" className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(m.url, "_blank")} />
                      }
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {editing && (
            <div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                rows={3} autoFocus
                className="w-full px-3 py-2 bg-white border border-[#2D5A27]/40 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D5A27] transition" />
              {editMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editMedia.map((m, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                      {m.type === "video"
                        ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={13} className="text-white" /></div>
                        : <img src={m.url} alt="" className="w-full h-full object-cover" />
                      }
                      <button onClick={() => setEditMedia(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition">
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <MediaUploadBox files={editFiles} onFilesChange={setEditFiles} uploading={saving} />
              <div className="flex gap-2 mt-2">
                <button onClick={handleEdit} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Lưu
                </button>
                <button onClick={() => { setEditing(false); setEditText(comment.content); setEditMedia(comment.media || []); setEditFiles([]); }}
                  className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition">
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {adminReplies.map(ar => (
          <div key={ar.id} className="mt-2 ml-2 pl-3 border-l-2 border-[#2D5A27]/30">
            <div className="bg-[#2D5A27]/5 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg bg-[#2D5A27] flex items-center justify-center text-white text-[9px] font-black">A</div>
                <span className="text-xs font-black text-[#2D5A27]">{ar.admin_name}</span>
                <span className="text-[10px] text-slate-400">{timeAgo(ar.created_at)}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{ar.content}</p>
              {ar.media?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ar.media.map((m, i) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                      {m.type === "video"
                        ? <div className="w-full h-full bg-slate-700 flex items-center justify-center cursor-pointer" onClick={() => window.open(m.url, "_blank")}><Play size={13} className="text-white" /></div>
                        : <img src={m.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(m.url, "_blank")} />
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-1 ml-1">
          <button onClick={handleLike}
            className={`flex items-center gap-1 text-xs font-bold transition-all ${liked ? "text-red-500" : "text-slate-400 hover:text-red-400"}`}>
            <Heart size={13} fill={liked ? "#ef4444" : "none"} /> {likeCount > 0 && likeCount}
          </button>

          {user && depth < 3 && (
            <button onClick={() => setShowReply(v => !v)}
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#2D5A27] transition">
              <Reply size={13} /> Trả lời
            </button>
          )}

          {admin && (
            <button onClick={() => setShowAdminReply(v => !v)}
              className="flex items-center gap-1 text-xs font-bold text-[#2D5A27] hover:text-[#1f3f1b] transition">
              <Reply size={13} /> Admin trả lời
            </button>
          )}

          {(isOwner || admin) && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500 transition disabled:opacity-50">
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          )}

          {isOwner && !editing && (
            <button onClick={() => { setEditing(true); setEditText(comment.content); setEditMedia(comment.media || []); setEditFiles([]); }}
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#2D5A27] transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Sửa
            </button>
          )}

          {replies.length > 0 && (
            <button onClick={() => setShowChildren(v => !v)}
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#2D5A27] transition ml-auto">
              {showChildren ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {replies.length} trả lời
            </button>
          )}
        </div>

        {showReply && (
          <div className="mt-2 ml-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Nhập trả lời..." rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D5A27] transition" />
            <MediaUploadBox files={replyFiles} onFilesChange={setReplyFiles} uploading={submitting} />
            <div className="flex gap-2 mt-2">
              <button onClick={handleReply} disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition disabled:opacity-60">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Gửi
              </button>
              <button onClick={() => { setShowReply(false); setReplyText(""); setReplyFiles([]); }}
                className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition">
                Hủy
              </button>
            </div>
          </div>
        )}

        {showAdminReply && (
          <div className="mt-2 ml-2 p-3 bg-[#2D5A27]/5 rounded-xl border border-[#2D5A27]/10">
            <textarea value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)}
              placeholder="Phản hồi từ admin..." rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D5A27] transition" />
            <MediaUploadBox files={adminReplyFiles} onFilesChange={setAdminReplyFiles} uploading={adminSubmitting} />
            <div className="flex gap-2 mt-2">
              <button onClick={handleAdminReply} disabled={adminSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition disabled:opacity-60">
                {adminSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Gửi
              </button>
              <button onClick={() => { setShowAdminReply(false); setAdminReplyText(""); setAdminReplyFiles([]); }}
                className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition">
                Hủy
              </button>
            </div>
          </div>
        )}

        {showChildren && replies.length > 0 && (
          <div className="mt-2 ml-2 pl-3 border-l-2 border-slate-100 space-y-2">
            {replies.map(child => (
              <CommentCard key={child.id} comment={child} productId={productId}
                user={user} depth={depth + 1} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RATING SUMMARY
// ═══════════════════════════════════════════════════════
function RatingSummary({ reviews, avgRating, totalCount }) {
  const counts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
  }));

  return (
    <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 bg-slate-50 rounded-2xl">
      <div className="flex flex-col items-center justify-center shrink-0 min-w-[120px]">
        <span className="text-5xl font-black text-slate-800 leading-none">{avgRating.toFixed(1)}</span>
        <Stars value={Math.round(avgRating)} size={18} />
        <span className="text-xs text-slate-400 font-bold mt-1">{totalCount} đánh giá</span>
      </div>
      <div className="flex-1 space-y-2">
        {counts.map(({ star, count }) => {
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-500 w-4 shrink-0">{star}</span>
              <Star size={12} fill="#f59e0b" stroke="#f59e0b" className="shrink-0" />
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-400 font-bold w-6 text-right shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function InformationProduct() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();

  const [product,          setProduct]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [qty,              setQty]              = useState(1);
  const [reviews,          setReviews]          = useState([]);
  const [comments,         setComments]         = useState([]);
  const [contentBlocks,    setContentBlocks]    = useState([]);
  const [activeContentTab, setActiveContentTab] = useState("desc");
  const [hasBought,        setHasBought]        = useState(false);

  const [showReviewForm,   setShowReviewForm]   = useState(false);
  const [reviewRating,     setReviewRating]     = useState(5);
  const [reviewContent,    setReviewContent]    = useState("");
  const [reviewFiles,      setReviewFiles]      = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [commentText,      setCommentText]      = useState("");
  const [commentFiles,     setCommentFiles]     = useState([]);
  const [submittingCmt,    setSubmittingCmt]    = useState(false);

  const CONTENT_TABS = [
    { id: "desc",       label: "Mô tả" },
    { id: "ingredient", label: "Thành phần" },
    { id: "guide",      label: "Hướng dẫn" },
  ];

  const user = JSON.parse(sessionStorage.getItem("user") || "null");

  const loadReviews = useCallback(() => {
    fetch(`${API}/review/list/?product_id=${id}`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => {});
  }, [id]);

  const loadComments = useCallback(() => {
    const uid = user?.id ? `&customer_id=${user.id}` : "";
    fetch(`${API}/comment/list/?product_id=${id}${uid}`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => {});
  }, [id, user?.id]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/product/${id}/detail/`)
      .then(r => r.json()).then(d => { setProduct(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`${API}/product/${id}/content/`)
      .then(r => r.json()).then(d => setContentBlocks(d.content?.blocks || [])).catch(() => {});
    loadReviews();
    loadComments();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/order/list/?customer_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        setHasBought((d.orders || []).some(o =>
          o.status === "Hoàn thành" && (o.items || []).some(i => i.product_id === id)
        ));
      }).catch(() => {});
  }, [id]);

  const images = (() => {
    if (!product) return [];
    const list = [];
    if (product.image) list.push(product.image);
    if (product.images) product.images.forEach(img => { if (img && !list.includes(img)) list.push(img); });
    return list.length ? list : ["https://via.placeholder.com/600x600?text=No+Image"];
  })();

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;
    const cart = JSON.parse(sessionStorage.getItem("cart") || "[]");
    const idx  = cart.findIndex(i => i.id === product.id);
    const currentQty = idx >= 0 ? cart[idx].quantity : 0;
    const maxAdd = product.stock - currentQty;
    if (maxAdd <= 0) {
      toast.error(`Bạn đã có ${currentQty} sản phẩm trong giỏ — đã đạt tối đa tồn kho (${product.stock}).`);
      return;
    }
    const addQty = Math.min(qty, maxAdd);
    if (addQty < qty) {
      toast.warning(`Chỉ có thể thêm ${addQty} sản phẩm (tồn kho: ${product.stock}).`);
    }
    if (idx >= 0) { cart[idx].quantity += addQty; cart[idx].stock = product.stock; }
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: addQty, stock: product.stock });
    sessionStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    if (addQty === qty) toast.success(`Đã thêm ${addQty} sản phẩm vào giỏ hàng!`);
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.info("Vui lòng đăng nhập."); return; }
    if (!reviewContent.trim()) { toast.error("Vui lòng nhập nội dung đánh giá."); return; }
    setSubmittingReview(true);
    try {
      const fd = new FormData();
      fd.append("customer_id", user.id);
      fd.append("product_id",  id);
      fd.append("rating",      reviewRating);
      fd.append("content",     reviewContent.trim());
      reviewFiles.forEach(f => fd.append("files", f));

      const res  = await fetch(`${API}/review/create/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đánh giá thành công!");
        setShowReviewForm(false); setReviewContent(""); setReviewRating(5); setReviewFiles([]);
        loadReviews();
        fetch(`${API}/product/${id}/detail/`).then(r => r.json()).then(setProduct).catch(() => {});
      } else {
        toast.error(data.error || "Không thể gửi đánh giá.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmittingReview(false); }
  };

  const handleSubmitComment = async () => {
    if (!user) { toast.info("Vui lòng đăng nhập để bình luận."); return; }
    if (!commentText.trim()) { toast.error("Vui lòng nhập nội dung."); return; }
    setSubmittingCmt(true);
    try {
      const fd = new FormData();
      fd.append("customer_id", user.id);
      fd.append("product_id",  id);
      fd.append("content",     commentText.trim());
      commentFiles.forEach(f => fd.append("files", f));

      const res  = await fetch(`${API}/comment/create/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã bình luận!");
        setCommentText(""); setCommentFiles([]);
        loadComments();
      } else {
        toast.error(data.error || "Không thể gửi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmittingCmt(false); }
  };

  const handleReviewReplySuccess = (reviewId, newReply) => {
    setReviews(prev => prev.map(r =>
      r.id === reviewId
        ? { ...r, replies: [...(r.replies || []), newReply] }
        : r
    ));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <Navbar />
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <Navbar />
      <div className="text-center py-32">
        <p className="text-2xl font-black text-slate-400">Sản phẩm không tồn tại.</p>
        <button onClick={() => navigate("/product")} className="mt-4 px-6 py-3 bg-[#2D5A27] text-white rounded-2xl font-bold">Quay lại</button>
      </div>
    </div>
  );

  const avgRating   = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const totalReview = reviews.length;

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <button onClick={() => navigate("/product")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#2D5A27] font-bold mb-8 transition-colors">
          <ChevronLeft size={18} /> Quay lại danh sách
        </button>

        {/* ── GRID SẢN PHẨM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <ImageSlider images={images} />

          <div>
            <div className="mb-4">
              <p className="text-xs font-black uppercase text-[#2D5A27]/60 tracking-widest mb-2">
                {product.brand} · {product.category}
              </p>
              <h1 className="text-3xl font-black text-slate-800 leading-tight">{product.name}</h1>
            </div>

            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Stars value={Math.round(avgRating)} size={18} />
              <span className="text-sm font-black text-slate-600">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-slate-400">({totalReview} đánh giá)</span>
              {product.sold > 0 && <span className="text-sm text-slate-400">· Đã bán {product.sold}</span>}
            </div>

            <div className="bg-gradient-to-r from-[#2D5A27]/5 to-transparent rounded-2xl px-6 py-4 mb-6">
              <span className="text-4xl font-black text-[#2D5A27]">{product.price?.toLocaleString()}đ</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Thương hiệu", value: product.brand || "—" },
                { label: "Danh mục",    value: product.category || "—" },
                { label: "Tồn kho",     value: product.stock > 0 ? `${product.stock} sản phẩm` : "Hết hàng" },
                { label: "Hạn sử dụng", value: product.expiry_date || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {product.stock > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="px-4 py-3 text-slate-600 hover:bg-slate-50 font-black text-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >-</button>
                    <span className="px-5 py-3 font-black text-slate-800 min-w-[50px] text-center">{qty}</span>
                    <button
                      onClick={() => {
                        const inCart = JSON.parse(sessionStorage.getItem("cart") || "[]").find(i => i.id === product.id)?.quantity || 0;
                        setQty(q => Math.min(product.stock - inCart, q + 1));
                      }}
                      disabled={(() => { const inCart = JSON.parse(sessionStorage.getItem("cart") || "[]").find(i => i.id === product.id)?.quantity || 0; return qty >= product.stock - inCart; })()}
                      className="px-4 py-3 text-slate-600 hover:bg-slate-50 font-black text-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >+</button>
                  </div>
                  <span className="text-sm text-slate-400 font-bold">Còn {product.stock} sản phẩm</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 border-2 border-[#2D5A27] text-[#2D5A27] font-black py-4 rounded-2xl hover:bg-[#2D5A27]/5 transition-all">
                    <ShoppingCart size={20} /> Thêm vào giỏ
                  </button>
                  <button onClick={() => { handleAddToCart(); navigate("/cart"); }}
                    className="flex-1 bg-[#2D5A27] text-white font-black py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-lg shadow-[#2D5A27]/30">
                    Mua ngay
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-slate-100 rounded-2xl px-6 py-4 text-center">
                <Package className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="font-black text-slate-500">Sản phẩm tạm hết hàng</p>
              </div>
            )}

            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100">
              {[{ icon: Shield, text: "Hàng chính hãng 100%" }].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <Icon size={16} className="text-[#2D5A27]" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── NỘI DUNG SẢN PHẨM ── */}
        {contentBlocks.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden">
            <div className="flex border-b border-slate-100 px-6 pt-5 gap-1">
              {CONTENT_TABS.map(tab => {
                const count = contentBlocks.filter(b => b._tab === tab.id).length;
                if (count === 0) return null;
                return (
                  <button key={tab.id} onClick={() => setActiveContentTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-black transition-all border-b-2 -mb-px ${
                      activeContentTab === tab.id
                        ? "border-[#2D5A27] text-[#2D5A27] bg-[#2D5A27]/5"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}>
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="p-8">
              {CONTENT_TABS.map(tab => {
                const tabBlocks = contentBlocks.filter(b => b._tab === tab.id);
                if (activeContentTab !== tab.id || tabBlocks.length === 0) return null;
                return (
                  <div key={tab.id} className="space-y-4">
                    {tabBlocks.map((block, i) => <BlockRenderer key={block.id || i} block={block} />)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ĐÁNH GIÁ ── */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Star size={22} className="text-amber-400" fill="#fbbf24" />
              Đánh giá sản phẩm
            </h2>
            {hasBought && !showReviewForm && (
              <button onClick={() => setShowReviewForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl text-sm font-black hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20">
                <Star size={15} /> Viết đánh giá
              </button>
            )}
            {!hasBought && user && (
              <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                <AlertCircle size={13} /> Chỉ khách đã mua mới được đánh giá
              </span>
            )}
          </div>

          {reviews.length > 0 && (
            <RatingSummary reviews={reviews} avgRating={avgRating} totalCount={totalReview} />
          )}

          {showReviewForm && (
            <div className="bg-[#2D5A27]/5 border border-[#2D5A27]/20 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800">Đánh giá của bạn</h3>
                <button onClick={() => { setShowReviewForm(false); setReviewFiles([]); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                  <X size={18} />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm font-bold text-slate-600 mb-2">Chọn số sao</p>
                <StarPicker value={reviewRating} onChange={setReviewRating} />
                <p className="text-xs text-slate-400 mt-1 font-bold">
                  {["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"][reviewRating]}
                </p>
              </div>
              <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..." rows={4}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:border-[#2D5A27] transition mb-3" />
              <div className="mb-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Thêm ảnh / video (tối đa {MAX_MB}MB)
                </p>
                <MediaUploadBox files={reviewFiles} onFilesChange={setReviewFiles} uploading={submittingReview} />
              </div>
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition disabled:opacity-60">
                {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi đánh giá
              </button>
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map(r => (
                <ReviewCard key={r.id} review={r} user={user}
                  onReplySuccess={handleReviewReplySuccess} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Star className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1} />
              <p className="text-slate-400 font-bold">Chưa có đánh giá nào.</p>
              {hasBought && (
                <button onClick={() => setShowReviewForm(true)}
                  className="mt-4 px-6 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition">
                  Hãy là người đầu tiên đánh giá!
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── BÌNH LUẬN ── */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 mb-12">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <MessageCircle size={22} className="text-[#2D5A27]" />
            Bình luận ({comments.length})
          </h2>

          <div className="flex gap-3 mb-6">
            <Avatar src={user?.avatar} name={user?.fullname} size={9} />
            <div className="flex-1">
              <div className="flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && !commentFiles.length && handleSubmitComment()}
                  placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
                  disabled={!user}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition disabled:opacity-60" />
                <button onClick={handleSubmitComment}
                  disabled={!user || submittingCmt || (!commentText.trim() && !commentFiles.length)}
                  className="px-4 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition disabled:opacity-40">
                  {submittingCmt ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              {user && (
                <MediaUploadBox files={commentFiles} onFilesChange={setCommentFiles} uploading={submittingCmt} />
              )}
            </div>
          </div>

          {comments.length > 0 ? (
            <div className="space-y-5">
              {comments.map(c => (
                <CommentCard key={c.id} comment={c} productId={id}
                  user={user} depth={0} onUpdate={loadComments} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <MessageCircle className="mx-auto text-slate-200 mb-3" size={40} strokeWidth={1} />
              <p className="text-slate-400 font-bold text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            </div>
          )}
        </div>

        {/* ── SẢN PHẨM LIÊN QUAN ── */}
        {product.related_products?.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-6">Sản phẩm liên quan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {product.related_products.map(p => (
                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-lg transition-all cursor-pointer">
                  <div className="aspect-square overflow-hidden bg-slate-50">
                    <img src={p.image || "https://via.placeholder.com/300"} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-400 font-bold mb-1">{p.brand}</p>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">{p.name}</h3>
                    <div className="flex items-center gap-2">
                      <Stars value={Math.round(p.rating_avg || 0)} size={11} />
                      <span className="text-[#2D5A27] font-black text-sm">{p.price?.toLocaleString()}đ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}