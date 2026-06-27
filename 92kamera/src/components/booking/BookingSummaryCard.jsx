import { G, MUT, TXT, BR, CARD } from "../../lib/constants.js";
import { cdnUrl, fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";

export default function BookingSummaryCard({
  selectedCamList,
  selCams,
  selAcc,
  accessories,
  days,
  selSession,
  pickDate,
}) {
  const ri = returnInfoLocal();

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

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.60)",
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 14,
        background: "rgba(255,255,255,0.38)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.70) inset, 0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", minHeight: 160 }}>
        {/* CỘT TRÁI: danh sách thiết bị */}
        <div style={{ flex: 1, minWidth: 0, borderRight: `1px solid rgba(0,0,0,0.08)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 16px", borderBottom: `1px solid rgba(0,0,0,0.08)` }}>
            <span style={{ fontSize: 15 }}>📦</span>
            <span style={{ color: G, fontSize: 9, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
              THIẾT BỊ ({selectedCamList.length + Object.values(selAcc).filter((q) => q > 0).length})
            </span>
          </div>

          {/* Danh sách máy ảnh */}
          {selectedCamList.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: `1px solid rgba(0,0,0,0.07)` }}>
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 14,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "rgba(0,0,0,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  border: "1px solid rgba(255,255,255,0.40)",
                }}
              >
                {c.images?.length > 0 ? (
                  <img src={cdnUrl(c.images[0], "thumb")} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  c.icon
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: TXT, fontWeight: 700, fontSize: 15, fontFamily: "system-ui,sans-serif", marginBottom: 8, lineHeight: 1.3 }}>
                  {c.name}
                </div>
                <span
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.70)",
                    color: MUT,
                    fontSize: 12,
                    borderRadius: 10,
                    padding: "3px 12px",
                    fontFamily: "system-ui,sans-serif",
                    fontWeight: 600,
                  }}
                >
                  x{selCams[c.id] || 1}
                </span>
              </div>
            </div>
          ))}

          {/* Phụ kiện */}
          {Object.entries(selAcc)
            .filter(([, q]) => q > 0)
            .map(([name, qty], idx, arr) => {
              const accObj = accessories.find((x) => x.name === name);
              const unitPrice =
                days === 0.5
                  ? accObj?.priceShift != null
                    ? accObj.priceShift
                    : Math.round((accObj?.price || 0) / 2)
                  : accObj?.price || 0;
              const lineTotal = days > 0 ? unitPrice * qty * (days === 0.5 ? 1 : days) : 0;

              if (selectedCamList.length === 0) {
                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderBottom: idx < arr.length - 1 ? `1px solid rgba(0,0,0,0.07)` : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "rgba(201,168,76,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        border: "1px solid rgba(201,168,76,0.30)",
                      }}
                    >
                      {accObj?.image ? (
                        <img src={accObj.image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "🎒"
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: TXT, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginBottom: 4, lineHeight: 1.3 }}>
                        {name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            background: "rgba(255,255,255,0.55)",
                            border: "1px solid rgba(255,255,255,0.70)",
                            color: MUT,
                            fontSize: 11,
                            borderRadius: 8,
                            padding: "2px 10px",
                            fontFamily: "system-ui,sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          x{qty}
                        </span>
                        {lineTotal > 0 && (
                          <span style={{ color: G, fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
                            {fmtVND(lineTotal)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(0,0,0,0.02)" }}>
                    <span style={{ color: MUT, fontSize: 12 }}>🎒 {name}</span>
                    <span
                      style={{
                        background: "rgba(255,255,255,0.60)",
                        borderRadius: 6,
                        padding: "1px 6px",
                        fontSize: 10,
                        color: TXT,
                        fontWeight: 700,
                      }}
                    >
                      x{qty}
                    </span>
                  </div>
                );
              }
            })}
        </div>

        {/* CỘT PHẢI: thời gian */}
        <div style={{ width: "42%", flexShrink: 0, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>📅</span>
            <span style={{ color: G, fontSize: 9, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
              THỜI GIAN
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>
                Thời lượng thuê
              </div>
              <div style={{ color: G, fontWeight: 800, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>
                {days > 0 ? fmtDays(days, selSession) : "—"}
              </div>
            </div>
            {ri && (
              <>
                <div>
                  <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>
                    Nhận thiết bị
                  </div>
                  <div style={{ color: TXT, fontWeight: 600, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                    {ri.pickTime}
                  </div>
                  <div style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", marginTop: 1 }}>
                    {ri.pickDate}
                  </div>
                </div>
                <div>
                  <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>
                    Trả trước giờ
                  </div>
                  <div style={{ color: TXT, fontWeight: 600, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                    {ri.dropTime}
                  </div>
                  <div style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", marginTop: 1 }}>
                    {ri.dropDate}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
