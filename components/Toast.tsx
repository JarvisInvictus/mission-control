"use client";

import { useEffect } from "react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const Tiffany = "#0abab5";

export function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const config = {
    success: { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.40)", color: "#34d399" },
    error:   { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.40)", color: "#f87171" },
    info:    { bg: `${Tiffany}26`, border: Tiffany + "60", color: Tiffany },
  }[toast.type];

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: "12px",
        padding: "12px 16px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        maxWidth: "320px",
        pointerEvents: "auto",
        animation: "toastIn 0.2s ease-out",
      }}
    >
      <span style={{ fontFamily: "system-ui", fontSize: "16px" }}>
        {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
      </span>
      <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "13px", color: config.color, flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.30)",
          cursor: "pointer", padding: "2px 4px", fontSize: "14px", lineHeight: 1, flexShrink: 0,
          fontFamily: "system-ui",
        }}
      >
        ✕
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
