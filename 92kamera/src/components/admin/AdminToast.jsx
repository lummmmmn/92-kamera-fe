import React from "react";

export default function AdminToast({ toast, onClose }) {
  if (!toast) return null;

  const isOk = toast.type !== "err";

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 72,
        right: 18,
        zIndex: 4000,
        maxWidth: 340,
        padding: "12px 16px",
        background: isOk ? "#EEF9F4" : "#FEF0F0",
        border: `1px solid ${isOk ? "#22c55e55" : "#ef444455"}`,
        borderRadius: 12,
        boxShadow: "0 18px 45px rgba(8,20,36,0.18)",
        color: isOk ? "#15803d" : "#dc2626",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "system-ui,sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span>{isOk ? "✓" : "!"}</span>
      <span style={{ flex: 1 }}>{toast.text}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng thông báo"
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
