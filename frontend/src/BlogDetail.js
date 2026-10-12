import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Clock, ArrowLeft, BookOpen, ChevronRight,
  Loader2, AlertCircle, Share2, Check,
} from "lucide-react";
import Navbar from "./Navbar";

const API = "http://localhost:8000/api";

const CAT_COLORS = {
  "Mẹo vặt":   "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Đánh giá":  "bg-blue-50 text-blue-700 border-blue-200",
  "Tin tức":   "bg-amber-50 text-amber-700 border-amber-200",
  "Hướng dẫn": "bg-purple-50 text-purple-700 border-purple-200",
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function stripHtml(html) { return (html || "").replace(/<[^>]*>/g, ""); }

function extractHeadings(blocks) {
  return (blocks || [])
    .filter(b => (b.type === "heading" || b.type === "subheading") && b.text)
    .map(b => ({
      id:    b.id,
      text:  stripHtml(b.text),
      level: b.type === "heading" ? 2 : 3,
      slug:  b.slug || "",
    }));
}

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

// ── Render từng block ──────────────────────────────────
function BlockRenderer({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2
                key={i}
                id={b.slug}
                style={{ textAlign: b.align || "left" }}
                className="text-2xl font-bold text-slate-900 mt-4 scroll-mt-24"
                dangerouslySetInnerHTML={{ __html: b.text }}
              />
            );
          case "subheading":
            return (
              <h3
                key={i}
                id={b.slug}
                style={{ textAlign: b.align || "left" }}
                className="text-lg font-semibold text-slate-800 mt-2 scroll-mt-24"
                dangerouslySetInnerHTML={{ __html: b.text }}
              />
            );
          case "paragraph":
            return (
              <div
                key={i}
                style={{ textAlign: b.align || "left" }}
                className="text-slate-600 leading-relaxed text-[15px] [&_a]:text-[#2D5A27] [&_a]:underline [&_strong]:font-bold [&_strong]:text-slate-800 [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: b.text }}
              />
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-[#2D5A27] pl-5 py-1 italic text-slate-500 text-[15px] bg-[#2D5A27]/5 rounded-r-xl pr-4"
                dangerouslySetInnerHTML={{ __html: b.text }}
              />
            );
          case "list":
            return (
              <ul key={i} className="flex flex-col gap-2 pl-1">
                {(b.items || []).map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-slate-600 text-[15px]">
                    <span className="w-2 h-2 rounded-full bg-[#2D5A27] shrink-0 mt-[7px]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "image":
            return b.url ? (
              <figure key={i} className="my-2">
                <img
                  src={b.url}
                  alt={b.caption || ""}
                  className="w-full rounded-2xl object-cover shadow-sm"
                />
                {b.caption && (
                  <figcaption className="text-xs text-slate-400 text-center mt-2 italic">
                    {b.caption}
                  </figcaption>
                )}
              </figure>
            ) : null;
          case "video":
            if (!b.url) return null;
            const { type, embed } = normalizeVideoUrl(b.url);
            if (type === "youtube" || type === "gdrive") {
              return (
                <div key={i} className="rounded-2xl overflow-hidden aspect-video bg-black shadow-sm">
                  <iframe src={embed} className="w-full h-full" allowFullScreen title={`video-${i}`} />
                </div>
              );
            }
            return <video key={i} src={embed} controls className="w-full rounded-2xl shadow-sm" />;
          case "divider":
            return (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-200" />
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            );
          case "toc": {
            const headings = extractHeadings(blocks);
            if (!headings.length) return null;
            return (
              <nav key={i} className="bg-[#2D5A27]/5 border border-[#2D5A27]/10 rounded-2xl p-6 my-2">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={16} className="text-[#2D5A27]" />
                  <span className="font-bold text-slate-700">{b.title || "Mục lục"}</span>
                </div>
                <ol className="flex flex-col gap-2">
                  {headings.map((h, idx) => (
                    <li
                      key={h.id}
                      style={{ paddingLeft: `${(h.level - 2) * 16}px` }}
                      className="flex items-baseline gap-2"
                    >
                      <span className="text-[#2D5A27]/60 text-xs shrink-0">{idx + 1}.</span>
                      <a
                        href={`#${h.slug}`}
                        className="text-sm text-slate-600 hover:text-[#2D5A27] transition-colors"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

// ── Related card nhỏ ─────────────────────────────────
function RelatedCard({ post }) {
  const navigate = useNavigate();
  const catCls = CAT_COLORS[post.category] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <article
      onClick={() => navigate(`/blog/${post.id}`)}
      className="group cursor-pointer flex gap-3 p-3 rounded-2xl hover:bg-[#2D5A27]/5 transition-all"
    >
      <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        {post.thumbnail
          ? <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={18} className="text-slate-300" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-full border mb-1 ${catCls}`}>
          {post.category}
        </span>
        <p className="text-sm font-bold text-slate-700 line-clamp-2 group-hover:text-[#2D5A27] transition-colors leading-snug">
          {post.title}
        </p>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(post.created_at)}
        </p>
      </div>
    </article>
  );
}

// ── MAIN ─────────────────────────────────────────────
export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post,    setPost]    = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    window.scrollTo({ top: 0 });

    fetch(`${API}/post/${id}/`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(d => {
        if (!d.post) throw new Error("not found");
        setPost(d.post);
        // Lấy bài liên quan cùng danh mục
        return fetch(`${API}/post/list/`);
      })
      .then(r => r.json())
      .then(d => {
        const all = d.posts || [];
        const rel = all
          .filter(p => String(p.id) !== String(id))
          .sort((a, b) => {
            // Ưu tiên cùng danh mục
            const sameA = post?.category === a.category ? 1 : 0;
            const sameB = post?.category === b.category ? 1 : 0;
            return sameB - sameA;
          })
          .slice(0, 4);
        setRelated(rel);
      })
      .catch(e => setError("Không tìm thấy bài viết."))
      .finally(() => setLoading(false));
  }, [id]);

  // Cập nhật related khi post thay đổi
  useEffect(() => {
    if (!post) return;
    fetch(`${API}/post/list/`)
      .then(r => r.json())
      .then(d => {
        const rel = (d.posts || [])
          .filter(p => String(p.id) !== String(id))
          .sort((a, b) => (post.category === b.category ? 1 : 0) - (post.category === a.category ? 1 : 0))
          .slice(0, 4);
        setRelated(rel);
      })
      .catch(() => {});
  }, [post, id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const catCls = post ? (CAT_COLORS[post.category] || "bg-slate-50 text-slate-600 border-slate-200") : "";

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />
      <div className="flex items-center justify-center h-[calc(100vh-72px)]">
        <Loader2 className="animate-spin text-[#2D5A27]" size={40} />
      </div>
    </div>
  );

  if (error || !post) return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] gap-4 text-center px-4">
        <AlertCircle size={48} className="text-slate-300" strokeWidth={1} />
        <h2 className="text-xl font-black text-slate-700">Bài viết không tồn tại</h2>
        <p className="text-slate-400 text-sm">Bài viết này đã bị xóa hoặc chưa được đăng.</p>
        <button
          onClick={() => navigate("/blog")}
          className="px-6 py-3 bg-[#2D5A27] text-white rounded-2xl font-black text-sm hover:bg-[#1f3f1b] transition"
        >
          Quay về Blog
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link to="/" className="hover:text-[#2D5A27] transition">Trang chủ</Link>
          <ChevronRight size={12} />
          <Link to="/blog" className="hover:text-[#2D5A27] transition">Blog</Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 line-clamp-1 max-w-xs">{post.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

        {/* ── CỘT CHÍNH ── */}
        <main>
          <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Thumbnail lớn */}
            {post.thumbnail && (
              <div className="aspect-[2/1] overflow-hidden bg-slate-100">
                <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-8 md:p-12">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border ${catCls}`}>
                  {post.category}
                </span>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={12} />
                  <span>{timeAgo(post.created_at)}</span>
                  <span className="text-slate-200">·</span>
                  <span className="font-medium text-slate-500">{post.author}</span>
                </div>
                <button
                  onClick={handleShare}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    copied
                      ? "bg-green-50 text-green-600 border-green-200"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#2D5A27]/40 hover:text-[#2D5A27]"
                  }`}
                >
                  {copied ? <><Check size={13} /> Đã sao chép!</> : <><Share2 size={13} /> Chia sẻ</>}
                </button>
              </div>

              {/* Tiêu đề */}
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-8">
                {post.title}
              </h1>

              {/* Nội dung blocks */}
              <BlockRenderer blocks={post.blocks || []} />
            </div>

            {/* Footer bài viết */}
            <div className="px-8 md:px-12 pb-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                onClick={() => navigate("/blog")}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2D5A27] transition"
              >
                <ArrowLeft size={16} /> Quay lại Blog
              </button>
              <button
                onClick={handleShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  copied
                    ? "bg-green-50 text-green-600 border-green-200"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#2D5A27] hover:text-[#2D5A27]"
                }`}
              >
                {copied ? <><Check size={15} /> Đã sao chép link!</> : <><Share2 size={15} /> Chia sẻ bài viết</>}
              </button>
            </div>
          </article>
        </main>

        {/* ── CỘT PHẢI: SIDEBAR ── */}
        <aside className="space-y-6 lg:sticky lg:top-24">

          {/* Tác giả */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] font-black text-lg shrink-0">
                {(post.author || "A")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-800">{post.author}</p>
                <p className="text-xs text-slate-400">Tác giả · Luxe Glow</p>
              </div>
            </div>
          </div>

          {/* Bài viết liên quan */}
          {related.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                Có thể bạn quan tâm
              </h3>
              <div className="flex flex-col gap-1">
                {related.map(p => <RelatedCard key={p.id} post={p} />)}
              </div>
            </div>
          )}

          {/* CTA mua sắm */}
          <div className="bg-gradient-to-br from-[#2D5A27] to-[#1a3a16] rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-2">Luxe Glow</p>
            <h4 className="font-black text-lg leading-snug mb-3">Khám phá sản phẩm trong bài</h4>
            <button
              onClick={() => navigate("/product")}
              className="flex items-center gap-2 bg-white text-[#2D5A27] font-black text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition w-full justify-center"
            >
              Mua sắm ngay <ArrowLeft size={14} className="rotate-180" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
