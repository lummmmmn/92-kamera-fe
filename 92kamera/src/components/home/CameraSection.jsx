import { useState, useEffect, useRef, useCallback } from "react";
import { G, BG, CARD, BR, TXT, MUT } from "../../lib/constants.js";
import { fmtVND, cdnUrl } from "../../utils/format.js";

function CamImage({ cam, height = 176 }) {
  const [idx, setIdx] = useState(0);
  const imgs = cam.images || [];

  if (imgs.length === 0) {
    return (
      <div
        style={{
          height,
          background: CARD,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 70,
          borderBottom: `1px solid ${BR}`,
        }}
      >
        {cam.icon || "📷"}
      </div>
    );
  }

  return (
    <div style={{ height, position: "relative", overflow: "hidden", borderBottom: `1px solid ${BR}`, background: BG }}>
      <img
        src={cdnUrl(imgs[idx], "full")}
        alt={cam.name}
        style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
        loading="lazy"
      />
      {imgs.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((idx - 1 + imgs.length) % imgs.length);
            }}
            style={{
              position: "absolute",
              left: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.7)",
              color: TXT,
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((idx + 1) % imgs.length);
            }}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.7)",
              color: TXT,
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {imgs.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: i === idx ? G : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CameraSection({ id, cameras, onBook, isMobile }) {
  const [active, setActive] = useState(0);
  const isPaused = useRef(false);
  const camScrollRef = useRef(null);
  const camPausedRef = useRef(false);
  const camIdxRef = useRef(0);
  const total = cameras.length;

  const go = useCallback(
    (dir) => {
      setActive((a) => (a + dir + total) % total);
    },
    [total]
  );

  // Auto-play desktop
  useEffect(() => {
    if (isMobile) return;
    const t = setInterval(() => {
      if (!isPaused.current) go(1);
    }, 3500);
    return () => clearInterval(t);
  }, [go, isMobile]);

  // Auto-scroll mobile
  useEffect(() => {
    if (!isMobile) return;
    const el = camScrollRef.current;
    if (!el) return;
    const t = setInterval(() => {
      if (camPausedRef.current || !el) return;
      const cards = el.querySelectorAll("[data-camcard]");
      if (!cards.length) return;
      camIdxRef.current = (camIdxRef.current + 1) % cards.length;
      setActive(camIdxRef.current);
      const cardW = el.clientWidth - 40;
      el.scrollTo({ left: camIdxRef.current * (cardW + 12), behavior: "smooth" });
    }, 3500);
    const onTouch = () => {
      camPausedRef.current = true;
      setTimeout(() => {
        camPausedRef.current = false;
      }, 6000);
    };
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      clearInterval(t);
      el.removeEventListener("touchstart", onTouch);
    };
  }, [isMobile, cameras.length]);

  const parseName = (name) => {
    const parts = name.split(" ");
    const brandMap = { fujifilm: "FUJIFILM", sony: "SONY", canon: "CANON", nikon: "NIKON", dji: "DJI", gopro: "GOPRO" };
    const firstLow = parts[0].toLowerCase();
    if (brandMap[firstLow]) return { brand: brandMap[firstLow], model: parts.slice(1).join(" ") };
    return { brand: parts[0].toUpperCase(), model: parts.slice(1).join(" ") };
  };

  const shortDesc = (desc) => desc.split(/[,，、]/)[0].trim().toUpperCase();

  // Desktop: marquee carousel
  const [cfPaused, setCfPaused] = useState(false);
  let combined = [...cameras];
  const minItems = 6;
  if (cameras.length > 0) {
    while (combined.length < minItems) combined = [...combined, ...cameras];
  }
  combined = [...combined, ...combined];
  const dur = Math.max(30, combined.length * 3.5);

  if (isMobile) {
    return (
      <div
        id={id}
        className="home-section"
        style={{
          padding: "72px 0 56px",
          margin: "20px 12px",
          borderRadius: 28,
          border: "none",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.08) inset, 0 4px 6px rgba(13,27,42,0.06) inset, 0 16px 64px rgba(5,17,31,0.20), 0 4px 18px rgba(5,17,31,0.12), 0 0 0 1px rgba(13,27,42,0.07)",
          background: "rgba(255,255,255,0.18)",
          overflow: "hidden",
        }}
      >
        <style>{`.cam-scroll::-webkit-scrollbar{display:none}.cam-scroll{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
        <div style={{ padding: "0 16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: isMobile ? 9 : 10.5, letterSpacing: 7, color: G, fontFamily: "var(--font-ui)", marginBottom: 6, fontWeight: 700, opacity: 0.55 }}>
              BỘ SƯU TẬP
            </div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, letterSpacing: 1, margin: 0, color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>
              Máy ảnh cho thuê
            </h2>
          </div>
        </div>
        <div
          ref={camScrollRef}
          className="cam-scroll"
          style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", padding: "0 20px 8px" }}
        >
          {cameras.map((cam, i) => {
            const { brand, model } = parseName(cam.name);
            const isAct = i === active;
            return (
              <div
                key={cam.id}
                data-camcard="1"
                style={{
                  scrollSnapAlign: "center",
                  flexShrink: 0,
                  width: "calc(100vw - 40px)",
                  height: 320,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: `1px solid ${isAct ? G + "66" : BR}`,
                  position: "relative",
                  background: BG,
                }}
              >
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                  <CamImage cam={cam} height={320} />
                </div>
                <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.3) 60%,transparent 100%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "0 20px 20px" }}>
                  <div style={{ fontSize: isMobile ? 8 : 9.5, letterSpacing: 4, color: "rgba(255,255,255,0.5)", fontFamily: "system-ui,sans-serif", marginBottom: 4, fontWeight: 600 }}>
                    {brand}
                  </div>
                  <div style={{ fontSize: isMobile ? 28 : 31, fontWeight: 700, letterSpacing: 0.5, color: "#fff", lineHeight: 1, marginBottom: 5, fontFamily: "system-ui,sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                    {model}
                  </div>
                  <div style={{ fontSize: isMobile ? 8 : 9.5, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontFamily: "system-ui,sans-serif", marginBottom: 14 }}>
                    {shortDesc(cam.desc)}
                  </div>
                  <div style={{ width: 28, height: 1, background: G + "88", marginBottom: 14 }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                      <span style={{ color: "#fff", fontSize: isMobile ? 15 : 16.5, fontWeight: 700, fontFamily: "system-ui,sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
                        {fmtVND(cam.price)}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: isMobile ? 9 : 10.5, marginTop: 3, fontFamily: "system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <div className="btn-3d-wrap" style={{ borderRadius: 10 }}>
                      <button
                        onClick={() => onBook(cam)}
                        className="btn-3d"
                        style={{ borderRadius: 9, fontSize: isMobile ? 8 : 9.5, letterSpacing: 1.5, padding: "6px 10px", whiteSpace: "nowrap" }}
                      >
                        THUÊ NGAY
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
          {cameras.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === active ? 22 : 6,
                height: 5,
                borderRadius: 3,
                background: i === active ? G : BR,
                transition: "all .3s",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className="home-section"
      style={{
        padding: "96px 0 80px",
        margin: "32px 20px",
        borderRadius: 28,
        border: "none",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.08) inset, 0 4px 6px rgba(13,27,42,0.06) inset, 0 16px 64px rgba(5,17,31,0.20), 0 4px 18px rgba(5,17,31,0.12), 0 0 0 1px rgba(13,27,42,0.07)",
        background: "rgba(255,255,255,0.13)",
        backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
        WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`@keyframes scrollCam{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}`}</style>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: `radial-gradient(ellipse,${G}06,transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ textAlign: "center", marginBottom: 32, position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 7, color: G, fontFamily: "var(--font-ui)", marginBottom: 14, fontWeight: 700, opacity: 0.55 }}>
          BỘ SƯU TẬP
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>
          Máy ảnh cho thuê
        </h2>
        <div style={{ width: 36, height: 1, background: G, margin: "0 auto 18px" }} />
        <button
          onClick={() => setCfPaused((p) => !p)}
          style={{
            background: cfPaused ? G + "22" : "none",
            border: `1px solid ${cfPaused ? G : BR}`,
            color: cfPaused ? G : MUT,
            padding: "6px 22px",
            borderRadius: 99,
            fontSize: 11.5,
            cursor: "pointer",
            fontFamily: "system-ui,sans-serif",
            letterSpacing: 1.5,
            transition: "all .3s",
          }}
        >
          {cfPaused ? "▶ TIẾP TỤC" : "⏸ DỪNG"}
        </button>
      </div>

      <div style={{ overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to right,rgba(255,255,255,0.85),transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to left,rgba(255,255,255,0.85),transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "max-content",
            animation: `scrollCam ${dur}s linear infinite`,
            animationPlayState: cfPaused ? "paused" : "running",
            paddingLeft: 20,
          }}
        >
          {combined.map((cam, i) => {
            const parts = cam.name.split(" ");
            const brandMap = { fujifilm: "FUJIFILM", sony: "SONY", canon: "CANON", nikon: "NIKON", dji: "DJI", gopro: "GOPRO" };
            const b = brandMap[parts[0].toLowerCase()] || parts[0].toUpperCase();
            const m = parts.slice(1).join(" ");
            return (
              <div
                key={cam.id + "_" + i}
                onMouseEnter={() => setCfPaused(true)}
                onMouseLeave={() => setCfPaused(false)}
                style={{
                  flexShrink: 0,
                  width: 280,
                  height: 360,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: `1px solid ${G}44`,
                  position: "relative",
                  background: BG,
                  cursor: "pointer",
                }}
                onClick={() => onBook(cam)}
              >
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                  <CamImage cam={cam} height={360} />
                </div>
                <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.4) 50%,rgba(6,6,6,0.1) 100%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "0 20px 20px" }}>
                  <div style={{ fontSize: 9.5, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontFamily: "system-ui,sans-serif", marginBottom: 4, fontWeight: 600 }}>
                    {b}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: 6, fontFamily: "system-ui,sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                    {m}
                  </div>
                  <div style={{ width: 24, height: 1, background: G + "88", marginBottom: 12 }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                      <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "system-ui,sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
                        {fmtVND(cam.price)}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10.5, marginTop: 3, fontFamily: "system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <div className="btn-3d-wrap" style={{ borderRadius: 10 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBook(cam);
                        }}
                        className="btn-3d"
                        style={{ borderRadius: 9, fontSize: 9.5, letterSpacing: 1.5, padding: "6px 10px", whiteSpace: "nowrap" }}
                      >
                        THUÊ NGAY
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
