import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, CreditCard, Banknote, ChevronRight, Loader2,
  Plus, Phone, X, Copy, Check, QrCode, ExternalLink, AlertCircle,
} from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

// ─── QR Modal (dùng chung cho MoMo & VNPay) ─────────────────────────────────
function QRModal({ open, onClose, payUrl, method, orderId, total, onConfirmed }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  if (!open) return null;

  const qrSrc = payUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payUrl)}`
    : null;

  const isMomo  = method === "momo";
  const isVnpay = method === "vnpay";

  const accentColor  = isMomo  ? "#ae2070" : "#1a56db";
  const accentLight  = isMomo  ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-blue-50 text-blue-700 border-blue-200";
  const btnClass     = isMomo  ? "bg-[#ae2070] hover:bg-[#8e1a5c]" : "bg-[#1a56db] hover:bg-[#1345b5]";
  const methodLabel  = isMomo  ? "MoMo" : "VNPay";

  const handleCopy = () => {
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenLink = () => {
    window.open(payUrl, "_blank", "noopener");
  };

  const handleConfirmed = async () => {
    setChecking(true);
    // Đợi 1s rồi chuyển trang thành công
    setTimeout(() => {
      setChecking(false);
      onConfirmed?.();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-[modalIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-md p-1 shrink-0">
              {isMomo
                ? <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZcQPC-zWVyFOu9J2OGl0j2D220D49D0Z7BQ&s" alt="MoMo" className="w-full h-full object-contain" />
                : <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPay" className="w-full h-full object-contain" />
              }
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Thanh toán {methodLabel}</p>
              <p className="text-xs text-slate-400 font-medium">Quét mã QR để thanh toán</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2">
          {/* Order info */}
          <div className="flex items-center justify-between mb-4 px-3 py-2.5 bg-slate-50 rounded-xl">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Đơn hàng #{orderId}</span>
            <span className="font-black text-slate-800">{Number(total).toLocaleString()}đ</span>
          </div>

          {/* QR Code */}
          {qrSrc ? (
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
                  style={{ background: accentColor }}
                />
                <div className="relative bg-white p-3 rounded-2xl border-2 shadow-lg"
                  style={{ borderColor: `${accentColor}30` }}>
                  <img
                    src={qrSrc}
                    alt="QR Code"
                    className="w-[180px] h-[180px] rounded-xl"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1">
                <QrCode size={12} /> Mở app {methodLabel} → quét mã → xác nhận
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-300 mb-4">
              <Loader2 className="animate-spin" size={32} />
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">hoặc</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Link actions */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-600 transition"
            >
              {copied ? <><Check size={13} className="text-green-500" /> Đã sao chép</> : <><Copy size={13} /> Sao chép link</>}
            </button>
            <button
              onClick={handleOpenLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 rounded-xl text-xs font-black transition"
              style={{ color: accentColor, borderColor: `${accentColor}30`, background: `${accentColor}08` }}
            >
              <ExternalLink size={13} /> Mở {methodLabel}
            </button>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirmed}
            disabled={checking}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm transition shadow-lg disabled:opacity-60 ${btnClass}`}
            style={{ boxShadow: `0 8px 24px ${accentColor}30` }}
          >
            {checking
              ? <><Loader2 size={16} className="animate-spin" /> Đang xác nhận...</>
              : <><Check size={16} /> Đã thanh toán xong</>
            }
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
            Nhấn sau khi đã hoàn tất thanh toán trên app
          </p>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}

// ─── Main Payment Page ────────────────────────────────────────────────────────
export default function Payment() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [user, setUser]           = useState(null);
  const [cart, setCart]           = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [payMethod, setPayMethod] = useState("cod");
  const [loading, setLoading]     = useState(false);
  const [note, setNote]           = useState("");

  // Form địa chỉ mới — ĐÃ THÊM phone
  const [showNewAddr, setShowNewAddr]   = useState(false);
  const [newAddrForm, setNewAddrForm]   = useState({ name: "", phone: "", address: "" });
  const [newAddrError, setNewAddrError] = useState("");

  // QR Modal state
  const [qrModal, setQrModal] = useState({
    open: false, payUrl: "", method: "", orderId: "", total: 0,
  });

  const voucherData = JSON.parse(sessionStorage.getItem("applied_voucher") || "null");
  const discount    = voucherData?.discount || 0;
  const voucherCode = voucherData?.code || "";

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = 0;
  const total    = Math.max(0, subtotal + shipping - discount);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!u) { navigate("/login"); return; }
    setUser(u);

    const c = JSON.parse(sessionStorage.getItem("cart") || "[]");
    if (c.length === 0) { navigate("/cart"); return; }
    setCart(c);

    fetch(`${API}/customer/${u.id}/addresses/`)
      .then(r => r.json())
      .then(d => {
        const addrs = d.addresses || [];
        setAddresses(addrs);
        if (addrs.length === 0) {
          // Không có địa chỉ đã lưu → mở form nhập mới luôn
          setShowNewAddr(true);
        } else {
          const def = addrs.find(a => a.isDefault) || addrs[0];
          if (def) setSelectedAddr(def);
        }
      })
      .catch(() => {
        // Lỗi fetch → cũng mở form nhập mới
        setShowNewAddr(true);
      });
  }, [navigate]);

  // Validate & build shipping address string
  const buildShippingAddress = () => {
    // Có địa chỉ đã lưu và đang chọn nó (không phải form mới)
    if (selectedAddr && !showNewAddr) {
      const phone = selectedAddr.phone ? ` | ${selectedAddr.phone}` : "";
      return `${selectedAddr.name}${phone} | ${selectedAddr.address}`;
    }
    // Form địa chỉ mới (showNewAddr = true HOẶC không có địa chỉ đã lưu)
    const rawPhone = newAddrForm.phone.trim().replace(/\s/g, "");
    if (!newAddrForm.name.trim()) { setNewAddrError("Vui lòng nhập họ tên người nhận."); return null; }
    if (!rawPhone) { setNewAddrError("Vui lòng nhập số điện thoại."); return null; }
    if (!/^0[0-9]{9}$/.test(rawPhone)) {
      setNewAddrError("Số điện thoại phải đúng 10 chữ số và bắt đầu bằng 0 (VD: 0901234567)."); return null;
    }
    if (!newAddrForm.address.trim()) { setNewAddrError("Vui lòng nhập địa chỉ cụ thể."); return null; }
    setNewAddrError("");
    return `${newAddrForm.name.trim()} | ${rawPhone} | ${newAddrForm.address.trim()}`;
  };

  const clearOrder = () => {
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("applied_voucher");
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleOrder = async () => {
    const shippingAddress = buildShippingAddress();
    if (!shippingAddress) return; // buildShippingAddress tự set error và return null

    setLoading(true);

    try {
      // 1. Tạo đơn hàng
      const orderPayload = {
        customer_id:      user.id,
        items:            cart.map(item => ({
          product_id: item.id,
          quantity:   item.quantity,
          unit_price: item.price,
        })),
        shipping_address: shippingAddress,
        shipping_fee:     shipping,
        voucher_code:     voucherCode || undefined,
        discount_amount:  discount,
        note,
      };

      const res  = await fetch(`${API}/order/create/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(orderPayload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Không thể tạo đơn hàng.");
        return;
      }

      const orderId = data.order_id;

      // 2. Xử lý theo phương thức thanh toán
      if (payMethod === "cod") {
        clearOrder();
        toast.success("Đặt hàng thành công!");
        navigate("/paymentsuccess", { state: { orderId, total } });
        return;
      }

      if (payMethod === "momo") {
        const momoRes  = await fetch(`${API}/payment/momo/create/`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ amount: total, order_id: orderId, note: "Thanh toán Luxe Glow" }),
        });
        const momoData = await momoRes.json();
        const payUrl   = momoData.pay_url || momoData.data?.payUrl || "";

        clearOrder();
        setQrModal({ open: true, payUrl, method: "momo", orderId, total });
        return;
      }

      if (payMethod === "vnpay") {
        const vnRes  = await fetch(`${API}/payment/vnpay/create/`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ amount: total, order_id: orderId, note: "Thanh toán Luxe Glow" }),
        });
        const vnData = await vnRes.json();
        const payUrl = vnData.pay_url || "";

        clearOrder();
        setQrModal({ open: true, payUrl, method: "vnpay", orderId, total });
        return;
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  const handleQRConfirmed = () => {
    setQrModal(q => ({ ...q, open: false }));
    toast.success("Cảm ơn! Đơn hàng đang được xác nhận.");
    navigate("/paymentsuccess", { state: { orderId: qrModal.orderId, total: qrModal.total } });
  };

  if (!user || cart.length === 0) return null;

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />

      {/* QR Modal */}
      <QRModal
        open={qrModal.open}
        onClose={() => setQrModal(q => ({ ...q, open: false }))}
        payUrl={qrModal.payUrl}
        method={qrModal.method}
        orderId={qrModal.orderId}
        total={qrModal.total}
        onConfirmed={handleQRConfirmed}
      />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-slate-800 mb-8">Thanh toán</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* ĐỊA CHỈ */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="font-black text-slate-800 text-lg mb-5 flex items-center gap-2">
                <MapPin size={20} className="text-[#2D5A27]" /> Địa chỉ giao hàng
              </h2>

              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAddr?.id === addr.id && !showNewAddr
                          ? "border-[#2D5A27] bg-[#2D5A27]/5"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddr?.id === addr.id && !showNewAddr}
                        onChange={() => { setSelectedAddr(addr); setShowNewAddr(false); setNewAddrError(""); }}
                        className="mt-0.5 accent-[#2D5A27]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-sm">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-bold">Mặc định</span>
                          )}
                        </div>
                        {addr.phone && (
                          <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
                            <Phone size={12} /> {addr.phone}
                          </p>
                        )}
                        <p className="text-slate-600 text-sm">{addr.address}</p>
                      </div>
                    </label>
                  ))}

                  {/* Địa chỉ khác */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      showNewAddr ? "border-[#2D5A27] bg-[#2D5A27]/5" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={showNewAddr}
                      onChange={() => { setShowNewAddr(true); setSelectedAddr(null); }}
                      className="accent-[#2D5A27]"
                    />
                    <Plus size={16} className="text-slate-500" />
                    <span className="font-bold text-slate-600 text-sm">Sử dụng địa chỉ khác</span>
                  </label>
                </div>
              ) : null}

              {/* Form địa chỉ mới */}
              {(showNewAddr || addresses.length === 0) && (
                <div className={`space-y-3 ${addresses.length > 0 ? "mt-3 pl-0" : ""}`}>
                  {addresses.length === 0 && (
                    <p className="text-slate-500 text-sm mb-3">Nhập thông tin giao hàng:</p>
                  )}

                  {/* Họ tên */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">
                      Họ tên người nhận *
                    </label>
                    <input
                      value={newAddrForm.name}
                      onChange={e => { setNewAddrForm(f => ({ ...f, name: e.target.value })); setNewAddrError(""); }}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition"
                    />
                  </div>

                  {/* SĐT */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">
                      Số điện thoại *
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={newAddrForm.phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setNewAddrForm(f => ({ ...f, phone: val }));
                          setNewAddrError("");
                        }}
                        placeholder="0901234567"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition"
                      />
                    </div>
                  </div>

                  {/* Địa chỉ */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">
                      Địa chỉ cụ thể *
                    </label>
                    <input
                      value={newAddrForm.address}
                      onChange={e => { setNewAddrForm(f => ({ ...f, address: e.target.value })); setNewAddrError(""); }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition"
                    />
                  </div>

                  {/* Validation error */}
                  {newAddrError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                      <AlertCircle size={15} className="shrink-0" /> {newAddrError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="font-black text-slate-800 text-lg mb-5 flex items-center gap-2">
                <CreditCard size={20} className="text-[#2D5A27]" /> Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                {[
                  {
                    id:   "cod",
                    label: "Thanh toán khi nhận hàng (COD)",
                    desc:  "Trả tiền mặt khi nhận hàng",
                    logo:  null,
                    iconComp: <Banknote size={20} className="text-slate-600" />,
                  },
                  {
                    id:    "momo",
                    label: "Ví MoMo",
                    desc:  "Quét mã QR bằng app MoMo",
                    logo:  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZcQPC-zWVyFOu9J2OGl0j2D220D49D0Z7BQ&s",
                    iconComp: null,
                  },
                  {
                    id:    "vnpay",
                    label: "VNPay",
                    desc:  "Quét mã QR qua app ngân hàng / VNPay",
                    logo:  "https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png",
                    iconComp: null,
                  },
                ].map(({ id, label, desc, logo, iconComp }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      payMethod === id
                        ? "border-[#2D5A27] bg-[#2D5A27]/5"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={id}
                      checked={payMethod === id}
                      onChange={() => setPayMethod(id)}
                      className="accent-[#2D5A27]"
                    />
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden p-1">
                      {logo
                        ? <img src={logo} alt={label} className="w-full h-full object-contain" />
                        : iconComp
                      }
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{label}</p>
                      <p className="text-xs text-slate-400 font-medium">{desc}</p>
                    </div>
                    {(id === "momo" || id === "vnpay") && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-black bg-green-50 text-green-600 px-2 py-1 rounded-full border border-green-200">
                        <QrCode size={11} /> QR
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Tóm tắt đơn hàng ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <h2 className="font-black text-slate-800 text-lg mb-5">Đơn hàng của bạn</h2>

              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                      <img
                        src={item.image || "https://via.placeholder.com/50"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-slate-400">x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-black text-[#2D5A27] shrink-0">
                      {(item.price * item.quantity).toLocaleString()}đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm mb-5">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính</span>
                  <span className="font-bold">{subtotal.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Vận chuyển</span>
                  <span className={`font-bold ${shipping === 0 ? "text-green-600" : ""}`}>
                    {shipping === 0 ? "Miễn phí" : `${shipping.toLocaleString()}đ`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Voucher ({voucherCode})</span>
                    <span className="font-bold">-{discount.toLocaleString()}đ</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mb-6">
                <span className="font-black text-slate-800">Tổng cộng</span>
                <span className="font-black text-[#2D5A27] text-2xl">{total.toLocaleString()}đ</span>
              </div>

              <button
                onClick={handleOrder}
                disabled={loading}
                className="w-full bg-[#2D5A27] text-white font-black py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-xl shadow-[#2D5A27]/30 flex items-center justify-center gap-2 disabled:opacity-60 group"
              >
                {loading
                  ? <><Loader2 size={20} className="animate-spin" /> Đang xử lý...</>
                  : <>
                      {payMethod === "cod"
                        ? "Đặt hàng ngay"
                        : `Thanh toán qua ${payMethod === "momo" ? "MoMo" : "VNPay"}`
                      }
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                }
              </button>
              <p className="text-xs text-slate-400 text-center mt-3 font-medium">
                Bằng cách đặt hàng, bạn đồng ý với điều khoản của Luxe Glow
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}