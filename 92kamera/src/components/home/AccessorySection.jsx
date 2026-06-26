import { G, TXT, MUT, BG, CARD, BR, BR2 } from "../../lib/constants.js";
import { fmtVND, todayStr } from "../../utils/format.js";

export default function AccessorySection({ accessories, onBook, isMobile }) {
  const icons = ["🎙️", "🔦", "⚡", "📡", "🎞️", "🔋", "🌿", "🎛️", "📷", "🔌"];

  return (
    <>
      <style>{`
        .acc-section {
          position:relative; overflow:hidden; border-radius:28px;
          border: none;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 -1px 0 rgba(13,27,42,0.08) inset,
            0 4px 6px rgba(13,27,42,0.06) inset,
            0 12px 60px rgba(5,17,31,0.18),
            0 4px 16px rgba(5,17,31,0.10),
            0 0 0 1px rgba(13,27,42,0.06);
        }
        .acc-section::after {
          content:''; position:absolute; top:0; left:5%; right:5%; height:1px; z-index:10;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.72) 30%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.72) 70%, transparent 100%);
          pointer-events:none;
        }
        .acc-section::before {
          content:''; position:absolute; inset:0;
          background: rgba(255,255,255,0.13);
          backdrop-filter: blur(52px) saturate(180%) brightness(1.04);
          -webkit-backdrop-filter: blur(52px) saturate(180%) brightness(1.04);
          z-index:0;
        }
        @media (max-width: 768px) {
          .acc-section::before {
            background: rgba(255,255,255,0.18);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
        }
        .acc-card {
          background: rgba(255,255,255,0.18);
          border: none;
          border-radius: 20px;
          padding: 22px 18px;
          text-align: center;
          cursor: pointer;
          transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s ease, background .28s ease;
          backdrop-filter: blur(20px) saturate(130%);
          -webkit-backdrop-filter: blur(20px) saturate(130%);
          position: relative; overflow: hidden;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 -1px 0 rgba(13,27,42,0.10) inset,
            0 2px 4px rgba(13,27,42,0.06) inset,
            0 12px 40px rgba(13,27,42,0.16),
            0 4px 12px rgba(13,27,42,0.10),
            0 0 0 1px rgba(13,27,42,0.06);
        }
        @media (max-width: 900px) {
          .acc-card {
            background: rgba(175,215,225,0.55);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
          .acc-card:hover {
            background: rgba(175,215,225,0.75);
          }
        }
        .acc-card::before {
          content:''; position:absolute; top:0; left:8%; right:8%; height:1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.80) 40%,rgba(255,255,255,0.95) 50%,rgba(255,255,255,0.80) 60%,transparent);
        }
        .acc-card:hover {
          transform: translateY(-7px) scale(1.025);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.60) inset,
            0 -1px 0 rgba(13,27,42,0.10) inset,
            0 2px 4px rgba(13,27,42,0.06) inset,
            0 28px 72px rgba(13,27,42,0.24),
            0 8px 24px rgba(13,27,42,0.16),
            0 0 0 1px rgba(13,27,42,0.10);
          background: rgba(255,255,255,0.82);
        }
        .acc-icon-wrap {
          width:48px; height:48px; border-radius:50%; margin:0 auto 16px;
          background: rgba(255,255,255,0.80);
          border: none;
          display:flex; align-items:center; justify-content:center;
          font-size:20px;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.90) inset,
            0 -1px 0 rgba(13,27,42,0.08) inset,
            0 4px 14px rgba(13,27,42,0.12),
            0 0 0 1px rgba(13,27,42,0.06);
        }
      `}</style>

      <div
        id="accessories"
        className="acc-section"
        style={{
          padding: isMobile ? "52px 20px 64px" : "80px 72px 96px",
          margin: isMobile ? "20px 12px" : "32px 20px",
        }}
      >
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(120,120,160,0.07) 0%,transparent 70%)", top: "-10%", left: "58%", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(80,80,120,0.05) 0%,transparent 70%)", bottom: "5%", left: "8%", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 56 }}>
            <div style={{ fontSize: isMobile ? 9 : 10.5, letterSpacing: 7, color: G, opacity: 0.55, marginBottom: 16, fontFamily: "var(--font-ui)", fontWeight: 700 }}>
              PHỤ KIỆN
            </div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", color: G, fontFamily: "var(--font-display)", lineHeight: 1.2, textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>
              Bổ sung trang thiết bị
            </h2>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${G}55,transparent)`, margin: "0 auto" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 18 }}>
            {accessories.map((a, i) => {
              return (
                <div
                  key={a.id}
                  className="acc-card"
                  onClick={() => onBook?.({ preselectedCams: {}, preselectedAccs: { [a.name]: 1 }, date: todayStr(), days: 1, noDate: true })}
                >
                  <div className="acc-icon-wrap">
                    {a.image ? (
                      <img src={a.image} alt={a.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }} />
                    ) : (
                      icons[i % icons.length]
                    )}
                  </div>
                  <div style={{ color: TXT, fontWeight: 500, fontSize: isMobile ? 12.5 : 14, marginBottom: 10, letterSpacing: 0.4, lineHeight: 1.5, fontFamily: "var(--font-display)" }}>
                    {a.name}
                  </div>
                  <div style={{ color: G, fontWeight: 800, fontSize: isMobile ? 15 : 16.5, fontFamily: "var(--font-ui)", textShadow: "0 1px 2px rgba(13,27,42,0.10)" }}>
                    {fmtVND(a.price)}
                    <span style={{ color: MUT, fontSize: isMobile ? 10 : 11.5, marginLeft: 2, fontWeight: 500 }}>/ngày</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: isMobile ? 28 : 42 }}>
            <span style={{ fontSize: isMobile ? 10 : 11.5, letterSpacing: 2.5, color: G, opacity: 0.3, fontFamily: "var(--font-ui)", fontWeight: 600 }}>
              👆 NHẤN VÀO PHỤ KIỆN ĐỂ ĐẶT THUÊ NGAY
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
