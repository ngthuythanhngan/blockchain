import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, ShoppingBag, MapPin, Lock, Camera,
  Edit3, Check, X, Plus, Trash2,
  Package, Loader2, AlertCircle, LogOut,
} from "lucide-react";
import Navbar from "./Navbar";
import "./information.css";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";

function StatusBadge({ status }) {
  const map = {
    "Đang xử lý": "bg-amber-50 text-amber-600 border-amber-200",
    "Đang giao":   "bg-blue-50 text-blue-600 border-blue-200",
    "Hoàn thành":  "bg-green-50 text-green-600 border-green-200",
    "Đã hủy":      "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border ${map[status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}

// Modal xác nhận tái sử dụng
function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = "Xác nhận", confirmClass = "bg-red-500 hover:bg-red-600" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-black text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
          <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold transition ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function Information() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState({ full_name: "", phone_number: "", birthday: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordMsg, setPasswordMsg] = useState({ text: "", isError: false });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null); // order_id

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrForm, setAddrForm] = useState({ name: "", phone: "", address: "", isDefault: false });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [deleteAddrConfirm, setDeleteAddrConfirm] = useState(null); // addr id

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!stored) { navigate("/login"); return; }
    setUser(stored);
    setProfile({
      full_name:    stored.full_name || stored.fullname || "",
      phone_number: stored.phone_number || "",
      birthday:     stored.birthday || "",
    });
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "addresses") fetchAddresses();
  }, [activeTab, user?.id]);

  // ── API CALLS ──

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res  = await fetch(`${API}/order/list/?customer_id=${user.id}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { setOrders([]); }
    finally { setOrdersLoading(false); }
  };

  const fetchAddresses = async () => {
    setAddrLoading(true);
    try {
      const res  = await fetch(`${API}/customer/${user.id}/addresses/`);
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch { setAddresses([]); }
    finally { setAddrLoading(false); }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const res  = await fetch(`${API}/customer/update/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ customer_id: user.id, ...profile }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, ...data.user };
        setUser(updated);
        sessionStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("userUpdated"));
        toast.success("Cập nhật thông tin thành công!");
        setEditingProfile(false);
      } else {
        toast.error(data.error || "Có lỗi xảy ra.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", isError: false });

    if (passwords.new_password.length < 6)
      return setPasswordMsg({ text: "Mật khẩu mới phải có ít nhất 6 ký tự.", isError: true });
    if (passwords.new_password !== passwords.confirm_password)
      return setPasswordMsg({ text: "Mật khẩu xác nhận không khớp.", isError: true });

    setPasswordSaving(true);
    try {
      const res  = await fetch(`${API}/customer/change-password/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          customer_id:      user.id,
          current_password: passwords.current_password,
          new_password:     passwords.new_password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đổi mật khẩu thành công!");
        setPasswords({ current_password: "", new_password: "", confirm_password: "" });
        setPasswordMsg({ text: "", isError: false });
      } else {
        setPasswordMsg({ text: data.error || "Có lỗi xảy ra.", isError: true });
      }
    } catch {
      setPasswordMsg({ text: "Không thể kết nối server.", isError: true });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    const form = new FormData();
    form.append("customer_id", user.id);
    form.append("file", file);
    try {
      const res  = await fetch(`${API}/customer/upload-avatar/`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, avatar: data.avatar_url };
        setUser(updated);
        sessionStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("userUpdated"));
        toast.success("Cập nhật ảnh đại diện thành công!");
      } else {
        toast.error("Không thể upload ảnh. Vui lòng thử lại.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addrForm.name || !addrForm.phone || !addrForm.address) {
      toast.error("Vui lòng nhập đầy đủ thông tin địa chỉ.");
      return;
    }

    const endpoint = editingAddrId
      ? `${API}/customer/address/update/`
      : `${API}/customer/address/create/`;
    const body = editingAddrId
      ? { customer_id: user.id, id: editingAddrId, ...addrForm }
      : { customer_id: user.id, ...addrForm };

    try {
      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        fetchAddresses();
        setShowAddrForm(false);
        setAddrForm({ name: "", phone: "", address: "", isDefault: false });
        setEditingAddrId(null);
        toast.success(editingAddrId ? "Cập nhật địa chỉ thành công!" : "Thêm địa chỉ mới thành công!");
      } else {
        toast.error("Không thể lưu địa chỉ. Vui lòng thử lại.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await fetch(`${API}/customer/address/delete/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ customer_id: user.id, id }),
      });
      fetchAddresses();
      toast.success("Đã xóa địa chỉ.");
    } catch {
      toast.error("Không thể xóa địa chỉ.");
    } finally {
      setDeleteAddrConfirm(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const res = await fetch(`${API}/order/cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (res.ok) {
        toast.success("Đã hủy đơn hàng thành công.");
        fetchOrders();
      } else {
        toast.error("Không thể hủy đơn hàng.");
      }
    } catch {
      toast.error("Không thể kết nối server.");
    } finally {
      setCancelConfirm(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("cart");
    window.dispatchEvent(new Event("userUpdated"));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.info("Đã đăng xuất.");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f6]">
        <Loader2 className="animate-spin text-[#3A5A40]" size={40} />
      </div>
    );
  }

  const TABS = [
    { id: "profile",   label: "Tài khoản",   icon: User },
    { id: "orders",    label: "Đơn hàng",     icon: ShoppingBag },
    { id: "addresses", label: "Địa chỉ",      icon: MapPin },
    { id: "password",  label: "Mật khẩu",     icon: Lock },
  ];

  return (
    <div className="information-root min-h-screen bg-[#f7f6f6]">
      <Navbar />

      {/* Confirm Modals */}
      <ConfirmModal
        open={!!cancelConfirm}
        title="Hủy đơn hàng?"
        message="Bạn chắc chắn muốn hủy đơn hàng này? Hành động không thể hoàn tác."
        confirmLabel="Hủy đơn"
        onConfirm={() => handleCancelOrder(cancelConfirm)}
        onCancel={() => setCancelConfirm(null)}
      />
      <ConfirmModal
        open={!!deleteAddrConfirm}
        title="Xóa địa chỉ?"
        message="Bạn chắc chắn muốn xóa địa chỉ này?"
        confirmLabel="Xóa"
        onConfirm={() => handleDeleteAddress(deleteAddrConfirm)}
        onCancel={() => setDeleteAddrConfirm(null)}
      />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#3A5A40]/10">
                    {user.avatar
                      ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#3A5A40]">{(user.fullname || user.full_name || "U")[0].toUpperCase()}</div>
                    }
                  </div>
                  <label className={`absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${avatarUploading ? "opacity-100" : ""}`}>
                    {avatarUploading
                      ? <Loader2 size={20} className="text-white animate-spin" />
                      : <Camera size={20} className="text-white" />
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <h3 className="font-black text-slate-800 mt-3 text-center">{user.fullname || user.full_name}</h3>
                <p className="text-xs text-slate-400 mt-1">{user.email}</p>
              </div>

              <nav className="space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      activeTab === id
                        ? "bg-[#3A5A40] text-white shadow-lg shadow-[#3A5A40]/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-4"
                >
                  <LogOut size={18} /> Đăng xuất
                </button>
              </nav>
            </div>
          </aside>

          {/* ── NỘI DUNG ── */}
          <main className="lg:col-span-3">

            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 tab-panel">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800">Thông tin tài khoản</h2>
                  {!editingProfile
                    ? <button onClick={() => setEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3A5A40]/10 text-[#3A5A40] rounded-xl text-sm font-bold hover:bg-[#3A5A40]/20 transition">
                        <Edit3 size={16} /> Chỉnh sửa
                      </button>
                    : <div className="flex gap-2">
                        <button onClick={() => setEditingProfile(false)} className="flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition">
                          <X size={16} /> Hủy
                        </button>
                        <button onClick={handleSaveProfile} disabled={profileSaving} className="flex items-center gap-1 px-4 py-2 bg-[#3A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#2d4732] transition disabled:opacity-60">
                          {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu
                        </button>
                      </div>
                  }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "Họ và tên", key: "full_name", type: "text", placeholder: "Nhập họ tên" },
                    { label: "Email", key: "email", type: "email", value: user.email, disabled: true },
                    { label: "Số điện thoại", key: "phone_number", type: "tel", placeholder: "Nhập số điện thoại" },
                    { label: "Ngày sinh", key: "birthday", type: "date" },
                  ].map(({ label, key, type, placeholder, disabled, value }) => (
                    <div key={key}>
                      <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">{label}</label>
                      <input
                        type={type}
                        value={value || profile[key] || ""}
                        disabled={disabled || !editingProfile}
                        placeholder={placeholder}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3A5A40]/20 focus:border-[#3A5A40] transition disabled:opacity-60 disabled:cursor-not-allowed input-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ĐƠN HÀNG */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 tab-panel">
                <h2 className="text-2xl font-black text-slate-800 mb-8">Lịch sử đơn hàng</h2>
                {ordersLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#3A5A40]" size={36} /></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20">
                    <Package className="mx-auto text-slate-200 mb-4" size={56} />
                    <p className="text-slate-400 font-bold">Bạn chưa có đơn hàng nào.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-slate-100 rounded-2xl p-5 hover:border-[#3A5A40]/20 hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-black text-[#3A5A40] text-sm">#{order.id}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(order.date).toLocaleDateString("vi-VN")}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        {order.items?.slice(0, 2).map((item, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-t border-slate-50">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                              <img src={item.product_image || "https://via.placeholder.com/80"} alt="" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 flex-1 line-clamp-1">{item.product_name}</p>
                            <p className="text-xs text-slate-400">x{item.quantity}</p>
                          </div>
                        ))}
                        {(order.items?.length || 0) > 2 && (
                          <p className="text-xs text-slate-400 mt-1">+{order.items.length - 2} sản phẩm khác</p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                          <span className="text-sm font-black text-[#3A5A40]">{order.total?.toLocaleString()}đ</span>
                          {order.status === "Đang xử lý" && (
                            <button
                              onClick={() => setCancelConfirm(order.id)}
                              className="text-xs text-red-500 hover:underline font-bold"
                            >
                              Hủy đơn
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ĐỊA CHỈ */}
            {activeTab === "addresses" && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 tab-panel">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800">Sổ địa chỉ</h2>
                  <button
                    onClick={() => {
                      setShowAddrForm(true);
                      setEditingAddrId(null);
                      setAddrForm({ name: user.fullname || user.full_name || "", phone: user.phone_number || "", address: "", isDefault: false });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#2d4732] transition shadow-md shadow-[#3A5A40]/20"
                  >
                    <Plus size={16} /> Thêm địa chỉ
                  </button>
                </div>

                {addrLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#3A5A40]" size={36} /></div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div key={addr.id} className={`border rounded-2xl p-5 transition-all ${addr.isDefault ? "border-[#3A5A40]/30 bg-[#3A5A40]/5" : "border-slate-100 hover:border-slate-200"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-slate-800">{addr.name}</span>
                              {addr.isDefault && <span className="text-[10px] bg-[#3A5A40] text-white px-2 py-0.5 rounded-full font-bold uppercase">Mặc định</span>}
                            </div>
                            <p className="text-sm text-slate-500">{addr.phone}</p>
                            <p className="text-sm text-slate-600 mt-1">{addr.address}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingAddrId(addr.id);
                                setAddrForm({ name: addr.name, phone: addr.phone, address: addr.address, isDefault: addr.isDefault });
                                setShowAddrForm(true);
                              }}
                              className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
                            ><Edit3 size={16} /></button>
                            <button onClick={() => setDeleteAddrConfirm(addr.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {addresses.length === 0 && !showAddrForm && (
                      <div className="text-center py-16">
                        <MapPin className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold">Chưa có địa chỉ nào.</p>
                      </div>
                    )}
                  </div>
                )}

                {showAddrForm && (
                  <div className="mt-6 border-2 border-dashed border-[#3A5A40]/20 rounded-2xl p-6">
                    <h3 className="font-black text-slate-800 mb-4">{editingAddrId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Họ tên người nhận", key: "name", placeholder: "Nguyễn Văn A" },
                        { label: "Số điện thoại", key: "phone", placeholder: "0901234567" },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">{label}</label>
                          <input
                            value={addrForm[key]}
                            onChange={(e) => setAddrForm({ ...addrForm, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A5A40]/20 focus:border-[#3A5A40] transition input-primary"
                          />
                        </div>
                      ))}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Địa chỉ chi tiết</label>
                        <input
                          value={addrForm.address}
                          onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })}
                          placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A5A40]/20 focus:border-[#3A5A40] transition input-primary"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="rounded accent-[#3A5A40]" />
                      <span className="text-sm font-bold text-slate-600">Đặt làm địa chỉ mặc định</span>
                    </label>
                    <div className="flex gap-3 mt-5">
                      <button onClick={handleSaveAddress} className="px-6 py-2.5 bg-[#3A5A40] text-white rounded-xl font-bold text-sm hover:bg-[#2d4732] transition shadow-md shadow-[#3A5A40]/20">Lưu địa chỉ</button>
                      <button onClick={() => { setShowAddrForm(false); setEditingAddrId(null); }} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Hủy</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MẬT KHẨU */}
            {activeTab === "password" && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 tab-panel">
                <h2 className="text-2xl font-black text-slate-800 mb-8">Đổi mật khẩu</h2>

                {user.login_type === "google" ? (
                  <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-2xl p-6">
                    <AlertCircle className="text-blue-400 shrink-0" size={24} />
                    <div>
                      <p className="font-bold text-blue-700">Tài khoản Google</p>
                      <p className="text-sm text-blue-500 mt-1">Tài khoản này đăng nhập qua Google. Để thay đổi mật khẩu, vui lòng thực hiện trên Google.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="max-w-md space-y-5">
                    {[
                      { label: "Mật khẩu hiện tại", key: "current_password" },
                      { label: "Mật khẩu mới", key: "new_password" },
                      { label: "Xác nhận mật khẩu mới", key: "confirm_password" },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">{label}</label>
                        <input
                          type="password"
                          value={passwords[key]}
                          onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A5A40]/20 focus:border-[#3A5A40] transition input-primary"
                        />
                      </div>
                    ))}

                    {passwordMsg.text && (
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${passwordMsg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                        <AlertCircle size={16} /> {passwordMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="w-full py-4 bg-[#3A5A40] text-white rounded-2xl font-bold hover:bg-[#2d4732] transition shadow-xl shadow-[#3A5A40]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {passwordSaving ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : "Đổi mật khẩu"}
                    </button>
                  </form>
                )}
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}