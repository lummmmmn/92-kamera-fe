import React, { useEffect, useMemo, useRef, useState } from "react";
import "../pixel/pixelIntro.css";

// Điền link Zalo của tiệm (vd "https://zalo.me/0900000000"). Để trống thì ẩn nút NHẮN ZALO.
const ZALO_LINK = "";
const RETRY_SEC = 30; // tự kiểm tra lại sau bao nhiêu giây khi tiệm đang ngủ
const LATE_MS = 1200; // chờ dữ liệu quá lâu mới hiện màn "đang dậy", tránh nháy màn mỗi lần tải nhanh

/**
 * Màn chờ khi backend tắt / đang khởi động.
 *  - hasError: tiệm ngủ đông, tự thử lại mỗi 30s, có nút THỬ LẠI
 *  - đang tải lâu: "chủ tiệm đang dậy"
 * Giữ nguyên props cũ: visible, hasError, pendingCount, onRetry, onContinue.
 */
export default function BackendWarmupOverlay({ visible, hasError, onRetry, onContinue }) {
  const [late, setLate] = useState(false);
  const [cd, setCd] = useState(RETRY_SEC);
  const retryRef = useRef(onRetry);
  useEffect(() => { retryRef.current = onRetry; }, [onRetry]);

  const stars = useMemo(() => {
    let sd = 11;
    const rn = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    return Array.from({ length: 34 }, (_, i) => ({
      id: i, left: `${(rn() * 98) | 0}%`, top: `${((rn() * 52) | 0) + 4}%`, delay: `-${(rn() * 2.4).toFixed(1)}s`,
    }));
  }, []);

  useEffect(() => {
    if (!visible || hasError) { setLate(false); return undefined; }
    const t = setTimeout(() => setLate(true), LATE_MS);
    return () => clearTimeout(t);
  }, [visible, hasError]);

  useEffect(() => {
    if (!visible || !hasError) return undefined;
    let n = RETRY_SEC;
    setCd(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { n = RETRY_SEC; retryRef.current?.(); }
      setCd(n);
    }, 1000);
    return () => clearInterval(id);
  }, [visible, hasError]);

  if (!visible || !(hasError || late)) return null;

  return (
    <div className="pxs" role="status" aria-live="polite">
      <div aria-hidden="true">
        {stars.map((s) => <div key={s.id} className="pxs-star" style={{ left: s.left, top: s.top, animationDelay: s.delay }} />)}
      </div>
      <svg className="pxs-moon" viewBox="0 0 12 12" aria-hidden="true">
        <g fill="#ffe9a8">
          <rect x="4" y="0" width="4" height="1" /><rect x="2" y="1" width="8" height="1" /><rect x="1" y="2" width="10" height="1" />
          <rect x="0" y="3" width="12" height="6" /><rect x="1" y="9" width="10" height="1" /><rect x="2" y="10" width="8" height="1" /><rect x="4" y="11" width="4" height="1" />
        </g>
        <g fill="#e3c673"><rect x="3" y="4" width="2" height="2" /><rect x="7" y="6" width="2" height="2" /></g>
      </svg>
      <svg className="pxs-shop" viewBox="0 0 96 56" role="img" aria-label="Tiệm 92 KA MÊ RA đã tắt đèn, chủ tiệm đang ngủ gục trên quầy">
        <rect y="44" width="96" height="12" fill="#2b3340" /><rect y="44" width="96" height="1" fill="#3d4759" />
        <rect x="8" y="14" width="80" height="30" fill="#2c3a6b" /><rect x="8" y="14" width="80" height="2" fill="#3a4a85" />
        <rect x="24" y="4" width="48" height="12" fill="#14181f" /><rect x="25.5" y="5.5" width="45" height="9" fill="#b85c7c" />
        <text x="48" y="12.8" fontSize="8" textAnchor="middle" fill="#14181f">92 KA MÊ RA</text>
        <rect x="13" y="21" width="24" height="17" fill="#14181f" /><rect x="14.5" y="22.5" width="21" height="14" fill="#1b2550" />
        <rect x="28" y="24" width="4" height="4" fill="#ffe9a8" /><rect x="27" y="25" width="1" height="2" fill="#1b2550" />
        <rect x="58" y="21" width="26" height="23" fill="#4a5578" />
        <g fill="#3a4468">
          <rect x="58" y="25" width="26" height="1" /><rect x="58" y="29" width="26" height="1" /><rect x="58" y="33" width="26" height="1" />
          <rect x="58" y="37" width="26" height="1" /><rect x="58" y="41" width="26" height="1" />
        </g>
        <rect x="65" y="27" width="12" height="7" fill="#ff8fb1" /><rect x="65" y="27" width="12" height="1" fill="#ffc2d6" />
        <text x="71" y="33" fontSize="6" textAnchor="middle" fill="#14181f">NGỦ</text>
        <rect x="10" y="38" width="40" height="6" fill="#8a6a3f" /><rect x="10" y="38" width="40" height="1" fill="#b98a5a" />
        <rect x="22" y="31" width="9" height="7" fill="#f2c6a0" /><rect x="22" y="29.5" width="9" height="3" fill="#14181f" />
        <rect x="24" y="34" width="2" height="1" fill="#14181f" /><rect x="28" y="34" width="2" height="1" fill="#14181f" />
        <rect x="30" y="34" width="14" height="4" fill="#14181f" /><rect x="40" y="36" width="5" height="2" fill="#f2c6a0" />
        <text className="pxs-z" x="33" y="27">Z</text>
        <text className="pxs-z" x="38" y="22" style={{ animationDelay: ".8s" }}>Z</text>
        <text className="pxs-z" x="44" y="17" style={{ animationDelay: "1.6s" }}>Z</text>
      </svg>

      <h2>{hasError ? "Tiệm đang ngủ đông" : "Chủ tiệm đang dậy"}</h2>
      <p className="pxs-msg">
        {hasError ? "Chủ tiệm đang cập nhật tiệm, đợi xíu nha bro" : "Đang gọi chủ tiệm mở cửa, đợi xíu nha bro"}
        <span className="pxs-dots" />
      </p>

      {hasError && (
        <>
          <div className="pxs-row">
            {ZALO_LINK ? <a className="pxs-btn p" href={ZALO_LINK} target="_blank" rel="noopener noreferrer">NHẮN ZALO</a> : null}
            <button type="button" className="pxs-btn" onClick={() => onRetry?.()}>THỬ LẠI</button>
          </div>
          <p className="pxs-cd">Tự kiểm tra lại sau {cd} giây</p>
        </>
      )}
      {onContinue ? <button type="button" className="pxs-lnk" onClick={onContinue}>vào xem tạm</button> : null}
    </div>
  );
}
