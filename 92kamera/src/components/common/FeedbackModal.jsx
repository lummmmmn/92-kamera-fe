import React, { useState } from "react";
import Logo from "./Logo.jsx";
import { G, MUT, TXT, CARD, BR, BG } from "../../lib/constants.js";
import { todayStr } from "../../utils/format.js";
import { useCreateFeedback, useUpdateFeedback } from "../../hooks/useAppData.js";

export default function FeedbackModal({ order, loggedUser, feedbacks = [], onClose }) {
  const createFeedbackMutation = useCreateFeedback();
  const updateFeedbackMutation = useUpdateFeedback();

  // Tìm feedback đã gửi cho đơn này — match bằng email (Google) hoặc phone
  const _normP = (p) => (p || "").replace(/[^0-9]/g, "");
  const _matchOwner = (f) =>
    (loggedUser?.email && f.email === loggedUser.email) ||
    (loggedUser?.phone && _normP(f.phone) === _normP(loggedUser.phone));
  const existingFb = feedbacks.find((f) => f.orderId === order?.id && _matchOwner(f));

  // Cho phép edit nếu chưa admin xử lý (pending), không cho edit nếu đã approved/rejected
  const isEditing = !!existingFb && existingFb.status === "pending";
  const isLocked = !!existingFb && existingFb.status !== "pending";

  const [rating, setRating] = useState(existingFb?.rating || 5);
  const [text, setText] = useState(existingFb?.text || "");
  const [done, setDone] = useState(false);
  const [hovStar, setHovStar] = useState(0);

  const starLabels = ["", "Tệ 😞", "Tạm 😐", "Ổn 🙂", "Tốt 😊", "Xuất sắc 🤩"];

  const handleSubmit = async () => {
    if (!loggedUser || !order) return;
    try {
      if (isEditing && existingFb) {
        // CẬP NHẬT feedback cũ (status → pending lại để admin duyệt lại)
        await updateFeedbackMutation.mutateAsync({
          id: existingFb.id,
          data: {
            rating,
            text,
            images: existingFb.images || [],
            date: todayStr(),
            status: "pending",
            hidden: false,
            seen: false,
          },
        });
      } else {
        // TẠO MỚI feedback
        const fb = {
          id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          orderId: order.id,
          cameraName: order.cameraName,
          rating,
          text,
          images: [],
          userName: loggedUser.displayName || loggedUser.name,
          phone: loggedUser.phone || "",
          email: loggedUser.email || "",
          date: todayStr(),
          status: "pending",
          hidden: false,
          seen: false,
        };
        await createFeedbackMutation.mutateAsync(fb);
      }
      setDone(true);
    } catch (err) {
      alert("Gửi đánh giá thất bại: " + err.message);
    }
  };

  const inpS = {
    padding: "10px 13px",
    background: CARD,
    border: `1px solid ${BR}`,
    borderRadius: 12,
    color: TXT,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "system-ui,sans-serif",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.96)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: BG,
          border: `1px solid ${BR}`,
          borderRadius: 22,
          padding: 32,
          width: "min(480px,96vw)",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            background: "none",
            border: "none",
            color: MUT,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
        <Logo size={0.72} />

        {/* Đã được admin xử lý → không cho edit */}
        {isLocked ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>
              {existingFb.status === "approved" ? "🌟" : "😔"}
            </div>
            <div style={{ color: G, fontSize: 17, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
              {existingFb.status === "approved" ? "Đánh giá đã được duyệt!" : "Đánh giá đã bị từ chối"}
            </div>
            <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500, lineHeight: 1.7 }}>
              {existingFb.status === "approved"
                ? "Đánh giá của bạn đang hiển thị trên trang chủ."
                : "Admin đã từ chối đánh giá này. Liên hệ Zalo nếu cần hỗ trợ."}
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20,
                padding: "10px 32px",
                background: G,
                color: "#000",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "system-ui,sans-serif",
              }}
            >
              Đóng
            </button>
          </div>
        ) : done ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌟</div>
            <div style={{ color: G, fontSize: 18, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
              {isEditing ? "Đã cập nhật đánh giá! 💛" : "Cảm ơn bạn! 💛"}
            </div>
            <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500, lineHeight: 1.7, marginBottom: 24 }}>
              Đánh giá đang chờ admin duyệt.
              <br />
              Cảm ơn bạn đã chia sẻ trải nghiệm! 💛
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "11px 36px",
                background: G,
                color: "#000",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "system-ui,sans-serif",
              }}
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div style={{ margin: "20px 0 24px" }}>
              <div style={{ fontSize: 15, color: TXT, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>
                {isEditing ? "✏️ Chỉnh sửa đánh giá" : "⭐ Đánh giá đơn thuê"}
              </div>
              <div style={{ fontSize: 11, color: MUT, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
                <span style={{ color: G }}>📷 {order?.cameraName}</span> · Mã đơn: <span style={{ color: "#777" }}>{order?.id}</span>
              </div>
            </div>

            {/* Star rating */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 10, fontFamily: "system-ui,sans-serif" }}>
                ĐÁNH GIÁ CHUNG
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHovStar(s)}
                    onMouseLeave={() => setHovStar(0)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 34,
                      color: s <= (hovStar || rating) ? G : BR,
                      padding: 2,
                      lineHeight: 1,
                      transition: "all .1s",
                      transform: s <= (hovStar || rating) ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    ★
                  </button>
                ))}
                <span style={{ color: G, fontSize: 13, marginLeft: 8, fontFamily: "system-ui,sans-serif", fontWeight: 600, minWidth: 90 }}>
                  {starLabels[hovStar || rating]}
                </span>
              </div>
            </div>

            {/* Text review */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 6, fontFamily: "system-ui,sans-serif" }}>
                NHẬN XÉT CỦA BẠN
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bạn cảm thấy thế nào? Máy có như kỳ vọng không? Dịch vụ ra sao?..."
                style={{ ...inpS, resize: "vertical", minHeight: 90, lineHeight: 1.6 }}
              />
            </div>

            <button
              onClick={handleSubmit}
              style={{
                width: "100%",
                padding: 14,
                background: G,
                color: "#000",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "system-ui,sans-serif",
                boxShadow: `0 0 24px ${G}44`,
              }}
            >
              {isEditing ? "✏️ Cập nhật đánh giá" : "🌟 Gửi đánh giá"}
            </button>
            <div style={{ color: "#333", fontSize: 11, textAlign: "center", marginTop: 10, fontFamily: "system-ui,sans-serif" }}>
              {isEditing ? "⚠️ Cập nhật sẽ gửi lại để admin duyệt" : "Nhận xét sẽ chờ admin duyệt trước khi công khai"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
