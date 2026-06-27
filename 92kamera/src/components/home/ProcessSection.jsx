import { useState, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "ĐẶT LỊCH ONLINE",
    gradient: "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)",
    icon: "📋",
    content: [
      { type: "label", text: "Khách hàng truy cập website để chọn:" },
      { type: "list", items: ["Thiết bị cần thuê", "Ngày nhận máy", "Ngày trả máy", "Phụ kiện đi kèm"] },
      { type: "label", text: "Sau khi gửi yêu cầu thuê, hệ thống sẽ tự động kiểm tra tình trạng còn hàng theo đúng thời gian khách chọn." },
      { type: "label", text: "Nếu đơn hợp lệ, Shop sẽ xác nhận nhanh qua Zalo hoặc điện thoại." },
      { type: "label", text: "💰 Sẽ nhận cọc giữ đơn sau khi xác minh nhanh — tuỳ giá trị từng đơn." },
    ],
    footer: "💡 Quý khách chủ động sao chép đơn và gửi tin nhắn qua Zalo cho mình để được hỗ trợ nhanh hơn nhé!",
  },
  {
    num: "02",
    title: "NHẬN MÁY",
    gradient: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
    icon: "📦",
    content: [
      { type: "heading", text: "Cách 1 — Nhận trực tiếp" },
      { type: "list", items: ["Nhận máy tại: Thôn Thạnh Mỹ, Tam Mỹ, TP. Đà Nẵng", "Mang theo CCCD bản gốc để xác minh"] },
      { type: "heading", text: "Cách 2 — Shop giao máy tận nơi" },
      { type: "label", text: "Hỗ trợ giao máy khu vực:" },
      { type: "list", items: ["Tam Kỳ → Núi Thành", "Mang theo CCCD bản gốc để xác minh"] },
      { type: "heading", text: "Lưu ý:" },
      { type: "list", items: ["Có phụ phí giao nhận tùy khu vực", "Thanh toán toàn bộ đơn hàng và tiền cọc thiết bị (nếu có) khi nhận máy", "Một số đơn cần giữ CCCD trong thời gian thuê"] },
    ],
    footer: "🛡️ Hỗ trợ miễn cọc tiền thiết bị với khách hàng đủ thông tin xác minh",
  },
  {
    num: "03",
    title: "KIỂM TRA & SETUP",
    gradient: "linear-gradient(135deg,#f43f5e 0%,#f97316 100%)",
    icon: "🔍",
    content: [
      { type: "list", items: ["Kiểm tra ngoại hình và chức năng thiết bị", "Kiểm tra đầy đủ pin, sạc, thẻ nhớ & phụ kiện", "Test chụp/quay trực tiếp trước khi nhận máy", "Hỗ trợ setup màu và setting theo nhu cầu sử dụng"] },
    ],
    footer: "📹 Toàn bộ quá trình giao nhận đều có hình ảnh/video xác nhận để đảm bảo minh bạch",
  },
  {
    num: "04",
    title: "HỖ TRỢ KỸ THUẬT & BẢO QUẢN",
    gradient: "linear-gradient(135deg,#10b981 0%,#0891b2 100%)",
    icon: "🛡️",
    content: [
      { type: "list", items: ["Hỗ trợ kỹ thuật xuyên suốt thời gian thuê máy", "Hỗ trợ nhanh qua Zalo trong giờ hoạt động"] },
      { type: "heading", text: "KHÁCH HÀNG CẦN LƯU Ý:" },
      { type: "list", items: ["Giữ gìn thiết bị cẩn thận", "Không để rơi, va đập mạnh hoặc vào nước", "Không tự ý tháo lắp hoặc sửa chữa thiết bị", "Sử dụng đúng mục đích"] },
      { type: "heading", text: "PHÁT SINH HƯ HỎNG:" },
      { type: "list", items: ["Khách hàng thanh toán chi phí sửa chữa nếu lỗi do sử dụng", "Đền bù theo giá trị thiết bị nếu hư hỏng không thể khắc phục"] },
    ],
    footer: "🛡️ Vui lòng bảo quản thiết bị như tài sản cá nhân của mình",
  },
  {
    num: "05",
    title: "HỖ TRỢ XUẤT ẢNH & VIDEO",
    gradient: "linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%)",
    icon: "💾",
    content: [
      { type: "heading", text: "Cách 1 — Tự xuất dữ liệu" },
      { type: "list", items: ["Sử dụng đầu đọc thẻ nhớ", "Xuất trực tiếp về điện thoại hoặc laptop"] },
      { type: "heading", text: "Cách 2 — Shop xuất hộ miễn phí" },
      { type: "list", items: ["Upload ảnh/video lên Drive", "Gửi link qua Zalo trong ngày", "Link lưu trữ tạm thời để đảm bảo bảo mật dữ liệu"] },
    ],
    footer: "💾 Hỗ trợ xuất dữ liệu nhanh chóng và tiện lợi",
  },
  {
    num: "06",
    title: "HOÀN TRẢ THIẾT BỊ",
    gradient: "linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)",
    icon: "⚡",
    content: [
      { type: "list", items: ["Kiểm tra tình trạng máy sau khi trả", "Hoàn giấy tờ hoặc tiền cọc thiết bị (nếu có)", "Thanh toán chi phí phát sinh nếu có"] },
      { type: "heading", text: "Khách hàng có thể:" },
      { type: "list", items: ["Trả trực tiếp tại Shop: Thôn Thạnh Mỹ, Tam Mỹ, TP. Đà Nẵng", "Hoặc đặt nhân viên Shop đến nhận tận nơi"] },
      { type: "italic", text: "⚠️ Không gửi thiết bị qua shipper hoặc đơn vị vận chuyển bên ngoài để tránh rủi ro phát sinh" },
    ],
    footer: "⚡ Kiểm tra & hoàn tất thủ tục nhanh chóng",
  },
];

export default function ProcessSection({ isMobile }) {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = isMobile ? el.clientWidth - 40 : 340;
    el.scrollTo({ left: idx * (cardW + 16), behavior: "smooth" });
    setActive(idx);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = isMobile ? el.clientWidth - 40 : 340;
    setActive(Math.round(el.scrollLeft / (cardW + 16)));
  };

  const renderContent = (c, i) => {
    if (c.type === "label") return <div key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.70)", fontFamily: "system-ui,sans-serif", marginBottom: 2 }}>{c.text}</div>;
    if (c.type === "link") return <div key={i} style={{ fontSize: 13.5, color: "#fff", fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>{c.text}</div>;
    if (c.type === "btn") return <div key={i} style={{ display: "inline-block", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: 8, padding: "5px 14px", fontSize: 12.5, color: "#fff", fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 10 }}>{c.text}</div>;
    if (c.type === "heading") return <div key={i} style={{ fontSize: 12.5, color: "#fff", fontWeight: 800, fontFamily: "system-ui,sans-serif", marginTop: 10, marginBottom: 4, letterSpacing: 0.3 }}>{c.text}</div>;
    if (c.type === "italic") return <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", fontStyle: "italic", fontFamily: "system-ui,sans-serif", marginTop: 8, lineHeight: 1.6 }}>{c.text}</div>;
    if (c.type === "tip") return <div key={i} style={{ marginTop: 10, padding: "8px 11px", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 9, fontSize: 12.5, color: "#fff", fontFamily: "system-ui,sans-serif", lineHeight: 1.6, fontStyle: "italic" }}>{c.text}</div>;
    if (c.type === "list") return (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
        {c.items.map((item, j) => (
          <div key={j} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.90)", fontFamily: "system-ui,sans-serif", lineHeight: 1.55, display: "flex", gap: 6 }}>
            <span style={{ flexShrink: 0, color: "rgba(255,255,255,0.60)" }}>→</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
    return null;
  };

  return (
    <div id="quy-trinh" style={{ margin: isMobile ? "20px 0" : "32px 0", padding: isMobile ? "40px 0 32px" : "60px 0 44px" }}>
      <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36, padding: "0 20px" }}>
        <div style={{ fontSize: isMobile ? 9 : 11, letterSpacing: 7, color: "#2a4a6a", opacity: 0.6, marginBottom: 12, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>HƯỚNG DẪN CHI TIẾT</div>
        <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, margin: "0 0 12px", color: "#0d1b2a", fontFamily: "var(--font-display)", letterSpacing: 1 }}>Quy trình 6 bước</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: "#3a5a7a", fontFamily: "var(--font-ui)", lineHeight: 1.75, maxWidth: isMobile ? 280 : 460, margin: "0 auto", fontWeight: 500 }}>
          {isMobile ? <>Hướng dẫn từng bước<br />thuê máy nhanh &amp; an toàn</> : <>Hướng dẫn chi tiết từng bước để thuê máy ảnh<br />một cách nhanh chóng và an toàn</>}
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: isMobile ? "4px 16px 20px" : "4px 48px 20px",
          scrollPaddingLeft: isMobile ? 16 : 48,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`.quy-trinh-scroll::-webkit-scrollbar{display:none}`}</style>
        {STEPS.map((s, idx) => (
          <div
            key={idx}
            style={{
              flexShrink: 0,
              width: isMobile ? "calc(100vw - 40px)" : 340,
              scrollSnapAlign: isMobile ? "center" : "start",
              background: s.gradient,
              borderRadius: 20,
              padding: "24px 22px 20px",
              display: "flex",
              flexDirection: "column",
              minHeight: isMobile ? 440 : 480,
              border: "none",
              boxShadow: [
                "0 1px 0 rgba(255,255,255,0.38) inset",
                "0 -1px 0 rgba(0,0,0,0.18) inset",
                "0 2px 4px rgba(0,0,0,0.16) inset",
                "0 20px 60px rgba(0,0,0,0.32)",
                "0 6px 18px rgba(0,0,0,0.22)",
                "0 0 0 1px rgba(0,0,0,0.12)",
              ].join(", "),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.65) 40%,rgba(255,255,255,0.80) 50%,rgba(255,255,255,0.65) 60%,transparent)", pointerEvents: "none", zIndex: 10 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(0,0,0,0.22)", borderRadius: "0 0 20px 20px", pointerEvents: "none", zIndex: 10 }} />
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />

            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.30)", border: "none", boxShadow: "0 1px 0 rgba(255,255,255,0.30) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 4px 12px rgba(0,0,0,0.30)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "system-ui,sans-serif", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{s.num}</span>
            </div>

            <div style={{ fontSize: 14.5, fontWeight: 900, color: "#fff", fontFamily: "system-ui,sans-serif", letterSpacing: 0.5, marginBottom: 14, lineHeight: 1.4 }}>{s.title}</div>

            <div style={{ flex: 1 }}>{s.content.map((c, i) => renderContent(c, i))}</div>

            {s.footer && (
              <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(0,0,0,0.28)", borderRadius: 10, fontSize: 12.5, color: "rgba(255,255,255,0.90)", fontFamily: "system-ui,sans-serif", lineHeight: 1.5, textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset, 0 -1px 0 rgba(0,0,0,0.20) inset, 0 2px 8px rgba(0,0,0,0.18)" }}>
                {s.footer}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 12, padding: "0 20px" }}>
        <button
          onClick={() => scrollTo(Math.max(0, active - 1))}
          disabled={active === 0}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(42,74,106,0.30)", background: active === 0 ? "rgba(42,74,106,0.08)" : "linear-gradient(135deg,rgba(232,240,248,0.95),rgba(197,216,236,0.90))", color: active === 0 ? "rgba(42,74,106,0.30)" : "#1a4a8a", cursor: active === 0 ? "default" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active === 0 ? "none" : "0 2px 10px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset", transition: "all .2s", flexShrink: 0 }}
        >
          ‹
        </button>

        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)} style={{ width: active === i ? 22 : 7, height: 7, borderRadius: 99, border: "none", cursor: "pointer", transition: "all .3s", background: active === i ? "#1a4a8a" : "rgba(42,74,106,0.30)", padding: 0 }} />
          ))}
        </div>

        <button
          onClick={() => scrollTo(Math.min(STEPS.length - 1, active + 1))}
          disabled={active === STEPS.length - 1}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(42,74,106,0.30)", background: active === STEPS.length - 1 ? "rgba(42,74,106,0.08)" : "linear-gradient(135deg,rgba(232,240,248,0.95),rgba(197,216,236,0.90))", color: active === STEPS.length - 1 ? "rgba(42,74,106,0.30)" : "#1a4a8a", cursor: active === STEPS.length - 1 ? "default" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active === STEPS.length - 1 ? "none" : "0 2px 10px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset", transition: "all .2s", flexShrink: 0 }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
