import { useState, useEffect, useRef } from "react";
import { useMobile } from "../../hooks/useMobile.js";
import { G, BG, CARD, BR, BR2, TXT, MUT } from "../../lib/constants.js";
import { todayStr, cdnUrl, fmtVND } from "../../utils/format.js";
import { getAvailQty, getAccAvailQty } from "../../utils/availability.js";

export default function QuickSearchFloat({ cameras, accessories, orders, onBook, openTrigger = 0 }) {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selCams, setSelCams] = useState({}); // { camId: qty }
  const [selAccs, setSelAccs] = useState({}); // { accName: qty }

  // Mở panel khi được trigger từ bên ngoài
  useEffect(() => {
    if (openTrigger > 0) setOpen(true);
  }, [openTrigger]);

  const genDates = (sd, ed) => {
    const list = [];
    let cur = new Date(sd + "T00:00:00");
    const end = new Date(ed + "T00:00:00");
    let n = 0;
    while (cur <= end && n++ < 366) {
      list.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  };

  const camAvailRange = (camId, camQty, sd, ed) => {
    let min = camQty;
    for (const d of genDates(sd, ed)) {
      const a = getAvailQty(camId, camQty, orders, d, "full");
      if (a < min) min = a;
    }
    return Math.max(0, min);
  };

  const accAvailRange = (accName, accQty, sd, ed) => {
    let min = accQty;
    for (const d of genDates(sd, ed)) {
      const a = getAccAvailQty(accName, accQty, orders, d, "full");
      if (a < min) min = a;
    }
    return Math.max(0, min);
  };

  const handleSearch = () => {
    const ed = endDate >= startDate ? endDate : startDate;
    setResults({
      startDate,
      endDate: ed,
      cameras: cameras.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        icon: c.icon,
        images: c.images || [],
        qty: c.qty || 1,
        avail: camAvailRange(c.id, c.qty || 1, startDate, ed),
      })),
      accessories: accessories
        .filter((a) => a.active !== false)
        .map((a) => ({
          id: a.id,
          name: a.name,
          qty: a.qty || 1,
          avail: accAvailRange(a.name, a.qty || 1, startDate, ed),
        })),
    });
    setSearched(true);
    setSelCams({});
    setSelAccs({});
  };

  const fmtD = (ds) => {
    try {
      return new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } catch {
      return ds;
    }
  };

  const close = () => {
    setOpen(false);
    setResults(null);
    setSearched(false);
    setSelCams({});
    setSelAccs({});
  };

  const calcDays = (sd, ed) => {
    const diff = (new Date(ed + "T00:00:00") - new Date(sd + "T00:00:00")) / 86400000;
    return Math.max(1, Math.round(diff) + 1);
  };

  const totalSelCams = Object.values(selCams).reduce((s, q) => s + q, 0);

  const qtyBtnQS = (onClick, label) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        border: "1px solid rgba(0,0,0,0.20)",
        borderRadius: 6,
        background: "rgba(255,255,255,0.70)",
        color: "#1a3a5a",
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "monospace",
      }}
    >
      {label}
    </button>
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1001,
        overflowY: "auto",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: isMobile ? "34px 12px 18px" : "24px 16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div style={{ margin: "0 auto", width: isMobile ? "min(420px, calc(100vw - 24px))" : "min(660px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            width: "100%",
            background: "linear-gradient(160deg, rgba(232,240,248,0.95) 0%, rgba(197,216,236,0.90) 60%, rgba(181,206,230,0.88) 100%)",
            border: "1px solid rgba(255,255,255,0.70)",
            borderRadius: 20,
            boxShadow: "0 1px 0 rgba(255,255,255,0.90) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 24px 80px rgba(0,0,0,0.30), 0 4px 20px rgba(0,0,0,0.18)",
            backdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
            WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
            overflow: "hidden",
            animation: "navExpandIn .3s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {/* Header */}
          <div style={{ padding: isMobile ? "14px 16px 0" : "14px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ color: "#1a3a5a", fontSize: 9, letterSpacing: isMobile ? 2.2 : 3, fontFamily: "system-ui,sans-serif", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                KIỂM TRA MÁY THEO NGÀY
              </span>
            </div>
            <button onClick={close} style={{ background: "none", border: "none", color: "#2a4a6a", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* Date inputs */}
          <div style={{ padding: isMobile ? "10px 16px 16px" : "10px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(130px, 1fr))", gap: isMobile ? 8 : 10, marginBottom: 10 }}>
              {[
                [
                  "📅 NGÀY THUÊ",
                  startDate,
                  (v) => {
                    setStartDate(v);
                    setResults(null);
                    setSearched(false);
                    setSelCams({});
                    setSelAccs({});
                    if (v > endDate) setEndDate(v);
                  },
                  todayStr(),
                ],
                [
                  "📅 NGÀY TRẢ",
                  endDate,
                  (v) => {
                    setEndDate(v);
                    setResults(null);
                    setSearched(false);
                    setSelCams({});
                    setSelAccs({});
                  },
                  startDate || todayStr(),
                ],
              ].map(([label, val, onChange, min]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div style={{ color: "#2a5070", fontSize: 8.5, letterSpacing: isMobile ? 1.6 : 2, marginBottom: 5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
                    {label}
                  </div>
                  <input
                    type="date"
                    value={val}
                    min={min}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      padding: isMobile ? "9px 12px" : "8px 10px",
                      background: "linear-gradient(160deg, rgba(232,240,248,0.92) 0%, rgba(197,216,236,0.85) 100%)",
                      border: "1px solid rgba(255,255,255,0.60)",
                      borderRadius: 9,
                      color: "#0d1b2a",
                      fontSize: isMobile ? 16 : 13,
                      fontFamily: "system-ui,sans-serif",
                      boxSizing: "border-box",
                      outline: "none",
                      cursor: "pointer",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset",
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSearch}
              style={{
                width: "100%",
                padding: isMobile ? "12px 10px" : "10px",
                background: "linear-gradient(135deg,#5a5a6e 0%,#c8c8dc 50%,#4a4a60 100%)",
                color: "#0a0a18",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: isMobile ? 2 : 2.5,
                fontFamily: "system-ui,sans-serif",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              🔍 XEM MÁY CÒN TRỐNG
            </button>
          </div>

          {/* Results */}
          {searched && results && (
            <div style={{ padding: isMobile ? "0 16px 0" : "0 24px 0" }}>
              <div
                style={{
                  color: "#2a4a6a",
                  fontSize: 10,
                  letterSpacing: isMobile ? 1.5 : 2.5,
                  marginBottom: 12,
                  fontFamily: "system-ui,sans-serif",
                  borderTop: "1px solid rgba(0,0,0,0.10)",
                  paddingTop: 14,
                  lineHeight: 1.6,
                }}
              >
                MÁY ẢNH · {fmtD(results.startDate)} → {fmtD(results.endDate)} · <span style={{ color: "#c9a84c" }}>Nhấn để chọn nhiều máy</span>
              </div>

              {results.cameras.map((r) => {
                const col = r.avail <= 0 ? "#ef4444" : r.avail === 1 ? "#f59e0b" : "#22c55e";
                const badge = r.avail <= 0 ? "❌ Hết" : `✅ Còn ${r.avail}`;
                const selQty = selCams[r.id] || 0;
                const isSel = selQty > 0;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 9 : 12,
                      padding: isMobile ? "10px 11px" : "11px 14px",
                      background: isSel ? "rgba(41,121,207,0.20)" : r.avail > 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)",
                      borderRadius: 12,
                      marginBottom: 8,
                      opacity: r.avail <= 0 ? 0.5 : 1,
                      transition: "background .15s",
                      border: isSel ? "1px solid rgba(41,121,207,0.6)" : "1px solid rgba(255,255,255,0.60)",
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, overflow: "hidden" }}>
                      {r.images?.[0] ? <img src={cdnUrl(r.images[0], "thumb")} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : r.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isSel ? "#1a4a8a" : "#0d1b2a", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui,sans-serif" }}>
                        {r.name}
                      </div>
                      <div style={{ color: "#3a6080", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>{fmtVND(r.price)}/ngày</div>
                    </div>
                    {r.avail > 0 ? (
                      isSel ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {qtyBtnQS(() => {
                            const nq = selQty - 1;
                            setSelCams((p) => {
                              if (nq <= 0) {
                                const n = { ...p };
                                delete n[r.id];
                                return n;
                              }
                              return { ...p, [r.id]: nq };
                            });
                          }, "−")}
                          <span style={{ color: "#1a4a8a", fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: "center", fontFamily: "system-ui,sans-serif" }}>{selQty}</span>
                          {qtyBtnQS(() => {
                            if (selQty < r.avail) setSelCams((p) => ({ ...p, [r.id]: selQty + 1 }));
                          }, "+")}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelCams((p) => ({ ...p, [r.id]: 1 }))}
                          style={{
                            padding: "6px 14px",
                            background: "rgba(41,121,207,0.18)",
                            border: "1px solid rgba(41,121,207,0.55)",
                            color: "#1a4a8a",
                            borderRadius: 9,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "system-ui,sans-serif",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          + Chọn
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap", background: col + "18", padding: "4px 10px", borderRadius: 99, border: `1px solid ${col}30`, flexShrink: 0 }}>
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })}

              {results.cameras.every((r) => r.avail <= 0) && (
                <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>😔</div>
                  <div style={{ color: "#ef4444", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Không có máy nào trống</div>
                  <div style={{ color: "#555", fontSize: 9.5, fontFamily: "system-ui,sans-serif", marginTop: 3 }}>trong khoảng thời gian đã chọn</div>
                </div>
              )}

              {results.accessories.filter((a) => a.avail > 0).length > 0 && (
                <>
                  <div style={{ color: "#2a4a6a", fontSize: 10, letterSpacing: 2.5, margin: "14px 0 10px", fontFamily: "system-ui,sans-serif" }}>
                    PHỤ KIỆN SẴN CÓ · <span style={{ color: "#c9a84c" }}>Nhấn để chọn</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                    {results.accessories.filter((a) => a.avail > 0).map((a) => {
                      const selQty = selAccs[a.name] || 0;
                      const isSel = selQty > 0;
                      return (
                        <div
                          key={a.id}
                          style={{
                            padding: "9px 12px",
                            background: isSel ? "rgba(41,121,207,0.18)" : "rgba(255,255,255,0.50)",
                            borderRadius: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: isSel ? "1px solid rgba(41,121,207,0.4)" : "1px solid rgba(255,255,255,0.60)",
                          }}
                        >
                          <span style={{ color: isSel ? "#1a4a8a" : "#2a4a6a", fontSize: 12, fontFamily: "system-ui,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                            {a.name}
                          </span>
                          {isSel ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
                              {qtyBtnQS(() => {
                                const nq = selQty - 1;
                                setSelAccs((p) => {
                                  if (nq <= 0) {
                                    const n = { ...p };
                                    delete n[a.name];
                                    return n;
                                  }
                                  return { ...p, [a.name]: nq };
                                });
                              }, "−")}
                              <span style={{ color: "#1a4a8a", fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: "center", fontFamily: "system-ui,sans-serif" }}>{selQty}</span>
                              {qtyBtnQS(() => {
                                if (selQty < a.avail) setSelAccs((p) => ({ ...p, [a.name]: selQty + 1 }));
                              }, "+")}
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelAccs((p) => ({ ...p, [a.name]: 1 }))}
                              style={{
                                padding: "4px 12px",
                                background: "rgba(41,121,207,0.15)",
                                border: "1px solid rgba(41,121,207,0.45)",
                                color: "#1a4a8a",
                                borderRadius: 7,
                                cursor: "pointer",
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: "system-ui,sans-serif",
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              + Chọn
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(() => {
                const hasAnySel = totalSelCams > 0 || Object.values(selAccs).some((q) => q > 0);
                const accCount = Object.values(selAccs).reduce((s, q) => s + (q || 0), 0);
                const label =
                  totalSelCams > 0
                    ? `📋 TIẾP TỤC ĐẶT (${totalSelCams} MÁY${accCount > 0 ? ` + ${accCount} PK` : ""}) →`
                    : `📋 TIẾP TỤC ĐẶT (${accCount} PHỤ KIỆN) →`;
                return hasAnySel ? (
                  <div style={{ padding: "12px 0 14px", borderTop: "1px solid rgba(0,0,0,0.10)", marginTop: 8 }}>
                    <div style={{ color: "#2a4a6a", fontSize: 11, fontFamily: "system-ui,sans-serif", marginBottom: 10, lineHeight: 1.7 }}>
                      <span style={{ color: "#1a4a8a", fontWeight: 700 }}>✓ Đã chọn:</span>{" "}
                      {totalSelCams > 0 &&
                        Object.entries(selCams)
                          .map(([id, qty]) => {
                            const c = results.cameras.find((r) => String(r.id) === String(id));
                            return c ? `${c.name}${qty > 1 ? ` ×${qty}` : ""}` : "";
                          })
                          .filter(Boolean)
                          .join(", ")}
                      {Object.keys(selAccs).length > 0 && (
                        <>
                          <br />
                          <span style={{ color: "#c9a84c" }}>🎒</span>{" "}
                          {Object.entries(selAccs)
                            .map(([name, qty]) => (qty > 1 ? `${name} ×${qty}` : name))
                            .join(", ")}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const ed = results.endDate >= results.startDate ? results.endDate : results.startDate;
                        const days = calcDays(results.startDate, ed);
                        close();
                        onBook?.({ preselectedCams: selCams, preselectedAccs: selAccs, date: results.startDate, days });
                      }}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "linear-gradient(135deg, rgba(139,174,207,0.90) 0%, rgba(101,145,188,0.85) 100%)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.55)",
                        borderRadius: 11,
                        fontWeight: 800,
                        fontSize: 13,
                        letterSpacing: 1.5,
                        fontFamily: "system-ui,sans-serif",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 1px 0 rgba(255,255,255,0.60) inset, 0 4px 20px rgba(8,20,60,0.18)",
                        backdropFilter: "blur(16px) saturate(160%)",
                        WebkitBackdropFilter: "blur(16px) saturate(160%)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                    >
                      {label}
                    </button>
                  </div>
                ) : (
                  <div style={{ height: 14 }} />
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
