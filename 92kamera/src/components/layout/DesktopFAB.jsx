import { useState, useRef } from "react";

export default function DesktopFAB({ onOpen, visible }) {
  const SIZE = 48;

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
  const baseStyle = dragged ? { left: pos.x, top: pos.y } : { right: 18, top: 18 };

  return (
    <>
      {/* Main floating icon button */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed",
          zIndex: 9999,
          ...baseStyle,
          width: SIZE,
          height: SIZE,
          cursor: dragRef.current.dragging ? "grabbing" : "grab",
          userSelect: "none",
          pointerEvents: visible ? "all" : "none",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.2)",
          borderRadius: "50%",
          background: hovered
            ? "linear-gradient(135deg, #17324B 0%, #204162 100%)"
            : "linear-gradient(135deg, #0D1B2A 0%, #17324B 100%)",
          border: "1px solid rgba(255, 255, 255, 0.28)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px rgba(13,27,42,0.24)",
          transition: "opacity .25s, transform .25s, background .22s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
          <line
            x1="15"
            y1="18"
            x2="33"
            y2="18"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="15"
            y1="24"
            x2="33"
            y2="24"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="15"
            y1="30"
            x2="33"
            y2="30"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );
}
