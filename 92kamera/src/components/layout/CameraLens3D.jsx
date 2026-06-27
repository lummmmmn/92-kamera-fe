import { useState, useEffect, useRef } from "react";
import { G } from "../../lib/constants.js";

export default function CameraLens3D({ onBook, loggedUser, onOpenLogin, onOpenCustomer, isMobile }) {
  const [hoveredRing, setHoveredRing] = useState(null);
  const animRef = useRef(null);
  const isHovRef = useRef(false);
  const speedRef = useRef(0.04);

  // Responsive: lens tự co theo viewport để không ép vỡ hero trên màn hình thấp.
  const [viewH, setViewH] = useState(typeof window !== "undefined" ? window.innerHeight : 900);
  const [viewW, setViewW] = useState(typeof window !== "undefined" ? window.innerWidth : 390);

  useEffect(() => {
    const onResize = () => {
      setViewH(window.innerHeight);
      setViewW(window.innerWidth);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let oA = 0, mA = 0, iA = 0;
    const tick = () => {
      // Pause khi scroll → không cạnh tranh GPU với scroll compositor
      if (!document.body.classList.contains("is-scrolling")) {
        const target = isHovRef.current ? 0.28 : 0.032;
        speedRef.current += (target - speedRef.current) * 0.03;
        const s = speedRef.current;
        oA += s;
        mA -= s * 0.62;
        iA += s * 0.43;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const PALETTE = {
    book: { accent: "#c9a84c", r: 0.788, g: 0.659, b: 0.298, tag: "ACTION · OUTER RING", label: "GỬI YÊU CẦU THUÊ" },
    feedback: { accent: "#38bdf8", r: 0.220, g: 0.741, b: 0.973, tag: "GUIDE · MODULE 2", label: "QUY TRÌNH" },
    cameras: { accent: "#34d399", r: 0.204, g: 0.827, b: 0.600, tag: "PRODUCT · MODULE 3", label: "MÁY ẢNH" },
    acc: { accent: "#a78bfa", r: 0.655, g: 0.545, b: 0.980, tag: "UTILITY · MODULE 4", label: "PHỤ KIỆN" },
    login: { accent: "#f0e8d0", r: 0.941, g: 0.910, b: 0.816, tag: "CORE", label: loggedUser ? "TÀI KHOẢN" : "ĐĂNG NHẬP" },
  };

  const rings = [
    { id: "book", rMid: 215, thick: 44, segs: 36, action: () => onBook() },
    { id: "feedback", rMid: 161, thick: 34, segs: 24, action: () => scrollTo("quy-trinh") },
    { id: "cameras", rMid: 116, thick: 32, segs: 18, action: () => scrollTo("cameras") },
    { id: "acc", rMid: 72, thick: 28, segs: 12, action: () => scrollTo("accessories") },
    { id: "login", rMid: 34, thick: 68, isCenter: true, action: loggedUser ? onOpenCustomer || onOpenLogin : onOpenLogin },
  ];

  const sz = isMobile
    ? Math.round(Math.min(viewW * 0.82, viewH * 0.44, 340))
    : Math.min(544, Math.round(viewH * 0.62));
  const anyHov = !isMobile && hoveredRing !== null;

  return (
    <div
      style={{
        width: sz,
        height: sz,
        position: "relative",
        borderRadius: "50%",
        overflow: "hidden",
        isolation: "isolate",
        boxShadow: "0 18px 36px rgba(0,0,0,0.32), 0 6px 14px rgba(0,0,0,0.18)",
      }}
    >
      <div
        className="lens-float-wrap"
        style={{
          width: sz,
          height: sz,
          position: "relative",
          animation: "lensFloat 5.5s ease-in-out infinite",
          borderRadius: "50%",
          overflow: "hidden",
        }}
        onMouseEnter={() => {
          if (!isMobile) isHovRef.current = true;
        }}
        onMouseLeave={() => {
          isHovRef.current = false;
          setHoveredRing(null);
        }}
      >
        <svg viewBox="-260 -260 520 520" width={sz} height={sz} overflow="hidden" style={{ overflow: "hidden", display: "block", clipPath: "circle(50% at 50% 50%)" }}>
          <defs>
            {rings.map((r, i) => {
              const isHov = hoveredRing === r.id;
              return (
                <radialGradient key={"g" + i} id={"rg" + i} cx="32%" cy="24%" r="78%">
                  <stop offset="0%" stopColor={isHov ? "#888888" : "#424242"} />
                  <stop offset="10%" stopColor={isHov ? "#606060" : "#2e2e2e"} />
                  <stop offset="35%" stopColor={isHov ? "#303030" : "#1a1a1a"} />
                  <stop offset="62%" stopColor={isHov ? "#181818" : "#0d0d0d"} />
                  <stop offset="88%" stopColor={isHov ? "#0e0e0e" : "#050505"} />
                  <stop offset="100%" stopColor={isHov ? "#080808" : "#020202"} />
                </radialGradient>
              );
            })}

            <radialGradient id="cgr" cx="38%" cy="30%" r="64%">
              <stop offset="0%" stopColor="#545454" />
              <stop offset="16%" stopColor="#323232" />
              <stop offset="48%" stopColor="#181818" />
              <stop offset="82%" stopColor="#090909" />
              <stop offset="100%" stopColor="#030303" />
            </radialGradient>

            <radialGradient id="gapVoid" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#080808" />
              <stop offset="100%" stopColor="#020202" />
            </radialGradient>

            <linearGradient id="gloss" x1="4%" y1="0%" x2="68%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="22%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.025)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            <linearGradient id="gloss2" x1="96%" y1="100%" x2="28%" y2="6%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.09)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.025)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            <linearGradient id="cgloss" x1="8%" y1="4%" x2="72%" y2="88%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
              <stop offset="32%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="72%" stopColor="rgba(255,255,255,0.015)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            <radialGradient id="rimLight" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="rgba(255,255,255,0)" />
              <stop offset="92%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.13)" />
            </radialGradient>

            <radialGradient id="plateShadow" cx="50%" cy="62%" r="54%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
            </radialGradient>

            <clipPath id="lensClip">
              <circle r="260" />
            </clipPath>

            {rings.filter((r) => !r.isCenter).map((r, i) => {
              const pal = PALETTE[r.id];
              const h = pal.accent.replace("#", "");
              const rr = parseInt(h.slice(0, 2), 16),
                gg = parseInt(h.slice(2, 4), 16),
                bb = parseInt(h.slice(4, 6), 16);
              return (
                <filter key={"af" + i} id={`accentGlow${i}`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.8" result="blur" />
                  <feFlood floodColor={`rgb(${rr},${gg},${bb})`} floodOpacity="0.55" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              );
            })}

            <clipPath id="avatarClip">
              <circle r="26" />
            </clipPath>

            {rings.filter((r) => !r.isCenter).map((r) => (
              <path key={"tp" + r.id} id={"tpath-" + r.id} d={`M ${-(r.rMid - 2)},0 A ${r.rMid - 2},${r.rMid - 2} 0 0,1 ${r.rMid - 2},0`} />
            ))}

            {rings.filter((r) => !r.isCenter).map((r, i) => {
              const rOut = r.rMid + r.thick / 2;
              return (
                <g key={"hclip" + i}>
                  <clipPath id={"clipTop" + i}>
                    <path d={`M 0,0 L ${rOut + 4},0 A ${rOut + 4},${rOut + 4} 0 0,0 ${-(rOut + 4)},0 Z`} />
                  </clipPath>
                  <clipPath id={"clipBot" + i}>
                    <path d={`M 0,0 L ${rOut + 4},0 A ${rOut + 4},${rOut + 4} 0 0,1 ${-(rOut + 4)},0 Z`} />
                  </clipPath>
                </g>
              );
            })}
          </defs>

          <g clipPath="url(#lensClip)">
            <ellipse cx="0" cy="9" rx="248" ry="244" fill="rgba(0,0,0,0.09)" />
            <circle r="252" fill="url(#plateShadow)" />

            {rings.map((ring, origIdx) => {
              const isHov = !isMobile && hoveredRing === ring.id;
              const pal = PALETTE[ring.id];

              if (ring.isCenter) {
                const cr = ring.rMid;
                return (
                  <g
                    key={ring.id}
                    style={{ cursor: "pointer", opacity: 1, transition: "opacity 0.25s ease" }}
                    onClick={ring.action}
                    onMouseEnter={() => {
                      if (!isMobile) setHoveredRing(ring.id);
                    }}
                    onMouseLeave={() => setHoveredRing(null)}
                  >
                    <circle r={cr + 14} fill="#010101" />
                    <circle r={cr + 12} fill="#030303" />
                    <circle r={cr + 12} fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.7" />
                    <circle r={cr + 10} fill="none" stroke="rgba(0,0,0,0.90)" strokeWidth="5" />
                    <circle r={cr + 7} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
                    <circle r={cr + 5} fill="#060606" />
                    <circle r={cr} fill="url(#cgr)" />
                    <ellipse cx="-4" cy="-7" rx={cr * 0.64} ry={cr * 0.44} fill="url(#cgloss)" />
                    <circle r={cr} fill="url(#rimLight)" />
                    <circle r={cr - 5} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="2.2" />
                    <circle r={cr - 5.8} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
                    <circle r={cr - 9} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
                    <circle r={cr - 1.2} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.1" />
                    <circle r={cr - 0.2} fill="none" stroke="rgba(0,0,0,0.80)" strokeWidth="3" />

                    {isHov && <circle r={cr - 1} fill="none" stroke={pal.accent} strokeWidth="1.2" strokeOpacity="0.55" />}

                    {!loggedUser && (
                      <>
                        <circle r="4" fill={isHov ? pal.accent : "rgba(255,255,255,0.18)"} style={{ transition: "fill 0.3s" }} />
                        <circle r="2" fill={isHov ? "#fff" : "rgba(255,255,255,0.5)"} style={{ transition: "fill 0.3s" }} />
                      </>
                    )}
                    {loggedUser ? (
                      <g>
                        {loggedUser.avatar ? (
                          <image
                            href={loggedUser.avatar}
                            x="-26"
                            y="-26"
                            width="52"
                            height="52"
                            clipPath="url(#avatarClip)"
                            preserveAspectRatio="xMidYMid slice"
                          />
                        ) : (
                          <>
                            <circle r="26" fill="#1a2030" />
                            <text
                              y="4"
                              textAnchor="middle"
                              style={{
                                fill: "rgba(255,255,255,0.88)",
                                fontSize: 18,
                                fontFamily: "system-ui,sans-serif",
                                fontWeight: 700,
                              }}
                            >
                              {(loggedUser.displayName || loggedUser.name || "?")[0].toUpperCase()}
                            </text>
                          </>
                        )}
                        <ellipse cx="-4" cy="-10" rx="17" ry="13" fill="url(#cgloss)" opacity="0.7" />
                        <circle r="26" fill="url(#rimLight)" opacity="0.8" />
                        <circle r="25" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
                        <circle r="26" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                      </g>
                    ) : (
                      <text
                        y="-6"
                        textAnchor="middle"
                        style={{
                          fill: isHov ? pal.accent : "rgba(255,255,255,0.88)",
                          fontSize: 7.4,
                          letterSpacing: 4.0,
                          fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                          fontWeight: 700,
                          transition: "fill 0.28s",
                        }}
                      >
                        {pal.label}
                      </text>
                    )}
                  </g>
                );
              }

              const rOut = ring.rMid + ring.thick / 2;
              const rIn = ring.rMid - ring.thick / 2;
              const clipI = origIdx;

              return (
                <g
                  key={ring.id}
                  style={{ cursor: "pointer", opacity: 1, transition: "opacity 0.25s ease" }}
                  onClick={ring.action}
                  onMouseEnter={() => {
                    if (!isMobile) setHoveredRing(ring.id);
                  }}
                  onMouseLeave={() => setHoveredRing(null)}
                >
                  <circle r={rOut + 16} fill="#000000" />
                  <circle r={rOut + 12} fill="#020202" />
                  <circle r={rOut + 9} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
                  <circle r={rOut + 7} fill="none" stroke="rgba(0,0,0,0.95)" strokeWidth="8" />
                  <circle r={rOut + 2} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
                  <circle r={rOut + 1} fill="none" stroke="rgba(0,0,0,0.70)" strokeWidth="3" />
                  <circle r={rOut} fill={`url(#rg${origIdx})`} />

                  {hoveredRing !== null && !isHov && <circle r={rOut} fill="rgba(0,0,0,0.52)" />}

                  <circle r={rOut} fill="url(#gloss)" clipPath={`url(#clipTop${clipI})`} opacity={isHov ? 1.0 : 0.55} />
                  <circle r={rOut} fill="url(#gloss2)" clipPath={`url(#clipBot${clipI})`} opacity={isHov ? 0.80 : 0.30} />
                  <circle r={rOut} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  <circle r={rOut - 0.8} fill="none" stroke={isHov ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)"} strokeWidth={isHov ? "1.4" : "0.9"} />
                  <circle r={rOut - 2.2} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.8" />
                  <circle r={rOut} fill="url(#rimLight)" />
                  <circle r={rIn + 0.8} fill="none" stroke="rgba(0,0,0,0.90)" strokeWidth="6" />
                  <circle r={rIn + 4} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="5" />
                  <circle r={rIn - 0.8} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />

                  {isHov ? (
                    <>
                      <circle r={rOut + 1} fill="none" stroke={pal.accent} strokeWidth="6" strokeOpacity="0.08" />
                      <circle r={rOut - 1.5} fill="none" stroke={pal.accent} strokeWidth="2.2" strokeOpacity="0.65" filter={`url(#accentGlow${origIdx})`} />
                      <circle r={rIn + 2.5} fill="none" stroke={pal.accent} strokeWidth="2.8" strokeOpacity="0.90" filter={`url(#accentGlow${origIdx})`} />
                      <circle r={rOut} fill={pal.accent} fillOpacity="0.055" />
                    </>
                  ) : (
                    <circle r={rIn + 2.5} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.7" />
                  )}

                  {(() => {
                    const scale = sz / 520;
                    const baseFS = rOut > 228 ? 10.5 : rOut > 178 ? 11.5 : rOut > 128 ? 12.5 : 13.5;
                    const fontSize = Math.max(7.0, baseFS * scale);
                    const baseLS = rOut > 228 ? 5.5 : rOut > 178 ? 4.5 : 3.8;
                    const hovLS = rOut > 228 ? 8.0 : rOut > 178 ? 6.5 : 5.5;
                    const letterSpacing = Math.max(2.5, (isHov ? hovLS : baseLS) * scale);
                    return (
                      <>
                        <text
                          style={{
                            fill: "rgba(0,0,0,0.70)",
                            fontSize,
                            letterSpacing,
                            fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                            fontWeight: 800,
                          }}
                        >
                          <textPath href={`#tpath-${ring.id}`} startOffset="50%" textAnchor="middle" dy="0.6">
                            {pal.label}
                          </textPath>
                        </text>
                        <text
                          style={{
                            fill: isHov ? pal.accent : hoveredRing !== null ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.90)",
                            fontSize,
                            letterSpacing,
                            fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                            fontWeight: 800,
                            transition: "fill 0.25s",
                          }}
                        >
                          <textPath href={`#tpath-${ring.id}`} startOffset="50%" textAnchor="middle">
                            {pal.label}
                          </textPath>
                        </text>
                      </>
                    );
                  })()}
                </g>
              );
            })}

            <text
              x="0"
              y="-240"
              textAnchor="middle"
              style={{
                fill: "rgba(255,255,255,0.22)",
                fontSize: 5.5,
                letterSpacing: 4,
                fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                fontWeight: 700,
              }}
            >
              92 KA MÊ RA
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
