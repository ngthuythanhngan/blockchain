import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Copy, Check, Loader2, Sparkles, Clock, Zap } from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

function VoucherCard({ voucher }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher.code).then(() => {
      setCopied(true);
      toast.success(`Đã sao chép mã "${voucher.code}"!`);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      toast.error("Không thể sao chép. Vui lòng sao chép thủ công.");
    });
  };

  const isExpiringSoon = () => {
    const end  = new Date(voucher.end_date);
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff > 0;
  };

  const usagePercent = voucher.limit
    ? Math.min(100, (voucher.used / voucher.limit) * 100)
    : null;

  const discountText = voucher.discount_type === "%"
    ? `Giảm ${voucher.discount_value}%`
    : `Giảm ${Number(voucher.discount_value).toLocaleString()}đ`;

  return (
    <div className={`group relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${voucher.status === "expired" ? "opacity-60 border-slate-100" : "border-slate-100 hover:border-[#2D5A27]/20"}`}>
      {/* Notch decoration */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#f8f7f4] z-10"></div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-[#f8f7f4] z-10"></div>
      <div className="absolute left-5 right-5 top-1/2 border-dashed border-t-2 border-slate-100 -translate-y-1/2"></div>

      {/* Top */}
      <div className="px-8 pt-6 pb-4 relative">
        {isExpiringSoon() && (
          <div className="flex items-center gap-1 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full w-fit mb-3">
            <Zap size={11} /> Sắp hết hạn
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-black text-[#2D5A27]">{discountText}</span>
          {voucher.status === "active" && <Sparkles className="text-amber-400" size={22} />}
        </div>
        <p className="text-sm font-medium text-slate-500">{voucher.name}</p>
      </div>

      {/* Bottom */}
      <div className="px-8 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-dashed border-slate-200">
            <Tag size={14} className="text-slate-400" />
            <span className="font-black text-slate-700 tracking-widest text-sm">{voucher.code}</span>
          </div>
          <button
            onClick={handleCopy}
            disabled={voucher.status !== "active"}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all ${
              copied
                ? "bg-green-500 text-white"
                : voucher.status === "active"
                  ? "bg-[#2D5A27] text-white hover:bg-[#1f3f1b]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {copied ? <><Check size={15} /> Đã copy</> : <><Copy size={15} /> Sao chép</>}
          </button>
        </div>

        {usagePercent !== null && (
          <div className="mb-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-[#2D5A27] to-[#4a8c3f] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Đã dùng {voucher.used}/{voucher.limit} lần</p>
          </div>
        )}

        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
          <Clock size={12} />
          {voucher.status === "expired"
            ? "Đã hết hạn"
            : `HSD: ${new Date(voucher.end_date).toLocaleDateString("vi-VN")}`
          }
        </div>
      </div>
    </div>
  );
}

export default function Sale() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("active");

  useEffect(() => {
    const endpoint = tab === "active" ? `${API}/voucher/active/` : `${API}/voucher/list/`;
    setLoading(true);
    fetch(endpoint)
      .then(r => r.json())
      .then(d => { setVouchers(d.vouchers || []); setLoading(false); })
      .catch(() => { setVouchers([]); setLoading(false); });
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#2D5A27] to-[#1a3a16] py-20 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Sparkles size={14} /> Ưu đãi đặc biệt
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">Mã giảm giá</h1>
          <p className="text-white/70 text-lg font-medium">Sao chép và áp dụng khi thanh toán để tiết kiệm hơn!</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          {[
            { id: "active", label: "Đang hoạt động" },
            { id: "all",    label: "Tất cả" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${tab === t.id ? "bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/30" : "bg-white border border-slate-200 text-slate-600 hover:border-[#2D5A27]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-24">
            <Tag className="mx-auto text-slate-200 mb-4" size={64} />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Chưa có mã giảm giá</h3>
            <p className="text-slate-400">Hãy quay lại sau để nhận ưu đãi từ Luxe Glow!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vouchers.map(v => <VoucherCard key={v.id} voucher={v} />)}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-[#2D5A27] rounded-3xl p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          </div>
          <h3 className="text-2xl font-black mb-2 relative z-10">Sẵn sàng mua sắm chưa?</h3>
          <p className="text-white/70 mb-6 relative z-10">Áp dụng mã giảm giá và khám phá hàng trăm sản phẩm cao cấp!</p>
          <button
            onClick={() => navigate("/product")}
            className="relative z-10 bg-white text-[#2D5A27] font-black px-8 py-3.5 rounded-2xl hover:bg-slate-50 transition-all shadow-xl"
          >
            Mua sắm ngay
          </button>
        </div>
      </div>
    </div>
  );
}