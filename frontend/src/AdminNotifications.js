import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";
import {
  Bell, Star, MessageCircle, Send, X, Loader2,
  RefreshCw, CheckCircle, Clock, ImagePlus, Play,
  ChevronDown, ChevronUp, Filter, Package,
} from "lucide-react";

const API = "http://localhost:8000/api";
const MAX_MB = 100;

// ─── Helpers ──────────────────────────────────────────
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

function Stars({ value, size = 13 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          fill={s <= value ? "#f59e0b" : "none"}
          stroke={s <= value ? "#f59e0b" : "#cbd5e1"} />
      ))}
    </div>
  );
}

// ─── Upload box nhỏ gọn ───────────────────────────────
function MediaBox({ files, onChange, disabled }) {
  const ref = useRef();
  return (
    <div className="flex flex-wrap gap-2 items-center mt-2">
      <button type="button" disabled={disabled}
        onClick={() => ref.current?.click()}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold transition disabled:opacity-50">
        <ImagePlus size={13} /> Thêm media
      </button>
      {files.map((f, i) => {
        const isVideo = f.type.startsWith("video/");
        return (
          <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group">
            {isVideo
              ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={11} className="text-white" /></div>
              : <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
            }
            <button onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute top-0 right-0 w-4 h-4 bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition rounded-bl-lg">
              <X size={8} />
            </button>
          </div>
        );
      })}
      {files.length > 0 && (
        <span className="text-[10px] text-slate-400 font-bold">
          {totalMB(files).toFixed(1)}MB / {MAX_MB}MB
        </span>
      )}
      <input ref={ref} type="file" multiple accept="image/*,video/*" className="hidden"
        onChange={e => {
          const picked = Array.from(e.target.files || []);
          const combined = [...files, ...picked];
          if (totalMB(combined) > MAX_MB) { alert(`Tổng vượt ${MAX_MB}MB!`); return; }
          onChange(combined);
          e.target.value = "";
        }} />
    </div>
  );
}

// ─── Reply Form ───────────────────────────────────────
function ReplyForm({ onSubmit, submitting }) {
  const [text,  setText]  = useState("");
  const [files, setFiles] = useState([]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await onSubmit(text.trim(), files);
    setText(""); setFiles([]);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-[#ec5b13] flex items-center justify-center shrink-0">
          <span className="text-white text-[9px] font-black">LG</span>
        </div>
        <span className="text-xs font-black text-[#ec5b13]">LUXE GLOW</span>
        <span className="text-[10px] text-slate-400">· phản hồi với tư cách thương hiệu</span>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Nhập phản hồi từ LUXE GLOW..."
        rows={2}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#ec5b13] transition"
      />
      <div className="flex items-center justify-between mt-1">
        <MediaBox files={files} onChange={setFiles} disabled={submitting} />
        <button onClick={handleSend} disabled={submitting || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-xs font-black hover:bg-[#d44e0f] transition disabled:opacity-50 shrink-0 ml-2">
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Gửi
        </button>
      </div>
    </div>
  );
}

// ─── Existing Replies ─────────────────────────────────
function ExistingReplies({ replies, onDelete }) {
  if (!replies?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {replies.map(rep => (
        <div key={rep.id} className="flex gap-2 bg-[#ec5b13]/5 border border-[#ec5b13]/15 rounded-xl px-3 py-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#ec5b13] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-white text-[9px] font-black">LG</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-black text-[#ec5b13]">LUXE GLOW</span>
              <span className="text-[10px] text-slate-400">{timeAgo(rep.created_at)}</span>
              {onDelete && (
                <button onClick={() => onDelete(rep.id)}
                  className="ml-auto text-[10px] text-slate-400 hover:text-red-500 font-bold transition">
                  Xóa
                </button>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{rep.content}</p>
            {rep.media?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {rep.media.map((m, i) => (
                  <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                    onClick={() => window.open(m.url, "_blank")}>
                    {m.type === "video"
                      ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={11} className="text-white" /></div>
                      : <img src={m.url} alt="" className="w-full h-full object-cover" />
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Review Card (admin view) ─────────────────────────
function ReviewItem({ review, admin, onRefresh }) {
  const toast = useToast();
  const [expanded,   setExpanded]   = useState(!review.replies?.length);
  const [submitting, setSubmitting] = useState(false);
  const [replies,    setReplies]    = useState(review.replies || []);

  const handleReply = async (content, files) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("review_id", review.id);
      fd.append("admin_id",  admin?.maadmin || admin?.id || "");
      fd.append("content",   content);
      files.forEach(f => fd.append("files", f));
      const res  = await fetch(`${API}/admin/reply/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã phản hồi!");
        setReplies(prev => [...prev, data.reply]);
        onRefresh && onRefresh();
      } else {
        toast.error(data.error || "Không thể gửi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm("Xóa phản hồi này?")) return;
    try {
      const res = await fetch(`${API}/admin/reply/delete/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_id: replyId }),
      });
      if (res.ok) {
        toast.success("Đã xóa phản hồi.");
        setReplies(prev => prev.filter(r => r.id !== replyId));
        onRefresh && onRefresh();
      } else toast.error("Không thể xóa.");
    } catch { toast.error("Lỗi kết nối."); }
  };

  const isPending = replies.length === 0;

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isPending ? "border-amber-200 shadow-sm shadow-amber-50" : "border-slate-100"}`}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[#ec5b13] text-sm shrink-0 overflow-hidden">
          {review.customer_avatar
            ? <img src={review.customer_avatar} alt="" className="w-full h-full object-cover" />
            : review.customer_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-sm">{review.customer_name}</span>
            <Stars value={review.rating} />
            <span className="text-[10px] text-slate-400">{timeAgo(review.date)}</span>
            {/* Trạng thái */}
            {isPending
              ? <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock size={10} /> Chờ phản hồi
                </span>
              : <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <CheckCircle size={10} /> Đã phản hồi
                </span>
            }
          </div>
          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{review.content}</p>
          {review.media?.length > 0 && (
            <span className="text-[10px] text-slate-400 font-bold">{review.media.length} ảnh/video</span>
          )}
        </div>
        <div className="shrink-0 text-slate-300">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-50">
          {/* Media */}
          {review.media?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 mb-3">
              {review.media.map((m, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 cursor-pointer"
                  onClick={() => window.open(m.url, "_blank")}>
                  {m.type === "video"
                    ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={14} className="text-white" /></div>
                    : <img src={m.url} alt="" className="w-full h-full object-cover" />
                  }
                </div>
              ))}
            </div>
          )}

          {/* Existing replies */}
          <ExistingReplies replies={replies} onDelete={handleDeleteReply} />

          {/* Reply form */}
          <ReplyForm onSubmit={handleReply} submitting={submitting} />
        </div>
      )}
    </div>
  );
}

// ─── Comment Card (admin view) ────────────────────────
function CommentItem({ comment, admin, onRefresh }) {
  const toast = useToast();
  const [expanded,   setExpanded]   = useState(!comment.has_admin_reply);
  const [submitting, setSubmitting] = useState(false);
  const [replies,    setReplies]    = useState(comment.admin_replies || []);

  const handleReply = async (content, files) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("comment_id", comment.id);
      fd.append("admin_id",   admin?.maadmin || admin?.id || "");
      fd.append("content",    content);
      files.forEach(f => fd.append("files", f));
      const res  = await fetch(`${API}/comment/admin-reply/`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        toast.success("Đã phản hồi!");
        setReplies(prev => [...prev, data.reply]);
        onRefresh && onRefresh();
      } else {
        toast.error(data.error || "Không thể gửi.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm("Xóa phản hồi này?")) return;
    try {
      const res = await fetch(`${API}/comment/delete/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: replyId }),
      });
      if (res.ok) {
        toast.success("Đã xóa.");
        setReplies(prev => prev.filter(r => r.id !== replyId));
        onRefresh && onRefresh();
      } else toast.error("Không thể xóa.");
    } catch { toast.error("Lỗi kết nối."); }
  };

  const isPending = replies.length === 0;

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isPending ? "border-amber-200 shadow-sm shadow-amber-50" : "border-slate-100"}`}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[#ec5b13] text-sm shrink-0 overflow-hidden">
          {comment.customer_avatar
            ? <img src={comment.customer_avatar} alt="" className="w-full h-full object-cover" />
            : comment.customer_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-sm">{comment.customer_name}</span>
            <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
            {/* Trạng thái */}
            {isPending
              ? <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock size={10} /> Chờ phản hồi
                </span>
              : <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <CheckCircle size={10} /> Đã phản hồi
                </span>
            }
          </div>
          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{comment.content}</p>
          {/* Sản phẩm */}
          <div className="flex items-center gap-1.5 mt-1">
            {comment.product_image
              ? <img src={comment.product_image} alt="" className="w-5 h-5 rounded-md object-cover border border-slate-100" />
              : <Package size={12} className="text-slate-400" />
            }
            <span className="text-[10px] text-slate-400 font-bold truncate">{comment.product_name}</span>
            {comment.reply_count > 0 && (
              <span className="text-[10px] text-slate-400">· {comment.reply_count} trả lời</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-slate-300">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-50">
          {/* Media */}
          {comment.media?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 mb-3">
              {comment.media.map((m, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 cursor-pointer"
                  onClick={() => window.open(m.url, "_blank")}>
                  {m.type === "video"
                    ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><Play size={14} className="text-white" /></div>
                    : <img src={m.url} alt="" className="w-full h-full object-cover" />
                  }
                </div>
              ))}
            </div>
          )}

          {/* Existing replies */}
          <ExistingReplies replies={replies} onDelete={handleDeleteReply} />

          {/* Reply form */}
          <ReplyForm onSubmit={handleReply} submitting={submitting} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function AdminNotifications() {
  const navigate = useNavigate();
  const toast    = useToast();

  const admin = JSON.parse(sessionStorage.getItem("admin") || "null");

  const [tab,           setTab]           = useState("reviews");   // "reviews" | "comments"
  const [filterPending, setFilterPending] = useState(false);       // chỉ hiện chưa xử lý
  const [reviews,       setReviews]       = useState([]);
  const [comments,      setComments]      = useState([]);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshKey,    setRefreshKey]    = useState(0);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!admin) navigate("/admin", { replace: true });
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/admin/notifications/`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {}
  }, []);

  // Load reviews
  const loadReviews = useCallback(async () => {
    try {
      const url = `${API}/admin/reviews/${filterPending ? "?pending=1" : ""}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (res.ok) setReviews(data.reviews || []);
    } catch {}
  }, [filterPending]);

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      const url = `${API}/admin/comments/${filterPending ? "?pending=1" : ""}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (res.ok) setComments(data.comments || []);
    } catch {}
  }, [filterPending]);

  // Load tất cả
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadReviews(), loadComments()]);
    setLoading(false);
  }, [loadStats, loadReviews, loadComments]);

  useEffect(() => { loadAll(); }, [loadAll, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    toast.info("Đang làm mới dữ liệu...");
  };

  const currentList = tab === "reviews" ? reviews : comments;

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Bell size={28} className="text-[#ec5b13]" />
              Thông báo & Phản hồi
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý đánh giá và bình luận từ khách hàng · Phản hồi với tư cách <span className="font-black text-[#ec5b13]">LUXE GLOW</span>
            </p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#ec5b13] hover:text-[#ec5b13] transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Đánh giá chờ xử lý",
              value: stats?.pending_reviews ?? "—",
              icon:  Star,
              color: "bg-amber-500",
              urgent: stats?.pending_reviews > 0,
            },
            {
              label: "Bình luận chờ xử lý",
              value: stats?.pending_comments ?? "—",
              icon:  MessageCircle,
              color: "bg-blue-500",
              urgent: stats?.pending_comments > 0,
            },
            {
              label: "Tổng đánh giá",
              value: stats?.total_reviews ?? "—",
              icon:  Star,
              color: "bg-slate-400",
            },
            {
              label: "Tổng bình luận",
              value: stats?.total_comments ?? "—",
              icon:  MessageCircle,
              color: "bg-slate-400",
            },
          ].map(({ label, value, icon: Icon, color, urgent }) => (
            <div key={label}
              className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 transition-all ${urgent ? "border-amber-200 shadow-amber-100" : "border-slate-100"}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color} relative`}>
                <Icon size={20} className="text-white" />
                {urgent && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px] font-black">{value}</span>
                  </div>
                )}
              </div>
              <div>
                <p className={`text-2xl font-black ${urgent ? "text-amber-600" : "text-slate-800"}`}>{value}</p>
                <p className="text-xs text-slate-400 font-medium leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Filter */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setTab("reviews")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === "reviews"
                  ? "bg-[#ec5b13] text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50"
              }`}>
              <Star size={15} /> Đánh giá
              {stats?.pending_reviews > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === "reviews" ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                  {stats.pending_reviews}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("comments")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === "comments"
                  ? "bg-[#ec5b13] text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50"
              }`}>
              <MessageCircle size={15} /> Bình luận
              {stats?.pending_comments > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === "comments" ? "bg-white/30 text-white" : "bg-blue-100 text-blue-700"}`}>
                  {stats.pending_comments}
                </span>
              )}
            </button>
          </div>

          {/* Filter pending */}
          <button
            onClick={() => setFilterPending(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              filterPending
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}>
            <Filter size={14} />
            {filterPending ? "Chỉ hiện chưa xử lý" : "Tất cả"}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-[#ec5b13]" size={36} />
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-100 text-center">
            {tab === "reviews"
              ? <Star className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1} />
              : <MessageCircle className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1} />
            }
            <p className="font-black text-slate-700 text-lg mb-1">
              {filterPending ? "Tuyệt vời! Không còn mục nào chờ xử lý." : "Chưa có dữ liệu."}
            </p>
            <p className="text-slate-400 text-sm">
              {filterPending && (
                <button onClick={() => setFilterPending(false)} className="text-[#ec5b13] font-bold hover:underline">
                  Xem tất cả →
                </button>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tab === "reviews"
              ? reviews.map(r => (
                  <ReviewItem key={r.id} review={r} admin={admin}
                    onRefresh={() => { loadStats(); loadReviews(); }} />
                ))
              : comments.map(c => (
                  <CommentItem key={c.id} comment={c} admin={admin}
                    onRefresh={() => { loadStats(); loadComments(); }} />
                ))
            }
          </div>
        )}
      </main>
    </div>
  );
}