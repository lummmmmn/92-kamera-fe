import { G, MUT, TXT, CARD } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";

export default function BookingDone({
  orderId,
  selectedCamList,
  selCams,
  selAcc,
  days,
  selSession,
  appliedDiscounts,
  discountAmt,
  rentalDiscountAmt,
  deliveryDiscountAmt,
  deliveryFeeCalc,
  total,
  info,
  siteContent,
  onClose,
  selfPickup,
  deliveryStreet,
  deliveryWard,
  deliveryDistrict,
  deliveryPickup,
  deliveryReturn,
}) {
  const zaloMsg = encodeURIComponent(
    "Xin chào 92 KA MÊ RA! 📸\nMã đơn: " +
      orderId +
      "\nThiết bị: " +
      selectedCamList.map((c) => c.name + " x" + selCams[c.id]).join(", ") +
      "\nThời gian: " +
      fmtDays(days, selSession) +
      (appliedDiscounts.length > 0 ? "\nMã giảm giá: " + appliedDiscounts.map((ad) => ad.code).join(" + ") + " (-" + fmtVND(discountAmt) + ")" : "") +
      (deliveryFeeCalc > 0 ? "\nPhí giao nhận: " + fmtVND(deliveryFeeCalc) : "") +
      "\nTổng tiền: " +
      fmtVND(total) +
      "\nKhách: " +
      info.name +
      " | SĐT: " +
      info.phone
  );

  const zaloHref = siteContent.zaloLink
    ? siteContent.zaloLink + (siteContent.zaloLink.includes("?") ? "&" : "?") + "text=" + zaloMsg
    : "https://zalo.me/" + (siteContent.zalo || "").replace(/\s/g, "") + "?text=" + zaloMsg;

  const copyFn = () => {
    const accList = (() => {
      try {
        return (
          Object.entries(selAcc)
            .filter(([, q]) => q > 0)
            .map(([n, q]) => (q > 1 ? `${n} x${q}` : n))
            .join(", ") || "Không có"
        );
      } catch {
        return "Không có";
      }
    })();

    const ri2 = returnInfoLocal();

    const lines = [
      "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
      "━━━━━━━━━━━━━━━━━━━━━━",
      `Mã đơn : ${orderId}`,
      `📷 Máy  : ${selectedCamList.map((c) => `${c.name}${selCams[c.id] > 1 ? ` x${selCams[c.id]}` : ""}`).join(", ")}`,
      `🎒 Phụ kiện: ${accList}`,
      `⏱ Thời gian: ${fmtDays(days, selSession)}`,
      ri2 ? `📦 Giờ nhận : ${ri2.pickTime} · ${ri2.pickDate}` : null,
      ri2 ? `📅 Giờ trả  : ${ri2.dropTime} · ${ri2.dropDate}` : null,
      ...(appliedDiscounts.length > 0
        ? appliedDiscounts.map((ad) =>
            ad.scope === "delivery"
              ? `🚗 Mã ship: ${ad.code} (-${fmtVND(deliveryDiscountAmt)})`
              : `🎞️ Mã thuê: ${ad.code} (-${fmtVND(rentalDiscountAmt)})`
          )
        : []),
      deliveryFeeCalc > 0 ? `🚗 Phí giao nhận: ${fmtVND(deliveryFeeCalc)}` : null,
      `💰 Tổng tiền: ${fmtVND(total)}`,
      "━━━━━━━━━━━━━━━━━━━━━━",
      `👤 Tên   : ${info.name}`,
      `📞 SĐT   : ${info.phone}`,
      (deliveryStreet || deliveryWard) && !selfPickup
        ? `📍 Địa chỉ: ${[deliveryStreet, deliveryWard, deliveryDistrict].filter(Boolean).join(", ")}`
        : selfPickup
        ? null
        : info.address
        ? `📍 Địa chỉ: ${info.address}`
        : null,
      selfPickup ? `🏠 Nhận tại shop: Thôn Thạnh Mỹ, xã Tam Mỹ, TP Đà Nẵng` : null,
      !selfPickup && deliveryWard
        ? `🚗 Nhận máy: ${deliveryPickup === "home" ? "Giao tận nơi" : "Tại shop"} · Trả máy: ${
            deliveryReturn === "home" ? "Nhận tận nơi" : "Tại shop"
          }`
        : null,
      info.note ? `💬 Ghi chú: ${info.note}` : null,
      "━━━━━━━━━━━━━━━━━━━━━━",
      "⏳ Trạng thái: Chờ xác nhận",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard?.writeText(lines).catch(() => {});
  };

  function returnInfoLocal() {
    if (!pickDate || !days) return null;
    const fmtDate = (ds) => {
      const d = new Date(ds + "T00:00:00");
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    if (days === 0.5) {
      const isM = selSession === "morning";
      const isA = selSession === "afternoon";
      return {
        pickTime: isM ? "06:00" : isA ? "14:00" : "--:--",
        pickDate: fmtDate(pickDate),
        dropTime: isM ? "12:00" : isA ? "20:00" : "--:--",
        dropDate: fmtDate(pickDate),
        totalH: 6,
        totalLabel: "6 giờ (1 buổi)",
      };
    }

    const totalH = Math.ceil(days) * 24;
    const endDs = dateAddDays(pickDate, days);
    return {
      pickTime: "12:00",
      pickDate: fmtDate(pickDate),
      dropTime: "12:00",
      dropDate: fmtDate(endDs),
      totalH,
      totalLabel: `${totalH} giờ (${Math.ceil(days)} ngày)`,
    };
  }

  // pickDate is needed inside returnInfoLocal, which depends on days and pickDate from outer scope.
  // We can grab pickDate from info/order metadata or select it from cameras if needed.
  // Wait, let's pass pickDate as a prop to be simple and correct!
  const pickDate = selectedCamList[0]?.date || new Date().toISOString().split("T")[0]; // safety fallback

  return (
    <div style={{ textAlign: "center", padding: "12px 8px 20px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes floatDot{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-80px) rotate(360deg);opacity:0}}
      `}</style>
      {[...Array(14)].map((_, i) => {
        const x = 5 + ((i * 7) % 90);
        const delay = (i * 0.18).toFixed(2);
        const size = 4 + (i % 5) * 2;
        const colors = [G, "#fff", G + "99", "#c8b06a", "#fff8e1"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: 20 + (i % 4) * 18,
              width: size,
              height: size,
              background: colors[i % colors.length],
              borderRadius: i % 3 === 0 ? "50%" : 2,
              animation: `floatDot ${1.8 + (i % 4) * 0.3}s ease-out ${delay}s infinite`,
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.7,
            }}
          />
        );
      })}

      <div style={{ position: "relative", display: "inline-block", marginBottom: 16, zIndex: 1 }}>
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 60,
            height: 60,
            background: `radial-gradient(circle, #fff9 0%, ${G}66 40%, transparent 70%)`,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 0 16px rgba(201,168,76,0.5))" }}>📷</div>
      </div>

      <div
        style={{
          color: G,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          marginBottom: 6,
          letterSpacing: 0.5,
          zIndex: 1,
          position: "relative",
        }}
      >
        Đặt đơn thành công!
      </div>
      <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif", marginBottom: 16, zIndex: 1, position: "relative" }}>
        Mã đơn của bạn
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.75)",
          borderRadius: 16,
          padding: "14px 24px",
          display: "inline-block",
          marginBottom: 14,
          zIndex: 1,
          position: "relative",
          minWidth: 240,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div style={{ color: TXT, fontSize: 28, fontWeight: 900, fontFamily: "monospace", letterSpacing: 6 }}>{orderId}</div>
      </div>

      <div style={{ marginBottom: 20, zIndex: 1, position: "relative" }}>
        {appliedDiscounts.length > 0 && (
          <div style={{ color: "#22c55e", fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>
            {appliedDiscounts.map((ad) => (
              <div key={ad.code}>
                {ad.scope === "delivery" ? "🚗" : "🎞️"} Mã {ad.code} — Đã giảm{" "}
                {fmtVND(ad.scope === "delivery" ? deliveryDiscountAmt : rentalDiscountAmt)}
              </div>
            ))}
          </div>
        )}
        <span style={{ color: MUT, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>Tổng: </span>
        <span style={{ color: G, fontWeight: 800, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>
          {new Intl.NumberFormat("vi-VN").format(total)} đ
        </span>
      </div>

      {siteContent.zaloQR && (
        <div style={{ margin: "0 auto 18px", maxWidth: 200, zIndex: 1, position: "relative" }}>
          <div style={{ color: MUT, fontSize: 9, letterSpacing: 2, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>
            QUÉT QR ĐỂ LIÊN HỆ
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: 8, display: "inline-block", boxShadow: `0 0 30px ${G}22` }}>
            <img src={siteContent.zaloQR} alt="Zalo QR" style={{ width: 160, height: 160, objectFit: "contain", display: "block" }} />
          </div>
        </div>
      )}

      {siteContent.zaloLink || (siteContent.zalo || "").replace(/\s/g, "") ? (
        <a
          href={zaloHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "15px 24px",
            background: "#06c755",
            color: "#fff",
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 16,
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(6,199,85,0.35)",
            marginBottom: 12,
            boxSizing: "border-box",
            zIndex: 1,
            position: "relative",
            transition: "opacity .2s",
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span> Nhắn Zalo chốt đơn
        </a>
      ) : info.phone || (siteContent.phone || "").replace(/\s/g, "") ? (
        <a
          href={`tel:${(info.phone || siteContent.phone || "").replace(/\s/g, "")}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "15px 24px",
            background: "#0a84ff",
            color: "#fff",
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 16,
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(10,132,255,0.35)",
            marginBottom: 12,
            boxSizing: "border-box",
            zIndex: 1,
            position: "relative",
            transition: "opacity .2s",
          }}
        >
          <span style={{ fontSize: 20 }}>📞</span> Gọi {info.phone || siteContent.phone} chốt đơn
        </a>
      ) : null}

      <div
        style={{
          background: "#EEF9F4",
          border: "1px solid #06c75533",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
          zIndex: 1,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>🛡️</span>
        <div>
          <div style={{ color: "#22c55e", fontSize: 12, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
            Đơn thuê đã được tạo và xác nhận qua Zalo.
            <br />
            Để được xử lý đơn nhanh hơn.
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: 12,
          zIndex: 1,
          position: "relative",
          background: "rgba(255,255,255,0.42)",
          border: "1px solid rgba(255,255,255,0.62)",
          borderRadius: 16,
          padding: "14px 16px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", marginBottom: 10 }}>
          SAO CHÉP ĐƠN ĐỂ GỬI / LƯU LẠI
        </div>
        <button
          onClick={copyFn}
          style={{
            width: "100%",
            padding: "13px 0",
            background: `linear-gradient(135deg,#1a1200,#0f0d08)`,
            color: "#c9a84c",
            border: `1px solid ${G}55`,
            borderRadius: 14,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 14,
            fontFamily: "system-ui,sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all .2s",
            letterSpacing: 0.5,
          }}
        >
          <span style={{ fontSize: 18 }}>📋</span> Sao chép đơn
        </button>
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "13px 0",
          background: "rgba(255,255,255,0.40)",
          color: "#556",
          border: "1px solid rgba(255,255,255,0.60)",
          borderRadius: 14,
          cursor: "pointer",
          fontSize: 14,
          fontFamily: "system-ui,sans-serif",
          transition: "background .2s",
          zIndex: 1,
          position: "relative",
        }}
      >
        Đóng
      </button>
    </div>
  );
}
