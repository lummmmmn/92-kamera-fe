import { useState, useEffect, useRef } from "react";
import { G, TXT, MUT, BG } from "../../lib/constants.js";
import Logo from "../common/Logo.jsx";

export default function MobileFAB({ siteContent, onBook, loggedUser, onOpenLogin, onOpenCustomer, orders }) {
  const fabRef = useRef(null);
  const menuRef = useRef(null);
  const posRef = useRef({ x: 6, y: 8 }); // default: sát góc trên trái
  const [pos, setPos] = useState({ x: 6, y: 8 });
  const [open, setOpen] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const clampPos = (x, y) => {
    const W = window.innerWidth, H = window.innerHeight;
    const size = 37;
    return { x: Math.max(4, Math.min(W - size - 4, x)), y: Math.max(4, Math.min(H - size - 4, y)) };
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.type === "mousedown") return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, origX: posRef.current.x, origY: posRef.current.y, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      const np = clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy);
      posRef.current = np;
      setPos({ ...np });
      if (open) setOpen(false);
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    if (!wasMoved) setOpen((o) => !o);
  };

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        fabRef.current &&
        !fabRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Tính vị trí menu (popup gần FAB, không ra ngoài màn hình)
  const menuW = 220;
  const menuH = 380;
  let menuX = pos.x + 44;
  let menuY = pos.y;
  if (menuX + menuW > window.innerWidth - 8) menuX = pos.x - menuW - 8;
  if (menuY + menuH > window.innerHeight - 8) menuY = window.innerHeight - menuH - 8;
  if (menuY < 4) menuY = 4;

  return (
    <>
      {/* FAB button — Lens Cap 3D */}
      <div
        ref={fabRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 300,
          width: 37,
          height: 37,
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          filter: open
            ? `drop-shadow(0 0 10px ${G}66) drop-shadow(0 6px 18px rgba(0,0,0,0.85))`
            : "drop-shadow(0 6px 18px rgba(0,0,0,0.8)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          transition: "filter .25s",
        }}
      >
        <svg viewBox="0 0 62 62" width="37" height="37" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
          <defs>
            <radialGradient id="fab-body" cx="38%" cy="30%" r="68%">
              <stop offset="0%" stopColor={open ? "#3a3020" : "#383838"} />
              <stop offset="35%" stopColor={open ? "#201c0e" : "#252525"} />
              <stop offset="70%" stopColor={open ? "#131008" : "#181818"} />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
            <linearGradient id="fab-chrome" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#d0d0d0" />
              <stop offset="18%" stopColor="#a8a8a8" />
              <stop offset="35%" stopColor="#e8e8e8" />
              <stop offset="52%" stopColor="#888" />
              <stop offset="68%" stopColor="#c8c8c8" />
              <stop offset="85%" stopColor="#606060" />
              <stop offset="100%" stopColor="#b0b0b0" />
            </linearGradient>
            <radialGradient id="fab-knurl-bg" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="#0a0a0a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
            <radialGradient id="fab-center" cx="42%" cy="35%" r="60%">
              <stop offset="0%" stopColor={open ? "#2a2415" : "#2a2a2a"} />
              <stop offset="50%" stopColor={open ? "#16120a" : "#191919"} />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
            <radialGradient id="fab-gloss" cx="35%" cy="20%" r="55%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="fab-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={G + "55"} />
              <stop offset="100%" stopColor={G + "00"} />
            </radialGradient>
          </defs>

          <circle cx="31" cy="32.5" r="29" fill="rgba(0,0,0,0.45)" />
          <circle cx="31" cy="31" r="29" fill="url(#fab-knurl-bg)" />
          {Array.from({ length: 36 }).map((_, i) => {
            const ang = (i * 10 * Math.PI) / 180;
            const r1 = 26.5, r2 = 29;
            const x1 = 31 + Math.cos(ang) * r1, y1 = 31 + Math.sin(ang) * r1;
            const x2 = 31 + Math.cos(ang) * r2, y2 = 31 + Math.sin(ang) * r2;
            const bAng = ang + (5 * Math.PI / 180);
            const bx1 = 31 + Math.cos(bAng) * r1, by1 = 31 + Math.sin(bAng) * r1;
            const bx2 = 31 + Math.cos(bAng) * r2, by2 = 31 + Math.sin(bAng) * r2;
            const bright = (Math.cos(ang - 0.8) + 1) / 2;
            const col = `rgb(${Math.round(55 + bright * 55)},${Math.round(55 + bright * 55)},${Math.round(55 + bright * 55)})`;
            return (
              <path
                key={i}
                d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${bx2.toFixed(2)} ${by2.toFixed(2)} L ${bx1.toFixed(2)} ${by1.toFixed(2)} Z`}
                fill={col}
                stroke="rgba(0,0,0,0.55)"
                strokeWidth="0.3"
              />
            );
          })}

          <circle cx="31" cy="31" r="26" fill="url(#fab-chrome)" />
          <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
          <circle cx="31" cy="31" r="25.2" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
          <circle cx="31" cy="31" r="24" fill="url(#fab-body)" />
          {open && <circle cx="31" cy="31" r="24" fill="url(#fab-gold)" />}
          <circle cx="31" cy="31" r="24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <circle cx="31" cy="31" r="23.2" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.2" />
          <circle cx="31" cy="31" r="13" fill="url(#fab-center)" />
          <circle cx="31" cy="31" r="13" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5" />
          <circle cx="31" cy="31" r="12.2" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />

          {open ? (
            <g transform="translate(31,31)">
              <line x1="-5" y1="-5" x2="5" y2="5" stroke={G} strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="-5" x2="-5" y2="5" stroke={G} strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : (
            <g transform="translate(31,31)">
              <line x1="-6" y1="-4" x2="6" y2="-4" stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="-6" y1="0" x2="6" y2="0" stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="-6" y1="4" x2="6" y2="4" stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          )}

          <ellipse cx="26" cy="22" rx="10" ry="6" fill="url(#fab-gloss)" opacity="0.7" />
        </svg>

        {!open && (
          <div
            style={{
              position: "absolute",
              inset: -5,
              borderRadius: "50%",
              border: `1px solid rgba(201,168,76,0.2)`,
              animation: "fabPulse 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Popup menu */}
      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuX,
            top: menuY,
            zIndex: 299,
            width: menuW,
            background:
              "linear-gradient(160deg, rgba(232,240,248,0.97) 0%, rgba(197,216,236,0.94) 60%, rgba(181,206,230,0.93) 100%)",
            border: "1.5px solid rgba(255,255,255,0.88)",
            borderRadius: 22,
            backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 40px rgba(13,27,42,0.18), 0 0 0 1px rgba(255,255,255,0.30)",
            padding: "10px 0",
            animation: "navExpandIn .22s cubic-bezier(.4,0,.2,1)",
            touchAction: "auto",
          }}
        >
          {[
            ["📷 MÁY ẢNH", "cameras"],
            ["🎒 PHỤ KIỆN", "accessories"],
            ["📋 QUY TRÌNH", "quy-trinh"],
            ["💬 FEEDBACK", "feedback"],
            ["📍 VỀ CHÚNG TÔI", "about"],
          ].map(([t, id]) => (
            <button
              key={id}
              onClick={() => {
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                setOpen(false);
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderBottom: "1px solid rgba(13,27,42,0.10)",
                color: TXT,
                fontSize: 12,
                letterSpacing: 2,
                padding: "12px 18px",
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                fontWeight: 600,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t}
            </button>
          ))}

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "6px 14px" }} />

          <button
            onClick={() => {
              setOpen(false);
              if (loggedUser?.role === "admin") {
                window.location.hash = "#/admin";
              } else {
                (loggedUser ? onOpenCustomer || onOpenLogin : onOpenLogin)?.();
              }
            }}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: loggedUser?.role === "admin" ? "#3a7bfd" : TXT,
              fontSize: 12,
              letterSpacing: 2,
              padding: "12px 18px",
              cursor: "pointer",
              fontFamily: "system-ui,sans-serif",
              fontWeight: 600,
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {loggedUser ? (
              <>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: loggedUser.role === "admin" ? "rgba(58,123,253,0.2)" : G + "22",
                    border: `1.5px solid ${loggedUser.role === "admin" ? "rgba(58,123,253,0.45)" : G + "55"}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {loggedUser.role === "admin" ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(58,123,253,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ) : loggedUser.avatar ? (
                    <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: G }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                {loggedUser.displayName || loggedUser.name}
              </>
            ) : (
              <>
                <span>👤</span> ĐĂNG NHẬP
              </>
            )}
          </button>

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "6px 14px" }} />

          <button
            onClick={() => {
              setOpen(false);
              onBook?.();
            }}
            style={{
              width: "calc(100% - 28px)",
              margin: "4px 14px",
              background: "linear-gradient(135deg,#5a5a6e 0%,#c8c8dc 50%,#4a4a60 100%)",
              border: "none",
              color: "#0a0a18",
              fontSize: 9,
              letterSpacing: 2.5,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "system-ui,sans-serif",
              fontWeight: 700,
              textAlign: "center",
              borderRadius: 12,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            GỬI YÊU CẦU THUÊ
          </button>

          <button
            onClick={() => {
              setOpen(false);
              setTimeout(() => {
                const el = document.querySelector("[data-tracuu]");
                el?.click();
              }, 100);
            }}
            style={{
              width: "calc(100% - 28px)",
              margin: "6px 14px 4px",
              background: "rgba(13,27,42,0.08)",
              border: `1px solid rgba(13,27,42,0.18)`,
              color: TXT,
              fontSize: 9,
              letterSpacing: 2.5,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "system-ui,sans-serif",
              fontWeight: 700,
              textAlign: "center",
              borderRadius: 12,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            TRA CỨU ĐƠN
          </button>

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "4px 14px 8px" }} />

          <div style={{ display: "flex", gap: 8, padding: "2px 18px 6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: MUT, fontSize: 9, letterSpacing: 2, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
              FOLLOW
            </span>
            {[
              {
                key: "youtube",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                  </svg>
                ),
              },
              {
                key: "facebook",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                ),
              },
              {
                key: "tiktok",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z" />
                  </svg>
                ),
              },
              {
                key: "instagram",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                ),
              },
            ].map(({ key, icon }) => {
              const url = siteContent?.socialLinks?.[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (url) window.open(url, "_blank");
                  }}
                  style={{
                    opacity: url ? 1 : 0.3,
                    cursor: url ? "pointer" : "default",
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    background: "rgba(13,27,42,0.08)",
                    border: "1px solid rgba(13,27,42,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: TXT,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fabPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </>
  );
}
