import React, { useState, useRef } from "react";
import { G, MUT, TXT } from "../../lib/constants.js";

const ROADMAP_PHASES = [
  {
    num: "01",
    icon: "🚀",
    title: "XÂY NỀN MÓNG",
    badge: "0 – 6 THÁNG",
    items: [
      "Ra mắt dịch vụ thuê máy ảnh",
      "Xây dựng bộ thiết bị ban đầu",
      "Hoàn thiện quy trình giao nhận và bảo quản thiết bị",
      "Thu thập phản hồi khách hàng để cải thiện dịch vụ",
      "Xây dựng nền tảng thương hiệu 92 KA MÊ RA",
      "Phục vụ 100+ khách hàng đầu tiên",
    ],
    goal: "Xây dựng nền tảng vận hành vững chắc và tạo tiền đề để phát triển.",
  },
  {
    num: "02",
    icon: "📈",
    title: "KIỂM CHỨNG THỊ TRƯỜNG",
    badge: "6 – 12 THÁNG",
    items: [
      "Hoàn thiện hệ thống đặt thuê trực tuyến",
      "Chuẩn hóa quy trình bảo dưỡng và quản lý thiết bị",
      "Mở rộng danh mục máy ảnh, lens và phụ kiện",
      "Xây dựng cộng đồng người dùng và kênh chăm sóc khách hàng",
    ],
    goal: "Chứng minh nhu cầu thực tế và xây dựng nền tảng khách hàng ổn định.",
  },
  {
    num: "03",
    icon: "🤝",
    title: "PHÁT TRIỂN ĐỐI TÁC & CỬA HÀNG VẬT LÝ",
    badge: "12 – 24 THÁNG",
    items: [
      "Mở cửa hàng vật lý đầu tiên tại Tam Kỳ – Núi Thành",
      "Kết nối đối tác (quán cà phê, studio, cửa hàng cho thuê trang phục...)",
      "Triển khai chương trình cộng tác viên, chia hoa hồng",
      "Tối ưu dịch vụ tại cửa hàng và trải nghiệm khách hàng",
    ],
    goal: "Mở rộng mạng lưới đối tác và mang đến trải nghiệm trực tiếp chuyên nghiệp.",
  },
  {
    num: "04",
    icon: "💎",
    title: "HỆ SINH THÁI SÁNG TẠO",
    badge: "24 THÁNG+",
    items: [
      "Kết nối người thuê và cộng đồng sáng tạo nội dung",
      "Chia sẻ kiến thức và cảm hứng nhiếp ảnh",
      "Hỗ trợ dự án cá nhân và doanh nghiệp",
      "Mở rộng dịch vụ đi kèm: quay phim, chụp ảnh, in ấn...",
      "Trở thành điểm đến tin cậy tại Đà Nẵng",
    ],
    goal: "Xây dựng hệ sinh thái toàn diện, đồng hành cùng cộng đồng sáng tạo.",
  },
];

function RoadmapCards({ isMobile }) {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * (el.clientWidth - 48 + 14), behavior: "smooth" });
    setActive(idx);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / (el.clientWidth - 48 + 14)));
  };

  const cardBase = {
    background: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    border: "none",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.10) inset, 0 2px 4px rgba(13,27,42,0.06) inset, 0 12px 40px rgba(13,27,42,0.16), 0 4px 12px rgba(13,27,42,0.10), 0 0 0 1px rgba(13,27,42,0.06)",
    position: "relative",
    overflow: "hidden",
  };

  const GoalIcon = () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );

  const renderCard = (p, i, mobile) => (
    <div
      key={i}
      style={{
        ...cardBase,
        padding: mobile ? "22px 18px 20px" : "28px 22px 24px",
        ...(mobile
          ? { width: "calc(100vw - 64px)", flexShrink: 0, scrollSnapAlign: "center", minHeight: 420 }
          : { transition: "transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s" }),
      }}
      onMouseEnter={
        mobile
          ? undefined
          : (e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 1px 0 rgba(255,255,255,0.60) inset, 0 28px 72px rgba(13,27,42,0.24), 0 8px 24px rgba(13,27,42,0.16), 0 0 0 1px rgba(13,27,42,0.10)";
              e.currentTarget.style.background = "rgba(255,255,255,0.82)";
            }
      }
      onMouseLeave={
        mobile
          ? undefined
          : (e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.10) inset, 0 12px 40px rgba(13,27,42,0.16), 0 4px 12px rgba(13,27,42,0.10), 0 0 0 1px rgba(13,27,42,0.06)";
              e.currentTarget.style.background = "rgba(255,255,255,0.18)";
            }
      }
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.80) 50%,transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: mobile ? 28 : 36,
          fontWeight: 900,
          color: G,
          fontFamily: "var(--font-display)",
          opacity: 0.35,
          position: "absolute",
          top: mobile ? 10 : 14,
          right: mobile ? 14 : 16,
          lineHeight: 1,
          letterSpacing: -2,
          userSelect: "none",
        }}
      >
        {p.num}
      </div>
      <div
        style={{
          width: mobile ? 40 : 44,
          height: mobile ? 40 : 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.80)",
          border: "none",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.90) inset, 0 -1px 0 rgba(13,27,42,0.08) inset, 0 4px 14px rgba(13,27,42,0.12), 0 0 0 1px rgba(13,27,42,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: mobile ? 12 : 14,
          fontSize: mobile ? 18 : 20,
        }}
      >
        {p.icon}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: G,
          fontFamily: "var(--font-ui)",
          letterSpacing: 0.8,
          marginBottom: mobile ? 7 : 8,
          lineHeight: 1.35,
          minHeight: mobile ? "auto" : 34,
        }}
      >
        {p.title}
      </div>
      <div
        style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.25)",
          border: "1px solid rgba(255,255,255,0.50)",
          borderRadius: 99,
          padding: "2px 10px",
          fontSize: 9,
          fontWeight: 700,
          color: G,
          fontFamily: "var(--font-ui)",
          letterSpacing: 1,
          marginBottom: mobile ? 14 : 16,
          opacity: 0.85,
        }}
      >
        {p.badge}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {p.items.map((item, j) => (
          <div key={j} style={{ display: "flex", gap: mobile ? 7 : 8, alignItems: "flex-start" }}>
            <div
              style={{
                flexShrink: 0,
                width: mobile ? 15 : 16,
                height: mobile ? 15 : 16,
                borderRadius: "50%",
                background: "linear-gradient(135deg,rgba(107,184,212,0.50),rgba(143,200,212,0.35))",
                border: "1px solid rgba(107,184,212,0.60)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              <svg
                width={mobile ? 7 : 8}
                height={mobile ? 7 : 8}
                viewBox="0 0 12 12"
                fill="none"
                stroke={MUT}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2,6 5,9 10,3" />
              </svg>
            </div>
            <span style={{ fontSize: 11, color: TXT, fontFamily: "var(--font-ui)", lineHeight: 1.55, opacity: 0.82 }}>
              {item}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: mobile ? 14 : 16,
          padding: mobile ? "9px 11px" : "10px 12px",
          background: "rgba(255,255,255,0.20)",
          border: "1px solid rgba(255,255,255,0.40)",
          borderRadius: 12,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ flexShrink: 0, color: MUT, marginTop: 1 }}>
          <GoalIcon />
        </span>
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: MUT, fontFamily: "var(--font-ui)", letterSpacing: 1.5, marginBottom: mobile ? 2 : 3 }}>
            MỤC TIÊU
          </div>
          <div style={{ fontSize: 10.5, color: TXT, fontFamily: "var(--font-ui)", lineHeight: 1.55, opacity: 0.8 }}>
            {p.goal}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        {ROADMAP_PHASES.map((p, i) => renderCard(p, i, false))}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="rm-cards-scroll"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "4px 24px 16px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`.rm-cards-scroll::-webkit-scrollbar{display:none}`}</style>
        {ROADMAP_PHASES.map((p, i) => renderCard(p, i, true))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 4, padding: "0 24px" }}>
        <button
          onClick={() => scrollTo(Math.max(0, active - 1))}
          disabled={active === 0}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1.5px solid rgba(42,74,106,0.28)",
            background:
              active === 0
                ? "rgba(42,74,106,0.07)"
                : "linear-gradient(135deg,rgba(232,240,248,0.95),rgba(197,216,236,0.90))",
            color: active === 0 ? "rgba(42,74,106,0.28)" : MUT,
            cursor: active === 0 ? "default" : "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              active === 0 ? "none" : "0 2px 10px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset",
            flexShrink: 0,
          }}
        >
          ‹
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {ROADMAP_PHASES.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              style={{
                width: active === i ? 20 : 7,
                height: 7,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                transition: "all .3s",
                background: active === i ? MUT : "rgba(42,74,106,0.28)",
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => scrollTo(Math.min(ROADMAP_PHASES.length - 1, active + 1))}
          disabled={active === ROADMAP_PHASES.length - 1}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1.5px solid rgba(42,74,106,0.28)",
            background:
              active === ROADMAP_PHASES.length - 1
                ? "rgba(42,74,106,0.07)"
                : "linear-gradient(135deg,rgba(232,240,248,0.95),rgba(197,216,236,0.90))",
            color: active === ROADMAP_PHASES.length - 1 ? "rgba(42,74,106,0.28)" : MUT,
            cursor: active === ROADMAP_PHASES.length - 1 ? "default" : "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              active === ROADMAP_PHASES.length - 1
                ? "none"
                : "0 2px 10px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset",
            flexShrink: 0,
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function RoadmapSection({ isMobile }) {
  return (
    <div
      id="about"
      className="acc-section"
      style={{
        padding: isMobile ? "56px 0 72px" : "80px 60px 100px",
        margin: isMobile ? "20px 12px" : "32px 20px",
      }}
    >
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", padding: isMobile ? "0 20px 36px" : "0 0 52px" }}>
          <div style={{ fontSize: isMobile ? 9 : 10.5, letterSpacing: 7, color: G, opacity: 0.5, marginBottom: 14, fontFamily: "var(--font-ui)", fontWeight: 700 }}>
            VỀ CHÚNG TÔI
          </div>
          <h2 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, margin: "0 0 6px", color: G, fontFamily: "var(--font-display)", letterSpacing: 0.5, lineHeight: 1.15 }}>
            LỘ TRÌNH PHÁT TRIỂN
          </h2>
          <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: MUT, fontFamily: "var(--font-display)", letterSpacing: 3, marginBottom: 16 }}>
            92 KA MÊ RA
          </div>
          <p style={{ color: TXT, fontSize: isMobile ? 13 : 16, fontWeight: 500, lineHeight: 1.85, maxWidth: isMobile ? 300 : 560, margin: "0 auto", fontFamily: "var(--font-ui)", opacity: 0.75, textAlign: "center" }}>
            Hành trình xây dựng nền tảng thuê máy ảnh hiện đại, minh bạch và kết nối cộng đồng sáng tạo tại <span style={{ color: MUT, fontWeight: 700 }}>Đà Nẵng</span>.
          </p>
        </div>

        <RoadmapCards isMobile={isMobile} />

        <div style={{ marginTop: isMobile ? 40 : 56, padding: isMobile ? "0 20px" : 0 }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 32 }}>
            <div style={{ fontSize: 9, letterSpacing: 6, color: G, opacity: 0.45, fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 8 }}>
              GIÁ TRỊ CỐT LÕI
            </div>
            <div style={{ width: 40, height: 2, background: `linear-gradient(90deg,transparent,${MUT},transparent)`, margin: "0 auto" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 16 }}>
            {[
              { icon: "🛡️", title: "MINH BẠCH", desc: "Thông tin rõ ràng, không phát sinh chi phí ẩn." },
              { icon: "📷", title: "CHUYÊN NGHIỆP", desc: "Thiết bị chất lượng, quy trình chuẩn mực." },
              { icon: "🤍", title: "TẬN TÂM", desc: "Hỗ trợ nhanh chóng, luôn đặt khách hàng làm trung tâm." },
              { icon: "👥", title: "CỘNG ĐỒNG", desc: "Kết nối và lan tỏa đam mê nhiếp ảnh." },
            ].map((v, i) => (
              <div
                key={i}
                style={{
                  padding: isMobile ? "16px 14px" : "20px 18px",
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  borderRadius: 16,
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.10) inset, 0 12px 40px rgba(13,27,42,0.16), 0 4px 12px rgba(13,27,42,0.10), 0 0 0 1px rgba(13,27,42,0.06)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: isMobile ? 6 : 8,
                  transition: "transform .22s, box-shadow .22s, background .22s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 0 rgba(255,255,255,0.60) inset, 0 28px 72px rgba(13,27,42,0.24), 0 8px 24px rgba(13,27,42,0.16), 0 0 0 1px rgba(13,27,42,0.10)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.82)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.10) inset, 0 12px 40px rgba(13,27,42,0.16), 0 4px 12px rgba(13,27,42,0.10), 0 0 0 1px rgba(13,27,42,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.18)";
                }}
              >
                <div style={{ fontSize: isMobile ? 22 : 28 }}>{v.icon}</div>
                <div style={{ fontSize: isMobile ? 9 : 11.5, fontWeight: 800, color: G, fontFamily: "var(--font-ui)", letterSpacing: 1.5, lineHeight: 1.3 }}>
                  {v.title}
                </div>
                <div style={{ fontSize: isMobile ? 10 : 12.5, color: TXT, fontFamily: "var(--font-ui)", lineHeight: 1.6, opacity: 0.72 }}>
                  {v.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
