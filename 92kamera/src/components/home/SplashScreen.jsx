import React, { useCallback, useEffect, useRef, useState } from "react";
import "../pixel/pixelIntro.css";

const TEXT = "92 KA MÊ RA";
const BLOCKS = 12;
const MSG = ["Đang bật đèn tiệm...", "Đang lau ống kính...", "Đang sạc pin cho máy...", "Sắp xong rồi bro!"];

/** Intro mở tiệm: gõ tên tiệm, thanh tải 12 ô, loé flash rồi vào trang. Chạm / Enter để bỏ qua. */
export default function SplashScreen({ onDone }) {
  const [typed, setTyped] = useState(0);
  const [filled, setFilled] = useState(0);
  const [flash, setFlash] = useState(false);
  const doneRef = useRef(false);
  const cbRef = useRef(onDone);
  useEffect(() => { cbRef.current = onDone; }, [onDone]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cbRef.current?.();
  }, []);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(finish, 500);
      return () => clearTimeout(t);
    }
    let k = 0;
    let bar;
    let end;
    const type = setInterval(() => setTyped((n) => Math.min(n + 1, TEXT.length)), 80);
    const start = setTimeout(() => {
      bar = setInterval(() => {
        k += 1;
        setFilled(k);
        if (k >= BLOCKS) {
          clearInterval(bar);
          setFlash(true);
          end = setTimeout(finish, 450);
        }
      }, 140);
    }, 700);
    return () => { clearInterval(type); clearTimeout(start); clearInterval(bar); clearTimeout(end); };
  }, [finish]);

  const ready = filled >= BLOCKS;
  const status = ready ? "Tiệm đã mở cửa!" : `${MSG[Math.min(3, Math.floor(filled / 4))]} ${Math.round((filled / BLOCKS) * 100)}%`;

  return (
    <div
      className="pxi" role="button" tabIndex={0} aria-label="Bỏ qua intro"
      onClick={finish}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); finish(); } }}
    >
      <svg className="pxi-cam" viewBox="0 0 40 30" role="img" aria-label="Máy ảnh pixel">
        <rect x="4" y="27" width="32" height="1" fill="#14181f" />
        <rect x="3" y="10" width="34" height="16" fill="#14181f" />
        <rect x="15" y="5" width="10" height="6" fill="#14181f" />
        <rect x="5" y="7" width="5" height="3" fill="#14181f" />
        <rect x="13" y="10" width="14" height="14" fill="#14181f" />
        <rect x="14" y="11" width="12" height="12" fill="#2f6bff" />
        <rect x="17" y="14" width="6" height="6" fill="#bcd0ff" />
        <rect x="19" y="16" width="2" height="2" fill="#14181f" />
        <rect x="31" y="12" width="3" height="2" fill="#ffe9a8" />
      </svg>
      <div className="pxi-logo">
        <span className="pxi-br l" />
        <div className="pxi-tw">
          <h1 className={typed < TEXT.length ? "t" : ""} aria-label={TEXT}>{TEXT.slice(0, typed)}</h1>
          <i className={"pxi-rec" + (typed >= TEXT.length ? " on" : "")} />
        </div>
        <span className="pxi-br r" />
      </div>
      <p className="pxi-sub">Cho thuê máy ảnh khu vực Núi Thành, Tam Kỳ</p>
      <div className="pxi-load" aria-hidden="true">
        {Array.from({ length: BLOCKS }, (_, i) => <i key={i} className={i < filled ? "f" : ""} />)}
      </div>
      <div className="pxi-st" role="status">{status}</div>
      <p className="pxi-skip">Chạm để bỏ qua</p>
      {flash && <div className="pxi-flash" />}
    </div>
  );
}
