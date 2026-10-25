import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, BookOpen, ArrowRight, Search, X, Loader2 } from "lucide-react";
import Navbar from "./Navbar";

const API = "http://localhost:8000/api";

const CATEGORIES = ["Tất cả", "Công nghệ", "Kiến thức", "Tin tức", "Hướng dẫn"];

const CAT_COLORS = {
  "Công nghệ":   "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Kiến thức":  "bg-blue-50 text-blue-700 border-blue-200",
  "Tin tức":   "bg-amber-50 text-amber-700 border-amber-200",
  "Hướng dẫn": "bg-purple-50 text-purple-700 border-purple-200",
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function PostCard({ post, featured = false }) {
  const navigate = useNavigate();
  const catCls = CAT_COLORS[post.category] || "bg-slate-50 text-slate-600 border-slate-200";

  if (featured) {
    return (
      <article
        onClick={() => navigate(`/blog/${post.id}`)}
        className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row"
      >
        {/* Thumbnail lớn */}
        <div className="md:w-1/2 aspect-[4/3] md:aspect-auto overflow-hidden bg-slate-100 relative shrink-0">
          {post.thumbnail ? (
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2D5A27]/10 to-[#2D5A27]/5">
              <BookOpen size={56} className="text-[#2D5A27]/20" />
            </div>
          )}
          <span className={`absolute top-4 left-4 px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border ${catCls}`}>
            {post.category}
          </span>
        </div>

        {/* Nội dung */}
        <div className="flex-1 p-8 flex flex-col justify-center">
          <span className="text-xs font-black uppercase tracking-widest text-[#2D5A27]/60 mb-3">
            Bài viết nổi bật
          </span>
          <h2 className="text-2xl font-bold text-slate-900 leading-snug mb-4 group-hover:text-[#2D5A27] transition-colors line-clamp-3">
            {post.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-slate-400 mt-auto pt-6 border-t border-slate-100">
            <div className="w-8 h-8 rounded-full bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] text-xs font-black shrink-0">
              {(post.author || "A")[0].toUpperCase()}
            </div>
            <span className="font-medium text-slate-600">{post.author}</span>
            <span className="text-slate-300">·</span>
            <Clock size={13} />
            <span>{timeAgo(post.created_at)}</span>
            <span className="ml-auto flex items-center gap-1 text-[#2D5A27] font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
              Đọc ngay <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={() => navigate(`/blog/${post.id}`)}
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-lg transition-all duration-500 flex flex-col"
    >
      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2D5A27]/10 to-[#2D5A27]/5">
            <BookOpen size={32} className="text-[#2D5A27]/20" />
          </div>
        )}
        <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${catCls}`}>
          {post.category}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-slate-800 leading-snug mb-3 line-clamp-2 group-hover:text-[#2D5A27] transition-colors">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">
          <div className="w-6 h-6 rounded-full bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] text-[10px] font-black shrink-0">
            {(post.author || "A")[0].toUpperCase()}
          </div>
          <span className="font-medium text-slate-500">{post.author}</span>
          <span className="text-slate-200">·</span>
          <Clock size={11} />
          <span>{timeAgo(post.created_at)}</span>
          <ArrowRight size={14} className="ml-auto text-[#2D5A27] opacity-0 group-hover:opacity-100 transition" />
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState(searchParams.get("q") || "");
  const [cat,     setCat]     = useState(searchParams.get("cat") || "Tất cả");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/post/list/`)
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  // Lọc client-side
  const filtered = posts.filter(p => {
    const matchCat = cat === "Tất cả" || p.category === cat;
    const matchQ   = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const featured  = filtered[0];
  const rest      = filtered.slice(1);

  const handleCat = (c) => {
    setCat(c);
    setSearchParams(prev => { c === "Tất cả" ? prev.delete("cat") : prev.set("cat", c); return prev; });
  };

  const handleSearch = (val) => {
    setSearch(val);
    setSearchParams(prev => { val ? prev.set("q", val) : prev.delete("q"); return prev; });
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1a3a16] py-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <BookOpen size={14} /> Góc kiến thức
          </div>
          <h1 className="text-5xl font-black text-white mb-4">Blog & Bài viết</h1>
          <p className="text-white/70 text-lg mb-10">
            Cập nhật kiến thức về Blockchain, cách xác minh mỹ phẩm chính hãng và truy xuất thông tin nguồn gốc sản phẩm.
          </p>
          {/* Search bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full pl-12 pr-10 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/40 transition text-sm font-medium"
            />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-10">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => handleCat(c)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all border ${
                cat === c
                  ? "bg-[#2D5A27] text-white border-[#2D5A27] shadow-lg shadow-[#2D5A27]/20"
                  : "bg-white text-slate-500 border-slate-200 hover:border-[#2D5A27]/40 hover:text-[#2D5A27]"
              }`}
            >
              {c}
              <span className="ml-2 text-[10px] opacity-60">
                {c === "Tất cả"
                  ? posts.length
                  : posts.filter(p => p.category === c).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-[#2D5A27]" size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32">
            <BookOpen className="mx-auto text-slate-200 mb-4" size={64} strokeWidth={1} />
            <h3 className="text-xl font-black text-slate-700 mb-2">
              {search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có bài viết nào"}
            </h3>
            <p className="text-slate-400">
              {search
                ? "Thử tìm kiếm với từ khóa khác."
                : "Hãy quay lại sau nhé!"}
            </p>
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="mt-6 px-6 py-3 bg-[#2D5A27] text-white rounded-2xl font-black text-sm hover:bg-[#1f3f1b] transition"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured — bài đầu tiên to */}
            {featured && !search && (
              <div className="mb-10">
                <PostCard post={featured} featured />
              </div>
            )}

            {/* Grid các bài còn lại */}
            {(search ? filtered : rest).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(search ? filtered : rest).map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer CTA */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white border-t border-slate-100 py-16 px-4 text-center">
          <h3 className="text-xl font-black text-slate-800 mb-2">Muốn mua sản phẩm đã đọc?</h3>
          <p className="text-slate-400 mb-6 text-sm">Khám phá ngay bộ sưu tập mỹ phẩm thiên nhiên tại Luxe Glow</p>
          <button
            onClick={() => navigate("/product")}
            className="px-8 py-3.5 bg-[#2D5A27] text-white rounded-2xl font-black text-sm hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20"
          >
            Xem sản phẩm
          </button>
        </div>
      )}
    </div>
  );
}
