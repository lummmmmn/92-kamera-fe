import { useState } from "react";
import BookingCalendar from "./BookingCalendar.jsx";
import { G, MUT, TXT, CA_SHIFTS, PICKUP_HOUR_PRESETS, RETURN_HOUR_PRESETS, DAY_COUNT_PRESETS } from "../../lib/constants.js";
import { todayStr, hourToCaIdx } from "../../utils/format.js";
import { getAdjacentCaWarning } from "../../utils/availability.js";

const sectionLabel = {
  color: "#555",
  fontSize: 9,
  letterSpacing: 1.5,
  marginBottom: 8,
  fontFamily: "system-ui,sans-serif",
  fontWeight: 600,
};

const hourBtnStyle = (active) => ({
  padding: "10px 4px",
  background: active ? "rgba(255,248,237,0.85)" : "rgba(255,255,255,0.40)",
  color: active ? G : MUT,
  border: `1px solid ${active ? G : "rgba(255,255,255,0.62)"}`,
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "system-ui,sans-serif",
  fontWeight: active ? 700 : 400,
  transition: "all .2s",
  textAlign: "center",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
});

const caBadge = (caIdx) => {
  const c = CA_SHIFTS[caIdx - 1];
  if (!c) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 10,
        background: c.color + "22",
        border: `1px solid ${c.color}66`,
        color: c.color,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "system-ui,sans-serif",
        marginTop: 6,
      }}
    >
      {c.short} — {c.label.split("—")[1]?.trim() || ""} ({c.time})
    </div>
  );
};

export default function BookingCaScheduler({
  pickDate,
  setPickDate,
  pickHour,
  setPickHour,
  numDays,
  setNumDays,
  returnHour,
  setReturnHour,
  selectedCamList,
  selCams,
  liveOrdersForCheck,
  caSchedule, // { schedule, totalCa, pickCaIdx, returnCaIdx, returnDate } | null
}) {
  const camsList = selectedCamList.map((c) => ({ id: c.id, qty: selCams[c.id] || 1, camQty: c.qty || 1 }));
  const activeOrds = (liveOrdersForCheck || []).filter((o) => !["cancelled", "completed"].includes(o.status));

  const pickCaIdx = pickHour != null ? hourToCaIdx(pickHour) : null;
  const returnCaIdx = returnHour != null ? hourToCaIdx(returnHour) : null;

  const pickWarning = pickDate && pickCaIdx ? getAdjacentCaWarning(camsList, activeOrds, pickDate, pickCaIdx) : null;
  const returnWarning =
    caSchedule && returnCaIdx ? getAdjacentCaWarning(camsList, activeOrds, caSchedule.returnDate, returnCaIdx) : null;

  const [pickCustomOpen, setPickCustomOpen] = useState(false);
  const [returnCustomOpen, setReturnCustomOpen] = useState(false);
  const [dayCustomOpen, setDayCustomOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* NGÀY NHẬN */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>NGÀY NHẬN</div>
        <BookingCalendar
          selectedCams={camsList}
          orders={liveOrdersForCheck}
          pickDate={pickDate}
          setPickDate={setPickDate}
          numDays={numDays}
        />
      </div>

      {/* GIỜ NHẬN */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>GIỜ NHẬN (07:00 – 20:00)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 6 }}>
          {PICKUP_HOUR_PRESETS.map((h) => (
            <button
              key={h}
              onClick={() => {
                setPickHour(h);
                setPickCustomOpen(false);
              }}
              style={hourBtnStyle(pickHour === h && !pickCustomOpen)}
            >
              {String(h).padStart(2, "0")}:00
            </button>
          ))}
          <button
            onClick={() => setPickCustomOpen(true)}
            style={hourBtnStyle(pickCustomOpen)}
          >
            Khác
          </button>
        </div>
        {pickCustomOpen && (
          <input
            type="number"
            min={7}
            max={20}
            placeholder="Nhập giờ (7-20)"
            value={PICKUP_HOUR_PRESETS.includes(pickHour) ? "" : pickHour ?? ""}
            onChange={(e) => setPickHour(e.target.value === "" ? null : Math.min(20, Math.max(7, parseInt(e.target.value) || 7)))}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.62)",
              background: "rgba(255,255,255,0.5)",
              color: TXT,
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              outline: "none",
            }}
          />
        )}
        {pickCaIdx && caBadge(pickCaIdx)}
        {pickWarning && (
          <div style={{ marginTop: 8, padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
            {pickWarning}
          </div>
        )}
      </div>

      {/* SỐ NGÀY THUÊ */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>SỐ NGÀY THUÊ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {DAY_COUNT_PRESETS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setNumDays(d);
                setDayCustomOpen(false);
              }}
              style={hourBtnStyle(numDays === d && !dayCustomOpen)}
            >
              {d} ngày
            </button>
          ))}
          <button onClick={() => setDayCustomOpen(true)} style={hourBtnStyle(dayCustomOpen)}>
            Khác
          </button>
        </div>
        {dayCustomOpen && (
          <input
            type="number"
            min={1}
            placeholder="Nhập số ngày"
            value={DAY_COUNT_PRESETS.includes(numDays) ? "" : numDays ?? ""}
            onChange={(e) => setNumDays(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.62)",
              background: "rgba(255,255,255,0.5)",
              color: TXT,
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              outline: "none",
            }}
          />
        )}
      </div>

      {/* GIỜ TRẢ */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>GIỜ TRẢ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {RETURN_HOUR_PRESETS.map((h) => (
            <button
              key={h}
              onClick={() => {
                setReturnHour(h);
                setReturnCustomOpen(false);
              }}
              style={hourBtnStyle(returnHour === h && !returnCustomOpen)}
            >
              {String(h).padStart(2, "0")}:00
            </button>
          ))}
          <button onClick={() => setReturnCustomOpen(true)} style={hourBtnStyle(returnCustomOpen)}>
            Khác
          </button>
        </div>
        {returnCustomOpen && (
          <input
            type="number"
            min={7}
            max={20}
            placeholder="Nhập giờ (7-20)"
            value={RETURN_HOUR_PRESETS.includes(returnHour) ? "" : returnHour ?? ""}
            onChange={(e) => setReturnHour(e.target.value === "" ? null : Math.min(20, Math.max(7, parseInt(e.target.value) || 20)))}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.62)",
              background: "rgba(255,255,255,0.5)",
              color: TXT,
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              outline: "none",
            }}
          />
        )}
        {returnCaIdx && caBadge(returnCaIdx)}
        {returnWarning && (
          <div style={{ marginTop: 8, padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
            {returnWarning}
          </div>
        )}
      </div>

      {/* LỊCH CA ĐÃ CHỌN */}
      {caSchedule && caSchedule.totalCa > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={sectionLabel}>LỊCH CA ĐÃ CHỌN</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CA_SHIFTS.map((c) => {
              const included = caSchedule.schedule.some((s) => s.ca === c.key);
              return (
                <div
                  key={c.key}
                  style={{
                    flex: "1 1 90px",
                    textAlign: "center",
                    padding: "10px 8px",
                    borderRadius: 12,
                    background: included ? G + "22" : "rgba(255,255,255,0.30)",
                    border: `1px solid ${included ? G : "rgba(255,255,255,0.5)"}`,
                    opacity: included ? 1 : 0.5,
                  }}
                >
                  <div style={{ color: included ? G : MUT, fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{c.short}</div>
                  <div style={{ color: included ? G + "cc" : MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginTop: 2 }}>{c.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TÓM TẮT NHẬN / TRẢ */}
      {caSchedule && caSchedule.totalCa > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.40)",
            border: "1px solid rgba(255,255,255,0.58)",
            borderRadius: 16,
            padding: "14px 14px",
            marginBottom: 14,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.70)", borderRadius: 14, padding: "12px 12px" }}>
              <div style={{ color: "#666", fontSize: 10.5, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>📦 Nhận máy</div>
              <div style={{ color: G, fontWeight: 800, fontSize: 18, fontFamily: "system-ui,sans-serif", lineHeight: 1, marginBottom: 4 }}>
                {String(pickHour).padStart(2, "0")}:00
              </div>
              <div style={{ color: "#aaa", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                {pickDate.split("-").reverse().join("/")}
              </div>
              {caBadge(caSchedule.pickCaIdx)}
            </div>
            <div style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.70)", borderRadius: 14, padding: "12px 12px" }}>
              <div style={{ color: "#666", fontSize: 10.5, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>📅 Trả máy</div>
              <div style={{ color: G, fontWeight: 800, fontSize: 18, fontFamily: "system-ui,sans-serif", lineHeight: 1, marginBottom: 4 }}>
                {String(returnHour).padStart(2, "0")}:00
              </div>
              <div style={{ color: "#aaa", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                {caSchedule.returnDate.split("-").reverse().join("/")}
              </div>
              {caBadge(caSchedule.returnCaIdx)}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>⏱ Tổng số ca</span>
            <span style={{ color: G, fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>{caSchedule.totalCa} ca</span>
          </div>
        </div>
      )}

      {pickDate && numDays && pickHour != null && returnHour != null && (!caSchedule || caSchedule.totalCa === 0) && (
        <div style={{ marginBottom: 10, padding: "10px 14px", background: "rgba(255,220,220,0.80)", border: "1px solid #cc333366", borderRadius: 12, color: "#8B0000", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
          🚫 Giờ trả phải sau giờ nhận (khi thuê 1 ngày). Vui lòng chọn lại giờ trả hoặc tăng số ngày thuê.
        </div>
      )}
    </div>
  );
}

