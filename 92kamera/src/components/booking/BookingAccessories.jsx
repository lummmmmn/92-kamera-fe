import { G, BR, TXT, MUT } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";
import { getAccAvailQty, getAvailQty } from "../../utils/availability.js";

export default function BookingAccessories({
  accessories,
  selAcc,
  toggleAcc,
  setAccQty,
  liveOrdersForCheck,
  selSession,
  pickDate,
  days,
  selectedCamList,
  selCams,
  totalCamSelected,
  accCost,
  qtyBtn,
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: TXT, fontWeight: 700, fontSize: 15, fontFamily: "system-ui,sans-serif" }}>
          Phụ kiện đi kèm
        </span>
        {days > 0 && accCost > 0 && (
          <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
            +{fmtVND(accCost)}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {(() => {
          const _activeOrds = liveOrdersForCheck.filter((o) => !["cancelled", "completed"].includes(o.status));
          const _sess = selSession || "full";
          const _accDateRange = (() => {
            if (!pickDate || !days) return [];
            if (days < 1) return [pickDate];
            const arr = [];
            for (let i = 0; i < Math.ceil(days); i++) arr.push(dateAddDays(pickDate, i));
            return arr;
          })();

          return accessories
            .filter((a) => a.active !== false)
            .map((a) => {
              const qty = selAcc[a.name] || 0;
              const isSel = qty > 0;
              const availStock =
                _accDateRange.length > 0
                  ? Math.min(..._accDateRange.map((d) => getAccAvailQty(a.name, a.qty || 0, _activeOrds, d, _sess)))
                  : a.qty || 0;
              const isOutOfStock = availStock <= 0;
              const isLowStock = !isOutOfStock && availStock <= 1 && (a.qty || 0) > 1;
              const maxQty = availStock;
              const canAdd = !isOutOfStock;
              const unitPrice =
                days === 0.5
                  ? a.priceShift != null
                    ? a.priceShift
                    : Math.round(a.price / 2)
                  : a.price;
              const multiplier = days === 0.5 ? 1 : days;
              const lineTotal = days > 0 ? unitPrice * qty * multiplier : 0;

              return (
                <div
                  key={a.id}
                  style={{
                    border: `${isSel ? "2px" : "1px"} solid ${
                      isOutOfStock ? "#cc333344" : isSel ? "#2979CF" : "rgba(255,255,255,0.60)"
                    }`,
                    borderRadius: 14,
                    padding: "10px 13px",
                    background: isOutOfStock
                      ? "rgba(255,230,230,0.55)"
                      : isSel
                      ? "rgba(197,228,248,0.75)"
                      : "rgba(255,255,255,0.38)",
                    transition: "all .2s",
                    boxShadow: isSel ? "0 0 0 2px rgba(41,121,207,0.2), 0 4px 16px rgba(41,121,207,0.15)" : "none",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: canAdd ? "pointer" : "not-allowed" }}
                    onClick={() => canAdd && toggleAcc(a.name)}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid ${isOutOfStock ? "#cc3333" : isSel ? "#2979CF" : BR}`,
                        background: isOutOfStock ? "#cc333322" : isSel ? "#2979CF" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all .2s",
                        boxShadow: isSel ? "0 0 6px rgba(41,121,207,0.5)" : "none",
                      }}
                    >
                      {isOutOfStock ? (
                        <span style={{ color: "#cc3333", fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✕</span>
                      ) : (
                        isSel && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>
                      )}
                    </div>

                    {a.image && (
                      <img
                        src={a.image}
                        alt={a.name}
                        style={{
                          width: 32,
                          height: 32,
                          objectFit: "cover",
                          borderRadius: 8,
                          flexShrink: 0,
                          opacity: isOutOfStock ? 0.4 : 1,
                          border: "1px solid rgba(255,255,255,0.6)",
                        }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span
                          style={{
                            color: isOutOfStock ? "#666" : isSel ? TXT : "#888",
                            fontSize: 13,
                            fontFamily: "system-ui,sans-serif",
                            textDecoration: isOutOfStock ? "line-through" : "none",
                          }}
                        >
                          {a.name}
                        </span>
                        {isOutOfStock && (
                          <span
                            style={{
                              background: "#cc333322",
                              color: "#cc3333",
                              border: "1px solid #cc333355",
                              borderRadius: 8,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 700,
                              fontFamily: "system-ui,sans-serif",
                              letterSpacing: 0.5,
                            }}
                          >
                            HẾT
                          </span>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <span
                            style={{
                              background: "#f59e0b22",
                              color: "#f59e0b",
                              border: "1px solid #f59e0b55",
                              borderRadius: 8,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 700,
                              fontFamily: "system-ui,sans-serif",
                              letterSpacing: 0.5,
                            }}
                          >
                            CÒN {availStock}
                          </span>
                        )}
                      </div>
                      {a.desc && (
                        <div style={{ color: MUT, fontSize: 10, marginTop: 1, fontFamily: "system-ui,sans-serif" }}>
                          {a.desc}
                        </div>
                      )}
                      {isOutOfStock && pickDate && (
                        <div style={{ color: "#cc333388", fontSize: 9, marginTop: 2, fontFamily: "system-ui,sans-serif" }}>
                          {days >= 1 ? `Đã hết trong ${Math.ceil(days)} ngày đã chọn` : "Không còn trong ngày / ca này"}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        color: isOutOfStock ? "#555" : G,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "system-ui,sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {fmtVND(unitPrice)}/{days === 0.5 ? "buổi" : "ngày"}
                      {days === 0.5 && (
                        <span style={{ color: "#555", fontSize: 9, fontWeight: 400, marginLeft: 4 }}>
                          ({fmtVND(a.price)}/ngày)
                        </span>
                      )}
                    </span>
                  </div>

                  {isSel && !isOutOfStock && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${G}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: days > 0 ? 7 : 0 }}>
                        <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                          Số lượng:
                        </span>
                        {qtyBtn(() => setAccQty(a.name, qty - 1, maxQty), "−")}
                        <span
                          style={{
                            color: G,
                            fontWeight: 700,
                            fontSize: 14,
                            minWidth: 20,
                            textAlign: "center",
                            fontFamily: "system-ui,sans-serif",
                          }}
                        >
                          {qty}
                        </span>
                        {qtyBtn(() => setAccQty(a.name, qty + 1, maxQty), "+")}
                        <span
                          style={{
                            color: availStock < (a.qty || 0) ? "#f59e0b" : "#444",
                            fontSize: 10,
                            fontFamily: "system-ui,sans-serif",
                          }}
                        >
                          / {a.qty} kho{availStock < (a.qty || 0) ? ` · còn ${availStock}` : ""}
                        </span>
                      </div>
                      {days > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(255,255,255,0.50)",
                            border: "1px solid rgba(255,255,255,0.68)",
                            borderRadius: 10,
                            padding: "5px 10px",
                          }}
                        >
                          <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>
                            {qty} × {fmtVND(unitPrice)} × {fmtDays(days, selSession)}
                          </span>
                          <span style={{ color: G, fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                            = {fmtVND(lineTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
        })()}
      </div>
    </div>
  );
}
