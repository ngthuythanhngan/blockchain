import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, X,
  Loader2, ChevronLeft, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, Sparkles,
} from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

// ─── Helper hiển thị giá trị voucher ────────────────
function discountLabel(v) {
  return v.discount_type === "%"
    ? `Giảm ${v.discount_value}%`
    : `Giảm ${Number(v.discount_value).toLocaleString()}đ`;
}

// ─── Badge trạng thái voucher ─────────────────────────
function VoucherStatusBadge({ v }) {
  if (!v.is_available) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        <AlertCircle size={9} />
        {v.unavailable_reason || "Không khả dụng"}
      </span>
    );
  }
  if (v.status === "scheduled") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <Clock size={9} /> Chưa bắt đầu
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle size={9} /> Khả dụng
    </span>
  );
}

// ─── Danh sách voucher popup ──────────────────────────
function VoucherListPanel({ vouchers, onSelect, onClose, currentCode, subtotal }) {
  const available   = vouchers.filter(v => v.is_available);
  const unavailable = vouchers.filter(v => !v.is_available);
  const [showUnavail, setShowUnavail] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-base">Chọn mã giảm giá</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {available.length} khả dụng · {unavailable.length} không khả dụng
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Voucher khả dụng */}
          {available.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="mx-auto text-slate-200 mb-2" size={36} strokeWidth={1} />
              <p className="text-slate-400 text-sm font-bold">Không có voucher khả dụng</p>
            </div>
          ) : (
            available.map(v => {
              const isActive = v.code === currentCode;
              return (
                <button key={v.id} onClick={() => onSelect(v)}
                  className={`w-full text-left relative rounded-2xl border-2 overflow-hidden transition-all ${
                    isActive
                      ? "border-[#2D5A27] bg-[#2D5A27]/5 shadow-md"
                      : "border-slate-100 hover:border-[#2D5A27]/40 hover:shadow-sm"
                  }`}>
                  {/* Notch decoration */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#f8f7f4]" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-[#f8f7f4]" />

                  <div className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-[#2D5A27] text-base">{discountLabel(v)}</span>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-full">
                              <CheckCircle size={9} /> Đang dùng
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">{v.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg tracking-wider">
                            {v.code}
                          </span>
                          <span className="text-[10px] text-slate-400">HSD: {v.end_date}</span>
                          {v.limit && (
                            <span className="text-[10px] text-slate-400">
                              Còn {v.limit - v.used}/{v.limit} lượt
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Số tiền tiết kiệm */}
                      {subtotal > 0 && v.discount_amount > 0 && (
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-slate-400 font-bold">Tiết kiệm</p>
                          <p className="font-black text-[#2D5A27] text-sm">
                            -{v.discount_amount.toLocaleString()}đ
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* Toggle voucher không khả dụng */}
          {unavailable.length > 0 && (
            <div>
              <button onClick={() => setShowUnavail(v => !v)}
                className="w-full flex items-center justify-between px-2 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition">
                <span>Không khả dụng ({unavailable.length})</span>
                {showUnavail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showUnavail && (
                <div className="space-y-2 mt-1">
                  {unavailable.map(v => (
                    <div key={v.id}
                      className="relative rounded-2xl border-2 border-slate-100 bg-slate-50/50 overflow-hidden opacity-60">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white" />
                      <div className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-black text-slate-500 text-sm">{discountLabel(v)}</span>
                              <VoucherStatusBadge v={v} />
                            </div>
                            <p className="text-xs text-slate-400 font-medium truncate">{v.name}</p>
                            <span className="text-[10px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-lg tracking-wider mt-1 inline-block">
                              {v.code}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN CART
// ═══════════════════════════════════════════════════════
export default function Cart() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [cart,           setCart]           = useState([]);
  const [voucher,        setVoucher]        = useState(null);
  const [discount,       setDiscount]       = useState(0);
  const [voucherCode,    setVoucherCode]    = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [autoApplying,   setAutoApplying]   = useState(false);

  // Danh sách tất cả voucher
  const [allVouchers,    setAllVouchers]    = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showVoucherPanel, setShowVoucherPanel] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("cart") || "[]");
    setCart(stored);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const total    = Math.max(0, subtotal + shipping - discount);

  // Load tất cả voucher khi subtotal thay đổi
  const loadAllVouchers = useCallback(async () => {
    if (subtotal === 0) return;
    setLoadingVouchers(true);
    try {
      const res  = await fetch(`${API}/voucher/all/?cart_total=${subtotal}`);
      const data = await res.json();
      setAllVouchers(data.vouchers || []);
    } catch {}
    finally { setLoadingVouchers(false); }
  }, [subtotal]);

  useEffect(() => { loadAllVouchers(); }, [loadAllVouchers]);

  // Tự động áp voucher tốt nhất khi cart thay đổi (và chưa có voucher)
  const autoApplyBestVoucher = useCallback(async (cartSubtotal) => {
    if (cartSubtotal === 0 || voucher) return;
    setAutoApplying(true);
    try {
      const res  = await fetch(`${API}/voucher/best/?cart_total=${cartSubtotal}`);
      const data = await res.json();
      if (data.voucher && data.discount_amount > 0) {
        setVoucher(data.voucher);
        setDiscount(data.discount_amount);
        setVoucherCode(data.voucher.code);
        toast.success(
          `✨ Tự động áp voucher tốt nhất "${data.voucher.code}" — Tiết kiệm ${Math.round(data.discount_amount).toLocaleString()}đ!`
        );
      }
    } catch {}
    finally { setAutoApplying(false); }
  }, [voucher]);

  useEffect(() => {
    if (cart.length > 0 && !voucher) {
      const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
      autoApplyBestVoucher(sub);
    }
  }, [cart.length]);

  const saveCart = (newCart) => {
    setCart(newCart);
    sessionStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const updateQty = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id !== id) return item;
      const maxQty = item.stock || Infinity; // stock được lưu khi thêm vào giỏ
      const newQty = Math.min(maxQty, Math.max(1, item.quantity + delta));
      if (delta > 0 && newQty === item.quantity) {
        // Đã đạt tối đa, toast cảnh báo
        toast.error(`Số lượng tối đa là ${maxQty} (theo tồn kho).`);
      }
      return { ...item, quantity: newQty };
    });
    saveCart(newCart);
    // Xóa voucher hiện tại để tính lại
    setVoucher(null); setDiscount(0); setVoucherCode("");
  };

  const removeItem = (id) => {
    saveCart(cart.filter(item => item.id !== id));
    setVoucher(null); setDiscount(0); setVoucherCode("");
    toast.info("Đã xóa sản phẩm khỏi giỏ hàng.");
  };

  const clearCart = () => {
    if (window.confirm("Bạn chắc chắn muốn xóa toàn bộ giỏ hàng?")) {
      saveCart([]);
      setVoucher(null); setDiscount(0); setVoucherCode("");
      toast.info("Đã xóa toàn bộ giỏ hàng.");
    }
  };

  // Áp voucher thủ công bằng mã
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { toast.error("Vui lòng nhập mã voucher."); return; }
    setApplyingVoucher(true);
    try {
      const res  = await fetch(`${API}/voucher/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim().toUpperCase(), order_total: subtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoucher(data.voucher);
        setDiscount(data.discount_amount || 0);
        toast.success(`Áp dụng voucher thành công! Giảm ${Math.round(data.discount_amount).toLocaleString()}đ`);
      } else {
        toast.error(data.error || "Mã voucher không hợp lệ.");
        setVoucher(null); setDiscount(0);
      }
    } catch { toast.error("Không thể kết nối server."); }
    finally { setApplyingVoucher(false); }
  };

  // Chọn voucher từ danh sách
  const handleSelectVoucher = async (v) => {
    if (!v.is_available) { toast.error(v.unavailable_reason || "Voucher không khả dụng."); return; }
    setApplyingVoucher(true);
    try {
      const res  = await fetch(`${API}/voucher/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: v.code, order_total: subtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoucher(data.voucher);
        setDiscount(data.discount_amount || 0);
        setVoucherCode(v.code);
        setShowVoucherPanel(false);
        toast.success(`Đã áp dụng "${v.code}" — Giảm ${Math.round(data.discount_amount).toLocaleString()}đ!`);
      } else {
        toast.error(data.error || "Không thể áp dụng voucher.");
      }
    } catch { toast.error("Không thể kết nối server."); }
    finally { setApplyingVoucher(false); }
  };

  const handleRemoveVoucher = () => {
    setVoucher(null); setDiscount(0); setVoucherCode("");
    toast.info("Đã hủy voucher.");
  };

  // Áp voucher tốt nhất thủ công
  const handleAutoApply = async () => {
    setAutoApplying(true);
    try {
      const res  = await fetch(`${API}/voucher/best/?cart_total=${subtotal}`);
      const data = await res.json();
      if (data.voucher && data.discount_amount > 0) {
        setVoucher(data.voucher);
        setDiscount(data.discount_amount);
        setVoucherCode(data.voucher.code);
        toast.success(`Đã áp voucher tốt nhất "${data.voucher.code}" — Tiết kiệm ${Math.round(data.discount_amount).toLocaleString()}đ!`);
      } else {
        toast.info("Không có voucher nào phù hợp với đơn hàng này.");
      }
    } catch { toast.error("Không thể kết nối server."); }
    finally { setAutoApplying(false); }
  };

  const handleCheckout = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!user) { toast.info("Vui lòng đăng nhập để tiếp tục."); navigate("/login"); return; }
    if (cart.length === 0) return;
    if (voucher) sessionStorage.setItem("applied_voucher", JSON.stringify({ code: voucher.code, discount }));
    else sessionStorage.removeItem("applied_voucher");
    navigate("/payment");
  };

  // Voucher tốt nhất khả dụng (để hiển thị gợi ý)
  const bestAvailable = allVouchers.find(v => v.is_available);

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />
      {showVoucherPanel && (
        <VoucherListPanel
          vouchers={allVouchers}
          onSelect={handleSelectVoucher}
          onClose={() => setShowVoucherPanel(false)}
          currentCode={voucher?.code}
          subtotal={subtotal}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Giỏ hàng</h1>
            <p className="text-slate-400 text-sm mt-1">{cart.length} sản phẩm</p>
          </div>
          <button onClick={() => navigate("/product")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#2D5A27] font-bold transition-colors">
            <ChevronLeft size={18} /> Tiếp tục mua sắm
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <ShoppingBag className="text-slate-200 mb-6" size={80} />
            <h2 className="text-2xl font-black text-slate-800 mb-2">Giỏ hàng trống</h2>
            <p className="text-slate-400 mb-8">Hãy khám phá các sản phẩm của chúng tôi!</p>
            <button onClick={() => navigate("/product")}
              className="bg-[#2D5A27] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-lg shadow-[#2D5A27]/30">
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── SẢN PHẨM ── */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-[#2D5A27]/10 transition-all shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 shrink-0 cursor-pointer"
                      onClick={() => navigate(`/product/${item.id}`)}>
                      <img src={item.image || "https://via.placeholder.com/80"} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-[#2D5A27] transition"
                        onClick={() => navigate(`/product/${item.id}`)}>
                        {item.name}
                      </h3>
                      <p className="text-[#2D5A27] font-black text-lg mt-1">{item.price?.toLocaleString()}đ</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                          <button onClick={() => updateQty(item.id, -1)}
                            disabled={item.quantity <= 1}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-black transition disabled:opacity-30 disabled:cursor-not-allowed">
                            <Minus size={14} />
                          </button>
                          <span className="px-4 py-1.5 font-black text-slate-800 text-sm min-w-[36px] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)}
                            disabled={item.stock != null && item.quantity >= item.stock}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-black transition disabled:opacity-30 disabled:cursor-not-allowed">
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-sm font-bold">{(item.price * item.quantity).toLocaleString()}đ</span>
                          <button onClick={() => removeItem(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={clearCart}
                className="text-red-400 text-sm font-bold hover:text-red-600 flex items-center gap-1 transition">
                <Trash2 size={16} /> Xóa tất cả
              </button>
            </div>

            {/* ── TỔNG TIỀN ── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24 space-y-5">
                <h2 className="font-black text-slate-800 text-lg">Tóm tắt đơn hàng</h2>

                {/* ── VOUCHER SECTION ── */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Mã giảm giá</label>

                  {/* Voucher đang dùng — chỉ hiện block này, KHÔNG hiện gì thêm */}
                  {voucher ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag size={15} className="text-green-600" />
                          <div>
                            <span className="font-black text-green-700 text-sm">{voucher.code}</span>
                            <p className="text-[10px] text-green-600 font-bold">{discountLabel(voucher)}</p>
                          </div>
                        </div>
                        <button onClick={handleRemoveVoucher} className="text-green-600 hover:text-green-800 transition">
                          <X size={16} />
                        </button>
                      </div>
                      <button onClick={() => setShowVoucherPanel(true)}
                        className="w-full text-xs font-bold text-[#2D5A27] hover:underline text-center transition">
                        Đổi voucher khác
                      </button>
                    </div>
                  ) : autoApplying ? (
                    /* Đang tự động tìm voucher */
                    <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Loader2 size={14} className="animate-spin text-[#2D5A27]" />
                      <span className="text-xs text-[#2D5A27] font-bold">Đang tìm voucher tốt nhất...</span>
                    </div>
                  ) : (
                    /* Chưa có voucher — hiện input + nút + gợi ý */
                    <div className="space-y-2">
                      {/* Input nhập mã */}
                      <div className="flex gap-2">
                        <div className="flex items-center flex-1 gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus-within:border-[#2D5A27] transition">
                          <Tag size={15} className="text-slate-400 shrink-0" />
                          <input
                            value={voucherCode}
                            onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && handleApplyVoucher()}
                            placeholder="Nhập mã..."
                            className="outline-none text-sm font-bold bg-transparent flex-1 uppercase placeholder:normal-case placeholder:font-normal"
                          />
                        </div>
                        <button onClick={handleApplyVoucher} disabled={applyingVoucher}
                          className="px-3 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#1f3f1b] transition disabled:opacity-60 shrink-0">
                          {applyingVoucher ? <Loader2 size={14} className="animate-spin" /> : "Áp dụng"}
                        </button>
                      </div>

                      {/* Nút tự động + chọn từ danh sách */}
                      <div className="flex gap-2">
                        <button onClick={() => { loadAllVouchers(); setShowVoucherPanel(true); }}
                          disabled={loadingVouchers}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-100 transition disabled:opacity-60">
                          {loadingVouchers
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Tag size={12} />
                          }
                          Xem tất cả
                          {allVouchers.filter(v => v.is_available).length > 0 && (
                            <span className="bg-[#2D5A27] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                              {allVouchers.filter(v => v.is_available).length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Gợi ý voucher tốt nhất */}
                      {bestAvailable && !autoApplying && (
                        <div className="flex items-center justify-between bg-amber-50/80 border border-amber-100 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                            <span className="text-[11px] text-amber-700 font-bold">
                              Dùng <span className="font-black">{bestAvailable.code}</span> giảm{" "}
                              {bestAvailable.discount_amount > 0
                                ? `${Math.round(bestAvailable.discount_amount).toLocaleString()}đ`
                                : discountLabel(bestAvailable)
                              }
                            </span>
                          </div>
                          <button onClick={() => handleSelectVoucher(bestAvailable)}
                            className="text-[10px] font-black text-amber-700 hover:text-amber-900 underline shrink-0 ml-2">
                            Dùng ngay
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chi tiết giá */}
                <div className="space-y-2.5 text-sm border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Tạm tính</span>
                    <span className="font-bold">{subtotal.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá ({voucher?.code})</span>
                      <span className="font-bold">-{Math.round(discount).toLocaleString()}đ</span>
                    </div>
                  )}
                </div>

                {/* Tổng */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black text-slate-800">Tổng cộng</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <p className="text-xs text-slate-400 line-through">{(subtotal + shipping).toLocaleString()}đ</p>
                      )}
                      <span className="font-black text-[#2D5A27] text-xl">{total.toLocaleString()}đ</span>
                    </div>
                  </div>
                  <button onClick={handleCheckout}
                    className="w-full bg-[#2D5A27] text-white font-black py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-xl shadow-[#2D5A27]/30 flex items-center justify-center gap-2 group">
                    Đặt hàng <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}