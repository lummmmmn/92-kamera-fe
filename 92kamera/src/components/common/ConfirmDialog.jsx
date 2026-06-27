import React from "react";

export default function ConfirmDialog({ message, onOk, onCancel, loading = false }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={() => {
        if (!loading) onCancel?.();
      }}
    >
      <div
        style={{
          background: "#f0f4f8",
          borderRadius: 16,
          padding: "24px 24px 20px",
          maxWidth: 320,
          width: "calc(100% - 48px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.7) inset",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: "#0d1b2a",
            fontSize: 14,
            fontFamily: "system-ui,sans-serif",
            lineHeight: 1.6,
            marginBottom: 20,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 18px",
              background: "transparent",
              border: "1px solid #c0ccd8",
              color: "#4a6a8a",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              fontWeight: 600,
              opacity: loading ? 0.55 : 1,
            }}
          >
            Không
          </button>
          <button
            onClick={onOk}
            disabled={loading}
            style={{
              padding: "8px 18px",
              background: "#ef4444",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              fontWeight: 700,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
