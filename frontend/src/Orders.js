import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { Search, Eye, MoreVertical, Printer, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

export default function OrderManagement() {
  const navigate = useNavigate();
  const toast = useToast();

  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [activeStatusId, setActiveStatusId] = useState(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const [updatingId, setUpdatingId]     = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "Tất cả") params.set("status", filterStatus);
      if (searchQuery.trim())         params.set("search", searchQuery.trim());
      const res  = await fetch(`${API}/admin/orders/?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
      toast.error("Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredOrders = useMemo(() => orders, [orders]);

  // In hóa đơn từng đơn hàng — fetch chi tiết rồi mở popup in riêng
  const handlePrintOrder = async (orderId) => {
    setActiveActionId(null);
    toast.info("Đang tải thông tin đơn hàng...");
    try {
      const res  = await fetch(`${API}/admin/orders/${orderId}/`);
      const order = await res.json();
      if (!res.ok) { toast.error("Không thể tải đơn hàng."); return; }

      const items   = order.items || [];
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const discount = Number(order.discount) || 0;
      const total    = Number(order.total) || 0;

      // Parse địa chỉ
      const addr = order.shipping_address || "";
      const parts = addr.split(" | ");
      const addrName  = parts.length >= 3 ? parts[0] : order.customer_name || "—";
      const addrPhone = parts.length >= 3 ? parts[1] : order.customer_phone || "—";
      const addrText  = parts.length >= 3 ? parts.slice(2).join(" | ") : addr;

      const itemRows = items.map(item => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${item.product_name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right">${Number(item.unit_price).toLocaleString("vi-VN")}đ</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;font-weight:700;color:#ec5b13">${Number(item.subtotal).toLocaleString("vi-VN")}đ</td>
        </tr>
      `).join("");

      const win = window.open("", "_blank", "width=860,height=720");
      win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>Hóa đơn #${order.id}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',sans-serif}
    body{padding:36px;color:#1e293b;font-size:14px;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #ec5b13}
    .brand{font-size:24px;font-weight:900;color:#ec5b13;letter-spacing:-0.5px}
    .brand-sub{font-size:12px;color:#94a3b8;margin-top:3px}
    .inv-info{text-align:right}
    .inv-no{font-size:20px;font-weight:900;color:#1e293b}
    .inv-date{font-size:12px;color:#64748b;margin-top:4px}
    .section{margin-bottom:22px}
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:1.5px;margin-bottom:10px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .info-item label{font-size:10px;color:#94a3b8;display:block;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    .info-item span{font-weight:600;color:#1e293b;font-size:13px}
    .status-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#fef3c7;color:#d97706}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    thead{background:#f8fafc}
    th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:1px;border-bottom:2px solid #e2e8f0}
    th:not(:first-child){text-align:right}
    th:nth-child(3){text-align:center}
    .totals-table{width:300px;margin-left:auto;margin-top:16px}
    .totals-table td{padding:6px 12px;font-size:13px;border:none}
    .totals-table tr:last-child td{padding-top:12px;border-top:2px solid #ec5b13;font-size:16px;font-weight:900;color:#ec5b13}
    .footer{margin-top:36px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px}
    @media print{body{padding:20px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LUXE GLOW</div>
      <div class="brand-sub">Mỹ phẩm thiên nhiên cao cấp</div>
    </div>
    <div class="inv-info">
      <div class="inv-no">Hóa đơn #${order.id}</div>
      <div class="inv-date">${order.date ? new Date(order.date).toLocaleString("vi-VN") : ""}</div>
      <div style="margin-top:6px"><span class="status-badge">${order.status || "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div>
        <div class="section-title">Thông tin khách hàng</div>
        <div class="info-item" style="margin-bottom:8px"><label>Tên</label><span>${addrName}</span></div>
        <div class="info-item" style="margin-bottom:8px"><label>Điện thoại</label><span>${addrPhone}</span></div>
        <div class="info-item"><label>Email</label><span>${order.customer_email || "—"}</span></div>
      </div>
      <div>
        <div class="section-title">Địa chỉ giao hàng</div>
        <div class="info-item" style="margin-bottom:8px"><label>Địa chỉ</label><span>${addrText || "—"}</span></div>
        <div class="info-item" style="margin-bottom:8px"><label>Phương thức thanh toán</label><span>COD / Chuyển khoản</span></div>
        ${order.voucher_code ? `<div class="info-item"><label>Voucher</label><span>${order.voucher_code}</span></div>` : ""}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Sản phẩm đặt hàng</div>
    <table>
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th style="text-align:right">Đơn giá</th>
          <th style="text-align:center">SL</th>
          <th style="text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8">Không có sản phẩm</td></tr>'}</tbody>
    </table>

    <table class="totals-table">
      <tbody>
        <tr>
          <td style="color:#64748b">Tạm tính</td>
          <td style="text-align:right;font-weight:600">${subtotal.toLocaleString("vi-VN")}đ</td>
        </tr>
        ${discount > 0 ? `<tr><td style="color:#16a34a">Giảm giá${order.voucher_code ? ` (${order.voucher_code})` : ""}</td><td style="text-align:right;font-weight:600;color:#16a34a">-${discount.toLocaleString("vi-VN")}đ</td></tr>` : ""}
        <tr>
          <td>TỔNG THANH TOÁN</td>
          <td style="text-align:right">${total.toLocaleString("vi-VN")}đ</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Cảm ơn quý khách đã mua sắm tại <strong>Luxe Glow</strong>!</p>
    <p style="margin-top:4px">Mọi thắc mắc vui lòng liên hệ hotline hoặc email hỗ trợ.</p>
  </div>
</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    } catch {
      toast.error("Không thể tải thông tin đơn hàng.");
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    setActiveStatusId(null);
    try {
      const res = await fetch(`${API}/order/update-status/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: data.order.status } : o)
        );
        toast.success(`Đã cập nhật trạng thái đơn #${orderId} thành "${newStatus}".`);
      } else {
        toast.error("Không thể cập nhật trạng thái.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8F7] font-display text-slate-900" onClick={() => { setActiveStatusId(null); setActiveActionId(null); }}>
      <AdminSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b h-20 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-3xl font-black text-slate-800">Quản lý vận đơn</h1>
          <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all" title="Làm mới">
              <RefreshCw size={18} />
            </button>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13]" size={18} />
              <input
                type="text"
                placeholder="Tìm khách hàng, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 py-2.5 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#ec5b13]/20 w-80 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
            {["Tất cả", "Đang xử lý", "Đang giao", "Hoàn thành", "Đã hủy"].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                  filterStatus === status
                    ? "bg-[#ec5b13] text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-visible">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={36} className="animate-spin text-[#ec5b13]" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <p className="font-bold text-sm">Không có đơn hàng nào.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b">
                  <tr>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase">Mã đơn</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Khách hàng</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Ngày đặt</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Tổng tiền</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase text-center">Trạng thái</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-all" onClick={(e) => e.stopPropagation()}>
                      <td className="px-8 py-5 font-black text-sm text-slate-800">{order.id}</td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-sm text-slate-700">{order.customer_name}</p>
                        <p className="text-xs text-slate-400">{order.customer_phone}</p>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-500">
                        {order.date ? new Date(order.date).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-6 py-5 font-black text-sm text-[#ec5b13]">
                        {Number(order.total).toLocaleString()}đ
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-center relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusId(activeStatusId === order.id ? null : order.id);
                              setActiveActionId(null);
                            }}
                            className="flex items-center gap-2"
                            disabled={updatingId === order.id}
                          >
                            {updatingId === order.id
                              ? <Loader2 size={16} className="animate-spin text-slate-400" />
                              : <><StatusBadge status={order.status} /><ChevronDown size={14} className="text-slate-300" /></>
                            }
                          </button>

                          {activeStatusId === order.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveStatusId(null)}></div>
                              <div className="absolute top-full mt-2 w-44 bg-white border border-slate-100 shadow-2xl rounded-2xl z-40 overflow-hidden">
                                <StatusOption label="Đang xử lý" color="amber"   onClick={() => handleUpdateStatus(order.id, "Đang xử lý")} />
                                <StatusOption label="Đang giao"   color="blue"    onClick={() => handleUpdateStatus(order.id, "Đang giao")} />
                                <StatusOption label="Hoàn thành"  color="emerald" onClick={() => handleUpdateStatus(order.id, "Hoàn thành")} />
                                <StatusOption label="Hủy đơn"     color="red"     onClick={() => handleUpdateStatus(order.id, "Đã hủy")} />
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex justify-center relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionId(activeActionId === order.id ? null : order.id);
                              setActiveStatusId(null);
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              activeActionId === order.id
                                ? "bg-slate-800 text-white shadow-lg"
                                : "text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeActionId === order.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveActionId(null)}></div>
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 shadow-2xl rounded-2xl z-40 overflow-hidden">
                                <ActionOption
                                  icon={<Eye size={14} />}
                                  label="Xem chi tiết"
                                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                                />
                                <ActionOption icon={<Printer size={14} />} label="In hóa đơn" onClick={() => handlePrintOrder(order.id)} />
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    "Hoàn thành": "bg-emerald-50 text-emerald-600 border-emerald-100",
    "Đang xử lý": "bg-amber-50 text-amber-600 border-amber-100",
    "Đang giao":  "bg-blue-50 text-blue-600 border-blue-100",
    "Đã hủy":     "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1.5 ${configs[status] || "bg-slate-50 text-slate-500 border-slate-100"}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
      {status || "—"}
    </span>
  );
}

function StatusOption({ label, color, onClick }) {
  const styles = {
    amber:   "hover:bg-amber-50 text-amber-600",
    blue:    "hover:bg-blue-50 text-blue-600",
    emerald: "hover:bg-emerald-50 text-emerald-600",
    red:     "hover:bg-red-50 text-red-600",
  };
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase transition-all ${styles[color]}`}>
      {label}
    </button>
  );
}

function ActionOption({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all ${
        color === "red" ? "text-red-500 hover:bg-red-50" : ""
      }`}
    >
      {icon} {label}
    </button>
  );
}