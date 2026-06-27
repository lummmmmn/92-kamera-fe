import { useEffect } from "react";

// ── SMOOTH SCROLL HOOK ──
export function useSmoothScroll(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if ("ontouchstart" in window) return; // mobile native đã đủ mượt

    let cur = window.scrollY;
    let tgt = window.scrollY;
    let raf = null;
    let weScrolled = false;
    const EASE = 0.105;
    const MULT = 1.1;

    const run = () => {
      const d = tgt - cur;
      if (Math.abs(d) < 0.35) {
        cur = tgt;
        raf = null;
        weScrolled = false;
        return;
      }
      cur += d * EASE;
      weScrolled = true;
      window.scrollTo(0, cur);
      raf = requestAnimationFrame(run);
    };

    const onWheel = (e) => {
      let el = e.target;
      while (el && el !== document.documentElement) {
        if (el !== document.body) {
          const ov = getComputedStyle(el).overflowY;
          if ((ov === "scroll" || ov === "auto") && el.scrollHeight > el.clientHeight + 1) return;
        }
        el = el.parentElement;
      }
      e.preventDefault();
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      tgt = Math.max(0, Math.min(tgt + e.deltaY * MULT, maxY));
      if (!raf) {
        cur = window.scrollY;
        raf = requestAnimationFrame(run);
      }
    };

    const onScroll = () => {
      if (!weScrolled) {
        const y = window.scrollY;
        cur = y;
        tgt = y;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }
      weScrolled = false;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}

// ── SCROLL PERF HOOK ──
export function useScrollPerfClass() {
  useEffect(() => {
    let timer = null;
    let raf = null;
    let active = false;

    const markScrolling = (delay = 140) => {
      if (!active) {
        document.body.classList.add("is-scrolling");
        active = true;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
        active = false;
      }, delay);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        markScrolling(140);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onTouchStart = () => markScrolling(220);
    const onTouchEnd = () => markScrolling(220);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timer);
      document.body.classList.remove("is-scrolling");
    };
  }, []);
}
