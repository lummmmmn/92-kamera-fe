import React from "react";
import { G, MUT, TXT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";

export default function DashboardPanel({
  myOrders = [],
  completedOrders = [],
  feedbacks = [],
  totalSpent = 0,
  totalDays = 0,
  usedCameras = [],
  setTab,
  setFbOrder,
  onOpenBooking,
  myEmail = "",
  myPhone = "",
}) {
  const normPhone = (p) => (p || "").replace(/[^0-9]/g, "");

  return (
    <div>
      {/* Stats 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "📋", label: "Tổng đơn", value: myOrders.length, unit: "đơn", col: G, dot: G },
          { icon: "💰", label: "Đã chi tiêu", value: fmtVND(totalSpent), unit: "", col: G, dot: G },
          { icon: "📅", label: "Ngày thuê", value: totalDays, unit: "ngày", col: "#a78bfa", dot: "#a78bfa" },
          { icon: "✅", label: "Hoàn thành", value: completedOrders.length, unit: "đơn", col: "#22c55e", dot: "#22c55e" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.13)",
              border: `1px solid rgba(255,255,255,0.22)`,
              borderRadius: 24,
              padding: "18px 16px 16px",
              position: "relative",
              overflow: "hidden",
              backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
            }}
          >
            {/* Accent dot top-right */}
            <div style={{ position: "absolute", top: 14, right: 14, width: 7, height: 7, borderRadius: "50%", background: s.dot, boxShadow: `0 0 8px ${s.dot}99` }} />
            {/* Icon */}
            <div style={{ fontSize: 20, marginBottom: 10, opacity: 0.7 }}>{s.icon}</div>
            {/* Value */}
            <div style={{ color: s.col, fontWeight: 800, fontSize: typeof s.value === "string" && s.value.length > 9 ? 16 : 26, fontFamily: "system-ui,sans-serif", lineHeight: 1, marginBottom: 6 }}>
              {s.value}
              {s.unit && <span style={{ fontSize: 12, color: MUT, fontWeight: 500, marginLeft: 4 }}>{s.unit}</span>}
            </div>
            {/* Label */}
            <div style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Thiết bị đã thuê */}
      {usedCameras.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.13)", border: `1px solid rgba(255,255,255,0.22)`, borderRadius: 24, padding: "18px 18px 16px", marginBottom: 12, backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: MUT, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif" }}>THIẾT BỊ ĐÃ THUÊ</span>
            <button onClick={() => setTab("orders")} style={{ background: "none", border: "none", color: G, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 3 }}>
              Xem tất cả <span>→</span>
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {usedCameras.map((c) => (
              <span key={c} style={{ background: "rgba(255,255,255,0.18)", color: MUT, border: "1px solid rgba(255,255,255,0.30)", borderRadius: 14, padding: "7px 13px", fontSize: 12, fontFamily: "system-ui,sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, opacity: 0.6 }}>📷</span><span>{c}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unreviewed CTA */}
      {(() => {
        const unreviewed = completedOrders.filter((o) => !feedbacks.some((f) =>
          f.orderId === o.id && (
            (myEmail && f.email === myEmail) ||
            (myPhone && normPhone(f.phone) === myPhone)
          )
        ));
        return (
          unreviewed.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.13)", border: `1px solid rgba(255,255,255,0.22)`, borderRadius: 24, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
              <div>
                <div style={{ color: TXT, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>Bạn có {unreviewed.length} đơn chưa đánh giá</div>
                <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Chia sẻ trải nghiệm để nhận huy hiệu</div>
              </div>
              <button
                onClick={() => setTab("orders")}
                style={{ flexShrink: 0, padding: "10px 18px", background: `linear-gradient(135deg,${G},#a07830)`, color: "#000", border: "none", borderRadius: 16, cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap", boxShadow: `0 4px 16px ${G}33` }}
              >
                Đánh giá →
              </button>
            </div>
          )
        );
      })()}

      {/* Book more CTA */}
      {onOpenBooking && (
        <button
          onClick={onOpenBooking}
          style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1.5px dashed rgba(255,255,255,0.30)", borderRadius: 24, padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "all .2s", textAlign: "left", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)";
            e.currentTarget.style.background = "rgba(255,255,255,0.13)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.30)";
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 16, border: `1.5px solid ${G}44`, display: "flex", alignItems: "center", justifyContent: "center", color: G, fontSize: 20, flexShrink: 0 }}>＋</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: G, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginBottom: 2 }}>Thuê thêm thiết bị</div>
            <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Khám phá thêm nhiều thiết bị chất lượng</div>
          </div>
          <span style={{ color: MUT, fontSize: 18 }}>→</span>
        </button>
      )}
    </div>
  );
}
