import { G, MUT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";

export default function BookingDiscount({
  appliedDiscounts,
  appliedRental,
  appliedDelivery,
  appliedTotal,
  discountExpanded,
  setDiscountExpanded,
  discountCode,
  setDiscountCode,
  discountLoading,
  discountMsg,
  setDiscountMsg,
  applyDiscount,
  removeDiscount,
  deliveryFeeCalc,
  subtotal,
  rentalDiscountAmt,
  deliveryDiscountAmt,
  totalDiscountAmt,
  BK_flatInp,
}) {
  const amtFor = (ad) =>
    ad.scope === "delivery" ? deliveryDiscountAmt : ad.scope === "total" ? totalDiscountAmt : rentalDiscountAmt;
  const iconFor = (ad) => (ad.scope === "delivery" ? "🚗" : ad.scope === "total" ? "💰" : "🎞️");

  // Mã "giảm tổng đơn" loại trừ với các mã khác — nếu đã áp thì không cho thêm mã nào nữa
  const canAddMore = appliedDiscounts.length < 2 && !appliedTotal;

  return (
    <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      {/* Tags mã đã áp dụng */}
      {appliedDiscounts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {appliedDiscounts.map((ad) => (
            <div
              key={ad.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(34,197,94,0.10)",
                border: "1px solid #22c55e44",
                borderRadius: 20,
                padding: "4px 10px",
              }}
            >
              <span style={{ fontSize: 11 }}>{iconFor(ad)}</span>
              <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>
                {ad.code}
              </span>
              <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                -{fmtVND(amtFor(ad))}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDiscount(ad.code);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 2px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header row — chỉ hiện khi chưa đủ 2 mã và chưa áp mã giảm tổng đơn (loại trừ) */}
      {canAddMore && (
        <div
          onClick={() => setDiscountExpanded((p) => !p)}
          style={{ display: "flex", alignItems: "center", justifyDiscount: "space-between", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, opacity: 0.5 }}>🎟</span>
              <span style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
                {appliedDiscounts.length === 0
                  ? "MÃ GIẢM GIÁ"
                  : !appliedRental
                  ? "Thêm mã giảm tiền thuê 🎞️"
                  : deliveryFeeCalc > 0
                  ? "Thêm mã giảm ship 🚗"
                  : "MÃ GIẢM GIÁ"}
              </span>
            </div>
            <span
              style={{
                color: "#444",
                fontSize: 16,
                lineHeight: 1,
                transition: "transform .3s",
                display: "inline-block",
                transform: discountExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ⌄
            </span>
          </div>
        </div>
      )}
      {!canAddMore && appliedTotal && (
        <div style={{ color: "#22c55e", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 700, textAlign: "center", letterSpacing: 0.5 }}>
          💰 Đã áp dụng mã giảm tổng đơn
        </div>
      )}
      {!canAddMore && !appliedTotal && appliedDiscounts.length >= 2 && (
        <div style={{ color: "#22c55e", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 700, textAlign: "center", letterSpacing: 0.5 }}>
          ✅ Đã đủ 2 mã giảm giá
        </div>
      )}

      {/* Expand body */}
      <div className={`bk-disc-body ${discountExpanded && canAddMore ? "open" : "closed"}`}>
        <div style={{ paddingTop: 12, display: "flex", gap: 8 }}>
          <input
            className="bk-inp"
            style={{ ...BK_flatInp, fontFamily: "monospace", letterSpacing: 2, fontSize: 13, flex: 1 }}
            value={discountCode}
            onChange={(e) => {
              setDiscountCode(e.target.value.toUpperCase());
              setDiscountMsg(null);
            }}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !discountLoading &&
              applyDiscount().then((ok) => {
                if (ok) setDiscountExpanded(false);
              })
            }
            placeholder="Nhập mã..."
          />
          <button
            onClick={() => {
              if (!discountLoading)
                applyDiscount().then((ok) => {
                  if (ok) setDiscountExpanded(false);
                });
            }}
            disabled={discountLoading}
            style={{
              padding: "0 16px",
              background: discountLoading ? "#aaa" : `linear-gradient(135deg,${G},#a07830)`,
              color: "#fff",
              border: "none",
              borderRadius: 16,
              cursor: discountLoading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "system-ui,sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
              minHeight: 44,
              opacity: discountLoading ? 0.7 : 1,
              transition: "opacity 0.15s",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            {discountLoading ? "..." : "Áp dụng"}
          </button>
        </div>
        {discountMsg && (
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: discountMsg.type === "ok" ? "#22c55e" : "#ef4444",
              fontFamily: "system-ui,sans-serif",
            }}
          >
            {discountMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}
