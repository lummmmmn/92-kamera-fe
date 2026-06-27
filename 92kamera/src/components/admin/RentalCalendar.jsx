import React, { useState } from "react";
import { G, MUT, TXT, BR, BR2, CARD, CARD2, RED, STATUS_CFG } from "../../lib/constants.js";
import { todayStr, dateAddDays, isDateInOrder, fmtDays, fmtVND } from "../../utils/format.js";
import { getAvailability, getItemStatus } from "../../utils/availability.js";

const CAM_PALETTE = ["#2E2E2E", "#e05252", "#52a8e0", "#52e0a8", "#e0a852", "#a852e0", "#e05299", "#52e052"];

export default function RentalCalendar({ orders, cameras }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDay, setSelDay] = useState(() => now.getDate());
  const { y, m } = cur;

  const camColorMap = {};
  cameras.forEach((c, i) => {
    camColorMap[c.id] = CAM_PALETTE[i % CAM_PALETTE.length];
  });

  const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = new Date(y, m, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const todayDate = todayStr();

  const activeOrders = orders.filter(o => !["cancelled", "completed"].includes(o.status));

  const getDay = (day) => {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return activeOrders.filter(o => isDateInOrder(ds, o));
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const selDateStr = selDay ? `${y}-${String(m + 1).padStart(2, "0")}-${String(selDay).padStart(2, "0")}` : null;
  const selOrders = selDay ? getDay(selDay) : [];

  // Pre-compute trạng thái tồn kho theo spec §4+§5 — morning/afternoon riêng từng camera
  const dayAvailMap = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const camAvails = cameras.map(c => {
      const { morning, afternoon } = getAvailability(c.id, c.qty || 1, orders, ds);
      return { morning, afternoon, status: getItemStatus(morning, afternoon) };
    });
    const allFull = cameras.length > 0 && camAvails.every(a => a.status === "hết");
    const hasLow = !allFull && camAvails.some(a => a.status !== "trống");
    const qtys = camAvails.map(a => Math.min(a.morning, a.afternoon));
    const morningQtys = camAvails.map(a => a.morning);
    const afternoonQtys = camAvails.map(a => a.afternoon);
    dayAvailMap[ds] = { camAvails, qtys, morningQtys, afternoonQtys, allFull, hasLow };
  }

  const navBtn = {
    background: CARD,
    border: `1px solid ${BR}`,
    color: TXT,
    padding: "6px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "system-ui,sans-serif",
  };

  return (
    <div>
      {/* Header + nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>📅 Lịch thuê máy</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={navBtn} onClick={() => { setCur(p => { const d = new Date(p.y, p.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; }); setSelDay(null); }}>◀</button>
          <span style={{ color: G, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", minWidth: 160, textAlign: "center" }}>
            {monthLabel}{selDay ? <span style={{ color: MUT, fontSize: 11, fontWeight: 400 }}> · {selDay}/{m + 1}</span> : ""}
          </span>
          <button style={navBtn} onClick={() => { setCur(p => { const d = new Date(p.y, p.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; }); setSelDay(null); }}>▶</button>
          <button style={{ ...navBtn, color: G, borderColor: G + "44" }} onClick={() => { setCur({ y: now.getFullYear(), m: now.getMonth() }); setSelDay(now.getDate()); }}>Hôm nay</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: MUT, padding: "5px 0", fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ minHeight: 60 }} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayOrders = getDay(day);
          const isToday = ds === todayDate;
          const isSel = selDay === day;
          const isPast = ds < todayDate;
          const avail = dayAvailMap[ds] || { hasLow: false, allFull: false };
          const { hasLow: hasFullCam, allFull } = avail;
          return (
            <div key={day} onClick={() => setSelDay(isSel ? null : day)}
              style={{ minHeight: 60, borderRadius: 10, background: isSel ? "#FFF8ED" : allFull ? "#FEF0F0" : CARD, border: `1px solid ${isSel ? G : isToday ? G + "55" : allFull ? "#cc333333" : BR}`, padding: "6px 8px", cursor: "pointer", transition: "border .15s", opacity: isPast && !dayOrders.length ? 0.4 : 1 }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? G : TXT, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>
                {day}{isToday && <span style={{ fontSize: 7, marginLeft: 3, color: G }}>●</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {dayOrders.slice(0, 6).map((o, j) => {
                  const cid = o.cameras?.[0]?.id || o.cameraId;
                  return <div key={j} style={{ width: 8, height: 8, borderRadius: 2, background: camColorMap[cid] || G, flexShrink: 0 }} />;
                })}
                {dayOrders.length > 6 && <span style={{ fontSize: 8, color: MUT, lineHeight: "8px" }}>+{dayOrders.length - 6}</span>}
              </div>
              {allFull && !isPast && (
                <div style={{ fontSize: 7, color: "#cc3333", fontWeight: 700, fontFamily: "system-ui,sans-serif", marginTop: 2, letterSpacing: 0.5 }}>HẾT</div>
              )}
              {!allFull && hasFullCam && !isPast && (
                <div style={{ fontSize: 7, color: "#f59e0b", fontWeight: 700, fontFamily: "system-ui,sans-serif", marginTop: 2, letterSpacing: 0.5 }}>CÒN ÍT</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selDay && (
        <div style={{ marginTop: 20, background: CARD, border: `1px solid ${BR}`, borderRadius: 14, padding: 16 }}>
          <div style={{ color: G, fontSize: 12, fontWeight: 700, marginBottom: 12, fontFamily: "system-ui,sans-serif" }}>
            📅 Ngày {selDay}/{m + 1}/{y} — {selOrders.length} đơn
          </div>
          {selOrders.length === 0
            ? <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Không có đơn nào ngày này</div>
            : selOrders.map(o => {
              const cid = o.cameras?.[0]?.id || o.cameraId;
              const col = camColorMap[cid] || G;
              const cfg = STATUS_CFG[o.status] || { label: o.status, color: "#888" };
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BR}` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: col, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: TXT, fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>{o.cameraName} · {o.name}</div>
                    <div style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", marginTop: 2 }}>
                      {o.id} · {o.date} → {dateAddDays(o.date, o.days)} · {fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}
                    </div>
                  </div>
                  <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44`, whiteSpace: "nowrap", flexShrink: 0 }}>{cfg.label}</span>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 18, padding: "12px 14px", background: CARD2, borderRadius: 12, border: `1px solid ${BR}` }}>
        <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          CHÚ THÍCH{selDateStr ? ` · ${selDay}/${m + 1}/${y}` : " · Tổng kho"}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {cameras.map((c, i) => {
            let statusLabel, morning, afternoon;
            if (selDateStr && dayAvailMap[selDateStr]) {
              const a = dayAvailMap[selDateStr].camAvails[i];
              morning = a?.morning ?? 0;
              afternoon = a?.afternoon ?? 0;
              statusLabel = getItemStatus(morning, afternoon, c.qty || 1);
            } else {
              morning = afternoon = c.qty || 1;
              statusLabel = "trống";
            }
            const statusColor = statusLabel === "hết" ? RED : statusLabel === "còn ít" ? "#f59e0b" : "#22c55e";
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: CARD, border: `1px solid ${BR}`, borderRadius: 10, padding: "5px 10px" }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: CAM_PALETTE[i % CAM_PALETTE.length], flexShrink: 0 }} />
                <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>{c.name}</span>
                {selDateStr ? (
                  <span style={{ color: statusColor, fontSize: 10, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                    🌅{morning} · 🌇{afternoon}
                  </span>
                ) : (
                  <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700 }}>({c.qty || 1} máy)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
