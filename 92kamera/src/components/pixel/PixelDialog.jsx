import React, { useEffect, useRef } from "react";

/** Hộp thoại pixel: Esc / bấm nền / nút X để đóng, khoá cuộn trang phía sau. */
export default function PixelDialog({ title, onClose, children }) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeRef.current?.(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="px-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="px-dg" role="dialog" aria-modal="true" aria-label={title}>
        <div className="px-tt">
          <span>{title}</span>
          <button type="button" aria-label="Đóng" onClick={onClose}>X</button>
        </div>
        <div className="px-bd">{children}</div>
      </div>
    </div>
  );
}
