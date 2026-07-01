import BookingCaScheduler from "./BookingCaScheduler.jsx";
import BookingAccessories from "./BookingAccessories.jsx";
import { G, MUT, TXT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";
import { getAvailQtyByCa } from "../../utils/availability.js";

export default function BookingStep2({
  accessories,
  selAcc,
  toggleAcc,
  setAccQty,
  liveOrdersForCheck,
  pickDate,
  setPickDate,
  pickHour,
  setPickHour,
  numDays,
  setNumDays,
  returnHour,
  setReturnHour,
  caResult,
  totalCa,
  selectedCamList,
  selCams,
  totalCamSelected,
  accCost,
  camCost,
  subtotal,
  total,
  appliedRental,
  appliedDelivery,
  appliedTotal,
  rentalDiscountAmt,
  deliveryDiscountAmt,
  totalDiscountAmt,
  setStep,
  qtyBtn,
}) {
  // ── Kiểm tra tồn kho theo từng ca trong lịch đã chọn ──
  const blockingItems = [];
  if (caResult && caResult.totalCa > 0) {
    const activeOrds = liveOrdersForCheck.filter((o) => !["cancelled", "completed"].includes(o.status));

    selectedCamList.forEach((c) => {
      const needed = selCams[c.id] || 1;
      const minAvail = Math.min(
        ...caResult.schedule.map((s) => getAvailQtyByCa(c.id, c.qty || 1, activeOrds, s.date, s.ca))
      );
      if (minAvail < needed) {
        blockingItems.push({ name: c.name, avail: minAvail, needed, type: "📷 Máy", goBack: true });
      }
    });
  }

  const hasAccSelected = Object.values(selAcc).some((q) => (q || 0) > 0);
  const hasAnyItem = selectedCamList.length > 0 || hasAccSelected;
  const scheduleOk = !!(caResult && caResult.totalCa > 0);
  const baseOk = scheduleOk && hasAnyItem;
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
        pickDate={pickDate}
        days={numDays}
        selSession="full"
        selectedCamList={selectedCamList}
        selCams={selCams}
        totalCamSelected={totalCamSelected}
        accCost={accCost}
        qtyBtn={qtyBtn}
      />

      <BookingCaScheduler
        pickDate={pickDate}
        setPickDate={setPickDate}
        pickHour={pickHour}
        setPickHour={setPickHour}
        numDays={numDays}
        setNumDays={setNumDays}
        returnHour={returnHour}
        setReturnHour={setReturnHour}
        selectedCamList={selectedCamList}
        selCams={selCams}
        liveOrdersForCheck={liveOrdersForCheck}
        caSchedule={caResult}
      />

      {/* RENTAL SUMMARY */}
      {totalCa > 0 && (
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
                {(selCams[c.id] || 0) > 1 ? ` ×${selCams[c.id]}` : ""} · {totalCa} ca
              </span>
              <span style={{ color: TXT, fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                {fmtVND(Math.round(c.price / 3) * (selCams[c.id] || 0) * totalCa)}
              </span>
            </div>
          ))}

          {Object.entries(selAcc)
            .filter(([, q]) => q > 0)
            .map(([name, qty]) => {
              const acc = accessories.find((a) => a.name === name);
              if (!acc) return null;
              const unitPrice = Math.round(acc.price / 3);
              return (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                    🎒 {name}
                    {qty > 1 ? ` ×${qty}` : ""} · {totalCa} ca
                  </span>
                  <span style={{ color: TXT, fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                    {fmtVND(unitPrice * qty * totalCa)}
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
          {appliedTotal && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#f59e0b", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                💰 {appliedTotal.code}
              </span>
              <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                -{fmtVND(totalDiscountAmt)}
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
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🚫 Không đủ máy trong lịch ca đã chọn:</div>
          {blockingItems.map((item, i) => (
            <div key={i}>
              · {item.type} <b>{item.name}</b>: cần {item.needed} máy nhưng hiện đã hết — vui lòng chọn ca/ngày khác
              {item.goBack ? ", hoặc ← quay lại bước 1 để giảm số lượng" : ""}
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
          {!pickDate
            ? "Chọn ngày nhận"
            : pickHour == null
            ? "Chọn giờ nhận"
            : !numDays
            ? "Chọn số ngày thuê"
            : returnHour == null
            ? "Chọn giờ trả"
            : !scheduleOk
            ? "Giờ trả phải sau giờ nhận"
            : !hasAnyItem
            ? "← Chọn máy ảnh hoặc phụ kiện"
            : blockingItems.length > 0
            ? "⛔ Hết hàng — chọn lại ca / ngày"
            : "Tiếp tục →"}
        </span>
      </button>
    </div>
  );
}
