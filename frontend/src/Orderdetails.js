import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import {
  Package, ChevronLeft, User, MapPin, Phone, Mail,
  CreditCard, Truck, Printer, Loader2, AlertCircle,
} from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    fetch(`${API}/admin/orders/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error("Không tìm thấy đơn hàng");
        return res.json();
      })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(err => { setError(err.message || "Không thể tải đơn hàng"); setLoading(false); });
  }, [id]);

  const handlePrint = () => {
    const printContent = document.getElementById("print-area");
    if (!printContent) { window.print(); return; }
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Hóa đơn #${order.id}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
            body { padding: 32px; color: #1e293b; font-size: 14px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #ec5b13; padding-bottom: 16px; }
            .brand { font-size: 22px; font-weight: 900; color: #ec5b13; letter-spacing: -0.5px; }
            .invoice-title { font-size: 13px; color: #64748b; margin-top: 4px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .info-item label { font-size: 11px; color: #94a3b8; display: block; }
            .info-item span { font-weight: 600; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .text-right { text-align: right; }
            .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
            .totals table { width: 280px; }
            .totals td { border: none; padding: 6px 12px; }
            .total-final { font-size: 16px; font-weight: 900; color: #ec5b13; border-top: 2px solid #ec5b13; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
            .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res  = await fetch(`${API}/order/update-status/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ order_id: order.id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(prev => ({ ...prev, status: data.order.status, raw_status: data.order.raw_status }));
        toast.success(`Đã cập nhật trạng thái thành "${newStatus}".`);
      } else {
        toast.error("Không thể cập nhật trạng thái.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen bg-[#F7F8F7] font-display">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#ec5b13]" />
      </main>
    </div>
  );

  if (error || !order) return (
    <div className="flex h-screen bg-[#F7F8F7] font-display">
      <AdminSidebar />
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <p className="font-bold text-slate-600">{error || "Đơn hàng không tồn tại"}</p>
        <button
          onClick={() => navigate("/admin/orders")}
          className="px-6 py-3 bg-[#ec5b13] text-white rounded-2xl font-black text-sm hover:bg-[#d44d0f] transition-all"
        >
          Quay lại danh sách
        </button>
      </main>
    </div>
  );

  const items    = order.items || [];
  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const discount = Number(order.discount) || 0;
  const total    = Number(order.total) || 0;
  const shipping = Math.max(0, total - subtotal + discount);

  const parseAddress = (addr) => {
    if (!addr) return { name: order.customer_name, phone: order.customer_phone || "—", address: "—" };
    const parts = addr.split(" | ");
    if (parts.length >= 3) return { name: parts[0], phone: parts[1], address: parts.slice(2).join(" | ") };
    return { name: order.customer_name, phone: order.customer_phone || "—", address: addr };
  };
  const addrParsed = parseAddress(order.shipping_address);
  const canConfirm = order.status === "Đang giao" || order.status === "Đang xử lý";

  return (
    <div className="flex h-screen bg-[#F7F8F7] font-display text-slate-900 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="bg-white border-b h-20 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Chi tiết đơn hàng #{order.id}</h1>
              <p className="text-xs text-slate-400 font-medium">
                {order.date ? new Date(order.date).toLocaleString("vi-VN") : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[11px] uppercase hover:bg-slate-50 transition-all"
          >
            <Printer size={16} /> In hóa đơn
          </button>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Vùng nội dung in hóa đơn (ẩn trên UI, chỉ dùng khi in) */}
          <div id="print-area" style={{ display: "none" }}>
            <div className="header">
              <div>
                <div className="brand">LUXE GLOW</div>
                <div className="invoice-title">Hóa đơn bán hàng</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Đơn #{order.id}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {order.date ? new Date(order.date).toLocaleString("vi-VN") : ""}
                </div>
              </div>
            </div>
            <div className="info-grid section">
              <div className="info-item">
                <label>Khách hàng</label>
                <span>{order.customer_name || "—"}</span>
              </div>
              <div className="info-item">
                <label>Điện thoại</label>
                <span>{order.customer_phone || "—"}</span>
              </div>
              <div className="info-item">
                <label>Email</label>
                <span>{order.customer_email || "—"}</span>
              </div>
              <div className="info-item">
                <label>Địa chỉ giao hàng</label>
                <span>{order.shipping_address || "—"}</span>
              </div>
              <div className="info-item">
                <label>Trạng thái</label>
                <span>{order.status}</span>
              </div>
              {order.voucher_code && (
                <div className="info-item">
                  <label>Voucher</label>
                  <span>{order.voucher_code}</span>
                </div>
              )}
            </div>
            <div className="section">
              <div className="section-title">Sản phẩm</div>
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th className="text-right">Đơn giá</th>
                    <th className="text-right">SL</th>
                    <th className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name}</td>
                      <td className="text-right">{Number(item.unit_price).toLocaleString()}đ</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{Number(item.subtotal).toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="totals">
              <table>
                <tbody>
                  <tr>
                    <td>Tạm tính</td>
                    <td className="text-right">{(order.items || []).reduce((s, i) => s + i.unit_price * i.quantity, 0).toLocaleString()}đ</td>
                  </tr>
                  {Number(order.discount) > 0 && (
                    <tr>
                      <td>Giảm giá {order.voucher_code ? `(${order.voucher_code})` : ""}</td>
                      <td className="text-right" style={{ color: "#16a34a" }}>-{Number(order.discount).toLocaleString()}đ</td>
                    </tr>
                  )}
                  <tr className="total-final">
                    <td style={{ fontWeight: 900 }}>TỔNG THANH TOÁN</td>
                    <td className="text-right" style={{ fontWeight: 900 }}>{Number(order.total).toLocaleString()}đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="footer">
              <p>Cảm ơn quý khách đã mua sắm tại Luxe Glow!</p>
              <p style={{ marginTop: 4 }}>Mọi thắc mắc vui lòng liên hệ hotline hoặc email hỗ trợ.</p>
            </div>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">

            {/* CỘT TRÁI: SẢN PHẨM */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <Package className="text-[#ec5b13]" size={24} /> Sản phẩm đơn hàng
                  </h2>
                  <span className="text-sm text-slate-400 font-bold">{items.length} sản phẩm</span>
                </div>

                <div className="p-8 divide-y divide-slate-50">
                  {items.length === 0 ? (
                    <p className="text-slate-400 text-sm font-medium py-4 text-center">Không có sản phẩm</p>
                  ) : items.map((item, idx) => (
                    <div key={item.product_id || idx} className="py-6 first:pt-0 last:pb-0 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shadow-sm shrink-0">
                        {item.product_image
                          ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={32} /></div>
                        }
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-slate-800">{item.product_name}</h4>
                        <p className="text-sm text-slate-400 font-bold mt-1">
                          SL: {item.quantity} × {Number(item.unit_price).toLocaleString()}đ
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#ec5b13]">{Number(item.subtotal).toLocaleString()}đ</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>Tạm tính</span><span>{subtotal.toLocaleString()}đ</span>
                  </div>
                  {shipping > 0 && (
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Phí vận chuyển</span><span>{shipping.toLocaleString()}đ</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Giảm giá {order.voucher_code ? `(${order.voucher_code})` : ""}</span>
                      <span>-{discount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[#ec5b13]">
                    <span className="font-black text-lg uppercase tracking-tight">Tổng thanh toán</span>
                    <span className="text-3xl font-black">{total.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              {/* Thanh toán */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phương thức thanh toán</p>
                    <p className="font-black text-slate-800 uppercase">COD / Chuyển khoản</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100">
                  Đã thanh toán
                </div>
              </div>
            </div>

            {/* CỘT PHẢI */}
            <div className="space-y-8">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8 text-[#ec5b13]">
                    <Truck size={32} />
                    <StatusBadgeDetail status={order.status} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-1">Ngày đặt</p>
                    <p className="text-sm font-bold opacity-80">
                      {order.date ? new Date(order.date).toLocaleString("vi-VN") : "—"}
                    </p>
                  </div>

                  {canConfirm && (
                    <button
                      onClick={() => handleUpdateStatus("Hoàn thành")}
                      disabled={updating}
                      className="w-full mt-8 py-4 bg-[#ec5b13] hover:bg-[#ff6a1d] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#ec5b13]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {updating
                        ? <><Loader2 size={16} className="animate-spin" /> Đang cập nhật...</>
                        : "Xác nhận hoàn tất"
                      }
                    </button>
                  )}

                  {order.status === "Đang xử lý" && (
                    <button
                      onClick={() => handleUpdateStatus("Đang giao")}
                      disabled={updating}
                      className="w-full mt-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {updating
                        ? <><Loader2 size={16} className="animate-spin" /> Đang cập nhật...</>
                        : "Xác nhận giao hàng"
                      }
                    </button>
                  )}
                </div>
                <Package className="absolute -right-6 -bottom-6 opacity-5 text-white" size={160} />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
                <h3 className="font-black text-[11px] uppercase text-slate-400 tracking-[0.2em]">Thông tin nhận hàng</h3>
                <div className="space-y-6">
                  <InfoItem icon={<User />}   label="Khách hàng" value={addrParsed.name || order.customer_name || "—"} />
                  <InfoItem icon={<Phone />}  label="Điện thoại" value={addrParsed.phone || "—"} />
                  <InfoItem icon={<Mail />}   label="Email"      value={order.customer_email || "—"} />
                  <InfoItem icon={<MapPin />} label="Địa chỉ"    value={addrParsed.address || "—"} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-[#ec5b13]/10 group-hover:text-[#ec5b13] transition-all flex-shrink-0">
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider mb-0.5">{label}</p>
        <p className="font-bold text-sm text-slate-700 leading-snug break-words max-w-[200px]">{value}</p>
      </div>
    </div>
  );
}

function StatusBadgeDetail({ status }) {
  const configs = {
    "Hoàn thành": "text-emerald-500",
    "Đang xử lý": "text-amber-500",
    "Đang giao":  "text-blue-500",
    "Đã hủy":     "text-red-500",
  };
  return (
    <div className="text-right">
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Trạng thái</p>
      <p className={`font-black uppercase text-lg ${configs[status] || "text-slate-400"}`}>{status || "—"}</p>
    </div>
  );
}