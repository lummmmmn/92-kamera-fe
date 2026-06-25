import { useRef, useEffect } from "react";

/**
 * Animated aurora blob background on canvas
 * - Mobile: 2 blobs @ 5fps to save battery
 * - Desktop: 4 blobs @ 10fps
 * - Pauses when body has .is-scrolling class
 * - Pauses when tab is hidden
 */
export default function FlowBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    let raf;

    const isMob   = window.innerWidth < 900;
    const FRAME_MS = isMob ? 200 : 100;
    let lastDraw  = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const allBlobs = [
      { x: 0.50, y: 0.38, r: 0.65, color: "rgba(201,168,76,",  ox: 0.10, oy: 0.08, sx: 0.00018, sy: 0.00014, alpha: 0.06 },
      { x: 0.10, y: 0.20, r: 0.55, color: "rgba(200,114,26,",  ox: 0.12, oy: 0.10, sx: 0.00022, sy: 0.00016, alpha: 0.05 },
      { x: 0.85, y: 0.70, r: 0.50, color: "rgba(180,80,20,",   ox: 0.09, oy: 0.12, sx: 0.00016, sy: 0.00024, alpha: 0.04 },
      { x: 0.20, y: 0.80, r: 0.42, color: "rgba(201,168,76,",  ox: 0.08, oy: 0.09, sx: 0.00014, sy: 0.00020, alpha: 0.04 },
    ];
    const blobs = isMob ? allBlobs.slice(0, 2) : allBlobs;

    let t = 0;
    const draw = (now) => {
      if (document.body.classList.contains("is-scrolling")) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (now - lastDraw < FRAME_MS) { raf = requestAnimationFrame(draw); return; }
      lastDraw = now;

      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#8fc8d4";
      ctx.fillRect(0, 0, W, H);

      blobs.forEach((b) => {
        const cx     = (b.x + Math.sin(t * b.sx * 1000) * b.ox) * W;
        const cy     = (b.y + Math.cos(t * b.sy * 1000) * b.oy) * H;
        const radius = b.r * Math.max(W, H);
        const grad   = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   b.color + b.alpha + ")");
        grad.addColorStop(0.4, b.color + b.alpha * 0.5 + ")");
        grad.addColorStop(1,   b.color + "0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      if (!isMob) {
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.30)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }

      t += 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", display: "block", willChange: "transform" }}
    />
  );
}
