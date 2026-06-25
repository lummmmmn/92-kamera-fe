import { useState, useRef } from "react";

export default function DesktopFAB({ onOpen, visible }) {
  const SIZE = 46;
  const DOT = 10;

  const [dragged, setDragged] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 18 });
  const [hovered, setHovered] = useState(false);
  const posRef = useRef({ x: 0, y: 18 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const clamp = (x, y) => ({
    x: Math.max(8, Math.min(window.innerWidth - SIZE - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - SIZE - 8, y)),
  });

  const onPointerDown = (e) => {
    if (!visible) return;
    if (e.button !== undefined && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const origX = dragged ? posRef.current.x : rect.left;
    const origY = dragged ? posRef.current.y : rect.top;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX, origY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      const np = clamp(dragRef.current.origX + dx, dragRef.current.origY + dy);
      posRef.current = np;
      setPos({ ...np });
      if (!dragged) setDragged(true);
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    if (!wasMoved && visible) onOpen();
  };

  const G2 = "#c9a84c";
  const C = SIZE / 2;
  const teeth = Array.from({ length: 32 }, (_, i) => {
    const ang = (i * 11.25 * Math.PI) / 180;
    const r1 = C - 4.5, r2 = C - 1;
    const x1 = C + Math.cos(ang) * r1, y1 = C + Math.sin(ang) * r1;
    const x2 = C + Math.cos(ang) * r2, y2 = C + Math.sin(ang) * r2;
    const bA = ang + (5.625 * Math.PI / 180);
    const bx1 = C + Math.cos(bA) * r1, by1 = C + Math.sin(bA) * r1;
    const bx2 = C + Math.cos(bA) * r2, by2 = C + Math.sin(bA) * r2;
    const v = Math.round(48 + ((Math.cos(ang - 0.8) + 1) / 2) * 58);
    return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${bx2.toFixed(1)} ${by2.toFixed(1)} L${bx1.toFixed(1)} ${by1.toFixed(1)}Z`, v };
  });

  const baseStyle = dragged ? { left: pos.x, top: pos.y } : { right: 18, top: 18 };
  const dotStyle = dragged ? { left: pos.x + (SIZE - DOT) / 2, top: pos.y + (SIZE - DOT) / 2 } : { right: 18 + (SIZE - DOT) / 2, top: 18 + (SIZE - DOT) / 2 };

  return (
    <>
      <div
        onClick={() => { if (!visible) onOpen(); }}
        style={{
          position: "fixed", zIndex: 9999,
          ...dotStyle,
          width: DOT, height: DOT, borderRadius: "50%",
          background: G2, boxShadow: `0 0 6px ${G2}99`,
          cursor: "pointer",
          pointerEvents: visible ? "none" : "all",
          opacity: visible ? 0 : 1,
          transform: visible ? "scale(0)" : "scale(1)",
          transition: "opacity .25s, transform .25s",
        }}
      />

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed", zIndex: 9999,
          ...baseStyle,
          width: SIZE, height: SIZE,
          cursor: "grab", userSelect: "none",
          pointerEvents: visible ? "all" : "none",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.2)",
          filter: hovered
            ? `drop-shadow(0 0 8px ${G2}66) drop-shadow(0 4px 14px rgba(0,0,0,0.9))`
            : "drop-shadow(0 4px 12px rgba(0,0,0,0.85))",
          transition: "opacity .25s, transform .25s, filter .2s",
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
          <defs>
            <radialGradient id="dfab-body" cx="38%" cy="30%" r="68%">
              <stop offset="0%" stopColor={hovered ? "#3a3020" : "#363636"} />
              <stop offset="40%" stopColor={hovered ? "#201c0e" : "#222"} />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
            <linearGradient id="dfab-chrome" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#d8d8d8" /><stop offset="20%" stopColor="#aaa" />
              <stop offset="38%" stopColor="#eee" /><stop offset="55%" stopColor="#777" />
              <stop offset="72%" stopColor="#c8c8c8" /><stop offset="88%" stopColor="#555" />
              <stop offset="100%" stopColor="#b0b0b0" />
            </linearGradient>
            <radialGradient id="dfab-knurl" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="#080808" />
              <stop offset="100%" stopColor="#1c1c1c" />
            </radialGradient>
            <radialGradient id="dfab-center" cx="40%" cy="33%" r="60%">
              <stop offset="0%" stopColor={hovered ? "#28220e" : "#282828"} />
              <stop offset="55%" stopColor={hovered ? "#14100a" : "#181818"} />
              <stop offset="100%" stopColor="#060606" />
            </radialGradient>
            <radialGradient id="dfab-gloss" cx="32%" cy="18%" r="52%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.17)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="dfab-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={hovered ? G2 + "44" : G2 + "00"} />
              <stop offset="100%" stopColor={G2 + "00"} />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C + 1.2} r={C - 1} fill="rgba(0,0,0,0.38)" />
          <circle cx={C} cy={C} r={C - 1} fill="url(#dfab-knurl)" />
          {teeth.map((t, i) => (
            <path key={i} d={t.d} fill={`rgb(${t.v},${t.v},${t.v})`} stroke="rgba(0,0,0,0.48)" strokeWidth="0.25" />
          ))}
          <circle cx={C} cy={C} r={C - 5} fill="url(#dfab-chrome)" />
          <circle cx={C} cy={C} r={C - 5.6} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.7" />
          <circle cx={C} cy={C} r={C - 7} fill="url(#dfab-body)" />
          <circle cx={C} cy={C} r={C - 7} fill="url(#dfab-gold)" />
          <circle cx={C} cy={C} r={C - 7.8} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.9" />
          <circle cx={C} cy={C} r={C - 13} fill="url(#dfab-center)" />
          <circle cx={C} cy={C} r={C - 13} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.1" />
          <circle cx={C} cy={C} r={C - 13.8} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          {[-3.5, 0, 3.5].map((dy, i) => (
            <line key={i} x1={C - 5} y1={C + dy} x2={C + 5} y2={C + dy}
              stroke={hovered ? G2 : "rgba(201,168,76,0.82)"} strokeWidth="1.4" strokeLinecap="round" />
          ))}
          <ellipse cx={C - 4} cy={C - 7} rx="7" ry="4" fill="url(#dfab-gloss)" opacity="0.6" />
        </svg>
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.14)",
          animation: hovered ? "none" : "fabPulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
