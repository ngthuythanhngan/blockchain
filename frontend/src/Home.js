import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Facebook, Instagram, Twitter, Loader2, Clock, BookOpen, ArrowRight, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import Navbar from "./Navbar";

const API = "http://localhost:8000/api";

const CAT_COLORS = ["bg-emerald-50","bg-rose-50","bg-blue-50","bg-amber-50","bg-purple-50","bg-teal-50"];
const CAT_IMGS = [
  "https://images.unsplash.com/photo-1555050455-f96634b5cba6?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGxpcHN0aWNrfGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1686831451910-be038fcaa48c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c3VuY3JlYW18ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1630398776959-6ff31b49df55?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1732576711193-bc2b59d5fd2c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8TUFTSyUyMFNLSU5DQVJFfGVufDB8fDB8fHww",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Q0xFQU5TRVJ8ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1535683577427-740aaac4ec25?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHBlcmZ1bWV8ZW58MHx8MHx8fDA%3D",
];

const FooterColumn = ({ title, links }) => (
  <div>
    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">{title}</h4>
    <ul className="space-y-4">
      {links.map((link, i) => (
        <li key={i}>
          <Link to={link.to} className="text-slate-600 text-sm hover:text-[#2D5A27] transition-colors">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const socials = [
  { Icon: Facebook,  href: "#" },
  { Icon: Instagram, href: "#" },
  { Icon: Twitter,   href: "#" },
];

// ─── YouTube IFrame API loader (singleton) ───────────────────
let _ytApiReady = false;
let _ytCallbacks = [];
function loadYouTubeAPI(cb) {
  if (_ytApiReady) { cb(); return; }
  _ytCallbacks.push(cb);
  if (!window._ytApiLoading) {
    window._ytApiLoading = true;
    window.onYouTubeIframeAPIReady = () => {
      _ytApiReady = true;
      _ytCallbacks.forEach(fn => fn());
      _ytCallbacks = [];
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
}

function getVideoType(url = "") {
  if (/youtu\.?be|youtube\.com/.test(url)) return "youtube";
  if (/drive\.google\.com\/file\/d\/.+\/preview/.test(url)) return "gdrive";
  return "direct";
}
function extractYouTubeId(url = "") {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return "";
}

// ─── Video item ───────────────────────────────────────────────
function VideoItem({ item, isActive, onPauseSlider, onVideoEnded }) {
  const videoRef    = useRef(null);
  const ytDivRef    = useRef(null);
  const ytPlayerRef = useRef(null);
  const endedRef    = useRef(onVideoEnded);
  const [muted,   setMuted]   = useState(true);
  const [playing, setPlaying] = useState(false);

  const videoType = getVideoType(item.media_url);
  const videoId   = extractYouTubeId(item.media_url);

  useEffect(() => { endedRef.current = onVideoEnded; }, [onVideoEnded]);

  useEffect(() => {
    if (videoType !== "youtube" || !isActive || !videoId) return;
    loadYouTubeAPI(() => {
      if (ytPlayerRef.current) return;
      const containerId = `yt-player-${item.id || videoId}`;
      const el = document.getElementById(containerId);
      if (!el) return;
      ytPlayerRef.current = new window.YT.Player(el, {
        videoId,
        width:  "100%",
        height: "100%",
        playerVars: {
          autoplay:    1,
          mute:        1,
          controls:    1,
          rel:         0,
          playsinline: 1,
          loop:        0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => { e.target.playVideo(); },
          onStateChange: (e) => { if (e.data === 0) endedRef.current?.(); },
          onError: (e) => { console.warn("[YT] Player error:", e.data); },
        },
      });
    });
    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [isActive, videoId, videoType]); // eslint-disable-line

  useEffect(() => {
    if (isActive) {
      onPauseSlider?.();
    } else {
      if (videoType === "direct" && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setPlaying(false);
      }
      if (videoType === "youtube" && ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      }
    }
  }, [isActive, videoType]); // eslint-disable-line

  useEffect(() => {
    if (videoType !== "direct" || !videoRef.current || !isActive) return;
    videoRef.current.muted = true;
    videoRef.current.play().catch(() => {});
    setPlaying(true);
  }, [isActive, videoType]);

  if (videoType === "youtube") {
    if (!videoId) {
      return (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <p className="text-white/50 text-sm">Không thể xác định video ID</p>
        </div>
      );
    }
    return (
      <div className="relative w-full h-full bg-black">
        <div
          ref={ytDivRef}
          id={`yt-player-${item.id || videoId}`}
          className="w-full h-full"
        />
      </div>
    );
  }
  if (videoType === "gdrive") {
    return (
      <div className="relative w-full h-full">
        <iframe src={isActive ? item.media_url : "about:blank"}
          className="w-full h-full" allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen title="banner-gdrive" style={{ border: "none" }} />
      </div>
    );
  }
  return (
    <div className="relative w-full h-full group">
      <video ref={videoRef} src={item.media_url} muted={muted} playsInline
        className="w-full h-full object-cover"
        onEnded={() => { setPlaying(false); onVideoEnded?.(); }} />
      <button onClick={(e) => { e.stopPropagation(); setMuted(m => { const n = !m; if (videoRef.current) videoRef.current.muted = n; return n; }); }}
        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 opacity-0 group-hover:opacity-100 transition z-10">
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}

// ─── Banner Slider chính ──────────────────────────────────────
function BannerSlider({ banner }) {
  const [current,      setCurrent]      = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [dragStart,    setDragStart]    = useState(null);
  const intervalRef = useRef(null);
  const items = banner?.items || [];
  const total = items.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!banner?.auto_play || total <= 1 || sliderPaused) return;
    intervalRef.current = setInterval(next, banner.interval || 4000);
    return () => clearInterval(intervalRef.current);
  }, [banner, total, next, sliderPaused]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [next, prev]);

  if (!total) return null;

  const handleDragStart = (e) => setDragStart(e.clientX ?? e.touches?.[0]?.clientX ?? null);
  const handleDragEnd   = (e) => {
    if (dragStart == null) return;
    const end  = e.clientX ?? e.changedTouches?.[0]?.clientX ?? dragStart;
    const diff = dragStart - end;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    setDragStart(null);
  };

  return (
    <section className="px-20 py-6 bg-[#f8f7f4]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          {total > 1 && <span className="text-xs text-slate-400 font-medium">{current + 1} / {total}</span>}
        </div>

        <div
          className="relative overflow-hidden rounded-2xl select-none bg-slate-900 shadow-lg"
          style={{ height: 450 }}
          onMouseDown={handleDragStart} onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}
        >
          {items.map((it, idx) => (
            <div key={it.id}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              {it.media_type === "video" ? (
                <VideoItem item={it} isActive={idx === current}
                  onPauseSlider={() => setSliderPaused(true)}
                  onVideoEnded={() => { setSliderPaused(false); setCurrent(c => (c + 1) % total); }}
                />
              ) : it.link_url ? (
                <a href={it.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  <img src={it.media_url} alt={it.caption || `Banner ${idx + 1}`} className="w-full h-full object-cover" draggable={false} />
                </a>
              ) : (
                <img src={it.media_url} alt={it.caption || `Banner ${idx + 1}`} className="w-full h-full object-cover" draggable={false} />
              )}
              {it.caption && (
                <div className="absolute bottom-0 inset-x-0 px-4 pb-10 pt-6 z-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                  <p className="text-white text-sm font-bold drop-shadow line-clamp-2 max-w-[65%] leading-snug">
                    {it.caption}
                  </p>
                </div>
              )}
            </div>
          ))}

          {total > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition focus:outline-none">
                <ChevronLeft size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition focus:outline-none">
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
              {items.map((_, idx) => (
                <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                  className={`rounded-full transition-all focus:outline-none ${idx === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`} />
              ))}
            </div>
          )}

          {total > 1 && (
            <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium pointer-events-none">
              {current + 1} / {total}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [categories,    setCategories]    = useState([]);
  const [featuredIds,   setFeaturedIds]   = useState([]);
  const [catLoading,    setCatLoading]    = useState(true);
  const [featuredProds, setFeaturedProds] = useState([]);
  const [blogs,         setBlogs]         = useState([]);
  const [banner,        setBanner]        = useState(null);

  useEffect(() => {
    fetch(`${API}/banner/list/`)
      .then(r => r.json())
      .then(d => {
        const active = (d.banners || []).find(b => b.is_active && b.items?.length > 0);
        setBanner(active || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/post/list/`)
      .then(r => r.json())
      .then(d => setBlogs(d.posts?.slice(0, 3) || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCatLoading(true);
    Promise.all([
      fetch(`${API}/product/categories/`).then(r => r.json()),
      fetch(`${API}/home/featured-categories/`).then(r => r.json()).catch(() => ({ featured_ids: [] })),
    ]).then(([catData, featData]) => {
      const cats = catData.categories || [];
      setCategories(cats);
      const ids = featData.featured_ids || [];
      // Fallback localStorage nếu backend trống
      const finalIds = ids.length > 0
        ? ids
        : JSON.parse(localStorage.getItem("featured_category_ids") || "[]");
      setFeaturedIds(finalIds);
    }).catch(() => {}).finally(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/home/featured/`)
      .then(r => r.json())
      .then(d => setFeaturedProds(d.products || []))
      .catch(() => {});
  }, []);

  const displayCats = (() => {
    if (categories.length === 0) return [];
    if (featuredIds.length > 0) {
      const picked = featuredIds.map(id => categories.find(c => String(c.id) === String(id))).filter(Boolean);
      if (picked.length > 0) return picked; // Hiển thị tất cả đã chọn
    }
    return categories; // Mặc định hiển thị tất cả danh mục
  })();

  return (
    <div className="bg-[#f8f7f4] font-['Manrope'] min-h-screen text-slate-900">
      <Navbar />

      
      {/* ── HERO: XÁC THỰC MỸ PHẨM ── */}
      <section className="relative flex items-center overflow-hidden bg-white px-6 py-16 sm:px-10 lg:min-h-[650px] lg:px-16 xl:px-24 2xl:px-32">
        {/* Nội dung bên trái */}
        <div className="relative z-10 w-full lg:w-1/2">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full bg-green-50 px-5 py-3 text-sm font-bold text-[#2D5A27]">
            <span className="text-lg">🛡️</span>
            Nền tảng xác thực mỹ phẩm bằng blockchain
          </span>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Mỹ phẩm chính hãng
            <br />
            <span className="text-[#2D5A27]">
              An tâm xác thực
            </span>
          </h1>

          <p className="mb-8 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Kiểm tra thông tin và xác minh tính xác thực của mỹ phẩm
            bằng công nghệ blockchain, hỗ trợ truy xuất nguồn gốc,
            minh bạch dữ liệu và bảo vệ người tiêu dùng.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/product")}
              className="flex items-center gap-3 rounded-full bg-[#2D5A27] px-8 py-4 font-bold text-white transition-all hover:-translate-y-1 hover:bg-[#1F3F1B] hover:shadow-lg"
            >
              Bắt đầu xác minh
              <span className="text-xl">→</span>
            </button>

            <button
              onClick={() => navigate("/blog")}
              className="rounded-full border-2 border-[#287D45] px-8 py-4 font-bold text-[#2D5A27] transition-colors hover:bg-green-50"
            >
              Tìm hiểu thêm
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
            <span>✓ Truy xuất nguồn gốc</span>
            <span>✓ Dữ liệu minh bạch</span>
            <span>✓ Bảo vệ người tiêu dùng</span>
          </div>
        </div>

        {/* Hình mỹ phẩm bên phải, không có ô thông tin màu trắng */}
        <div className="relative mt-12 hidden min-h-[480px] flex-1 items-center justify-center lg:mt-0 lg:flex">
          <div className="absolute right-8 top-10 h-72 w-72 rounded-full bg-green-50 blur-3xl" />

          <img
            src="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85"
            alt="Sản phẩm chăm sóc da"
            className="relative z-10 max-h-[500px] w-full max-w-lg rounded-3xl object-contain"
          />

          <div className="absolute bottom-8 left-0 h-24 w-24 rounded-full bg-[#E5F5E9] blur-2xl" />
        </div>
      </section>

      {/* ── BANNER SLIDER ── */}
      {banner && <BannerSlider banner={banner} />}


      {/* ── SẢN PHẨM NỔI BẬT ── */}
      {featuredProds.length > 0 && (
        <section className="py-10 px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div><h2 className="text-3xl font-bold mb-2">Sản phẩm mới nhất</h2></div>
              <Link to="/product" className="text-[#2D5A27] font-bold border-b-2 border-[#2D5A27] hover:opacity-70 transition-opacity">Xem tất cả</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProds.slice(0, 8).map(p => (
                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="group bg-[#f8f7f4] rounded-2xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-lg transition-all cursor-pointer">
                  <div className="aspect-square overflow-hidden bg-white">
                    <img src={p.image || "https://via.placeholder.com/300"} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase text-[#2D5A27]/60 tracking-widest mb-1">{p.brand}</p>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">{p.name}</h3>
                    <span className="text-[#2D5A27] font-black">{p.price?.toLocaleString()}đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BLOG ── */}
      {blogs.length > 0 && (
        <section className="py-20 px-8 bg-[#f8f7f4]">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <span className="inline-block px-3 py-1 bg-[#2D5A27]/10 text-[#2D5A27] text-xs font-black uppercase tracking-widest rounded-full mb-3">Góc kiến thức</span>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Bài viết mới nhất</h2>
                <p className="text-slate-500">Mẹo làm đẹp, đánh giá sản phẩm và xu hướng skincare</p>
              </div>
              <Link to="/blog" className="flex items-center gap-1.5 text-[#2D5A27] font-bold border-b-2 border-[#2D5A27] hover:opacity-70 transition-opacity">
                Xem tất cả <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map(post => (
                <article key={post.id} onClick={() => navigate(`/blog/${post.id}`)}
                  className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-xl transition-all duration-500 cursor-pointer">
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                    {post.thumbnail
                      ? <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2D5A27]/10 to-[#2D5A27]/5"><BookOpen size={36} className="text-[#2D5A27]/30" /></div>
                    }
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#2D5A27] text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">{post.category}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-800 text-base leading-snug mb-3 line-clamp-2 group-hover:text-[#2D5A27] transition-colors">{post.title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} />
                        <span>{new Date(post.created_at).toLocaleDateString("vi-VN")}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-500">{post.author}</span>
                      </div>
                      <span className="text-[#2D5A27] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"><ArrowRight size={16} /></span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-[#2D5A27]/10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <span className="text-4xl font-extrabold tracking-tighter text-[#2D5A27] mb-6 block">LUXE GLOW</span>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Nền tảng hỗ trợ xác minh tính xác thực của mỹ phẩm bằng công nghệ Blockchain. Góp phần minh bạch thông tin sản phẩm và bảo vệ người tiêu dùng.</p>
              <div className="flex space-x-4">
                {socials.map(({ Icon, href }, i) => (
                  <a key={i} href={href} className="w-10 h-10 rounded-full bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white transition-all"><Icon size={18} /></a>
                ))}
              </div>
            </div>
            <FooterColumn title="Về chúng tôi" links={[{label:"Giới thiệu hệ thống",to:"#"},{label:"Công nghệ Blockchain",to:"#"},{label:"Thông tin sản phẩm",to:"#"}]} />
            <FooterColumn title="Sản phẩm" links={[{label:"Danh sách mỹ phẩm",to:"#"},{label:"Xác minh sản phẩm",to:"#"},{label:"Truy xuất nguồn gốc",to:"#"}]} />
            <FooterColumn title="Hỗ trợ" links={[{label:"Hướng dẫn xác minh",to:"#"},{label:"Câu hỏi thường gặp",to:"#"},{label:"Liên hệ",to:"#"}]} />
          </div>
          <div className="pt-8 border-t border-[#2D5A27]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          </div>
        </div>
      </footer>
    </div>
  );
}