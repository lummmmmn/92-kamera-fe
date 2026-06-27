import React from "react";
import { G, MUT, TXT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";

export default function CustomerBadgesPanel({
  myOrders = [],
  myFeedbacks = [],
  totalSpent = 0,
  totalDays = 0,
}) {
  const validOrders = myOrders.filter((o) => o.status !== "cancelled");
  const completedOrders = myOrders.filter((o) => o.status === "completed");
  const approvedFeedbacks = myFeedbacks.filter((f) => f.status === "approved");

  const allBadges = [
    { icon: "🥉", label: "Khách Đồng", desc: "Thuê ít nhất 1 lần", col: "#cd7f32", unlocked: validOrders.length >= 1 },
    { icon: "🥈", label: "Khách Bạc", desc: "Thuê 3+ lần", col: "#b0b8c8", unlocked: validOrders.length >= 3 },
    { icon: "🥇", label: "Khách Vàng", desc: "Thuê 5+ lần", col: G, unlocked: validOrders.length >= 5 },
    { icon: "👑", label: "Đại Gia Khoảnh Khắc", desc: "Tổng 30+ ngày", col: G, unlocked: totalDays >= 30 },
    { icon: "💎", label: "Khách VIP", desc: "Chi tiêu 5,000,000đ+", col: "#38bdf8", unlocked: totalSpent >= 5000000 },
    { icon: "💠", label: "Kim Cương", desc: "Chi tiêu 10,000,000đ+", col: "#e879f9", unlocked: totalSpent >= 10000000 },
  ];

  const highestIdx = allBadges.reduce((hi, b, i) => (b.unlocked ? i : hi), -1);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🏅</span>
        <span style={{ color: TXT, fontWeight: 800, fontSize: 18, letterSpacing: 0.5, fontFamily: "system-ui,sans-serif" }}>
          HUY HIỆU CỦA TÔI
        </span>
        <span style={{ color: `${G}55`, fontSize: 14 }}>◇</span>
      </div>
      <div style={{ width: 36, height: 3, background: G, borderRadius: 2, marginBottom: 24 }} />

      {/* Badge horizontal scroll */}
      <div
        className="badge-scroll"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 6,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          margin: "0 -4px",
          padding: "4px 4px 16px",
        }}
      >
        <style>{`
          .badge-scroll::-webkit-scrollbar { display:none }
          .badge-card { transition: transform .2s, box-shadow .2s }
          .badge-card:active { transform: scale(0.97) }
        `}</style>
        {allBadges.map((b, i) => {
          const isTop = i === highestIdx;
          return (
            <div
              key={b.label}
              className="badge-card"
              style={{
                minWidth: 140,
                flexShrink: 0,
                scrollSnapAlign: "start",
                background: "rgba(255,255,255,0.13)",
                border: `1.5px solid ${isTop ? G + "cc" : b.unlocked ? b.col + "55" : "rgba(255,255,255,0.22)"}`,
                borderRadius: 28,
                padding: "20px 14px 16px",
                textAlign: "center",
                position: "relative",
                opacity: b.unlocked ? 1 : 0.45,
                backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                boxShadow: isTop
                  ? `0 0 28px ${G}28, 0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset`
                  : "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
              }}
            >
              {/* dot / lock */}
              <div style={{ position: "absolute", top: 12, right: 12 }}>
                {b.unlocked ? (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55eaa" }} />
                ) : (
                  <span style={{ fontSize: 11, opacity: 0.4 }}>🔒</span>
                )}
              </div>
              {/* icon */}
              <div style={{ fontSize: 48, marginBottom: 10, filter: b.unlocked ? "none" : "grayscale(1) brightness(0.55)", lineHeight: 1 }}>
                {b.icon}
              </div>
              {/* label */}
              <div style={{ color: b.unlocked ? b.col : MUT, fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif", marginBottom: 5, lineHeight: 1.3 }}>
                {b.label}
              </div>
              {/* desc */}
              <div style={{ color: MUT, fontSize: 10.5, fontFamily: "system-ui,sans-serif", marginBottom: 10, lineHeight: 1.4 }}>
                {b.desc}
              </div>
              {/* status */}
              {b.unlocked && (
                <div style={{ background: "#EEF9F4", border: "1px solid #22c55e33", borderRadius: 12, padding: "5px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>
                  <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đã mở</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats grid 2×3 */}
      <div style={{ color: G, fontSize: 10, letterSpacing: 2, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14, marginTop: 8 }}>
        THỐNG KÊ CỦA BẠN
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
        {[
          { icon: "📋", label: "Tổng đơn", value: myOrders.length, unit: "đơn", col: G },
          { icon: "📅", label: "Ngày thuê", value: totalDays, unit: "ngày", col: "#a78bfa" },
          { icon: "💰", label: "Chi tiêu", value: fmtVND(totalSpent), unit: "", col: G },
          { icon: "✅", label: "Đơn hoàn thành", value: completedOrders.length, unit: "đơn", col: "#22c55e" },
          { icon: "💬", label: "Đánh giá", value: approvedFeedbacks.length, unit: "reviews", col: "#f59e0b" },
          { icon: "🏅", label: "Huy hiệu", value: allBadges.filter((b) => b.unlocked).length, unit: "/ 6", col: G },
        ].map(({ icon, label, value, unit, col }) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.13)",
              border: `1px solid rgba(255,255,255,0.22)`,
              borderRadius: 22,
              padding: "16px 16px 14px",
              backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ color: MUT, fontSize: 10.5, fontFamily: "system-ui,sans-serif", fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
            </div>
            <div style={{ color: col, fontWeight: 800, fontSize: 22, fontFamily: "system-ui,sans-serif", lineHeight: 1 }}>
              {value}
              {unit && <span style={{ fontSize: 12, color: MUT, fontWeight: 500, marginLeft: 4 }}>{unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
