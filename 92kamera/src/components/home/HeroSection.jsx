import { useState } from "react";
import { useTypewriter } from "../../hooks/useTypewriter.js";
import CameraLens3D from "../layout/CameraLens3D.jsx";

export default function HeroSection({
  isMobile,
  loggedUser,
  onOpenLogin,
  onOpenCustomer,
  onBook,
  openQS,
  setLookupOpen,
  siteContent,
}) {
  const [bracketSpread, setBracketSpread] = useState(false);

  const handleBracketClick = () => {
    setBracketSpread(true);
    setTimeout(() => setBracketSpread(false), 500);
  };

  const tw1 = useTypewriter("DỊCH VỤ CHO THUÊ MÁY ẢNH · NÚI THÀNH · TAM KỲ", 38, 600);
  const tw2 = useTypewriter("Trải nghiệm máy ảnh · Bắt trọn khoảnh khắc", 42, tw1.done ? 100 : 99999);

  return (
    <div
      style={{
        height: isMobile ? "100svh" : "100vh",
        minHeight: isMobile ? "580px" : "auto",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* ── Social icons — top left ── */}
      {!isMobile && (
        <div style={{ position: "absolute", top: 28, left: 44, display: "flex", gap: 10, zIndex: 10 }}>
          {[
            {
              k: "youtube",
              label: "YouTube",
              glow: "#ff3c3c",
              glowShadow: "#ff3c3c",
              border: "#ff3c3c",
              path: (
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
              ),
              fill: true,
            },
            {
              k: "facebook",
              label: "Facebook",
              glow: "#1877f2",
              glowShadow: "#1877f2",
              border: "#1877f2",
              path: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />,
              fill: true,
            },
            {
              k: "tiktok",
              label: "TikTok",
              glow: "#000000",
              glowShadow: "#000000",
              border: "#000000",
              path: (
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z" />
              ),
              fill: true,
            },
            { k: "instagram", label: "Instagram", glow: "#e1306c", glowShadow: "#e1306c", border: "#e1306c", stroke: true },
          ].map((s) => {
            const url = siteContent?.socialLinks?.[s.k];
            return (
              <button
                key={s.k}
                title={url ? `Mở ${s.label} ↗` : `${s.label} — chưa cài link (Admin → Cài đặt)`}
                onClick={() => url && window.open(url, "_blank")}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(10,10,10,0.72)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: url ? "pointer" : "default",
                  color: "rgba(255,255,255,0.55)",
                  opacity: url ? 1 : 0.38,
                  transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                }}
                onMouseEnter={(e) => {
                  if (!url) return;
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-4px) scale(1.18)";
                  el.style.background = s.glow + "cc";
                  el.style.borderColor = s.border;
                  el.style.color = "#fff";
                  el.style.boxShadow = `0 0 18px ${s.glowShadow},0 0 36px ${s.glowShadow}66,0 6px 20px rgba(0,0,0,0.4)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(0) scale(1)";
                  el.style.background = "rgba(10,10,10,0.72)";
                  el.style.borderColor = "rgba(255,255,255,0.12)";
                  el.style.color = "rgba(255,255,255,0.55)";
                  el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={s.fill ? "currentColor" : "none"}
                  stroke={s.stroke ? "currentColor" : "none"}
                  strokeWidth={s.stroke ? "2" : "0"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {s.path || (
                    <>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </>
                  )}
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main hero content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          padding: isMobile ? "12px 20px 20px" : "0 0 14% 0",
          gap: isMobile ? 10 : 0,
        }}
      >
        {/* ── LEFT: Premium branding block ── */}
        <div
          style={
            isMobile
              ? {
                  flex: "0 0 auto",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  animation: "heroFadeIn 1.1s cubic-bezier(.25,.46,.45,.94) both",
                  order: 2,
                }
              : {
                  position: "absolute",
                  left: "4%",
                  top: "52%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  animation: "heroFadeIn 1.1s cubic-bezier(.25,.46,.45,.94) both",
                }
          }
        >
          {/* ── LOGO ── */}
          <div style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.08))" }}>
            <div
              onClick={handleBracketClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontFamily: '"Palatino Linotype","Book Antiqua","Palatino",Georgia,"Times New Roman",serif',
                color: "#141414",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              {(() => {
                const bw = isMobile ? 14 : 22,
                  bh = isMobile ? 42 : 60,
                  sw = 5;
                const tx = bracketSpread ? (isMobile ? -8 : -12) : 0;
                const tyT = bracketSpread ? (isMobile ? -8 : -12) : 0;
                const tyB = bracketSpread ? (isMobile ? 8 : 12) : 0;
                return (
                  <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{ flexShrink: 0, marginRight: isMobile ? 10 : 13, overflow: "visible" }}>
                    <path
                      d={`M ${bw} ${sw / 2} L ${sw / 2} ${sw / 2} L ${sw / 2} ${bh / 2}`}
                      fill="none"
                      stroke="rgba(20,20,20,0.82)"
                      strokeWidth={sw}
                      strokeLinecap="square"
                      style={{
                        transform: `translate(${tx}px,${tyT}px)`,
                        transition: bracketSpread ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)",
                        willChange: "transform",
                      }}
                    />
                    <path
                      d={`M ${sw / 2} ${bh / 2} L ${sw / 2} ${bh - sw / 2} L ${bw} ${bh - sw / 2}`}
                      fill="none"
                      stroke="rgba(20,20,20,0.82)"
                      strokeWidth={sw}
                      strokeLinecap="square"
                      style={{
                        transform: `translate(${tx}px,${tyB}px)`,
                        transition: bracketSpread ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)",
                        willChange: "transform",
                      }}
                    />
                  </svg>
                );
              })()}

              <span
                style={{
                  fontSize: isMobile ? 30 : 41,
                  fontWeight: 400,
                  letterSpacing: isMobile ? 1 : 1.7,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <span>92</span>
                <span style={{ marginLeft: isMobile ? 10 : 16 }}>KA</span>
                <span style={{ marginLeft: isMobile ? 10 : 16 }}>MÊ</span>
                <span style={{ marginLeft: isMobile ? 10 : 16 }}>RA</span>
                <span
                  style={{
                    display: "inline-block",
                    width: isMobile ? 7 : 10,
                    height: isMobile ? 7 : 10,
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 38% 34%, #ff5050 0%, #cc0000 52%, #820000 100%)",
                    boxShadow:
                      "0 0 7px rgba(210,0,0,0.72), 0 0 14px rgba(210,0,0,0.32), 0 0 28px rgba(210,0,0,0.12), inset 0 1px 0 rgba(255,155,155,0.5)",
                    marginLeft: isMobile ? 3 : 5,
                    flexShrink: 0,
                    position: "relative",
                    top: isMobile ? -9 : -12,
                    animation: "recPulse 2.4s ease-in-out infinite",
                  }}
                />
              </span>

              {(() => {
                const bw = isMobile ? 14 : 22,
                  bh = isMobile ? 42 : 60,
                  sw = 5;
                const tx = bracketSpread ? (isMobile ? 8 : 12) : 0;
                const tyT = bracketSpread ? (isMobile ? -8 : -12) : 0;
                const tyB = bracketSpread ? (isMobile ? 8 : 12) : 0;
                return (
                  <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{ flexShrink: 0, marginLeft: isMobile ? 10 : 13, overflow: "visible" }}>
                    <path
                      d={`M 0 ${sw / 2} L ${bw - sw / 2} ${sw / 2} L ${bw - sw / 2} ${bh / 2}`}
                      fill="none"
                      stroke="rgba(20,20,20,0.82)"
                      strokeWidth={sw}
                      strokeLinecap="square"
                      style={{
                        transform: `translate(${tx}px,${tyT}px)`,
                        transition: bracketSpread ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)",
                        willChange: "transform",
                      }}
                    />
                    <path
                      d={`M ${bw - sw / 2} ${bh / 2} L ${bw - sw / 2} ${bh - sw / 2} L 0 ${bh - sw / 2}`}
                      fill="none"
                      stroke="rgba(20,20,20,0.82)"
                      strokeWidth={sw}
                      strokeLinecap="square"
                      style={{
                        transform: `translate(${tx}px,${tyB}px)`,
                        transition: bracketSpread ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)",
                        willChange: "transform",
                      }}
                    />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* ── SUBTITLE ── */}
          <div
            style={{
              marginTop: isMobile ? 16 : 15,
              fontSize: isMobile ? 7.8 : 9.6,
              letterSpacing: isMobile ? 1.6 : 2.5,
              fontFamily: "var(--font-ui)",
              color: "#2a2825",
              fontWeight: 700,
              whiteSpace: "nowrap",
              lineHeight: 1,
              minHeight: 16,
            }}
          >
            <span>
              {tw1.displayed}
              <span style={{ opacity: tw1.done ? 0 : 1, transition: "opacity .3s" }}>▌</span>
            </span>
          </div>

          {/* ── TAGLINE ── */}
          <div
            style={{
              marginTop: 10,
              fontSize: isMobile ? 13 : 12.6,
              fontStyle: "italic",
              color: "#3d3a37",
              fontFamily: '"Palatino Linotype","Book Antiqua","Palatino",Georgia,serif',
              letterSpacing: 0.3,
              lineHeight: 1.6,
              fontWeight: 400,
              minHeight: isMobile ? "auto" : 20,
            }}
          >
            <span>
              {tw2.displayed}
              <span style={{ opacity: tw2.done || !tw1.done ? 0 : 1, transition: "opacity .3s" }}>▌</span>
            </span>
          </div>

          {/* ── CTAs ── */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: isMobile ? 8 : 12,
              flexWrap: "nowrap",
              justifyContent: isMobile ? "center" : "flex-start",
              marginTop: isMobile ? 18 : 32,
            }}
          >
            <div
              className="btn-hero-wrap"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 32px rgba(200,200,240,0.55), 0 0 64px rgba(200,200,240,0.2)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 18px rgba(200,200,240,0.15)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              style={{
                transition: "all .28s cubic-bezier(.4,0,.2,1)",
                flexShrink: 0,
                width: isMobile ? 132 : 143,
                height: isMobile ? 34 : 34,
                boxSizing: "border-box",
              }}
            >
              <button
                onClick={openQS}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(160deg, rgba(232,240,248,0.95) 0%, rgba(197,216,236,0.90) 60%, rgba(181,206,230,0.95) 100%)",
                  color: "#0d1b2a",
                  border: "1px solid rgba(255,255,255,0.60)",
                  padding: isMobile ? "0 14px" : "0 32px",
                  width: "100%",
                  height: "100%",
                  fontSize: isMobile ? 8 : 8.5,
                  letterSpacing: isMobile ? 1.5 : 3,
                  fontFamily: "system-ui,sans-serif",
                  fontWeight: 800,
                  cursor: "pointer",
                  borderRadius: 12,
                  transition: "filter .2s",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 16px rgba(13,27,42,0.15)",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                THUÊ NGAY
              </button>
            </div>
            <div style={{ flexShrink: 0, width: isMobile ? 132 : 143, height: isMobile ? 34 : 34, padding: 1.5, boxSizing: "border-box", borderRadius: 16 }}>
              <button
                onClick={() => setLookupOpen(true)}
                data-tracuu
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "rgba(74,89,104,0.85)",
                  color: "#d4cab8",
                  border: "1px solid rgba(139,174,207,0.35)",
                  borderRadius: 12,
                  padding: isMobile ? "0 14px" : "0 32px",
                  width: "100%",
                  height: "100%",
                  fontSize: isMobile ? 8 : 8.5,
                  letterSpacing: isMobile ? 1.5 : 3,
                  fontFamily: "system-ui,sans-serif",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "filter .2s",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                TRA CỨU ĐƠN
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER: 3D Lens ── */}
        <div
          style={{
            width: "100%",
            height: isMobile ? "auto" : "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "heroFadeIn 1.3s cubic-bezier(.25,.46,.45,.94) .15s both",
            ...(isMobile ? { order: 1, flexShrink: 0 } : {}),
          }}
        >
          <CameraLens3D
            onBook={onBook}
            loggedUser={loggedUser}
            onOpenLogin={onOpenLogin}
            onOpenCustomer={onOpenCustomer}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          zIndex: 6,
          animation: "floatY 2.2s ease-in-out infinite",
        }}
      >
        <div style={{ width: "0.5px", height: 32, background: "linear-gradient(to bottom,transparent,rgba(0,0,0,0.28))" }} />
        <div style={{ fontSize: 7, color: "#b0aba6", letterSpacing: 3.5, fontFamily: "system-ui,sans-serif", fontWeight: 500 }}>
          SCROLL
        </div>
      </div>

      <style>{`
        @keyframes recPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 7px rgba(210,0,0,0.72), 0 0 14px rgba(210,0,0,0.32), 0 0 28px rgba(210,0,0,0.12) }
          50% { opacity: 0.82; box-shadow: 0 0 4px rgba(210,0,0,0.5), 0 0 8px rgba(210,0,0,0.2), 0 0 18px rgba(210,0,0,0.08) }
        }
      `}</style>
    </div>
  );
}
