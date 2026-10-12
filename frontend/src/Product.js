import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, ShoppingCart,
  Star, ChevronLeft, ChevronRight, X, Loader2,
} from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";
const PAGE_SIZE = 6;

const PRICE_RANGES = [
  { label: "Tất cả mức giá",       min: "",       max: ""        },
  { label: "Dưới 200.000đ",        min: "",       max: "200000"  },
  { label: "200.000 - 500.000đ",   min: "200000", max: "500000"  },
  { label: "500.000 - 1.000.000đ", min: "500000", max: "1000000" },
  { label: "Trên 1.000.000đ",      min: "1000000",max: ""        },
];

function ProductCard({ product, onAddToCart, onToggleWishlist, wishlisted }) {
  const navigate = useNavigate();
  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#2D5A27]/20 hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative overflow-hidden bg-slate-50 aspect-square">
        <img src={product.image || "https://via.placeholder.com/400x400?text=No+Image"} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Hết hàng</span>
          </div>
        )}
        {product.stock > 0 && (
          <button onClick={e => { e.stopPropagation(); onAddToCart(product); }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#2D5A27] text-white text-xs font-black px-5 py-2 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 whitespace-nowrap shadow-lg flex items-center gap-1.5">
            <ShoppingCart size={14} /> Thêm vào giỏ
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase text-[#2D5A27]/60 tracking-widest mb-1">{product.brand || product.category}</p>
        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-2 group-hover:text-[#2D5A27] transition-colors">{product.name}</h3>
        <div className="flex items-center gap-1 mb-3">
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={12} fill={s <= Math.round(product.rating_avg||0) ? "#f59e0b":"none"} stroke={s <= Math.round(product.rating_avg||0) ? "#f59e0b":"#d1d5db"} />
          ))}
          <span className="text-[10px] text-slate-400 ml-1">({product.rating_count||0})</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#2D5A27] font-black text-lg">{product.price?.toLocaleString()}đ</span>
          {product.sold > 0 && <span className="text-[10px] text-slate-400 font-bold">Đã bán {product.sold}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Product() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast    = useToast();

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlist,   setWishlist]   = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  const initCategory = searchParams.get("category")     || "";
  const initCatName  = searchParams.get("categoryName") || "";
  const initSearch   = searchParams.get("search")       || "";

  const [filters, setFilters] = useState({
    category: initCategory,
    brand:    "",
    search:   initSearch,
    priceIdx: 0,
    sort:     "newest",
  });
  const [searchInput, setSearchInput] = useState(initSearch);

  const activeCatName = filters.category
    ? (categories.find(c => String(c.id) === String(filters.category))?.name || initCatName)
    : "";

  useEffect(() => {
    fetch(`${API}/product/categories/`)
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // Đồng bộ khi URL thay đổi (navigate từ Home)
  useEffect(() => {
    const cat    = searchParams.get("category") || "";
    const search = searchParams.get("search")   || "";
    setFilters(f => ({ ...f, category: cat, search }));
    setSearchInput(search);
    setPage(1);
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const range  = PRICE_RANGES[filters.priceIdx];
      const params = new URLSearchParams({
        page, page_size: PAGE_SIZE, sort: filters.sort,
        ...(filters.category && { category:  filters.category }),
        ...(filters.brand    && { brand:     filters.brand }),
        ...(filters.search   && { search:    filters.search }),
        ...(range.min        && { min_price: range.min }),
        ...(range.max        && { max_price: range.max }),
      });
      const res  = await fetch(`${API}/product/list/?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [filters]);

  const handleCategoryFilter = id => {
    setFilters(f => ({ ...f, category: id }));
    setSearchParams({});
  };

  const handleSearch = e => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput }));
  };

  const handleAddToCart = product => {
    const cart = JSON.parse(sessionStorage.getItem("cart") || "[]");
    const idx  = cart.findIndex(i => i.id === product.id);
    const currentQty = idx >= 0 ? cart[idx].quantity : 0;
    if (currentQty >= product.stock) {
      toast.error(`"${product.name}" đã đạt tối đa tồn kho (${product.stock}).`);
      return;
    }
    if (idx >= 0) { cart[idx].quantity += 1; cart[idx].stock = product.stock; }
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1, stock: product.stock });
    sessionStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const toggleWishlist = id => {
    const isWished = wishlist.includes(id);
    setWishlist(w => isWished ? w.filter(x => x !== id) : [...w, id]);
    toast.info(isWished ? "Đã xóa khỏi danh sách yêu thích." : "Đã thêm vào danh sách yêu thích.");
  };

  const clearFilters = () => {
    setFilters({ category: "", brand: "", search: "", priceIdx: 0, sort: "newest" });
    setSearchInput("");
    setSearchParams({});
  };

  const hasFilters = filters.category || filters.brand || filters.search || filters.priceIdx > 0;

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar onSearch={q => setFilters(f => ({ ...f, search: q }))} />
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-slate-800">Sản phẩm</h1>
              {activeCatName && (
                <><span className="text-slate-400 font-bold">/</span>
                <span className="text-2xl font-black text-[#2D5A27]">{activeCatName}</span></>
              )}
            </div>
            <p className="text-slate-400 text-sm">{total} sản phẩm {filters.search ? `cho "${filters.search}"` : ""}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border transition-all ${showFilter ? "bg-[#2D5A27] text-white border-[#2D5A27]" : "bg-white text-slate-600 border-slate-200 hover:border-[#2D5A27]"}`}>
              <SlidersHorizontal size={18} /> Bộ lọc {hasFilters && <span className="w-2 h-2 bg-orange-400 rounded-full" />}
            </button>
          </div>
        </div>

        {/* Chips danh mục nhanh */}
        {!showFilter && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button onClick={() => handleCategoryFilter("")}
              className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${!filters.category ? "bg-[#2D5A27] text-white border-[#2D5A27]" : "bg-white text-slate-500 border-slate-200 hover:border-[#2D5A27]"}`}>
              Tất cả
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => handleCategoryFilter(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${String(filters.category) === String(cat.id) ? "bg-[#2D5A27] text-white border-[#2D5A27]" : "bg-white text-slate-500 border-slate-200 hover:border-[#2D5A27]"}`}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Bộ lọc đầy đủ */}
        {showFilter && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Danh mục</label>
                <div className="space-y-1.5">
                  <button onClick={() => handleCategoryFilter("")} className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${!filters.category ? "bg-[#2D5A27] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Tất cả</button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => handleCategoryFilter(cat.id)}
                      className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${String(filters.category)===String(cat.id) ? "bg-[#2D5A27] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Khoảng giá</label>
                <div className="space-y-1.5">
                  {PRICE_RANGES.map((r, i) => (
                    <button key={i} onClick={() => setFilters(f => ({ ...f, priceIdx: i }))}
                      className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filters.priceIdx===i ? "bg-[#2D5A27] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sắp xếp</label>
                <div className="space-y-1.5">
                  {[{value:"newest",label:"Mới nhất"},{value:"price_asc",label:"Giá tăng dần"},{value:"price_desc",label:"Giá giảm dần"}].map(s => (
                    <button key={s.value} onClick={() => setFilters(f => ({ ...f, sort: s.value }))}
                      className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${filters.sort===s.value ? "bg-[#2D5A27] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Thương hiệu</label>
                <input value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))} placeholder="Nhập tên thương hiệu..." className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition" />
                {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1 text-red-500 text-xs font-black hover:underline mt-4"><X size={14} /> Xóa bộ lọc</button>}
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-[#2D5A27]" size={48} /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-8xl mb-6">🌿</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Không tìm thấy sản phẩm</h3>
            <p className="text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            <button onClick={clearFilters} className="mt-6 px-6 py-3 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#1f3f1b] transition">Xóa bộ lọc</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} onToggleWishlist={toggleWishlist} wishlisted={wishlist.includes(p.id)} />
            ))}
          </div>
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-[#2D5A27] disabled:opacity-40 transition"><ChevronLeft size={18} /></button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${p===page ? "bg-[#2D5A27] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#2D5A27]"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-[#2D5A27] disabled:opacity-40 transition"><ChevronRight size={18} /></button>
          </div>
        )}
      </div>
    </div>
  );
}