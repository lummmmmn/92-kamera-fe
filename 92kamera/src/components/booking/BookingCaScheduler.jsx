import { useState } from "react";
import BookingCalendar from "./BookingCalendar.jsx";
import { G, MUT, TXT, CA_SHIFTS, DAY_COUNT_PRESETS } from "../../lib/constants.js";
import { todayStr, hourToCaIdx, dateAddDays } from "../../utils/format.js";
import { getAdjacentCaWarning, getAvailQtyByCa } from "../../utils/availability.js";

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

// Lấy giờ bắt đầu / kết thúc của 1 ca từ chuỗi c.time dạng "07:00–12:00"
const parseCaHours = (c) => {
  const parts = String(c.time).split(/[–-]/).map((s) => s.trim());
  const startHour = parseInt(parts[0]) || 0;
  const endHour = parseInt(parts[1]) || 0;
  return { startHour, endHour };
};

// Bảng màu theo trạng thái (đồng bộ với legend của BookingCalendar)
const CA_STATUS_STYLE = {
  ok: { bg: "rgba(255,255,255,0.55)", border: "rgba(0,0,0,0.16)", color: TXT, label: "" },
  low: { bg: "#fef3c7", border: "#f59e0b88", color: "#b45309", label: "Còn ít" },
  full: { bg: "#fee2e2", border: "#ef444499", color: "#b91c1c", label: "Hết máy" },
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

  const [dayCustomOpen, setDayCustomOpen] = useState(false);
  const [numDaysDraft, setNumDaysDraft] = useState(
    DAY_COUNT_PRESETS.includes(numDays) ? "" : numDays != null ? String(numDays) : ""
  );

  // Ngày trả dự kiến (chỉ phụ thuộc ngày nhận + số ngày, KHÔNG phụ thuộc giờ trả
  // → dùng để tô màu ca trả trước khi khách kịp chọn giờ trả)
  const n = Math.max(1, Math.round(numDays || 1));
  const provisionalReturnDate = pickDate ? dateAddDays(pickDate, n - 1) : null;
  const sameDayReturn = provisionalReturnDate === pickDate;

  // Trạng thái 1 ca (ok/low/full) cho 1 ngày cụ thể, dựa trên máy đã chọn
  const getCaStatus = (date, caIdx) => {
    if (!date || !camsList.length) return "ok";
    const caKey = `ca${caIdx}`;
    let anyFull = false;
    let anyLow = false;
    camsList.forEach(({ id, qty: need, camQty }) => {
      const avail = getAvailQtyByCa(id, camQty, activeOrds, date, caKey);
      if (avail < need) anyFull = true;
      else if (avail <= 1 && camQty > 1) anyLow = true;
    });
    return anyFull ? "full" : anyLow ? "low" : "ok";
  };

  const handlePickCa = (caIdx) => {
    const c = CA_SHIFTS[caIdx - 1];
    const { startHour } = parseCaHours(c);
    setPickHour(startHour);
    // Nếu khách đã chọn ca trả mà giờ không còn hợp lệ (thuê trong ngày, trả trước lúc nhận) → reset để chọn lại
    if (sameDayReturn && returnHour != null) {
      const curReturnCa = hourToCaIdx(returnHour);
      if (curReturnCa != null && curReturnCa < caIdx) {
        setReturnHour(null);
      }
    }
  };

  const handleReturnCa = (caIdx) => {
    const c = CA_SHIFTS[caIdx - 1];
    const { endHour } = parseCaHours(c);
    setReturnHour(endHour);
  };

  const renderCaBar = ({ caIdx, date, isSelectedIdx, isDisabledBeforeIdx, onSelect, disabledNoDate }) => {
    const c = CA_SHIFTS[caIdx - 1];
    const { startHour, endHour } = parseCaHours(c);
    const status = date ? getCaStatus(date, caIdx) : "ok";
    const isLockedByOrder = status === "full";
    const isLockedByTime = isDisabledBeforeIdx != null && caIdx < isDisabledBeforeIdx;
    const isDisabled = disabledNoDate || isLockedByOrder || isLockedByTime;
    const isSelected = isSelectedIdx === caIdx;

    let bg, border, color;
    if (isSelected) {
      bg = G + "2a";
      border = G;
      color = G;
    } else if (isLockedByTime) {
      bg = "rgba(0,0,0,0.05)";
      border = "rgba(0,0,0,0.10)";
      color = "#999";
    } else {
      const st = CA_STATUS_STYLE[status];
      bg = st.bg;
      border = st.border;
      color = st.color;
    }

    return (
      <button
        key={caIdx}
        disabled={isDisabled}
        onClick={() => !isDisabled && onSelect(caIdx)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderRadius: 12,
          background: bg,
          border: `1.5px solid ${border}`,
          color,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled && !isLockedByOrder ? 0.55 : 1,
          fontFamily: "system-ui,sans-serif",
          transition: "all .15s",
          marginBottom: 8,
          boxShadow: isSelected ? `0 0 0 2px ${G}33` : "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{c.short}</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {String(startHour).padStart(2, "0")}:00 – {String(endHour).padStart(2, "0")}:00
          </span>
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>
          {isSelected
            ? "✓ Đang chọn"
            : isLockedByOrder
            ? "Hết máy"
            : isLockedByTime
            ? "Trước giờ nhận"
            : status === "low"
            ? "Còn ít"
            : "Còn trống"}
        </span>
      </button>
    );
  };

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

      {/* CHỌN CA NHẬN MÁY */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>CHỌN CA NHẬN MÁY{!pickDate ? " (chọn ngày trước)" : ""}</div>
        {[1, 2, 3].map((caIdx) =>
          renderCaBar({
            caIdx,
            date: pickDate,
            isSelectedIdx: pickCaIdx,
            isDisabledBeforeIdx: null,
            onSelect: handlePickCa,
            disabledNoDate: !pickDate,
          })
        )}
        {pickWarning && (
          <div style={{ marginTop: 4, padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
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
                setNumDaysDraft("");
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
            value={numDaysDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setNumDaysDraft(raw);
              if (raw !== "" && !isNaN(parseInt(raw))) {
                setNumDays(parseInt(raw));
              }
            }}
            onBlur={() => {
              let val = parseInt(numDaysDraft);
              if (isNaN(val) || val < 1) val = 1;
              setNumDays(val);
              setNumDaysDraft(String(val));
            }}
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

      {/* CHỌN CA TRẢ MÁY */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionLabel}>
          CHỌN CA TRẢ MÁY{!pickDate ? " (chọn ngày nhận trước)" : ""}
          {pickDate && provisionalReturnDate && (
            <span style={{ fontWeight: 400, color: MUT, textTransform: "none", letterSpacing: 0 }}>
              {" "}
              — ngày {provisionalReturnDate.split("-").reverse().join("/")}
            </span>
          )}
        </div>
        {[1, 2, 3].map((caIdx) =>
          renderCaBar({
            caIdx,
            date: provisionalReturnDate,
            isSelectedIdx: returnCaIdx,
            isDisabledBeforeIdx: sameDayReturn ? pickCaIdx : null,
            onSelect: handleReturnCa,
            disabledNoDate: !pickDate,
          })
        )}
        {returnWarning && (
          <div style={{ marginTop: 4, padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
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
          🚫 Giờ trả phải sau giờ nhận (khi thuê 1 ngày). Vui lòng chọn lại ca trả hoặc tăng số ngày thuê.
        </div>
      )}
    </div>
  );
}
