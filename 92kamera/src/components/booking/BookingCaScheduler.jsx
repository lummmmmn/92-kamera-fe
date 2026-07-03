import { useState } from "react";
import { G, MUT, TXT, CA_SHIFTS, DAY_COUNT_PRESETS } from "../../lib/constants.js";
import { todayStr, hourToCaIdx, hourToCaIdxReturn } from "../../utils/format.js";
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

const addDaysLocal = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const diffDaysLocal = (d1, d2) => {
  const t1 = new Date(d1 + "T00:00:00");
  const t2 = new Date(d2 + "T00:00:00");
  return Math.round((t2 - t1) / 86400000);
};

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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
  const returnCaIdx = returnHour != null ? hourToCaIdxReturn(returnHour) : null;

  const pickWarning = pickDate && pickCaIdx ? getAdjacentCaWarning(camsList, activeOrds, pickDate, pickCaIdx) : null;
  const returnWarning =
    caSchedule && returnCaIdx ? getAdjacentCaWarning(camsList, activeOrds, caSchedule.returnDate, returnCaIdx) : null;

  const [editingPick, setEditingPick] = useState(false);
  const [editingReturn, setEditingReturn] = useState(false);
  const [pickHourDraft, setPickHourDraft] = useState("");
  const [returnHourDraft, setReturnHourDraft] = useState("");

  const commitPickHour = () => {
    let n = parseInt(pickHourDraft);
    if (isNaN(n)) n = pickHour ?? 7;
    // Shop chỉ mở cửa 07:00–20:00 → kẹp giờ nhận trong khung này
    n = Math.min(20, Math.max(7, n));
    setPickHour(n);
    setEditingPick(false);
  };
  const commitReturnHour = () => {
    let n = parseInt(returnHourDraft);
    if (isNaN(n)) n = returnHour ?? 20;
    if (n > 20) {
      // Vượt quá giờ đóng cửa (20:00, hết Ca 3) → tự động lùi sang Ca 1 (07:00) ngày hôm sau
      setNumDays((numDays || 1) + 1);
      setReturnHour(7);
    } else if (n < 7) {
      setReturnHour(7);
    } else {
      setReturnHour(n);
    }
    setEditingReturn(false);
  };

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

  return (
    <div style={{ marginBottom: 16 }}>
      <CaGridMode
        pickDate={pickDate}
        setPickDate={setPickDate}
        pickHour={pickHour}
        setPickHour={setPickHour}
        numDays={numDays}
        setNumDays={setNumDays}
        returnHour={returnHour}
        setReturnHour={setReturnHour}
        getCaStatus={getCaStatus}
        caSchedule={caSchedule}
      />

      {(pickWarning || returnWarning) && (
        <div style={{ marginBottom: 10 }}>
          {pickWarning && (
            <div style={{ marginBottom: 6, padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
              {pickWarning}
            </div>
          )}
          {returnWarning && (
            <div style={{ padding: "9px 12px", background: "#FFF7E6", border: "1px solid #f59e0b55", borderRadius: 12, color: "#92600a", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
              {returnWarning}
            </div>
          )}
        </div>
      )}

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#666", fontSize: 10.5, fontFamily: "system-ui,sans-serif" }}>📦 Nhận máy</span>
                {!editingPick && (
                  <span
                    onClick={() => { setPickHourDraft(String(pickHour)); setEditingPick(true); }}
                    style={{ color: G, fontSize: 10.5, cursor: "pointer", fontFamily: "system-ui,sans-serif" }}
                  >
                    ✎ sửa giờ
                  </span>
                )}
              </div>
              {editingPick ? (
                <input
                  type="number"
                  min={0}
                  max={23}
                  autoFocus
                  value={pickHourDraft}
                  onChange={(e) => setPickHourDraft(e.target.value)}
                  onBlur={commitPickHour}
                  onKeyDown={(e) => e.key === "Enter" && commitPickHour()}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: `1px solid ${G}`, fontSize: 16, fontWeight: 700, color: G, marginBottom: 4, fontFamily: "system-ui,sans-serif" }}
                />
              ) : (
                <div style={{ color: G, fontWeight: 800, fontSize: 18, fontFamily: "system-ui,sans-serif", lineHeight: 1, marginBottom: 4 }}>
                  {String(pickHour).padStart(2, "0")}:00
                </div>
              )}
              <div style={{ color: "#aaa", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                {pickDate.split("-").reverse().join("/")}
              </div>
              {caBadge(caSchedule.pickCaIdx)}
            </div>
            <div style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.70)", borderRadius: 14, padding: "12px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#666", fontSize: 10.5, fontFamily: "system-ui,sans-serif" }}>📅 Trả máy</span>
                {!editingReturn && (
                  <span
                    onClick={() => { setReturnHourDraft(String(returnHour)); setEditingReturn(true); }}
                    style={{ color: G, fontSize: 10.5, cursor: "pointer", fontFamily: "system-ui,sans-serif" }}
                  >
                    ✎ sửa giờ
                  </span>
                )}
              </div>
              {editingReturn ? (
                <input
                  type="number"
                  min={0}
                  max={23}
                  autoFocus
                  value={returnHourDraft}
                  onChange={(e) => setReturnHourDraft(e.target.value)}
                  onBlur={commitReturnHour}
                  onKeyDown={(e) => e.key === "Enter" && commitReturnHour()}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: `1px solid ${G}`, fontSize: 16, fontWeight: 700, color: G, marginBottom: 4, fontFamily: "system-ui,sans-serif" }}
                />
              ) : (
                <div style={{ color: G, fontWeight: 800, fontSize: 18, fontFamily: "system-ui,sans-serif", lineHeight: 1, marginBottom: 4 }}>
                  {String(returnHour).padStart(2, "0")}:00
                </div>
              )}
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

// ═══════════════════ CHẾ ĐỘ 1: LƯỚI NGÀY × CA (kiểu baylahome) ═══════════════════
function CaGridMode({ pickDate, setPickDate, pickHour, setPickHour, numDays, setNumDays, returnHour, setReturnHour, getCaStatus, caSchedule }) {
  const [daysToShow, setDaysToShow] = useState(14);
  // Đánh dấu khách ĐÃ bấm ít nhất 1 ô trong lưới này chưa. Không dựa vào pickHour/pickDate của
  // props vì các giá trị đó có thể đã được set sẵn từ bước quick-select trước đó — nếu dựa vào
  // đó thì cú bấm ĐẦU TIÊN của khách trong lưới sẽ bị hiểu nhầm là "chọn điểm TRẢ" (khiến phải
  // bấm tới ô thứ 2 mới ra đúng kết quả). Luôn coi ô đầu tiên khách bấm trong lưới là 1 ca mới.
  const [pickedInGrid, setPickedInGrid] = useState(false);
  const today = todayStr();

  const pickCaIdx = pickHour != null ? hourToCaIdx(pickHour) : null;
  const returnDate = caSchedule?.returnDate || (pickDate ? addDaysLocal(pickDate, Math.max(1, Math.round(numDays || 1)) - 1) : null);
  const returnCaIdx = returnHour != null ? hourToCaIdxReturn(returnHour) : null;

  // Set các {date,ca} nằm trong khoảng đang chọn (để tô "Đang chọn" toàn bộ dải, không chỉ 2 đầu)
  const includedSet = new Set((caSchedule?.schedule || []).map((s) => `${s.date}_${s.ca}`));

  const cellOrder = (date, caIdx) => `${date}_${String(caIdx).padStart(1, "0")}`;

  const handleCellClick = (date, caIdx, status) => {
    if (status === "full") return;
    const c = CA_SHIFTS[caIdx - 1];
    const { startHour, endHour } = parseCaHours(c);

    // Ô đầu tiên khách bấm trong lưới → luôn là điểm NHẬN mới, tính đúng 1 ca, không cần bấm ô thứ 2
    if (!pickedInGrid) {
      setPickedInGrid(true);
      setPickDate(date);
      setPickHour(startHour);
      setNumDays(1);
      setReturnHour(endHour);
      return;
    }

    const clickedOrder = cellOrder(date, caIdx);
    const pickOrder = cellOrder(pickDate, pickCaIdx);

    // Bấm lại đúng ô đang là điểm nhận (và chưa có điểm trả khác) → bỏ chọn
    if (clickedOrder === pickOrder && returnDate === pickDate && returnCaIdx === pickCaIdx) {
      setPickedInGrid(false);
      setPickDate("");
      setPickHour(null);
      setReturnHour(null);
      setNumDays(1);
      return;
    }

    if (clickedOrder < pickOrder) {
      // Bấm ô trước điểm nhận hiện tại → coi như chọn lại điểm NHẬN mới (1 ca)
      setPickDate(date);
      setPickHour(startHour);
      setNumDays(1);
      setReturnHour(endHour);
    } else {
      // Bấm ô từ điểm nhận trở đi → đây là điểm TRẢ, tính đúng ca liên tục từ nhận tới trả
      const nDays = diffDaysLocal(pickDate, date) + 1;
      setNumDays(nDays);
      setReturnHour(endHour);
    }
  };

  const dates = Array.from({ length: daysToShow }, (_, i) => addDaysLocal(today, i));
  const MAX_DAYS_SHOW = 365; // xem được xa tới 1 năm sau

  const handleGridScroll = (e) => {
    const el = e.target;
    if (daysToShow >= MAX_DAYS_SHOW) return;
    // Gần chạm đáy danh sách (còn ~80px) → tự động tải thêm 14 ngày, khách không cần bấm nút
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setDaysToShow((n) => Math.min(MAX_DAYS_SHOW, n + 14));
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={sectionLabel}>CHỌN NGÀY & CA — bấm ô để chọn NHẬN, bấm ô tiếp theo để chọn TRẢ</div>

      <div
        style={{
          background: "rgba(255,255,255,0.40)",
          border: "1px solid rgba(255,255,255,0.62)",
          borderRadius: 14,
          padding: "10px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Header cột */}
        <div style={{ display: "grid", gridTemplateColumns: "68px repeat(3,1fr)", gap: 4, marginBottom: 6, paddingLeft: 2 }}>
          <div />
          {CA_SHIFTS.map((c) => {
            const { startHour, endHour } = parseCaHours(c);
            return (
              <div key={c.key} style={{ textAlign: "center", fontSize: 9.5, color: MUT, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
                {c.short}
                <div style={{ fontSize: 8.5, fontWeight: 400, opacity: 0.8 }}>
                  {String(startHour).padStart(2, "0")}:00-{String(endHour).padStart(2, "0")}:00
                </div>
              </div>
            );
          })}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 340, overflowY: "auto" }} onScroll={handleGridScroll}>
          {dates.map((ds) => {
            const d = new Date(ds + "T00:00:00");
            const wd = WEEKDAY_SHORT[d.getDay()];
            const dm = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
            const isTodayRow = ds === today;

            return (
              <div key={ds} style={{ display: "grid", gridTemplateColumns: "68px repeat(3,1fr)", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <div style={{ fontSize: 10.5, color: isTodayRow ? G : TXT, fontWeight: isTodayRow ? 700 : 500, fontFamily: "system-ui,sans-serif" }}>
                  {wd} {dm}
                </div>
                {[1, 2, 3].map((caIdx) => {
                  const status = getCaStatus(ds, caIdx);
                  const isIncluded = includedSet.has(`${ds}_ca${caIdx}`);
                  const isPickCell = ds === pickDate && caIdx === pickCaIdx;
                  const isReturnCell = ds === returnDate && caIdx === returnCaIdx;

                  let bg, border;
                  if (isIncluded || isPickCell || isReturnCell) {
                    bg = G;
                    border = G;
                  } else if (status === "full") {
                    bg = "#ef4444cc";
                    border = "#ef4444";
                  } else if (status === "low") {
                    bg = "#fde68a";
                    border = "#f59e0b";
                  } else {
                    bg = "rgba(255,255,255,0.55)";
                    border = "rgba(0,0,0,0.12)";
                  }

                  return (
                    <button
                      key={caIdx}
                      onClick={() => handleCellClick(ds, caIdx, status)}
                      disabled={status === "full"}
                      title={status === "full" ? "Hết máy" : ""}
                      style={{
                        height: 26,
                        borderRadius: 7,
                        background: bg,
                        border: `1px solid ${border}`,
                        cursor: status === "full" ? "not-allowed" : "pointer",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {daysToShow < MAX_DAYS_SHOW && (
          <button
            onClick={() => setDaysToShow((n) => Math.min(MAX_DAYS_SHOW, n + 14))}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "8px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.62)",
              background: "rgba(255,255,255,0.35)",
              color: MUT,
              fontSize: 11,
              fontFamily: "system-ui,sans-serif",
              cursor: "pointer",
            }}
          >
            Xem thêm ngày ▾
          </button>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", paddingLeft: 2 }}>
          {[
            ["rgba(255,255,255,0.70)", "rgba(0,0,0,0.20)", "Còn trống"],
            ["#fde68a", "#f59e0b", "Còn ít"],
            ["#ef4444cc", "#ef4444", "Hết máy"],
            [G, G, "Đang chọn"],
          ].map(([bg, bd, lbl]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${bd}` }} />
              <span style={{ color: MUT, fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SỐ NGÀY THUÊ — hiện lại để khách chỉnh nhanh nếu muốn, đồng bộ 2 chiều với lưới */}
      {pickDate && (
        <div style={{ marginTop: 10 }}>
          <div style={sectionLabel}>SỐ NGÀY THUÊ</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {DAY_COUNT_PRESETS.map((d) => (
              <button
                key={d}
                onClick={() => setNumDays(d)}
                style={hourBtnStyle(numDays === d)}
              >
                {d} ngày
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

