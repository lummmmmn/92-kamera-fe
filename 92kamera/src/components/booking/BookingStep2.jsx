import BookingCalendar from "./BookingCalendar.jsx";
import BookingAccessories from "./BookingAccessories.jsx";
import { G, MUT, TXT, BR, DURATIONS } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays, todayStr } from "../../utils/format.js";
import { getAvailQty, getAccAvailQty } from "../../utils/availability.js";

export default function BookingStep2({
  accessories,
  selAcc,
  toggleAcc,
  setAccQty,
  liveOrdersForCheck,
  selSession,
  pickDate,
  setPickDate,
  days,
  selectedCamList,
  selCams,
  totalCamSelected,
  accCost,
  camCost,
  subtotal,
  total,
  selDur,
  setSelDur,
  customDays,
  setCustomDays,
  appliedRental,
  appliedDelivery,
  rentalDiscountAmt,
  deliveryDiscountAmt,
  setStep,
  qtyBtn,
  inpS,
}) {
  const ri = days > 0 && (days !== 0.5 || selSession) ? returnInfoLocal() : null;

  function returnInfoLocal() {
    if (!pickDate || !days) return null;
    const fmtDate = (ds) => {
      const d = new Date(ds + "T00:00:00");
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    if (days === 0.5) {
      const isM = selSession === "morning";
      const isA = selSession === "afternoon";
      return {
        pickTime: isM ? "06:00" : isA ? "14:00" : "--:--",
        pickDate: fmtDate(pickDate),
        dropTime: isM ? "12:00" : isA ? "20:00" : "--:--",
        dropDate: fmtDate(pickDate),
        totalH: 6,
        totalLabel: "6 giờ (1 buổi)",
      };
    }

    const totalH = Math.ceil(days) * 24;
    const endDs = dateAddDays(pickDate, days);
    return {
      pickTime: "12:00",
      pickDate: fmtDate(pickDate),
      dropTime: "12:00",
      dropDate: fmtDate(endDs),
      totalH,
      totalLabel: `${totalH} giờ (${Math.ceil(days)} ngày)`,
    };
  }

  // ── Build dates to check ──
  const datesToCheck = [];
  if (days > 0 && pickDate) {
    if (days < 1) {
      datesToCheck.push(pickDate);
    } else {
      for (let i = 0; i < Math.ceil(days); i++) {
        datesToCheck.push(dateAddDays(pickDate, i));
      }
    }
  }
  const sess = selSession || "full";
  const activeOrds = liveOrdersForCheck.filter((o) => !["cancelled", "completed"].includes(o.status));

  // ── Check item stock ──
  const blockingItems = [];
  if (datesToCheck.length > 0 && days > 0 && selSession && pickDate) {
    selectedCamList.forEach((c) => {
      const needed = selCams[c.id] || 1;
      const minAvail = Math.min(...datesToCheck.map((d) => getAvailQty(c.id, c.qty || 1, activeOrds, d, sess)));
      if (minAvail < needed) {
        blockingItems.push({ name: c.name, avail: minAvail, needed, type: "📷 Máy", goBack: true });
      }
    });

    Object.entries(selAcc).forEach(([name, qty]) => {
      if (!qty || qty <= 0) return;
      const acc = accessories.find((a) => a.name === name);
      if (!acc) return;
      const minAvail = Math.min(...datesToCheck.map((d) => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
      if (minAvail < qty) {
        blockingItems.push({ name, avail: minAvail, needed: qty, type: "🎒 Phụ kiện" });
      }
    });
  }

  const daysOk = !!selDur || (days >= 1 && Math.abs(days * 2 - Math.round(days * 2)) <= 0.0001);
  const hasAccSelected = Object.values(selAcc).some((q) => (q || 0) > 0);
  const hasAnyItem = selectedCamList.length > 0 || hasAccSelected;
  const baseOk = days > 0 && daysOk && !!selSession && !!pickDate && hasAnyItem;
  const canGo = baseOk && blockingItems.length === 0;

  return (
    <div>
      <button
        onClick={() => setStep(1)}
        className="bk-back"
        style={{
          background: "none",
          border: "none",
          color: MUT,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "system-ui,sans-serif",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>← Quay lại</span>
      </button>

      <BookingAccessories
        accessories={accessories}
        selAcc={selAcc}
        toggleAcc={toggleAcc}
        setAccQty={setAccQty}
        liveOrdersForCheck={liveOrdersForCheck}
        selSession={selSession}
        pickDate={pickDate}
        days={days}
        selectedCamList={selectedCamList}
        selCams={selCams}
        totalCamSelected={totalCamSelected}
        accCost={accCost}
        qtyBtn={qtyBtn}
      />

      {/* RENTAL TIME */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#555", fontSize: 9, letterSpacing: 1.5, marginBottom: 8, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
          THỜI GIAN THUÊ
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3,1fr)`, gap: 6, marginBottom: 14 }}>
          {DURATIONS.map((d) => {
            const active = selDur?.days === d.days && selDur?.session === d.session;
            return (
              <button
                key={d.label}
                onClick={() => {
                  setSelDur(d);
                  setCustomDays("");
                }}
                style={{
                  padding: "11px 4px",
                  background: active ? "rgba(255,248,237,0.85)" : "rgba(255,255,255,0.40)",
                  color: active ? G : MUT,
                  border: `1px solid ${active ? G : "rgba(255,255,255,0.62)"}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "system-ui,sans-serif",
                  fontWeight: active ? 700 : 400,
                  transition: "all .2s",
                  textAlign: "center",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {d.label}
                {active && <div style={{ fontSize: 9, color: G + "cc", marginTop: 3 }}>✓ Đã chọn</div>}
              </button>
            );
          })}
        </div>

        {selSession && days === 0.5 && (
          <div
            style={{
              marginBottom: 14,
              background: "rgba(255,255,255,0.42)",
              border: "1px solid rgba(255,255,255,0.62)",
              borderRadius: 14,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: 20 }}>{selSession === "morning" ? "🌅" : "🌇"}</span>
            <div>
              <div style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                {selSession === "morning" ? "Ca Sáng: 6:00 – 12:00" : "Ca Chiều: 14:00 – 20:00"}
              </div>
              <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginTop: 2 }}>
                Phụ kiện theo ca này — check kho riêng
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#555", fontSize: 9, letterSpacing: 1.5, marginBottom: 6, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
            HOẶC NHẬP SỐ NGÀY (≥1, BỘI SỐ 0.5 — VD: 2.5)
          </div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...inpS, paddingRight: 50 }}
              type="number"
              min={1}
              step={0.5}
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setSelDur(null);
              }}
              placeholder="VD: 2.5"
            />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", pointerEvents: "none" }}>
              ngày
            </span>
          </div>
          {customDays !== "" && !selDur && (() => {
            const v = parseFloat(customDays);
            if (isNaN(v) || v <= 0)
              return <div style={{ marginTop: 6, color: "#C0290A", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>⚠️ Số ngày phải lớn hơn 0.</div>;
            if (v < 1)
              return (
                <div style={{ marginTop: 6, color: "#f59e0b", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                  ⚠️ Thuê theo buổi vui lòng bấm nút <b>Ca Sáng</b> hoặc <b>Ca Chiều</b> bên trên.
                </div>
              );
            if (Math.abs(v * 2 - Math.round(v * 2)) > 0.0001)
              return <div style={{ marginTop: 6, color: "#C0290A", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>⚠️ Số ngày phải theo bội số 0.5 (VD: 1, 1.5, 2).</div>;
            return null;
          })()}
        </div>
      </div>

      {/* CALENDAR & TIMING */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ color: "#555", fontSize: 9, letterSpacing: 1.5, marginBottom: 8, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
            CHỌN NGÀY BẮT ĐẦU
          </div>
          <div style={{ position: "relative" }}>
            <BookingCalendar
              selectedCams={selectedCamList.map((c) => ({ id: c.id, qty: selCams[c.id] || 1, camQty: c.qty || 1 }))}
              orders={liveOrdersForCheck}
              pickDate={pickDate}
              setPickDate={setPickDate}
              days={days}
              selSession={selSession}
            />
            {!selSession && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(6,6,6,0.72)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(3px)",
                  zIndex: 10,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⏰</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>
                    Chọn thời gian thuê trước
                  </div>
                  <div style={{ color: "#ccc", fontSize: 11, marginTop: 4, fontFamily: "system-ui,sans-serif" }}>
                    Ca sáng, ca chiều hoặc cả ngày
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ position: "relative", marginTop: 8, overflow: "hidden", borderRadius: 12 }}>
            <input
              style={{ ...inpS, fontSize: 12, WebkitAppearance: "none", appearance: "none" }}
              type="date"
              value={pickDate}
              min={todayStr()}
              onChange={(e) => setPickDate(e.target.value)}
            />
          </div>
        </div>

        {ri && (
          <div
            style={{
              background: "rgba(255,255,255,0.40)",
              border: "1px solid rgba(255,255,255,0.58)",
              borderRadius: 20,
              padding: "18px 16px",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14 }}>
              THỜI GIAN DỰ KIẾN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { icon: "📦", label: "Nhận máy", time: ri.pickTime, date: ri.pickDate },
                { icon: "📅", label: "Trả máy trước", time: ri.dropTime, date: ri.dropDate },
              ].map(({ icon, label, time, date }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.50)",
                    border: "1px solid rgba(255,255,255,0.70)",
                    borderRadius: 14,
                    padding: "12px 12px",
                  }}
                >
                  <div style={{ color: "#666", fontSize: 10.5, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
                    {icon} {label}
                  </div>
                  <div
                    style={{
                      color: G,
                      fontWeight: 800,
                      fontSize: 18,
                      fontFamily: "system-ui,sans-serif",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {time}
                  </div>
                  <div style={{ color: "#aaa", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{date}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>⏱ Tổng</span>
              <span style={{ color: G, fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>
                {ri.totalLabel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>🏷 Tiền máy</span>
              <span style={{ color: G, fontWeight: 800, fontSize: 15, fontFamily: "system-ui,sans-serif" }}>
                {new Intl.NumberFormat("vi-VN").format(camCost)}đ
              </span>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(255,255,255,0.55)",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              {[
                { color: "#22c55e", icon: "✅", text: "Trễ 1 giờ đầu miễn phí" },
                { color: "#f59e0b", icon: "⏱", text: "Từ giờ 2: +30k/giờ" },
                { color: "#f87171", icon: "⏰", text: "Quá 6 giờ → +1 ngày" },
              ].map(({ color, icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 12 }}>{icon}</span>
                  <span style={{ color, fontSize: 11.5, fontFamily: "system-ui,sans-serif" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RENTAL SUMMARY */}
      {days > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.40)",
            border: "1px solid rgba(255,255,255,0.58)",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 14,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14 }}>
            TỔNG ĐƠN TẠM TÍNH
          </div>

          {selectedCamList.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                📷 {c.name}
                {(selCams[c.id] || 0) > 1 ? ` ×${selCams[c.id]}` : ""} · {fmtDays(days, selSession)}
              </span>
              <span style={{ color: TXT, fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                {fmtVND(c.price * (selCams[c.id] || 0) * days)}
              </span>
            </div>
          ))}

          {Object.entries(selAcc)
            .filter(([, q]) => q > 0)
            .map(([name, qty]) => {
              const acc = accessories.find((a) => a.name === name);
              if (!acc) return null;
              const unitPrice =
                days === 0.5
                  ? acc.priceShift != null
                    ? acc.priceShift
                    : Math.round(acc.price / 2)
                  : acc.price;
              const multiplier = days === 0.5 ? 1 : days;
              return (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                    🎒 {name}
                    {qty > 1 ? ` ×${qty}` : ""}
                  </span>
                  <span style={{ color: TXT, fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                    {fmtVND(unitPrice * qty * multiplier)}
                  </span>
                </div>
              );
            })}

          <div style={{ borderTop: `1px solid #252010`, margin: "10px 0" }} />

          {accCost > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Tạm tính</span>
              <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{fmtVND(subtotal)}</span>
            </div>
          )}

          {appliedRental && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#22c55e", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                🎞️ {appliedRental.code}
              </span>
              <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                -{fmtVND(rentalDiscountAmt)}
              </span>
            </div>
          )}
          {appliedDelivery && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#60a5fa", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                🚗 {appliedDelivery.code}
              </span>
              <span style={{ color: "#60a5fa", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                -{fmtVND(deliveryDiscountAmt)}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ color: TXT, fontSize: 14, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Tổng cộng</span>
            <span
              style={{
                color: G,
                fontSize: 20,
                fontWeight: 900,
                fontFamily: "system-ui,sans-serif",
                letterSpacing: 0.5,
              }}
            >
              {fmtVND(total)}
            </span>
          </div>
        </div>
      )}

      {/* WARNINGS & NEXT BUTTON */}
      {(() => {
        return (
          <>
            {baseOk && blockingItems.length > 0 && (
              <div
                style={{
                  marginBottom: 10,
                  padding: "10px 14px",
                  background: "rgba(255,220,220,0.80)",
                  border: "1px solid #cc333366",
                  borderRadius: 12,
                  color: "#8B0000",
                  fontSize: 12,
                  fontFamily: "system-ui,sans-serif",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🚫 Không đủ máy trong khoảng thời gian đã chọn:</div>
                {blockingItems.map((item, i) => (
                  <div key={i}>
                    · {item.type} <b>{item.name}</b>: cần {item.needed}{" "}
                    {item.type === "📷 Máy" ? "máy" : "cái"} nhưng hiện đã hết hàng — mấy vợ vui lòng chọn ngày khác
                    {item.goBack ? ", hoặc ← quay lại bước 1 để giảm số lượng" : ""}
                    {item.type === "📷 Máy" ? "" : " hoặc chọn phụ kiện khác"}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => canGo && setStep(3)}
              disabled={!canGo}
              className="bk-next"
              style={{
                width: "100%",
                padding: 15,
                background: canGo
                  ? "linear-gradient(135deg, rgba(139,174,207,0.90) 0%, rgba(101,145,188,0.85) 100%)"
                  : "rgba(180,180,190,0.40)",
                color: canGo ? "#fff" : MUT,
                border: canGo ? "1px solid rgba(255,255,255,0.55)" : "1px solid transparent",
                borderRadius: 14,
                cursor: canGo ? "pointer" : "not-allowed",
                fontWeight: 800,
                fontSize: 15,
                fontFamily: "system-ui,sans-serif",
                letterSpacing: 0.5,
                backdropFilter: canGo ? "blur(16px) saturate(160%)" : "none",
                WebkitBackdropFilter: canGo ? "blur(16px) saturate(160%)" : "none",
                boxShadow: canGo ? "0 1px 0 rgba(255,255,255,0.60) inset, 0 4px 20px rgba(8,20,60,0.18)" : "none",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {!days
                  ? "Chọn thời gian thuê"
                  : !daysOk
                  ? "Số ngày phải là bội số 0.5"
                  : !selSession
                  ? "Chọn ca thuê"
                  : !pickDate
                  ? "Chọn ngày bắt đầu"
                  : !hasAnyItem
                  ? "← Chọn máy ảnh hoặc phụ kiện"
                  : blockingItems.length > 0
                  ? "⛔ Hết hàng — chọn lại ngày / số lượng"
                  : "Tiếp tục →"}
              </span>
            </button>
          </>
        );
      })()}
    </div>
  );
}
