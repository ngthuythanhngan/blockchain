import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight, Home, ShoppingBag } from "lucide-react";
import Navbar from "./Navbar";
import { useToast } from "./Toast";

export function PaymentSuccess() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const toast     = useToast();
  const orderId   = state?.orderId || "—";
  const total     = state?.total;

  // Hiển thị toast khi trang load
  useEffect(() => {
    toast.success("Đặt hàng thành công! Đơn hàng đang được xử lý.");
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-['Manrope']">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="bg-white rounded-3xl p-12 max-w-md w-full text-center border border-slate-100 shadow-2xl shadow-slate-200/60">
          {/* Animation icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40"></div>
            <div className="relative w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle className="text-[#2D5A27]" size={48} strokeWidth={2} />
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-800 mb-3">Đặt hàng thành công!</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Cảm ơn bạn đã mua sắm tại Luxe Glow. Đơn hàng của bạn đang được xử lý.
          </p>

          <div className="bg-slate-50 rounded-2xl px-6 py-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Mã đơn hàng</span>
              <span className="font-black text-[#2D5A27]">#{orderId}</span>
            </div>
            {total && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Tổng thanh toán</span>
                <span className="font-black text-slate-800">{total.toLocaleString()}đ</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Trạng thái</span>
              <span className="font-black text-amber-600">Đang xử lý</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/information", { state: { tab: "orders" } })}
              className="w-full flex items-center justify-center gap-2 bg-[#2D5A27] text-white font-black py-4 rounded-2xl hover:bg-[#1f3f1b] transition-all shadow-lg shadow-[#2D5A27]/30 group"
            >
              <ShoppingBag size={20} /> Xem đơn hàng <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition"
            >
              <Home size={20} /> Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;