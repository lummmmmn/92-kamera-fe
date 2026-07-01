import { useState, useRef } from "react";
import { G, TXT, MUT } from "../../lib/constants.js";
import { todayStr, dateAddDays } from "../../utils/format.js";
import { getDayCaStatus } from "../../utils/availability.js";

export default function BookingCalendar({ selectedCams, orders, pickDate, setPickDate, numDays }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { y, m } = cur;

  const firstDow = new Date(y, m, 1).getDay();
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = new Date(y, m, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const todayDate = todayStr();

  const activeOrders = orders.filter((o) => !["cancelled", "completed"].includes(o.status));

  // Trạng thái ngày = check cả 3 ca (vì chưa biết khách sẽ chọn giờ nhận nào)
  const getDayStatus = (day) => {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (ds < todayDate) return "past";
    if (!selectedCams.length) return "ok";
    return getDayCaStatus(selectedCams, activeOrders, ds);
  };

  // Range highlight (theo số ngày thuê dự kiến)
  const n = Math.max(1, Math.round(numDays || 1));
  const endDs = pickDate ? dateAddDays(pickDate, n - 1) : null;
  const getInRange = (day) => {
    if (!pickDate || n <= 1) return false;
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return ds > pickDate && ds < endDs;
  };
  const getIsEnd = (day) => {
    if (!endDs || n <= 1) return false;
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return ds === endDs;
  };

  // Ngày nào trong khoảng bị full cả 3 ca (chắc chắn không thuê được, kể cả ngày giữa cần trọn ngày)
  const rangeConflictDates = (() => {
    if (!pickDate || n <= 0 || !selectedCams.length) return [];
    const conflicts = [];
    for (let i = 0; i < n; i++) {
      const ds = dateAddDays(pickDate, i);
      if (getDayCaStatus(selectedCams, activeOrders, ds) === "full") conflicts.push(ds);
    }
    return conflicts;
  })();
  const rangeHasConflict = rangeConflictDates.length > 0;

  const statusStyle = (st, isStart, isInRange, isEnd, isRangeConflict) => {
    if (st === "past") return { bg: "transparent", border: "transparent", color: "#333", cursor: "default", shadow: "none", fw: 400 };
    if (st === "full") return { bg: "#fee2e2", border: "#ef444466", color: "#b91c1c", cursor: "not-allowed", shadow: "none", fw: 400 };
    if (isStart)
      return {
        bg: G + "33",
        border: rangeHasConflict ? "#cc3333" : G,
        color: rangeHasConflict ? "#e87878" : G,
        cursor: "pointer",
        shadow: rangeHasConflict ? `0 0 0 2px #cc333344` : `0 0 0 2px ${G}55, 0 0 16px ${G}44`,
        fw: 800,
      };
    if (isEnd) return { bg: G + "22", border: G + "bb", color: G, cursor: "default", shadow: `0 0 0 1px ${G}44, 0 0 10px ${G}33`, fw: 700 };
    if (isRangeConflict) return { bg: "#fee2e2", border: "#ef444466", color: "#b91c1c", cursor: "not-allowed", shadow: "none", fw: 600 };
    if (isInRange) return { bg: "#fef3c7", border: G + "55", color: G + "cc", cursor: "pointer", shadow: "none", fw: 500 };
    if (st === "low") return { bg: "#fef3c7", border: "#f59e0b88", color: "#b45309", cursor: "pointer", shadow: "none", fw: 400 };
    return { bg: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.65)", color: TXT, cursor: "pointer", shadow: "none", fw: 400 };
  };

  const touchMoved = useRef(false);
  const touchOrigin = useRef({ x: 0, y: 0 });

  const handleClick = (day, st, isRangeConflict, isEnd) => {
    if (touchMoved.current) return;
    if (st === "past" || st === "full" || isRangeConflict || isEnd) return;
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (ds === pickDate) {
      setPickDate("");
      return;
    }
    setPickDate(ds);
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const navBtn = {
    background: "rgba(255,255,255,0.45)",
    border: "1px solid rgba(255,255,255,0.65)",
    color: MUT,
    width: 28,
    height: 28,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.40)",
        border: "1px solid rgba(255,255,255,0.62)",
        borderRadius: 14,
        padding: "14px 12px",
        marginBottom: 14,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          style={navBtn}
          onClick={() =>
            setCur((p) => {
              const d = new Date(p.y, p.m - 1, 1);
              return { y: d.getFullYear(), m: d.getMonth() };
            })
          }
        >
          ◀
        </button>
        <span style={{ color: TXT, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>{monthLabel}</span>
        <button
          style={navBtn}
          onClick={() =>
            setCur((p) => {
              const d = new Date(p.y, p.m + 1, 1);
              return { y: d.getFullYear(), m: d.getMonth() };
            })
          }
        >
          ▶
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#555", padding: "3px 0", fontFamily: "system-ui,sans-serif" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}
        onTouchStart={(e) => {
          touchMoved.current = false;
          touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - touchOrigin.current.x;
          const dy = e.touches[0].clientY - touchOrigin.current.y;
          if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchMoved.current = true;
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const st = getDayStatus(day);
          const isStart = ds === pickDate;
          const isEnd = getIsEnd(day);
          const isInRange = getInRange(day);
          const isRangeConflict = !isStart && isInRange && rangeConflictDates.includes(ds);
          const { bg, border, color, cursor, shadow, fw } = statusStyle(st, isStart, isInRange, isEnd, isRangeConflict);
          const isToday = ds === todayDate;
          return (
            <div
              key={day}
              onClick={() => handleClick(day, st, isRangeConflict, isEnd)}
              style={{
                textAlign: "center",
                padding: "6px 2px",
                borderRadius: 5,
                background: bg,
                border: `1px solid ${border}`,
                color,
                cursor,
                fontSize: 11,
                fontFamily: "system-ui,sans-serif",
                fontWeight: isStart || isEnd || isInRange ? fw : isToday ? 700 : 400,
                position: "relative",
                transition: "all .1s",
                userSelect: "none",
                boxShadow: shadow,
              }}
            >
              {day}
              {isToday && !isStart && !isEnd && (
                <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: G }} />
              )}
              {(st === "full" || isRangeConflict) && (
                <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", fontSize: 6, color: "#cc3333" }}>✕</div>
              )}
              {isStart && (
                <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", fontSize: 7, color: rangeHasConflict ? "#cc3333" : G, fontWeight: 700 }}>
                  ▶
                </div>
              )}
              {isEnd && !rangeHasConflict && (
                <div style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", fontSize: 7, color: G, fontWeight: 700 }}>◀</div>
              )}
            </div>
          );
        })}
      </div>

      {rangeHasConflict && (
        <div style={{ marginTop: 10, padding: "9px 12px", background: "#FEF0F0", border: "1px solid #B0282844", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ color: "#ef4444", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
            Máy hết cả ngày <strong>{rangeConflictDates.map((d) => d.split("-")[2] + "/" + d.split("-")[1]).join(", ")}</strong> trong khoảng thuê này — vui lòng chọn ngày khác.
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {[
          ["rgba(255,255,255,0.70)", "rgba(0,0,0,0.20)", TXT, "Trống"],
          ["#fef3c7", "#f59e0b99", "#b45309", "Còn ít"],
          ["#fee2e2", "#ef444499", "#b91c1c", "Hết máy"],
          [G + "44", G, G, "Đang chọn"],
        ].map(([bg, bd, col, lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${bd}` }} />
            <span style={{ color: MUT, fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
