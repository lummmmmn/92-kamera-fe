import { useState, useEffect, useRef } from "react";
import { useMobile } from "../../hooks/useMobile.js";
import { STATUS_CFG, STORE_KEYS } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";
import { getOrders } from "../../api/index.js";

function Badge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: "#888" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        background: c.color + "20",
        color: c.color,
        border: `1px solid ${c.color}80`,
        whiteSpace: "nowrap",
        letterSpacing: 0.5,
      }}
    >
      {c.label}
    </span>
  );
}

export default function OrderLookupWidget({ orders = [], compact, forceOpen, onForceClose }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = forceOpen !== undefined ? forceOpen : openInternal;
  const [val, setVal] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const inputRef = useRef();
  const overlayRef = useRef();

  // Lock scroll body khi modal mở
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Focus input sau khi modal mở
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC đóng modal
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  // Tự cập nhật result khi orders thay đổi
  useEffect(() => {
    if (!result) return;
    const updated = orders.find((o) => o.id === result.id);
    if (updated && (updated.status !== result.status || updated.adminNote !== result.adminNote)) {
      setResult(updated);
      setLastRefresh(new Date());
    }
  }, [orders, result?.id]);

  const search = async (q = val) => {
    const s = q.trim().toUpperCase();
    if (!s) return;
    let found = orders.find(
      (o) => o.id.toUpperCase() === s || o.id.toUpperCase().replace("#", "").includes(s.replace("#", ""))
    );
    if (!found) {
      try {
        const freshOrders = await getOrders();
        if (Array.isArray(freshOrders)) {
          found = freshOrders.find(
            (o) => o.id.toUpperCase() === s || o.id.toUpperCase().replace("#", "").includes(s.replace("#", ""))
          );
        }
      } catch {}
    }
    if (found) {
      setResult(found);
      setErr(false);
      setLastRefresh(new Date());
    } else {
      setResult(null);
      setErr(true);
    }
  };

  const refresh = async () => {
    if (!result || refreshing) return;
    setRefreshing(true);
    try {
      const freshOrders = await getOrders();
      if (Array.isArray(freshOrders)) {
        const found = freshOrders.find((o) => o.id === result.id);
        if (found) {
          setResult(found);
          setLastRefresh(new Date());
        }
      }
    } catch {}
    setRefreshing(false);
  };

  const close = () => {
    if (onForceClose) onForceClose();
    else setOpenInternal(false);
    setVal("");
    setResult(null);
    setErr(false);
  };

  const toggle = () => {
    if (open) close();
    else setOpenInternal(true);
  };

  const fmtD = (ds) => {
    try {
      return new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return ds;
    }
  };

  const getTime = (o, type) => {
    if (o.days === 0.5) {
      const _s = o.session || o.shift;
      if (type === "pick") return _s === "morning" ? "06:00" : _s === "afternoon" ? "14:00" : "--:--";
      return _s === "morning" ? "12:00" : _s === "afternoon" ? "20:00" : "--:--";
    }
    return "12:00";
  };

  const sc = result ? STATUS_CFG[result.status] || { label: result.status, color: "#888" } : null;

  return (
    <>
      {forceOpen === undefined && (
        <button
          onClick={toggle}
          data-tracuu
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: open ? "rgba(13,27,42,0.90)" : "rgba(13,27,42,0.65)",
            border: `1px solid ${open ? "rgba(139,174,207,0.55)" : "rgba(139,174,207,0.30)"}`,
            borderRadius: 12,
            padding: compact ? "9px 14px" : "11px 22px",
            cursor: "pointer",
            transition: "all .25s",
            color: "#d4cab8",
            fontSize: compact ? 7.5 : 11,
            fontFamily: "system-ui,sans-serif",
            letterSpacing: compact ? 2 : 2.5,
            fontWeight: 600,
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          TRA CỨU ĐƠN
        </button>
      )}

      {open && (
        <div
          ref={overlayRef}
          onClick={(e) => {
            if (e.target === overlayRef.current) close();
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: "rgba(5,17,31,0.80)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflowY: "auto",
            padding: "16px 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              margin: "auto",
              background: "linear-gradient(160deg, rgba(220,232,244,0.97) 0%, rgba(197,216,236,0.96) 60%, rgba(210,226,242,0.97) 100%)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.75)",
              boxShadow: "0 32px 80px rgba(5,17,31,0.45), 0 0 0 1px rgba(139,174,207,0.25)",
              overflow: "hidden",
              animation: "lookupSlideIn .22s cubic-bezier(.34,1.56,.64,1) both",
              flexShrink: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                background: "rgba(181,206,230,0.60)",
                borderBottom: "1px solid rgba(139,174,207,0.40)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d4a6a" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span style={{ color: "#0d1b2a", fontSize: 10, letterSpacing: 3, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>TRA CỨU ĐƠN THUÊ</span>
              </div>
              <button
                onClick={close}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(13,27,42,0.10)",
                  border: "1px solid rgba(13,27,42,0.20)",
                  cursor: "pointer",
                  color: "#2d4a6a",
                  fontSize: 18,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  ref={inputRef}
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value.toUpperCase());
                    setErr(false);
                    setResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="#92K0001"
                  autoComplete="off"
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.65)",
                    border: `1.5px solid ${err ? "#ef4444" : "rgba(139,174,207,0.50)"}`,
                    borderRadius: 11,
                    color: "#0d1b2a",
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "monospace",
                    letterSpacing: 2,
                    transition: "border .2s",
                  }}
                />
                <button
                  onClick={() => search()}
                  style={{
                    padding: "12px 18px",
                    background: "#0D1B2A",
                    color: "#c9a84c",
                    border: "1px solid rgba(201,168,76,0.4)",
                    borderRadius: 11,
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 12,
                    fontFamily: "system-ui,sans-serif",
                    flexShrink: 0,
                    letterSpacing: 1,
                  }}
                >
                  TÌM
                </button>
              </div>

              {err && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(192,41,10,0.12)",
                    border: "1px solid rgba(192,41,10,0.30)",
                    color: "#ef4444",
                    fontSize: 12,
                    fontFamily: "system-ui,sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>✕</span> Không tìm thấy mã đơn này
                </div>
              )}

              {result && (() => {
                const dropDs = result.days >= 1 ? dateAddDays(result.date, result.days) : result.date;
                return (
                  <div
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(139,174,207,0.35)",
                      background: "rgba(255,255,255,0.55)",
                      animation: "pulseIn .3s ease",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: sc.color + "22",
                        borderBottom: `1px solid ${sc.color}33`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#0d1b2a", fontWeight: 900, fontSize: 15, fontFamily: "monospace", letterSpacing: 2 }}>{result.id}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.color + "33", color: sc.color, border: `1px solid ${sc.color}55`, letterSpacing: 0.5 }}>
                          {sc.label}
                        </span>
                        <button
                          onClick={refresh}
                          title="Làm mới"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(13,27,42,0.10)",
                            border: "1px solid rgba(13,27,42,0.20)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            color: "#2d4a6a",
                          }}
                        >
                          <span style={{ display: "inline-block", animation: refreshing ? "spin 0.7s linear infinite" : "none" }}>↻</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "#0d1b2a", fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
                        📷 {result.cameraName} · {fmtDays(result.days, result.shift)}
                      </div>
                      {result.date && result.days && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.40)", borderRadius: 10, padding: "5px 12px", fontSize: 11, color: "#14532d", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                            ▶ Nhận: {getTime(result, "pick")} · {fmtD(result.date)}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.40)", borderRadius: 10, padding: "5px 12px", fontSize: 11, color: "#78350f", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                            ◀ Trả: {getTime(result, "drop")} · {fmtD(dropDs)}
                          </span>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid rgba(139,174,207,0.20)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#2d4a6a", fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>TỔNG TIỀN</span>
                        <span style={{ color: "#c9a84c", fontWeight: 900, fontSize: 20, fontFamily: "system-ui,sans-serif" }}>{fmtVND(result.total)}</span>
                      </div>
                      {lastRefresh && (
                        <div style={{ color: "#4a6a8a", fontSize: 9, fontFamily: "system-ui,sans-serif", letterSpacing: 1, textAlign: "right" }}>
                          Cập nhật: {lastRefresh.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export { Badge };
