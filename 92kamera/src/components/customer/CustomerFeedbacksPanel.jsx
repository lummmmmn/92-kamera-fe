import React from "react";
import { G, MUT, TXT } from "../../lib/constants.js";

export default function CustomerFeedbacksPanel({
  myFeedbacks = [],
  myOrders = [],
  setFbOrder,
}) {
  return (
    <div>
      <div style={{ color: TXT, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Feedback của tôi</div>
      <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

      {myFeedbacks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: MUT }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Chưa có đánh giá nào</div>
          <div style={{ fontSize: 12, color: "#444" }}>Hoàn thành đơn thuê để gửi đánh giá</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {myFeedbacks.map((f) => {
            return (
              <div
                key={f.id}
                style={{
                  background: "rgba(255,255,255,0.13)",
                  border: `1px solid ${
                    f.status === "approved" ? "#22c55e44" : f.status === "rejected" ? "#ef444433" : "rgba(255,255,255,0.22)"
                  }`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                  WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                  boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: G, fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                      {"★".repeat(f.rating)}
                      <span style={{ color: "#333" }}>{"★".repeat(5 - f.rating)}</span>
                    </div>
                    <div style={{ color: "#1e3a4a", fontSize: 11, fontWeight: 600 }}>
                      📷 {f.cameraName} · {f.date}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 12px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      background: f.status === "approved" ? "#d1fae5" : f.status === "rejected" ? "#fee2e2" : "#dbeafe",
                      color: f.status === "approved" ? "#065f46" : f.status === "rejected" ? "#991b1b" : "#1e40af",
                      border: `1px solid ${
                        f.status === "approved" ? "#059669" : f.status === "rejected" ? "#dc2626" : "#3b82f6"
                      }`,
                    }}
                  >
                    {f.status === "approved" ? "✓ Đã duyệt" : f.status === "rejected" ? "✕ Từ chối" : "⏳ Chờ duyệt"}
                  </span>
                </div>
                {f.text && (
                  <div style={{ color: "#0d1f2e", fontSize: 13, lineHeight: 1.6, marginBottom: 12, fontStyle: "italic", fontWeight: 600 }}>
                    "{f.text}"
                  </div>
                )}
                {f.status === "approved" && !f.hidden && (
                  <div style={{ marginTop: 10, fontSize: 10, color: "#065f46", fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                    ✨ Đang hiển thị trên trang chủ
                  </div>
                )}
                {f.status === "pending" && (
                  <div style={{ marginTop: 10, fontSize: 10, color: "#1e3a4a", fontFamily: "system-ui,sans-serif" }}>
                    ✏️ Chờ admin duyệt ·{" "}
                    <button
                      onClick={() => {
                        const o = myOrders.find((ord) => ord.id === f.orderId);
                        if (o) setFbOrder(o);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: G,
                        cursor: "pointer",
                        fontSize: 10,
                        fontFamily: "system-ui,sans-serif",
                        padding: 0,
                        fontWeight: 700,
                        textDecoration: "underline",
                      }}
                    >
                      Sửa đánh giá
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
