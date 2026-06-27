import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { G, MUT, TXT, BG, CARD, BR, CARD2, BR2, STATUS_CFG } from "../../lib/constants.js";
import { fmtVND, todayStr, isDateInOrder } from "../../utils/format.js";
import { useCameras, useFeedbacks, useUsers } from "../../hooks/useAppData.js";
import { useOrders } from "../../hooks/useOrders.js";

// Section Title Helper
function STitle({ c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
      </div>
    </div>
  );
}

export default function OverviewPanel({ isMobile, setTab }) {
  const { data: orders = [] } = useOrders();
  const { data: cameras = [] } = useCameras();
  const { data: feedbacks = [] } = useFeedbacks();
  const { data: users = {} } = useUsers();

  const todayDate = todayStr();
  
  // Doanh thu hôm nay
  const todayRev = orders
    .filter(o => o.status !== "cancelled" && o.date === todayDate)
    .reduce((s, o) => s + o.total, 0);

  // Doanh thu tháng
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthRev = orders
    .filter(o => o.status !== "cancelled" && o.date && o.date.startsWith(currentMonthPrefix))
    .reduce((s, o) => s + o.total, 0);

  // Doanh thu 6 tháng gần nhất
  const revData = (() => {
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const prefix = `${y}-${String(m).padStart(2, "0")}`;
      const v = orders
        .filter(o => o.status !== "cancelled" && o.date && o.date.startsWith(prefix))
        .reduce((s, o) => s + (o.total || 0), 0);
      result.push({ m: `T${m}`, v });
    }
    return result;
  })();

  const activeCount = orders.filter(o => ["active", "confirmed", "pending"].includes(o.status)).length;
  const unseenCount = orders.filter(o => !o.seen).length;

  const approvedFeedbacks = feedbacks.filter(f => f.status === "approved");
  const avgRating = approvedFeedbacks.length
    ? (approvedFeedbacks.reduce((s, f) => s + f.rating, 0) / approvedFeedbacks.length).toFixed(1)
    : "-";

  const totalRegisteredUsers = Object.keys(users || {}).length;

  const hotCam = cameras.reduce((best, c) => {
    const cnt = orders.filter(o => {
      if (o.status === "cancelled") return false;
      if (o.cameras) return o.cameras.some(cam => cam.id === c.id);
      return o.cameraId === c.id;
    }).length;
    return cnt > (best.cnt || 0) ? { ...c, cnt } : best;
  }, {});

  return (
    <div>
      <STitle c="Dashboard tổng quan" />
      
      {/* Grid Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { l: "Doanh thu hôm nay", v: fmtVND(todayRev), c: "#22c55e", icon: "💰" },
          { l: "Doanh thu tháng", v: fmtVND(monthRev), c: G, icon: "📈" },
          { l: "Đơn đang xử lý", v: activeCount, c: "#60a5fa", icon: "📦" },
          { l: "Đơn mới (chưa xem)", v: unseenCount, c: "#ef4444", icon: "🔔" },
          { l: "Đánh giá trung bình", v: avgRating === "-" ? "-" : `${avgRating} ★`, c: G, icon: "⭐" },
          { l: "Tổng feedback", v: feedbacks.length, c: "#a78bfa", icon: "💬" },
          { l: "Chờ duyệt feedback", v: feedbacks.filter(f => f.status === "pending").length, c: "#f59e0b", icon: "⏳" },
          { l: "Khách đăng ký", v: totalRegisteredUsers, c: "#38bdf8", icon: "👥" },
        ].map(s => (
          <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 14, padding: "20px 18px" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ color: MUT, fontSize: 11, marginTop: 5 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Doanh thu Chart */}
        <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
          <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>Doanh thu theo tháng</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR2} />
              <XAxis dataKey="m" tick={{ fill: MUT, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUT, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(1) + "M"} />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 10, color: TXT, fontSize: 12 }} formatter={v => [fmtVND(v), "Doanh thu"]} />
              <Bar dataKey="v" fill={G} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hot cam & Inventory summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 18, flex: 1 }}>
            <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>MÁY HOT NHẤT</div>
            {hotCam.name ? (
              <div>
                <div style={{ fontSize: 30, marginBottom: 6 }}>{hotCam.icon || "📷"}</div>
                <div style={{ color: G, fontWeight: 700, fontSize: 14 }}>{hotCam.name}</div>
                <div style={{ color: MUT, fontSize: 11, marginTop: 4 }}>{hotCam.cnt} đơn đã thuê</div>
              </div>
            ) : <div style={{ color: MUT, fontSize: 12 }}>Chưa có dữ liệu</div>}
          </div>
          <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 18, flex: 1 }}>
            <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>TRẠNG THÁI KHO MÁY</div>
            {(() => {
              const activeOrdersToday = orders.filter(o => ["pending", "confirmed", "active"].includes(o.status) && isDateInOrder(todayDate, o));
              const rentedIds = new Set(activeOrdersToday.flatMap(o => o.cameras ? o.cameras.map(c => c.id) : [o.cameraId]));
              const rentedNow = cameras.filter(c => rentedIds.has(c.id)).length;
              return [
                ["Còn máy", cameras.filter(c => c.status === "available").length, "#22c55e"],
                ["Đang thuê hôm nay", rentedNow, "#f59e0b"],
                ["Bảo trì / Hết máy", cameras.filter(c => c.status === "unavailable").length, "#ef4444"]
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BR2}` }}>
                  <span style={{ color: MUT, fontSize: 11 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 700, fontSize: 12 }}>{v}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>Đơn gần đây</div>
          <button onClick={() => setTab("orders")} style={{ background: "none", border: "none", color: G, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Xem tất cả →</button>
        </div>
        {orders.slice(0, 5).map(o => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BR2}`, flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={{ color: !o.seen ? "#60a5fa" : TXT, fontWeight: !o.seen ? 800 : 600, fontSize: 13, fontFamily: "monospace" }}>{o.id}</span>
              {!o.seen && <span style={{ marginLeft: 6, background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>MỚI</span>}
              <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>{o.name} · {o.cameraName} · {fmtVND(o.total)}</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: (STATUS_CFG[o.status]?.color || "#888") + "15", color: STATUS_CFG[o.status]?.color || "#888", border: `1px solid ${(STATUS_CFG[o.status]?.color || "#888")}22` }}>
              {STATUS_CFG[o.status]?.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
