import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cdnUrl } from "../../utils/format.js";

export default function AlbumLightbox({ album, onClose }) {
  const [idx, setIdx] = useState(0);
  const photos = album.photos || [];
  const isMob = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % photos.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [photos.length, onClose]);

  // Touch swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) {
      dx < 0
        ? setIdx((i) => (i + 1) % photos.length)
        : setIdx((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStart.current = null;
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  if (photos.length === 0) return null;

  const overlay = (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", background: "rgba(5,12,22,0.97)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden", overscrollBehavior: "none" }}
    >
      {/* ── HEADER gọn ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMob ? "14px 16px 10px" : "16px 24px 12px",
          background: "linear-gradient(to bottom, rgba(5,12,22,0.90) 0%, transparent 100%)",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: isMob ? 14 : 16, fontFamily: "var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {album.name}
          </div>
          {album.cameraTag && (
            <div style={{ color: "rgba(255,255,255,0.50)", fontSize: isMob ? 10 : 11, fontFamily: "var(--font-ui)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="5" width="22" height="16" rx="2" />
                <circle cx="12" cy="14" r="3" />
              </svg>
              {album.cameraTag}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,0.40)", fontSize: isMob ? 11 : 12, fontFamily: "var(--font-ui)", letterSpacing: 1 }}>
            {idx + 1} / {photos.length}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: isMob ? 32 : 36,
              height: isMob ? 32 : 36,
              color: "#fff",
              cursor: "pointer",
              fontSize: isMob ? 15 : 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── ẢNH CHÍNH ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: isMob ? "0 8px" : "0 16px",
        }}
      >
        <img
          src={cdnUrl(photos[idx].url, "full")}
          alt=""
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: isMob ? 12 : 16,
            objectFit: "contain",
            boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
            userSelect: "none",
            display: "block",
          }}
          loading="eager"
        />
      </div>

      {/* ── BOTTOM BAR ── */}
      {photos.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMob ? 8 : 12,
            padding: isMob ? "10px 12px 20px" : "12px 24px 20px",
            background: "linear-gradient(to top, rgba(5,12,22,0.90) 0%, transparent 100%)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
            style={{
              flexShrink: 0,
              width: isMob ? 34 : 40,
              height: isMob ? 34 : 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: isMob ? 18 : 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>

          <div
            style={{
              flex: 1,
              display: "flex",
              gap: isMob ? 6 : 8,
              overflowX: "auto",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
              padding: "2px 0",
            }}
          >
            {photos.map((p, i) => (
              <div
                key={p.id || i}
                onClick={() => setIdx(i)}
                style={{
                  flexShrink: 0,
                  width: isMob ? 44 : 52,
                  height: isMob ? 44 : 52,
                  borderRadius: isMob ? 8 : 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: i === idx ? "2px solid #c9a84c" : "2px solid rgba(255,255,255,0.10)",
                  opacity: i === idx ? 1 : 0.45,
                  transition: "all .2s ease",
                  transform: i === idx ? "scale(1.08)" : "scale(1)",
                }}
              >
                <img src={cdnUrl(p.url, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              </div>
            ))}
          </div>

          <button
            onClick={() => setIdx((i) => (i + 1) % photos.length)}
            style={{
              flexShrink: 0,
              width: isMob ? 34 : 40,
              height: isMob ? 34 : 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: isMob ? 18 : 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
