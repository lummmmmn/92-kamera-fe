import { useState, useRef, useEffect } from "react";
import { useMobile } from "../../hooks/useMobile.js";

/**
 * Iris-wipe splash screen on first load
 * phase: 0=invisible → 1=logo fade-in → 2=tagline → 3=iris-close → done
 */
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  const isMob    = useMobile();
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1700);
    const t4 = setTimeout(() => onDoneRef.current?.(), 2300);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const sz  = isMob ? 1.45 : 2.2;
  const s   = (n) => n * sz;
  const bw  = 4;
  const col = "#141414";
  const sp  = phase === 0 ? (isMob ? 48 : 65) : 0;
  const brTr = "transform 0.85s cubic-bezier(.16,1,.3,1), opacity 0.7s ease";
  const bracketColor = "rgba(20,20,20,0.78)";

  const irisStyle =
    phase >= 3
      ? { clipPath: "circle(0% at 50% 50%)", transition: "clip-path 0.55s cubic-bezier(.7,0,.3,1) 0.05s" }
      : { clipPath: "circle(150% at 50% 50%)", transition: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden", ...irisStyle }}>
      {/* Background layers */}
      <div style={{ position: "absolute", inset: 0, background: "#8fc8d4" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 130% 85% at 50% 22%, #5fccdd 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 15% 55%, rgba(77,193,213,0.7) 0%, transparent 60%), linear-gradient(180deg, #8fc8d4 0%, #a9b8bc 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(236,243,248,0.58) 0%, transparent 40%, rgba(220,235,244,0.27) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(20,50,75,0.14) 100%)" }} />
      {/* Film grain */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.22 }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-splash"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="5" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain-splash)" />
      </svg>

      {/* Logo with bracket animation */}
      <div style={{ display: "inline-flex", alignItems: "center", fontFamily: '"Palatino Linotype","Book Antiqua","Palatino",Georgia,"Times New Roman",serif', color: col, userSelect: "none", position: "relative", opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "scale(1)" : "scale(0.94)", transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(.2,.8,.3,1)", filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.08))" }}>
        {/* Bracket left */}
        <div style={{ position: "relative", width: s(13), height: s(32), marginRight: s(9), flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${bracketColor}`, borderTop: `${bw}px solid ${bracketColor}`, transform: `translate(${-sp}px,${-sp}px)`, opacity: phase === 0 ? 0 : 1, transition: brTr }} />
          <span style={{ position: "absolute", bottom: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${bracketColor}`, borderBottom: `${bw}px solid ${bracketColor}`, transform: `translate(${-sp}px,${sp}px)`, opacity: phase === 0 ? 0 : 1, transition: brTr }} />
        </div>
        {/* Text */}
        <span style={{ fontSize: s(20), fontWeight: 400, letterSpacing: s(1.5), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
          <span>92</span>
          <span style={{ marginLeft: s(10) }}>KA</span>
          <span style={{ marginLeft: s(10) }}>MÊ</span>
          <span style={{ marginLeft: s(10) }}>RA</span>
          <span style={{ display: "inline-block", width: s(7), height: s(7), borderRadius: "50%", background: "radial-gradient(circle at 38% 34%, #ff5050 0%, #cc0000 52%, #820000 100%)", boxShadow: "0 0 7px rgba(210,0,0,0.72), 0 0 14px rgba(210,0,0,0.32), inset 0 1px 0 rgba(255,155,155,0.5)", marginLeft: s(3), flexShrink: 0, position: "relative", top: s(-6) }} />
        </span>
        {/* Bracket right */}
        <div style={{ position: "relative", width: s(13), height: s(32), marginLeft: s(9), flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${bracketColor}`, borderTop: `${bw}px solid ${bracketColor}`, transform: `translate(${sp}px,${-sp}px)`, opacity: phase === 0 ? 0 : 1, transition: brTr }} />
          <span style={{ position: "absolute", bottom: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${bracketColor}`, borderBottom: `${bw}px solid ${bracketColor}`, transform: `translate(${sp}px,${sp}px)`, opacity: phase === 0 ? 0 : 1, transition: brTr }} />
        </div>
      </div>

      {/* Tagline */}
      <div style={{ color: "#484644", fontSize: isMob ? 9 : 10, letterSpacing: isMob ? 4 : 6, fontFamily: "var(--font-ui)", textTransform: "uppercase", fontWeight: 700, marginTop: isMob ? 18 : 26, opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.5s ease, transform 0.5s ease", textAlign: "center", padding: "0 16px" }}>
        Dịch vụ cho thuê máy ảnh
      </div>
      <div style={{ width: phase >= 2 ? (isMob ? 90 : 130) : 0, height: 1, background: "linear-gradient(to right, transparent, rgba(20,20,20,0.35), transparent)", marginTop: isMob ? 10 : 14, transition: "width 0.5s cubic-bezier(.4,0,.2,1) 0.1s" }} />
    </div>
  );
}
