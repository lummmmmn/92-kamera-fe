import { useState } from "react";
import { MUT } from "../../lib/constants.js";

/**
 * 92 Ka Mê Ra brand logo
 * @param {boolean} light - dark text on light background (default true)
 * @param {number} size   - scale multiplier (default 1)
 */
export default function Logo({ light = true, size = 1 }) {
  const col = light ? "#1A1917" : MUT;
  const s   = (n) => n * size;
  const bw  = 2.5;

  const [clicked, setClicked] = useState(false);
  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 600);
  };

  const spread = clicked ? s(7) : 0;
  const tr = {
    transition: clicked ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)",
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-display)",
        color: col,
        userSelect: "none",
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {/* Bracket left */}
      <div style={{ position: "relative", width: s(13), height: s(32), marginRight: s(9), flexShrink: 0 }}>
        <span style={{ ...tr, position: "absolute", top: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, transform: `translate(${-spread}px,${-spread}px)` }} />
        <span style={{ ...tr, position: "absolute", bottom: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, transform: `translate(${-spread}px,${spread}px)` }} />
      </div>

      {/* Brand name */}
      <span style={{ fontSize: s(20), fontWeight: 400, letterSpacing: s(1.5), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
        <span>92</span>
        <span style={{ marginLeft: s(10) }}>KA</span>
        <span style={{ marginLeft: s(10) }}>MÊ</span>
        <span style={{ marginLeft: s(10) }}>RA</span>
        {/* Red lens dot */}
        <span style={{
          display: "inline-block",
          width: s(7), height: s(7),
          borderRadius: "50%",
          background: "radial-gradient(circle at 36% 30%, #ff5555 0%, #bb0000 55%, #6a0000 100%)",
          boxShadow: `0 0 ${s(5)}px rgba(190,0,0,0.75), inset 0 ${s(1)}px 0 rgba(255,170,170,0.4)`,
          marginLeft: s(3),
          flexShrink: 0,
          position: "relative",
          top: s(-6),
        }} />
      </span>

      {/* Bracket right */}
      <div style={{ position: "relative", width: s(13), height: s(32), marginLeft: s(9), flexShrink: 0 }}>
        <span style={{ ...tr, position: "absolute", top: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, transform: `translate(${spread}px,${-spread}px)` }} />
        <span style={{ ...tr, position: "absolute", bottom: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, transform: `translate(${spread}px,${spread}px)` }} />
      </div>
    </div>
  );
}
