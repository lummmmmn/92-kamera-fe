import React from "react";
import { TXT, MUT, CARD, CARD2, BR2 } from "../../lib/constants.js";
import { todayStr, isDateInOrder, cdnUrl } from "../../utils/format.js";
import Badge from "../common/Badge.jsx";
import { useCameras } from "../../hooks/useAppData.js";
import { useOrders } from "../../hooks/useOrders.js";

// Section Title Helper
function STitle({ c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: "#0D1B2A", marginTop: 6 }} />
      </div>
    </div>
  );
}

export default function InventoryPanel({ isMobile }) {
  const { data: cameras = [] } = useCameras();
  const { data: orders = [] } = useOrders();

  const td = todayStr();
  const activeOrdersToday = orders.filter(
    (o) => ["pending", "confirmed", "active"].includes(o.status) && isDateInOrder(td, o)
  );

  const getRentedTodayCount = (camId) => {
    return activeOrdersToday.reduce((sum, o) => {
      if (o.cameras) {
        const f = o.cameras.find((x) => x.id === camId);
        return sum + (f ? f.qty : 0);
      }
      return o.cameraId === camId ? sum + 1 : sum;
    }, 0);
  };

  const availableCount = cameras.filter((c) => c.status === "available").length;
  const rentedTodayCount = cameras.filter((c) => {
    const rented = getRentedTodayCount(c.id);
    return rented > 0;
  }).length;
  const unavailableCount = cameras.filter((c) => c.status === "unavailable").length;

  return (
    <div>
      <STitle c="Quản lý tồn kho" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { l: "Sẵn sàng cho thuê", c: availableCount, col: "#22c55e" },
          { l: "Đang cho thuê hôm nay", c: rentedTodayCount, col: "#f59e0b" },
          { l: "Hết / Bảo trì", c: unavailableCount, col: "#ef4444" },
        ].map((s) => (
          <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.col}30`, borderRadius: 14, padding: "22px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: s.col }}>{s.c}</div>
            <div style={{ color: MUT, fontSize: 12, marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: CARD2,
          border: `1px solid ${BR2}`,
          borderRadius: 14,
          overflow: "hidden",
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr", background: CARD, borderBottom: `1px solid ${BR2}` }}>
          {["Ảnh", "Tên máy", "SL tổng", "Đang thuê", "Rảnh", "Trạng thái"].map((h) => (
            <div key={h} style={{ padding: "10px 12px", color: MUT, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              {h.toUpperCase()}
            </div>
          ))}
        </div>
        {cameras.map((c, i) => {
          const rented = getRentedTodayCount(c.id);
          const free = Math.max(0, (c.qty || 1) - rented);
          return (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr",
                borderBottom: i < cameras.length - 1 ? `1px solid ${BR2}` : "none",
                alignItems: "center",
              }}
            >
              <div style={{ padding: "10px 12px" }}>
                {c.images?.length > 0 ? (
                  <img
                    src={cdnUrl(c.images[0], "thumb")}
                    alt={c.name}
                    style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, border: `1px solid ${BR2}` }}
                  />
                ) : (
                  <div style={{ width: 36, height: 36, background: CARD, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {c.icon}
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 12px", color: TXT, fontSize: 12 }}>{c.name}</div>
              <div style={{ padding: "12px 12px", color: TXT, fontSize: 12 }}>{c.qty}</div>
              <div style={{ padding: "12px 12px", color: "#f59e0b", fontSize: 12 }}>{rented}</div>
              <div style={{ padding: "12px 12px", color: "#22c55e", fontSize: 12 }}>{free}</div>
              <div style={{ padding: "9px 12px", display: "flex", alignItems: "center" }}>
                <Badge status={c.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
