/**
 * Toast.js — Hệ thống thông báo Toast toàn cục cho Luxe Glow
 *
 * Màu sắc:
 *   success  → xanh lá  (#2D5A27)
 *   error    → đỏ       (#ef4444)
 *   info     → xanh dương (#3b82f6)
 *   warning  → vàng cam  (#f59e0b)
 *
 * Cách dùng:
 *   import { useToast } from "./Toast";
 *   const toast = useToast();
 *   toast.success("Thêm vào giỏ thành công!");
 *   toast.error("Có lỗi xảy ra.");
 *   toast.info("Đang xử lý...");
 *   toast.warning("Sắp hết hàng!");
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

// ── Context ──
const ToastContext = createContext(null);

// ── Provider ──
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error:   (msg, dur) => addToast(msg, "error",   dur),
    info:    (msg, dur) => addToast(msg, "info",    dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ── Hook ──
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Container ──
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      style={{ maxWidth: 380 }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Config per type ──
const CONFIG = {
  success: {
    bg:     "bg-white",
    border: "border-l-4 border-[#2D5A27]",
    icon:   <CheckCircle size={20} className="text-[#2D5A27] shrink-0" />,
    bar:    "bg-[#2D5A27]",
    label:  "text-[#2D5A27]",
  },
  error: {
    bg:     "bg-white",
    border: "border-l-4 border-red-500",
    icon:   <XCircle size={20} className="text-red-500 shrink-0" />,
    bar:    "bg-red-500",
    label:  "text-red-500",
  },
  info: {
    bg:     "bg-white",
    border: "border-l-4 border-blue-500",
    icon:   <Info size={20} className="text-blue-500 shrink-0" />,
    bar:    "bg-blue-500",
    label:  "text-blue-500",
  },
  warning: {
    bg:     "bg-white",
    border: "border-l-4 border-amber-500",
    icon:   <AlertTriangle size={20} className="text-amber-500 shrink-0" />,
    bar:    "bg-amber-500",
    label:  "text-amber-500",
  },
};

// ── Single Toast ──
function ToastItem({ toast, onRemove }) {
  const cfg = CONFIG[toast.type] || CONFIG.info;
  const [progress, setProgress] = useState(100);

  // Tự động đóng sau duration
  useEffect(() => {
    const start = Date.now();
    const dur   = toast.duration || 3500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct     = Math.max(0, 100 - (elapsed / dur) * 100);
      setProgress(pct);
      if (pct <= 0) { clearInterval(interval); onRemove(toast.id); }
    }, 30);

    return () => clearInterval(interval);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        pointer-events-auto w-full rounded-2xl shadow-xl border border-slate-100
        ${cfg.bg} ${cfg.border}
        font-['Manrope'] overflow-hidden
        ${toast.removing
          ? "opacity-0 translate-x-8 scale-95"
          : "opacity-100 translate-x-0 scale-100"
        }
      `}
      style={{
        transition: "opacity 0.35s ease, transform 0.35s ease",
        animation: toast.removing ? undefined : "toastIn 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5">{cfg.icon}</div>
        <p className="flex-1 text-sm font-bold text-slate-700 leading-snug">{toast.message}</p>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-slate-100">
        <div
          className={`h-full ${cfg.bar} transition-none`}
          style={{ width: `${progress}%`, transition: "width 0.03s linear" }}
        />
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(32px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}