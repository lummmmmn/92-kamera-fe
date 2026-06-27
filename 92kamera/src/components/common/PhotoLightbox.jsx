import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cdnUrl } from "../../utils/format.js";


/**
 * Full-screen photo lightbox
 * - Keyboard navigation (←/→/Esc)
 * - Touch swipe support
 * - Thumbnail strip at bottom
 *
 * @param {{ id: string, url: string }[]} photos
 * @param {number}   startIndex
 * @param {Function} onClose
 */
export default function PhotoLightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex || 0);
  const total = (photos || []).length;

  useEffect(() => { if (total === 0) onClose(); }, [total, onClose]);
  useEffect(() => { if (total > 0 && idx >= total) setIdx(total - 1); }, [total, idx]);

  // Lock page scroll while the full-screen viewer is open.
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

  // Keyboard
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  setIdx((i) => (i - 1 + total) % total);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % total);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, total]);

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  // Touch swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStart.current = null;
  };

  if (total === 0) return null;
  const safeIdx = Math.min(idx, total - 1);
  const photo   = photos[safeIdx];

  const overlay = (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: 99999, background: "rgba(5,12,22,0.94)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", overscrollBehavior: "none" }}
    >
      {/* Main image */}
      <img
        src={cdnUrl(photo.url, "full")}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.55)", userSelect: "none", display: "block" }}
        loading="eager"
      />

      {/* Counter */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", background: "rgba(5,12,22,0.88)", borderRadius: 99, padding: "5px 16px", color: "#fff", fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: 700, letterSpacing: 1, backdropFilter: "blur(10px)" }}>
        {safeIdx + 1} / {total}
      </div>

      {/* Close */}
      <button onClick={onClose} style={{ position: "fixed", top: 14, right: 18, width: 40, height: 40, borderRadius: "50%", background: "rgba(5,12,22,0.85)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>×</button>

      {/* Bottom bar */}
      {total > 1 && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 18px", background: "linear-gradient(to top, rgba(5,12,22,0.90) 0%, transparent 100%)", zIndex: 10 }}>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>‹</button>

          <div style={{ flex: 1, display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", padding: "2px 0" }}>
            {photos.map((p, i) => (
              <img
                key={p.id || i}
                src={cdnUrl(p.url, "thumb")}
                alt=""
                onClick={() => setIdx(i)}
                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 7, flexShrink: 0, cursor: "pointer", border: i === safeIdx ? "2px solid #c9a84c" : "2px solid transparent", opacity: i === safeIdx ? 1 : 0.5, transition: "all .2s" }}
                loading="lazy"
              />
            ))}
          </div>

          <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>›</button>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
