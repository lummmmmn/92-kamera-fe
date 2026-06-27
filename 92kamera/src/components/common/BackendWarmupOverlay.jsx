import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import { G, BG, TXT, MUT } from "../../lib/constants.js";

export default function BackendWarmupOverlay({
  visible,
  hasError = false,
  pendingCount = 0,
  onRetry,
  onContinue,
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!visible) {
      setSeconds(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const slowServer = seconds >= 8;
  const title = hasError
    ? "Chưa tải được thông tin mới nhất"
    : slowServer
    ? "Đang cập nhật tình trạng thiết bị"
    : "Đang chuẩn bị dữ liệu cho bạn";
  const detail = hasError
    ? "Bạn có thể thử lại ngay, hoặc vào trang trước và quay lại sau ít phút."
    : slowServer
    ? "Kết nối lần đầu có thể chậm hơn một chút. Vui lòng chờ để tình trạng máy và lịch thuê được cập nhật chính xác."
    : "Tụi mình đang kiểm tra máy ảnh, phụ kiện và lịch thuê để hiển thị thông tin chính xác.";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at 50% 20%, rgba(223,246,250,0.96) 0%, rgba(143,200,212,0.94) 46%, rgba(101,151,172,0.96) 100%)",
        color: TXT,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.48) 0%, transparent 42%, rgba(13,27,42,0.12) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="backend-warmup-orbit"
        style={{
          position: "absolute",
          width: "min(74vw, 520px)",
          aspectRatio: "1",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.34)",
          boxShadow: "inset 0 0 80px rgba(255,255,255,0.20), 0 28px 100px rgba(13,27,42,0.18)",
          opacity: 0.62,
        }}
      />

      <div
        style={{
          width: "min(100%, 520px)",
          position: "relative",
          borderRadius: 28,
          padding: "30px 26px",
          background:
            "linear-gradient(180deg, rgba(248,253,254,0.86) 0%, rgba(219,238,244,0.78) 100%)",
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.88) inset, 0 26px 90px rgba(5,17,31,0.22), 0 0 0 1px rgba(13,27,42,0.08)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={0.92} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div
            style={{
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 3.2,
              color: MUT,
              marginBottom: 10,
            }}
          >
            ĐANG CẬP NHẬT
          </div>
          <h2
            style={{
              margin: 0,
              color: G,
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontSize: "clamp(24px, 6vw, 34px)",
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 380,
              color: "rgba(5,17,31,0.68)",
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {detail}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            margin: "0 auto 22px",
            maxWidth: 420,
          }}
          aria-hidden="true"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              style={{
                display: "grid",
                gridTemplateColumns: "58px 1fr",
                gap: 12,
                alignItems: "center",
                padding: 12,
                borderRadius: 18,
                background: "rgba(255,255,255,0.34)",
                border: "1px solid rgba(255,255,255,0.54)",
              }}
            >
              <div className="backend-warmup-skeleton" style={{ width: 58, height: 44, borderRadius: 14 }} />
              <div style={{ display: "grid", gap: 8 }}>
                <div className="backend-warmup-skeleton" style={{ width: item === 1 ? "62%" : "78%", height: 10, borderRadius: 999 }} />
                <div className="backend-warmup-skeleton" style={{ width: item === 2 ? "48%" : "56%", height: 10, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "rgba(13,27,42,0.12)",
            overflow: "hidden",
            boxShadow: "inset 0 1px 2px rgba(13,27,42,0.10)",
          }}
          aria-hidden="true"
        >
          <div
            className="backend-warmup-bar"
            style={{
              width: "42%",
              height: "100%",
              borderRadius: "inherit",
              background: `linear-gradient(90deg, ${G}, ${BG}, ${G})`,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "rgba(5,17,31,0.58)",
            fontFamily: "var(--font-ui), system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.3,
          }}
        >
          <span>{pendingCount > 0 ? "Đang cập nhật thông tin" : "Sắp xong"}</span>
          <span>{seconds}s</span>
        </div>

        {hasError && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onRetry}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "11px 16px",
                background: G,
                color: "#f4fbfd",
                fontFamily: "var(--font-ui), system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
                cursor: "pointer",
              }}
            >
              THỬ LẠI
            </button>
            <button
              type="button"
              onClick={onContinue}
              style={{
                border: "1px solid rgba(13,27,42,0.20)",
                borderRadius: 14,
                padding: "11px 16px",
                background: "rgba(255,255,255,0.44)",
                color: G,
                fontFamily: "var(--font-ui), system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
                cursor: "pointer",
              }}
            >
              VÀO TRANG
            </button>
          </div>
        )}
      </div>

      <style>{`
        .backend-warmup-skeleton {
          position: relative;
          overflow: hidden;
          background: rgba(13,27,42,0.12);
        }
        .backend-warmup-skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-110%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.58), transparent);
          animation: backendWarmupShimmer 1.25s cubic-bezier(.16,1,.3,1) infinite;
        }
        .backend-warmup-bar {
          animation: backendWarmupBar 1.45s cubic-bezier(.16,1,.3,1) infinite;
        }
        .backend-warmup-orbit {
          animation: backendWarmupPulse 2.4s cubic-bezier(.16,1,.3,1) infinite;
        }
        @keyframes backendWarmupShimmer {
          to { transform: translateX(110%); }
        }
        @keyframes backendWarmupBar {
          0% { transform: translateX(-110%); }
          55% { transform: translateX(95%); }
          100% { transform: translateX(210%); }
        }
        @keyframes backendWarmupPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.45; }
          50% { transform: scale(1.03); opacity: 0.72; }
        }
        @media (prefers-reduced-motion: reduce) {
          .backend-warmup-skeleton::after,
          .backend-warmup-bar,
          .backend-warmup-orbit {
            animation: none !important;
          }
        }
        @media (max-width: 520px) {
          .backend-warmup-orbit {
            width: 92vw !important;
          }
        }
      `}</style>
    </div>
  );
}
