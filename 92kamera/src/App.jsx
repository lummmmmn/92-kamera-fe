import { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

// ── HELPERS ──
let _camIdNum = 100;
// BUG1 FIX: tính ID tiếp theo từ orders thực tế thay vì hardcode = 4
const newOrderId = (existingOrders = []) => {
  let maxNum = 3;
  (existingOrders || []).forEach(o => {
    if (o.id && o.id.startsWith("#92K")) {
      const n = parseInt(o.id.replace("#92K", ""), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `#92K${String(maxNum + 1).padStart(4, "0")}`;
};
const newCamId = () => _camIdNum++;
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " ₫";
const fmtDays = (d, shiftOrSession) => {
  if (d === 0.5) {
    if (shiftOrSession === "morning") return "🌅 Ca sáng (6h–12h)";
    if (shiftOrSession === "afternoon") return "🌇 Ca chiều (14h–20h)";
    return "1 buổi";
  }
  return `${d} ngày`;
};
const SHIFTS = [
  { key: "morning",   label: "🌅 Ca Sáng",  time: "6:00 – 12:00",  session: "morning"   },
  { key: "afternoon", label: "🌇 Ca Chiều", time: "14:00 – 20:00", session: "afternoon" },
];
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ── TYPEWRITER HOOK ──
function useTypewriter(text, speed = 55, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const t0 = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, startDelay);
    return () => clearTimeout(t0);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ── SESSION LOGIC (theo spec 10 bước) ──
// session: "morning" | "afternoon" | "full"
// full = chiếm cả ngày (block cả sáng + chiều)
const getOrderSession = (o) => {
  if (o.session) return o.session;            // đơn mới có session
  if (o.shift) return o.shift;                // đơn cũ có shift (morning/afternoon)
  return "full";                              // đơn cũ days>=1 → full
};
const sessionConflicts = (oSession, targetSession) => {
  if (oSession === "full" || targetSession === "full") return true;
  return oSession === targetSession;          // cùng ca mới xung đột
};

// getAvailQty: trả về số lượng còn lại cho 1 item trong 1 ngày + session
const getAvailQty = (camId, camQty, orders, targetDate, targetSession) => {
  const active = ["pending", "confirmed", "active"];
  let used = 0;
  orders.filter(o => active.includes(o.status)).forEach(o => {
    if (targetDate && !isDateInOrder(targetDate, o)) return;
    if (targetDate && targetSession && !sessionConflicts(getOrderSession(o), targetSession)) return;
    if (o.cameras) { const c = o.cameras.find(c => c.id === camId); if (c) used += (c.qty || 1); }
    else if (o.cameraId === camId) used += 1;
  });
  return Math.max(0, camQty - used);
};

// getAccAvailQty: trả số lượng phụ kiện còn lại cho 1 ngày + session
const getAccAvailQty = (accName, accQty, orders, targetDate, targetSession) => {
  const active = ["pending", "confirmed", "active"];
  let used = 0;
  orders.filter(o => active.includes(o.status)).forEach(o => {
    if (targetDate && !isDateInOrder(targetDate, o)) return;
    if (targetDate && targetSession && !sessionConflicts(getOrderSession(o), targetSession)) return;
    if (o.accessoriesDetail) {
      const d = o.accessoriesDetail.find(x => x.name === accName);
      if (d) used += (d.qty || 1);
    } else if (o.accessories && o.accessories.includes(accName)) {
      used += 1;
    }
  });
  return Math.max(0, accQty - used);
};

// getAvailability: trả {morning, afternoon} cho 1 item trong 1 ngày
const getAvailability = (itemId, itemTotal, orders, date) => {
  const active = ["pending", "confirmed", "active"];
  let usedMorning = 0, usedAfternoon = 0;
  orders.filter(o => active.includes(o.status) && isDateInOrder(date, o)).forEach(o => {
    const sess = getOrderSession(o);
    const qty = (() => {
      if (o.cameras) { const c = o.cameras.find(c => c.id === itemId); return c ? (c.qty || 1) : 0; }
      return o.cameraId === itemId ? 1 : 0;
    })();
    if (sess === "full")      { usedMorning += qty; usedAfternoon += qty; }
    if (sess === "morning")   { usedMorning += qty; }
    if (sess === "afternoon") { usedAfternoon += qty; }
  });
  return { morning: Math.max(0, itemTotal - usedMorning), afternoon: Math.max(0, itemTotal - usedAfternoon) };
};

// getItemStatus: "trống" | "còn ít" | "hết" (dùng cho UI badge)
const getItemStatus = (morning, afternoon) => {
  if (morning <= 0 && afternoon <= 0) return "hết";
  if (morning <= 1 || afternoon <= 1) return "còn ít";
  return "trống";
};
// Helpers cho lịch thuê
// 1 ngày = 24h: nhận 12:00 ngày X → trả 12:00 ngày X+1
// n < 1 (buổi) → cùng ngày; n >= 1 → cộng đúng n ngày
const dateAddDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + (n < 1 ? 0 : Math.ceil(n)));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const isDateInOrder = (dateStr, o) => {
  if (!o.date || !o.days) return false;
  const endDate = dateAddDays(o.date, o.days);
  // Buổi (days < 1): start = end = cùng ngày → dùng <= để ngày đó vẫn bị block
  // Ngày (days >= 1): ngày trả máy KHÔNG bị block → dùng < (strict) để back-to-back booking được
  if (o.days < 1) return dateStr >= o.date && dateStr <= endDate;
  return dateStr >= o.date && dateStr < endDate;
};

const G = "#0D1B2A", BG = "#E8F0F8", CARD = "#C5D8EC", BR = "#8BAECF", TXT = "#05111F", MUT = "#4A6A8A", RED = "#C0290A";
const CARD2 = "#B5CEEA", BR2 = "#7A9FBF";

// ── GOOGLE OAUTH ──
const GOOGLE_CLIENT_ID = "338403275162-fa55lm8g53eu1h6ursqpd714ce1qre8m.apps.googleusercontent.com";
// Flag: chỉ gọi google.accounts.id.initialize 1 lần mỗi phiên để tránh loop
let _gsiInitialized = false;
function decodeGoogleJWT(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { googleId: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture };
  } catch { return null; }
}

// ── RESPONSIVE HOOK ──
function useMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ── SMOOTH SCROLL HOOK — lerp-based inertia, no deps ──
// Chỉ active trên desktop (touch device dùng native momentum)
function useSmoothScroll(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if ("ontouchstart" in window) return; // mobile native đã đủ mượt

    let cur = window.scrollY;
    let tgt = window.scrollY;
    let raf = null;
    let weScrolled = false;
    const EASE = 0.105;   // 0.08=rất mượt/chậm · 0.12=nhanh hơn
    const MULT = 1.1;     // wheel delta multiplier

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
      // Bỏ qua nếu target thuộc scrollable container (modal, admin panel...)
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
      if (!raf) { cur = window.scrollY; raf = requestAnimationFrame(run); }
    };

    // Sync khi có external scroll (keyboard, scrollIntoView, programmatic)
    const onScroll = () => {
      if (!weScrolled) {
        const y = window.scrollY;
        cur = y; tgt = y;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
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

// ── INITIAL DATA ──
const CAMS_INIT = [
  { id: 1, name: "Fujifilm X-T20", price: 200000, status: "available", desc: "Màu sắc tự nhiên, phong cách retro cổ điển", qty: 2, icon: "📷", images: [] },
  { id: 2, name: "Sony ZV-E10", price: 180000, status: "available", desc: "Màn lật 180°, quay vlog chuyên nghiệp", qty: 1, icon: "🎥", images: [] },
  { id: 3, name: "DJI Pocket 3", price: 300000, status: "rented", desc: "Gimbal tích hợp, chống rung xuất sắc", qty: 1, icon: "🎬", images: [] },
  { id: 4, name: "Canon EOS M50 II", price: 220000, status: "available", desc: "Eye-AF tốc độ cao, video 4K", qty: 2, icon: "📸", images: [] },
  { id: 5, name: "GoPro Hero 12", price: 250000, status: "available", desc: "Chống nước 10m, quay 5.3K siêu nét", qty: 3, icon: "🏄", images: [] },
  { id: 6, name: "Nikon Z30", price: 230000, status: "available", desc: "Không gương lật, video 4K 60fps", qty: 1, icon: "🌅", images: [] },
];
const ACC_INIT = [
  { id: 1, name: "Tripod 3 chân",   price: 50000,  priceShift: 35000, qty: 2, active: true,  desc: "Dùng được cho mọi loại máy ảnh", image: "" },
  { id: 2, name: "Mic thu âm",      price: 80000,  priceShift: 50000, qty: 2, active: true,  desc: "Cổng 3.5mm, thu âm rõ nét", image: "" },
  { id: 3, name: "Pin dự phòng",    price: 30000,  priceShift: 20000, qty: 4, active: true,  desc: "Pin lithium, dùng được hầu hết máy", image: "" },
  { id: 4, name: "Lens 50mm f/1.8", price: 150000, priceShift: null,  qty: 1, active: true,  desc: "Phù hợp Canon M-mount", image: "" },
  { id: 5, name: "ND Filter set",   price: 40000,  priceShift: 25000, qty: 2, active: true,  desc: "Bộ 3 filter: ND4, ND8, ND16", image: "" },
  { id: 6, name: "Túi đựng máy",    price: 30000,  priceShift: 20000, qty: 3, active: true,  desc: "Có lớp đệm bảo vệ, đeo vai", image: "" },
  { id: 7, name: "Thẻ nhớ 128GB",   price: 20000,  priceShift: 15000, qty: 5, active: true,  desc: "Class 10, tốc độ ghi 100MB/s", image: "" },
];
const ORDERS_INIT = [
  { id: "#92K0001", cameraName: "Fujifilm X-T20", cameraId: 1, accessories: ["Tripod 3 chân"], accessoriesDetail: [{ name: "Tripod 3 chân", qty: 1 }], days: 3, total: 650000, name: "Nguyễn Văn An", phone: "0901234567", zalo: "0901234567", address: "123 Trần Phú, Đà Nẵng", note: "", status: "active", date: "2026-04-15", seen: true },
  { id: "#92K0002", cameraName: "Sony ZV-E10", cameraId: 2, accessories: [], accessoriesDetail: [], days: 7, total: 1260000, name: "Trần Thị Bình", phone: "0912345678", zalo: "0912345678", address: "45 Lê Lợi, Hội An", note: "Cần thêm pin", status: "completed", date: "2026-04-10", seen: true },
  { id: "#92K0003", cameraName: "GoPro Hero 12", cameraId: 5, accessories: ["Mic thu âm", "Pin dự phòng"], accessoriesDetail: [{ name: "Mic thu âm", qty: 1 }, { name: "Pin dự phòng", qty: 1 }], days: 1, total: 360000, name: "Lê Văn Cường", phone: "0923456789", zalo: "0923456789", address: "78 Nguyễn Huệ, Tam Kỳ", note: "", status: "confirmed", date: "2026-04-20", seen: true },
];
const SITE_INIT = { zalo: "0855 471 202", address: "Thạnh Mỹ Xã Tam Mỹ Thành Phố Đà Nẵng", tagline: "Trải nghiệm máy ảnh · Bắt giữ khoảnh khắc", desc: "Chúng tôi cung cấp dịch vụ cho thuê máy ảnh khu vực Núi Thành - Tam Kỳ.", phone: "0855 471 202", slogan: "Dịch vụ cho thuê máy ảnh · Núi Thành - Tam Kỳ", stats: [["📸", "50+", "Lượt thuê / tháng"], ["🎬", "10+", "Loại thiết bị"], ["⭐", "98%", "Khách hài lòng"]], zaloLink: "", zaloQR: "", socialLinks: { youtube: "", facebook: "", tiktok: "", instagram: "" }, secretText: "" };
const DURATIONS = [
  { label: "🌅 Ca Sáng",  days: 0.5, session: "morning"   },
  { label: "🌇 Ca Chiều", days: 0.5, session: "afternoon" },
  { label: "☀️ Cả ngày",  days: 1,   session: "full"      },
  { label: "3 ngày",      days: 3,   session: "full"      },
  { label: "7 ngày",      days: 7,   session: "full"      },
  { label: "1 tháng",     days: 30,  session: "full"      },
];

// ── NÚT SAO CHÉP ĐƠN (có feedback "Đã sao chép!") ──
function CopyOrderBtn({ copyFn }) {
  const [done, setDone] = useState(false);
  const handle = () => { copyFn(); setDone(true); setTimeout(() => setDone(false), 2000); };
  return (
    <button onClick={handle}
      style={{ padding: "8px 16px", background: done ? "#EEF9F4" : CARD, color: done ? "#22c55e" : "#c9a84c", border: `1px solid ${done ? "#22c55e55" : `${G}55`}`, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", transition: "all .2s", display: "flex", alignItems: "center", gap: 6 }}>
      {done ? "✅ Đã sao chép!" : "📋 Sao chép đơn"}
    </button>
  );
}

// ── NÚT XOÁ ĐƠN (có xác nhận 2 bước) ──
function DeleteOrderBtn({ orderId, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      style={{ marginTop: 12, padding: "6px 14px", background: "#FEF0F0", color: "#cc3333", border: "1px solid #B0282844", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
      🗑️ Xoá đơn này
    </button>
  );
  return (
    <div style={{ marginTop: 12, background: "#FEF0F0", border: "1px solid #cc333366", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>⚠️ Xác nhận xoá <strong>{orderId}</strong>? Không thể hoàn tác!</span>
      <button onClick={onDelete} style={{ padding: "5px 14px", background: "#cc3333", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
      <button onClick={() => setConfirm(false)} style={{ padding: "5px 12px", background: CARD, color: "#999", border: "1px solid #333", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Huỷ</button>
    </div>
  );
}

// ── TRA CỨU NHANH MÃ ĐƠN (component riêng để dùng hook hợp lệ) ──
function QuickOrderLookup({ orders, inp2, setExpandedOrder, setSearch, setOrderFilter }) {
  const [quickId, setQuickId] = useState("");
  const [quickResult, setQuickResult] = useState(null);
  const [quickErr, setQuickErr] = useState(false);
  const lookup = () => {
    const q = quickId.trim().toUpperCase();
    if (!q) return;
    const found = orders.find(o => o.id.toUpperCase() === q || o.id.toUpperCase().includes(q));
    if (found) { setQuickResult(found); setQuickErr(false); setExpandedOrder(found.id); }
    else { setQuickResult(null); setQuickErr(true); }
  };
  return (
    <div style={{ marginBottom: 18, background: CARD, border: `1px solid ${BR2}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>⚡ TRA CỨU NHANH MÃ ĐƠN</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={quickId} onChange={e => { setQuickId(e.target.value); setQuickErr(false); setQuickResult(null); }}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="#92K0001 hoặc nhập một phần mã..." style={{ ...inp2, flex: 1, fontFamily: "monospace", letterSpacing: 1 }} />
        <button onClick={lookup} style={{ padding: "10px 18px", background: G, color: "#000", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>Tìm</button>
      </div>
      {quickErr && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>❌ Không tìm thấy mã đơn này</div>}
      {quickResult && (
        <div style={{ marginTop: 10, background: "#EEF9F4", border: "1px solid #22c55e33", borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={{ color: G, fontWeight: 800, fontFamily: "monospace", fontSize: 13 }}>{quickResult.id}</span>
              <span style={{ marginLeft: 10 }}><Badge status={quickResult.status} /></span>
            </div>
            <span style={{ color: G, fontWeight: 700 }}>{fmtVND(quickResult.total)}</span>
          </div>
          <div style={{ color: TXT, fontSize: 12, marginTop: 4 }}>📷 {quickResult.cameraName} · {fmtDays(quickResult.days, quickResult.shift)}</div>
          <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>👤 {quickResult.name} · 📞 {quickResult.phone}</div>
          <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>📅 {quickResult.date}{quickResult.address ? ` · 📍 ${quickResult.address}` : ""}</div>
          {quickResult.discountCode && <div style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>🏷️ Mã: {quickResult.discountCode} — Giảm {fmtVND(quickResult.discountAmt || 0)}</div>}
          <button onClick={() => { setSearch(quickResult.id); setOrderFilter("all"); setQuickId(""); setQuickResult(null); }}
            style={{ marginTop: 8, padding: "5px 12px", background: CARD, color: G, border: `1px solid ${G}44`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
            → Xem trong danh sách
          </button>
        </div>
      )}
    </div>
  );
}
const QR_CODE = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iLTIgLTIgNzAgNzAiPjxnIGNsYXNzPSJsYXllciI+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPjxwYXRoIGQ9Ik0xIDE2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTEgMjJhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMXYtMnYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTF2LTJ2LTJ2LTJ2LTJhMSwxIDAgMCwxIDEsLTFNMSAzNGExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTEgNDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zIDQwaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zIDQ2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUgMTZoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01IDM0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUgNDRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNSA0OGExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJoLTJoLTJoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTkgMThhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU05IDI2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTkgMzRhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU05IDM4aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNOSA0MmExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTEzIDI0YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTF2LTJ2LTJhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0xMyA0MGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0xMyA0NGExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWgyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWgtMmgtMmgtMmgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTcgMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWgyaDJhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWgtMmgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTE3IDZhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTcgNTBoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0ydi0yYTEsMSAwIDAsMSAxLC0xTTE3IDU4YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNMTcgNjRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTkgMjhhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTkgMzJoMmgyaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0xOSA0NmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yMSAyNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTIxIDM2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDE2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDQ4YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDU4YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTIzIDY0aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMjUgMTJhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0yNSAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yNyAxOGgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTI3IDQ0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTI3IDYyaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMjkgMjRoMmExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxdjJ2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0yOSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yOSA1MmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMSAzMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMSA0MmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJ2LTJhMSwxIDAgMCwxIDEsLTFNMzEgNTBhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzEgNTRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzMgNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMyA0OGgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNSAyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzUgNDRoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAxMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAzMGExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYydjJ2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxdjJ2MnYyYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTM3IDUyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJ2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFoLTJoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MnYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzkgNjRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNDEgNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00MSAyMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00MSA0NmExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTQzIDE2aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDUgMGgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDUgNmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00NSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00NyAxOGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMnYtMnYtMmExLDEgMCAwLDEgMSwtMU00OSA0YTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDkgMTBhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU00OSAxNmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00OSA2MmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01MSAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01MSA1NmgyaDJhMSwxIDAgMCwwIDEsLTF2LTJ2LTJhMSwxIDAgMCwwIC0xLC0xaC0yaC0yYTEsMSAwIDAsMCAtMSwxdjJ2MmExLDEgMCAwLDAgMSwxTTUzIDQyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUzIDUyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTU1IDQ0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTU5IDQwaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNTkgNThhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjEgMzZhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MSA2MGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MSA2NGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MyAxNmgyYTEsMSAwIDAsMSAxLDF2MnYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTYzIDI2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTYzIDQ0YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjUgNDhhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjUgNjJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTEiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2ZmZmZmZiIgaWQ9InN2Z18xIiAvPjwvZz48cGF0aCBkPSJNMywwaDhhMywzIDAgMCwxIDMsM3Y4YTMsMyAwIDAsMSAtMywzaC04YTMsMyAwIDAsMSAtMywtM3YtOGEzLDMgMCAwLDEgMywtM3pNNC4xLDJhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAtMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NnY1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTZoNS44MDAwMDAwMDAwMDAwMDFhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAyLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NnYtNS44MDAwMDAwMDAwMDAwMDFhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAtMi4wOTk5OTk5OTk5OTk5OTk2LC0yLjA5OTk5OTk5OTk5OTk5OTZoLTUuODAwMDAwMDAwMDAwMDAxek01LjUsNGgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8cGF0aCBkPSJNNTUsMGg4YTMsMyAwIDAsMSAzLDN2OGEzLDMgMCAwLDEgLTMsM2gtOGEzLDMgMCAwLDEgLTMsLTN2LThhMywzIDAgMCwxIDMsLTN6TTU2LjEsMmEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2djUuODAwMDAwMDAwMDAwMDAxYTIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTYgMCAwLDAgMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5Nmg1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwtMi4wOTk5OTk5OTk5OTk5OTk2di01LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NmgtNS44MDAwMDAwMDAwMDAwMDF6TTU3LjUsNGgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8cGF0aCBkPSJNMyw1Mmg4YTMsMyAwIDAsMSAzLDN2OGEzLDMgMCAwLDEgLTMsM2gtOGEzLDMgMCAwLDEgLTMsLTN2LThhMywzIDAgMCwxIDMsLTN6TTQuMSw1NGEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2djUuODAwMDAwMDAwMDAwMDAxYTIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTYgMCAwLDAgMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5Nmg1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwtMi4wOTk5OTk5OTk5OTk5OTk2di01LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NmgtNS44MDAwMDAwMDAwMDAwMDF6TTUuNSw1NmgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPm51bGw8L3N2Zz4=";

const STATUS_CFG = {
  available: { label: "Còn máy", color: "#22c55e" },
  rented: { label: "Đang thuê", color: "#f59e0b" },
  unavailable: { label: "Hết máy", color: "#ef4444" },
  pending: { label: "Đang nhận đơn", color: "#60a5fa" },
  confirmed: { label: "Đã xác nhận", color: "#a78bfa" },
  active: { label: "Đang thuê", color: "#f59e0b" },
  completed: { label: "Hoàn thành", color: "#22c55e" },
  cancelled: { label: "Đã huỷ", color: "#6b7280" },
};
const ORDER_STATUSES = { pending: "Đang nhận đơn", confirmed: "Đã xác nhận", active: "Đang thuê", completed: "Hoàn thành", cancelled: "Huỷ đơn" };

// ── BASE STYLES ──
const inp2 = { padding: "9px 13px", background: CARD, border: `1px solid ${BR2}`, borderRadius: 10, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" };
const btn = (variant = "gold") => ({
  padding: "9px 18px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif",
  ...(variant === "gold" ? { background: G, color: "#E8F0F8" } : variant === "ghost" ? { background: CARD, color: TXT, border: `1px solid ${BR2}` } : { background: "#FEF0F0", color: "#C0290A", border: "1px solid #C0290A30" }),
});

// ── BADGE ──
function Badge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: "#888" };
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: c.color + "22", color: c.color, border: `1px solid ${c.color}44`, whiteSpace: "nowrap", letterSpacing: .5 }}>{c.label}</span>;
}

// ── ORDER LOOKUP WIDGET (tra cứu đơn nhanh, không cần đăng nhập) ──
function OrderLookupWidget({ orders, compact }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const inputRef = useRef();

  // Tự cập nhật result khi orders thay đổi (admin đổi status → khách thấy ngay)
  useEffect(() => {
    if (!result) return;
    const updated = orders.find(o => o.id === result.id);
    if (updated && (updated.status !== result.status || updated.adminNote !== result.adminNote)) {
      setResult(updated);
      setLastRefresh(new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, result?.id]);

  const search = (q = val) => {
    const s = q.trim().toUpperCase();
    if (!s) return;
    const found = orders.find(o => o.id.toUpperCase() === s || o.id.toUpperCase().replace("#","").includes(s.replace("#","")));
    if (found) { setResult(found); setErr(false); setLastRefresh(new Date()); }
    else { setResult(null); setErr(true); }
  };

  const refresh = async () => {
    if (!result || refreshing) return;
    setRefreshing(true);
    try {
      // Fetch thẳng Supabase để lấy data mới nhất
      const res = await fetch(
        `${SB_URL}/rest/v1/${SB_TABLE}?key=eq.${STORE_KEYS.orders}&select=value`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows?.[0]?.value) {
          const freshOrders = JSON.parse(rows[0].value);
          const found = freshOrders.find(o => o.id === result.id);
          if (found) { setResult(found); setLastRefresh(new Date()); }
        }
      }
    } catch {}
    setRefreshing(false);
  };

  const toggle = () => {
    setOpen(p => !p);
    if (!open) { setVal(""); setResult(null); setErr(false); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const fmtD = (ds) => { try { return new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }); } catch { return ds; } };
  const getTime = (o, type) => {
    if (o.days === 0.5) {
      const _s = o.session || o.shift;
      if (type === "pick") return _s === "morning" ? "06:00" : _s === "afternoon" ? "14:00" : "--:--";
      return _s === "morning" ? "12:00" : _s === "afternoon" ? "20:00" : "--:--";
    }
    return "12:00";
  };

  const sc = result ? (STATUS_CFG[result.status] || { label: result.status, color: "#888" }) : null;

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      {/* Trigger row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={toggle} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: open ? "rgba(30,28,26,0.85)" : "rgba(30,28,26,0.6)",
          border: `1px solid ${open ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)"}`,
          borderRadius: open ? "12px 12px 0 0" : 12,
          padding: compact ? "9px 14px" : "11px 22px", cursor: "pointer", transition: "all .25s",
          color: "#d4cab8", fontSize: compact ? 7.5 : 11, fontFamily: "system-ui,sans-serif", letterSpacing: compact ? 2 : 2.5, fontWeight: 600,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          boxShadow: open ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.18)",
          whiteSpace: "nowrap",
        }}>
          {/* Kính lúp SVG */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          TRA CỨU ĐƠN
        </button>
        {open && result && (
          <button onClick={refresh} title="Làm mới" style={{
            width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BR}`, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, transition: "all .2s",
          }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin 0.7s linear infinite" : "none", fontSize: 12 }}>↻</span>
          </button>
        )}
        {open && lastRefresh && (
          <span style={{ fontSize: 9, color: MUT, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>
            {lastRefresh.toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
          </span>
        )}
      </div>

      {/* Expand panel */}
      {open && (
        <div style={{
          background: CARD2, border: `1px solid ${G}44`, borderRadius: "0 8px 8px 8px",
          padding: "14px 16px", minWidth: 300, maxWidth: 400,
          boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${G}11`,
        }}>
          {/* Input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input ref={inputRef} value={val}
              onChange={e => { setVal(e.target.value.toUpperCase()); setErr(false); setResult(null); }}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="#92K0001"
              style={{ flex: 1, padding: "9px 12px", background: CARD, border: `1px solid ${err ? "#ef4444" : BR}`, borderRadius: 10, color: TXT, fontSize: 13, outline: "none", fontFamily: "monospace", letterSpacing: 2, transition: "border .2s" }}
            />
            <button onClick={() => search()}
              style={{ padding: "9px 14px", background: G, color: "#000", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "system-ui,sans-serif", flexShrink: 0 }}>
              Tìm
            </button>
          </div>

          {err && (
            <div style={{ color: "#ef4444", fontSize: 11, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✕</span> Không tìm thấy mã đơn này
            </div>
          )}

          {result && (() => {
            const dropDs = result.days >= 1 ? dateAddDays(result.date, result.days) : result.date;
            return (
              <div style={{ borderTop: `1px solid ${BR}`, paddingTop: 12, marginTop: 2 }}>
                {/* Header: mã + badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: G, fontWeight: 900, fontSize: 15, fontFamily: "monospace", letterSpacing: 2 }}>{result.id}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.color + "22", color: sc.color, border: `1px solid ${sc.color}44`, letterSpacing: .5 }}>{sc.label}</span>
                </div>

                {/* Máy + thời gian */}
                <div style={{ color: TXT, fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
                  📷 {result.cameraName} · {fmtDays(result.days, result.shift)}
                </div>

                {/* Giờ nhận / trả */}
                {result.date && result.days && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#EEF9F4", border:"1px solid #22c55e33", borderRadius:10, padding:"4px 10px", fontSize:11, color:"#22c55e", fontWeight:700, fontFamily:"system-ui,sans-serif" }}>
                      Nhận: {getTime(result,"pick")} · {fmtD(result.date)}
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#FFF8ED", border:"1px solid #f59e0b33", borderRadius:10, padding:"4px 10px", fontSize:11, color:"#f59e0b", fontWeight:700, fontFamily:"system-ui,sans-serif" }}>
                      Trả: {getTime(result,"drop")} · {fmtD(dropDs)}
                    </span>
                  </div>
                )}

                {/* Tổng tiền */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${BR}`, paddingTop: 10 }}>
                  <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>TỔNG TIỀN</span>
                  <span style={{ color: G, fontWeight: 900, fontSize: 17, fontFamily: "system-ui,sans-serif" }}>{fmtVND(result.total)}</span>
                </div>

                {/* Hint refresh */}
                <div style={{ marginTop: 8, color: MUT, fontSize: 9, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>
                  Nhấn ↻ để cập nhật trạng thái mới nhất
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── LOGO ──
function Logo({ light = true, size = 1 }) {
  const col = light ? "#1A1917" : MUT;
  const s = n => n * size;
  const bw = 2.5;
  const [clicked, setClicked] = useState(false);
  const handleClick = () => { setClicked(true); setTimeout(() => setClicked(false), 600); };
  const spread = clicked ? s(7) : 0;
  const tr = { transition: clicked ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)" };
  return (
    <div onClick={handleClick} style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--font-display)", color: col, userSelect: "none", cursor: "pointer", lineHeight: 1 }}>
      <div style={{ position: "relative", width: s(13), height: s(32), marginRight: s(9), flexShrink: 0 }}>
        <span style={{ ...tr, position: "absolute", top: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, transform: `translate(${-spread}px,${-spread}px)` }} />
        <span style={{ ...tr, position: "absolute", bottom: 0, left: 0, width: s(13), height: s(16), borderLeft: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, transform: `translate(${-spread}px,${spread}px)` }} />
      </div>
      <span style={{ fontSize: s(20), fontWeight: 400, letterSpacing: s(1.5), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
        <span>92</span>
        <span style={{ marginLeft: s(10) }}>KA</span>
        <span style={{ marginLeft: s(10) }}>MÊ</span>
        <span style={{ marginLeft: s(10) }}>RA</span>
        <span style={{ display: "inline-block", width: s(7), height: s(7), borderRadius: "50%", background: "radial-gradient(circle at 36% 30%, #ff5555 0%, #bb0000 55%, #6a0000 100%)", boxShadow: `0 0 ${s(5)}px rgba(190,0,0,0.75), inset 0 ${s(1)}px 0 rgba(255,170,170,0.4)`, marginLeft: s(3), flexShrink: 0, position: "relative", top: s(-6) }} />
      </span>
      <div style={{ position: "relative", width: s(13), height: s(32), marginLeft: s(9), flexShrink: 0 }}>
        <span style={{ ...tr, position: "absolute", top: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, transform: `translate(${spread}px,${-spread}px)` }} />
        <span style={{ ...tr, position: "absolute", bottom: 0, right: 0, width: s(13), height: s(16), borderRight: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, transform: `translate(${spread}px,${spread}px)` }} />
      </div>
    </div>
  );
}

// ── IMAGE COMPRESS HELPER ──
function compressImage(file, maxW = 480, quality = 0.55) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxW / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Nén icon phụ kiện: crop vuông 96x96, ~3-8KB
function compressIcon(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        // crop vuông từ giữa
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── IMAGE UPLOADER ──
function ImageUploader({ images = [], onChange, max = 3 }) {
  const fileRef = useRef();

  const handleFiles = async (files) => {
    const remaining = max - images.length;
    const toProcess = Array.from(files).slice(0, remaining).filter(f => f.type.startsWith("image/"));
    if (!toProcess.length) return;
    const compressed = await Promise.all(toProcess.map(f => compressImage(f)));
    onChange([...images, ...compressed]);
  };

  const removeImg = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {images.map((src, i) => (
          <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
            <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1px solid ${BR2}` }} />
            <button onClick={() => removeImg(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
          </div>
        ))}
        {images.length < max && (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: 72, height: 72, border: `2px dashed ${G}55`, borderRadius: 10, background: CARD2, color: G, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>
            <span style={{ fontSize: 20 }}>+</span>
            <span>Thêm ảnh</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
      {images.length > 0 && <div style={{ color: MUT, fontSize: 10 }}>{images.length}/{max} ảnh · Nhấn ✕ để xoá</div>}
    </div>
  );
}

// ── ACC ICON UPLOADER — 1 ảnh vuông 96x96, siêu nhẹ ──
function AccIconUploader({ image, onChange }) {
  const fileRef = useRef();
  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const compressed = await compressIcon(file);
    onChange(compressed);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        {image
          ? <>
              <img src={image} alt="icon" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 12, border: `1px solid ${BR2}` }} />
              <button onClick={() => onChange("")} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
            </>
          : <button onClick={() => fileRef.current?.click()}
              style={{ width: 56, height: 56, border: `2px dashed ${G}55`, borderRadius: 12, background: CARD2, color: G, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 9, fontFamily: "system-ui,sans-serif" }}>
              <span style={{ fontSize: 18 }}>📷</span>
              <span>Ảnh icon</span>
            </button>
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      {image && (
        <button onClick={() => fileRef.current?.click()}
          style={{ fontSize: 10, color: MUT, background: "none", border: `1px solid ${BR}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "system-ui,sans-serif" }}>
          Đổi ảnh
        </button>
      )}
      <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>~5KB · 96×96px</span>
    </div>
  );
}

// ── CAMERA IMAGE DISPLAY ──
function CamImage({ cam, height = 176 }) {
  const [idx, setIdx] = useState(0);
  const imgs = cam.images || [];
  if (imgs.length === 0) {
    return (
      <div style={{ height, background: CARD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70, borderBottom: `1px solid ${BR}` }}>
        {cam.icon || "📷"}
      </div>
    );
  }
  return (
    <div style={{ height, position: "relative", overflow: "hidden", borderBottom: `1px solid ${BR}`, background: BG }}>
      <img src={imgs[idx]} alt={cam.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
      {imgs.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx((idx - 1 + imgs.length) % imgs.length); }}
            style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", color: TXT, border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", color: TXT, border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {imgs.map((_, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === idx ? G : "rgba(255,255,255,0.3)" }} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ── PREMIUM HERO BACKGROUND ──
function LensBackground({ isMob }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Lớp 1: gradient nền chính — blue-gray mờ ảo */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 52% 32%, rgba(110,185,210,0.55) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(150,195,215,0.25) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 85% 15%, rgba(130,175,200,0.20) 0%, transparent 50%),
          linear-gradient(175deg, #7AAFC0 0%, #9EC4D0 25%, #B8D4DC 55%, #C8DCE4 80%, #BDD0D8 100%)
        `,
      }} />
      {/* Lớp 2: grain noise bằng SVG feTurbulence — không cần ảnh */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="overlay" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.45" />
      </svg>
      {/* Lớp 3: vignette nhẹ — cạnh tối hơn giữa */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(8,20,35,0.30) 100%)",
      }} />
    </div>
  );
}

// ── 3D LENS MENU — Premium Cinematic Edition ──
function CameraLens3D({ onBook, loggedUser, onOpenLogin, onOpenCustomer, isMobile }) {
  const [hoveredRing, setHoveredRing] = useState(null);
  const animRef   = useRef(null);
  const isHovRef  = useRef(false);
  const speedRef  = useRef(0.04);
  const segRefs   = useRef([]);
  const arrowRef  = useRef(null);

  // Responsive: lens tự co theo chiều cao viewport
  const [viewH, setViewH] = useState(typeof window !== "undefined" ? window.innerHeight : 900);
  useEffect(() => {
    const onResize = () => setViewH(window.innerHeight);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let oA = 0, mA = 0, iA = 0;
    const tick = () => {
      const target = isHovRef.current ? 0.28 : 0.032;
      speedRef.current += (target - speedRef.current) * 0.03;
      const s = speedRef.current;
      oA += s; mA -= s * 0.62; iA += s * 0.43;
      // DOM mutation trực tiếp — KHÔNG setState → KHÔNG re-render
      if (segRefs.current[0]) segRefs.current[0].style.transform = `rotate(${oA}deg)`;
      if (segRefs.current[1]) segRefs.current[1].style.transform = `rotate(${mA}deg)`;
      if (segRefs.current[2]) segRefs.current[2].style.transform = `rotate(${iA}deg)`;
      if (arrowRef.current)   arrowRef.current.style.transform   = `rotate(${oA}deg)`;
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Accent color palette — mỗi ring là 1 module riêng biệt ──
  const PALETTE = {
    book:     { accent: "#c9a84c", r: 0.788, g: 0.659, b: 0.298, tag: "ACTION · OUTER RING",   label: "GỬI YÊU CẦU THUÊ" },
    feedback: { accent: "#38bdf8", r: 0.220, g: 0.741, b: 0.973, tag: "REVIEW · MODULE 2",      label: "FEEDBACK" },
    cameras:  { accent: "#34d399", r: 0.204, g: 0.827, b: 0.600, tag: "PRODUCT · MODULE 3",     label: "MÁY ẢNH" },
    acc:      { accent: "#a78bfa", r: 0.655, g: 0.545, b: 0.980, tag: "UTILITY · MODULE 4",     label: "PHỤ KIỆN" },
    login:    { accent: "#f0e8d0", r: 0.941, g: 0.910, b: 0.816, tag: "CORE",                   label: loggedUser ? "TÀI KHOẢN" : "ĐĂNG NHẬP" },
  };

  const rings = [
    { id: "book",     rMid: 215, thick: 44, segs: 36, action: () => onBook() },
    { id: "feedback", rMid: 161, thick: 34, segs: 24, action: () => scrollTo("feedback") },
    { id: "cameras",  rMid: 116, thick: 32, segs: 18, action: () => scrollTo("cameras") },
    { id: "acc",      rMid: 72,  thick: 28, segs: 12, action: () => scrollTo("accessories") },
    { id: "login",    rMid: 34,  thick: 68, isCenter: true, action: loggedUser ? (onOpenCustomer || onOpenLogin) : onOpenLogin },
  ];

  const sz = isMobile ? 321 : Math.min(544, Math.round(viewH * 0.62));
  const anyHov = hoveredRing !== null;

  return (
    <div style={{
      width: sz, height: sz, position: "relative",
      borderRadius: "50%", overflow: "hidden",
      isolation: "isolate",
    }}>
    <div
      className="lens-float-wrap"
      style={{
        width: sz, height: sz, position: "relative",
        filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.38)) drop-shadow(0 6px 14px rgba(0,0,0,0.22))",
        animation: "lensFloat 5.5s ease-in-out infinite",
      }}
      onMouseEnter={() => { isHovRef.current = true; }}
      onMouseLeave={() => { isHovRef.current = false; setHoveredRing(null); }}
    >
      <svg viewBox="-268 -268 536 536" width={sz} height={sz} style={{ overflow: "hidden" }}>
        <defs>
          {/* ── Per-ring metallic radial gradient ── */}
          {rings.map((r, i) => {
            const isHov = hoveredRing === r.id;
            return (
              <radialGradient key={"g"+i} id={"rg"+i} cx="32%" cy="24%" r="78%">
                <stop offset="0%"   stopColor={isHov ? "#686868" : "#505050"}/>
                <stop offset="10%"  stopColor={isHov ? "#484848" : "#363636"}/>
                <stop offset="35%"  stopColor="#222222"/>
                <stop offset="62%"  stopColor="#111111"/>
                <stop offset="88%"  stopColor="#070707"/>
                <stop offset="100%" stopColor="#030303"/>
              </radialGradient>
            );
          })}

          {/* ── Center button gradient ── */}
          <radialGradient id="cgr" cx="38%" cy="30%" r="64%">
            <stop offset="0%"   stopColor="#545454"/>
            <stop offset="16%"  stopColor="#323232"/>
            <stop offset="48%"  stopColor="#181818"/>
            <stop offset="82%"  stopColor="#090909"/>
            <stop offset="100%" stopColor="#030303"/>
          </radialGradient>

          {/* ── Gap channel gradient (recessed void between rings) ── */}
          <radialGradient id="gapVoid" cx="50%" cy="35%" r="55%">
            <stop offset="0%"   stopColor="#080808"/>
            <stop offset="100%" stopColor="#020202"/>
          </radialGradient>

          {/* ── Gloss: upper sweep ── */}
          <linearGradient id="gloss" x1="4%" y1="0%" x2="68%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.24)"/>
            <stop offset="22%"  stopColor="rgba(255,255,255,0.10)"/>
            <stop offset="55%"  stopColor="rgba(255,255,255,0.025)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>

          {/* ── Gloss: lower sweep ── */}
          <linearGradient id="gloss2" x1="96%" y1="100%" x2="28%" y2="6%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.09)"/>
            <stop offset="50%"  stopColor="rgba(255,255,255,0.025)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>

          {/* ── Center button gloss ── */}
          <linearGradient id="cgloss" x1="8%" y1="4%" x2="72%" y2="88%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.30)"/>
            <stop offset="32%"  stopColor="rgba(255,255,255,0.10)"/>
            <stop offset="72%"  stopColor="rgba(255,255,255,0.015)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>

          {/* ── Rim-light ambient (edge catch-light) ── */}
          <radialGradient id="rimLight" cx="50%" cy="50%" r="50%">
            <stop offset="78%"  stopColor="rgba(255,255,255,0)"/>
            <stop offset="92%"  stopColor="rgba(255,255,255,0.04)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0.13)"/>
          </radialGradient>

          {/* ── Plate shadow base ── */}
          <radialGradient id="plateShadow" cx="50%" cy="62%" r="54%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.24)"/>
          </radialGradient>

          {/* ── Global filters ── */}
          <filter id="ringShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.55"/>
            <feDropShadow dx="0" dy="1" stdDeviation="3"  floodColor="#000" floodOpacity="0.30"/>
          </filter>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="centerGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* ── Per-ring colored glow filters ── */}
          {rings.map((r, i) => {
            const p = PALETTE[r.id];
            return (
              <filter key={"gf"+i} id={"ringGlow"+i} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feColorMatrix in="blur" type="matrix"
                  values={`0 0 0 0 ${p.r.toFixed(3)}  0 0 0 0 ${p.g.toFixed(3)}  0 0 0 0 ${p.b.toFixed(3)}  0 0 0 0.55 0`}
                  result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            );
          })}

          {/* ── Lens clip ── */}
          <clipPath id="lensClip"><circle r="260"/></clipPath>

          {/* ── Avatar clip (center button) ── */}
          <clipPath id="avatarClip"><circle r="26"/></clipPath>

          {/* ── Upper arc text paths ── */}
          {rings.filter(r=>!r.isCenter).map(r=>(
            <path key={"tp"+r.id} id={"tpath-"+r.id}
              d={`M ${-(r.rMid-2)},0 A ${r.rMid-2},${r.rMid-2} 0 0,1 ${r.rMid-2},0`}/>
          ))}


          {/* ── Half-circle clips for gloss separation ── */}
          {rings.filter(r=>!r.isCenter).map((r, i) => {
            const rOut = r.rMid + r.thick/2;
            return (
              <g key={"hclip"+i}>
                <clipPath id={"clipTop"+i}>
                  <path d={`M 0,0 L ${rOut+4},0 A ${rOut+4},${rOut+4} 0 0,0 ${-(rOut+4)},0 Z`}/>
                </clipPath>
                <clipPath id={"clipBot"+i}>
                  <path d={`M 0,0 L ${rOut+4},0 A ${rOut+4},${rOut+4} 0 0,1 ${-(rOut+4)},0 Z`}/>
                </clipPath>
              </g>
            );
          })}
        </defs>

        {/* ── Ambient plate drop shadow ── */}
        <ellipse cx="0" cy="9" rx="248" ry="244" fill="rgba(0,0,0,0.09)" filter="url(#ringShadow)"/>

        {/* ── Lens body — all clipped ── */}
        <g clipPath="url(#lensClip)">
          <circle r="252" fill="url(#plateShadow)"/>

          {/* ── Outer calibration tick ring ── */}
          <g>
            {Array.from({length: 90}, (_, i) => {
              const ang = (i * 4) * Math.PI / 180;
              const isMaj = i % 15 === 0;
              const isMed = i % 5 === 0;
              const r1 = 245, r2 = 245 + (isMaj ? 10 : isMed ? 6 : 3.2);
              const op = isMaj ? 0.60 : isMed ? 0.32 : 0.15;
              return (
                <line key={i}
                  x1={Math.cos(ang)*r1} y1={Math.sin(ang)*r1}
                  x2={Math.cos(ang)*r2} y2={Math.sin(ang)*r2}
                  stroke={`rgba(255,255,255,${op})`}
                  strokeWidth={isMaj ? "1.2" : isMed ? "0.75" : "0.55"}
                />
              );
            })}
          </g>

          {/* ════════════════════════════════════════
              RINGS — outer → inner
              Each ring is a self-contained module with
              its own depth treatment, accent color,
              chrome borders and hover state.
          ════════════════════════════════════════ */}
          {rings.map((ring, origIdx) => {
            const isHov = hoveredRing === ring.id;
            const isDimmed = anyHov && !isHov;
            const pal = PALETTE[ring.id];

            /* ────────────────────────────────────
               CENTER BUTTON — core login module
            ──────────────────────────────────── */
            if (ring.isCenter) {
              const cr = ring.rMid;
              return (
                <g key={ring.id}
                  style={{ cursor: "pointer", opacity: isDimmed ? 0.42 : 1, transition: "opacity 0.35s ease" }}
                  onClick={ring.action}
                  onMouseEnter={() => setHoveredRing(ring.id)}
                  onMouseLeave={() => setHoveredRing(null)}>

                  {/* Physical recess channel surrounding center */}
                  <circle r={cr+14} fill="#010101"/>
                  <circle r={cr+12} fill="#030303"/>
                  {/* Channel walls: inner shadow at top of channel */}
                  <circle r={cr+12} fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.7"/>
                  <circle r={cr+10} fill="none" stroke="rgba(0,0,0,0.90)" strokeWidth="5"/>
                  {/* Channel floor highlight */}
                  <circle r={cr+7}  fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5"/>
                  <circle r={cr+5}  fill="#060606"/>

                  {/* Main body */}
                  <circle r={cr} fill="url(#cgr)"/>

                  {/* Glass reflection */}
                  <ellipse cx="-4" cy="-7" rx={cr*0.64} ry={cr*0.44} fill="url(#cgloss)"/>

                  {/* Rim ambient */}
                  <circle r={cr} fill="url(#rimLight)"/>

                  {/* Engraved inner ring — depth detail */}
                  <circle r={cr-5}   fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="2.2"/>
                  <circle r={cr-5.8} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7"/>
                  <circle r={cr-9}   fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8"/>

                  {/* Chrome bevel outer edge */}
                  <circle r={cr-1.2} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.1"/>
                  <circle r={cr-0.2} fill="none" stroke="rgba(0,0,0,0.80)" strokeWidth="3"/>

                  {/* Hover: colored glow + accent ring */}
                  {isHov && (
                    <g filter={`url(#ringGlow${origIdx})`}>
                      <circle r={cr} fill="rgba(255,255,255,0.05)"
                        stroke={pal.accent} strokeWidth="1.5" strokeOpacity="0.55"/>
                    </g>
                  )}

                  {/* Center accent dot — chỉ hiện khi chưa login */}
                  {!loggedUser && <>
                    <circle r="4" fill={isHov ? pal.accent : "rgba(255,255,255,0.18)"}
                      style={{ transition: "fill 0.3s" }}/>
                    <circle r="2" fill={isHov ? "#fff" : "rgba(255,255,255,0.5)"}
                      style={{ transition: "fill 0.3s" }}/>
                  </>}
                  {loggedUser ? (
                    <g>
                      {/* Avatar image hoặc initial */}
                      {loggedUser.avatar ? (
                        <image
                          href={loggedUser.avatar}
                          x="-26" y="-26" width="52" height="52"
                          clipPath="url(#avatarClip)"
                          preserveAspectRatio="xMidYMid slice"
                        />
                      ) : (
                        <>
                          <circle r="26" fill="#1a2030"/>
                          <text y="4" textAnchor="middle" style={{
                            fill: "rgba(255,255,255,0.88)",
                            fontSize: 18,
                            fontFamily: "system-ui,sans-serif",
                            fontWeight: 700,
                          }}>
                            {(loggedUser.displayName || loggedUser.name || "?")[0].toUpperCase()}
                          </text>
                        </>
                      )}
                      {/* 3D gloss overlay lên avatar */}
                      <ellipse cx="-4" cy="-10" rx="17" ry="13" fill="url(#cgloss)" opacity="0.7"/>
                      {/* Rim light */}
                      <circle r="26" fill="url(#rimLight)" opacity="0.8"/>
                      {/* Engraved ring trên avatar */}
                      <circle r="25" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
                      <circle r="26" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5"/>
                    </g>
                  ) : (
                    /* Main label — chưa đăng nhập */
                    <text y="-6" textAnchor="middle" style={{
                      fill: isHov ? pal.accent : "rgba(255,255,255,0.88)",
                      fontSize: 7.4,
                      letterSpacing: 4.0,
                      fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                      fontWeight: 700,
                      transition: "fill 0.28s",
                    }}>
                      {pal.label}
                    </text>
                  )}


                </g>
              );
            }

            /* ────────────────────────────────────
               CONCENTRIC RING — each is a distinct
               elevated module with physical depth
            ──────────────────────────────────── */
            const rOut = ring.rMid + ring.thick / 2;
            const rIn  = ring.rMid - ring.thick / 2;
            const clipI = origIdx; // index for clipPath IDs

            return (
              <g key={ring.id}
                style={{ cursor: "pointer", opacity: isDimmed ? 0.38 : 1, transition: "opacity 0.35s ease" }}
                onClick={ring.action}
                onMouseEnter={() => setHoveredRing(ring.id)}
                onMouseLeave={() => setHoveredRing(null)}>

                {/* ══ PHYSICAL GAP — recessed channel separating rings ══
                    Rendered first so ring body paints over it correctly */}

                {/* Void fill: deep black floor of the gap */}
                <circle r={rOut+16} fill="#000000"/>
                <circle r={rOut+12} fill="#020202"/>
                {/* Top wall of gap (outer edge of this ring's channel) */}
                <circle r={rOut+9} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6"/>
                {/* Main shadow of gap (physically recessed look) */}
                <circle r={rOut+7} fill="none" stroke="rgba(0,0,0,0.95)" strokeWidth="8"/>
                {/* Inner slope of gap (leading into ring surface) */}
                <circle r={rOut+2} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8"/>
                <circle r={rOut+1} fill="none" stroke="rgba(0,0,0,0.70)" strokeWidth="3"/>

                {/* ══ RING BODY ══ */}
                <circle r={rOut} fill={`url(#rg${origIdx})`}/>

                {/* ── Hover: accent color ambient wash ── */}
                {isHov && (
                  <circle r={rOut} fill={`${pal.accent}12`}
                    style={{ transition: "fill 0.3s" }}/>
                )}

                {/* ── Upper hemisphere gloss ── */}
                <circle r={rOut} fill="url(#gloss)" clipPath={`url(#clipTop${clipI})`} opacity="0.95"/>

                {/* ── Lower hemisphere gloss ── */}
                <circle r={rOut} fill="url(#gloss2)" clipPath={`url(#clipBot${clipI})`} opacity="0.65"/>

                {/* ── Chrome outer bevel — 3-layer precision ── */}
                {/* outermost bright edge */}
                <circle r={rOut}     fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
                {/* primary chrome highlight */}
                <circle r={rOut-0.8} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.9"/>
                {/* shadow below highlight = creates bevel illusion */}
                <circle r={rOut-2.2} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.8"/>

                {/* ── Rim ambient catch-light ── */}
                <circle r={rOut} fill="url(#rimLight)"/>

                {/* ── Inner wall: deep shadow for 3D ring depth ── */}
                {/* Primary inner shadow */}
                <circle r={rIn+0.8} fill="none" stroke="rgba(0,0,0,0.90)" strokeWidth="6"/>
                {/* Secondary softer shadow */}
                <circle r={rIn+4}   fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="5"/>
                {/* Inner wall chrome highlight */}
                <circle r={rIn-0.8} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8"/>

                {/* ── Accent inner rim glow (always subtle, bright on hover) ── */}
                <circle r={rIn+2.5} fill="none"
                  stroke={isHov ? pal.accent : "rgba(255,255,255,0.03)"}
                  strokeWidth={isHov ? "1.5" : "0.7"}
                  strokeOpacity={isHov ? 0.45 : 1}
                  style={{ transition: "all 0.38s ease" }}/>

                {/* ── Hover: colored glow ring ── */}
                {isHov && (
                  <g filter={`url(#ringGlow${origIdx})`}>
                    <circle r={rOut}   fill="rgba(0,0,0,0)" stroke={pal.accent} strokeWidth="2"   strokeOpacity="0.40"/>
                    <circle r={rOut+5} fill="none"          stroke={pal.accent} strokeWidth="5"   strokeOpacity="0.10"/>
                  </g>
                )}

                {/* ── Outer accent edge line (colored chrome) ── */}
                <circle r={rOut-0.2} fill="none"
                  stroke={isHov ? pal.accent : "rgba(255,255,255,0.04)"}
                  strokeWidth={isHov ? "0.8" : "0.5"}
                  strokeOpacity={isHov ? 0.35 : 1}
                  style={{ transition: "all 0.38s ease" }}/>

                {/* ══ SEGMENT DIVIDERS — engraved machined lines ══ */}
                <g ref={origIdx < 3 ? el => { segRefs.current[origIdx] = el; } : null} style={{ transformOrigin: "center" }}>
                  {Array.from({ length: ring.segs }, (_, i) => {
                    const ang    = (i * 360 / ring.segs) * Math.PI / 180;
                    const isMaj  = i % Math.max(1, Math.floor(ring.segs / 6)) === 0;
                    const isMed  = ring.segs >= 24 && i % Math.max(1, Math.floor(ring.segs / 12)) === 0 && !isMaj;
                    const insetI = isMaj ? 2.5 : 4;
                    const insetO = isMaj ? 2.5 : 3.5;
                    return (
                      <g key={i}>
                        {/* Shadow side of engraving */}
                        <line
                          x1={Math.cos(ang) * (rIn + insetI + 0.7)} y1={Math.sin(ang) * (rIn + insetI + 0.7)}
                          x2={Math.cos(ang) * (rOut - insetO + 0.7)} y2={Math.sin(ang) * (rOut - insetO + 0.7)}
                          stroke={isMaj ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.30)"}
                          strokeWidth={isMaj ? "1.1" : isMed ? "0.65" : "0.45"}
                        />
                        {/* Light side of engraving */}
                        <line
                          x1={Math.cos(ang) * (rIn + insetI)} y1={Math.sin(ang) * (rIn + insetI)}
                          x2={Math.cos(ang) * (rOut - insetO)} y2={Math.sin(ang) * (rOut - insetO)}
                          stroke={isMaj ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)"}
                          strokeWidth={isMaj ? "0.75" : "0.40"}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* ══ ARC TEXT — integrated into ring surface ══ */}

                {/* Shadow layer for text depth */}
                <text style={{
                  fill: "rgba(0,0,0,0.6)",
                  fontSize: rOut > 228 ? 7.9 : rOut > 178 ? 8.5 : rOut > 128 ? 9.1 : 9.8,
                  letterSpacing: rOut > 228 ? 5.4 : rOut > 178 ? 4.6 : 4.0,
                  fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                  fontWeight: 700,
                }}>
                  <textPath href={`#tpath-${ring.id}`} startOffset="50%" textAnchor="middle" dy="0.5">
                    {pal.label}
                  </textPath>
                </text>

                {/* Main label text */}
                <text style={{
                  fill: isHov ? pal.accent : "rgba(255,255,255,0.82)",
                  fontSize: rOut > 228 ? 7.9 : rOut > 178 ? 8.5 : rOut > 128 ? 9.1 : 9.8,
                  letterSpacing: rOut > 228 ? 5.4 : rOut > 178 ? 4.6 : 4.0,
                  fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
                  fontWeight: 700,
                  transition: "fill 0.30s",
                  filter: isHov ? `drop-shadow(0 0 4px ${pal.accent}88)` : "none",
                }}>
                  <textPath href={`#tpath-${ring.id}`} startOffset="50%" textAnchor="middle">
                    {pal.label}
                  </textPath>
                </text>


              </g>
            );
          })}

          {/* ── Viewfinder corner brackets ── */}
          {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy],i)=>{
            const d = 254, ls = 16;
            return (
              <g key={i} opacity={anyHov ? 0.20 : 0.42} style={{ transition: "opacity 0.4s" }}>
                <line x1={sx*(d-ls)} y1={sy*d} x2={sx*d} y2={sy*d} stroke="rgba(220,220,220,0.75)" strokeWidth="1.4"/>
                <line x1={sx*d} y1={sy*(d-ls)} x2={sx*d} y2={sy*d} stroke="rgba(220,220,220,0.75)" strokeWidth="1.4"/>
                <circle cx={sx*d} cy={sy*d} r="1.4" fill="rgba(255,255,255,0.40)"/>
              </g>
            );
          })}

          {/* ── Outer rotating arrow indicators ── */}
          <g ref={arrowRef} style={{ transformOrigin: "center" }}>
            {[0, 90, 180, 270].map(ang => {
              const rad = ang * Math.PI / 180;
              const r2  = 253;
              return (
                <g key={ang} transform={`translate(${Math.cos(rad)*r2},${Math.sin(rad)*r2}) rotate(${ang+90})`}>
                  <path d="M 0,-6 L 4.5,4 L -4.5,4 Z"
                    fill="rgba(255,255,255,0.24)"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="0.6"
                    strokeLinejoin="round"/>
                </g>
              );
            })}
          </g>

          {/* ── Brand mark ── */}
          <text x="0" y="-240" textAnchor="middle" style={{
            fill: "rgba(255,255,255,0.22)",
            fontSize: 5.5,
            letterSpacing: 4,
            fontFamily: "'Be Vietnam Pro',system-ui,sans-serif",
            fontWeight: 700,
          }}>
            92 KA MÊ RA
          </text>

        </g>{/* end lensClip */}
      </svg>
    </div>
    </div>
  );
}

function CameraScene() {
  return <LensBackground isMob={false} />;
}

function MobileBackground() {
  return <LensBackground isMob={true} />;
}

// ── FEEDBACK CARD
// ── FEEDBACK CARD (text-only, không ảnh) ──
// ── FEEDBACK MARQUEE — dải băng chạy ngang ──
function FeedbackMarquee({ photos, feedbacks, isMobile }) {
  const [paused, setPaused] = useState(false);

  const cards = (feedbacks || [])
    .filter(f => f.status === "approved" && !f.hidden)
    .map(f => ({
      key: "fb_" + f.id,
      rating: f.rating || 5,
      text: f.text || "Khách hàng hài lòng 😊",
      userName: f.userName || "Khách hàng",
      camera: f.cameraName || "Máy ảnh",
      date: f.date,
    }));

  const total = cards.length;
  const avgRating = total ? (cards.reduce((s, c) => s + c.rating, 0) / total).toFixed(1) : "5.0";

  if (total === 0) return (
    <div id="feedback" style={{ padding: "72px 16px 64px", margin: isMobile ? "20px 12px" : "32px 20px", borderRadius: 28, border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", textAlign: "center" }}>
      <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1, margin: "0 0 14px", color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>Feedback Khách Hàng</h2>
      <div style={{ width: 36, height: 1, background: G, margin: "0 auto 20px" }} />
      <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500 }}>Chưa có feedback nào được duyệt</div>
    </div>
  );

  // Nhân đủ để băng chạy liền mạch
  let band = [...cards];
  while (band.length < 10) band = [...band, ...cards];
  band = [...band, ...band]; // double để loop
  const dur = Math.max(35, band.length * 4);

  return (
    <div id="feedback" style={{ padding: isMobile ? "56px 0 52px" : "72px 0 64px", margin: isMobile ? "20px 12px" : "32px 20px", borderRadius: 28, border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", overflow: "hidden", position: "relative" }}>
      <style>{`@keyframes marqueeRun{0%{transform:translateX(0)}100%{transform:translateX(-50%)}} .marquee-band{will-change:transform;}`}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36, padding: "0 16px" }}>
        <div style={{ fontSize: 9, letterSpacing: 7, color: G, opacity: 0.55, marginBottom: 14, fontFamily: "var(--font-ui)", fontWeight: 700 }}>ĐÁNH GIÁ / FEEDBACK</div>
        <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, letterSpacing: 1, margin: "0 0 14px", color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>Feedback Khách Hàng</h2>
        <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${G}55,transparent)`, margin: "0 auto 20px" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 99, padding: "5px 18px", backdropFilter: "blur(24px) saturate(160%)" }}>
          <span style={{ color: "#c9a84c", fontSize: 14 }}>{"★".repeat(Math.round(parseFloat(avgRating)))}</span>
          <span style={{ color: "#c9a84c", fontWeight: 800, fontSize: 13, fontFamily: "var(--font-ui)" }}>{avgRating}</span>
          <span style={{ color: MUT, fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 500 }}>· {total} đánh giá</span>
        </div>
      </div>

      {/* Dải băng */}
      <div style={{ position: "relative" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}>

        {/* Fade edges */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right,rgba(255,255,255,0.85),transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to left,rgba(255,255,255,0.85),transparent)", zIndex: 2, pointerEvents: "none" }} />

        <div className="marquee-band" style={{
          display: "flex", gap: 16,
          width: "max-content",
          animation: `marqueeRun ${dur}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}>
          {band.map((c, i) => (
            <div key={c.key + "_" + i} style={{
              width: isMobile ? 240 : 280,
              flexShrink: 0,
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(5,17,31,0.10)",
              borderRadius: 20,
              padding: "20px 22px 18px",
              display: "flex", flexDirection: "column", gap: 10,
              transition: "all .28s cubic-bezier(.34,1.56,.64,1)",
              backdropFilter: "blur(20px) saturate(130%)",
              WebkitBackdropFilter: "blur(20px) saturate(130%)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 20px rgba(5,17,31,0.08)",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(5,17,31,0.20)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(5,17,31,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(5,17,31,0.10)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 20px rgba(5,17,31,0.08)"; }}
            >
              {/* Stars */}
              <div>
                {Array.from({ length: 5 }).map((_, si) => (
                  <span key={si} style={{ color: si < c.rating ? "#c9a84c" : "rgba(255,255,255,0.15)", fontSize: 13 }}>★</span>
                ))}
              </div>

              {/* Text */}
              <div style={{
                color: G, fontSize: 12.5, lineHeight: 1.8, fontStyle: "italic",
                fontFamily: "var(--font-display)", fontWeight: 400,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 3, WebkitBoxOrient: "vertical", flex: 1,
                textShadow: "0 1px 2px rgba(13,27,42,0.06)",
              }}>
                "{c.text}"
              </div>

              {/* Footer */}
              <div style={{ paddingTop: 12, borderTop: `1px solid rgba(13,27,42,0.10)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: G, fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{c.userName}</div>
                  <div style={{ color: MUT, fontSize: 10, fontFamily: "var(--font-ui)", fontWeight: 500, marginTop: 2 }}>📷 {c.camera}</div>
                </div>
                <span style={{ background: G + "18", color: G, borderRadius: 99, padding: "2px 8px", fontSize: 9, fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: .5, whiteSpace: "nowrap" }}>ĐÃ THUÊ ✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerFeed({ photos }) {
  return <FeedbackMarquee photos={photos} feedbacks={[]} />;
}


// ── FEEDBACK MODAL (post-order rating — only for completed orders) ──
function FeedbackModal({ order, loggedUser, feedbacks, setFeedbacks, onClose }) {
  // Tìm feedback đã gửi cho đơn này — match bằng email (Google) hoặc phone
  const _normP = (p) => (p || "").replace(/[^0-9]/g, "");
  const _matchOwner = (f) =>
    (loggedUser?.email && f.email === loggedUser.email) ||
    (loggedUser?.phone && _normP(f.phone) === _normP(loggedUser.phone));
  const existingFb = feedbacks.find(f => f.orderId === order?.id && _matchOwner(f));
  // Cho phép edit nếu chưa admin xử lý (pending), không cho edit nếu đã approved/rejected
  const isEditing = !!existingFb && existingFb.status === "pending";
  const isLocked = !!existingFb && existingFb.status !== "pending";

  const [rating, setRating] = useState(existingFb?.rating || 5);
  const [text, setText] = useState(existingFb?.text || "");
  const [done, setDone] = useState(false);
  const [hovStar, setHovStar] = useState(0);

  const starLabels = ["", "Tệ 😞", "Tạm 😐", "Ổn 🙂", "Tốt 😊", "Xuất sắc 🤩"];

  const handleSubmit = () => {
    if (!loggedUser || !order) return;
    if (isEditing && existingFb) {
      // CẬP NHẬT feedback cũ (status → pending lại để admin duyệt lại)
      setFeedbacks(prev => prev.map(f =>
        f.id === existingFb.id
          ? { ...f, rating, text, images: f.images || [], date: todayStr(), status: "pending", hidden: false, seen: false }
          : f
      ));
    } else {
      // TẠO MỚI feedback
      const fb = {
        id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        orderId: order.id,
        cameraName: order.cameraName,
        rating,
        text,
        images: [],
        userName: loggedUser.displayName || loggedUser.name,
        phone: loggedUser.phone || "",
        email: loggedUser.email || "",
        date: todayStr(),
        status: "pending",
        hidden: false,
        seen: false,
      };
      setFeedbacks(prev => [fb, ...prev]);
    }
    setDone(true);
  };

  const inpS = { padding: "10px 13px", background: CARD, border: `1px solid ${BR}`, borderRadius: 12, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 22, padding: 32, width: "min(480px,96vw)", position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer" }}>✕</button>
        <Logo size={0.72} />

        {/* Đã được admin xử lý → không cho edit */}
        {isLocked ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{existingFb.status === "approved" ? "🌟" : "😔"}</div>
            <div style={{ color: G, fontSize: 17, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
              {existingFb.status === "approved" ? "Đánh giá đã được duyệt!" : "Đánh giá đã bị từ chối"}
            </div>
            <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500, lineHeight: 1.7 }}>
              {existingFb.status === "approved"
                ? "Đánh giá của bạn đang hiển thị trên trang chủ."
                : "Admin đã từ chối đánh giá này. Liên hệ Zalo nếu cần hỗ trợ."}
            </div>
            <button onClick={onClose} style={{ marginTop: 20, padding: "10px 32px", background: G, color: "#000", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đóng</button>
          </div>
        ) : done ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌟</div>
            <div style={{ color: G, fontSize: 18, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>{isEditing ? "Đã cập nhật đánh giá! 💛" : "Cảm ơn bạn! 💛"}</div>
            <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500, lineHeight: 1.7, marginBottom: 24 }}>Đánh giá đang chờ admin duyệt.<br />Cảm ơn bạn đã chia sẻ trải nghiệm! 💛</div>
            <button onClick={onClose} style={{ padding: "11px 36px", background: G, color: "#000", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đóng</button>
          </div>
        ) : (
          <>
            <div style={{ margin: "20px 0 24px" }}>
              <div style={{ fontSize: 15, color: TXT, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>
                {isEditing ? "✏️ Chỉnh sửa đánh giá" : "⭐ Đánh giá đơn thuê"}
              </div>
              <div style={{ fontSize: 11, color: MUT, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
                <span style={{ color: G }}>📷 {order?.cameraName}</span> · Mã đơn: <span style={{ color: "#777" }}>{order?.id}</span>
              </div>
            </div>

            {/* Star rating */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 10, fontFamily: "system-ui,sans-serif" }}>ĐÁNH GIÁ CHUNG</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHovStar(s)} onMouseLeave={() => setHovStar(0)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 34, color: s <= (hovStar || rating) ? G : BR, padding: 2, lineHeight: 1, transition: "all .1s", transform: s <= (hovStar || rating) ? "scale(1.15)" : "scale(1)" }}>★</button>
                ))}
                <span style={{ color: G, fontSize: 13, marginLeft: 8, fontFamily: "system-ui,sans-serif", fontWeight: 600, minWidth: 90 }}>{starLabels[hovStar || rating]}</span>
              </div>
            </div>

            {/* Text review */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 6, fontFamily: "system-ui,sans-serif" }}>NHẬN XÉT CỦA BẠN</div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Bạn cảm thấy thế nào? Máy có như kỳ vọng không? Dịch vụ ra sao?..."
                style={{ ...inpS, resize: "vertical", minHeight: 90, lineHeight: 1.6 }} />
            </div>

            <button onClick={handleSubmit}
              style={{ width: "100%", padding: 14, background: G, color: "#000", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 24px ${G}44` }}>
              {isEditing ? "✏️ Cập nhật đánh giá" : "🌟 Gửi đánh giá"}
            </button>
            <div style={{ color: "#333", fontSize: 11, textAlign: "center", marginTop: 10, fontFamily: "system-ui,sans-serif" }}>
              {isEditing ? "⚠️ Cập nhật sẽ gửi lại để admin duyệt" : "Nhận xét sẽ chờ admin duyệt trước khi công khai"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── CUSTOMER DASHBOARD PAGE ──
function CustomerPage({ loggedUser, setLoggedUser, orders, setOrders, feedbacks, setFeedbacks, cameras, onBack, onOpenBooking, users, setUsers }) {
  const [tab, setTab] = useState("dashboard");
  const [fbOrder, setFbOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const avatarRef = useRef();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Tự động refresh orders mỗi 30s khi đang xem tab đơn hàng ──
  const refreshOrders = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const fresh = await storageGet(STORE_KEYS.orders, true);
      if (fresh && Array.isArray(fresh)) {
        setOrders(prev => {
          // Merge: giữ trạng thái mới nhất từ Supabase, không mất đơn local chưa sync
          const freshIds = new Set(fresh.map(o => o.id));
          const localOnly = prev.filter(o => !freshIds.has(o.id));
          return [...localOnly, ...fresh];
        });
      }
    } catch {}
    if (!silent) setRefreshing(false);
  }, [setOrders]);

  useEffect(() => {
    if (tab !== "orders") return;
    refreshOrders(true); // fetch ngay khi vào tab
    const t = setInterval(() => refreshOrders(true), 30000); // poll 30s
    return () => clearInterval(t);
  }, [tab, refreshOrders]);

  // ── Settings state ──
  const [settingsForm, setSettingsForm] = useState({
    displayName: loggedUser?.displayName || loggedUser?.name || "",
    phone: loggedUser?.phone || "",
    zalo: loggedUser?.zalo || "",
    address: loggedUser?.address || "",
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSaveSettings = () => {
    const key = loggedUser.email || loggedUser.phone;
    const updated = {
      ...loggedUser,
      displayName: settingsForm.displayName || loggedUser.name,
      phone: settingsForm.phone,
      zalo: settingsForm.zalo,
      address: settingsForm.address,
    };
    setLoggedUser(updated);
    if (setUsers) {
      setUsers(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          displayName: settingsForm.displayName || loggedUser.name,
          phone: settingsForm.phone,
          zalo: settingsForm.zalo,
          address: settingsForm.address,
        }
      }));
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const normPhone = (p) => (p || "").replace(/[^0-9]/g, "");
  const myPhone = normPhone(loggedUser?.phone);
  const myEmail = (loggedUser?.email || "").toLowerCase();
  const myOrders = loggedUser ? orders.filter(o => {
    if (myEmail && (o.userEmail?.toLowerCase() === myEmail)) return true;
    if (myPhone && (normPhone(o.phone) === myPhone || normPhone(o.userPhone) === myPhone)) return true;
    return false;
  }) : [];
  const myFeedbacks = loggedUser ? feedbacks.filter(f => {
    if (myEmail && f.email === myEmail) return true;
    if (myPhone && normPhone(f.phone) === myPhone) return true;
    return false;
  }) : [];
  const totalSpent = myOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const totalDays = myOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.days || 0), 0);
  const usedCameras = [...new Set(myOrders.filter(o => o.status !== "cancelled").map(o => o.cameraName))];

  // Avatar upload handler
  const handleAvatarChange = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarLoading(true);
    try {
      const compressed = await compressImage(file, 300, 0.65);
      // Update loggedUser in memory
      const updated = { ...loggedUser, avatar: compressed };
      setLoggedUser(updated);
      // Persist avatar to users map
      if (setUsers) {
        const key = loggedUser.email || loggedUser.phone;
        setUsers(prev => ({
          ...prev,
          [key]: { ...(prev[key] || {}), avatar: compressed }
        }));
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  // Gamification badges
  const badges = [];
  const completedOrders = myOrders.filter(o => o.status === "completed");
  if (myOrders.length >= 1) badges.push({ icon: "🥉", label: "Khách Đồng", desc: "Đã thuê ít nhất 1 lần", col: "#cd7f32" });
  if (myOrders.length >= 3) badges.push({ icon: "🥈", label: "Khách Bạc", desc: "Đã thuê 3+ lần", col: "#aaa" });
  if (myOrders.length >= 5) badges.push({ icon: "🥇", label: "Khách Vàng", desc: "Đã thuê 5+ lần", col: G });
  if (totalDays >= 30) badges.push({ icon: "👑", label: "Đại Gia Khoảnh Khắc", desc: "Tổng 30+ ngày thuê", col: G });

  const filteredOrders = filterStatus === "all" ? myOrders : myOrders.filter(o => o.status === filterStatus);

  const tabStyle = (k) => ({
    padding: "12px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? G : "transparent"}`,
    color: tab === k ? G : MUT, fontWeight: tab === k ? 700 : 400, fontSize: 13, cursor: "pointer",
    fontFamily: "system-ui,sans-serif", transition: "all .2s", whiteSpace: "nowrap"
  });

  const orderStatusColor = { pending: "#60a5fa", confirmed: "#a78bfa", active: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

  const TABS = [
    ["dashboard", "⊞", "Dashboard"],
    ["orders",    "≡", "Đơn thuê"],
    ["feedbacks", "☆", "Feedback"],
    ["badges",    "◎", "Huy hiệu"],
    ["settings",  "✦", "Cài đặt"],
  ];
  const currentTab = TABS.find(([k]) => k === tab);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "system-ui,sans-serif", position: "relative", zIndex: 1 }}>
      <style>{`*{box-sizing:border-box;} @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes cMenuIn{0%{opacity:0;transform:translateY(-8px) scale(0.96)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>

      {/* Header */}
      {isMobile ? (
        /* ── MOBILE: pill góc trái + nút trang chủ góc phải ── */
        <>
        <div style={{ position: "fixed", top: 10, left: 12, zIndex: 200 }}>
          {/* Pill button */}
          <button
            onPointerDown={(e) => { e.preventDefault(); setMobileMenuOpen(o => !o); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: mobileMenuOpen ? `linear-gradient(135deg,${G}22,${G}11)` : "rgba(255,255,255,0.13)",
              border: `1px solid ${mobileMenuOpen ? G+"66" : "rgba(255,255,255,0.22)"}`,
              borderRadius: 50, padding: "8px 14px 8px 10px",
              backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              boxShadow: mobileMenuOpen
                ? `0 0 0 3px ${G}22, 0 8px 32px rgba(0,0,0,0.3)`
                : "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
              cursor: "pointer", transition: "all .22s", touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{currentTab?.[1]}</span>
            <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>{currentTab?.[2]}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, transition: "transform .22s", transform: mobileMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {mobileMenuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0,
              background: "linear-gradient(160deg, rgba(232,240,248,0.95) 0%, rgba(197,216,236,0.92) 60%, rgba(181,206,230,0.90) 100%)",
              border: "1px solid rgba(255,255,255,0.72)",
              borderRadius: 22,
              backdropFilter: "blur(40px) saturate(160%) brightness(1.04)", WebkitBackdropFilter: "blur(40px) saturate(160%) brightness(1.04)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.85) inset, 0 8px 32px rgba(13,27,42,0.14)",
              minWidth: 190, padding: "8px 0",
              animation: "cMenuIn .22s cubic-bezier(.4,0,.2,1)",
              zIndex: 201,
            }}>
              {TABS.map(([k, ico, label]) => (
                <button key={k}
                  onPointerDown={(e) => { e.preventDefault(); setTab(k); setMobileMenuOpen(false); }}
                  style={{
                    width: "100%", background: "none", border: "none",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 18px", cursor: "pointer",
                    borderLeft: `3px solid ${tab === k ? G : "transparent"}`,
                    transition: "all .15s", touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{ico}</span>
                  <span style={{ color: tab === k ? G : MUT, fontSize: 13, fontWeight: tab === k ? 700 : 400, fontFamily: "system-ui,sans-serif" }}>{label}</span>
                  {tab === k && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 8px ${G}66` }} />}
                </button>
              ))}
              {/* Divider */}
              <div style={{ height: 1, background: "rgba(13,27,42,0.10)", margin: "6px 14px" }} />
              {/* Trang chủ */}
              <button
                onPointerDown={(e) => { e.preventDefault(); onBack(); }}
                style={{
                  width: "100%", background: "none", border: "none",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 18px", cursor: "pointer",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center", color: MUT }}>←</span>
                <span style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500 }}>Trang chủ</span>
              </button>
            </div>
          )}

          {/* Backdrop để đóng menu */}
          {mobileMenuOpen && (
            <div
              onPointerDown={(e) => { e.preventDefault(); setMobileMenuOpen(false); }}
              style={{ position: "fixed", inset: 0, zIndex: -1 }}
            />
          )}
        </div>

        {/* Nút về trang chủ — góc trên phải */}
        <button
            onPointerDown={(e) => { e.preventDefault(); onBack(); }}
            style={{
              position: "fixed", top: 10, right: 12, zIndex: 200,
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.13)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 50, padding: "8px 14px",
              backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
              cursor: "pointer", touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}>
            <span style={{ color: MUT, fontSize: 13, lineHeight: 1 }}>←</span>
            <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>Trang chủ</span>
          </button>
        </>
      ) : (
        /* ── DESKTOP: sticky header như cũ ── */
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", borderBottom: `1px solid rgba(255,255,255,0.22)`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {TABS.map(([k, ico, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "16px 18px", background: "none", border: "none",
                borderBottom: `2.5px solid ${tab === k ? G : "transparent"}`,
                color: tab === k ? G : MUT,
                fontWeight: tab === k ? 700 : 400,
                fontSize: 13, cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                transition: "all .2s",
                display: "flex", alignItems: "center", gap: 7,
                whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: 14, opacity: tab === k ? 1 : 0.6 }}>{ico}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${BR}`, color: MUT, padding: "8px 16px", borderRadius: 12, cursor: "pointer", fontSize: 12, flexShrink: 0, marginLeft: 20, display: "flex", alignItems: "center", gap: 6, letterSpacing: 0.2 }}>← Trang chủ</button>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "64px 16px 32px" : "32px 24px" }}>

        {/* Profile banner */}
        <div style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:28, padding:"28px 20px 24px", marginBottom:20, textAlign:"center", position:"relative", overflow:"hidden", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
          {/* Subtle glow top-right */}
          <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, background:`radial-gradient(circle, ${G}0b 0%, transparent 70%)`, pointerEvents:"none" }} />

          {/* Avatar */}
          <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}
            onClick={() => avatarRef.current?.click()} title="Đổi ảnh đại diện">
            <div style={{ width:84, height:84, borderRadius:"50%", background:`radial-gradient(circle, ${G}22, rgba(255,255,255,0.10))`, border:`2.5px solid ${G}77`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, overflow:"hidden", cursor:"pointer", boxShadow:`0 0 0 5px ${G}14, 0 0 28px ${G}1a` }}>
              {(loggedUser?.avatar || loggedUser?.picture)
                ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ color:G, fontWeight:800, fontSize:34, fontFamily:"system-ui,sans-serif" }}>{loggedUser?.name?.[0]?.toUpperCase() || "?"}</span>}
            </div>
            <div style={{ position:"absolute", bottom:2, right:2, width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,${G},#a07030)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, border:`2px solid rgba(255,255,255,0.30)`, cursor:"pointer", boxShadow:`0 0 10px ${G}99` }}>
              {avatarLoading ? "⏳" : "📷"}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => { if (e.target.files[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
          </div>

          {/* Name */}
          <div style={{ color:G, fontWeight:800, fontSize:22, fontFamily:"system-ui,sans-serif", marginBottom:5, letterSpacing:0.2 }}>{loggedUser?.displayName || loggedUser?.name}</div>
          {/* Email / phone */}
          <div style={{ color:MUT, fontSize:12.5, fontFamily:"system-ui,sans-serif", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            <span style={{ fontSize:12 }}>✉</span><span>{loggedUser?.email || loggedUser?.phone}</span>
          </div>

          {/* Badges row */}
          {badges.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:7, marginBottom:18 }}>
              {badges.slice(-2).map((b, i, arr) => {
                const isActive = i === arr.length - 1;
                return (
                  <span key={b.label} style={{ background: isActive ? b.col+"1a" : "transparent", color: isActive ? b.col : "#4A4A4A", border:`1px solid ${isActive ? b.col+"55" : BR}`, borderRadius:99, padding:"5px 13px", fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif", display:"inline-flex", alignItems:"center", gap:5 }}>
                    <span>{b.icon}</span><span>{b.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Logout */}
          <button onClick={() => { setLoggedUser(null); onBack(); }}
            style={{ padding:"11px 28px", background:`linear-gradient(135deg,${G}22,${G}0d)`, border:`1px solid ${G}55`, color:G, borderRadius:16, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"system-ui,sans-serif", display:"inline-flex", alignItems:"center", gap:7, transition:"all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background=`${G}30`; e.currentTarget.style.boxShadow=`0 0 18px ${G}33`; }}
            onMouseLeave={e => { e.currentTarget.style.background=`linear-gradient(135deg,${G}22,${G}0d)`; e.currentTarget.style.boxShadow="none"; }}>
            <span>⇥</span><span>Đăng xuất</span>
          </button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div>
            {/* Stats 2×2 grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { icon:"📋", label:"Tổng đơn",      value: myOrders.length,        unit:"đơn",  col:G,         dot:G },
                { icon:"💰", label:"Đã chi tiêu",    value: fmtVND(totalSpent),     unit:"",     col:G,         dot:G },
                { icon:"📅", label:"Ngày thuê",      value: totalDays,              unit:"ngày", col:"#a78bfa", dot:"#a78bfa" },
                { icon:"✅", label:"Hoàn thành",     value: completedOrders.length, unit:"đơn",  col:"#22c55e", dot:"#22c55e" },
              ].map(s => (
                <div key={s.label} style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:24, padding:"18px 16px 16px", position:"relative", overflow:"hidden", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                  {/* Accent dot top-right */}
                  <div style={{ position:"absolute", top:14, right:14, width:7, height:7, borderRadius:"50%", background:s.dot, boxShadow:`0 0 8px ${s.dot}99` }} />
                  {/* Icon */}
                  <div style={{ fontSize:20, marginBottom:10, opacity:0.7 }}>{s.icon}</div>
                  {/* Value */}
                  <div style={{ color:s.col, fontWeight:800, fontSize: typeof s.value === "string" && s.value.length > 9 ? 16 : 26, fontFamily:"system-ui,sans-serif", lineHeight:1, marginBottom:6 }}>
                    {s.value}{s.unit && <span style={{ fontSize:12, color:MUT, fontWeight:500, marginLeft:4 }}>{s.unit}</span>}
                  </div>
                  {/* Label */}
                  <div style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif", fontWeight:600, letterSpacing:0.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Thiết bị đã thuê */}
            {usedCameras.length > 0 && (
              <div style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:24, padding:"18px 18px 16px", marginBottom:12, backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ color:MUT, fontSize:10, fontWeight:700, letterSpacing:1.5, fontFamily:"system-ui,sans-serif" }}>THIẾT BỊ ĐÃ THUÊ</span>
                  <button onClick={() => setTab("orders")} style={{ background:"none", border:"none", color:G, fontSize:11.5, fontWeight:700, cursor:"pointer", padding:0, fontFamily:"system-ui,sans-serif", display:"flex", alignItems:"center", gap:3 }}>
                    Xem tất cả <span>→</span>
                  </button>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {usedCameras.map(c => (
                    <span key={c} style={{ background:"rgba(255,255,255,0.18)", color:MUT, border:"1px solid rgba(255,255,255,0.30)", borderRadius:14, padding:"7px 13px", fontSize:12, fontFamily:"system-ui,sans-serif", display:"inline-flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13, opacity:0.6 }}>📷</span><span>{c}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unreviewed CTA */}
            {(() => {
              const unreviewed = completedOrders.filter(o => !feedbacks.some(f =>
                f.orderId === o.id && (
                  (myEmail && f.email === myEmail) ||
                  (myPhone && normPhone(f.phone) === myPhone)
                )
              ));
              return unreviewed.length > 0 && (
                <div style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:24, padding:"16px 18px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                  <div>
                    <div style={{ color:TXT, fontWeight:700, fontSize:14, fontFamily:"system-ui,sans-serif", marginBottom:3 }}>Bạn có {unreviewed.length} đơn chưa đánh giá</div>
                    <div style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>Chia sẻ trải nghiệm để nhận huy hiệu</div>
                  </div>
                  <button onClick={() => setTab("orders")}
                    style={{ flexShrink:0, padding:"10px 18px", background:`linear-gradient(135deg,${G},#a07830)`, color:"#000", border:"none", borderRadius:16, cursor:"pointer", fontWeight:800, fontSize:12, fontFamily:"system-ui,sans-serif", whiteSpace:"nowrap", boxShadow:`0 4px 16px ${G}33` }}>
                    Đánh giá →
                  </button>
                </div>
              );
            })()}

            {/* Book more CTA */}
            {onOpenBooking && (
              <button onClick={onOpenBooking}
                style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1.5px dashed rgba(255,255,255,0.30)", borderRadius:24, padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"all .2s", textAlign:"left", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.55)"; e.currentTarget.style.background="rgba(255,255,255,0.13)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.30)"; e.currentTarget.style.background="rgba(255,255,255,0.08)"; }}>
                <div style={{ width:40, height:40, borderRadius:16, border:`1.5px solid ${G}44`, display:"flex", alignItems:"center", justifyContent:"center", color:G, fontSize:20, flexShrink:0 }}>＋</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:G, fontWeight:700, fontSize:14, fontFamily:"system-ui,sans-serif", marginBottom:2 }}>Thuê thêm thiết bị</div>
                  <div style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>Khám phá thêm nhiều thiết bị chất lượng</div>
                </div>
                <span style={{ color:MUT, fontSize:18 }}>→</span>
              </button>
            )}
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ color: TXT, fontWeight: 700, fontSize: 17 }}>Đơn thuê của tôi</div>
              <button onClick={() => refreshOrders(false)} disabled={refreshing}
                style={{ padding: "6px 12px", background: "rgba(255,255,255,0.13)", color: refreshing ? MUT : G, border: `1px solid ${refreshing ? "rgba(255,255,255,0.22)" : G + "55"}`, borderRadius: 10, cursor: refreshing ? "default" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all .2s", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
                <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>🔄</span>
                {refreshing ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
            <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

            {/* Status filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {["all","pending","confirmed","active","completed","cancelled"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding: "7px 14px", background: filterStatus === s ? `${G}22` : "rgba(255,255,255,0.13)", color: filterStatus === s ? G : MUT, border: `1px solid ${filterStatus === s ? G + "55" : "rgba(255,255,255,0.22)"}`, borderRadius: 99, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: filterStatus === s ? 700 : 400, transition: "all .15s", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
                  {s === "all" ? "Tất cả" : (STATUS_CFG[s]?.label || s)}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: MUT }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14 }}>Chưa có đơn thuê nào</div>
                {onOpenBooking && <div className="btn-3d-wrap" style={{ marginTop: 16, borderRadius: 12 }}><button onClick={onOpenBooking} className="btn-3d" style={{ padding: "10px 24px", borderRadius: 10, fontSize: 12, letterSpacing: 2 }}>Gửi yêu cầu thuê</button></div>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredOrders.map(o => {
                  const _matchFb = (f) => f.orderId === o.id && (
                    (myEmail && f.email === myEmail) ||
                    (myPhone && normPhone(f.phone) === myPhone)
                  );
                  const hasFeedback = feedbacks.some(_matchFb);
                  const fbStatus = feedbacks.find(_matchFb)?.status;
                  const canFeedback = o.status === "completed"; // Luôn cho phép đánh giá đơn hoàn thành
                  return (
                    <div key={o.id} style={{ background:"rgba(255,255,255,0.13)", border:`1px solid ${o.status === "active" ? "#f59e0b44" : o.status === "completed" ? "#22c55e33" : "rgba(255,255,255,0.22)"}`, borderRadius:16, padding:"16px 20px", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: G, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{o.id}</span>
                            <Badge status={o.status} />
                          </div>
                          <div style={{ color: TXT, fontSize: 13, fontWeight: 600 }}>📷 {o.cameraName}</div>
                          <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>{o.date} · {fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ color: G, fontWeight: 800, fontSize: 16 }}>{fmtVND(o.total)}</div>
                        </div>
                      </div>
                      {/* Status progress for active orders */}
                      {o.status === "active" && (
                        <div style={{ background: "#FFF8ED", border: `1px solid #f59e0b22`, borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#f59e0b" }}>
                          🎬 Đang thuê · Nhớ giữ gìn thiết bị cẩn thận nhé!
                        </div>
                      )}
                      {/* Feedback actions */}
                      <div style={{ borderTop: `1px solid rgba(255,255,255,0.22)`, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {/* Nút sao chép — hiện cho MỌI trạng thái */}
                        <CopyOrderBtn copyFn={() => {
                          const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                          const fmtD = (ds) => new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
                          let pickTime = "", pickDate = "", dropTime = "", dropDate = "";
                          if (o.date && o.days) {
                            if (o.days === 0.5) {
                              pickTime = (o.session||o.shift) === "morning" ? "06:00" : (o.session||o.shift) === "afternoon" ? "14:00" : "--:--";
                              dropTime = (o.session||o.shift) === "morning" ? "12:00" : (o.session||o.shift) === "afternoon" ? "20:00" : "--:--";
                              pickDate = dropDate = fmtD(o.date);
                            } else {
                              pickTime = dropTime = "12:00";
                              pickDate = fmtD(o.date);
                              dropDate = fmtD(dateAddDays(o.date, o.days));
                            }
                          }
                          const statusLabels = { pending:"Chờ xác nhận", confirmed:"Đã xác nhận", active:"Đang thuê", completed:"Hoàn thành", cancelled:"Đã huỷ" };
                          const lines = [
                            "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `Mã đơn : ${o.id}`,
                            `📷 Máy  : ${o.cameraName}`,
                            `🎒 Phụ kiện: ${accList}`,
                            `📅 Ngày thuê: ${o.date}`,
                            `⏱ Thời gian: ${fmtDays(o.days, o.session || o.shift)}`,
                            pickDate ? `Giờ nhận : ${pickTime} · ${pickDate}` : null,
                            dropDate ? `Giờ trả  : ${dropTime} · ${dropDate}` : null,
                            o.discountCode ? `🏷️ Mã giảm giá: ${o.discountCode} (-${fmtVND(o.discountAmt || 0)})` : null,
                            `💰 Tổng tiền: ${fmtVND(o.total)}`,
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `👤 Tên   : ${o.name}`,
                            `📞 SĐT   : ${o.phone}`,
                            `📍 Địa chỉ: ${o.address || "—"}`,
                            o.note ? `💬 Ghi chú: ${o.note}` : null,
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `⏳ Trạng thái: ${statusLabels[o.status] || o.status}`,
                          ].filter(Boolean).join("\n");
                          navigator.clipboard?.writeText(lines).catch(() => {});
                        }} />
                        {canFeedback && !hasFeedback && (
                          <button onClick={() => setFbOrder(o)}
                            style={{ padding: "8px 20px", background: "#c9a84c", color: "#1a1200", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", boxShadow: "0 0 16px #c9a84c44" }}>
                            ⭐ Đánh giá
                          </button>
                        )}
                        {hasFeedback && fbStatus === "pending" && (
                          <button onClick={() => setFbOrder(o)}
                            style={{ padding: "8px 20px", background: "#FFF8ED", color: G, border: `1px solid ${G}55`, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                            ✏️ Sửa đánh giá
                          </button>
                        )}
                        {hasFeedback && fbStatus === "approved" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                            🌟 Đã được duyệt
                          </span>
                        )}
                        {hasFeedback && fbStatus === "rejected" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                            ✕ Bị từ chối
                          </span>
                        )}
                        {o.status === "pending" && (
                          <span style={{ color: MUT, fontSize: 11, display: "flex", alignItems: "center" }}>⏳ Đang chờ admin xác nhận</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FEEDBACKS TAB ── */}
        {tab === "feedbacks" && (
          <div>
            <div style={{ color: TXT, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Feedback của tôi</div>
            <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

            {myFeedbacks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: MUT }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                <div style={{ fontSize: 14, marginBottom: 6 }}>Chưa có đánh giá nào</div>
                <div style={{ fontSize: 12, color: "#444" }}>Hoàn thành đơn thuê để gửi đánh giá</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {myFeedbacks.map(f => {
                  return (
                  <div key={f.id} style={{ background:"rgba(255,255,255,0.13)", border:`1px solid ${f.status === "approved" ? "#22c55e44" : f.status === "rejected" ? "#ef444433" : "rgba(255,255,255,0.22)"}`, borderRadius:16, padding:"18px 20px", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ color: G, fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{"★".repeat(f.rating)}<span style={{ color: "#333" }}>{"★".repeat(5 - f.rating)}</span></div>
                        <div style={{ color: MUT, fontSize: 11 }}>📷 {f.cameraName} · {f.date}</div>
                      </div>
                      <span style={{
                        padding: "3px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: f.status === "approved" ? "#22c55e22" : f.status === "rejected" ? "#ef444422" : "#60a5fa22",
                        color: f.status === "approved" ? "#22c55e" : f.status === "rejected" ? "#ef4444" : "#60a5fa",
                        border: `1px solid ${f.status === "approved" ? "#22c55e44" : f.status === "rejected" ? "#ef444444" : "#60a5fa44"}`
                      }}>
                        {f.status === "approved" ? "✓ Đã duyệt" : f.status === "rejected" ? "✕ Từ chối" : "⏳ Chờ duyệt"}
                      </span>
                    </div>
                    {f.text && <div style={{ color: TXT, fontSize: 13, lineHeight: 1.6, marginBottom: 12, fontStyle: "italic" }}>"{f.text}"</div>}
                    {f.status === "approved" && !f.hidden && (
                      <div style={{ marginTop: 10, fontSize: 10, color: "#22c55e66", fontFamily: "system-ui,sans-serif" }}>✨ Đang hiển thị trên trang chủ</div>
                    )}
                    {f.status === "pending" && (
                      <div style={{ marginTop: 10, fontSize: 10, color: MUT, fontFamily: "system-ui,sans-serif" }}>
                        ✏️ Chờ admin duyệt · <button onClick={() => { const o = myOrders.find(ord => ord.id === f.orderId); if (o) setFbOrder(o); }} style={{ background: "none", border: "none", color: G, cursor: "pointer", fontSize: 10, fontFamily: "system-ui,sans-serif", padding: 0, fontWeight: 700, textDecoration: "underline" }}>Sửa đánh giá</button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {tab === "badges" && (
          <div>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <span style={{ fontSize:22 }}>🏅</span>
              <span style={{ color:TXT, fontWeight:800, fontSize:18, letterSpacing:0.5, fontFamily:"system-ui,sans-serif" }}>HUY HIỆU CỦA TÔI</span>
              <span style={{ color:`${G}55`, fontSize:14 }}>◇</span>
            </div>
            <div style={{ width:36, height:3, background:G, borderRadius:2, marginBottom:24 }} />

            {/* ── Badge horizontal scroll ── */}
            {(() => {
              const allBadges = [
                { icon:"🥉", label:"Khách Đồng",          desc:"Thuê ít nhất 1 lần",   col:"#cd7f32", unlocked: myOrders.length >= 1 },
                { icon:"🥈", label:"Khách Bạc",            desc:"Thuê 3+ lần",           col:"#b0b8c8", unlocked: myOrders.length >= 3 },
                { icon:"🥇", label:"Khách Vàng",           desc:"Thuê 5+ lần",           col:G,         unlocked: myOrders.length >= 5 },
                { icon:"👑", label:"Đại Gia Khoảnh Khắc", desc:"Tổng 30+ ngày",         col:G,         unlocked: totalDays >= 30 },
                { icon:"💎", label:"Khách VIP",            desc:"Chi tiêu 5,000,000đ+",  col:"#38bdf8", unlocked: totalSpent >= 5000000 },
                { icon:"💠", label:"Kim Cương",            desc:"Chi tiêu 10,000,000đ+", col:"#e879f9", unlocked: totalSpent >= 10000000 },
              ];
              const highestIdx = allBadges.reduce((hi, b, i) => b.unlocked ? i : hi, -1);
              return (
                <>
                  <style>{`
                    .badge-scroll::-webkit-scrollbar{display:none}
                    .badge-card{transition:transform .2s,box-shadow .2s}
                    .badge-card:active{transform:scale(0.97)}
                  `}</style>
                  <div className="badge-scroll" style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:6, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", margin:"0 -4px", padding:"4px 4px 16px" }}>
                    {allBadges.map((b, i) => {
                      const isTop = i === highestIdx;
                      return (
                        <div key={b.label} className="badge-card" style={{
                          minWidth:140, flexShrink:0,
                          scrollSnapAlign:"start",
                          background:"rgba(255,255,255,0.13)",
                          border:`1.5px solid ${isTop ? G+"cc" : b.unlocked ? b.col+"55" : "rgba(255,255,255,0.22)"}`,
                          borderRadius:28,
                          padding:"20px 14px 16px",
                          textAlign:"center",
                          position:"relative",
                          opacity: b.unlocked ? 1 : 0.45,
                          backdropFilter:"blur(52px) saturate(180%) brightness(1.04)",
                          WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)",
                          boxShadow: isTop ? `0 0 28px ${G}28, 0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset` : "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
                        }}>
                          {/* dot / lock */}
                          <div style={{ position:"absolute", top:12, right:12 }}>
                            {b.unlocked
                              ? <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px #22c55eaa" }} />
                              : <span style={{ fontSize:11, opacity:0.4 }}>🔒</span>}
                          </div>
                          {/* icon */}
                          <div style={{ fontSize:48, marginBottom:10, filter: b.unlocked ? "none" : "grayscale(1) brightness(0.55)", lineHeight:1 }}>{b.icon}</div>
                          {/* label */}
                          <div style={{ color: b.unlocked ? b.col : MUT, fontWeight:700, fontSize:13, fontFamily:"system-ui,sans-serif", marginBottom:5, lineHeight:1.3 }}>{b.label}</div>
                          {/* desc */}
                          <div style={{ color:MUT, fontSize:10.5, fontFamily:"system-ui,sans-serif", marginBottom:10, lineHeight:1.4 }}>{b.desc}</div>
                          {/* status */}
                          {b.unlocked
                            ? <div style={{ background:"#EEF9F4", border:"1px solid #22c55e33", borderRadius:12, padding:"5px 8px", display:"inline-flex", alignItems:"center", gap:4 }}>
                                <span style={{ color:"#22c55e", fontSize:10 }}>✓</span>
                                <span style={{ color:"#22c55e", fontSize:10, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>Đã mở</span>
                              </div>
                            : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* ── Stats grid 2×3 ── */}
            <div style={{ color:G, fontSize:10, letterSpacing:2, fontFamily:"system-ui,sans-serif", fontWeight:700, marginBottom:14, marginTop:8 }}>THỐNG KÊ CỦA BẠN</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
              {[
                { icon:"📋", label:"Tổng đơn",          value: myOrders.length,                                              unit:"đơn",     col:G },
                { icon:"📅", label:"Ngày thuê",          value: totalDays,                                                    unit:"ngày",    col:"#a78bfa" },
                { icon:"💰", label:"Chi tiêu",           value: fmtVND(totalSpent),                                           unit:"",        col:G },
                { icon:"✅", label:"Đơn hoàn thành",     value: myOrders.filter(o=>o.status==="completed").length,            unit:"đơn",     col:"#22c55e" },
                { icon:"💬", label:"Đánh giá",           value: myFeedbacks.filter(f=>f.status==="approved").length,          unit:"reviews", col:"#f59e0b" },
                { icon:"🏅", label:"Huy hiệu",           value: badges.length,                                                unit:"/ 6",     col:G },
              ].map(({ icon, label, value, unit, col }) => (
                <div key={label} style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:22, padding:"16px 16px 14px", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <span style={{ color:MUT, fontSize:10.5, fontFamily:"system-ui,sans-serif", fontWeight:600, letterSpacing:0.5 }}>{label}</span>
                  </div>
                  <div style={{ color:col, fontWeight:800, fontSize:22, fontFamily:"system-ui,sans-serif", lineHeight:1 }}>
                    {value}
                    {unit && <span style={{ fontSize:12, color:MUT, fontWeight:500, marginLeft:4 }}>{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div>
            <style>{`
              .sp-inp { transition: border-color .2s, box-shadow .2s !important; }
              .sp-inp:focus { border-color: rgba(201,168,76,0.65) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.1) !important; outline: none !important; }
              .sp-inp::placeholder { color: rgba(74,106,138,0.7) !important; }
              .sp-save:hover { box-shadow: 0 6px 28px rgba(201,168,76,0.4) !important; transform: translateY(-1px); }
              .sp-save { transition: all .2s ease !important; }
              .sp-upload:hover { border-color: rgba(201,168,76,0.6) !important; background: rgba(255,255,255,0.20) !important; }
            `}</style>

            <div style={{ color:TXT, fontWeight:800, fontSize:20, marginBottom:4, fontFamily:"system-ui,sans-serif" }}>Cài đặt hồ sơ</div>
            <div style={{ width:36, height:3, background:G, borderRadius:2, marginBottom:28 }} />

            {/* ── Avatar block ── */}
            <div style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:28, padding:"28px 20px 24px", textAlign:"center", marginBottom:14, backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
              <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}
                onClick={() => avatarRef.current?.click()} title="Đổi ảnh đại diện">
                <div style={{ width:96, height:96, borderRadius:"50%", background:`radial-gradient(circle, ${G}22, rgba(255,255,255,0.10))`, border:`3px solid ${G}88`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, overflow:"hidden", cursor:"pointer", boxShadow:`0 0 0 5px ${G}14, 0 0 32px ${G}18` }}>
                  {(loggedUser?.avatar || loggedUser?.picture)
                    ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ color:G, fontWeight:800, fontFamily:"system-ui,sans-serif" }}>{loggedUser?.name?.[0]?.toUpperCase() || "?"}</span>}
                </div>
                <div style={{ position:"absolute", bottom:2, right:2, width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${G},#a07030)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, border:`2.5px solid rgba(255,255,255,0.30)`, cursor:"pointer", boxShadow:`0 0 12px ${G}99` }}>
                  {avatarLoading ? "⏳" : "📷"}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e => { if (e.target.files[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
              </div>
              <div style={{ color:TXT, fontWeight:700, fontSize:15, marginBottom:4, fontFamily:"system-ui,sans-serif" }}>{loggedUser?.displayName || loggedUser?.name || "Chưa đặt tên"}</div>
              <div style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif", marginBottom:18 }}>{loggedUser?.email || loggedUser?.phone || ""}</div>
              {/* Upload zone */}
              <div className="sp-upload"
                onClick={() => avatarRef.current?.click()}
                style={{ border:`1.5px dashed ${G}44`, borderRadius:20, padding:"16px 12px", cursor:"pointer", transition:"all .2s" }}>
                <div style={{ fontSize:22, marginBottom:5 }}>☁️</div>
                <div style={{ color:G, fontWeight:600, fontSize:12, fontFamily:"system-ui,sans-serif", marginBottom:3 }}>Tải ảnh lên</div>
                <div style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif" }}>JPG, PNG – Tối đa 5MB</div>
              </div>
            </div>

            {/* ── Form fields ── */}
            <div style={{ background:"rgba(255,255,255,0.13)", border:`1px solid rgba(255,255,255,0.22)`, borderRadius:28, overflow:"hidden", marginBottom:14, backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
              {[
                { key:"displayName", icon:"👤", label:"Tên hiển thị",     hint:"Tự động điền khi đặt máy",         type:"text", placeholder:"Tên của bạn" },
                { key:"phone",       icon:"📞", label:"Số điện thoại",    hint:"Gửi thông tin đặt máy",            type:"tel",  placeholder:"0901 234 567" },
                { key:"zalo",        icon:"💬", label:"Zalo",             hint:"Xác nhận đơn qua Zalo",            type:"tel",  placeholder:"Số Zalo" },
                { key:"address",     icon:"📍", label:"Địa chỉ nhận máy", hint:"Tự động điền khi đặt máy",         type:"text", placeholder:"Số nhà, đường, phường..." },
              ].map(({ key, icon, label, hint, type, placeholder }, idx, arr) => (
                <div key={key} style={{ padding:"18px 20px", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.18)" : "none" }}>
                  {/* Label row */}
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                    <span style={{ fontSize:14, opacity:0.45 }}>{icon}</span>
                    <span style={{ color:MUT, fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>{label.toUpperCase()}</span>
                    <span style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif" }}>— {hint}</span>
                  </div>
                  {/* Input */}
                  <input className="sp-inp" type={type}
                    value={settingsForm[key]}
                    onChange={e => setSettingsForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.30)", borderRadius:16, color:TXT, fontSize:14, fontFamily:"system-ui,sans-serif", boxSizing:"border-box", caretColor:G }}
                  />
                </div>
              ))}

              {/* Google row */}
              <div style={{ padding:"18px 20px", borderTop:"1px solid rgba(255,255,255,0.18)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                  <span style={{ fontSize:14, opacity:0.45 }}>✉️</span>
                  <span style={{ color:MUT, fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>TÀI KHOẢN GOOGLE</span>
                </div>
                <input readOnly value={loggedUser?.email || ""}
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:16, color:MUT, fontSize:13, fontFamily:"system-ui,sans-serif", boxSizing:"border-box" }} />
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ color:"#22c55e", fontSize:13 }}>✅</span>
                  <span style={{ color:"#22c55e", fontSize:11, fontWeight:600, fontFamily:"system-ui,sans-serif" }}>Đã xác minh</span>
                </div>
              </div>

              {/* Save button */}
              <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,0.18)" }}>
                <button className="sp-save" onClick={handleSaveSettings}
                  style={{ width:"100%", padding:"15px 0", background: settingsSaved ? "#052" : `linear-gradient(135deg,#d4a93a,${G},#a07830)`, color: settingsSaved ? "#22c55e" : "#050300", border: settingsSaved ? "1px solid #22c55e44" : "none", borderRadius:20, cursor:"pointer", fontWeight:800, fontSize:15, fontFamily:"system-ui,sans-serif", letterSpacing:0.3, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: settingsSaved ? "none" : `0 4px 24px ${G}35` }}>
                  {settingsSaved ? <><span>✓</span><span>Đã lưu hồ sơ!</span></> : <><span>💾</span><span>Lưu cài đặt</span></>}
                </button>
                <div style={{ textAlign:"center", marginTop:10, color:MUT, fontSize:10.5, display:"flex", alignItems:"center", justifyContent:"center", gap:5, fontFamily:"system-ui,sans-serif" }}>
                  <span>🛡️</span><span>Thông tin của bạn được bảo mật tuyệt đối</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Feedback Modal */}
      {fbOrder && (
        <FeedbackModal
          order={fbOrder}
          loggedUser={loggedUser}
          feedbacks={feedbacks}
          setFeedbacks={setFeedbacks}
          onClose={() => setFbOrder(null)}
        />
      )}
    </div>
  );
}

// ── BOOKING CALENDAR (khách tự chọn ngày, thấy tình trạng máy) ──
function BookingCalendar({ selectedCams, orders, pickDate, setPickDate, days, selSession }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { y, m } = cur;

  const firstDow = new Date(y, m, 1).getDay();
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = new Date(y, m, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const todayDate = todayStr();

  const activeOrders = orders.filter(o => !["cancelled", "completed"].includes(o.status));

  // Tính trạng thái ngày theo spec 10 bước
  const getDayStatus = (day) => {
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if (ds < todayDate) return "past";

    // Chưa chọn session (chưa chọn loại thuê): check cả 2 ca, full nếu cả 2 hết
    if (!selSession) {
      const results = ["morning", "afternoon"].map(sh => {
        let anyFull = false, anyLow = false;
        selectedCams.forEach(({ id, qty: need, camQty }) => {
          const avail = getAvailQty(id, camQty, activeOrders, ds, sh);
          if (avail < need) anyFull = true;
          else if (avail <= 1 && camQty > 1) anyLow = true;
        });
        return anyFull ? "full" : anyLow ? "low" : "ok";
      });
      if (results.every(r => r === "full")) return "full";
      if (results.some(r => r === "full")) return "low";
      if (results.some(r => r === "low")) return "low";
      return "ok";
    }

    // Đã có session: check đúng theo session đó
    let anyFull = false, anyLow = false;
    selectedCams.forEach(({ id, qty: need, camQty }) => {
      const avail = getAvailQty(id, camQty, activeOrders, ds, selSession);
      if (avail < need) anyFull = true;
      else if (avail <= 1 && camQty > 1) anyLow = true;
    });
    if (anyFull) return "full";
    if (anyLow) return "low";
    return "ok";
  };

  // Range highlight
  const endDs = pickDate && days ? dateAddDays(pickDate, days) : null;
  const getInRange = (day) => {
    if (!pickDate || !days) return false;
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    // dùng < endDs (strict) để ngày trả máy không bị tô màu "trong range"
    return ds > pickDate && ds < endDs;
  };
  const getIsEnd = (day) => {
    if (!endDs || days === 0.5) return false;
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return ds === endDs;
  };

  // Kiểm tra toàn bộ range có ngày nào bị "full" không (kể cả pickDate)
  const rangeConflictDates = (() => {
    if (!pickDate || days <= 0) return [];
    const conflicts = [];
    for (let i = 0; i < Math.ceil(days); i++) {
      const ds = dateAddDays(pickDate, i);
      let isFull = false;
      selectedCams.forEach(({ id, qty: need, camQty }) => {
        const avail = getAvailQty(id, camQty, activeOrders, ds, selSession || "full");
        if (avail < need) isFull = true;
      });
      if (isFull) conflicts.push(ds);
    }
    return conflicts;
  })();
  const rangeHasConflict = rangeConflictDates.length > 0;

  const statusStyle = (st, isStart, isInRange, isEnd, isRangeConflict) => {
    if (st === "past") return { bg:"transparent", border:"transparent", color:"#333", cursor:"default", shadow:"none", fw:400 };
    if (st === "full") return { bg:"#fee2e2", border:"#ef444466", color:"#b91c1c", cursor:"not-allowed", shadow:"none", fw:400 };
    if (isStart) return { bg:G+"33", border: rangeHasConflict ? "#cc3333" : G, color: rangeHasConflict ? "#e87878" : G, cursor:"pointer", shadow: rangeHasConflict ? `0 0 0 2px #cc333344` : `0 0 0 2px ${G}55, 0 0 16px ${G}44`, fw:800 };
    if (isEnd)   return { bg:G+"22", border:G+"bb", color:G, cursor:"default", shadow:`0 0 0 1px ${G}44, 0 0 10px ${G}33`, fw:700 };
    if (isRangeConflict) return { bg:"#fee2e2", border:"#ef444466", color:"#b91c1c", cursor:"not-allowed", shadow:"none", fw:600 };
    if (isInRange) return { bg:"#fef3c7", border:G+"55", color:G+"cc", cursor:"pointer", shadow:"none", fw:500 };
    if (st === "low") return { bg:"#fef3c7", border:"#f59e0b88", color:"#b45309", cursor:"pointer", shadow:"none", fw:400 };
    return { bg:"rgba(255,255,255,0.45)", border:"rgba(255,255,255,0.65)", color:TXT, cursor:"pointer", shadow:"none", fw:400 };
  };

  // Guard: tránh click khi user đang scroll trên mobile
  const touchMoved = useRef(false);
  const touchOrigin = useRef({ x: 0, y: 0 });

  const handleClick = (day, st, isRangeConflict, isEnd) => {
    if (touchMoved.current) return;
    // Chặn: quá khứ, hết hàng, trong range bị conflict, hoặc ngày trả máy (isEnd)
    if (st === "past" || st === "full" || isRangeConflict || isEnd) return;
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if (ds === pickDate) { setPickDate(""); return; }
    setPickDate(ds);
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const navBtn = { background:"rgba(255,255,255,0.45)", border:"1px solid rgba(255,255,255,0.65)", color:MUT, width:28, height:28, borderRadius:10, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" };

  return (
    <div style={{ background:"rgba(255,255,255,0.40)", border:"1px solid rgba(255,255,255,0.62)", borderRadius:14, padding:"14px 12px", marginBottom:14, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button style={navBtn} onClick={() => setCur(p => { const d = new Date(p.y, p.m-1,1); return {y:d.getFullYear(),m:d.getMonth()}; })}>◀</button>
        <span style={{ color:TXT, fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>{monthLabel}</span>
        <button style={navBtn} onClick={() => setCur(p => { const d = new Date(p.y, p.m+1,1); return {y:d.getFullYear(),m:d.getMonth()}; })}>▶</button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
        {["T2","T3","T4","T5","T6","T7","CN"].map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:9, color:"#555", padding:"3px 0", fontFamily:"system-ui,sans-serif" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}
        onTouchStart={e => { touchMoved.current = false; touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchMove={e => { const dx = e.touches[0].clientX - touchOrigin.current.x; const dy = e.touches[0].clientY - touchOrigin.current.y; if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchMoved.current = true; }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const st = selectedCams.length ? getDayStatus(day) : (ds => ds < todayDate ? "past" : "ok")(`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
          const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isStart = ds === pickDate;
          const isEnd = getIsEnd(day);
          const isInRange = getInRange(day);
          const isRangeConflict = !isStart && isInRange && rangeConflictDates.includes(ds);
          const { bg, border, color, cursor, shadow, fw } = statusStyle(st, isStart, isInRange, isEnd, isRangeConflict);
          const isToday = ds === todayDate;
          return (
            <div key={day} onClick={() => handleClick(day, st, isRangeConflict, isEnd)}
              style={{ textAlign:"center", padding:"6px 2px", borderRadius:5, background:bg, border:`1px solid ${border}`, color, cursor, fontSize:11, fontFamily:"system-ui,sans-serif", fontWeight: (isStart||isEnd||isInRange) ? fw : (isToday ? 700 : 400), position:"relative", transition:"all .1s", userSelect:"none", boxShadow: shadow }}>
              {day}
              {isToday && !isStart && !isEnd && <div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:3, height:3, borderRadius:"50%", background:G }} />}
              {(st === "full" || isRangeConflict) && <div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", fontSize:6, color:"#cc3333" }}>✕</div>}
              {isStart && <div style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)", fontSize:7, color: rangeHasConflict ? "#cc3333" : G, fontWeight:700 }}>▶</div>}
              {isEnd && !rangeHasConflict && <div style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)", fontSize:7, color:G, fontWeight:700 }}>◀</div>}
            </div>
          );
        })}
      </div>

      {/* Range conflict warning */}
      {rangeHasConflict && (
        <div style={{ marginTop:10, padding:"9px 12px", background:"#FEF0F0", border:"1px solid #B0282844", borderRadius:12, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>⚠️</span>
          <span style={{ color:"#ef4444", fontSize:11, fontFamily:"system-ui,sans-serif" }}>
            Máy hết vào ngày <strong>{rangeConflictDates.map(d => d.split("-")[2]+"/"+d.split("-")[1]).join(", ")}</strong> trong khoảng thuê này — vui lòng chọn ngày khác.
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
        {[
          ["rgba(255,255,255,0.70)","rgba(0,0,0,0.20)",TXT,"Trống"],
          ["#fef3c7","#f59e0b99","#b45309","Còn ít"],
          ["#fee2e2","#ef444499","#b91c1c","Hết máy"],
          [G+"44",G,G,"Đang chọn"]
        ].map(([bg,bd,col,lbl])=>(
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:bg, border:`1px solid ${bd}` }} />
            <span style={{ color:MUT, fontSize:9, fontFamily:"system-ui,sans-serif" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STABLE components — defined OUTSIDE BookingModal to avoid remount-on-render lag ──
const BK_flatInp = {
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.70)",
  borderRadius: 16,
  outline: "none",
  color: TXT,
  fontSize: 15,
  fontFamily: "system-ui,sans-serif",
  width: "100%",
  padding: "12px 14px",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  transition: "border-color .2s, box-shadow .2s",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

function BK_IconBox({ children }) {
  return <span style={{ fontSize: 14, opacity: 0.45, lineHeight: 1 }}>{children}</span>;
}

function BK_FormRow({ icon, labelTop, labelBottom, children, noBorder }) {
  return (
    <div style={{ paddingBottom: noBorder ? 0 : 18, borderBottom: noBorder ? "none" : "1px solid rgba(0,0,0,0.08)", marginBottom: noBorder ? 0 : 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <BK_IconBox>{icon}</BK_IconBox>}
        <span style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>{labelTop}</span>
        {labelBottom && <span style={{ color: "#555", fontSize: 10, fontFamily: "system-ui,sans-serif", marginLeft: 4 }}>{labelBottom}</span>}
      </div>
      {children}
    </div>
  );
}

function BookingModal({ cameras, accessories, siteContent, discounts, setDiscounts, onClose, onSubmit, loggedUser, preselectedCamId, orders }) {
  const [step, setStep] = useState(1);
  const [expandedCam, setExpandedCam] = useState(null);
  // selCams: { [camId]: qty }
  const [selCams, setSelCams] = useState(() => preselectedCamId ? { [preselectedCamId]: 1 } : {});
  const [selDur, setSelDur] = useState(null);
  const [customDays, setCustomDays] = useState("");
  const [pickDate, setPickDate] = useState(todayStr());
  // selAcc: { [accName]: qty }
  const [selAcc, setSelAcc] = useState({});
  const [info, setInfo] = useState({ name: loggedUser?.displayName || loggedUser?.name || "", phone: loggedUser?.phone || "", zalo: loggedUser?.zalo || loggedUser?.phone || "", address: loggedUser?.address || "", note: "" });
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ── Discount state ──
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { code, type, value, discountAmt }
  const [discountMsg, setDiscountMsg] = useState(null); // { type: "ok"|"err", text }
  const [discountExpanded, setDiscountExpanded] = useState(false);

  const days = selDur ? selDur.days : (parseInt(customDays) || 0);
  // session: lấy từ selDur nếu có, custom days luôn là "full"
  const selSession = selDur ? selDur.session : (days >= 1 ? "full" : null);

  // Auto-clamp số lượng máy khi đổi ngày/ca ở bước 2 — check TOÀN BỘ khoảng ngày
  useEffect(() => {
    if (!pickDate || !days || !selSession) return;
    const activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));
    const sess = selSession || "full";
    const dateRange = [];
    if (days < 1) { dateRange.push(pickDate); }
    else { for (let i = 0; i < Math.ceil(days); i++) dateRange.push(dateAddDays(pickDate, i)); }
    setSelCams(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(camId => {
        const cam = cameras.find(c => c.id === Number(camId) || c.id === camId);
        if (!cam) return;
        const minAvail = Math.min(...dateRange.map(d => getAvailQty(cam.id, cam.qty || 1, activeOrds, d, sess)));
        if (minAvail <= 0) { delete next[camId]; changed = true; }
        else if (next[camId] > minAvail) { next[camId] = minAvail; changed = true; }
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickDate, selSession, days]);

  // Auto-bỏ chọn phụ kiện hết kho khi đổi ngày / ca — check TOÀN BỘ khoảng ngày
  useEffect(() => {
    if (!pickDate || !days) return;
    const activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));
    const sess = selSession || "full";
    // Build danh sách ngày cần check (giống logic nút tiếp tục)
    const dateRange = [];
    if (days < 1) { dateRange.push(pickDate); }
    else { for (let i = 0; i < Math.ceil(days); i++) dateRange.push(dateAddDays(pickDate, i)); }
    setSelAcc(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(name => {
        const acc = accessories.find(a => a.name === name);
        if (!acc) return;
        // Lấy min tồn kho qua toàn bộ ngày trong range
        const minAvail = Math.min(...dateRange.map(d => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
        if (minAvail <= 0) { delete next[name]; changed = true; }
        else if (next[name] > minAvail) { next[name] = minAvail; changed = true; }
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickDate, selSession, days]);

  const availCams = cameras.filter(c => c.status === "available");
  const selectedCamList = availCams.filter(c => selCams[c.id] > 0);
  const totalCamSelected = Object.values(selCams).reduce((s, q) => s + (q || 0), 0);

  const camCost = selectedCamList.reduce((s, c) => s + c.price * (selCams[c.id] || 0) * days, 0);
  const accCost = Object.entries(selAcc).reduce((s, [name, qty]) => {
    const a = accessories.find(x => x.name === name);
    if (!a) return s;
    const unitPrice = days === 0.5 ? (a.priceShift != null ? a.priceShift : Math.round(a.price / 2)) : a.price;
    const multiplier = days === 0.5 ? 1 : days;
    return s + unitPrice * qty * multiplier;
  }, 0);
  const subtotal = camCost + accCost;

  // Re-check minOrder mỗi khi subtotal thay đổi: nếu giỏ hàng giảm xuống dưới minOrder thì huỷ discount
  useEffect(() => {
    if (!appliedDiscount) return;
    const disc = (Array.isArray(discounts) ? discounts : []).find(d => d.id === appliedDiscount.id);
    if (disc?.minOrder && subtotal < disc.minOrder) {
      setAppliedDiscount(null);
      setDiscountCode("");
      setDiscountMsg({ type: "err", text: `Đơn giảm xuống dưới ${fmtVND(disc.minOrder)} — mã giảm giá đã bị huỷ` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discountAmt = appliedDiscount
    ? Math.min(
        appliedDiscount.type === "percent"
          ? Math.round(subtotal * appliedDiscount.value / 100)
          : appliedDiscount.discountAmt,
        subtotal
      )
    : 0;
  const total = Math.max(0, subtotal - discountAmt);

  const applyDiscount = () => {
    setDiscountMsg(null);
    const code = discountCode.trim().toUpperCase();
    if (!code) { setDiscountMsg({ type: "err", text: "Nhập mã giảm giá trước" }); return; }
    const allDiscs = Array.isArray(discounts) ? discounts : [];
    if (allDiscs.length === 0) { setDiscountMsg({ type: "err", text: "Chưa có mã nào. Admin tạo mã trong dashboard trước" }); return; }
    const disc = allDiscs.find(d => d.code.toUpperCase() === code && d.active === true);
    if (!disc) { setDiscountMsg({ type: "err", text: "Mã không tồn tại hoặc đã bị tắt" }); return; }
    if (disc.maxUse && disc.usedCount >= disc.maxUse) { setDiscountMsg({ type: "err", text: "Mã này đã dùng hết số lượt" }); return; }
    if (disc.minOrder && subtotal < disc.minOrder) { setDiscountMsg({ type: "err", text: `Đơn tối thiểu ${fmtVND(disc.minOrder)} mới được áp dụng` }); return; }
    // ── Badge check ──
    if (disc.requiredBadge && disc.requiredBadge !== "none") {
      const userOrders = (Array.isArray(orders) ? orders : []).filter(o =>
        (loggedUser?.email && o.userEmail === loggedUser.email) ||
        (loggedUser?.phone && o.userPhone === loggedUser.phone) ||
        (info.phone && o.phone === info.phone)
      );
      const totalDaysUser = userOrders.reduce((s, o) => s + (o.days || 0), 0);
      const totalSpentUser = userOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
      const orderCount = userOrders.length;
      const hasDong = orderCount >= 1;
      const hasBac = orderCount >= 3;
      const hasVang = orderCount >= 5;
      const hasDaiGia = totalDaysUser >= 30;
      const hasVip = totalSpentUser >= 5000000;
      const hasKimCuong = totalSpentUser >= 10000000;
      const badgeMap = { dong: hasDong, bac: hasBac, vang: hasVang, daigiadagia: hasDaiGia, vip: hasVip, kimcuong: hasKimCuong };
      const badgeName = { dong: "🥉 Khách Đồng (cần 1+ đơn)", bac: "🥈 Khách Bạc (cần 3+ đơn)", vang: "🥇 Khách Vàng (cần 5+ đơn)", daigiadagia: "👑 Đại Gia (cần 30+ ngày thuê)", vip: "💎 Khách VIP (cần chi 5,000,000đ+)", kimcuong: "💠 Kim Cương (cần chi 10,000,000đ+)" };
      if (!badgeMap[disc.requiredBadge]) {
        setDiscountMsg({ type: "err", text: `🏅 Mã này chỉ dành cho ${badgeName[disc.requiredBadge]}. Hãy thuê thêm để mở khoá!` });
        return;
      }
    }
    const amt = disc.type === "percent" ? Math.round(subtotal * disc.value / 100) : disc.value;
    setAppliedDiscount({ code: disc.code, type: disc.type, value: disc.value, discountAmt: amt, id: disc.id });
    setDiscountMsg({ type: "ok", text: `Áp dụng thành công! Giảm ${disc.type === "percent" ? disc.value + "%" : fmtVND(disc.value)}` });
  };

  const removeDiscount = () => { setAppliedDiscount(null); setDiscountCode(""); setDiscountMsg(null); };

  const endDate = () => { if (!pickDate || !days) return ""; return new Date(dateAddDays(pickDate, days) + "T00:00:00").toLocaleDateString("vi-VN"); };

  // Thông tin trả máy — 1 ngày = 24h tính từ lúc nhận
  const returnInfo = () => {
    if (!pickDate || !days) return null;
    const fmtDate = (ds) => new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });

    if (days === 0.5) {
      const isM = selSession === "morning";
      const isA = selSession === "afternoon";
      return {
        pickTime:  isM ? "06:00" : isA ? "14:00" : "--:--",
        pickDate:  fmtDate(pickDate),
        dropTime:  isM ? "12:00" : isA ? "20:00" : "--:--",
        dropDate:  fmtDate(pickDate),
        totalH:    6,
        totalLabel:"6 giờ (1 buổi)",
      };
    }

    const totalH = Math.ceil(days) * 24;
    const endDs  = dateAddDays(pickDate, days);
    return {
      pickTime:  "12:00",
      pickDate:  fmtDate(pickDate),
      dropTime:  "12:00",
      dropDate:  fmtDate(endDs),
      totalH,
      totalLabel:`${totalH} giờ (${Math.ceil(days)} ngày)`,
    };
  };

  const toggleCam = (cam) => {
    setSelCams(p => {
      const cur = p[cam.id] || 0;
      if (cur > 0) { const n = { ...p }; delete n[cam.id]; return n; }
      return { ...p, [cam.id]: 1 };
    });
  };
  const setCamQty = (camId, qty, maxQty) => {
    const q = Math.max(0, Math.min(maxQty, parseInt(qty) || 0));
    setSelCams(p => { if (q === 0) { const n = { ...p }; delete n[camId]; return n; } return { ...p, [camId]: q }; });
  };

  const toggleAcc = (name) => {
    setSelAcc(p => {
      if (p[name]) { const n = { ...p }; delete n[name]; return n; }
      return { ...p, [name]: 1 };
    });
  };
  const setAccQty = (name, qty, maxQty = 999) => {
    const q = Math.max(0, Math.min(maxQty, parseInt(qty) || 0));
    setSelAcc(p => { if (q === 0) { const n = { ...p }; delete n[name]; return n; } return { ...p, [name]: q }; });
  };

  const [submitError, setSubmitError] = useState(null);

  const handleFinish = () => {
    // ── Validate kho toàn bộ range tại thời điểm submit (chống race condition) ──
    const activeOrds = orders.filter(o => !["cancelled", "completed"].includes(o.status));
    const sess = selSession || "full";
    const submitDateRange = [];
    if (days < 1) { submitDateRange.push(pickDate); }
    else { for (let i = 0; i < Math.ceil(days); i++) submitDateRange.push(dateAddDays(pickDate, i)); }
    for (const cam of selectedCamList) {
      const need = selCams[cam.id] || 1;
      const minAvail = Math.min(...submitDateRange.map(d => getAvailQty(cam.id, cam.qty || 1, activeOrds, d, sess)));
      if (minAvail < need) {
        setSubmitError(`❌ "${cam.name}" đã hết trong khoảng thời gian này (còn ${minAvail}). Vui lòng quay lại chọn ngày khác.`);
        return;
      }
    }
    for (const [name, qty] of Object.entries(selAcc)) {
      if (!qty || qty <= 0) continue;
      const acc = accessories.find(a => a.name === name);
      if (!acc) continue;
      const minAvail = Math.min(...submitDateRange.map(d => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
      if (minAvail < qty) {
        setSubmitError(`❌ Phụ kiện "${name}" đã hết trong khoảng thời gian này (còn ${minAvail}). Vui lòng quay lại điều chỉnh.`);
        return;
      }
    }
    setSubmitError(null);

    const id = newOrderId(orders);
    setOrderId(id);
    const camNames = selectedCamList.map(c => `${c.name}${selCams[c.id] > 1 ? ` x${selCams[c.id]}` : ""}`).join(", ");
    const accNames = Object.entries(selAcc).map(([n, q]) => q > 1 ? `${n} x${q}` : n);
    const firstCam = selectedCamList[0];
    onSubmit({
      id,
      cameraName: camNames,
      cameraId: firstCam?.id,
      cameras: selectedCamList.map(c => ({ id: c.id, name: c.name, qty: selCams[c.id], price: c.price })),
      accessories: accNames,
      accessoriesDetail: Object.entries(selAcc).map(([name, qty]) => ({ name, qty })),
      days, subtotal, discountCode: appliedDiscount?.code || null, discountAmt, total,
      session: selSession || "full",
      shift: days === 0.5 ? selSession : null, // backward compat
      // BUG5 FIX: thêm createdAt để admin sort đơn theo thứ tự tạo thực tế
      createdAt: new Date().toISOString(),
      ...info, status: "pending", date: pickDate, seen: false, userPhone: loggedUser?.phone || info.phone, userEmail: loggedUser?.email || ""
    });
    // ── Tăng usedCount cho discount đã dùng ──
    if (appliedDiscount?.id) {
      setDiscounts(prev => prev.map(d =>
        d.id === appliedDiscount.id
          ? { ...d, usedCount: (d.usedCount || 0) + 1 }
          : d
      ));
    }
    setDone(true);
  };

  const overlay = { position: "fixed", inset: 0, zIndex: 300, background: "rgba(8,15,26,0.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", overflowY: "auto", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" };
  const box = { background: "linear-gradient(160deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 60%, rgba(181,206,230,0.76) 100%)", border: "1px solid rgba(255,255,255,0.60)", borderRadius: 20, padding: "min(20px, 3vw)", width: "min(660px,96vw)", position: "relative", margin: "auto", transition: "width .3s", backdropFilter: "blur(28px) saturate(160%) brightness(1.04)", WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)", boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.30), 0 2px 16px rgba(0,0,0,0.16)" };
  const inpS = { padding: "11px 14px", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.70)", borderRadius: 12, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif", transition: "border .2s", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };
  const qtyBtn = (onClick, label) => (
    <button onClick={onClick} style={{ width: 26, height: 26, border: "1px solid rgba(255,255,255,0.65)", borderRadius: 5, background: "rgba(255,255,255,0.50)", color: TXT, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "monospace" }}>{label}</button>
  );

  const stepLabel = ["Chọn thiết bị", "Thời gian & phụ kiện", "Thông tin đặt"];

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && !done && onClose()}>
      <div style={box}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        <div style={{ marginBottom: 24 }}>
          {/* Logo — góc trái */}
          <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: 4 }}>
            <Logo size={0.72} />
          </div>
          {!done && (
            /* Step 1-2-3 — chia đều 3 phần bằng flex */
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 22, width: "100%" }}>
              {stepLabel.map((l, i) => {
                const active = step === i + 1;
                const done_ = step > i + 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: active ? G : done_ ? G + "33" : "transparent",
                        border: `2px solid ${active || done_ ? G : "#333"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all .3s", flexShrink: 0
                      }}>
                        {done_
                          ? <span style={{ color: G, fontSize: 13, fontWeight: 900 }}>✓</span>
                          : <span style={{ color: active ? "#000" : "#555", fontSize: 12, fontWeight: 800, fontFamily: "system-ui,sans-serif" }}>{i + 1}</span>
                        }
                      </div>
                      <div style={{ fontSize: 8, color: active ? G : done_ ? G + "88" : "#444", fontFamily: "system-ui,sans-serif", letterSpacing: 0.8, marginTop: 6, textAlign: "center", fontWeight: active ? 700 : 400, lineHeight: 1.3 }}>
                        {l.toUpperCase()}
                      </div>
                    </div>
                    {i < stepLabel.length - 1 && (
                      <div style={{ width: 28, flexShrink: 0, height: 1, background: step > i + 1 ? G + "66" : "#222", marginBottom: 22, transition: "all .3s" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 1 — chọn nhiều máy */}
        {!done && step === 1 && (() => {
          // Tag map theo tên máy
          const CAM_TAGS = {
            "Fujifilm X-T20":   ["Mirrorless","24MP","4K","Film Simulation"],
            "Sony ZV-E10":      ["Vlog","4K","APS-C"],
            "DJI Pocket 3":     ["Gimbal","4K","Chống rung"],
            "Canon EOS M50 II": ["Mirrorless","4K","WiFi"],
            "GoPro Hero 12":    ["Action Cam","5.3K","Chống nước"],
            "Nikon Z30":        ["Mirrorless","4K","60fps"],
          };
          const CAM_DETAIL = {
            "Fujifilm X-T20":   ["Nhỏ gọn • Màu film đẹp • Dễ sử dụng","Phù hợp: du lịch, street, chân dung"],
            "Sony ZV-E10":      ["Màn lật 180° • Quay vlog chuyên nghiệp","Phù hợp: vlog, review, du lịch"],
            "DJI Pocket 3":     ["Gimbal tích hợp • Chống rung xuất sắc","Phù hợp: vlog, travel, cinematic"],
            "Canon EOS M50 II": ["Lấy nét nhanh • Video 4K mượt","Phù hợp: vlog, sự kiện, chụp ảnh"],
            "GoPro Hero 12":    ["Chống nước 10m • Quay 5.3K siêu nét","Phù hợp: thể thao, du lịch, phượt"],
            "Nikon Z30":        ["Nhẹ • 4K 60fps • Lên màu đẹp","Phù hợp: vlog, sáng tạo nội dung"],
          };
          const CAM_POPULAR = ["Fujifilm X-T20"];
          const [showAllAcc, setShowAllAcc_local] = [false, () => {}];

          return (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ color: TXT, fontWeight: 700, fontSize: 18, letterSpacing: 0.3 }}>Chọn thiết bị</div>
                  <div style={{ color: MUT, fontSize: 12, marginTop: 3, fontFamily: "system-ui,sans-serif" }}>Chọn máy ảnh / phụ kiện bạn muốn thuê</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {totalCamSelected > 0 && (
                    <span style={{ background: G + "22", color: G, border: `1px solid ${G}44`, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                      ✓ {totalCamSelected} máy
                    </span>
                  )}
                  <button onClick={() => selectedCamList.length > 0 && setStep(2)}
                    style={{ padding: "7px 12px", background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.65)", borderRadius: 12, color: selectedCamList.length > 0 ? MUT : "#444", fontSize: 11, cursor: selectedCamList.length > 0 ? "pointer" : "not-allowed", fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                    ⊞ Xem tất cả phụ kiện
                  </button>
                </div>
              </div>

              {/* Camera list — 2 cột */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {availCams.map(c => {
                  const isSelected = (selCams[c.id] || 0) > 0;
                  const tags = CAM_TAGS[c.name] || [];
                  const details = CAM_DETAIL[c.name] || [c.desc];
                  const isPopular = CAM_POPULAR.includes(c.name);
                  return (
                    <div key={c.id} style={{
                      border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? "#2979CF" : BR}`,
                      borderRadius: 16,
                      background: isSelected ? "rgba(197,228,248,0.85)" : "rgba(255,255,255,0.38)",
                      transition: "all .2s",
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: isSelected ? "0 0 0 3px rgba(41,121,207,0.22), 0 6px 24px rgba(41,121,207,0.18)" : "none",
                    }}>
                      {/* Ảnh — full card, tỉ lệ cố định */}
                      <div style={{ position: "relative", width: "100%", paddingTop: "130%", background: "rgba(197,216,236,0.60)", overflow: "hidden" }}>
                        {isPopular && null}
                        {/* Checkbox góc trên phải */}
                        <div onClick={() => toggleCam(c)} style={{ position: "absolute", top: 7, right: 7, zIndex: 3, width: 24, height: 24, borderRadius: 10, border: `2px solid ${isSelected ? "#2979CF" : "rgba(255,255,255,0.6)"}`, background: isSelected ? "#2979CF" : "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", boxShadow: isSelected ? "0 0 8px rgba(41,121,207,0.6)" : "none" }}>
                          {isSelected && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        {/* Ảnh */}
                        {c.images?.length > 0
                          ? <img src={c.images[0]} alt={c.name} onClick={() => toggleCam(c)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} />
                          : <span onClick={() => toggleCam(c)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, cursor: "pointer" }}>{c.icon}</span>}

                        {/* Info overlay — dưới cùng, mặc định trong suốt */}
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0,
                          background: expandedCam === c.id
                            ? "linear-gradient(to top, rgba(8,6,0,0.97) 0%, rgba(8,6,0,0.95) 80%, rgba(8,6,0,0.6) 100%)"
                            : "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
                          transition: "background .3s",
                          padding: expandedCam === c.id ? "14px 12px 12px" : "28px 12px 10px",
                        }}>
                          {/* Tên + giá */}
                          <div onClick={() => toggleCam(c)} style={{ cursor: "pointer", marginBottom: 5 }}>
                            <div style={{ color: isSelected ? "#E0F0FF" : "#fff", fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.3, marginBottom: 3, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{c.name}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 14, fontFamily: "system-ui,sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{new Intl.NumberFormat("vi-VN").format(c.price)}đ</span>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "system-ui,sans-serif" }}>/ ngày</span>
                            </div>
                          </div>

                          {/* Nút chi tiết */}
                          <button onClick={e => { e.stopPropagation(); setExpandedCam(expandedCam === c.id ? null : c.id); }}
                            style={{ background: expandedCam === c.id ? "rgba(255,255,255,0.15)" : "none", border: expandedCam === c.id ? "1px solid rgba(255,255,255,0.30)" : "none", color: "rgba(255,255,255,0.85)", fontSize: 10, fontFamily: "system-ui,sans-serif", cursor: "pointer", padding: expandedCam === c.id ? "2px 8px" : 0, borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                            {expandedCam === c.id ? "▴ Thu gọn" : "▾ Chi tiết"}
                          </button>

                          {/* Thông tin mở rộng */}
                          {expandedCam === c.id && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(41,121,207,0.25)" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                                {tags.slice(0, 3).map(t => (
                                  <span key={t} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 8, padding: "2px 6px", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{t}</span>
                                ))}
                              </div>
                              <div style={{ color: "#bbb", fontSize: 10, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>{details[0]}</div>
                              {details[1] && <div style={{ color: "#888", fontSize: 10, fontFamily: "system-ui,sans-serif", marginTop: 4, lineHeight: 1.5 }}>{details[1]}</div>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Qty row khi đã chọn — BUG FIX 1: dùng getAvailQty để sync với kho thực tế */}
                      {isSelected && (() => {
                        const totalStock = c.qty || 1; // tổng kho admin cài
                        const curQty = selCams[c.id] || 1;
                        // Tính available qty từ orders thực tế (sync với admin thay đổi + chặn overbooking)
                        const activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));
                        const availM = getAvailQty(c.id, totalStock, activeOrds, pickDate, "morning");
                        const availA = getAvailQty(c.id, totalStock, activeOrds, pickDate, "afternoon");
                        // BUG4 FIX: khi chưa chọn ca (selSession=null ở step1), dùng min(availM, availA)
                        // để tránh hiển thị kho "ảo" cao hơn thực tế có thể đặt được
                        const maxAvail = selSession
                          ? getAvailQty(c.id, totalStock, activeOrds, pickDate, selSession)
                          : Math.min(availM, availA);
                        const maxSel = Math.max(0, maxAvail);
                        return (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.50)", borderTop: `1px solid rgba(255,255,255,0.60)` }}>
                          <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>SL:</span>
                          {qtyBtn(() => setCamQty(c.id, curQty - 1, maxSel), "−")}
                          <span style={{ color: maxSel === 0 ? RED : G, fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center", fontFamily: "system-ui,sans-serif" }}>{curQty}</span>
                          {qtyBtn(() => setCamQty(c.id, curQty + 1, maxSel), "+")}
                          <span style={{ color: maxAvail < totalStock ? "#f59e0b" : "#444", fontSize: 9, fontFamily: "system-ui,sans-serif", marginLeft: "auto" }}>
                            / {totalStock} máy{maxAvail < totalStock ? ` · còn ${maxAvail}` : ""}
                          </span>
                        </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Cảnh báo tồn kho (chỉ thông tin, không chặn — khách chọn ngày ở bước 2) */}
              {(() => {
                const activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));
                const overbooked = selectedCamList.filter(c => {
                  const totalStock = c.qty || 1;
                  const availM = getAvailQty(c.id, totalStock, activeOrds, pickDate, "morning");
                  const availA = getAvailQty(c.id, totalStock, activeOrds, pickDate, "afternoon");
                  const maxAvail = Math.min(availM, availA);
                  return (selCams[c.id] || 1) > maxAvail;
                });
                const canNext = selectedCamList.length > 0;
                return (
                  <>
                    {overbooked.length > 0 && (
                      <div style={{ marginBottom:10, padding:"9px 13px", background:"rgba(255,240,200,0.75)", border:"1px solid #f59e0b66", borderRadius:12, color:"#92400e", fontSize:12, fontFamily:"system-ui,sans-serif", lineHeight:1.5 }}>
                        ⚠️ {overbooked.map(c => c.name).join(", ")} đang hết máy hôm nay — bạn có thể chọn ngày khác ở bước tiếp theo.
                      </div>
                    )}
                    <button onClick={() => canNext && setStep(2)} disabled={!canNext}
                      className="bk-next"
                      style={{ width:"100%", padding:15, background: canNext ? "linear-gradient(135deg, rgba(139,174,207,0.90) 0%, rgba(101,145,188,0.85) 100%)" : "rgba(180,180,190,0.40)", color: canNext ? "#fff" : MUT, border: canNext ? "1px solid rgba(255,255,255,0.55)" : "1px solid transparent", borderRadius:14, cursor: canNext ? "pointer" : "not-allowed", fontWeight:800, fontSize:15, fontFamily:"system-ui,sans-serif", letterSpacing:0.5, backdropFilter: canNext ? "blur(16px) saturate(160%)" : "none", WebkitBackdropFilter: canNext ? "blur(16px) saturate(160%)" : "none", boxShadow: canNext ? "0 1px 0 rgba(255,255,255,0.60) inset, 0 4px 20px rgba(8,20,60,0.18)" : "none" }}>
                      <span style={{position:"relative",zIndex:1}}>
                        {`Tiếp theo →${selectedCamList.length > 0 ? ` (${totalCamSelected} máy)` : ""}`}
                      </span>
                    </button>
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* STEP 2 — thời gian + phụ kiện — 2 cột desktop / 1 cột mobile */}
        {!done && step === 2 && (() => {
          const ri = days > 0 && (days !== 0.5 || selSession) ? returnInfo() : null;
          const isMob = typeof window !== "undefined" && window.innerWidth < 720;
          const phoneDisplay = siteContent?.phone || siteContent?.zalo || "0855 471 202";

          // ── Sidebar (tóm tắt đơn) ──
          const sidebar = (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:"rgba(255,255,255,0.45)", border:"1px solid rgba(255,255,255,0.60)", borderRadius:20, overflow:"hidden", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}>

                {/* ── Header — luôn hiện, click để toggle ── */}
                <div onClick={() => setSummaryOpen(p => !p)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer", userSelect:"none" }}>
                  {/* Icon máy nhỏ */}
                  {selectedCamList[0] && (
                    <div style={{ width:32, height:32, background:CARD, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, border:`1px solid ${BR}`, overflow:"hidden" }}>
                      {selectedCamList[0].images?.length > 0
                        ? <img src={selectedCamList[0].images[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : selectedCamList[0].icon}
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:MUT, fontSize:8, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>TÓM TẮT ĐƠN THUÊ</div>
                    <div style={{ color:G, fontWeight:900, fontSize:15, fontFamily:"system-ui,sans-serif", marginTop:1 }}>
                      {new Intl.NumberFormat("vi-VN").format(total)}đ
                    </div>
                  </div>
                  {/* Chevron */}
                  <div style={{ color:MUT, fontSize:12, transition:"transform .25s", transform: summaryOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink:0 }}>▼</div>
                </div>

                {/* ── Chi tiết — chỉ hiện khi mở ── */}
                {summaryOpen && (
                  <div style={{ borderTop:`1px solid #1e1a12`, padding:"12px 14px" }}>
                    {/* Danh sách máy */}
                    {selectedCamList.map(c => (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <div style={{ width:36, height:36, background:CARD, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:`1px solid ${BR}`, overflow:"hidden" }}>
                          {c.images?.length > 0
                            ? <img src={c.images[0]} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            : c.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:TXT, fontWeight:700, fontSize:12, fontFamily:"system-ui,sans-serif" }}>{c.name}</div>
                          <div style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif" }}>x{selCams[c.id] || 1}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ borderTop:`1px solid #1e1a12`, marginBottom:10 }} />
                    {/* Chi tiết thời gian */}
                    {[
                      { label:"Thời gian thuê", val: days > 0 ? fmtDays(days, selSession) : "—", highlight: true },
                      { label:"Nhận máy",        val: ri ? `${ri.pickTime} · ${ri.pickDate}` : "—" },
                      { label:"Trả máy trước",   val: ri ? `${ri.dropTime} · ${ri.dropDate}` : "—" },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif" }}>{label}</span>
                        <span style={{ color: highlight ? G : TXT, fontWeight: highlight ? 700 : 500, fontSize:11, fontFamily:"system-ui,sans-serif", textAlign:"right", maxWidth:"55%" }}>{val}</span>
                      </div>
                    ))}
                    {ri && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid #1e1a12`, paddingTop:8, marginTop:2 }}>
                        <span style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif" }}>⏱ Tổng thời gian</span>
                        <span style={{ color:G, fontWeight:700, fontSize:11, fontFamily:"system-ui,sans-serif" }}>{ri.totalLabel}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          );

          // ── Sidebar đã bỏ ──

          return (
            <div>
              {/* Back */}
              <button onClick={() => setStep(1)} className="bk-back" style={{ background:"none", border:"none", color:MUT, cursor:"pointer", fontSize:12, fontFamily:"system-ui,sans-serif", marginBottom:16, display:"flex", alignItems:"center", gap:5 }}><span style={{position:"relative",zIndex:1}}>← Quay lại</span></button>

              {/* ── PHỤKIỆN — trên cùng ── */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ color:TXT, fontWeight:700, fontSize:15, fontFamily:"system-ui,sans-serif" }}>Phụ kiện đi kèm</span>
                  {days > 0 && accCost > 0 && <span style={{ color:G, fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>+{fmtVND(accCost)}</span>}
                </div>
                {/* Rule: phải có máy mới chọn phụ kiện */}
                {totalCamSelected === 0 && (
                  <div style={{ background:"#FFF8ED", border:"1px solid #f59e0b44", borderRadius:12, padding:"8px 12px", marginBottom:10, color:"#f59e0b", fontSize:11, fontFamily:"system-ui,sans-serif" }}>
                    ⚠️ Chọn ít nhất 1 máy ảnh để thêm phụ kiện
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {(() => {
                    // Hoist ra ngoài map — tính 1 lần dùng chung cho toàn bộ phụ kiện
                    const _activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));
                    const _sess = selSession || "full";
                    const _accDateRange = (() => {
                      if (!pickDate || !days) return [];
                      if (days < 1) return [pickDate];
                      const arr = [];
                      for (let i = 0; i < Math.ceil(days); i++) arr.push(dateAddDays(pickDate, i));
                      return arr;
                    })();
                    return accessories.filter(a => a.active !== false).map(a => {
                    const qty = selAcc[a.name] || 0;
                    const isSel = qty > 0;
                    const availStock = _accDateRange.length > 0
                      ? Math.min(..._accDateRange.map(d => getAccAvailQty(a.name, a.qty || 0, _activeOrds, d, _sess)))
                      : (a.qty || 0);
                    const isOutOfStock = availStock <= 0;
                    const isLowStock = !isOutOfStock && availStock <= 1 && (a.qty || 0) > 1;
                    // maxQty: không vượt tồn kho thực tế và không vượt số máy chọn
                    const maxQty = Math.min(availStock, totalCamSelected || 0);
                    const canAdd = totalCamSelected > 0 && !isOutOfStock;
                    const unitPrice = days === 0.5 ? (a.priceShift != null ? a.priceShift : Math.round(a.price / 2)) : a.price;
                    const multiplier = days === 0.5 ? 1 : days;
                    const lineTotal = days > 0 ? unitPrice * qty * multiplier : 0;
                    return (
                      <div key={a.id} style={{ border:`${isSel ? "2px" : "1px"} solid ${isOutOfStock ? "#cc333344" : isSel ? "#2979CF" : "rgba(255,255,255,0.60)"}`, borderRadius:14, padding:"10px 13px", background: isOutOfStock ? "rgba(255,230,230,0.55)" : isSel ? "rgba(197,228,248,0.75)" : "rgba(255,255,255,0.38)", transition:"all .2s", opacity: totalCamSelected > 0 ? 1 : 0.45, boxShadow: isSel ? "0 0 0 2px rgba(41,121,207,0.2), 0 4px 16px rgba(41,121,207,0.15)" : "none", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, cursor: canAdd ? "pointer" : "not-allowed" }} onClick={() => canAdd && toggleAcc(a.name)}>
                          <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${isOutOfStock ? "#cc3333" : isSel ? "#2979CF" : BR}`, background: isOutOfStock ? "#cc333322" : isSel ? "#2979CF" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s", boxShadow: isSel ? "0 0 6px rgba(41,121,207,0.5)" : "none" }}>
                            {isOutOfStock
                              ? <span style={{ color:"#cc3333", fontSize:10, fontWeight:900, lineHeight:1 }}>✕</span>
                              : isSel && <span style={{ color:"#fff", fontSize:11, fontWeight:900, lineHeight:1 }}>✓</span>
                            }
                          </div>
                          {/* Ảnh icon phụ kiện nếu có */}
                          {a.image && (
                            <img src={a.image} alt={a.name} style={{ width:32, height:32, objectFit:"cover", borderRadius:8, flexShrink:0, opacity: isOutOfStock ? 0.4 : 1, border:"1px solid rgba(255,255,255,0.6)" }} />
                          )}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <span style={{ color: isOutOfStock ? "#666" : isSel ? TXT : "#888", fontSize:13, fontFamily:"system-ui,sans-serif", textDecoration: isOutOfStock ? "line-through" : "none" }}>{a.name}</span>
                              {isOutOfStock && (
                                <span style={{ background:"#cc333322", color:"#cc3333", border:"1px solid #cc333355", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:700, fontFamily:"system-ui,sans-serif", letterSpacing:.5 }}>HẾT</span>
                              )}
                              {isLowStock && !isOutOfStock && (
                                <span style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b55", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:700, fontFamily:"system-ui,sans-serif", letterSpacing:.5 }}>CÒN {availStock}</span>
                              )}
                            </div>
                            {a.desc && <div style={{ color:MUT, fontSize:10, marginTop:1, fontFamily:"system-ui,sans-serif" }}>{a.desc}</div>}
                            {isOutOfStock && pickDate && (
                              <div style={{ color:"#cc333388", fontSize:9, marginTop:2, fontFamily:"system-ui,sans-serif" }}>{days > 1 ? `Đã hết trong ${Math.ceil(days)} ngày đã chọn` : "Không còn trong ngày / ca này"}</div>
                            )}
                          </div>
                          <span style={{ color: isOutOfStock ? "#555" : G, fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif", flexShrink:0 }}>
                            {fmtVND(unitPrice)}/{days === 0.5 ? "buổi" : "ngày"}
                            {days === 0.5 && (
                              <span style={{ color:"#555", fontSize:9, fontWeight:400, marginLeft:4 }}>({fmtVND(a.price)}/ngày)</span>
                            )}
                          </span>
                        </div>
                        {isSel && !isOutOfStock && (
                          <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${G}22` }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: days > 0 ? 7 : 0 }}>
                              <span style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif" }}>Số lượng:</span>
                              {qtyBtn(() => setAccQty(a.name, qty-1, maxQty), "−")}
                              <span style={{ color:G, fontWeight:700, fontSize:14, minWidth:20, textAlign:"center", fontFamily:"system-ui,sans-serif" }}>{qty}</span>
                              {qtyBtn(() => setAccQty(a.name, qty+1, maxQty), "+")}
                              <span style={{ color: availStock < (a.qty||0) ? "#f59e0b" : "#444", fontSize:10, fontFamily:"system-ui,sans-serif" }}>
                                / {a.qty} kho{availStock < (a.qty||0) ? ` · còn ${availStock}` : ""}
                              </span>
                            </div>
                            {days > 0 && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.50)", border:"1px solid rgba(255,255,255,0.68)", borderRadius:10, padding:"5px 10px" }}>
                                <span style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif" }}>{qty} × {fmtVND(unitPrice)} × {fmtDays(days, selSession)}</span>
                                <span style={{ color:G, fontWeight:700, fontSize:12, fontFamily:"system-ui,sans-serif" }}>= {fmtVND(lineTotal)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                  })()}
                </div>
              </div>

              {/* ── THỜI GIAN THUÊ — trải full width ── */}
              <div style={{ marginBottom:16 }}>
                <div style={{ color:"#555", fontSize:9, letterSpacing:1.5, marginBottom:8, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>THỜI GIAN THUÊ</div>
                <div style={{ display:"grid", gridTemplateColumns:`repeat(3,1fr)`, gap:6, marginBottom:14 }}>
                  {DURATIONS.map(d => {
                    const active = selDur?.days === d.days && selDur?.session === d.session;
                    return (
                      <button key={d.label} onClick={() => { setSelDur(d); setCustomDays(""); }}
                        style={{ padding:"11px 4px", background: active ? "rgba(255,248,237,0.85)" : "rgba(255,255,255,0.40)", color: active ? G : MUT, border:`1px solid ${active ? G : "rgba(255,255,255,0.62)"}`, borderRadius:12, cursor:"pointer", fontSize:11, fontFamily:"system-ui,sans-serif", fontWeight: active ? 700 : 400, transition:"all .2s", textAlign:"center", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>
                        {d.label}
                        {active && <div style={{ fontSize:9, color:G+"cc", marginTop:3 }}>✓ Đã chọn</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Session badge: hiện thị ca đang chọn */}
                {selSession && days === 0.5 && (
                  <div style={{ marginBottom:14, background:"rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.62)", borderRadius:14, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}>
                    <span style={{ fontSize:20 }}>{selSession === "morning" ? "🌅" : "🌇"}</span>
                    <div>
                      <div style={{ color:G, fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>
                        {selSession === "morning" ? "Ca Sáng: 6:00 – 12:00" : "Ca Chiều: 14:00 – 20:00"}
                      </div>
                      <div style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif", marginTop:2 }}>
                        Phụ kiện theo ca này — check kho riêng
                      </div>
                    </div>
                  </div>
                )}

                {/* Nhập số ngày tuỳ chỉnh */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ color:"#555", fontSize:9, letterSpacing:1.5, marginBottom:6, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>HOẶC NHẬP SỐ NGÀY (≥1, session = cả ngày)</div>
                  <div style={{ position:"relative" }}>
                    <input style={{ ...inpS, paddingRight:50 }} type="number" min={1} value={customDays}
                      onChange={e => { setCustomDays(e.target.value); setSelDur(null); }} placeholder="VD: 5" />
                    <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif", pointerEvents:"none" }}>ngày</span>
                  </div>
                </div>
              </div>

              {/* ── LỊCH + THỜI GIAN DỰ KIẾN — xếp dọc ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:18 }}>
                {/* Calendar */}
                <div>
                  <div style={{ color:"#555", fontSize:9, letterSpacing:1.5, marginBottom:8, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>CHỌN NGÀY BẮT ĐẦU</div>
                  <div style={{ position:"relative" }}>
                    <BookingCalendar
                      selectedCams={selectedCamList.map(c => ({ id:c.id, qty:selCams[c.id] || 1, camQty:c.qty || 1 }))}
                      orders={orders} pickDate={pickDate} setPickDate={setPickDate} days={days} selSession={selSession}
                    />
                    {/* Blur overlay khi chưa chọn loại thuê */}
                    {!selSession && !days && (
                      <div style={{ position:"absolute", inset:0, background:"rgba(6,6,6,0.72)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)", zIndex:10 }}>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:24, marginBottom:8 }}>⏰</div>
                          <div style={{ color:G, fontWeight:700, fontSize:13, fontFamily:"system-ui,sans-serif" }}>Chọn thời gian thuê trước</div>
                          <div style={{ color:MUT, fontSize:11, marginTop:4, fontFamily:"system-ui,sans-serif" }}>Ca sáng, ca chiều hoặc cả ngày</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ position:"relative", marginTop:8, overflow:"hidden", borderRadius:12 }}>
                    <input style={{ ...inpS, fontSize:12, WebkitAppearance:"none", appearance:"none" }} type="date" value={pickDate} min={todayStr()} onChange={e => setPickDate(e.target.value)} />
                  </div>
                </div>

                {/* Thời gian dự kiến — full width, below calendar */}
                {ri && (
                  <div style={{ background:"rgba(255,255,255,0.40)", border:"1px solid rgba(255,255,255,0.58)", borderRadius:20, padding:"18px 16px", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}>
                    <div style={{ color:"#888", fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700, marginBottom:14 }}>THỜI GIAN DỰ KIẾN</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                      {[
                        { icon:"📦", label:"Nhận máy",      time:ri.pickTime, date:ri.pickDate },
                        { icon:"📅", label:"Trả máy trước", time:ri.dropTime, date:ri.dropDate },
                      ].map(({ icon, label, time, date }) => (
                        <div key={label} style={{ background:"rgba(255,255,255,0.50)", border:"1px solid rgba(255,255,255,0.70)", borderRadius:14, padding:"12px 12px" }}>
                          <div style={{ color:"#666", fontSize:10.5, fontFamily:"system-ui,sans-serif", marginBottom:8 }}>{icon} {label}</div>
                          <div style={{ color:G, fontWeight:800, fontSize:18, fontFamily:"system-ui,sans-serif", lineHeight:1, marginBottom:4 }}>{time}</div>
                          <div style={{ color:"#aaa", fontSize:12, fontFamily:"system-ui,sans-serif" }}>{date}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>⏱ Tổng</span>
                      <span style={{ color:G, fontWeight:700, fontSize:13, fontFamily:"system-ui,sans-serif" }}>{ri.totalLabel}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>🏷 Tiền máy</span>
                      <span style={{ color:G, fontWeight:800, fontSize:15, fontFamily:"system-ui,sans-serif" }}>{new Intl.NumberFormat("vi-VN").format(camCost)}đ</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.55)", borderRadius:12, padding:"10px 12px", display:"flex", flexDirection:"column", gap:5 }}>
                      {[
                        { color:"#22c55e", icon:"✅", text:"Trễ 1 giờ đầu miễn phí" },
                        { color:"#f59e0b", icon:"⏱",  text:"Từ giờ 2: +30k/giờ" },
                        { color:"#f87171", icon:"⏰", text:"Quá 6 giờ → +1 ngày" },
                      ].map(({ color, icon, text }) => (
                        <div key={text} style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ fontSize:12 }}>{icon}</span>
                          <span style={{ color, fontSize:11.5, fontFamily:"system-ui,sans-serif" }}>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── TỔNG ĐƠN TẠM TÍNH ── */}
              {days > 0 && (
                <div style={{ background:"rgba(255,255,255,0.40)", border:"1px solid rgba(255,255,255,0.58)", borderRadius:16, padding:"16px 18px", marginBottom:14, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}>
                  <div style={{ color:"#888", fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700, marginBottom:14 }}>TỔNG ĐƠN TẠM TÍNH</div>

                  {/* Máy ảnh */}
                  {selectedCamList.map(c => (
                    <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>
                        📷 {c.name}{(selCams[c.id] || 0) > 1 ? ` ×${selCams[c.id]}` : ""} · {fmtDays(days, selSession)}
                      </span>
                      <span style={{ color:TXT, fontSize:12, fontWeight:600, fontFamily:"system-ui,sans-serif" }}>
                        {fmtVND(c.price * (selCams[c.id] || 0) * days)}
                      </span>
                    </div>
                  ))}

                  {/* Phụ kiện */}
                  {Object.entries(selAcc).filter(([,q]) => q > 0).map(([name, qty]) => {
                    const acc = accessories.find(a => a.name === name);
                    if (!acc) return null;
                    const unitPrice = days === 0.5 ? (acc.priceShift != null ? acc.priceShift : Math.round(acc.price / 2)) : acc.price;
                    const multiplier = days === 0.5 ? 1 : days;
                    return (
                      <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>🎒 {name}{qty > 1 ? ` ×${qty}` : ""}</span>
                        <span style={{ color:TXT, fontSize:12, fontWeight:600, fontFamily:"system-ui,sans-serif" }}>{fmtVND(unitPrice * qty * multiplier)}</span>
                      </div>
                    );
                  })}

                  {/* Divider */}
                  <div style={{ borderTop:`1px solid #252010`, margin:"10px 0" }} />

                  {/* Subtotal */}
                  {accCost > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>Tạm tính</span>
                      <span style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>{fmtVND(subtotal)}</span>
                    </div>
                  )}

                  {/* Discount */}
                  {appliedDiscount && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ color:"#22c55e", fontSize:12, fontFamily:"system-ui,sans-serif" }}>🏷️ {appliedDiscount.code}</span>
                      <span style={{ color:"#22c55e", fontSize:12, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>-{fmtVND(discountAmt)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                    <span style={{ color:TXT, fontSize:14, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>Tổng cộng</span>
                    <span style={{ color:G, fontSize:20, fontWeight:900, fontFamily:"system-ui,sans-serif", letterSpacing:0.5 }}>{fmtVND(total)}</span>
                  </div>
                </div>
              )}

              {/* Nút tiếp tục — kiểm tra tồn kho TOÀN BỘ khoảng ngày thuê */}
              {(() => {
                // ── Build danh sách ngày cần check ──
                const datesToCheck = [];
                if (days > 0 && pickDate) {
                  if (days < 1) {
                    datesToCheck.push(pickDate);
                  } else {
                    for (let i = 0; i < Math.ceil(days); i++) {
                      datesToCheck.push(dateAddDays(pickDate, i));
                    }
                  }
                }
                const sess = selSession || "full";
                const activeOrds = orders.filter(o => !["cancelled","completed"].includes(o.status));

                // ── Check từng máy đã chọn trên toàn bộ ngày ──
                const blockingItems = [];
                if (datesToCheck.length > 0 && days > 0 && selSession && pickDate) {
                  selectedCamList.forEach(c => {
                    const needed = selCams[c.id] || 1;
                    const minAvail = Math.min(...datesToCheck.map(d => getAvailQty(c.id, c.qty || 1, activeOrds, d, sess)));
                    if (minAvail < needed) {
                      blockingItems.push({ name: c.name, avail: minAvail, needed, type: "📷 Máy", goBack: true });
                    }
                  });
                  // ── Check từng phụ kiện đã chọn trên toàn bộ ngày ──
                  Object.entries(selAcc).forEach(([name, qty]) => {
                    if (!qty || qty <= 0) return;
                    const acc = accessories.find(a => a.name === name);
                    if (!acc) return;
                    const minAvail = Math.min(...datesToCheck.map(d => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
                    if (minAvail < qty) {
                      blockingItems.push({ name, avail: minAvail, needed: qty, type: "🎒 Phụ kiện" });
                    }
                  });
                }

                const baseOk = days > 0 && !!selSession && !!pickDate;
                const canGo = baseOk && blockingItems.length === 0;

                return (
                  <>
                    {/* Cảnh báo hết hàng — chặn tiếp tục */}
                    {baseOk && blockingItems.length > 0 && (
                      <div style={{ marginBottom:10, padding:"10px 14px", background:"rgba(255,220,220,0.80)", border:"1px solid #cc333366", borderRadius:12, color:"#8B0000", fontSize:12, fontFamily:"system-ui,sans-serif", lineHeight:1.6 }}>
                        <div style={{ fontWeight:700, marginBottom:4 }}>🚫 Không đủ máy trong khoảng thời gian đã chọn:</div>
                        {blockingItems.map((item, i) => (
                          <div key={i}>
                            · {item.type} <b>{item.name}</b>: cần {item.needed} {item.type === "📷 Máy" ? "máy" : "cái"} nhưng hiện đã hết hàng — mấy vợ vui lòng chọn ngày khác{item.goBack ? ", hoặc ← quay lại bước 1 để giảm số lượng" : ""}{item.type === "📷 Máy" ? "" : " hoặc chọn phụ kiện khác"}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => canGo && setStep(3)} disabled={!canGo}
                      className="bk-next"
                      style={{ width:"100%", padding:15, background: canGo ? "linear-gradient(135deg, rgba(139,174,207,0.90) 0%, rgba(101,145,188,0.85) 100%)" : "rgba(180,180,190,0.40)", color: canGo ? "#fff" : MUT, border: canGo ? "1px solid rgba(255,255,255,0.55)" : "1px solid transparent", borderRadius:14, cursor: canGo ? "pointer" : "not-allowed", fontWeight:800, fontSize:15, fontFamily:"system-ui,sans-serif", letterSpacing:0.5, backdropFilter: canGo ? "blur(16px) saturate(160%)" : "none", WebkitBackdropFilter: canGo ? "blur(16px) saturate(160%)" : "none", boxShadow: canGo ? "0 1px 0 rgba(255,255,255,0.60) inset, 0 4px 20px rgba(8,20,60,0.18)" : "none" }}>
                      <span style={{position:"relative",zIndex:1}}>
                        {!days ? "Chọn thời gian thuê" : !selSession ? "Chọn ca thuê" : !pickDate ? "Chọn ngày bắt đầu" : blockingItems.length > 0 ? "⛔ Hết hàng — chọn lại ngày / số lượng" : "Tiếp tục →"}
                      </span>
                    </button>
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* STEP 3 — xác nhận + thông tin */}
        {!done && step === 3 && (() => {
          const ri = returnInfo();
          // Dùng BK_FormRow, BK_IconBox, BK_flatInp đã định nghĩa ngoài component để tránh lag nhập liệu

          return (
            <div style={{ paddingBottom:160 }}>
              <button onClick={() => setStep(2)} className="bk-back" style={{ background:"none", border:"none", color:MUT, cursor:"pointer", fontSize:12, fontFamily:"system-ui,sans-serif", marginBottom:18, display:"flex", alignItems:"center", gap:5 }}><span style={{position:"relative",zIndex:1}}>← Quay lại</span></button>

              {/* ── SUMMARY CARD ── */}
              <div style={{ border:"1px solid rgba(255,255,255,0.60)", borderRadius:20, overflow:"hidden", marginBottom:14, background:"rgba(255,255,255,0.38)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", boxShadow:"0 1px 0 rgba(255,255,255,0.70) inset, 0 4px 24px rgba(0,0,0,0.10)" }}>
                <div style={{ display:"flex", alignItems:"stretch", minHeight:160 }}>
                  {/* ── CỘT TRÁI: danh sách máy ── */}
                  <div style={{ flex:1, minWidth:0, borderRight:`1px solid rgba(0,0,0,0.08)` }}>
                    {/* Header */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 16px", borderBottom:`1px solid rgba(0,0,0,0.08)` }}>
                      <span style={{ fontSize:15 }}>📦</span>
                      <span style={{ color:G, fontSize:9, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>
                        THIẾT BỊ ({selectedCamList.length})
                      </span>
                    </div>
                    {/* Danh sách */}
                    {selectedCamList.map((c, idx) => (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom: idx < selectedCamList.length - 1 ? `1px solid rgba(0,0,0,0.07)` : "none" }}>
                        <div style={{ width:82, height:82, borderRadius:14, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, border:"1px solid rgba(255,255,255,0.40)" }}>
                          {c.images?.length > 0
                            ? <img src={c.images[0]} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            : c.icon}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ color:TXT, fontWeight:700, fontSize:15, fontFamily:"system-ui,sans-serif", marginBottom:8, lineHeight:1.3 }}>{c.name}</div>
                          <span style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.70)", color:MUT, fontSize:12, borderRadius:10, padding:"3px 12px", fontFamily:"system-ui,sans-serif", fontWeight:600 }}>x{selCams[c.id] || 1}</span>
                        </div>
                      </div>
                    ))}
                    {/* Phụ kiện nếu có */}
                    {Object.entries(selAcc).length > 0 && (
                      <div style={{ borderTop:`1px solid rgba(0,0,0,0.07)`, padding:"10px 14px", display:"flex", flexWrap:"wrap", gap:6 }}>
                        {Object.entries(selAcc).map(([name, qty]) => {
                          const accObj = accessories.find(x => x.name === name);
                          return (
                            <span key={name} style={{ background:"rgba(255,255,255,0.50)", border:"1px solid rgba(255,255,255,0.68)", color:MUT, fontSize:10, borderRadius:8, padding:"3px 8px", fontFamily:"system-ui,sans-serif", display:"inline-flex", alignItems:"center", gap:5 }}>
                              {accObj?.image
                                ? <img src={accObj.image} alt={name} style={{ width:16, height:16, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                                : <span>🎒</span>
                              }
                              {name}{qty > 1 ? ` ×${qty}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── CỘT PHẢI: thông tin đơn thuê ── */}
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Header */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 16px", borderBottom:`1px solid rgba(0,0,0,0.08)` }}>
                      <span style={{ fontSize:15 }}>📅</span>
                      <span style={{ color:G, fontSize:9, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>LỊCH THUÊ</span>
                    </div>
                    {/* Nội dung */}
                    <div style={{ padding:"6px 16px 10px", display:"flex", flexDirection:"column", gap:0 }}>
                      {/* Ca thuê */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:`1px solid rgba(0,0,0,0.07)` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:14, opacity:0.6 }}>🕐</span>
                          <span style={{ color:MUT, fontSize:13, fontFamily:"system-ui,sans-serif" }}>Ca thuê</span>
                        </div>
                        <span style={{ color:TXT, fontSize:13, fontFamily:"system-ui,sans-serif", fontWeight:600, textAlign:"right" }}>
                          {selSession === "morning" ? "Ca sáng (6h–12h)" : selSession === "afternoon" ? "Ca chiều (14h–20h)" : days >= 1 ? `${days} ngày` : fmtDays(days, selSession)}
                        </span>
                      </div>
                      {/* Nhận máy */}
                      {ri && (
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:`1px solid rgba(0,0,0,0.07)` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:14, color:"#22c55e" }}>📅</span>
                            <span style={{ color:MUT, fontSize:13, fontFamily:"system-ui,sans-serif" }}>Nhận máy</span>
                          </div>
                          <span style={{ color:"#22c55e", fontSize:13, fontFamily:"system-ui,sans-serif", fontWeight:700, textAlign:"right" }}>
                            {ri.pickTime} · {ri.pickDate}
                          </span>
                        </div>
                      )}
                      {/* Trả máy */}
                      {ri && (
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:`1px solid rgba(0,0,0,0.07)` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:14, color:"#f59e0b" }}>📅</span>
                            <span style={{ color:MUT, fontSize:13, fontFamily:"system-ui,sans-serif" }}>Trả máy</span>
                          </div>
                          <span style={{ color:"#f59e0b", fontSize:13, fontFamily:"system-ui,sans-serif", fontWeight:700, textAlign:"right" }}>
                            {ri.dropTime} · {ri.dropDate}
                          </span>
                        </div>
                      )}
                      {/* Tổng tiền */}
                      <div style={{ paddingTop:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ color:"#556", fontSize:9, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>TỔNG CỘNG</span>
                        <div style={{ textAlign:"right" }}>
                          {appliedDiscount && (
                            <>
                              <div style={{ color:MUT, fontSize:10, textDecoration:"line-through", fontFamily:"system-ui,sans-serif" }}>{new Intl.NumberFormat("vi-VN").format(subtotal)}đ</div>
                              <div style={{ color:"#22c55e", fontSize:10, fontFamily:"system-ui,sans-serif" }}>-{new Intl.NumberFormat("vi-VN").format(discountAmt)}đ</div>
                            </>
                          )}
                          <div style={{ color:G, fontWeight:900, fontSize:17, fontFamily:"system-ui,sans-serif", whiteSpace:"nowrap" }}>{new Intl.NumberFormat("vi-VN").format(total)} đ</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── FORM STYLES ── */}
              <style>{`
                .bk-inp:focus { border-color: rgba(201,168,76,0.6) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important; }
                .bk-inp::placeholder { color: #6a8aaa; }
                .bk-inp { caret-color: #2E2E2E; }
                .bk-disc-body { overflow: hidden; transition: max-height .3s ease, opacity .3s ease; }
                .bk-disc-body.open { max-height: 100px; opacity: 1; }
                .bk-disc-body.closed { max-height: 0; opacity: 0; }
                .bk-cta:hover:not(:disabled) { box-shadow: 0 6px 32px rgba(201,168,76,0.45) !important; transform: translateY(-1px); }
                .bk-cta { transition: all .2s ease !important; }

                /* ── Interactive Hover: Nút Tiếp theo ── */
                .bk-next {
                  position: relative; overflow: hidden;
                  transition: color .35s ease, transform .2s ease, box-shadow .2s ease;
                  z-index: 0;
                }
                .bk-next::before {
                  content: '';
                  position: absolute; inset: 0;
                  background: linear-gradient(135deg, rgba(74,106,138,0.95) 0%, rgba(50,85,125,0.92) 100%);
                  transform: translateX(-101%);
                  transition: transform .38s cubic-bezier(.4,0,.2,1);
                  z-index: 0;
                }
                .bk-next:not(:disabled):hover::before { transform: translateX(0); }
                .bk-next:not(:disabled):hover { color: #fff !important; transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,0.50) inset, 0 8px 28px rgba(8,20,60,0.28) !important; }
                .bk-next:disabled { cursor: not-allowed; }

                /* ── Interactive Hover: Nút Quay lại ── */
                .bk-back {
                  position: relative; overflow: hidden;
                  transition: color .3s ease, border-color .3s ease;
                  z-index: 0;
                }
                .bk-back::before {
                  content: '';
                  position: absolute; inset: 0;
                  background: var(--card-bg, #E8E8E8);
                  transform: translateX(101%);
                  transition: transform .35s cubic-bezier(.4,0,.2,1);
                  z-index: 0;
                }
                .bk-back:hover::before { transform: translateX(0); }
                .bk-back:hover { color: #111111 !important; border-color: #9E9E9E !important; }
              `}</style>

              {/* ── FORM SECTION ── */}
              <div style={{ color:G, fontSize:10, letterSpacing:2, fontFamily:"system-ui,sans-serif", fontWeight:700, marginBottom:14 }}>THÔNG TIN NGƯỜI THUÊ</div>

              <div style={{ background:"rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.62)", borderRadius:22, padding:"20px 18px", marginBottom:14, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}>

                {/* ── MÃ GIẢM GIÁ (collapsible) ── */}
                <div style={{ marginBottom:18, paddingBottom:18, borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
                  {/* Header row – luôn hiển thị */}
                  <div
                    onClick={() => { if (!appliedDiscount) setDiscountExpanded(p => !p); }}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor: appliedDiscount ? "default" : "pointer", userSelect:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:14, opacity:0.5 }}>🎟</span>
                      <span style={{ color:"#888", fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>MÃ GIẢM GIÁ</span>
                      {appliedDiscount && (
                        <span style={{ color:G, fontSize:11, fontFamily:"monospace", fontWeight:700, letterSpacing:1, marginLeft:4 }}>
                          {appliedDiscount.code}
                        </span>
                      )}
                      {!appliedDiscount && !discountExpanded && discountCode && (
                        <span style={{ color:G, fontSize:11, fontFamily:"monospace", fontWeight:700, letterSpacing:1, marginLeft:4 }}>{discountCode}</span>
                      )}
                    </div>
                    {appliedDiscount ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ color:"#22c55e", fontSize:11, fontFamily:"system-ui,sans-serif", fontWeight:700 }}>-{fmtVND(discountAmt)}</span>
                        <button onClick={e => { e.stopPropagation(); removeDiscount(); setDiscountExpanded(false); }}
                          style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1 }}>✕</button>
                      </div>
                    ) : (
                      <span style={{ color:"#444", fontSize:16, lineHeight:1, transition:"transform .3s", display:"inline-block", transform: discountExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
                    )}
                  </div>

                  {/* Expand body */}
                  <div className={`bk-disc-body ${discountExpanded && !appliedDiscount ? "open" : "closed"}`}>
                    <div style={{ paddingTop:12, display:"flex", gap:8 }}>
                      <input
                        className="bk-inp"
                        style={{ ...BK_flatInp, fontFamily:"monospace", letterSpacing:2, fontSize:13, flex:1 }}
                        value={discountCode}
                        onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountMsg(null); }}
                        onKeyDown={e => e.key === "Enter" && applyDiscount()}
                        placeholder="Nhập mã..."
                      />
                      <button onClick={() => { applyDiscount(); setDiscountExpanded(false); }}
                        style={{ padding:"0 16px", background:`linear-gradient(135deg,${G},#a07830)`, color:"#000", border:"none", borderRadius:16, cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:"system-ui,sans-serif", whiteSpace:"nowrap", flexShrink:0, minHeight:44 }}>
                        Áp dụng
                      </button>
                    </div>
                    {discountMsg && (
                      <div style={{ marginTop:6, fontSize:10, color: discountMsg.type==="ok" ? "#22c55e" : "#ef4444", fontFamily:"system-ui,sans-serif" }}>{discountMsg.text}</div>
                    )}
                  </div>
                </div>

                {/* Họ tên */}
                <BK_FormRow icon="👤" labelTop="HỌ VÀ TÊN *">
                  <input className="bk-inp" style={BK_flatInp} type="text" value={info.name}
                    onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} placeholder="Nhập họ và tên" />
                </BK_FormRow>

                {/* SĐT */}
                <BK_FormRow icon="📞" labelTop="SỐ ĐIỆN THOẠI *">
                  <input className="bk-inp" style={BK_flatInp} type="tel" value={info.phone}
                    onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))} placeholder="0901 234 567" />
                </BK_FormRow>

                {/* Zalo */}
                <BK_FormRow icon="💬" labelTop="ZALO" labelBottom="(XÁC NHẬN ĐƠN)">
                  <input className="bk-inp" style={BK_flatInp} type="tel" value={info.zalo}
                    onChange={e => setInfo(p => ({ ...p, zalo: e.target.value }))} placeholder="Số Zalo" />
                </BK_FormRow>

                {/* Địa chỉ */}
                <BK_FormRow icon="📍" labelTop="ĐỊA CHỈ" labelBottom="NHẬN / TRẢ MÁY">
                  <input className="bk-inp" style={BK_flatInp} type="text" value={info.address}
                    onChange={e => setInfo(p => ({ ...p, address: e.target.value }))} placeholder="Địa chỉ nhận / trả máy" />
                </BK_FormRow>

                {/* Ghi chú */}
                <BK_FormRow icon="📋" labelTop="GHI CHÚ" noBorder>
                  <textarea className="bk-inp" style={{ ...BK_flatInp, resize:"vertical", minHeight:80, lineHeight:1.6 }}
                    value={info.note}
                    onChange={e => setInfo(p => ({ ...p, note: e.target.value }))}
                    placeholder="Yêu cầu đặc biệt, lưu ý thêm..." />
                </BK_FormRow>
              </div>

              {/* ── BOTTOM BAR (fixed) ── */}
              <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"min(660px,100vw)", background:"linear-gradient(to top, rgba(197,216,236,0.97) 80%, transparent)", padding:"14px 18px 18px", zIndex:999, boxSizing:"border-box", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}>
                {/* BUG FIX 2: Lỗi validate kho */}
                {submitError && (
                  <div style={{ marginBottom:8, padding:"9px 14px", background:"#FEF0F0", border:"1px solid #B0282844", borderRadius:9, color:"#ef4444", fontSize:12, fontFamily:"system-ui,sans-serif", lineHeight:1.5 }}>
                    {submitError}
                  </div>
                )}
                {/* Tổng tiền row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"0 2px" }}>
                  <span style={{ color:"#666", fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>TỔNG CỘNG</span>
                  <div style={{ textAlign:"right" }}>
                    {appliedDiscount && (
                      <span style={{ color:"#22c55e", fontSize:11, fontFamily:"system-ui,sans-serif", marginRight:8 }}>-{fmtVND(discountAmt)}</span>
                    )}
                    <span style={{ color:G, fontWeight:900, fontSize:20, fontFamily:"system-ui,sans-serif" }}>{new Intl.NumberFormat("vi-VN").format(total)} đ</span>
                  </div>
                </div>
                {/* CTA full width */}
                <button
                  className="bk-cta"
                  onClick={() => info.name && info.phone && handleFinish()}
                  disabled={!info.name || !info.phone}
                  style={{
                    width:"100%", padding:"15px 24px",
                    background: info.name && info.phone ? `linear-gradient(135deg, #6a6a82 0%, #c8c8dc 50%, #4a4a60 100%)` : BR2,
                    color: info.name && info.phone ? "#0a0a18" : "#444",
                    border:"none", borderRadius:20,
                    cursor: info.name && info.phone ? "pointer" : "not-allowed",
                    fontWeight:900, fontSize:15, fontFamily:"system-ui,sans-serif",
                    letterSpacing:1,
                    boxShadow: info.name && info.phone ? `0 4px 24px rgba(200,200,240,0.35)` : "none",
                    boxSizing:"border-box",
                  }}>
                  Xác nhận đặt thuê
                </button>
                {/* Trust badges */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginTop:8, flexWrap:"wrap" }}>
                  {["🛡️ Thiết bị chính hãng", "🔍 Kiểm tra kỹ trước khi giao", "🎧 Hỗ trợ 24/7"].map((t, i, arr) => (
                    <span key={t} style={{ display:"flex", alignItems:"center", gap:0 }}>
                      <span style={{ color:MUT, fontSize:9, fontFamily:"system-ui,sans-serif" }}>{t}</span>
                      {i < arr.length - 1 && <span style={{ color:"#222", margin:"0 8px", fontSize:11 }}>|</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DONE */}
        {done && (() => {
          const zaloMsg = encodeURIComponent(
            "Xin chào 92 KA MÊ RA! 📸\nMã đơn: " + orderId +
            "\nThiết bị: " + selectedCamList.map(c => c.name + " x" + selCams[c.id]).join(", ") +
            "\nThời gian: " + fmtDays(days, selSession) +
            (appliedDiscount ? "\nMã giảm giá: " + appliedDiscount.code + " (-" + fmtVND(discountAmt) + ")" : "") +
            "\nTổng tiền: " + fmtVND(total) +
            "\nKhách: " + info.name + " | SĐT: " + info.phone
          );
          // BUG6 FIX: dùng ? hoặc & tuỳ zaloLink đã có query string chưa
          const zaloHref = siteContent.zaloLink
            ? siteContent.zaloLink + (siteContent.zaloLink.includes("?") ? "&" : "?") + "text=" + zaloMsg
            : "https://zalo.me/" + (siteContent.zalo || "").replace(/\s/g, "") + "?text=" + zaloMsg;

          const copyFn = () => {
            const accList = (() => { try { return Object.entries(selAcc).filter(([,q])=>q>0).map(([n,q])=>q>1?`${n} x${q}`:n).join(", ") || "Không có"; } catch { return "Không có"; } })();
            const ri2 = returnInfo();
            const lines = [
              "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
              "━━━━━━━━━━━━━━━━━━━━━━",
              `Mã đơn : ${orderId}`,
              `📷 Máy  : ${selectedCamList.map(c => `${c.name}${selCams[c.id]>1?` x${selCams[c.id]}`:""}`).join(", ")}`,
              `🎒 Phụ kiện: ${accList}`,
              `⏱ Thời gian: ${fmtDays(days, selSession)}`,
              ri2 ? `📦 Giờ nhận : ${ri2.pickTime} · ${ri2.pickDate}` : null,
              ri2 ? `📅 Giờ trả  : ${ri2.dropTime} · ${ri2.dropDate}` : null,
              appliedDiscount ? `🏷️ Mã giảm giá: ${appliedDiscount.code} (-${fmtVND(discountAmt)})` : null,
              `💰 Tổng tiền: ${fmtVND(total)}`,
              "━━━━━━━━━━━━━━━━━━━━━━",
              `👤 Tên   : ${info.name}`,
              `📞 SĐT   : ${info.phone}`,
              info.address ? `📍 Địa chỉ: ${info.address}` : null,
              info.note ? `💬 Ghi chú: ${info.note}` : null,
              "━━━━━━━━━━━━━━━━━━━━━━",
              "⏳ Trạng thái: Chờ xác nhận",
            ].filter(Boolean).join("\n");
            navigator.clipboard?.writeText(lines).catch(() => {});
          };

          return (
            <div style={{ textAlign:"center", padding:"12px 8px 20px", position:"relative", overflow:"hidden" }}>
              {/* Confetti SVG dots trang trí */}
              <style>{`
                @keyframes floatDot{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-80px) rotate(360deg);opacity:0}}
              `}</style>
              {[...Array(14)].map((_, i) => {
                const x = 5 + (i * 7) % 90;
                const delay = (i * 0.18).toFixed(2);
                const size = 4 + (i % 5) * 2;
                const colors = [G, "#fff", G+"99", "#c8b06a", "#fff8e1"];
                return (
                  <div key={i} style={{
                    position:"absolute", left:`${x}%`, top: 20 + (i % 4) * 18,
                    width:size, height:size,
                    background: colors[i % colors.length],
                    borderRadius: i % 3 === 0 ? "50%" : 2,
                    animation:`floatDot ${1.8 + (i%4)*0.3}s ease-out ${delay}s infinite`,
                    pointerEvents:"none", zIndex:0, opacity:0.7
                  }} />
                );
              })}

              {/* Camera icon với flash effect */}
              <div style={{ position:"relative", display:"inline-block", marginBottom:16, zIndex:1 }}>
                {/* Glow */}
                <div style={{ position:"absolute", top:"10%", left:"50%", transform:"translateX(-50%)", width:60, height:60, background:`radial-gradient(circle, #fff9 0%, ${G}66 40%, transparent 70%)`, borderRadius:"50%", pointerEvents:"none" }} />
                <div style={{ fontSize:72, lineHeight:1, filter:"drop-shadow(0 0 16px rgba(201,168,76,0.5))" }}>📷</div>
              </div>

              {/* Title */}
              <div style={{ color:G, fontSize:26, fontWeight:700, fontFamily:"var(--font-display)", marginBottom:6, letterSpacing:0.5, zIndex:1, position:"relative" }}>
                Đặt đơn thành công!
              </div>
              <div style={{ color:MUT, fontSize:13, fontFamily:"system-ui,sans-serif", marginBottom:16, zIndex:1, position:"relative" }}>
                Mã đơn của bạn
              </div>

              {/* Order ID */}
              <div style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.75)", borderRadius:16, padding:"14px 24px", display:"inline-block", marginBottom:14, zIndex:1, position:"relative", minWidth:240, backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>
                <div style={{ color:TXT, fontSize:28, fontWeight:900, fontFamily:"monospace", letterSpacing:6 }}>{orderId}</div>
              </div>

              {/* Tổng tiền */}
              <div style={{ marginBottom:20, zIndex:1, position:"relative" }}>
                {appliedDiscount && (
                  <div style={{ color:"#22c55e", fontSize:12, fontFamily:"system-ui,sans-serif", marginBottom:4 }}>
                    🏷️ Mã {appliedDiscount.code} — Đã giảm {fmtVND(discountAmt)}
                  </div>
                )}
                <span style={{ color:MUT, fontSize:14, fontFamily:"system-ui,sans-serif" }}>Tổng: </span>
                <span style={{ color:G, fontWeight:800, fontSize:18, fontFamily:"system-ui,sans-serif" }}>{new Intl.NumberFormat("vi-VN").format(total)} đ</span>
              </div>

              {/* QR nếu có */}
              {siteContent.zaloQR && (
                <div style={{ margin:"0 auto 18px", maxWidth:200, zIndex:1, position:"relative" }}>
                  <div style={{ color:MUT, fontSize:9, letterSpacing:2, marginBottom:8, fontFamily:"system-ui,sans-serif" }}>QUÉT QR ĐỂ LIÊN HỆ</div>
                  <div style={{ background:"#fff", borderRadius:14, padding:8, display:"inline-block", boxShadow:`0 0 30px ${G}22` }}>
                    <img src={siteContent.zaloQR} alt="Zalo QR" style={{ width:160, height:160, objectFit:"contain", display:"block" }} />
                  </div>
                </div>
              )}

              {/* Nút Zalo — full width, xanh lá */}
              <a href={zaloHref} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"15px 24px", background:"#06c755", color:"#fff", borderRadius:16, fontWeight:800, fontSize:16, textDecoration:"none", boxShadow:"0 6px 24px rgba(6,199,85,0.35)", marginBottom:12, boxSizing:"border-box", zIndex:1, position:"relative", transition:"opacity .2s" }}>
                <span style={{ fontSize:20 }}>💬</span> Nhắn Zalo chốt đơn
              </a>

              {/* Notice box */}
              <div style={{ background:"#EEF9F4", border:"1px solid #06c75533", borderRadius:14, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:10, textAlign:"left", zIndex:1, position:"relative" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>🛡️</span>
                <div>
                  <div style={{ color:"#22c55e", fontSize:12, fontFamily:"system-ui,sans-serif", lineHeight:1.6 }}>
                    Đơn thuê đã được tạo và xác nhận qua Zalo.<br/>
                    Để được xử lý đơn nhanh hơn.
                  </div>
                </div>
              </div>

              {/* Sao chép đơn — nổi bật */}
              <div style={{ marginBottom:12, zIndex:1, position:"relative", background:"rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.62)", borderRadius:16, padding:"14px 16px", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}>
                <div style={{ color:"#888", fontSize:10, letterSpacing:1.5, fontFamily:"system-ui,sans-serif", marginBottom:10 }}>SAO CHÉP ĐƠN ĐỂ GỬI / LƯU LẠI</div>
                <button onClick={copyFn}
                  style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg,#1a1200,#0f0d08)`, color:G, border:`1px solid ${G}55`, borderRadius:14, cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"system-ui,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s", letterSpacing:0.5 }}
                  onMouseEnter={e => e.currentTarget.style.background=`linear-gradient(135deg,${G}11,${G}08)`}
                  onMouseLeave={e => e.currentTarget.style.background=`linear-gradient(135deg,${G}08,${CARD})`}
                >
                  <span style={{ fontSize:18 }}>📋</span> Sao chép đơn
                </button>
              </div>

              {/* Đóng */}
              <button onClick={onClose}
                style={{ width:"100%", padding:"13px 0", background:"rgba(255,255,255,0.40)", color:"#556", border:"1px solid rgba(255,255,255,0.60)", borderRadius:14, cursor:"pointer", fontSize:14, fontFamily:"system-ui,sans-serif", transition:"background .2s", zIndex:1, position:"relative" }}>
                Đóng
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── CAMERA FEATURED CAROUSEL ──
function CameraFeatured({ id, cameras, orders = [], onBook, isMobile }) {
  const [active, setActive] = useState(0);
  const [hov, setHov] = useState(null);
  const [slideDir, setSlideDir] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const isPaused = useRef(false);
  const camScrollRef = useRef(null);
  const camPausedRef = useRef(false);
  const camIdxRef = useRef(0);
  const total = cameras.length;

  const go = useCallback((dir) => {
    setSlideDir(dir);
    setAnimKey(k => k + 1);
    setActive(a => (a + dir + total) % total);
  }, [total]);

  const prev = () => go(-1);
  const next = () => go(1);

  // Auto-play desktop
  useEffect(() => {
    if (isMobile) return;
    const t = setInterval(() => { if (!isPaused.current) go(1); }, 3500);
    return () => clearInterval(t);
  }, [go, isMobile]);

  // Auto-scroll mobile
  useEffect(() => {
    if (!isMobile) return;
    const el = camScrollRef.current;
    if (!el) return;
    const t = setInterval(() => {
      if (camPausedRef.current || !el) return;
      const cards = el.querySelectorAll("[data-camcard]");
      if (!cards.length) return;
      camIdxRef.current = (camIdxRef.current + 1) % cards.length;
      setActive(camIdxRef.current);
      el.scrollTo({ left: cards[camIdxRef.current].offsetLeft - 16, behavior: "smooth" });
    }, 3500);
    const onTouch = () => { camPausedRef.current = true; setTimeout(() => { camPausedRef.current = false; }, 6000); };
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => { clearInterval(t); el.removeEventListener("touchstart", onTouch); };
  }, [isMobile, cameras.length]);

  // Mobile: render scroll container
  if (isMobile) {
    const parseName = (name) => {
      const parts = name.split(" ");
      const brandMap = { fujifilm:"FUJIFILM", sony:"SONY", canon:"CANON", nikon:"NIKON", dji:"DJI", gopro:"GOPRO" };
      const firstLow = parts[0].toLowerCase();
      if (brandMap[firstLow]) return { brand: brandMap[firstLow], model: parts.slice(1).join(" ") };
      return { brand: parts[0].toUpperCase(), model: parts.slice(1).join(" ") };
    };
    const shortDesc = (desc) => desc.split(/[,，、]/)[0].trim().toUpperCase();
    return (
      <div id={id} style={{ padding: "72px 0 56px", margin: isMobile ? "20px 12px" : "32px 20px", borderRadius: 28, border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", overflow: "hidden" }}>
        <style>{`.cam-scroll::-webkit-scrollbar{display:none}.cam-scroll{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
        <div style={{ padding: "0 16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:7, color:G, fontFamily:"var(--font-ui)", marginBottom:6, fontWeight:700, opacity:0.55 }}>BỘ SƯU TẬP</div>
            <h2 style={{ fontSize:24, fontWeight:700, letterSpacing:1, margin:0, color:G, fontFamily:'var(--font-display)', textShadow:'0 1px 3px rgba(13,27,42,0.10)' }}>Máy Ảnh Cho Thuê</h2>
          </div>
        </div>
        <div ref={camScrollRef} className="cam-scroll"
          style={{ display:"flex", gap:12, overflowX:"auto", scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", paddingLeft:16, paddingRight:16, paddingBottom:8 }}>
          {cameras.map((cam, i) => {
            const { brand, model } = parseName(cam.name);
            const isAct = i === active;
            return (
              <div key={cam.id} data-camcard="1"
                style={{ scrollSnapAlign:"start", flexShrink:0, width:"calc(100vw - 48px)", height:320, borderRadius:20, overflow:"hidden", border:`1px solid ${isAct ? G+"66" : BR}`, position:"relative", background:BG }}>
                <div style={{ position:"absolute", inset:0, zIndex:0 }}><CamImage cam={cam} height={320} /></div>
                <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.3) 60%,transparent 100%)", pointerEvents:"none" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:2, padding:"0 20px 20px" }}>
                  <div style={{ fontSize:8,letterSpacing:4,color:"rgba(255,255,255,0.5)",fontFamily:"system-ui,sans-serif",marginBottom:4,fontWeight:600 }}>{brand}</div>
                  <div style={{ fontSize:28,fontWeight:700,letterSpacing:0.5,color:"#fff",lineHeight:1,marginBottom:5,fontFamily:"system-ui,sans-serif",textShadow:"0 2px 12px rgba(0,0,0,0.8)" }}>{model}</div>
                  <div style={{ fontSize:8,letterSpacing:3,color:"rgba(255,255,255,0.45)",fontFamily:"system-ui,sans-serif",marginBottom:14 }}>{shortDesc(cam.desc)}</div>
                  <div style={{ width:28,height:1,background:G+"88",marginBottom:14 }} />
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
                    <div style={{ display:"flex",flexDirection:"column",lineHeight:1 }}>
                      <span style={{ color:"#fff",fontSize:15,fontWeight:700,fontFamily:"system-ui,sans-serif",textShadow:"0 1px 6px rgba(0,0,0,0.7)" }}>{fmtVND(cam.price)}</span>
                      <span style={{ color:"rgba(255,255,255,0.45)",fontSize:9,marginTop:3,fontFamily:"system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <div className="btn-3d-wrap" style={{ borderRadius:10 }}><button onClick={() => onBook(cam)} className="btn-3d"
                      style={{ borderRadius:9,fontSize:8,letterSpacing:1.5,padding:"6px 10px",whiteSpace:"nowrap" }}>
                      THUÊ NGAY
                    </button></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex",justifyContent:"center",gap:6,marginTop:20 }}>
          {cameras.map((_,i) => <div key={i} style={{ width:i===active?22:6,height:5,borderRadius:3,background:i===active?G:BR,transition:"all .3s" }} />)}
        </div>
      </div>
    );
  }

  const getVisible = () => {
    const items = [];
    for (let d = -1; d <= 1; d++) {
      const idx = (active + d + total) % total;
      items.push({ cam: cameras[idx], offset: d, isCenter: d === 0 });
    }
    return items;
  };
  const visible = getVisible();

  const parseName = (name) => {
    const parts = name.split(" ");
    if (parts.length === 1) return { brand: "", model: name };
    const brandMap = { fujifilm: "FUJIFILM", sony: "SONY", canon: "CANON", nikon: "NIKON", dji: "DJI", gopro: "GOPRO" };
    const firstLow = parts[0].toLowerCase();
    if (brandMap[firstLow]) return { brand: brandMap[firstLow], model: parts.slice(1).join(" ") };
    return { brand: parts[0].toUpperCase(), model: parts.slice(1).join(" ") };
  };

  const shortDesc = (desc) => {
    const words = desc.split(/[,，、]/);
    return words[0].trim().toUpperCase();
  };

  // Slide animation keyframes (inject 1 lần)
  useEffect(() => {
    if (document.getElementById("cf-anim-style")) return;
    const style = document.createElement("style");
    style.id = "cf-anim-style";
    style.textContent = `
      @keyframes cf-slide-in-left { from { opacity:0; transform:translateX(-48px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }
      @keyframes cf-slide-in-right { from { opacity:0; transform:translateX(48px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }
      @keyframes cf-slide-in-left-side { from { opacity:0; transform:translateX(-32px) scale(0.93); } to { opacity:0.6; transform:translateX(0) scale(0.93); } }
      @keyframes cf-slide-in-right-side { from { opacity:0; transform:translateX(32px) scale(0.93); } to { opacity:0.6; transform:translateX(0) scale(0.93); } }
    `;
    document.head.appendChild(style);
  }, []);

  // Desktop: marquee giống feedback
  const [cfPaused, setCfPaused] = useState(false);
  let combined = [...cameras];
  const minItems = 6;
  while (combined.length < minItems) combined = [...combined, ...cameras];
  combined = [...combined, ...combined];
  const dur = Math.max(30, combined.length * 3.5);

  return (
    <div id={id} style={{ padding: "96px 0 80px", margin: isMobile ? "20px 12px" : "32px 20px", borderRadius: 28, border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", overflow: "hidden", position: "relative" }}>
      <style>{`@keyframes scrollCam{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}`}</style>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:300, background:`radial-gradient(ellipse,${G}06,transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ textAlign:"center", marginBottom:32, position:"relative", zIndex:2 }}>
        <div style={{ fontSize:9, letterSpacing:7, color:G, fontFamily:"var(--font-ui)", marginBottom:14, fontWeight:700, opacity:0.55 }}>BỘ SƯU TẬP</div>
        <h2 style={{ fontSize:30, fontWeight:700, letterSpacing:1, margin:"0 0 6px", color:G, fontFamily:"var(--font-display)", textShadow:"0 1px 3px rgba(13,27,42,0.10)" }}>Máy Ảnh Cho Thuê</h2>
        <div style={{ width:36, height:1, background:G, margin:"14px auto 18px" }} />
        <button onClick={() => setCfPaused(p => !p)}
          style={{ background: cfPaused ? G+"22" : "none", border:`1px solid ${cfPaused ? G : BR}`, color: cfPaused ? G : MUT, padding:"6px 22px", borderRadius:99, fontSize:10, cursor:"pointer", fontFamily:"system-ui,sans-serif", letterSpacing:1.5, transition:"all .3s" }}>
          {cfPaused ? "▶ TIẾP TỤC" : "⏸ DỪNG"}
        </button>
      </div>

      <div style={{ overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:120, background:`linear-gradient(to right,rgba(255,255,255,0.85),transparent)`, zIndex:2, pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:120, background:`linear-gradient(to left,rgba(255,255,255,0.85),transparent)`, zIndex:2, pointerEvents:"none" }} />
        <div style={{ display:"flex", gap:20, width:"max-content", animation:`scrollCam ${dur}s linear infinite`, animationPlayState: cfPaused ? "paused" : "running", paddingLeft:20 }}>
          {combined.map((cam, i) => {
            const parts = cam.name.split(" ");
            const brandMap = { fujifilm:"FUJIFILM", sony:"SONY", canon:"CANON", nikon:"NIKON", dji:"DJI", gopro:"GOPRO" };
            const b = brandMap[parts[0].toLowerCase()] || parts[0].toUpperCase();
            const m = parts.slice(1).join(" ");
            return (
              <div key={cam.id+"_"+i}
                onMouseEnter={() => setCfPaused(true)}
                onMouseLeave={() => setCfPaused(false)}
                style={{ flexShrink:0, width:280, height:360, borderRadius:20, overflow:"hidden", border:`1px solid ${G}44`, position:"relative", background:BG, cursor:"pointer" }}
                onClick={() => onBook(cam)}>
                <div style={{ position:"absolute", inset:0, zIndex:0 }}><CamImage cam={cam} height={360} /></div>
                <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.4) 50%,rgba(6,6,6,0.1) 100%)", pointerEvents:"none" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:2, padding:"0 20px 20px" }}>
                  <div style={{ fontSize:8,letterSpacing:4,color:"rgba(255,255,255,0.45)",fontFamily:"system-ui,sans-serif",marginBottom:4,fontWeight:600 }}>{b}</div>
                  <div style={{ fontSize:26,fontWeight:700,color:"#fff",lineHeight:1,marginBottom:6,fontFamily:"system-ui,sans-serif",textShadow:"0 2px 12px rgba(0,0,0,0.8)" }}>{m}</div>
                  <div style={{ width:24,height:1,background:G+"88",marginBottom:12 }} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                    <div style={{ display:"flex",flexDirection:"column",lineHeight:1 }}>
                      <span style={{ color:"#fff",fontSize:14,fontWeight:700,fontFamily:"system-ui,sans-serif",textShadow:"0 1px 6px rgba(0,0,0,0.7)" }}>{fmtVND(cam.price)}</span>
                      <span style={{ color:"rgba(255,255,255,0.45)",fontSize:9,marginTop:3,fontFamily:"system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <div className="btn-3d-wrap" style={{ borderRadius:10 }}><button onClick={e=>{e.stopPropagation(); onBook(cam);}} className="btn-3d"
                      style={{ borderRadius:9,fontSize:8,letterSpacing:1.5,padding:"6px 10px",whiteSpace:"nowrap" }}>
                      THUÊ NGAY
                    </button></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MOBILE FAB MENU (draggable floating circle) ──
function MobileFAB({ mobileMenuOpen, setMobileMenuOpen, siteContent, onBook, loggedUser, onOpenLogin, onOpenCustomer, orders }) {
  const fabRef = useRef(null);
  const menuRef = useRef(null);
  const posRef = useRef({ x: 6, y: 8 }); // default: sát góc trên trái
  const [pos, setPos] = useState({ x: 6, y: 8 });
  const [open, setOpen] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const clampPos = (x, y) => {
    const W = window.innerWidth, H = window.innerHeight;
    const size = 37;
    return { x: Math.max(4, Math.min(W - size - 4, x)), y: Math.max(4, Math.min(H - size - 4, y)) };
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.type === "mousedown") return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, origX: posRef.current.x, origY: posRef.current.y, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      const np = clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy);
      posRef.current = np;
      setPos({ ...np });
      if (open) setOpen(false);
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    if (!wasMoved) setOpen(o => !o);
  };

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Tính vị trí menu (popup gần FAB, không ra ngoài màn hình)
  const menuW = 220;
  const menuH = 380;
  let menuX = pos.x + 44;
  let menuY = pos.y;
  if (menuX + menuW > window.innerWidth - 8) menuX = pos.x - menuW - 8;
  if (menuY + menuH > window.innerHeight - 8) menuY = window.innerHeight - menuH - 8;
  if (menuY < 4) menuY = 4;

  return (
    <>
      {/* FAB button — Lens Cap 3D */}
      <div
        ref={fabRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        style={{
          position: "fixed", left: pos.x, top: pos.y, zIndex: 300,
          width: 37, height: 37,
          cursor: "grab", touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          filter: open
            ? `drop-shadow(0 0 10px ${G}66) drop-shadow(0 6px 18px rgba(0,0,0,0.85))`
            : "drop-shadow(0 6px 18px rgba(0,0,0,0.8)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          transition: "filter .25s",
        }}
      >
        <svg viewBox="0 0 62 62" width="37" height="37" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
          <defs>
            {/* Body gradient — dark matte */}
            <radialGradient id="fab-body" cx="38%" cy="30%" r="68%">
              <stop offset="0%"   stopColor={open ? "#3a3020" : "#383838"}/>
              <stop offset="35%"  stopColor={open ? "#201c0e" : "#252525"}/>
              <stop offset="70%"  stopColor={open ? "#131008" : "#181818"}/>
              <stop offset="100%" stopColor="#080808"/>
            </radialGradient>
            {/* Chrome ring gradient */}
            <linearGradient id="fab-chrome" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%"   stopColor="#d0d0d0"/>
              <stop offset="18%"  stopColor="#a8a8a8"/>
              <stop offset="35%"  stopColor="#e8e8e8"/>
              <stop offset="52%"  stopColor="#888"/>
              <stop offset="68%"  stopColor="#c8c8c8"/>
              <stop offset="85%"  stopColor="#606060"/>
              <stop offset="100%" stopColor="#b0b0b0"/>
            </linearGradient>
            {/* Knurl shadow ring */}
            <radialGradient id="fab-knurl-bg" cx="50%" cy="50%" r="50%">
              <stop offset="80%"  stopColor="#0a0a0a"/>
              <stop offset="100%" stopColor="#1a1a1a"/>
            </radialGradient>
            {/* Inner center recess */}
            <radialGradient id="fab-center" cx="42%" cy="35%" r="60%">
              <stop offset="0%"   stopColor={open ? "#2a2415" : "#2a2a2a"}/>
              <stop offset="50%"  stopColor={open ? "#16120a" : "#191919"}/>
              <stop offset="100%" stopColor="#080808"/>
            </radialGradient>
            {/* Top gloss */}
            <radialGradient id="fab-gloss" cx="35%" cy="20%" r="55%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
              <stop offset="60%"  stopColor="rgba(255,255,255,0.04)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </radialGradient>
            {/* Gold accent when open */}
            <radialGradient id="fab-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={G+"55"}/>
              <stop offset="100%" stopColor={G+"00"}/>
            </radialGradient>
          </defs>

          {/* ── Outer shadow disc ── */}
          <circle cx="31" cy="32.5" r="29" fill="rgba(0,0,0,0.45)"/>

          {/* ── Knurled outer ring (serrated bumps) ── */}
          <circle cx="31" cy="31" r="29" fill="url(#fab-knurl-bg)"/>
          {Array.from({length: 36}).map((_, i) => {
            const ang = (i * 10 * Math.PI) / 180;
            const r1 = 26.5, r2 = 29;
            const x1 = 31 + Math.cos(ang) * r1, y1 = 31 + Math.sin(ang) * r1;
            const x2 = 31 + Math.cos(ang) * r2, y2 = 31 + Math.sin(ang) * r2;
            const bAng = ang + (5 * Math.PI / 180);
            const bx1 = 31 + Math.cos(bAng) * r1, by1 = 31 + Math.sin(bAng) * r1;
            const bx2 = 31 + Math.cos(bAng) * r2, by2 = 31 + Math.sin(bAng) * r2;
            const bright = (Math.cos(ang - 0.8) + 1) / 2;
            const col = `rgb(${Math.round(55 + bright*55)},${Math.round(55 + bright*55)},${Math.round(55 + bright*55)})`;
            return (
              <path key={i}
                d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${bx2.toFixed(2)} ${by2.toFixed(2)} L ${bx1.toFixed(2)} ${by1.toFixed(2)} Z`}
                fill={col}
                stroke="rgba(0,0,0,0.55)" strokeWidth="0.3"
              />
            );
          })}

          {/* ── Chrome ring ── */}
          <circle cx="31" cy="31" r="26" fill="url(#fab-chrome)"/>
          <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6"/>
          <circle cx="31" cy="31" r="25.2" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8"/>

          {/* ── Body disc ── */}
          <circle cx="31" cy="31" r="24" fill="url(#fab-body)"/>
          {open && <circle cx="31" cy="31" r="24" fill="url(#fab-gold)"/>}

          {/* ── Body bevel edge ── */}
          <circle cx="31" cy="31" r="24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
          <circle cx="31" cy="31" r="23.2" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.2"/>

          {/* ── Inner recessed circle ── */}
          <circle cx="31" cy="31" r="13" fill="url(#fab-center)"/>
          <circle cx="31" cy="31" r="13" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5"/>
          <circle cx="31" cy="31" r="12.2" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7"/>

          {/* ── Icon ── */}
          {open ? (
            <g transform="translate(31,31)">
              <line x1="-5" y1="-5" x2="5" y2="5" stroke={G} strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="-5" x2="-5" y2="5" stroke={G} strokeWidth="2" strokeLinecap="round"/>
            </g>
          ) : (
            <g transform="translate(31,31)">
              <line x1="-6" y1="-4" x2="6" y2="-4" stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="-6" y1="0"  x2="6" y2="0"  stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="-6" y1="4"  x2="6" y2="4"  stroke="rgba(201,168,76,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
            </g>
          )}

          {/* ── Top gloss highlight ── */}
          <ellipse cx="26" cy="22" rx="10" ry="6" fill="url(#fab-gloss)" opacity="0.7"/>
        </svg>

        {/* Pulse ring khi đóng */}
        {!open && (
          <div style={{
            position: "absolute", inset: -5, borderRadius: "50%",
            border: `1px solid rgba(201,168,76,0.2)`,
            animation: "fabPulse 2.4s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Popup menu */}
      {open && (
        <div ref={menuRef} style={{
          position: "fixed", left: menuX, top: menuY, zIndex: 299,
          width: menuW,
          background: "linear-gradient(160deg, rgba(232,240,248,0.96) 0%, rgba(197,216,236,0.93) 60%, rgba(181,206,230,0.91) 100%)",
          border: "1px solid rgba(255,255,255,0.72)",
          borderRadius: 22,
          backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.85) inset, 0 8px 40px rgba(13,27,42,0.14)",
          padding: "10px 0", animation: "navExpandIn .22s cubic-bezier(.4,0,.2,1)",
          touchAction: "auto",
        }}>
          {/* Nav links */}
          {[["📷 MÁY ẢNH", "cameras"], ["🎒 PHỤ KIỆN", "accessories"], ["💬 FEEDBACK", "feedback"], ["📍 VỀ CHÚNG TÔI", "about"]].map(([t, id]) => (
            <button key={id}
              onClick={() => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setOpen(false); }}
              style={{ width: "100%", background: "none", border: "none", color: TXT, fontSize: 12, letterSpacing: 2, padding: "12px 18px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 10, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
              {t}
            </button>
          ))}

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "6px 14px" }} />

          {/* Đăng nhập / Tài khoản */}
          <button
            onClick={() => { setOpen(false); (loggedUser ? (onOpenCustomer || onOpenLogin) : onOpenLogin)?.(); }}
            style={{ width: "100%", background: "none", border: "none", color: TXT, fontSize: 12, letterSpacing: 2, padding: "12px 18px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 10, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
            {loggedUser ? (
              <>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: G+"22", border: `1.5px solid ${G}55`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
                  {loggedUser.avatar ? <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (loggedUser.displayName || loggedUser.name || "?")[0].toUpperCase()}
                </div>
                {loggedUser.displayName || loggedUser.name}
              </>
            ) : (
              <><span>👤</span> ĐĂNG NHẬP</>
            )}
          </button>

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "6px 14px" }} />

          {/* Gửi yêu cầu thuê */}
          <button
            onClick={() => { setOpen(false); onBook?.(); }}
            style={{ width: "calc(100% - 28px)", margin: "4px 14px", background: "linear-gradient(135deg,#5a5a6e 0%,#c8c8dc 50%,#4a4a60 100%)", border: "none", color: "#0a0a18", fontSize: 9, letterSpacing: 2.5, padding: "10px 14px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontWeight: 700, textAlign: "center", borderRadius: 12, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
            GỬI YÊU CẦU THUÊ
          </button>

          {/* Tra cứu đơn */}
          <button
            onClick={() => { setOpen(false); setTimeout(() => { const el = document.querySelector("[data-tracuu]"); el?.click(); }, 100); }}
            style={{ width: "calc(100% - 28px)", margin: "6px 14px 8px", background: "rgba(13,27,42,0.08)", border: `1px solid rgba(13,27,42,0.18)`, color: TXT, fontSize: 9, letterSpacing: 2.5, padding: "10px 14px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontWeight: 700, textAlign: "center", borderRadius: 12, touchAction: "manipulation", WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            TRA CỨU ĐƠN
          </button>

          <div style={{ height: 1, background: "rgba(13,27,42,0.12)", margin: "4px 14px 8px" }} />

          {/* Social links */}
          <div style={{ display: "flex", gap: 8, padding: "2px 18px 6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: MUT, fontSize: 9, letterSpacing: 2, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>FOLLOW</span>
            {[
              { key: "youtube", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
              { key: "facebook", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
              { key: "tiktok", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/></svg> },
              { key: "instagram", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
            ].map(({ key, icon }) => {
              const url = siteContent?.socialLinks?.[key];
              return (
                <button key={key} onClick={() => { if (url) window.open(url, "_blank"); }}
                  style={{ opacity: url ? 1 : 0.3, cursor: url ? "pointer" : "default", width: 32, height: 32, borderRadius: 12, background: "rgba(13,27,42,0.08)", border: "1px solid rgba(13,27,42,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: TXT, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fabPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ── DESKTOP FAB (draggable camera-dial button, desktop only) ──
function DesktopFAB({ onOpen, visible }) {
  const SIZE = 46;
  const DOT  = 10;

  // dragged=false → dùng right:18,top:18 (CSS thuần, luôn đúng góc)
  // dragged=true  → dùng left/top tính từ drag
  const [dragged, setDragged]   = useState(false);
  const [pos, setPos]           = useState({ x: 0, y: 18 });
  const [hovered, setHovered]   = useState(false);
  const posRef  = useRef({ x: 0, y: 18 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const clamp = (x, y) => ({
    x: Math.max(8, Math.min(window.innerWidth  - SIZE - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - SIZE - 8, y)),
  });

  const onPointerDown = (e) => {
    if (!visible) return;
    if (e.button !== undefined && e.button !== 0) return;
    // Lần đầu drag: chuyển đổi right → left
    const rect = e.currentTarget.getBoundingClientRect();
    const origX = dragged ? posRef.current.x : rect.left;
    const origY = dragged ? posRef.current.y : rect.top;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX, origY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      const np = clamp(dragRef.current.origX + dx, dragRef.current.origY + dy);
      posRef.current = np;
      setPos({ ...np });
      if (!dragged) setDragged(true);
    }
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    if (!wasMoved && visible) onOpen();
  };

  const G2 = "#c9a84c";
  const C  = SIZE / 2;
  const teeth = Array.from({ length: 32 }, (_, i) => {
    const ang = (i * 11.25 * Math.PI) / 180;
    const r1 = C - 4.5, r2 = C - 1;
    const x1 = C + Math.cos(ang)*r1, y1 = C + Math.sin(ang)*r1;
    const x2 = C + Math.cos(ang)*r2, y2 = C + Math.sin(ang)*r2;
    const bA  = ang + (5.625 * Math.PI / 180);
    const bx1 = C + Math.cos(bA)*r1, by1 = C + Math.sin(bA)*r1;
    const bx2 = C + Math.cos(bA)*r2, by2 = C + Math.sin(bA)*r2;
    const v = Math.round(48 + ((Math.cos(ang - 0.8) + 1) / 2) * 58);
    return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${bx2.toFixed(1)} ${by2.toFixed(1)} L${bx1.toFixed(1)} ${by1.toFixed(1)}Z`, v };
  });

  // Vị trí base: CSS right khi chưa kéo, left khi đã kéo
  const baseStyle = dragged
    ? { left: pos.x, top: pos.y }
    : { right: 18,   top: 18 };

  // Dot offset tính từ cùng góc
  const dotStyle = dragged
    ? { left: pos.x + (SIZE - DOT) / 2, top: pos.y + (SIZE - DOT) / 2 }
    : { right: 18 + (SIZE - DOT) / 2,   top: 18 + (SIZE - DOT) / 2 };

  return (
    <>
      {/* DOT nhỏ khi nav đang mở */}
      <div
        onClick={() => { if (!visible) onOpen(); }}
        style={{
          position: "fixed", zIndex: 9999,
          ...dotStyle,
          width: DOT, height: DOT, borderRadius: "50%",
          background: G2, boxShadow: `0 0 6px ${G2}99`,
          cursor: "pointer",
          pointerEvents: visible ? "none" : "all",
          opacity: visible ? 0 : 1,
          transform: visible ? "scale(0)" : "scale(1)",
          transition: "opacity .25s, transform .25s",
        }}
      />

      {/* Nút camera dial đầy đủ */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed", zIndex: 9999,
          ...baseStyle,
          width: SIZE, height: SIZE,
          cursor: "grab", userSelect: "none",
          pointerEvents: visible ? "all" : "none",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.2)",
          filter: hovered
            ? `drop-shadow(0 0 8px ${G2}66) drop-shadow(0 4px 14px rgba(0,0,0,0.9))`
            : "drop-shadow(0 4px 12px rgba(0,0,0,0.85))",
          transition: "opacity .25s, transform .25s, filter .2s",
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
          <defs>
            <radialGradient id="dfab-body" cx="38%" cy="30%" r="68%">
              <stop offset="0%"   stopColor={hovered ? "#3a3020" : "#363636"} />
              <stop offset="40%"  stopColor={hovered ? "#201c0e" : "#222"} />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
            <linearGradient id="dfab-chrome" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%"   stopColor="#d8d8d8" /><stop offset="20%" stopColor="#aaa" />
              <stop offset="38%"  stopColor="#eee"    /><stop offset="55%" stopColor="#777" />
              <stop offset="72%"  stopColor="#c8c8c8" /><stop offset="88%" stopColor="#555" />
              <stop offset="100%" stopColor="#b0b0b0" />
            </linearGradient>
            <radialGradient id="dfab-knurl" cx="50%" cy="50%" r="50%">
              <stop offset="78%"  stopColor="#080808" />
              <stop offset="100%" stopColor="#1c1c1c" />
            </radialGradient>
            <radialGradient id="dfab-center" cx="40%" cy="33%" r="60%">
              <stop offset="0%"   stopColor={hovered ? "#28220e" : "#282828"} />
              <stop offset="55%"  stopColor={hovered ? "#14100a" : "#181818"} />
              <stop offset="100%" stopColor="#060606" />
            </radialGradient>
            <radialGradient id="dfab-gloss" cx="32%" cy="18%" r="52%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.17)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="dfab-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={hovered ? G2 + "44" : G2 + "00"} />
              <stop offset="100%" stopColor={G2 + "00"} />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C+1.2} r={C-1}    fill="rgba(0,0,0,0.38)" />
          <circle cx={C} cy={C}     r={C-1}    fill="url(#dfab-knurl)" />
          {teeth.map((t, i) => (
            <path key={i} d={t.d} fill={`rgb(${t.v},${t.v},${t.v})`} stroke="rgba(0,0,0,0.48)" strokeWidth="0.25" />
          ))}
          <circle cx={C} cy={C} r={C-5}   fill="url(#dfab-chrome)" />
          <circle cx={C} cy={C} r={C-5.6} fill="none" stroke="rgba(0,0,0,0.4)"          strokeWidth="0.7" />
          <circle cx={C} cy={C} r={C-7}   fill="url(#dfab-body)" />
          <circle cx={C} cy={C} r={C-7}   fill="url(#dfab-gold)" />
          <circle cx={C} cy={C} r={C-7.8} fill="none" stroke="rgba(0,0,0,0.5)"          strokeWidth="0.9" />
          <circle cx={C} cy={C} r={C-13}  fill="url(#dfab-center)" />
          <circle cx={C} cy={C} r={C-13}  fill="none" stroke="rgba(0,0,0,0.6)"          strokeWidth="1.1" />
          <circle cx={C} cy={C} r={C-13.8}fill="none" stroke="rgba(255,255,255,0.07)"   strokeWidth="0.5" />
          {[-3.5, 0, 3.5].map((dy, i) => (
            <line key={i} x1={C-5} y1={C+dy} x2={C+5} y2={C+dy}
              stroke={hovered ? G2 : "rgba(201,168,76,0.82)"} strokeWidth="1.4" strokeLinecap="round" />
          ))}
          <ellipse cx={C-4} cy={C-7} rx="7" ry="4" fill="url(#dfab-gloss)" opacity="0.6" />
        </svg>
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.14)",
          animation: hovered ? "none" : "fabPulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}

// ── HOMEPAGE ──
// ── STAT COUNT-UP ──
function useCountUp(target, duration = 1400, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const num = parseFloat(target.replace(/[^0-9.]/g, "")) || 0;
    const raf = (ts) => {
      if (!startTime) startTime = ts;
      const prog = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(Math.round(num * ease));
      if (prog < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [started, target, duration]);
  const suffix = target.replace(/[0-9.]/g, "");
  return val + suffix;
}

const STAT_ICONS = {
  "Lượt thuê / tháng": (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  "Loại thiết bị": (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <circle cx="12" cy="10" r="3"/>
      <circle cx="12" cy="10" r="6" strokeDasharray="2 2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  "Khách hài lòng": (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
};

function StatCard({ icon, num, label, delay = 0, compact = false }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTimeout(() => setStarted(true), delay); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  const display = useCountUp(num, 1600, started);
  return (
    <div ref={ref} style={{
      padding: compact ? "16px 8px" : "36px 20px", border: "1px solid rgba(255,255,255,0.60)", borderRadius: compact ? 14 : 20,
      background: "linear-gradient(160deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 60%, rgba(181,206,230,0.76) 100%)",
      backdropFilter: "blur(28px) saturate(160%) brightness(1.04)", WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 6 : 14,
      transition: "all .28s cubic-bezier(.34,1.56,.64,1)",
      position: "relative", overflow: "hidden",
      boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 20px rgba(13,27,42,0.10)",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 1px 0 rgba(255,255,255,0.90) inset, 0 12px 40px rgba(13,27,42,0.18)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 20px rgba(13,27,42,0.10)"; }}
    >
      {/* Glow backdrop */}
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:120, height:80, background:`radial-gradient(ellipse,rgba(13,27,42,0.06),transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ color: G, opacity: 0.75, fontSize: compact ? 20 : undefined }}>{icon}</div>
      <div style={{ fontSize: compact ? 22 : 40, fontWeight: 800, color: G, fontFamily: "var(--font-ui)", lineHeight: 1, letterSpacing: -1, textShadow: "0 1px 3px rgba(13,27,42,0.12)" }}>{display}</div>
      <div style={{ fontSize: compact ? 8 : 10, color: G, opacity: 0.55, letterSpacing: compact ? 1 : 3, fontFamily: "var(--font-ui)", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{label.toUpperCase()}</div>
    </div>
  );
}

// ── SECRET TITLE (easter egg — hover / press-hold để lộ mã KM) ──
function SecretTitle({ defaultText, secretText, isMobile, fontSize }) {
  const [revealed, setRevealed] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const holdRef = useRef(null);
  const hasSecret = secretText && secretText.trim().length > 0;

  const reveal = () => {
    if (!hasSecret) return;
    setGlitching(true);
    setTimeout(() => { setRevealed(true); setGlitching(false); }, 320);
  };
  const hide = () => {
    if (!hasSecret) return;
    setGlitching(true);
    setTimeout(() => { setRevealed(false); setGlitching(false); }, 320);
  };

  // desktop
  const onMouseEnter = () => reveal();
  const onMouseLeave = () => hide();

  // mobile — press & hold 400ms
  const onTouchStart = () => {
    holdRef.current = setTimeout(() => reveal(), 400);
  };
  const onTouchEnd = () => {
    clearTimeout(holdRef.current);
    setTimeout(() => hide(), 1200);
  };

  const display = revealed ? secretText : defaultText;

  return (
    <>
      <style>{`
        @keyframes glitchShift {
          0%   { clip-path: inset(0 0 85% 0); transform: translate(-4px,0); opacity:1; }
          20%  { clip-path: inset(30% 0 50% 0); transform: translate(4px,0); }
          40%  { clip-path: inset(60% 0 20% 0); transform: translate(-3px,0); }
          60%  { clip-path: inset(10% 0 70% 0); transform: translate(3px,0); }
          80%  { clip-path: inset(80% 0 5%  0); transform: translate(-2px,0); }
          100% { clip-path: inset(0 0 0   0); transform: translate(0,0); opacity:0; }
        }
        .secret-title { position: relative; cursor: ${hasSecret ? "pointer" : "default"}; display: inline-block; user-select: none; }
        .secret-title::before, .secret-title::after {
          content: attr(data-text);
          position: absolute; left: 0; top: 0; width: 100%;
          overflow: hidden; pointer-events: none;
          opacity: 0;
        }
        .secret-title.glitching::before {
          opacity: 1;
          color: #2E2E2E; text-shadow: -3px 0 #ff003c;
          animation: glitchShift 0.32s steps(1) forwards;
        }
        .secret-title.glitching::after {
          opacity: 1;
          color: #2E2E2E; text-shadow: 3px 0 #00e5ff;
          animation: glitchShift 0.32s steps(1) reverse forwards;
        }
        .secret-title.revealed {
          color: #c9a84c;
          text-shadow: 0 0 24px rgba(201,168,76,0.7), 0 0 48px rgba(201,168,76,0.3);
        }
      `}</style>
      <h2
        className={`secret-title${glitching ? " glitching" : ""}${revealed ? " revealed" : ""}`}
        data-text={display}
        onMouseEnter={!isMobile ? onMouseEnter : undefined}
        onMouseLeave={!isMobile ? onMouseLeave : undefined}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        style={{
          fontSize, fontWeight: 400, letterSpacing: revealed ? 6 : 2,
          marginBottom: 28, fontFamily: "var(--font-display)",
          transition: "color .3s, text-shadow .3s, letter-spacing .4s",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {display}
      </h2>
    </>
  );
}

function HeroTagline({ isMobile }) {
  const FULL_TEXT = "Trải nghiệm máy ảnh · Bắt trọn khoảnh khắc";
  const { displayed, done } = useTypewriter(FULL_TEXT, 52, 600);
  return (
    <div style={{ marginTop: 20, marginBottom: 32, fontSize: isMobile ? 14 : 18, letterSpacing: isMobile ? 2 : 3, color: "#c0b8a8", fontFamily: 'var(--font-display)', fontStyle: "italic", fontWeight: 300, lineHeight: 2, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
      <span className="text-type">{displayed}</span>
      <span className={`text-type__cursor${done ? " text-type__cursor--hidden" : ""}`}>|</span>
    </div>
  );
}

function HomePage({ cameras, accessories, siteContent, orders, onBook, onAdmin, isMobile, photos, feedbacks, loggedUser, onOpenLogin, onOpenCustomer }) {
  const [scrollY, setScrollY] = useState(0);
  const [scrollDir, setScrollDir] = useState("up");
  const prevScrollY = useRef(0);
  const scrollRaf = useRef(null);
  const [hov, setHov] = useState(null);
  const [ticker, setTicker] = useState(0);
  const [logoClick, setLogoClick] = useState(0);
  const [logoRipple, setLogoRipple] = useState(false);
  const [bracketSpread, setBracketSpread] = useState(false);
  const handleBracketClick = () => { setBracketSpread(true); setTimeout(() => setBracketSpread(false), 500); };
  // ── Typewriter cho 2 dòng subtitle + tagline ──
  const tw1 = useTypewriter("DỊCH VỤ CHO THUÊ MÁY ẢNH · NÚI THÀNH · TAM KỲ", 38, 600);
  const tw2 = useTypewriter("Trải nghiệm máy ảnh · Bắt trọn khoảnh khắc", 42, tw1.done ? 100 : 99999);
  const handleLogoClick = () => {
    const n = logoClick + 1;
    setLogoClick(n);
    if (n >= 5) { setLogoClick(0); onAdmin(); return; }
    // Ripple → reload
    setLogoRipple(true);
    setTimeout(() => { window.location.reload(); }, 700);
  };
  useEffect(() => {
    const h = () => {
      if (scrollRaf.current) return;
      scrollRaf.current = requestAnimationFrame(() => {
        scrollRaf.current = null;
        const curr = window.scrollY;
        if (curr > prevScrollY.current + 8) setScrollDir("down");
        else if (curr < prevScrollY.current - 8) setScrollDir("up");
        prevScrollY.current = curr;
        setScrollY(curr);
      });
    };
    window.addEventListener("scroll", h, { passive: true });
    const t = setInterval(() => setTicker(p => (p + 1) % cameras.length), 3000);
    return () => { window.removeEventListener("scroll", h); clearInterval(t); if (scrollRaf.current) { cancelAnimationFrame(scrollRaf.current); scrollRaf.current = null; } };
  }, [cameras.length]);
  // navState: "top" | "visible" | "compact"
  const navState = scrollY < 60 ? "top" : (scrollDir === "up" ? "visible" : "compact");
  const marquee = cameras.map(c => `${c.icon || "📷"} ${c.name}`);

  const [navForceOpen, setNavForceOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Đóng nav khi cuộn xuống
  useEffect(() => { if (scrollDir === "down") setNavForceOpen(false); }, [scrollDir]);
  // Đóng menu khi cuộn
  useEffect(() => { if (scrollDir === "down" && mobileMenuOpen) setMobileMenuOpen(false); }, [scrollDir, mobileMenuOpen]);
  // Luôn collapsed trừ khi user bấm mở
  const isCollapsed = !navForceOpen;

  return (
    <div style={{ position: "relative", zIndex: 1, fontFamily: 'var(--font-display)', color: TXT }}>
      {/* NAV */}
      <nav className="nav92" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: isMobile ? "8px 10px" : "12px 16px", display: "flex", justifyContent: "center", pointerEvents: "none" }}>



        {/* ── DESKTOP: full bar (chỉ hiện khi mở) ── */}
        {!isMobile && (
          <>
            {!isCollapsed && (
              <>
              <div style={{ position: "fixed", inset: 0, zIndex: 49, background: "transparent" }} onClick={() => setNavForceOpen(false)} />
              <div className={`nav-inner${navState !== "top" ? " scrolled" : ""}`}
                style={{ pointerEvents: "all", display: "flex", alignItems: "center", padding: "0 20px", height: 45, gap: 0, width: "100%", overflow: "visible", animation: "navExpandIn .38s cubic-bezier(.4,0,.2,1)", transformOrigin: "top center" }}>
                <div onClick={handleLogoClick} style={{ cursor: "pointer", flexShrink: 0, marginRight: 16, position: "relative", display: "flex", alignItems: "center", alignSelf: "center" }}>
                  <Logo size={0.58} />
                  {logoRipple && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 40, left: 80, width: "200vmax", height: "200vmax", borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.06) 40%, transparent 70%)`, animation: "logoRipple 0.7s cubic-bezier(.2,0,.4,1) forwards", pointerEvents: "none" }} />
                      <div style={{ position: "absolute", inset: 0, background: BG, animation: "pageWash 0.7s ease forwards", pointerEvents: "none" }} />
                    </div>
                  )}
                </div>
                <div className="nav-div" style={{ marginRight: 16 }} />
                {[["MÁY ẢNH", "cameras"], ["PHỤ KIỆN", "accessories"], ["FEEDBACK", "feedback"], ["VỀ CHÚNG TÔI", "about"]].map(([t, id]) => (
                  <button key={t} className="nav-link"
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    style={{ marginRight: 20 }}>{t}</button>
                ))}
                <div className="nav-div" />
                <div style={{ flex: 1 }} />
                <div className="nav-div" style={{ marginRight: 16 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {loggedUser ? (
                    <button onClick={onOpenCustomer || onOpenLogin}
                      style={{ color: G, fontSize: 11, background: G + "15", border: `1px solid ${G}44`, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", letterSpacing: 1, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 7, boxShadow: `0 2px 8px ${G}22`, flexShrink: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: G + "33", border: `1px solid ${G}55`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                        {loggedUser.avatar ? <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : loggedUser.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loggedUser.displayName || loggedUser.name}</span>
                    </button>
                  ) : (
                    <button onClick={onOpenLogin}
                      style={{ color: "#3a3836", fontSize: 10, background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.14)", padding: "8px 18px 8px 13px", borderRadius: 99, cursor: "pointer", letterSpacing: 2, transition: "all .2s", fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, whiteSpace: "nowrap", fontWeight: 600 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.28)"; e.currentTarget.style.background = "rgba(0,0,0,0.10)"; e.currentTarget.style.color = "#111"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)"; e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#3a3836"; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      ĐĂNG NHẬP
                    </button>
                  )}
                  <div className="btn-3d-wrap" style={{ borderRadius:16, flexShrink:0 }}><button className="btn-3d" onClick={onBook} style={{ fontSize: 11, padding: "10px 22px", letterSpacing: 3, whiteSpace: "nowrap" }}>GỬI YÊU CẦU THUÊ</button></div>
                  <button onClick={() => setNavForceOpen(false)}
                    style={{ marginLeft: 12, width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "#aaa", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                </div>
              </div>
              </>
            )}
          </>
        )}
      </nav>

      {/* ── DESKTOP FAB — luôn render, ẩn/hiện bằng CSS để không bị unmount ── */}
      {!isMobile && (
        <DesktopFAB onOpen={() => setNavForceOpen(true)} visible={isCollapsed} />
      )}

      {/* ── MOBILE FAB MENU (floating draggable circle) ── */}
      {isMobile && <MobileFAB
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        siteContent={siteContent}
        onBook={onBook}
        loggedUser={loggedUser}
        onOpenLogin={onOpenLogin}
        onOpenCustomer={onOpenCustomer}
        orders={orders}
      />}

      {/* HERO — PREMIUM JAPAN MINIMAL */}
      <div style={{ height:"100vh", position:"relative", overflow:"hidden", userSelect:"none", display:"flex", alignItems:"center" }}>

        {/* ── Social icons — top left ── */}
        {!isMobile && (
          <div style={{ position:"absolute", top:28, left:44, display:"flex", gap:10, zIndex:10 }}>
            {[
              {k:"youtube",   label:"YouTube",   glow:"#ff3c3c", glowShadow:"#ff3c3c", border:"#ff3c3c", path:<path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>, fill:true},
              {k:"facebook",  label:"Facebook",  glow:"#1877f2", glowShadow:"#1877f2", border:"#1877f2", path:<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>, fill:true},
              {k:"tiktok",    label:"TikTok",    glow:"#000000", glowShadow:"#000000", border:"#000000", path:<path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/>, fill:true},
              {k:"instagram", label:"Instagram", glow:"#e1306c", glowShadow:"#e1306c", border:"#e1306c", stroke:true},
            ].map(s=>{
              const url = siteContent.socialLinks?.[s.k];
              return (
                <button key={s.k}
                  title={url ? `Mở ${s.label} ↗` : `${s.label} — chưa cài link (Admin → Cài đặt)`}
                  onClick={()=>url&&window.open(url,"_blank")}
                  style={{ width:36,height:36,borderRadius:"50%",background:"rgba(10,10,10,0.72)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:url?"pointer":"default",color:"rgba(255,255,255,0.55)",opacity:1,transition:"all .25s cubic-bezier(.34,1.56,.64,1)",backdropFilter:"blur(8px)",boxShadow:"0 2px 10px rgba(0,0,0,0.35)" }}
                  onMouseEnter={e=>{const el=e.currentTarget;el.style.transform="translateY(-4px) scale(1.18)";el.style.background=s.glow+"cc";el.style.borderColor=s.border;el.style.color="#fff";el.style.boxShadow=`0 0 18px ${s.glowShadow},0 0 36px ${s.glowShadow}66,0 6px 20px rgba(0,0,0,0.4)`;}}
                  onMouseLeave={e=>{const el=e.currentTarget;el.style.transform="translateY(0) scale(1)";el.style.background="rgba(10,10,10,0.72)";el.style.borderColor="rgba(255,255,255,0.12)";el.style.color="rgba(255,255,255,0.55)";el.style.boxShadow="0 2px 10px rgba(0,0,0,0.35)";el.style.opacity=url?"1":"0.38";}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={s.fill?"currentColor":"none"} stroke={s.stroke?"currentColor":"none"} strokeWidth={s.stroke?"2":"0"} strokeLinecap="round" strokeLinejoin="round">
                    {s.path||<><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>}
                  </svg>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main hero content ── */}
        <div style={{
          position:"relative", zIndex:5, width:"100%", height:"100%",
          display:"flex", alignItems:"center",
          justifyContent: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          padding: isMobile ? "12px 28px 24px" : "0 0 14% 0",
          gap: isMobile ? 20 : 0,
        }}>

          {/* ── LEFT: Premium branding block ── */}
          <div style={{
            ...(isMobile ? {
              flex:"0 0 auto", width:"100%",
              display:"flex", flexDirection:"column",
              alignItems:"center", textAlign:"center",
              animation:"heroFadeIn 1.1s cubic-bezier(.25,.46,.45,.94) both",
              order: 2,
            } : {
              position:"absolute", left:"4%", top:"48%",
              display:"flex", flexDirection:"column",
              alignItems:"flex-start", textAlign:"left",
              transform:"scale(0.60)",
              transformOrigin:"left top",
              zIndex:10,
              animation:"heroFadeIn 1.1s cubic-bezier(.25,.46,.45,.94) both",
            }),
          }}>

            {/* ── LOGO ── */}
            <div style={{ filter:"drop-shadow(0 4px 24px rgba(0,0,0,0.08))" }}>
              <div
                onClick={handleBracketClick}
                style={{
                  display:"inline-flex", alignItems:"center",
                  fontFamily:'"Palatino Linotype","Book Antiqua","Palatino",Georgia,"Times New Roman",serif',
                  color:"#141414", lineHeight:1, cursor:"pointer",
                }}>
                {/* Left bracket — SVG để tránh flicker iOS */}
                {(() => {
                  const bw = isMobile?14:26, bh = isMobile?42:72, sw = 5;
                  const tx = bracketSpread ? (isMobile?-8:-14) : 0;
                  const tyT = bracketSpread ? (isMobile?-8:-14) : 0;
                  const tyB = bracketSpread ? (isMobile?8:14) : 0;
                  return (
                    <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{ flexShrink:0, marginRight: isMobile?10:16, overflow:"visible" }}>
                      {/* Top half */}
                      <path
                        d={`M ${bw} ${sw/2} L ${sw/2} ${sw/2} L ${sw/2} ${bh/2}`}
                        fill="none" stroke="rgba(20,20,20,0.82)" strokeWidth={sw} strokeLinecap="square"
                        style={{ transform:`translate(${tx}px,${tyT}px)`, transition: bracketSpread?"none":"transform 0.5s cubic-bezier(.4,0,.2,1)", willChange:"transform" }}
                      />
                      {/* Bottom half */}
                      <path
                        d={`M ${sw/2} ${bh/2} L ${sw/2} ${bh-sw/2} L ${bw} ${bh-sw/2}`}
                        fill="none" stroke="rgba(20,20,20,0.82)" strokeWidth={sw} strokeLinecap="square"
                        style={{ transform:`translate(${tx}px,${tyB}px)`, transition: bracketSpread?"none":"transform 0.5s cubic-bezier(.4,0,.2,1)", willChange:"transform" }}
                      />
                    </svg>
                  );
                })()}

                {/* Text */}
                <span style={{ fontSize: isMobile?30:48, fontWeight:400, letterSpacing: isMobile?1:2, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center" }}>
                  <span>92</span>
                  <span style={{ marginLeft: isMobile?10:18 }}>KA</span>
                  <span style={{ marginLeft: isMobile?10:18 }}>MÊ</span>
                  <span style={{ marginLeft: isMobile?10:18 }}>RA</span>
                  {/* REC dot */}
                  <span style={{
                    display:"inline-block", width: isMobile?7:11, height: isMobile?7:11, borderRadius:"50%",
                    background:"radial-gradient(circle at 38% 34%, #ff5050 0%, #cc0000 52%, #820000 100%)",
                    boxShadow:"0 0 7px rgba(210,0,0,0.72), 0 0 14px rgba(210,0,0,0.32), 0 0 28px rgba(210,0,0,0.12), inset 0 1px 0 rgba(255,155,155,0.5)",
                    marginLeft: isMobile?3:5, flexShrink:0, position:"relative", top: isMobile?-9:-14,
                    animation:"recPulse 2.4s ease-in-out infinite",
                  }}/>
                </span>

                {/* Right bracket — SVG */}
                {(() => {
                  const bw = isMobile?14:26, bh = isMobile?42:72, sw = 5;
                  const tx = bracketSpread ? (isMobile?8:14) : 0;
                  const tyT = bracketSpread ? (isMobile?-8:-14) : 0;
                  const tyB = bracketSpread ? (isMobile?8:14) : 0;
                  return (
                    <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{ flexShrink:0, marginLeft: isMobile?10:16, overflow:"visible" }}>
                      {/* Top half */}
                      <path
                        d={`M 0 ${sw/2} L ${bw-sw/2} ${sw/2} L ${bw-sw/2} ${bh/2}`}
                        fill="none" stroke="rgba(20,20,20,0.82)" strokeWidth={sw} strokeLinecap="square"
                        style={{ transform:`translate(${tx}px,${tyT}px)`, transition: bracketSpread?"none":"transform 0.5s cubic-bezier(.4,0,.2,1)", willChange:"transform" }}
                      />
                      {/* Bottom half */}
                      <path
                        d={`M ${bw-sw/2} ${bh/2} L ${bw-sw/2} ${bh-sw/2} L 0 ${bh-sw/2}`}
                        fill="none" stroke="rgba(20,20,20,0.82)" strokeWidth={sw} strokeLinecap="square"
                        style={{ transform:`translate(${tx}px,${tyB}px)`, transition: bracketSpread?"none":"transform 0.5s cubic-bezier(.4,0,.2,1)", willChange:"transform" }}
                      />
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* ── SUBTITLE — 1 dòng desktop ── */}
            <div style={{
              marginTop: isMobile?20:22,
              fontSize: isMobile?10:11, letterSpacing: isMobile?2.5:3,
              fontFamily:"var(--font-ui)", color:"#2a2825", fontWeight:700,
              whiteSpace: isMobile?"normal":"nowrap", lineHeight: isMobile?2:1,
              minHeight: isMobile?"auto":16,
            }}>
              <span>{tw1.displayed}<span style={{ opacity: tw1.done ? 0 : 1, transition:"opacity .3s" }}>▌</span></span>
            </div>

            {/* ── TAGLINE ── */}
            <div style={{
              marginTop: isMobile?14:14,
              fontSize: isMobile?13:15, fontStyle:"italic", color:"#3d3a37",
              fontFamily:'"Palatino Linotype","Book Antiqua","Palatino",Georgia,serif',
              letterSpacing:0.3, lineHeight:1.6, fontWeight:400,
              minHeight: isMobile?"auto":20,
            }}>
              <span>{tw2.displayed}<span style={{ opacity: tw2.done || !tw1.done ? 0 : 1, transition:"opacity .3s" }}>▌</span></span>
            </div>

            {/* ── CTAs ── */}
            <div style={{ display:"flex", alignItems:"center", gap: isMobile?8:12, flexWrap:"nowrap", justifyContent: isMobile?"center":"flex-start", marginTop: isMobile?22:32 }}>
              <div className="btn-hero-wrap"
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 32px rgba(200,200,240,0.55), 0 0 64px rgba(200,200,240,0.2)";e.currentTarget.style.transform="translateY(-3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 0 18px rgba(200,200,240,0.15)";e.currentTarget.style.transform="translateY(0)";}}
                style={{ transition:"all .28s cubic-bezier(.4,0,.2,1)", flexShrink:0 }}>
              <button onClick={onBook}
                style={{
                  background:"linear-gradient(135deg,#5a5a6e 0%,#c8c8dc 50%,#4a4a60 100%)",
                  color:"#0a0a18",
                  border:"none",
                  padding: isMobile?"9px 16px":"14px 32px",
                  fontSize: isMobile?7.5:8.5, letterSpacing: isMobile?2:3, fontFamily:"system-ui,sans-serif",
                  fontWeight:700, cursor:"pointer", borderRadius:12,
                  transition:"filter .2s", whiteSpace:"nowrap", lineHeight:1,
                  boxShadow:"none",
                  position:"relative",
                }}
                onMouseEnter={e=>{e.currentTarget.style.filter="brightness(1.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.filter="brightness(1)";}}>
                GỬI YÊU CẦU THUÊ
              </button>
              </div>
              <OrderLookupWidget orders={orders} compact={isMobile}/>
            </div>
          </div>

          {/* ── CENTER: 3D Lens ── */}
          <div style={{
            width:"100%", height: isMobile ? "auto" : "100%",
            display:"flex", alignItems:"center", justifyContent:"center",
            animation:"heroFadeIn 1.3s cubic-bezier(.25,.46,.45,.94) .15s both",
            ...(isMobile ? { order: 1, flexShrink: 0 } : {}),
          }}>
            <CameraLens3D
              onBook={onBook}
              loggedUser={loggedUser}
              onOpenLogin={onOpenLogin}
              onOpenCustomer={onOpenCustomer}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* ── Scroll indicator ── */}
        <div style={{ position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, zIndex:6, animation:"floatY 2.2s ease-in-out infinite" }}>
          <div style={{ width:"0.5px", height:32, background:"linear-gradient(to bottom,transparent,rgba(0,0,0,0.28))" }}/>
          <div style={{ fontSize:7, color:"#b0aba6", letterSpacing:3.5, fontFamily:"system-ui,sans-serif", fontWeight:500 }}>SCROLL</div>
        </div>

        {/* recPulse keyframe */}
        <style>{`@keyframes recPulse{0%,100%{opacity:1;box-shadow:0 0 7px rgba(210,0,0,0.72),0 0 14px rgba(210,0,0,0.32),0 0 28px rgba(210,0,0,0.12)}50%{opacity:0.82;box-shadow:0 0 4px rgba(210,0,0,0.5),0 0 8px rgba(210,0,0,0.2),0 0 18px rgba(210,0,0,0.08)}}`}</style>
      </div>

      {/* CAMERAS — Featured Carousel */}
      <CameraFeatured id="cameras" cameras={cameras} orders={orders} onBook={onBook} isMobile={isMobile} />

      {/* ACCESSORIES — dark cinematic glass */}
      <style>{`
        .acc-section { position:relative; overflow:hidden; border-radius:28px; border:1px solid rgba(255,255,255,0.22); box-shadow:0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset; }
        .acc-section::before {
          content:''; position:absolute; inset:0;
          background: rgba(255,255,255,0.13);
          backdrop-filter: blur(52px) saturate(180%) brightness(1.04);
          -webkit-backdrop-filter: blur(52px) saturate(180%) brightness(1.04);
          z-index:0;
        }
        .acc-card {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.30);
          border-radius: 20px;
          padding: 22px 18px;
          text-align: center;
          cursor: pointer;
          transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s ease, border-color .28s ease, background .28s ease;
          backdrop-filter: blur(20px) saturate(130%);
          -webkit-backdrop-filter: blur(20px) saturate(130%);
          position: relative; overflow: hidden;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.9) inset,
            0 -1px 0 rgba(13,27,42,0.06) inset,
            0 4px 24px rgba(13,27,42,0.10);
        }
        .acc-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent);
        }
        .acc-card:hover {
          transform: translateY(-6px) scale(1.025);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 -1px 0 rgba(13,27,42,0.06) inset,
            0 20px 56px rgba(13,27,42,0.18),
            0 0 0 1px rgba(13,27,42,0.16);
          background: rgba(255,255,255,0.85);
          border-color: rgba(13,27,42,0.22);
        }
        .acc-icon-wrap {
          width:48px; height:48px; border-radius:50%; margin:0 auto 16px;
          background: rgba(255,255,255,0.80);
          border: 1px solid rgba(13,27,42,0.14);
          display:flex; align-items:center; justify-content:center;
          font-size:20px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 12px rgba(13,27,42,0.10);
        }
      `}</style>
      <div id="accessories" className="acc-section" style={{ padding: isMobile ? "52px 20px 64px" : "80px 72px 96px", margin: isMobile ? "20px 12px" : "32px 20px" }}>
        <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(120,120,160,0.07) 0%,transparent 70%)", top:"-10%", left:"58%", pointerEvents:"none", zIndex:1 }} />
        <div style={{ position:"absolute", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(80,80,120,0.05) 0%,transparent 70%)", bottom:"5%", left:"8%", pointerEvents:"none", zIndex:1 }} />
        <div style={{ position:"relative", zIndex:2 }}>
          <div style={{ textAlign:"center", marginBottom: isMobile ? 36 : 56 }}>
            <div style={{ fontSize:9, letterSpacing:7, color:G, opacity:0.55, marginBottom:16, fontFamily:"var(--font-ui)", fontWeight:700 }}>PHỤ KIỆN</div>
            <h2 style={{ fontSize: isMobile ? 26 : 38, fontWeight:700, letterSpacing: isMobile ? 1 : 2, margin:0, color:G, fontFamily:"var(--font-display)", lineHeight:1.2, textShadow:"0 1px 3px rgba(13,27,42,0.10)" }}>Bổ Sung Trang Thiết Bị</h2>
            <div style={{ width:52, height:1, background:`linear-gradient(90deg,transparent,${G}55,transparent)`, margin:"20px auto 0" }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 18 }}>
            {accessories.map((a,i) => {
              const icons = ["🎙️","🔦","⚡","📡","🎞️","🔋","🌿","🎛️","📷","🔌"];
              return (
                <div key={a.id} className="acc-card">
                  <div className="acc-icon-wrap">
                    {a.image
                      ? <img src={a.image} alt={a.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }} />
                      : icons[i % icons.length]
                    }
                  </div>
                  <div style={{ color:TXT, fontWeight:500, fontSize:12.5, marginBottom:10, letterSpacing:0.4, lineHeight:1.5, fontFamily:"var(--font-display)" }}>{a.name}</div>
                  <div style={{ color:G, fontWeight:800, fontSize:15, fontFamily:"var(--font-ui)", textShadow:"0 1px 2px rgba(13,27,42,0.10)" }}>{fmtVND(a.price)}<span style={{ color:MUT, fontSize:10, marginLeft:2, fontWeight:500 }}>/ngày</span></div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign:"center", marginTop: isMobile ? 28 : 42 }}>
            <span style={{ fontSize:10, letterSpacing:2.5, color:G, opacity:0.30, fontFamily:"var(--font-ui)", fontWeight:600 }}>PHỤ KIỆN ĐƯỢC CHỌN TRỰC TIẾP TRONG QUÁ TRÌNH ĐẶT THUÊ</span>
          </div>
        </div>
      </div>

      {/* CTA — dark cinematic */}
      <div style={{ position:"relative", overflow:"hidden", padding: isMobile ? "56px 20px 68px" : "90px 72px 100px", margin: isMobile ? "20px 12px" : "32px 20px", borderRadius:28, border:"1px solid rgba(255,255,255,0.22)", boxShadow:"0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset", textAlign:"center", background:"rgba(255,255,255,0.13)", backdropFilter:"blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter:"blur(52px) saturate(180%) brightness(1.04)" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:700, height:700, background:"radial-gradient(circle,rgba(255,255,255,0.035) 0%,transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:9, letterSpacing:7, color:G, opacity:0.55, marginBottom:18, fontFamily:"var(--font-ui)", fontWeight:700 }}>ĐẶT THUÊ NGAY HÔM NAY</div>
          <h2 style={{ fontSize: isMobile ? 26 : 40, fontWeight:700, letterSpacing: isMobile ? 0 : 1, margin:"0 0 14px", color:G, fontFamily:"var(--font-display)", textShadow:"0 1px 3px rgba(13,27,42,0.10)" }}>Không cần đăng ký tài khoản</h2>
          <p style={{ color:TXT, fontSize:14, fontWeight:500, marginBottom:40, letterSpacing:0.3, lineHeight:1.8, fontFamily:"var(--font-ui)" }}>Chọn máy → Chọn ngày → Chốt Zalo. Đơn giản vậy thôi.</p>
          <div className="btn-3d-wrap" style={{ borderRadius:16 }}><button onClick={onBook} className="btn-3d" style={{ padding:"16px 56px", borderRadius:14, fontSize:13, letterSpacing:3 }}>BẮT ĐẦU ĐẶT THUÊ</button></div>
          <div style={{ marginTop:36, display:"flex", justifyContent:"center" }}>
            <div style={{ display:"inline-flex", border:"1px solid rgba(255,255,255,0.60)", borderRadius:12, overflow:"hidden", background:"linear-gradient(135deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 100%)", backdropFilter:"blur(28px) saturate(160%)", WebkitBackdropFilter:"blur(28px) saturate(160%)", boxShadow:"0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 16px rgba(13,27,42,0.10)" }}>
              <div style={{ padding:"12px 28px", display:"flex", alignItems:"center", gap:10 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:8, letterSpacing:2.5, color:MUT, fontFamily:"system-ui,sans-serif", fontWeight:700, lineHeight:1.5 }}>THỦ TỤC</div>
                  <div style={{ fontSize:8, letterSpacing:2.5, color:G, fontFamily:"var(--font-ui)", fontWeight:800, lineHeight:1.5 }}>NHANH GỌN</div>
                </div>
              </div>
              <div style={{ width:1, background:"rgba(5,17,31,0.10)", margin:"10px 0" }} />
              <div style={{ padding:"12px 28px", display:"flex", alignItems:"center", gap:10 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:8, letterSpacing:2.5, color:MUT, fontFamily:"var(--font-ui)", fontWeight:700, lineHeight:1.5 }}>HỖ TRỢ</div>
                  <div style={{ fontSize:8, letterSpacing:2.5, color:G, fontFamily:"var(--font-ui)", fontWeight:800, lineHeight:1.5 }}>24 / 7</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMER PHOTO FEED */}
      <FeedbackMarquee photos={photos || []} feedbacks={feedbacks || []} isMobile={isMobile} />

      {/* ABOUT */}
      <div id="about" style={{ padding: isMobile ? "56px 16px 72px" : "80px 60px 100px", margin: isMobile ? "20px 12px" : "32px auto", maxWidth: isMobile ? "none" : 1100, textAlign: "center", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 28, background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset" }}>
        <div style={{ fontSize: 9, letterSpacing: 7, color: G, opacity: 0.55, marginBottom: 16, fontFamily: "var(--font-ui)", fontWeight: 700 }}>VỀ CHÚNG TÔI</div>
        <SecretTitle
          defaultText="92 KA MÊ RA"
          secretText={siteContent.secretText || ""}
          isMobile={isMobile}
          fontSize={isMobile ? 26 : 34}
        />
        <p style={{ color: TXT, fontSize: isMobile ? 13 : 15, fontWeight: 500, lineHeight: 2, maxWidth: 680, margin: "0 auto 64px", fontFamily: "var(--font-ui)" }}>{siteContent.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 8 : 40, marginTop: 48 }}>
          {siteContent.stats.map(([e, n, l], i) => (
            <StatCard key={l} icon={STAT_ICONS[l] || <span style={{ fontSize: isMobile ? 20 : 36 }}>{e}</span>} num={n} label={l} delay={i * 180} compact={isMobile} />
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: isMobile ? "20px 16px" : "28px 60px", display: "flex", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "center" : "center", gap: isMobile ? 10 : 16, background: "rgba(255,255,255,0.13)", backdropFilter: "blur(52px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
        <Logo size={0.7} />
        <div style={{ color: "rgba(10,10,20,0.75)", fontSize: 12, fontFamily: "var(--font-ui)", fontWeight: 500, letterSpacing: 0.5, display: "grid", gridTemplateColumns: "auto auto 1fr", gap: "2px 4px" }}>
          <span>Hotline</span><span>:</span><span>{siteContent.zalo}</span>
          <span>Địa chỉ</span><span>:</span><span>{siteContent.address}</span>
        </div>
        <div style={{ color: "rgba(10,10,20,0.55)", fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 400 }}>© 2026 92 KA MÊ RA/abc2z</div>
      </footer>

      {/* QR góc phải — hover để phóng to */}
      <style>{`
        .text-type{ display:inline-block; white-space:pre-wrap; }
        .text-type__cursor{ margin-left:0.25rem; display:inline-block; opacity:1; animation:cursorBlink 1s step-end infinite; }
        .text-type__cursor--hidden{ display:none; }
        @keyframes cursorBlink{ 0%,100%{opacity:1} 50%{opacity:0} }
        .qr-corner{ position:fixed; bottom:20px; right:20px; z-index:999; cursor:pointer; }
        input[type="date"]::-webkit-calendar-picker-indicator{ opacity:0; width:0; padding:0; margin:0; position:absolute; }
        .qr-wrap{
          display:flex; flex-direction:column; align-items:center; gap:6px;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1);
          transform-origin: bottom right;
          transform: scale(1);
        }
        .qr-corner:hover .qr-wrap{ transform: scale(3.2); }
        .qr-box{
          width:44px; height:44px; padding:3px;
          background: transparent;
          border-radius:5px;
          box-shadow: 0 0 0 1px rgba(201,168,76,0.25);
          line-height:0;
          transition: box-shadow .3s;
        }
        .qr-corner:hover .qr-box{ box-shadow: 0 0 0 2px rgba(201,168,76,0.6), 0 4px 20px rgba(0,0,0,0.7); }
        .qr-label{
          font-size:6px; letter-spacing:1.5px; color:#555;
          font-family:system-ui,sans-serif;
          white-space:nowrap;
          transition: color .3s;
        }
        .qr-corner:hover .qr-label{ color:#2E2E2E; }
      `}</style>
      <div className="qr-corner">
        <div className="qr-wrap">
          <div className="qr-box">
            <img src={QR_CODE} alt="QR Zalo" style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }} />
          </div>
          <div className="qr-label">QR LIÊN HỆ</div>
        </div>
      </div>
    </div>
  );
}

// ── LOGIN MODAL (Khách hàng Google OAuth + Quản trị) ──
function AdminLogin({ onLogin, onBack, orders = [], defaultTab = "customer", loggedUser, setLoggedUser, photos = [], setPhotos, cameras = [], setPage, usersMap, setUsersMap, siteContent, setOrders }) {
  const [tab, setTab] = useState(defaultTab);

  // ── Sync orders khi AdminLogin mount (tránh hiển thị đơn cũ / thiếu đơn mới) ──
  useEffect(() => {
    if (!setOrders) return;
    let cancelled = false;
    const fetchFresh = async () => {
      try {
        const fresh = await storageGet(STORE_KEYS.orders, true);
        if (cancelled || !fresh || !Array.isArray(fresh)) return;
        setOrders(prev => {
          const freshIds = new Set(fresh.map(o => o.id));
          const localOnly = prev.filter(o => !freshIds.has(o.id));
          return [...localOnly, ...fresh];
        });
      } catch {}
    };
    fetchFresh(); // fetch ngay khi mount
    const poll = setInterval(fetchFresh, 30000); // poll mỗi 30s khi đang ở AdminLogin
    return () => { cancelled = true; clearInterval(poll); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab Quản trị ──
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const [storedAdminPw, setStoredAdminPw] = useState("admin92");
  useEffect(() => {
    storageGet("k92_admin_pw").then(d => { if (d) setStoredAdminPw(d); });
  }, []);
  const checkAdmin = () => {
    if (pw === storedAdminPw) { onLogin(); }
    else { setErr(true); setShake(true); setTimeout(() => { setErr(false); setShake(false); }, 2000); }
  };

  // ── Tab Khách hàng — Google OAuth ──
  const googleBtnRef = useRef();
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiErr, setGsiErr] = useState(false);
  // ── FIX: ref luôn trỏ đến usersMap mới nhất để callback không bị stale closure ──
  const usersMapRef = useRef(usersMap);
  useEffect(() => { usersMapRef.current = usersMap; }, [usersMap]);

  // Load Google GSI script
  useEffect(() => {
    if (loggedUser) return;
    if (window.google?.accounts?.id) { setGsiReady(true); return; }
    const existing = document.getElementById("gsi-script-92k");
    if (existing) { existing.addEventListener("load", () => setGsiReady(true)); return; }
    const script = document.createElement("script");
    script.id = "gsi-script-92k";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    script.onerror = () => setGsiErr(true);
    document.head.appendChild(script);
  }, [loggedUser]);

  // Render Google button
  useEffect(() => {
    if (!gsiReady || loggedUser || !googleBtnRef.current) return;
    try {
      // ── Chỉ initialize 1 lần — tránh One Tap loop trên desktop Chrome ──
      if (!_gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => {
            const info = decodeGoogleJWT(res.credential);
            if (!info) { setGsiErr(true); return; }
            // Ngăn One Tap tự bật lại sau khi đã đăng nhập
            try { window.google.accounts.id.disableAutoSelect(); } catch {}
            // ── Dùng ref để tránh stale closure ──
            const currentMap = usersMapRef.current || {};
            const savedProfile = currentMap[info.email] || {};
            const user = {
              name: info.name,
              displayName: savedProfile.displayName || info.name,
              email: info.email,
              picture: info.picture,
              googleId: info.googleId,
              avatar: savedProfile.avatar || null,
              phone: savedProfile.phone || "",
              zalo: savedProfile.zalo || "",
              address: savedProfile.address || "",
            };
            setLoggedUser(user);
            // ── Functional update: merge vào state hiện tại, không overwrite users khác ──
            if (setUsersMap) {
              setUsersMap(prev => {
                const latest = prev || {};
                const existing = latest[info.email] || {};
                const updated = { ...latest, [info.email]: { ...existing, name: info.name, picture: info.picture, googleId: info.googleId, joinDate: existing.joinDate || todayStr() } };
                setTimeout(() => { try { storageSet("k92_users_v1", updated); } catch(e) { console.warn("setUsersMap storageSet err", e); } }, 0);
                return updated;
              });
            }
          },
          use_fedcm_for_prompt: false,
          auto_select: false,           // ← tắt tự đăng nhập, ngăn vòng lặp
          cancel_on_tap_outside: true,  // ← đóng popup khi click ra ngoài
        });
        _gsiInitialized = true;
      }
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width: Math.min(320, window.innerWidth - 100),
        text: "signin_with",
        logo_alignment: "left",
      });
    } catch { setGsiErr(true); }
  }, [gsiReady, loggedUser]);

  // Order filtering — hỗ trợ cả email (Google) và phone (đơn cũ)
  const _myEmail = (loggedUser?.email || "").toLowerCase();
  const _normP = (p) => (p || "").replace(/[^0-9]/g, "");
  const _myPh = _normP(loggedUser?.phone);
  const myOrders = loggedUser ? orders.filter(o => {
    if (_myEmail && o.userEmail?.toLowerCase() === _myEmail) return true;
    if (_myPh && (_normP(o.phone) === _myPh || _normP(o.userPhone) === _myPh)) return true;
    return false;
  }) : [];
  const totalSpent = myOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  // ── Keyframes injected once ──
  useEffect(() => {
    const id = "login-keyframes-92k";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes loginFadeIn {
        from { opacity: 0; transform: translateY(18px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
      @keyframes loginGlow {
        0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(139,180,220,0.18); }
        50%       { box-shadow: 0 1px 0 rgba(255,255,255,0.90) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 20px 56px rgba(0,0,0,0.34), 0 0 0 1px rgba(139,180,220,0.30); }
      }
      @keyframes camFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-6px); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      .login-card-92k { animation: loginFadeIn .45s cubic-bezier(0.22,1,0.36,1) both, loginGlow 4s ease-in-out 1s infinite; }
      .cam-float-92k  { animation: camFloat 3.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const tabBtn = (k, icon, label) => (
    <button onClick={() => setTab(k)} style={{
      flex: 1, padding: "13px 0", background: "none", border: "none",
      borderBottom: `2px solid ${tab === k ? G : "transparent"}`,
      color: tab === k ? G : MUT,
      fontWeight: tab === k ? 700 : 400,
      fontSize: 13, cursor: "pointer",
      fontFamily: "system-ui,sans-serif",
      transition: "all .25s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ letterSpacing: 0.3 }}>{label}</span>
    </button>
  );

  // Google SVG icon
  const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.5 29.6 1.5 24 1.5 14.9 1.5 7.2 7 3.7 14.8l7 5.4C12.4 14 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.3-4 6.8-10 6.8-17z"/>
      <path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7-5.4C1.8 17.2 1 20.5 1 24c0 3.5.8 6.8 2.2 9.7l7.5-5.1z"/>
      <path fill="#34A853" d="M24 46.5c5.4 0 10-1.8 13.3-4.8l-7.5-5.8c-1.8 1.2-4.1 1.9-6.8 1.9-6.3 0-11.6-4.3-13.5-10.1l-7.5 5.1C7.2 41 15 46.5 24 46.5z"/>
    </svg>
  );

  return (
    <>
    {/* Backdrop with subtle grain */}
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,20,36,0.72)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px) saturate(140%)", WebkitBackdropFilter: "blur(6px) saturate(140%)" }}>

      {/* Ambient blue glow in background */}
      <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,160,220,0.10) 0%, transparent 70%)", top: "15%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />

      <div
        className="login-card-92k"
        style={{
          background: "linear-gradient(160deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 60%, rgba(181,206,230,0.76) 100%)",
          border: "1px solid rgba(255,255,255,0.60)",
          borderRadius: 28,
          padding: "32px 36px 36px",
          width: "min(520px,93vw)",
          textAlign: "center",
          transform: shake ? "translateX(-6px)" : undefined,
          transition: "transform .1s",
          maxHeight: "92vh",
          overflowY: "auto",
          position: "relative",
          scrollbarWidth: "none",
          backdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
          WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.30), 0 2px 16px rgba(0,0,0,0.16)",
        }}
      >
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 14, left: 14, width: 18, height: 18, borderTop: `1.5px solid ${G}55`, borderLeft: `1.5px solid ${G}55`, borderRadius: "2px 0 0 0" }} />
        <div style={{ position: "absolute", top: 14, right: 14, width: 18, height: 18, borderTop: `1.5px solid ${G}55`, borderRight: `1.5px solid ${G}55`, borderRadius: "0 2px 0 0" }} />

        {/* ── Logo ── */}
        <div style={{ marginBottom: 6 }}>
          <Logo size={0.88} />
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BR}`, margin: "20px -36px 0", padding: "0 36px" }}>
          {tabBtn("customer", "👤", "Khách hàng")}
          {tabBtn("admin", "🔐", "Quản trị")}
        </div>

        {/* ── Tab khách hàng ── */}
        {tab === "customer" && (
          <div style={{ marginTop: 24, textAlign: "left" }}>

            {/* Chưa đăng nhập */}
            {!loggedUser && (
              <div style={{ textAlign: "center" }}>
                {/* Camera illustration with glow */}
                <div style={{ position: "relative", display: "inline-block", marginBottom: 18 }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse 80% 55% at 50% 60%, rgba(139,107,61,0.12) 0%, transparent 70%)",
                    filter: "blur(10px)",
                    transform: "scale(1.4) translateY(10px)",
                    borderRadius: "50%",
                  }} />
                  <div className="cam-float-92k" style={{ fontSize: 64, lineHeight: 1, position: "relative", filter: "drop-shadow(0 4px 24px rgba(201,168,76,0.3))" }}>
                    📷
                  </div>
                </div>

                {/* Heading */}
                <div style={{ color: TXT, fontSize: 20, fontWeight: 700, fontFamily: "'Georgia', serif", letterSpacing: 0.3, marginBottom: 8 }}>
                  Đăng nhập
                </div>
                <div style={{ color: MUT, fontSize: 12.5, fontFamily: "system-ui,sans-serif", lineHeight: 1.75, marginBottom: 28 }}>
                  Đăng nhập ngay để nhận ưu đãi của thành viên
                </div>

                {/* Google button area */}
                <div style={{ marginBottom: 16 }}>
                  {gsiErr ? (
                    <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui,sans-serif", padding: "12px 0" }}>
                      ❌ Không tải được Google Sign-In.<br />
                      <span style={{ color: MUT, fontSize: 11 }}>Kiểm tra kết nối mạng và thử lại.</span>
                    </div>
                  ) : !gsiReady ? (
                    <div style={{
                      width: "100%", padding: "14px 18px", borderRadius: 16,
                      background: CARD, border: `1px solid ${BR}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 10, color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500,
                      boxSizing: "border-box",
                    }}>
                      <span style={{ opacity: 0.6, fontSize: 15 }}>⏳</span>
                      <span>Đang tải Google Sign-In…</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div ref={googleBtnRef} style={{ minHeight: 44 }} />
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 12px" }}>
                  <div style={{ flex: 1, height: 1, background: `${BR}` }} />
                  <span style={{ color: "#666", fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 2, fontWeight: 600 }}>BẢO MẬT BỞI GOOGLE</span>
                  <div style={{ flex: 1, height: 1, background: `${BR}` }} />
                </div>
                <div style={{ color: "#555", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.7 }}>
                  92 KA MÊ RA chỉ nhận tên và email.<br />Không đọc dữ liệu Google Drive hay Gmail.
                </div>
              </div>
            )}

            {/* Đã đăng nhập — hiện profile */}
            {loggedUser && (() => {
              const completedOrders = myOrders.filter(o => o.status === "completed");
              return (
              <div>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  {/* Avatar ring */}
                  <div style={{ position: "relative", display: "inline-block", margin: "0 auto 12px" }}>
                    <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: `conic-gradient(${G}, ${G}55, ${G})`, opacity: 0.6 }} />
                    <div style={{ width: 76, height: 76, borderRadius: "50%", background: G + "22", border: `3px solid ${BG}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, overflow: "hidden", position: "relative" }}>
                      {(loggedUser.picture || loggedUser.avatar)
                        ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                        : <span style={{ color: G, fontWeight: 800, fontSize: 28, fontFamily: "serif" }}>{loggedUser.name?.[0]?.toUpperCase() || "?"}</span>}
                    </div>
                  </div>
                  <div style={{ color: TXT, fontWeight: 700, fontSize: 16, fontFamily: "Georgia,serif" }}>{loggedUser.displayName || loggedUser.name}</div>
                  <div style={{ color: MUT, fontSize: 11.5, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <span style={{ fontSize: 10 }}>✉</span>
                    <span>{loggedUser.email}</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: G, fontWeight: 800, fontSize: 24, fontFamily: "Georgia,serif" }}>{myOrders.length}</div>
                    <div style={{ color: MUT, fontSize: 11, marginTop: 3, letterSpacing: 0.5 }}>Tổng đơn</div>
                  </div>
                  <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: G, fontWeight: 800, fontSize: 13, lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{fmtVND(totalSpent)}</div>
                    <div style={{ color: MUT, fontSize: 11, marginTop: 3, letterSpacing: 0.5 }}>Đã chi</div>
                  </div>
                </div>

                {/* Completed orders with feedback CTA */}
                {completedOrders.length > 0 && (
                  <div style={{ background: CARD2, border: `1px solid ${G}33`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: G, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 10, fontWeight: 700 }}>
                      ⭐ ĐƠN CÓ THỂ ĐÁNH GIÁ ({completedOrders.length})
                    </div>
                    {completedOrders.slice(0, 3).map(o => (
                      <div key={o.id} style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: G, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</div>
                          <div style={{ color: TXT, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>📷 {o.cameraName}</div>
                        </div>
                        {setPage && (
                          <button onClick={() => { setPage("customer"); onBack(); }}
                            style={{ flexShrink: 0, padding: "6px 14px", background: "#c9a84c", color: "#1a1200", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap", boxShadow: "0 0 12px #c9a84c44" }}>
                            ⭐ Đánh giá
                          </button>
                        )}
                      </div>
                    ))}
                    {completedOrders.length > 3 && (
                      <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", textAlign: "center", paddingTop: 4 }}>
                        +{completedOrders.length - 3} đơn khác...
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Dashboard link */}
                {setPage && (
                  <button onClick={() => { setPage("customer"); onBack(); }} style={{ width: "100%", padding: "11px 0", background: G + "15", border: `1px solid ${G}44`, color: G, borderRadius: 12, cursor: "pointer", fontSize: 13, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span>👤</span> Mở trang cá nhân đầy đủ →
                  </button>
                )}

                {/* All orders list */}
                {myOrders.length > 0 ? (
                  <div style={{ maxHeight: 180, overflowY: "auto" }}>
                    <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>TẤT CẢ ĐƠN</div>
                    {myOrders.map(o => (
                      <div key={o.id} style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</span>
                          <Badge status={o.status} />
                        </div>
                        <div style={{ color: TXT, fontSize: 12, marginTop: 4 }}>{o.cameraName}</div>
                        <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>{fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}</div>
                        <div style={{ marginTop: 8 }}>
                          <CopyOrderBtn copyFn={() => {
                            const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                            const fmtD = (ds) => new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
                            let pickTime = "", pickDate = "", dropTime = "", dropDate = "";
                            if (o.date && o.days) {
                              if (o.days === 0.5) {
                                pickTime = (o.session||o.shift) === "morning" ? "06:00" : (o.session||o.shift) === "afternoon" ? "14:00" : "--:--";
                                dropTime = (o.session||o.shift) === "morning" ? "12:00" : (o.session||o.shift) === "afternoon" ? "20:00" : "--:--";
                                pickDate = dropDate = fmtD(o.date);
                              } else {
                                pickTime = dropTime = "12:00";
                                pickDate = fmtD(o.date);
                                dropDate = fmtD(dateAddDays(o.date, o.days));
                              }
                            }
                            const statusLabels = { pending:"Chờ xác nhận", confirmed:"Đã xác nhận", active:"Đang thuê", completed:"Hoàn thành", cancelled:"Đã huỷ" };
                            const lines = [
                              "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              `Mã đơn : ${o.id}`,
                              `📷 Máy  : ${o.cameraName}`,
                              `🎒 Phụ kiện: ${accList}`,
                              `📅 Ngày thuê: ${o.date}`,
                              `⏱ Thời gian: ${fmtDays(o.days, o.session || o.shift)}`,
                              pickDate ? `Giờ nhận : ${pickTime} · ${pickDate}` : null,
                              dropDate ? `Giờ trả  : ${dropTime} · ${dropDate}` : null,
                              o.discountCode ? `🏷️ Mã giảm giá: ${o.discountCode} (-${fmtVND(o.discountAmt || 0)})` : null,
                              `💰 Tổng tiền: ${fmtVND(o.total)}`,
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              `👤 Tên   : ${o.name}`,
                              `📞 SĐT   : ${o.phone}`,
                              `📍 Địa chỉ: ${o.address || "—"}`,
                              o.note ? `💬 Ghi chú: ${o.note}` : null,
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              `⏳ Trạng thái: ${statusLabels[o.status] || o.status}`,
                            ].filter(Boolean).join("\n");
                            navigator.clipboard?.writeText(lines).catch(() => {});
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có đơn thuê nào</div>
                )}

                <button onClick={() => {
                  setLoggedUser(null);
                  try { window.google?.accounts?.id?.disableAutoSelect(); } catch {}
                }} style={{ width: "100%", padding: 10, background: "none", color: MUT, border: `1px solid ${BR}`, borderRadius: 12, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginTop: 10 }}>Đăng xuất Google</button>
              </div>
            );
            })()}
          </div>
        )}

        {/* ── Tab quản trị ── */}
        {tab === "admin" && (
          <div style={{ marginTop: 32 }}>
            {/* Lock icon with glow */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, filter: "drop-shadow(0 0 18px rgba(201,168,76,0.25))", marginBottom: 10 }}>🔐</div>
              <h3 style={{ color: TXT, fontWeight: 700, marginBottom: 4, fontFamily: "Georgia,serif", fontSize: 19, letterSpacing: 0.5, margin: "0 0 6px" }}>Quản trị viên</h3>
              <p style={{ color: MUT, fontSize: 12, marginBottom: 24, letterSpacing: .3, fontFamily: "system-ui,sans-serif", margin: "0 0 24px" }}>Nhập mật khẩu để truy cập dashboard</p>
            </div>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && checkAdmin()} placeholder="••••••••"
              style={{ width: "100%", padding: "14px 18px", background: CARD, border: `1.5px solid ${err ? "#ef4444" : BR}`, borderRadius: 16, color: TXT, fontSize: 18, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "monospace", letterSpacing: 4, textAlign: "center", transition: "border .2s", boxShadow: err ? "0 0 20px rgba(239,68,68,0.12)" : "none" }} />
            {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>❌ Sai mật khẩu. Thử lại!</p>}
            <button onClick={checkAdmin}
              style={{ width: "100%", padding: "14px 0", background: `linear-gradient(135deg, ${G}, #b8923e)`, color: "#FFF", border: "none", borderRadius: 16, cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "system-ui,sans-serif", marginTop: 4, boxShadow: `0 4px 24px ${G}44`, letterSpacing: 0.5, transition: "opacity .2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Đăng nhập</button>

          </div>
        )}

        <button onClick={onBack}
          style={{ width: "100%", padding: "13px 0", background: "none", color: MUT, border: `1px solid ${BR}`, borderRadius: 16, cursor: "pointer", fontSize: 13, fontFamily: "system-ui,sans-serif", marginTop: 20, letterSpacing: 0.3, transition: "border-color .2s, color .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = G + "55"; e.currentTarget.style.color = G; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BR; e.currentTarget.style.color = MUT; }}
        >← Về trang chủ</button>
      </div>
    </div>
    </>
  );
}

// ── ADMIN DASHBOARD ──
// ── RENTAL CALENDAR ──
const CAM_PALETTE = ["#2E2E2E","#e05252","#52a8e0","#52e0a8","#e0a852","#a852e0","#e05299","#52e052"];
function RentalCalendar({ orders, cameras }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDay, setSelDay] = useState(() => now.getDate());
  const { y, m } = cur;

  const camColorMap = {};
  cameras.forEach((c, i) => { camColorMap[c.id] = CAM_PALETTE[i % CAM_PALETTE.length]; });

  const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = new Date(y, m, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const todayDate = todayStr();

  const activeOrders = orders.filter(o => !["cancelled"].includes(o.status));

  const getDay = (day) => {
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return activeOrders.filter(o => isDateInOrder(ds, o));
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const selDateStr = selDay ? `${y}-${String(m+1).padStart(2,"0")}-${String(selDay).padStart(2,"0")}` : null;
  const selOrders = selDay ? getDay(selDay) : [];

  // Pre-compute trạng thái tồn kho theo spec §4+§5 — morning/afternoon riêng từng camera
  const dayAvailMap = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    // Mỗi camera: tính {morning, afternoon} rồi getItemStatus
    const camAvails = cameras.map(c => {
      const { morning, afternoon } = getAvailability(c.id, c.qty || 1, orders, ds);
      return { morning, afternoon, status: getItemStatus(morning, afternoon) };
    });
    // Ngày "hết" = TẤT CẢ camera đều hết cả sáng lẫn chiều
    const allFull = cameras.length > 0 && camAvails.every(a => a.status === "hết");
    // Ngày "còn ít" = ít nhất 1 camera còn ít hoặc hết, nhưng chưa phải tất cả hết
    const hasLow  = !allFull && camAvails.some(a => a.status !== "trống");
    // qtys worst-case mỗi camera cho legend
    const qtys = camAvails.map(a => Math.min(a.morning, a.afternoon));
    const morningQtys   = camAvails.map(a => a.morning);
    const afternoonQtys = camAvails.map(a => a.afternoon);
    dayAvailMap[ds] = { camAvails, qtys, morningQtys, afternoonQtys, allFull, hasLow };
  }

  const navBtn = { background:CARD, border:`1px solid ${BR}`, color:TXT, padding:"6px 16px", borderRadius:10, cursor:"pointer", fontSize:13, fontFamily:"system-ui,sans-serif" };

  return (
    <div>
      {/* Header + nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ margin:0, color:TXT, fontWeight:600, fontSize:18, fontFamily:"system-ui,sans-serif" }}>📅 Lịch thuê máy</h2>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button style={navBtn} onClick={() => { setCur(p => { const d = new Date(p.y, p.m-1, 1); return { y:d.getFullYear(), m:d.getMonth() }; }); setSelDay(null); }}>◀</button>
          <span style={{ color:G, fontWeight:700, fontSize:14, fontFamily:"system-ui,sans-serif", minWidth:160, textAlign:"center" }}>
            {monthLabel}{selDay ? <span style={{ color:MUT, fontSize:11, fontWeight:400 }}> · {selDay}/{m+1}</span> : ""}
          </span>
          <button style={navBtn} onClick={() => { setCur(p => { const d = new Date(p.y, p.m+1, 1); return { y:d.getFullYear(), m:d.getMonth() }; }); setSelDay(null); }}>▶</button>
          <button style={{ ...navBtn, color:G, borderColor:G+"44" }} onClick={() => { setCur({ y:now.getFullYear(), m:now.getMonth() }); setSelDay(now.getDate()); }}>Hôm nay</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
        {["T2","T3","T4","T5","T6","T7","CN"].map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:10, color:MUT, padding:"5px 0", fontFamily:"system-ui,sans-serif", letterSpacing:1 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ minHeight:60 }} />;
          const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayOrders = getDay(day);
          const isToday = ds === todayDate;
          const isSel = selDay === day;
          const isPast = ds < todayDate;
          const avail = dayAvailMap[ds] || { hasLow: false, allFull: false };
          const { hasLow: hasFullCam, allFull } = avail;
          return (
            <div key={day} onClick={() => setSelDay(isSel ? null : day)}
              style={{ minHeight:60, borderRadius:10, background: isSel ? "#FFF8ED" : allFull ? "#FEF0F0" : CARD, border:`1px solid ${isSel ? G : isToday ? G+"55" : allFull ? "#cc333333" : BR}`, padding:"6px 8px", cursor:"pointer", transition:"border .15s", opacity: isPast && !dayOrders.length ? 0.4 : 1 }}>
              <div style={{ fontSize:11, fontWeight: isToday ? 700 : 400, color: isToday ? G : TXT, fontFamily:"system-ui,sans-serif", marginBottom:4 }}>
                {day}{isToday && <span style={{ fontSize:7, marginLeft:3, color:G }}>●</span>}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:2 }}>
                {dayOrders.slice(0,6).map((o, j) => {
                  const cid = o.cameras?.[0]?.id || o.cameraId;
                  return <div key={j} style={{ width:8, height:8, borderRadius:2, background: camColorMap[cid] || G, flexShrink:0 }} />;
                })}
                {dayOrders.length > 6 && <span style={{ fontSize:8, color:MUT, lineHeight:"8px" }}>+{dayOrders.length-6}</span>}
              </div>
              {allFull && !isPast && (
                <div style={{ fontSize:7, color:"#cc3333", fontWeight:700, fontFamily:"system-ui,sans-serif", marginTop:2, letterSpacing:0.5 }}>HẾT</div>
              )}
              {!allFull && hasFullCam && !isPast && (
                <div style={{ fontSize:7, color:"#f59e0b", fontWeight:700, fontFamily:"system-ui,sans-serif", marginTop:2, letterSpacing:0.5 }}>CÒN ÍT</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selDay && (
        <div style={{ marginTop:20, background:CARD, border:`1px solid ${BR}`, borderRadius:14, padding:16 }}>
          <div style={{ color:G, fontSize:12, fontWeight:700, marginBottom:12, fontFamily:"system-ui,sans-serif" }}>
            📅 Ngày {selDay}/{m+1}/{y} — {selOrders.length} đơn
          </div>
          {selOrders.length === 0
            ? <div style={{ color:MUT, fontSize:12, fontFamily:"system-ui,sans-serif" }}>Không có đơn nào ngày này</div>
            : selOrders.map(o => {
                const cid = o.cameras?.[0]?.id || o.cameraId;
                const col = camColorMap[cid] || G;
                const cfg = STATUS_CFG[o.status] || { label: o.status, color:"#888" };
                return (
                  <div key={o.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${BR}` }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:col, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:TXT, fontSize:12, fontWeight:600, fontFamily:"system-ui,sans-serif" }}>{o.cameraName} · {o.name}</div>
                      <div style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif", marginTop:2 }}>
                        {o.id} · {o.date} → {dateAddDays(o.date, o.days)} · {fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}
                      </div>
                    </div>
                    <span style={{ display:"inline-block", padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:cfg.color+"22", color:cfg.color, border:`1px solid ${cfg.color}44`, whiteSpace:"nowrap", flexShrink:0 }}>{cfg.label}</span>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Legend — hiển thị sáng/chiều riêng theo spec §5 */}
      <div style={{ marginTop:18, padding:"12px 14px", background:CARD2, borderRadius:12, border:`1px solid ${BR}` }}>
        <span style={{ color:MUT, fontSize:10, fontFamily:"system-ui,sans-serif", letterSpacing:1, display:"block", marginBottom:8 }}>
          CHÚ THÍCH{selDateStr ? ` · ${selDay}/${m+1}/${y}` : " · Tổng kho"}
        </span>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {cameras.map((c, i) => {
            let statusLabel, morning, afternoon;
            if (selDateStr && dayAvailMap[selDateStr]) {
              // Đang chọn ngày → hiện morning/afternoon riêng (spec §5)
              const a = dayAvailMap[selDateStr].camAvails[i];
              morning   = a?.morning ?? 0;
              afternoon = a?.afternoon ?? 0;
              statusLabel = getItemStatus(morning, afternoon);
            } else {
              // Không chọn ngày → hiện tổng kho
              morning = afternoon = c.qty || 1;
              statusLabel = "trống";
            }
            const statusColor = statusLabel === "hết" ? RED : statusLabel === "còn ít" ? "#f59e0b" : "#22c55e";
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:6, background:CARD, border:`1px solid ${BR}`, borderRadius:10, padding:"5px 10px" }}>
                <div style={{ width:9, height:9, borderRadius:2, background:CAM_PALETTE[i%CAM_PALETTE.length], flexShrink:0 }} />
                <span style={{ color:MUT, fontSize:11, fontFamily:"system-ui,sans-serif" }}>{c.name}</span>
                {selDateStr ? (
                  <span style={{ color:statusColor, fontSize:10, fontWeight:700, fontFamily:"system-ui,sans-serif" }}>
                    🌅{morning} · 🌇{afternoon}
                  </span>
                ) : (
                  <span style={{ color:"#22c55e", fontSize:10, fontWeight:700 }}>({c.qty || 1} máy)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── GHI CHÚ NỘI BỘ (admin only, khách không thấy) ──
function AdminNoteEditor({ order, setOrders }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.adminNote || "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setOrders(p => p.map(x => x.id === order.id ? { ...x, adminNote: draft } : x));
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasNote = !!(order.adminNote && order.adminNote.trim());

  return (
    <div style={{ background: "#FFF8ED", border: `1px solid ${hasNote ? "#f59e0b44" : "#2a2a2a"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing ? 8 : (hasNote ? 6 : 0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: "system-ui,sans-serif" }}>GHI CHÚ NỘI BỘ</span>
          <span style={{ color: "#555", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>· Khách không thấy</span>
        </div>
        {!editing && (
          <button onClick={() => { setDraft(order.adminNote || ""); setEditing(true); }}
            style={{ padding: "3px 10px", background: "transparent", border: "1px solid #f59e0b44", color: "#f59e0b", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
            {hasNote ? "Sửa" : "+ Thêm ghi chú"}
          </button>
        )}
      </div>
      {!editing && hasNote && (
        <div style={{ color: "#f59e0b", fontSize: 12, fontStyle: "italic", lineHeight: 1.5, fontFamily: "system-ui,sans-serif" }}>{order.adminNote}</div>
      )}
      {editing && (
        <div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="VD: khách hay trả trễ, cần đặt cọc trước..."
            style={{ width: "100%", padding: "8px 10px", background: CARD, border: "1px solid #f59e0b44", borderRadius: 10, color: "#f59e0b", fontSize: 12, fontFamily: "system-ui,sans-serif", resize: "vertical", minHeight: 72, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={save}
              style={{ padding: "6px 14px", background: "#FFF8ED", border: "1px solid #f59e0b66", color: "#f59e0b", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
              {saved ? "✓ Đã lưu!" : "💾 Lưu"}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: "6px 12px", background: "transparent", border: "1px solid #2a2a2a", color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
              Huỷ
            </button>
            {hasNote && <button onClick={() => { setDraft(""); setOrders(p => p.map(x => x.id === order.id ? { ...x, adminNote: "" } : x)); setEditing(false); }}
              style={{ padding: "6px 12px", background: "transparent", border: "1px solid #cc333333", color: RED, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", marginLeft: "auto" }}>
              Xoá ghi chú
            </button>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ cameras, setCameras, accessories, setAccessories, orders, setOrders, siteContent, setSiteContent, photos, setPhotos, feedbacks, setFeedbacks, users, setUsers, discounts, setDiscounts, onBack, isMobile }) {
  const [tab, setTab] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [addCamOpen, setAddCamOpen] = useState(false);
  const [nc, setNc] = useState({ name: "", price: "", desc: "", qty: 1, status: "available", icon: "📷", images: [] });
  const [editAcc, setEditAcc] = useState(null);
  const [addAcc, setAddAcc] = useState(false);
  const [na, setNa] = useState({ name: "", price: "", qty: 1, active: true, priceShift: "", desc: "", image: "" });
  const [saved, setSaved] = useState(false);
  // ── Đổi mật khẩu ──
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null); // { type: "ok"|"err", text }
  const [resetTarget, setResetTarget] = useState(null); // phone being reset
  const [resetPwVal, setResetPwVal] = useState(""); // new password value
  const [resetPwMsg, setResetPwMsg] = useState(null); // { type, text }

  // ── Discount management state ──
  const [discForm, setDiscForm] = useState({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true, requiredBadge: "none" });
  const [discMsg, setDiscMsg] = useState(null);
  const [editDiscId, setEditDiscId] = useState(null);
  const [adminPw, setAdminPw] = useState("admin92");
  useEffect(() => {
    storageGet("k92_admin_pw").then(d => { if (d) setAdminPw(d); });
  }, []);
  const handleChangePw = () => {
    setPwMsg(null);
    if (!pwOld || !pwNew || !pwConfirm) { setPwMsg({ type: "err", text: "Vui lòng điền đầy đủ" }); return; }
    if (pwOld !== adminPw) { setPwMsg({ type: "err", text: "Mật khẩu hiện tại không đúng" }); return; }
    if (pwNew.length < 6) { setPwMsg({ type: "err", text: "Mật khẩu mới phải có ít nhất 6 ký tự" }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ type: "err", text: "Mật khẩu xác nhận không khớp" }); return; }
    storageSet("k92_admin_pw", pwNew);
    setAdminPw(pwNew);
    setPwOld(""); setPwNew(""); setPwConfirm("");
    setPwMsg({ type: "ok", text: "✓ Đổi mật khẩu thành công!" });
    setTimeout(() => setPwMsg(null), 3000);
  };
  const [orderFilter, setOrderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [expandedOrder, setExpandedOrder] = useState(null);
  const deletedOrderIdsRef = useRef(new Set());
  // FIX RACE: track orders admin vừa đổi locally — không cho WebSocket ghi đè trong 15s
  const localOrderChangesRef = useRef(new Map()); // Map<orderId, timestampMs>
  const LOCAL_LOCK_MS = 15000;

  // ── EXCEL EXPORT ──
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;
      const [y, m] = exportMonth.split("-").map(Number);
      const rows = orders.filter(o => {
        if (!o.date) return false;
        const d = new Date(o.date + "T00:00:00");
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
      const sheetData = [
        ["Mã đơn", "Ngày", "Khách", "SĐT", "Zalo", "Địa chỉ", "Máy", "Ca/Ngày", "Phụ kiện", "Mã giảm giá", "Giảm (đ)", "Tổng (đ)", "Trạng thái", "Ghi chú KH", "Ghi chú nội bộ"],
        ...rows.map(o => [
          o.id,
          o.date,
          o.name,
          o.phone,
          o.zalo || "",
          o.address || "",
          o.cameraName,
          fmtDays(o.days, o.session || o.shift),
          (o.accessories || []).join(", "),
          o.discountCode || "",
          o.discountAmt || 0,
          o.total,
          o.status,
          o.note || "",
          o.adminNote || "",
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      // Độ rộng cột
      ws["!cols"] = [8,10,16,12,12,20,18,14,24,10,10,12,10,20,20].map(w => ({ wch: w }));
      // Highlight header vàng
      const hdrRange = XLSX.utils.decode_range(ws["!ref"]);
      for (let c = hdrRange.s.c; c <= hdrRange.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "C9A84C" } }, alignment: { horizontal: "center" } };
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Tháng ${m}-${y}`);
      // Trang tổng kết
      const totalRevenue = rows.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
      const summary = [
        ["BÁO CÁO THÁNG " + m + "/" + y, "", ""],
        ["", "", ""],
        ["Tổng đơn", rows.length, ""],
        ["Đơn hoàn thành", rows.filter(o => o.status === "completed").length, ""],
        ["Đơn huỷ", rows.filter(o => o.status === "cancelled").length, ""],
        ["Doanh thu (đ)", totalRevenue, ""],
        ["Trung bình/đơn (đ)", rows.length ? Math.round(totalRevenue / rows.length) : 0, ""],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summary);
      ws2["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Tổng kết");
      XLSX.writeFile(wb, `92KaMeRa_T${m}_${y}.xlsx`);
    } catch (e) { alert("Lỗi xuất Excel: " + e.message); }
    setExporting(false);
  };

  // Track new unseen orders
  const unseenCount = orders.filter(o => !o.seen).length;

  // ── REALTIME SYNC — Supabase WebSocket (instant) + fallback poll 30s ──
  useEffect(() => {
    // Âm thanh thông báo đơn mới
    const playNotif = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[880,0,0.01,0.18],[1100,0.15,0.01,0.22],[1320,0.32,0.01,0.28]].forEach(([freq,delay,atk,rel]) => {
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = "sine"; osc.frequency.value = freq;
          g.gain.setValueAtTime(0, ctx.currentTime + delay);
          g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + delay + atk);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + atk + rel);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + atk + rel + 0.05);
        });
      } catch {}
    };

    // Merge data vào state, trả về số item mới
    const mergeData = (key, data) => {
      if (!data) return 0;
      if (key === STORE_KEYS.orders) {
        let count = 0;
        setOrders(prev => {
          const prevMap = new Map(prev.map(o => [o.id, o]));
          const incoming = data.filter(o => !deletedOrderIdsRef.current.has(o.id));
          const newOnes = incoming.filter(o => !prevMap.has(o.id));
          count = newOnes.length;
          // Dọn entry cũ trong localOrderChangesRef
          const now = Date.now();
          for (const [id, ts] of localOrderChangesRef.current.entries()) {
            if (now - ts > LOCAL_LOCK_MS) localOrderChangesRef.current.delete(id);
          }
          // Merge: CỐ ĐỊNH — không ghi đè order admin vừa đổi trong LOCAL_LOCK_MS
          const merged = prev.map(o => {
            const fresh = incoming.find(x => x.id === o.id);
            if (!fresh) return o;
            const locTs = localOrderChangesRef.current.get(o.id);
            if (locTs && (now - locTs) < LOCAL_LOCK_MS) return o; // giữ bản local
            return { ...o, ...fresh };
          });
          if (newOnes.length > 0) {
            setNewOrderIds(ids => new Set([...ids, ...newOnes.map(o => o.id)]));
            return [...newOnes.map(o => ({ ...o, seen: false })), ...merged];
          }
          // Nếu có thay đổi status/field → trigger re-render
          const changed = prev.some(o => {
            const fresh = incoming.find(x => x.id === o.id);
            const locTs = localOrderChangesRef.current.get(o.id);
            if (locTs && (now - locTs) < LOCAL_LOCK_MS) return false;
            return fresh && (fresh.status !== o.status || fresh.adminNote !== o.adminNote);
          });
          return changed ? [...merged] : prev;
        });
        return count;
      }
      if (key === STORE_KEYS.photos) {
        // ⛔ Photos sync tắt — giảm egress Supabase
        return 0;
      }
      if (key === STORE_KEYS.feedbacks) {
        let count = 0;
        setFeedbacks(prev => {
          const prevIds = new Set(prev.map(f => f.id));
          const newOnes = data.filter(f => !prevIds.has(f.id));
          count = newOnes.length;
          if (newOnes.length === 0) return prev;
          return [...newOnes.map(f => ({ ...f, seen: false })), ...prev];
        });
        return count;
      }
      if (key === STORE_KEYS.cameras) {
        // Merge meta từ WS với images hiện có trong state
        setCameras(prev => {
          const imgMap = {};
          prev.forEach(c => { if (c.images?.length) imgMap[c.id] = c.images; });
          return data.map(c => ({ ...c, images: imgMap[c.id] || c.images || [] }));
        });
        return 0;
      }
      if (key === STORE_KEYS.accessories) {
        setAccessories(data);
        return 0;
      }
      if (key === STORE_KEYS.site) {
        setSiteContent(data);
        return 0;
      }
      if (key === STORE_KEYS.discounts) {
        setDiscounts(data);
        return 0;
      }
      return 0;
    };

    // ── Supabase Realtime WebSocket ──
    const WS_URL = SB_URL.replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + SB_KEY + "&vsn=1.0.0";
    let ws, hb, retryT, dead = false, retryDelay = 2000;

    const connect = () => {
      if (dead) return;
      try { ws = new WebSocket(WS_URL); } catch { return; }

      ws.onopen = () => {
        retryDelay = 2000;
        ws.send(JSON.stringify({
          topic: "realtime:public:kv_store",
          event: "phx_join",
          payload: {
            access_token: SB_KEY,
            config: { postgres_changes: [{ event: "*", schema: "public", table: "kv_store" }] }
          },
          ref: "1",
          join_ref: "1"
        }));
        hb = setInterval(() => {
          if (ws.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: null }));
        }, 25000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event !== "postgres_changes") return;
          const rec = msg.payload?.data?.record;
          if (!rec?.key || !rec?.value) return;
          const parsed = JSON.parse(rec.value);
          const newCount = mergeData(rec.key, parsed);
          if (rec.key === STORE_KEYS.orders && newCount > 0) playNotif();
          if (rec.key === STORE_KEYS.feedbacks && newCount > 0) playNotif();
        } catch {}
      };

      ws.onclose = () => {
        clearInterval(hb);
        if (!dead) {
          retryT = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 1.5, 30000);
        }
      };
      ws.onerror = () => ws.close();
    };

    connect();

    // Fallback poll 20 phút — WebSocket đã xử lý realtime, poll chỉ là safety net
    const poll = setInterval(async () => {
      const [ords, fbs] = await Promise.all([
        storageGet(STORE_KEYS.orders, true),
        storageGet(STORE_KEYS.feedbacks, true),
        // ⛔ Photos không poll — đã tắt để giảm egress
      ]);
      const newCount = mergeData(STORE_KEYS.orders, ords);
      if (newCount > 0) playNotif();
      const newFbCount = mergeData(STORE_KEYS.feedbacks, fbs);
      if (newFbCount > 0) playNotif();
    }, 1200000);

    return () => {
      dead = true;
      clearInterval(hb); clearInterval(poll); clearTimeout(retryT);
      if (ws) ws.close();
    };
  }, [setOrders, setPhotos, setFeedbacks]);

  // Mark orders as seen when entering orders tab
  useEffect(() => {
    if (tab === "orders") {
      setOrders(prev => prev.map(o => ({ ...o, seen: true })));
    }
    if (tab === "media") {
      setPhotos(prev => prev.map(p => ({ ...p, seen: true })));
      setFeedbacks(prev => prev.map(f => ({ ...f, seen: true })));
    }
  }, [tab]);

  const todayRev = orders.filter(o => o.status !== "cancelled" && o.date === todayStr()).reduce((s, o) => s + o.total, 0);
  const monthRev = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  // Doanh thu 6 tháng gần nhất — tính từ orders thực, không hardcode
  const revData = (() => {
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const prefix = `${y}-${String(m).padStart(2, "0")}`;
      const v = orders.filter(o => o.status !== "cancelled" && o.date && o.date.startsWith(prefix)).reduce((s, o) => s + (o.total || 0), 0);
      result.push({ m: `T${m}`, v });
    }
    return result;
  })();
  const activeCount = orders.filter(o => ["active", "confirmed", "pending"].includes(o.status)).length;
  const approvedFeedbacks = (feedbacks || []).filter(f => f.status === "approved");
  const avgRating = approvedFeedbacks.length ? (approvedFeedbacks.reduce((s, f) => s + f.rating, 0) / approvedFeedbacks.length).toFixed(1) : "—";
  const totalRegisteredUsers = Object.keys(users || {}).length;

  const filteredOrders = orders.filter(o => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (search && !`${o.id} ${o.name} ${o.cameraName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveCam = (original, edited) => {
    setCameras(p => p.map(c => c.id === original.id ? { ...edited } : c));
    setEditCam(null);
  };

  const saveAcc = (original, edited) => {
    setAccessories(p => p.map(a => a.id === original.id ? { ...edited } : a));
    setEditAcc(null);
  };

  const addCamera = () => {
    if (!nc.name || !nc.price) return;
    setCameras(p => [...p, { ...nc, id: newCamId(), price: parseInt(nc.price) }]);
    setNc({ name: "", price: "", desc: "", qty: 1, status: "available", icon: "📷", images: [] });
    setAddCamOpen(false);
  };

  const saveSiteContent = () => {
    // Force a setSiteContent call to ensure the latest siteContent is persisted to storage
    setSiteContent(prev => ({ ...prev }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const unseenPhotosCount = 0; // Photos sync đã tắt

  const unseenFeedbackCount = (feedbacks || []).filter(f => f.status === "pending" && !f.seen).length;

  const TABS = [
    { k: "overview", l: "📊 Tổng quan" },
    { k: "cameras", l: "📷 Máy ảnh" },
    { k: "accessories", l: "🎒 Phụ kiện" },
    { k: "orders", l: "📋 Đơn thuê", badge: unseenCount },
    { k: "calendar", l: "📅 Lịch thuê" },
    { k: "media", l: "⭐ Feedback", badge: unseenFeedbackCount },
    { k: "users", l: "👥 Khách hàng" },
    { k: "discounts", l: "🏷️ Mã giảm giá" },
    { k: "inventory", l: "📦 Tồn kho" },
    { k: "content", l: "✏️ Nội dung web" },
    { k: "security", l: "🔑 Bảo mật" },
  ];

  const STitle = ({ c, extra }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
      </div>
      {extra}
    </div>
  );

  const hotCam = cameras.reduce((best, c) => {
    const cnt = orders.filter(o => o.cameraId === c.id && o.status !== "cancelled").length;
    return cnt > (best.cnt || 0) ? { ...c, cnt } : best;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui,sans-serif", position: "relative", zIndex: 1 }}>
      <style>{`
        *{box-sizing:border-box;}
        input:focus,textarea:focus,select:focus{border-color:#2E2E2E55!important;outline:none;}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes newOrderIn{0%{background:#2E2E2E18;box-shadow:0 0 0 2px #2E2E2E88}60%{background:#2E2E2E08;box-shadow:0 0 0 1px #2E2E2E33}100%{background:transparent;box-shadow:none}}
        .new-order-flash{animation:newOrderIn 2.8s ease forwards}
      `}</style>

      {/* SIDEBAR DRAWER */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, left: navOpen ? 0 : -260, bottom: 0, zIndex: 999,
        width: 248, background: "linear-gradient(175deg, rgba(232,240,248,0.94) 0%, rgba(197,216,236,0.88) 55%, rgba(181,206,230,0.84) 100%)",
        backdropFilter: "blur(32px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(32px) saturate(180%) brightness(1.04)",
        borderRight: "1px solid rgba(255,255,255,0.60)",
        boxShadow: navOpen ? "1px 0 0 rgba(255,255,255,0.80) inset, 4px 0 40px rgba(0,0,0,0.28)" : "none",
        transition: "left .28s cubic-bezier(0.22,1,0.36,1)",
        display: "flex", flexDirection: "column", paddingTop: 0, overflowY: "auto",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(139,174,207,0.35)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Logo size={0.62} />
          <button onClick={() => setNavOpen(false)} style={{ background: "rgba(8,20,36,0.08)", border: "1px solid rgba(8,20,36,0.12)", color: TXT, width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* Nav items */}
        <div style={{ padding: "10px 10px", flex: 1 }}>
          {TABS.map(t => {
            const isActive = tab === t.k;
            return (
              <button key={t.k} onClick={() => { setTab(t.k); setNavOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11,
                padding: "11px 14px", borderRadius: 11, border: "none", cursor: "pointer",
                background: isActive ? "rgba(8,20,36,0.10)" : "transparent",
                color: isActive ? TXT : MUT,
                fontFamily: "system-ui,sans-serif", fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                textAlign: "left", marginBottom: 2,
                borderLeft: isActive ? `3px solid ${BR}` : "3px solid transparent",
                transition: "all .18s", position: "relative",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(8,20,36,0.06)"; e.currentTarget.style.color = TXT; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUT; } }}
              >
                <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{t.l.split(" ")[0]}</span>
                <span style={{ flex: 1 }}>{t.l.split(" ").slice(1).join(" ")}</span>
                {t.badge > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(139,174,207,0.35)", flexShrink: 0 }}>
          <button onClick={onBack} style={{ width: "100%", padding: "10px 14px", background: "rgba(8,20,36,0.06)", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", textAlign: "left" }}>← Về trang web</button>
        </div>
      </div>

      {/* ADMIN HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.55)", backdropFilter: "blur(32px) saturate(160%)", WebkitBackdropFilter: "blur(32px) saturate(160%)", borderBottom: `1px solid rgba(42,42,42,0.6)`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, transition: "background .3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Hamburger */}
          <button onClick={() => setNavOpen(v => !v)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5, flexShrink: 0 }}>
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
          </button>
          {/* Logo nhỏ + tên tab hiện tại */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={0.58} />
            <span style={{ color: "rgba(255,255,255,0.30)", fontSize: 13 }}>|</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
              {TABS.find(t => t.k === tab)?.l || ""}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Badge tổng */}
          {(unseenCount + unseenFeedbackCount) > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>{unseenCount + unseenFeedbackCount}</span>
          )}
          <button onClick={onBack} style={{ background: "none", border: `1px solid rgba(255,255,255,0.15)`, color: "rgba(255,255,255,0.45)", padding: "6px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>← Web</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 14px" : "32px 24px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <STitle c="Dashboard tổng quan" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { l: "Doanh thu hôm nay", v: fmtVND(todayRev), c: "#22c55e", icon: "💰" },
                { l: "Doanh thu tháng", v: fmtVND(monthRev), c: G, icon: "📈" },
                { l: "Đơn đang xử lý", v: activeCount, c: "#60a5fa", icon: "📋" },
                { l: "Đơn mới (chưa xem)", v: unseenCount, c: "#ef4444", icon: "🔔" },
                { l: "Đánh giá trung bình", v: avgRating === "—" ? "—" : `${avgRating} ★`, c: G, icon: "⭐" },
                { l: "Tổng feedback", v: (feedbacks || []).length, c: "#a78bfa", icon: "💬" },
                { l: "Chờ duyệt feedback", v: (feedbacks || []).filter(f => f.status === "pending").length, c: "#f59e0b", icon: "⏳" },
                { l: "Khách đăng ký", v: totalRegisteredUsers, c: "#38bdf8", icon: "👥" },
              ].map(s => (
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 14, padding: "20px 18px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ color: MUT, fontSize: 11, marginTop: 5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>Doanh thu theo tháng</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BR2} />
                    <XAxis dataKey="m" tick={{ fill: MUT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUT, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(1) + "M"} />
                    <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 10, color: TXT, fontSize: 12 }} formatter={v => [fmtVND(v), "Doanh thu"]} />
                    <Bar dataKey="v" fill={G} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 18, flex: 1 }}>
                  <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>MÁY HOT NHẤT</div>
                  {hotCam.name ? (
                    <div>
                      <div style={{ fontSize: 30, marginBottom: 6 }}>{hotCam.icon || "📷"}</div>
                      <div style={{ color: G, fontWeight: 700, fontSize: 14 }}>{hotCam.name}</div>
                      <div style={{ color: MUT, fontSize: 11, marginTop: 4 }}>{hotCam.cnt} đơn đã thuê</div>
                    </div>
                  ) : <div style={{ color: MUT, fontSize: 12 }}>Chưa có dữ liệu</div>}
                </div>
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 18, flex: 1 }}>
                  <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>TRẠNG THÁI KHO</div>
                  {[["Còn máy", cameras.filter(c => c.status === "available").length, "#22c55e"],
                  ["Đang thuê", cameras.filter(c => c.status === "rented").length, "#f59e0b"],
                  ["Hết máy", cameras.filter(c => c.status === "unavailable").length, "#ef4444"]].map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BR2}` }}>
                      <span style={{ color: MUT, fontSize: 11 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700, fontSize: 12 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent orders */}
            <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>Đơn gần nhất</div>
                <button onClick={() => setTab("orders")} style={{ background: "none", border: "none", color: G, cursor: "pointer", fontSize: 12 }}>Xem tất cả →</button>
              </div>
              {orders.slice(0, 5).map(o => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BR2}`, flexWrap: "wrap", gap: 6 }}>
                  <div>
                    <span style={{ color: !o.seen ? "#60a5fa" : TXT, fontWeight: !o.seen ? 800 : 600, fontSize: 13, fontFamily: "monospace" }}>{o.id}</span>
                    {!o.seen && <span style={{ marginLeft: 6, background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>MỚI</span>}
                    <div style={{ color: MUT, fontSize: 11 }}>{o.name} · {o.cameraName}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: G, fontWeight: 700, fontSize: 13 }}>{fmtVND(o.total)}</span>
                    <Badge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CAMERAS */}
        {tab === "cameras" && (
          <div>
            <STitle c={`Quản lý máy ảnh (${cameras.length})`} extra={
              <button onClick={() => setAddCamOpen(true)} style={{ ...btn("gold"), display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Thêm máy ảnh
              </button>
            } />

            {/* ADD CAMERA FORM */}
            {addCamOpen && (
              <div style={{ background: CARD2, border: `1px solid ${G}44`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ color: G, fontWeight: 700, fontSize: 14, marginBottom: 18 }}>📷 Thêm máy mới</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TÊN MÁY *</div>
                    <input style={inp2} value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} placeholder="VD: Sony A7 IV" />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/NGÀY *</div>
                    <input style={inp2} type="number" value={nc.price} onChange={e => setNc(p => ({ ...p, price: e.target.value }))} placeholder="200000" />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LƯỢNG</div>
                    <input style={inp2} type="number" min={1} value={nc.qty} onChange={e => setNc(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÔ TẢ</div>
                    <input style={inp2} value={nc.desc} onChange={e => setNc(p => ({ ...p, desc: e.target.value }))} placeholder="Mô tả ngắn về máy..." />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TRẠNG THÁI</div>
                    <select style={{ ...inp2, cursor: "pointer" }} value={nc.status} onChange={e => setNc(p => ({ ...p, status: e.target.value }))}>
                      <option value="available">Còn máy</option>
                      <option value="rented">Đang thuê</option>
                      <option value="unavailable">Hết máy</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: MUT, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>HÌNH ẢNH SẢN PHẨM</div>
                  <ImageUploader images={nc.images} onChange={imgs => setNc(p => ({ ...p, images: imgs }))} max={6} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={addCamera} disabled={!nc.name || !nc.price} style={{ ...btn("gold"), opacity: !nc.name || !nc.price ? 0.5 : 1 }}>✓ Đăng sản phẩm</button>
                  <button onClick={() => setAddCamOpen(false)} style={btn("ghost")}>Huỷ</button>
                </div>
              </div>
            )}

            {/* CAMERA LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cameras.map(c => (
                <div key={c.id} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {/* Thumbnail */}
                    <div style={{ flexShrink: 0, width: 70, height: 70, borderRadius: 12, overflow: "hidden", background: CARD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, border: `1px solid ${BR2}` }}>
                      {c.images?.length > 0
                        ? <img src={c.images[0]} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{c.icon}</span>}
                    </div>

                    {/* Info / Edit */}
                    <div style={{ flex: 1 }}>
                      {editCam?.id === c.id ? (
                        <div>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr", gap: 9, marginBottom: 10 }}>
                            <input style={inp2} value={editCam.name} onChange={e => setEditCam(p => ({ ...p, name: e.target.value }))} placeholder="Tên máy" />
                            <input style={inp2} type="number" value={editCam.price} onChange={e => setEditCam(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} placeholder="Giá/ngày" />
                            <input style={inp2} type="number" min={1} value={editCam.qty} onChange={e => setEditCam(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} placeholder="SL" />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr", gap: 9, marginBottom: 10 }}>
                            <input style={inp2} value={editCam.desc} onChange={e => setEditCam(p => ({ ...p, desc: e.target.value }))} placeholder="Mô tả" />
                            <select style={{ ...inp2, cursor: "pointer" }} value={editCam.status} onChange={e => setEditCam(p => ({ ...p, status: e.target.value }))}>
                              <option value="available">Còn máy</option>
                              <option value="rented">Đang thuê</option>
                              <option value="unavailable">Hết máy</option>
                            </select>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>HÌNH ẢNH ({(editCam.images || []).length}/6)</div>
                            <ImageUploader images={editCam.images || []} onChange={imgs => setEditCam(p => ({ ...p, images: imgs }))} max={6} />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveCam(c, editCam)} style={btn("gold")}>✓ Lưu & cập nhật web</button>
                            <button onClick={() => setEditCam(null)} style={btn("ghost")}>Huỷ</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ color: TXT, fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                            <Badge status={c.status} />
                            {c.images?.length > 0 && <span style={{ color: G, fontSize: 10, background: G + "15", padding: "2px 8px", borderRadius: 99 }}>📷 {c.images.length} ảnh</span>}
                          </div>
                          <div style={{ color: MUT, fontSize: 12, marginBottom: 6 }}>{c.desc}</div>
                          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <span style={{ color: G, fontWeight: 700, fontSize: 13 }}>{fmtVND(c.price)}/ngày</span>
                            <span style={{ color: MUT, fontSize: 11 }}>SL: {c.qty}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {editCam?.id !== c.id && (
                      <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                        <button onClick={() => setEditCam({ ...c, images: c.images || [] })} style={btn("ghost")}>✏️ Sửa</button>
                        <button onClick={() => setCameras(p => p.filter(x => x.id !== c.id))} style={btn("danger")}>🗑</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACCESSORIES */}
        {tab === "accessories" && (() => {
          // ── Tính stats phụ kiện ──
          const activeOrders = orders.filter(o => ["pending","confirmed","active"].includes(o.status));
          const getAccRented = (accName) => {
            let total = 0;
            activeOrders.forEach(o => {
              if (o.accessoriesDetail) {
                const d = o.accessoriesDetail.find(x => x.name === accName);
                if (d) total += (d.qty || 1);
              } else if (o.accessories && o.accessories.some(a => a === accName || a.startsWith(accName + " x"))) {
                total += 1;
              }
            });
            return total;
          };
          const accRevenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => {
            if (!o.accessoriesDetail || !o.days) return s;
            return s + o.accessoriesDetail.reduce((ss, d) => {
              const found = accessories.find(a => a.name === d.name);
              if (!found) return ss;
              const unitP = o.days === 0.5 ? (found.priceShift != null ? found.priceShift : Math.round(found.price / 2)) : found.price;
              const mult  = o.days === 0.5 ? 1 : o.days;
              return ss + unitP * (d.qty || 1) * mult;
            }, 0);
          }, 0);
          const totalRentedUnits = accessories.reduce((s, a) => s + getAccRented(a.name), 0);
          const inp3 = { ...inp2, fontSize: 12 };

          return (
          <div>
            <STitle c={`Phụ kiện (${accessories.length})`} extra={
              <button onClick={() => { setAddAcc(true); }} style={btn("gold")}>+ Thêm phụ kiện</button>
            } />

            {/* ── Stats bar ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { icon: "🎒", l: "Tổng mặt hàng", v: accessories.length, c: "#60a5fa" },
                { icon: "📦", l: "Đang cho thuê", v: `${totalRentedUnits} cái`, c: "#f59e0b" },
                { icon: "💰", l: "Doanh thu PK", v: fmtVND(accRevenue), c: "#22c55e" },
              ].map(s => (
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 14, padding: "16px 14px" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ color: MUT, fontSize: 10, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* ── Form thêm mới ── */}
            {addAcc && (
              <div style={{ background: CARD2, border: `1px solid ${G}44`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
                <div style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>➕ THÊM PHỤ KIỆN MỚI</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TÊN</div>
                    <input style={inp3} value={na.name} onChange={e => setNa(p => ({ ...p, name: e.target.value }))} placeholder="Tripod 3 chân..." />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/NGÀY (₫)</div>
                    <input style={inp3} type="number" value={na.price} onChange={e => setNa(p => ({ ...p, price: e.target.value }))} placeholder="50000" />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/BUỔI (₫)</div>
                    <input style={inp3} type="number" value={na.priceShift} onChange={e => setNa(p => ({ ...p, priceShift: e.target.value }))} placeholder="35000 (tuỳ chọn)" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÔ TẢ NGẮN</div>
                    <input style={inp3} value={na.desc} onChange={e => setNa(p => ({ ...p, desc: e.target.value }))} placeholder="Dùng được với mọi loại máy..." />
                  </div>
                  <div>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LƯỢNG KHO</div>
                    <input style={inp3} type="number" min={1} value={na.qty} onChange={e => setNa(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} placeholder="1" />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>ẢNH ICON (tuỳ chọn)</div>
                  <AccIconUploader image={na.image} onChange={img => setNa(p => ({ ...p, image: img }))} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => {
                    if (!na.name || !na.price) return;
                    setAccessories(p => [...p, {
                      id: Date.now(), name: na.name,
                      price: parseInt(na.price),
                      priceShift: na.priceShift ? parseInt(na.priceShift) : null,
                      qty: na.qty || 1,
                      active: na.active,
                      desc: na.desc,
                      image: na.image || "",
                    }]);
                    setNa({ name: "", price: "", qty: 1, active: true, priceShift: "", desc: "", image: "" });
                    setAddAcc(false);
                  }} style={btn("gold")}>✓ Lưu</button>
                  <button onClick={() => setAddAcc(false)} style={btn("ghost")}>Huỷ</button>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: "auto" }}>
                    <span style={{ color: MUT, fontSize: 11 }}>Hiển thị cho khách</span>
                    <div onClick={() => setNa(p => ({ ...p, active: !p.active }))}
                      style={{ width: 38, height: 20, borderRadius: 99, background: na.active ? G : "#333", position: "relative", transition: "all .2s", cursor: "pointer", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: na.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ── Danh sách phụ kiện ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accessories.map(a => {
                const rentedNow = getAccRented(a.name);
                const stockLeft = (a.qty || 1) - rentedNow;
                const isEdit = editAcc?.id === a.id;
                return (
                  <div key={a.id} style={{ background: CARD2, border: `1px solid ${a.active === false ? "#33333366" : BR2}`, borderRadius: 14, padding: "14px 16px", opacity: a.active === false ? 0.6 : 1, transition: "all .2s" }}>
                    {isEdit ? (
                      /* ── Chế độ chỉnh sửa ── */
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 9, marginBottom: 9 }}>
                          <div>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>TÊN</div>
                            <input style={inp3} value={editAcc.name} onChange={e => setEditAcc(p => ({ ...p, name: e.target.value }))} />
                          </div>
                          <div>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>GIÁ/NGÀY</div>
                            <input style={inp3} type="number" value={editAcc.price} onChange={e => setEditAcc(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>GIÁ/BUỔI</div>
                            <input style={inp3} type="number" value={editAcc.priceShift || ""} onChange={e => setEditAcc(p => ({ ...p, priceShift: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Để trống = ½ ngày" />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 9, marginBottom: 12 }}>
                          <div>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>MÔ TẢ</div>
                            <input style={inp3} value={editAcc.desc || ""} onChange={e => setEditAcc(p => ({ ...p, desc: e.target.value }))} placeholder="Mô tả ngắn..." />
                          </div>
                          <div>
                            <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>SỐ LƯỢNG</div>
                            <input style={inp3} type="number" min={1} value={editAcc.qty || 1} onChange={e => setEditAcc(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>ẢNH ICON</div>
                          <AccIconUploader image={editAcc.image || ""} onChange={img => setEditAcc(p => ({ ...p, image: img }))} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => saveAcc(a, editAcc)} style={btn("gold")}>✓ Lưu</button>
                          <button onClick={() => setEditAcc(null)} style={btn("ghost")}>Huỷ</button>
                        </div>
                      </div>
                    ) : (
                      /* ── Chế độ xem ── */
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Hàng 1: tên + badges */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                            {a.active === false && (
                              <span style={{ background: "#33333366", color: "#888", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>ẨN</span>
                            )}
                            {rentedNow > 0 && (
                              <span style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>
                                {rentedNow} đang thuê
                              </span>
                            )}
                          </div>
                          {/* Hàng 2: mô tả */}
                          {a.desc && <div style={{ color: MUT, fontSize: 11, marginBottom: 7 }}>{a.desc}</div>}
                          {/* Hàng 3: giá + kho */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ color: G, fontWeight: 700, fontSize: 12 }}>{fmtVND(a.price)}/ngày</span>
                            {a.priceShift && (
                              <span style={{ color: G + "aa", fontSize: 11 }}>· {fmtVND(a.priceShift)}/buổi</span>
                            )}
                            <span style={{ color: stockLeft > 0 ? "#22c55e" : "#ef4444", fontSize: 11, background: stockLeft > 0 ? "#22c55e15" : "#ef444415", padding: "2px 8px", borderRadius: 99 }}>
                              Kho: {stockLeft}/{a.qty || 1}
                            </span>
                          </div>
                        </div>
                        {/* Actions: toggle active + edit + delete */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                          {/* Toggle active */}
                          <div onClick={() => setAccessories(p => p.map(x => x.id === a.id ? { ...x, active: x.active === false ? true : false } : x))}
                            title={a.active === false ? "Bật hiển thị" : "Ẩn khỏi trang khách"}
                            style={{ width: 36, height: 18, borderRadius: 99, background: a.active === false ? "#333" : G, position: "relative", cursor: "pointer", transition: "all .2s", flexShrink: 0 }}>
                            <div style={{ position: "absolute", top: 1, left: a.active === false ? 1 : 17, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setEditAcc({ ...a })} style={{ ...btn("ghost"), padding: "5px 9px", fontSize: 13 }}>✏️</button>
                            <button onClick={() => setAccessories(p => p.filter(x => x.id !== a.id))} style={{ ...btn("danger"), padding: "5px 9px", fontSize: 13 }}>🗑</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* ORDERS */}
        {tab === "orders" && (
          <div>
            <STitle c={`Đơn thuê (${orders.length})`} />

            {/* ── XUẤT EXCEL ── */}
            <div style={{ background: "#EEF9F4", border: "1px solid #22c55e33", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: "#22c55e", fontSize: 18 }}>📊</span>
              <div>
                <div style={{ color: TXT, fontSize: 12, fontWeight: 600 }}>Xuất báo cáo Excel</div>
                <div style={{ color: MUT, fontSize: 10 }}>Danh sách đơn + tổng kết doanh thu theo tháng</div>
              </div>
              {/* Month navigator */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => {
                    const [y, m] = exportMonth.split("-").map(Number);
                    const d = new Date(y, m - 2);
                    setExportMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
                  }}
                  style={{ width: 28, height: 28, background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, color: TXT, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
                  ‹
                </button>
                <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)}
                  style={{ padding: "6px 10px", background: CARD2, border: `1px solid ${G}55`, borderRadius: 10, color: G, fontSize: 12, fontFamily: "system-ui,sans-serif", outline: "none", fontWeight: 700, textAlign: "center", cursor: "pointer" }} />
                <button
                  onClick={() => {
                    const [y, m] = exportMonth.split("-").map(Number);
                    const d = new Date(y, m);
                    setExportMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
                  }}
                  style={{ width: 28, height: 28, background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, color: TXT, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
                  ›
                </button>
              </div>
              <button onClick={handleExportExcel} disabled={exporting}
                style={{ padding: "8px 18px", background: exporting ? "#111" : "#0d2010", color: exporting ? MUT : "#22c55e", border: "1px solid #22c55e44", borderRadius: 10, cursor: exporting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap", transition: "all .2s" }}>
                {exporting ? "⏳ Đang xuất..." : "⬇️ Tải Excel"}
              </button>
            </div>

            {/* New orders alert */}
            {orders.filter(o => !o.seen).length > 0 && (
              <div style={{ background: "#F5F0FF", border: "1px solid #a78bfa44", borderRadius: 9, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>Có {orders.filter(o => !o.seen).length} đơn mới chưa xem!</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên, mã đơn, máy..." style={{ ...inp2, width: 280 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["all", "pending", "confirmed", "active", "completed", "cancelled"].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    style={{ padding: "8px 12px", background: orderFilter === s ? "#FFF8ED" : CARD, color: orderFilter === s ? G : MUT, border: `1px solid ${orderFilter === s ? G : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: orderFilter === s ? 700 : 400, transition: "all .2s" }}>
                    {s === "all" ? "Tất cả" : (STATUS_CFG[s]?.label || s)}
                  </button>
                ))}
              </div>
            </div>
            {/* Tra cứu nhanh theo mã đơn */}
            <QuickOrderLookup orders={orders} inp2={inp2} setExpandedOrder={setExpandedOrder} setSearch={setSearch} setOrderFilter={setOrderFilter} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredOrders.length === 0 && <div style={{ color: MUT, textAlign: "center", padding: 40, fontSize: 14 }}>Không tìm thấy đơn nào</div>}
              {filteredOrders.map(o => (
                <div key={o.id} className={newOrderIds.has(o.id) ? "new-order-flash" : ""} style={{ background: CARD2, border: `1px solid ${!o.seen ? "#60a5fa33" : BR2}`, borderRadius: 14, overflow: "hidden" }}>
                  {/* Order header */}
                  <div onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                    style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <span style={{ color: !o.seen ? "#60a5fa" : TXT, fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>{o.id}</span>
                        {!o.seen && <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>MỚI</span>}
                        {o.adminNote && <span title={o.adminNote} style={{ background: "#FFF8ED", color: "#f59e0b", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, cursor: "help" }}>🔒 NOTE</span>}
                        <Badge status={o.status} />
                      </div>
                      <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>{o.date} · {o.name} · 📞 {o.phone}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: G, fontSize: 18, fontWeight: 800 }}>{fmtVND(o.total)}</div>
                      <div style={{ color: MUT, fontSize: 11 }}>{fmtDays(o.days, o.session || o.shift)}</div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedOrder === o.id && (
                    <div style={{ borderTop: `1px solid ${BR2}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <span style={{ padding: "3px 10px", background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, color: TXT, fontSize: 11 }}>📷 {o.cameraName}</span>
                        {(() => { const sess = o.session || o.shift; return (sess === "morning" || sess === "afternoon") ? <span style={{ padding: "3px 10px", background: sess === "morning" ? "#0a0800" : "#080010", border: `1px solid ${sess === "morning" ? "#f59e0b44" : "#818cf844"}`, borderRadius: 99, color: sess === "morning" ? "#f59e0b" : "#818cf8", fontSize: 11 }}>{sess === "morning" ? "🌅 Ca sáng 6h–12h" : "🌇 Ca chiều 14h–20h"}</span> : null; })()}
                        {o.accessories.map(a => <span key={a} style={{ padding: "3px 10px", background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, color: MUT, fontSize: 11 }}>{a}</span>)}
                      </div>

                      {/* Giờ nhận / giờ trả */}
                      {(() => {
                        if (!o.date || !o.days) return null;
                        const fmtD = (ds) => new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
                        let pickTime, pickDate, dropTime, dropDate;
                        if (o.days === 0.5) {
                          const _sess = o.session || o.shift;
                          pickTime = _sess === "morning" ? "06:00" : _sess === "afternoon" ? "14:00" : "--:--";
                          dropTime = _sess === "morning" ? "12:00" : _sess === "afternoon" ? "20:00" : "--:--";
                          pickDate = dropDate = fmtD(o.date);
                        } else {
                          pickTime = dropTime = "12:00";
                          pickDate = fmtD(o.date);
                          dropDate = fmtD(dateAddDays(o.date, o.days));
                        }
                        return (
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#EEF9F4", border:"1px solid #22c55e33", borderRadius:10, padding:"4px 10px", fontSize:11, color:"#22c55e", fontWeight:700 }}>
                              Nhận: {pickTime} · {pickDate}
                            </span>
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#FFF8ED", border:"1px solid #f59e0b33", borderRadius:10, padding:"4px 10px", fontSize:11, color:"#f59e0b", fontWeight:700 }}>
                              Trả: {dropTime} · {dropDate}
                            </span>
                          </div>
                        );
                      })()}

                      {o.address && <div style={{ color: MUT, fontSize: 11, marginBottom: 6 }}>📍 {o.address}</div>}
                      {o.note && <div style={{ color: MUT, fontSize: 11, marginBottom: 12, fontStyle: "italic" }}>💬 {o.note}</div>}

                      {/* Nút sao chép — hiện cho MỌI trạng thái */}
                      <div style={{ marginBottom:12 }}>
                        <CopyOrderBtn copyFn={() => {
                          const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                          const fmtD = (ds) => new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
                          let pickTime, pickDate, dropTime, dropDate;
                          if (o.date && o.days) {
                            if (o.days === 0.5) {
                              pickTime = (o.session||o.shift) === "morning" ? "06:00" : (o.session||o.shift) === "afternoon" ? "14:00" : "--:--";
                              dropTime = (o.session||o.shift) === "morning" ? "12:00" : (o.session||o.shift) === "afternoon" ? "20:00" : "--:--";
                              pickDate = dropDate = fmtD(o.date);
                            } else {
                              pickTime = dropTime = "12:00";
                              pickDate = fmtD(o.date);
                              dropDate = fmtD(dateAddDays(o.date, o.days));
                            }
                          }
                          const statusLabels = { pending:"Chờ xác nhận", confirmed:"Đã xác nhận", active:"Đang thuê", completed:"Hoàn thành", cancelled:"Đã huỷ" };
                          const lines = [
                            "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `Mã đơn : ${o.id}`,
                            `📷 Máy  : ${o.cameraName}`,
                            `🎒 Phụ kiện: ${accList}`,
                            `📅 Ngày thuê: ${o.date}`,
                            `⏱ Thời gian: ${fmtDays(o.days, o.session || o.shift)}`,
                            pickDate ? `📦 Giờ nhận : ${pickTime} · ${pickDate}` : null,
                            dropDate ? `📅 Giờ trả  : ${dropTime} · ${dropDate}` : null,
                            o.discountCode ? `🏷️ Mã giảm giá: ${o.discountCode} (-${fmtVND(o.discountAmt || 0)})` : null,
                            `💰 Tổng tiền: ${fmtVND(o.total)}`,
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `👤 Tên   : ${o.name}`,
                            `📞 SĐT   : ${o.phone}`,
                            `📍 Địa chỉ: ${o.address || "—"}`,
                            o.note ? `💬 Ghi chú: ${o.note}` : null,
                            "━━━━━━━━━━━━━━━━━━━━━━",
                            `⏳ Trạng thái: ${statusLabels[o.status] || o.status}`,
                          ].filter(Boolean).join("\n");
                          navigator.clipboard?.writeText(lines).catch(() => {});
                        }} />
                      </div>

                      {/* ── GHI CHÚ NỘI BỘ (chỉ admin thấy) ── */}
                      <AdminNoteEditor order={o} setOrders={setOrders} />
                      {o.discountCode && (
                        <div style={{ color: "#22c55e", fontSize: 11, marginBottom: 8, background: "#EEF9F4", border: "1px solid #22c55e22", borderRadius: 10, padding: "6px 12px" }}>
                          🏷️ Mã giảm giá: <strong>{o.discountCode}</strong> — Giảm {fmtVND(o.discountAmt || 0)} · Tổng gốc: {fmtVND(o.subtotal || o.total)}
                        </div>
                      )}
                      <div style={{ borderTop: `1px solid ${BR2}`, paddingTop: 12 }}>
                        <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ĐỔI TRẠNG THÁI:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(ORDER_STATUSES).map(([s, l]) => (
                            <button key={s} onClick={() => {
                              setOrders(p => p.map(x => x.id === o.id ? { ...x, status: s } : x));
                              // FIX RACE: đánh dấu đơn này vừa được admin sửa — lock 15s
                              localOrderChangesRef.current.set(o.id, Date.now());
                              // NOTE: usedCount đã được tăng lúc khách đặt đơn (BookingModal.handleFinish)
                              // Không tăng lại ở đây tránh double-count
                            }}
                              style={{ padding: "6px 12px", background: o.status === s ? "#FFF8ED" : CARD, color: o.status === s ? G : MUT, border: `1px solid ${o.status === s ? G + "55" : BR2}`, borderRadius: 99, cursor: "pointer", fontSize: 11, fontWeight: o.status === s ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <DeleteOrderBtn orderId={o.id} onDelete={() => { deletedOrderIdsRef.current.add(o.id); localOrderChangesRef.current.set(o.id, Date.now()); setOrders(p => p.filter(x => x.id !== o.id)); setExpandedOrder(null); }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEEDBACK — chỉ còn mục feedback, đã bỏ ảnh khách */}
        {tab === "media" && (
          <div>

            {/* ── Feedback đơn thuê ── */}
            {(() => {
              const fb = feedbacks || [];
              const pending = fb.filter(f => f.status === "pending");
              const approved = fb.filter(f => f.status === "approved");
              const rejected = fb.filter(f => f.status === "rejected");
              const approveFb = (id) => setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: "approved", seen: true } : f));
              const rejectFb = (id) => setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: "rejected", seen: true } : f));
              const toggleHide = (id) => setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, hidden: !f.hidden } : f));
              const deleteFb = (id) => setFeedbacks(prev => prev.filter(f => f.id !== id));
              const FbCard = ({ f, actions }) => (
                <div style={{ background: CARD, border: `1px solid ${f.status === "approved" ? "#22c55e33" : f.status === "rejected" ? "#ef444433" : BR}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: G, fontSize: 14 }}>{"★".repeat(f.rating)}<span style={{ color: MUT }}>{"★".repeat(5 - f.rating)}</span></span>
                        {f.hidden && <span style={{ background: "#44444422", color: "#888", borderRadius: 99, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>HIDDEN</span>}
                      </div>
                      <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{f.userName}</div>
                      <div style={{ color: MUT, fontSize: 11 }}>📞 {f.phone} · 📷 {f.cameraName}</div>
                      <div style={{ color: MUT, fontSize: 10, marginTop: 2 }}>Đơn: {f.orderId} · {f.date}</div>
                    </div>
                  </div>
                  {f.text && <div style={{ color: TXT, fontSize: 12, lineHeight: 1.6, marginBottom: 12, background: CARD, padding: "8px 10px", borderRadius: 10, fontStyle: "italic" }}>"{f.text}"</div>}
                  {f.images?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      {f.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 12, border: `1px solid ${BR}` }} loading="lazy" />)}
                    </div>
                  )}
                  {actions}
                </div>
              );
              return (
                <>
                  <STitle c={`Feedback đơn thuê (${fb.length})`} />
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>⏳ Chờ duyệt</div>
                      {pending.length > 0 && <span style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{pending.length}</span>}
                    </div>
                    {pending.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Không có feedback chờ duyệt</div> : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
                        {pending.map(f => (
                          <FbCard key={f.id} f={f} actions={
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => approveFb(f.id)} style={{ flex: 1, padding: "8px 0", background: "#EEF9F4", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✓ Duyệt</button>
                              <button onClick={() => rejectFb(f.id)} style={{ flex: 1, padding: "8px 0", background: "#FEF0F0", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✕ Từ chối</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "8px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
                            </div>
                          } />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>✅ Đã duyệt — hiện trang chủ</div>
                      {approved.length > 0 && <span style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{approved.length}</span>}
                    </div>
                    {approved.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có feedback được duyệt</div> : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
                        {approved.map(f => (
                          <FbCard key={f.id} f={f} actions={
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => toggleHide(f.id)} style={{ flex: 1, padding: "7px 0", background: f.hidden ? "#052210" : "#1a1a00", border: `1px solid ${f.hidden ? "#22c55e44" : G + "44"}`, color: f.hidden ? "#22c55e" : G, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                                {f.hidden ? "👁 Hiện lại" : "🙈 Ẩn"}
                              </button>
                              <button onClick={() => rejectFb(f.id)} style={{ flex: 1, padding: "7px 0", background: "#FEF0F0", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Gỡ</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
                            </div>
                          } />
                        ))}
                      </div>
                    )}
                  </div>
                  {rejected.length > 0 && (
                    <div>
                      <div style={{ color: MUT, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>✕ Từ chối ({rejected.length})</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
                        {rejected.map(f => (
                          <FbCard key={f.id} f={f} actions={
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => approveFb(f.id)} style={{ flex: 1, padding: "7px 0", background: "#EEF9F4", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Duyệt lại</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
                            </div>
                          } />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <STitle c={`Khách hàng đã đăng ký (${Object.keys(users || {}).length})`} />
            {Object.keys(users || {}).length === 0 ? (
              <div style={{ textAlign: "center", color: MUT, padding: 40, fontSize: 14 }}>Chưa có khách hàng đăng ký tài khoản</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(users || {}).map(([phone, u]) => {
                  const userOrders = orders.filter(o => o.phone === phone);
                  const userFeedbacks = (feedbacks || []).filter(f => f.phone === phone);
                  const totalSpent = userOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
                  const totalDays = userOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.days || 0), 0);
                  let badge = null;
                  if (userOrders.length >= 5) badge = { icon: "🥇", label: "Khách Vàng", col: G };
                  else if (userOrders.length >= 3) badge = { icon: "🥈", label: "Khách Bạc", col: "#aaa" };
                  else if (userOrders.length >= 1) badge = { icon: "🥉", label: "Khách Đồng", col: "#cd7f32" };
                  return (
                    <div key={phone} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: "16px 20px" }}>
                      {/* Header: tên + stats + nút */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                            {badge && <span style={{ background: badge.col + "22", color: badge.col, border: `1px solid ${badge.col}44`, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{badge.icon} {badge.label}</span>}
                          </div>
                          <div style={{ color: MUT, fontSize: 11 }}>📞 {phone}</div>
                          {/* Hiện mật khẩu để admin nhắn Zalo */}
                          <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${G}22`, borderRadius: 10, padding: "4px 10px" }}>
                            <span style={{ color: MUT, fontSize: 10 }}>🔑 Mật khẩu:</span>
                            <span style={{ color: G, fontSize: 11, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>{u.pw || "—"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                          {[
                            { l: "Đơn", v: userOrders.length, c: "#60a5fa" },
                            { l: "Ngày thuê", v: totalDays, c: "#a78bfa" },
                            { l: "Chi tiêu", v: fmtVND(totalSpent), c: G, small: true },
                            { l: "Feedback", v: userFeedbacks.length, c: "#22c55e" },
                          ].map(s => (
                            <div key={s.l} style={{ textAlign: "center" }}>
                              <div style={{ color: s.c, fontWeight: 700, fontSize: s.small ? 11 : 16 }}>{s.v}</div>
                              <div style={{ color: MUT, fontSize: 9, marginTop: 2 }}>{s.l}</div>
                            </div>
                          ))}
                          <button onClick={() => { setResetTarget(phone === resetTarget ? null : phone); setResetPwVal(""); setResetPwMsg(null); }}
                            style={{ padding: "5px 12px", background: resetTarget === phone ? "#0a1a0a" : "#160b0b", border: `1px solid ${resetTarget === phone ? "#22c55e44" : "#ef444430"}`, color: resetTarget === phone ? "#22c55e" : "#ef4444", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {resetTarget === phone ? "✕ Đóng" : "🔑 Đổi mật khẩu"}
                          </button>
                        </div>
                      </div>
                      {/* Đổi mật khẩu inline */}
                      {resetTarget === phone && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BR2}` }}>
                          <div style={{ color: MUT, fontSize: 11, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>
                            Mật khẩu mới cho <span style={{ color: TXT, fontWeight: 700 }}>{u.name}</span>
                            <span style={{ color: MUT, fontSize: 10 }}> · Sau khi lưu nhắn khách qua Zalo</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input value={resetPwVal} onChange={e => { setResetPwVal(e.target.value); setResetPwMsg(null); }} placeholder="Nhập mật khẩu mới..." type="text"
                              style={{ ...inp2, flex: 1, marginBottom: 0, fontFamily: "monospace" }}
                              onKeyDown={e => { if (e.key === "Enter") { if (resetPwVal.length < 4) { setResetPwMsg({ type: "err", text: "Tối thiểu 4 ký tự" }); return; } const updated = { ...users, [phone]: { ...u, pw: resetPwVal } }; setUsers && setUsers(updated); storageSet("k92_users_v1", updated); setResetPwMsg({ type: "ok", text: `✓ Đã đổi! Nhắn khách: MK mới là "${resetPwVal}"` }); setResetPwVal(""); setTimeout(() => { setResetTarget(null); setResetPwMsg(null); }, 3000); }}} />
                            <button onClick={() => { if (resetPwVal.length < 4) { setResetPwMsg({ type: "err", text: "Tối thiểu 4 ký tự" }); return; } const updated = { ...users, [phone]: { ...u, pw: resetPwVal } }; setUsers && setUsers(updated); storageSet("k92_users_v1", updated); setResetPwMsg({ type: "ok", text: `✓ Đã đổi! Nhắn khách: MK mới là "${resetPwVal}"` }); setResetPwVal(""); setTimeout(() => { setResetTarget(null); setResetPwMsg(null); }, 3000); }}
                              style={{ padding: "9px 16px", background: G, color: "#000", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>
                              Lưu
                            </button>
                          </div>
                          {resetPwMsg && <div style={{ marginTop: 8, fontSize: 12, fontFamily: "system-ui,sans-serif", color: resetPwMsg.type === "ok" ? "#22c55e" : "#ef4444", background: resetPwMsg.type === "ok" ? "#0a1a0a" : "#160505", border: `1px solid ${resetPwMsg.type === "ok" ? "#22c55e33" : "#ef444433"}`, borderRadius: 10, padding: "8px 12px" }}>{resetPwMsg.text}</div>}
                        </div>
                      )}
                      {/* Đơn gần đây */}
                      {userOrders.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BR2}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {userOrders.slice(0, 4).map(o => (
                            <span key={o.id} style={{ fontSize: 10, color: MUT, background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, padding: "2px 10px", fontFamily: "monospace" }}>
                              {o.id} <span style={{ color: STATUS_CFG[o.status]?.color || "#888" }}>·{STATUS_CFG[o.status]?.label}</span>
                            </span>
                          ))}
                          {userOrders.length > 4 && <span style={{ fontSize: 10, color: MUT }}>+{userOrders.length - 4} đơn nữa</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <RentalCalendar orders={orders} cameras={cameras} />
        )}

        {/* INVENTORY */}
        {tab === "inventory" && (
          <div>
            <STitle c="Quản lý tồn kho" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
              {[
                { l: "Sẵn sàng cho thuê", c: cameras.filter(c => c.status === "available").length, col: "#22c55e" },
                { l: "Đang cho thuê", c: cameras.filter(c => c.status === "rented").length, col: "#f59e0b" },
                { l: "Hết / Bảo trì", c: cameras.filter(c => c.status === "unavailable").length, col: "#ef4444" }
              ].map(s => (
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.col}30`, borderRadius: 14, padding: "22px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 38, fontWeight: 800, color: s.col }}>{s.c}</div>
                  <div style={{ color: MUT, fontSize: 12, marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, overflow: "hidden", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr", background: CARD, borderBottom: `1px solid ${BR2}` }}>
                {["Ảnh", "Tên máy", "SL tổng", "Đang thuê", "Rảnh", "Trạng thái"].map(h => <div key={h} style={{ padding: "10px 12px", color: MUT, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{h.toUpperCase()}</div>)}
              </div>
              {cameras.map((c, i) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr", borderBottom: i < cameras.length - 1 ? `1px solid ${BR2}` : "none", alignItems: "center" }}>
                  <div style={{ padding: "10px 12px" }}>
                    {c.images?.length > 0
                      ? <img src={c.images[0]} alt={c.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, border: `1px solid ${BR2}` }} />
                      : <div style={{ width: 36, height: 36, background: CARD, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>}
                  </div>
                  <div style={{ padding: "12px 12px", color: TXT, fontSize: 12 }}>{c.name}</div>
                  <div style={{ padding: "12px 12px", color: TXT, fontSize: 12 }}>{c.qty}</div>
                  <div style={{ padding: "12px 12px", color: "#f59e0b", fontSize: 12 }}>{c.status === "rented" ? 1 : 0}</div>
                  <div style={{ padding: "12px 12px", color: "#22c55e", fontSize: 12 }}>{c.status === "available" ? c.qty : 0}</div>
                  <div style={{ padding: "9px 12px", display: "flex", alignItems: "center" }}><Badge status={c.status} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SITE CONTENT */}
        {tab === "content" && (
          <div>
            <STitle c="Chỉnh sửa nội dung website" />
            {saved && (
              <div style={{ background: "#EEF9F4", border: "1px solid #22c55e44", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
                ✓ Đã lưu! Nội dung đã cập nhật ra website ngay lập tức.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>📌 Thông tin liên hệ & Slogan</div>
                {[
                  { k: "zalo", l: "Số Zalo / Hotline" },
                  { k: "phone", l: "Số điện thoại" },
                  { k: "address", l: "Địa chỉ" },
                  { k: "slogan", l: "Slogan header (dòng nhỏ trên logo)" },
                  { k: "tagline", l: "Tagline (dòng nghiêng dưới logo)" },
                  { k: "desc", l: "Mô tả về chúng tôi (trang About)" },
                  { k: "secretText", l: "🔒 Chữ bí mật (hover/giữ vào tên 92 KA MÊ RA)" },
                ].map(f => (
                  <div key={f.k} style={{ marginBottom: 13 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>{f.l.toUpperCase()}</div>
                    {f.k === "desc"
                      ? <textarea style={{ ...inp2, minHeight: 70, resize: "vertical" }} value={siteContent[f.k]} onChange={e => setSiteContent(p => ({ ...p, [f.k]: e.target.value }))} />
                      : <input style={inp2} value={siteContent[f.k]} onChange={e => setSiteContent(p => ({ ...p, [f.k]: e.target.value }))} />
                    }
                  </div>
                ))}
                <button onClick={saveSiteContent} style={{ ...btn("gold"), transition: "background .3s" }}>
                  {saved ? "✓ Đã lưu!" : "💾 Lưu & cập nhật web ngay"}
                </button>
              </div>

              <div>
                {/* SOCIAL LINKS */}
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
                  <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔗 Link mạng xã hội (4 logo đầu trang)</div>
                  <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>Dán link vào ô tương ứng. Logo nào có link sẽ sáng lên và click được. Để trống = mờ, không click.</div>
                  {[
                    { k: "youtube",   label: "YouTube",   ph: "https://youtube.com/@kenh-cua-ban",   svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
                    { k: "facebook",  label: "Facebook",  ph: "https://facebook.com/page-cua-ban",   svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
                    { k: "tiktok",    label: "TikTok",    ph: "https://tiktok.com/@tenban",          svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/></svg> },
                    { k: "instagram", label: "Instagram", ph: "https://instagram.com/tenban",        svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                  ].map(({ k, label, svg, ph }) => {
                    const url = siteContent.socialLinks?.[k];
                    return (
                    <div key={k} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        title={url ? `Mở ${label} ↗` : `Chưa có link ${label}`}
                        onClick={() => url && window.open(url, "_blank")}
                        style={{ width: 34, height: 34, borderRadius: 12, background: url ? `${G}22` : "#111", border: `1px solid ${url ? G + "66" : BR2}`, display: "flex", alignItems: "center", justifyContent: "center", color: url ? G : MUT, flexShrink: 0, cursor: url ? "pointer" : "default", transition: "all .2s", position: "relative" }}
                        onMouseEnter={e => { if (url) { e.currentTarget.style.background = `${G}40`; e.currentTarget.style.transform = "scale(1.1)"; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = url ? `${G}22` : "#111"; e.currentTarget.style.transform = "scale(1)"; }}>
                        {svg}
                        {url && <span style={{ position:"absolute", top:-4, right:-4, width:8, height:8, borderRadius:"50%", background:"#22c55e", border:"1.5px solid #111" }} />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1, display:"flex", alignItems:"center", gap:6 }}>
                          {label.toUpperCase()}
                          {url && <span style={{ color:"#22c55e", fontSize:9, fontWeight:700 }}>● ĐÃ CÓ LINK</span>}
                        </div>
                        <input
                          style={{ ...inp2, fontSize: 11 }}
                          value={url || ""}
                          placeholder={ph}
                          onChange={e => setSiteContent(p => ({ ...p, socialLinks: { ...(p.socialLinks || {}), [k]: e.target.value } }))}
                        />
                      </div>
                    </div>
                    );
                  })}
                  <button onClick={saveSiteContent} style={{ ...btn("gold") }}>
                    {saved ? "✓ Đã lưu!" : "💾 Lưu link mạng xã hội"}
                  </button>
                </div>

                {/* ZALO CONFIG */}
                <div style={{ background: CARD2, border: `1px solid #06c75530`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
                  <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>💬 Cấu hình Zalo thanh toán</div>
                  <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>Link và QR này sẽ hiện ra cho khách ngay sau khi đặt đơn xong.</div>

                  <div style={{ marginBottom: 13 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>LINK ZALO OA / ZALO CÁ NHÂN</div>
                    <input style={inp2} value={siteContent.zaloLink || ""} onChange={e => setSiteContent(p => ({ ...p, zaloLink: e.target.value }))} placeholder="https://zalo.me/0901234567" />
                    <div style={{ color: "#333", fontSize: 10, marginTop: 4 }}>VD: https://zalo.me/0901234567 hoặc link OA của shop</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>ẢNH QR CODE (ZALO / CHUYỂN KHOẢN)</div>
                    {siteContent.zaloQR ? (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div style={{ background: "#fff", borderRadius: 12, padding: 8, flexShrink: 0 }}>
                          <img src={siteContent.zaloQR} alt="QR" style={{ width: 100, height: 100, objectFit: "contain", display: "block" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#22c55e", fontSize: 12, marginBottom: 10 }}>✓ Đã có QR · Khách sẽ thấy sau khi đặt đơn</div>
                          <button onClick={() => setSiteContent(p => ({ ...p, zaloQR: "" }))} style={{ ...btn("danger"), fontSize: 11 }}>🗑 Xoá QR</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "block", border: `2px dashed ${G}44`, borderRadius: 12, padding: "18px 0", textAlign: "center", cursor: "pointer", background: CARD2, color: MUT, fontSize: 12 }}>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                          <div>Nhấn để upload ảnh QR</div>
                          <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>PNG / JPG · Khuyên dùng QR vuông</div>
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                            const file = e.target.files[0]; if (!file) return;
                            const compressed = await compressImage(file, 600, 0.9);
                            setSiteContent(p => ({ ...p, zaloQR: compressed }));
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                    )}
                  </div>

                  <button onClick={saveSiteContent} style={{ ...btn("gold") }}>
                    {saved ? "✓ Đã lưu!" : "💾 Lưu cấu hình Zalo"}
                  </button>
                </div>
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
                  <div style={{ color: TXT, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>📊 Thống kê hiển thị (trang About)</div>
                  {siteContent.stats.map(([e, n, l], i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                      <input style={{ ...inp2, width: 40, textAlign: "center", padding: "6px 4px" }} value={e} onChange={ev => { const s = [...siteContent.stats]; s[i] = [ev.target.value, n, l]; setSiteContent(p => ({ ...p, stats: s })); }} />
                      <input style={{ ...inp2, width: 70, textAlign: "center", padding: "6px 8px", color: G, fontWeight: 700 }} value={n} onChange={ev => { const s = [...siteContent.stats]; s[i] = [e, ev.target.value, l]; setSiteContent(p => ({ ...p, stats: s })); }} />
                      <input style={{ ...inp2, flex: 1 }} value={l} onChange={ev => { const s = [...siteContent.stats]; s[i] = [e, n, ev.target.value]; setSiteContent(p => ({ ...p, stats: s })); }} />
                    </div>
                  ))}
                  <button onClick={saveSiteContent} style={{ ...btn("ghost"), fontSize: 11, marginTop: 4 }}>Lưu thống kê</button>
                </div>

                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ color: TXT, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>🔢 Tổng hệ thống (tự động)</div>
                  {[
                    [`Tổng máy ảnh`, cameras.length],
                    [`Tổng phụ kiện`, accessories.length],
                    [`Tổng đơn thuê`, orders.length],
                    [`Đơn hoàn thành`, orders.filter(o => o.status === "completed").length],
                    [`Đang xử lý`, activeCount],
                    [`Doanh thu tháng`, fmtVND(monthRev)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BR2}` }}>
                      <span style={{ color: MUT, fontSize: 12 }}>{l}</span>
                      <span style={{ color: G, fontWeight: 700, fontSize: 12 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISCOUNTS */}
        {tab === "discounts" && (() => {
          const discList = discounts || [];
          const saveDisc = () => {
            setDiscMsg(null);
            const code = (discForm.code || "").trim().toUpperCase();
            if (!code) { setDiscMsg({ type: "err", text: "Nhập mã code" }); return; }
            const val = parseFloat(discForm.value);
            if (!val || val <= 0) { setDiscMsg({ type: "err", text: "Giá trị giảm phải > 0" }); return; }
            if (discForm.type === "percent" && val > 100) { setDiscMsg({ type: "err", text: "Phần trăm tối đa 100%" }); return; }
            const duplicate = discList.find(d => d.code.toUpperCase() === code && d.id !== editDiscId);
            if (duplicate) { setDiscMsg({ type: "err", text: "Mã này đã tồn tại" }); return; }
            const newDisc = {
              id: editDiscId || ("disc_" + Date.now()),
              code,
              type: discForm.type,
              value: val,
              minOrder: parseFloat(discForm.minOrder) || 0,
              maxUse: parseInt(discForm.maxUse) || 0,
              usedCount: editDiscId ? (discList.find(d => d.id === editDiscId)?.usedCount || 0) : 0,
              active: discForm.active,
              requiredBadge: discForm.requiredBadge || "none",
              createdAt: editDiscId ? (discList.find(d => d.id === editDiscId)?.createdAt || todayStr()) : todayStr(),
            };
            if (editDiscId) {
              setDiscounts(prev => prev.map(d => d.id === editDiscId ? newDisc : d));
            } else {
              setDiscounts(prev => [newDisc, ...prev]);
            }
            setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true, requiredBadge: "none" });
            setEditDiscId(null);
            setDiscMsg({ type: "ok", text: editDiscId ? "✓ Đã cập nhật mã giảm giá" : "✓ Đã tạo mã giảm giá mới" });
            setTimeout(() => setDiscMsg(null), 2500);
          };
          const startEdit = (d) => {
            setEditDiscId(d.id);
            setDiscForm({ code: d.code, type: d.type, value: String(d.value), minOrder: d.minOrder ? String(d.minOrder) : "", maxUse: d.maxUse ? String(d.maxUse) : "", active: d.active, requiredBadge: d.requiredBadge || "none" });
            setDiscMsg(null);
          };
          const deleteDisc = (id) => setDiscounts(prev => prev.filter(d => d.id !== id));
          const toggleActive = (id) => setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));

          return (
            <div>
              <STitle c="Mã giảm giá" />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginBottom: 24 }}>
                {/* Form tạo/sửa */}
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ color: TXT, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
                    {editDiscId ? "✏️ Chỉnh sửa mã" : "➕ Tạo mã mới"}
                  </div>
                  {discMsg && (
                    <div style={{ background: discMsg.type === "ok" ? "#022" : "#160505", border: `1px solid ${discMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: discMsg.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 12 }}>{discMsg.text}</div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÃ CODE *</div>
                    <input style={{ ...inp2, textTransform: "uppercase", fontFamily: "monospace", letterSpacing: 2 }}
                      value={discForm.code} onChange={e => setDiscForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="VD: THUE20" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>LOẠI GIẢM GIÁ *</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["percent", "% Phần trăm"], ["fixed", "đ Tiền mặt"]].map(([v, l]) => (
                        <button key={v} onClick={() => setDiscForm(p => ({ ...p, type: v }))}
                          style={{ flex: 1, padding: "9px 0", background: discForm.type === v ? "#FFF8ED" : CARD, color: discForm.type === v ? G : MUT, border: `1px solid ${discForm.type === v ? G : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: discForm.type === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>
                      GIÁ TRỊ GIẢM * {discForm.type === "percent" ? "(nhập số % — VD: 20 = giảm 20%)" : "(nhập số tiền — VD: 50000)"}
                    </div>
                    <input style={inp2} type="number" min="0"
                      value={discForm.value} onChange={e => setDiscForm(p => ({ ...p, value: e.target.value }))}
                      placeholder={discForm.type === "percent" ? "VD: 20" : "VD: 50000"} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>HẠN MỨC ĐƠN TỐI THIỂU (để trống = không giới hạn)</div>
                    <input style={inp2} type="number" min="0"
                      value={discForm.minOrder} onChange={e => setDiscForm(p => ({ ...p, minOrder: e.target.value }))} placeholder="VD: 200000" />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LẦN DÙNG TỐI ĐA (để trống = không giới hạn)</div>
                    <input style={inp2} type="number" min="0"
                      value={discForm.maxUse} onChange={e => setDiscForm(p => ({ ...p, maxUse: e.target.value }))} placeholder="VD: 10" />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>🏅 YÊU CẦU HUY HIỆU (chỉ khách có huy hiệu mới dùng được)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { v: "none", label: "🔓 Không yêu cầu", col: MUT },
                        { v: "dong", label: "🥉 Khách Đồng", col: "#cd7f32" },
                        { v: "bac", label: "🥈 Khách Bạc", col: "#aaa" },
                        { v: "vang", label: "🥇 Khách Vàng", col: G },
                        { v: "daigiadagia", label: "👑 Đại Gia", col: G },
                        { v: "vip", label: "💎 VIP (5tr+)", col: "#38bdf8" },
                        { v: "kimcuong", label: "💠 Kim Cương (10tr+)", col: "#e879f9" },
                      ].map(({ v, label, col }) => (
                        <button key={v} onClick={() => setDiscForm(p => ({ ...p, requiredBadge: v }))}
                          style={{ padding: "8px 6px", background: discForm.requiredBadge === v ? "#FFF8ED" : CARD, color: discForm.requiredBadge === v ? col : MUT, border: `1px solid ${discForm.requiredBadge === v ? col + "88" : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: discForm.requiredBadge === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s", textAlign: "center" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {discForm.requiredBadge !== "none" && (
                      <div style={{ marginTop: 6, background: CARD2, border: `1px solid ${G}22`, borderRadius: 10, padding: "7px 10px", fontSize: 11, color: MUT }}>
                        ⚠️ Khách phải có huy hiệu tương ứng mới nhập được mã này
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setDiscForm(p => ({ ...p, active: !p.active }))}
                      style={{ width: 36, height: 20, borderRadius: 14, background: discForm.active ? "#22c55e" : "#333", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: discForm.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                    </button>
                    <span style={{ color: discForm.active ? "#22c55e" : MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{discForm.active ? "Đang hoạt động" : "Tắt mã"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveDisc} style={{ ...btn("gold"), flex: 1 }}>{editDiscId ? "💾 Lưu thay đổi" : "➕ Tạo mã"}</button>
                    {editDiscId && <button onClick={() => { setEditDiscId(null); setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true, requiredBadge: "none" }); setDiscMsg(null); }} style={{ ...btn("ghost") }}>Huỷ</button>}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { l: "Tổng mã", v: discList.length, c: G },
                      { l: "Đang hoạt động", v: discList.filter(d => d.active).length, c: "#22c55e" },
                      { l: "Tổng lượt dùng", v: discList.reduce((s, d) => s + (d.usedCount || 0), 0), c: "#60a5fa" },
                      { l: "Đã tắt", v: discList.filter(d => !d.active).length, c: MUT },
                    ].map(s => (
                      <div key={s.l} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 9, padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ color: s.c, fontWeight: 800, fontSize: 22 }}>{s.v}</div>
                        <div style={{ color: MUT, fontSize: 11, marginTop: 4 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: CARD2, border: `1px solid ${G}22`, borderRadius: 9, padding: "12px 16px" }}>
                    <div style={{ color: MUT, fontSize: 11, lineHeight: 1.7 }}>
                      <div style={{ color: G, fontWeight: 700, marginBottom: 6, fontSize: 12 }}>💡 Hướng dẫn</div>
                      <div>• <span style={{ color: TXT }}>% Phần trăm:</span> VD: giá trị 20 → giảm 20% tổng đơn</div>
                      <div>• <span style={{ color: TXT }}>đ Tiền mặt:</span> VD: giá trị 50000 → giảm 50.000đ</div>
                      <div>• <span style={{ color: TXT }}>Hạn mức:</span> Đơn phải đạt X đồng mới được dùng</div>
                      <div>• Phát mã cho khách qua Zalo / Facebook</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách mã */}
              <div style={{ color: TXT, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Danh sách mã ({discList.length})</div>
              {discList.length === 0 && <div style={{ color: MUT, textAlign: "center", padding: 40, fontSize: 13 }}>Chưa có mã giảm giá nào</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {discList.map(d => (
                  <div key={d.id} style={{ background: CARD2, border: `1px solid ${d.active ? G + "33" : BR2}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ color: G, fontWeight: 800, fontSize: 16, fontFamily: "monospace", letterSpacing: 2 }}>{d.code}</span>
                        <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: d.active ? "#022" : BR2, color: d.active ? "#22c55e" : MUT, border: `1px solid ${d.active ? "#22c55e44" : BR2}` }}>{d.active ? "ĐANG BẬT" : "TẮT"}</span>
                        <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, background: "#FFF8ED", color: G, border: `1px solid ${G}44` }}>
                          {d.type === "percent" ? `Giảm ${d.value}%` : `Giảm ${fmtVND(d.value)}`}
                        </span>
                      </div>
                      <div style={{ color: MUT, fontSize: 11, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {d.minOrder > 0 && <span>Đơn tối thiểu: <span style={{ color: TXT }}>{fmtVND(d.minOrder)}</span></span>}
                        <span>Đã dùng: <span style={{ color: d.maxUse && d.usedCount >= d.maxUse ? "#ef4444" : "#60a5fa" }}>{d.usedCount || 0}{d.maxUse ? `/${d.maxUse}` : ""} lượt</span></span>
                        <span>Tạo: {d.createdAt}</span>
                        {d.requiredBadge && d.requiredBadge !== "none" && (
                          <span style={{ color: d.requiredBadge === "kimcuong" ? "#e879f9" : d.requiredBadge === "vip" ? "#38bdf8" : d.requiredBadge === "vang" || d.requiredBadge === "daigiadagia" ? G : d.requiredBadge === "bac" ? "#aaa" : "#cd7f32", fontWeight: 700 }}>
                            🏅 Cần: {d.requiredBadge === "dong" ? "🥉 Khách Đồng" : d.requiredBadge === "bac" ? "🥈 Khách Bạc" : d.requiredBadge === "vang" ? "🥇 Khách Vàng" : d.requiredBadge === "daigiadagia" ? "👑 Đại Gia" : d.requiredBadge === "vip" ? "💎 VIP (5tr+)" : "💠 Kim Cương (10tr+)"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(d.id)}
                        style={{ padding: "6px 12px", background: d.active ? "#160505" : "#021a0a", color: d.active ? "#ef4444" : "#22c55e", border: `1px solid ${d.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                        {d.active ? "Tắt" : "Bật"}
                      </button>
                      <button onClick={() => startEdit(d)} style={{ padding: "6px 12px", background: CARD, color: TXT, border: `1px solid ${BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>✏️</button>
                      <button onClick={() => { if (window.confirm("Xoá mã " + d.code + "?")) deleteDisc(d.id); }} style={{ padding: "6px 12px", background: "#FEF0F0", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {tab === "security" && (          <div>
            <STitle c="Bảo mật tài khoản quản trị" />
            <div style={{ maxWidth: 480 }}>
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 24 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔑 Đổi mật khẩu Admin</div>
                <div style={{ color: MUT, fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>Mật khẩu được lưu riêng, chỉ có hiệu lực trên thiết bị này.</div>
                {pwMsg && (
                  <div style={{ background: pwMsg.type === "ok" ? "#022" : "#160505", border: `1px solid ${pwMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`, borderRadius: 12, padding: "11px 14px", marginBottom: 16, color: pwMsg.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 13 }}>
                    {pwMsg.text}
                  </div>
                )}
                <div style={{ marginBottom: 13 }}>
                  <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MẬT KHẨU HIỆN TẠI</div>
                  <input type="password" style={inp2} value={pwOld} onChange={e => setPwOld(e.target.value)} placeholder="Nhập mật khẩu hiện tại" />
                </div>
                <div style={{ marginBottom: 13 }}>
                  <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MẬT KHẨU MỚI</div>
                  <input type="password" style={inp2} value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>XÁC NHẬN MẬT KHẨU MỚI</div>
                  <input type="password" style={inp2} value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Nhập lại mật khẩu mới" onKeyDown={e => e.key === "Enter" && handleChangePw()} />
                </div>
                <button onClick={handleChangePw} style={{ ...btn("gold") }}>Đổi mật khẩu</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── STORAGE HELPERS — Supabase Cloud (sync mọi thiết bị) ──
const STORE_KEYS = { cameras: "k92_cameras_v2", accessories: "k92_accessories_v2", orders: "k92_orders_v2", site: "k92_site_v2", photos: "k92_photos_v1", feedbacks: "k92_feedbacks_v1", users: "k92_users_v1", discounts: "k92_discounts_v1" };

const SB_URL = "https://gtgjixgcillbjwnnkavx.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Z2ppeGdjaWxsYmp3bm5rYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTg4MzMsImV4cCI6MjA5MjU3NDgzM30.iFh0KP4vrTZUDMrakW1a9nM8naJScP-D1WqJKrH0hiI";
const SB_TABLE = "kv_store";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" };
const SB_BUCKET = "k92-photos"; // Supabase Storage bucket

// Upload ảnh lên Supabase Storage — trả về public URL hoặc null nếu lỗi
async function uploadToStorage(base64DataUrl) {
  try {
    // Chuyển base64 → Blob
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const fileName = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const uploadRes = await fetch(
      `${SB_URL}/storage/v1/object/${SB_BUCKET}/${fileName}`,
      {
        method: "POST",
        headers: {
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type": "image/jpeg",
          "x-upsert": "true"
        },
        body: blob
      }
    );
    if (!uploadRes.ok) {
      console.warn("[92K storage] upload failed:", await uploadRes.text());
      return null;
    }
    // Public URL
    return `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${fileName}`;
  } catch (e) {
    console.warn("[92K storage] uploadToStorage error:", e);
    return null;
  }
}

// ── CACHE TTL: 30 phút — giảm băng thông tối đa ──
const CACHE_TTL_MS = 30 * 60 * 1000;
function cacheKey(key) { return `__ts_${key}`; }
function isCacheFresh(key) {
  try {
    const ts = localStorage.getItem(cacheKey(key));
    return ts && (Date.now() - parseInt(ts)) < CACHE_TTL_MS;
  } catch { return false; }
}
function markCacheFresh(key) {
  try { localStorage.setItem(cacheKey(key), String(Date.now())); } catch {}
}
function invalidateCache(key) {
  try { localStorage.removeItem(cacheKey(key)); } catch {}
}

// GET từ Supabase — dùng localStorage cache nếu còn mới, tránh fetch thừa
async function storageGet(key, forceRefresh = false) {
  // 1. Nếu cache còn mới và không force, trả localStorage luôn
  if (!forceRefresh && isCacheFresh(key)) {
    try {
      const r = localStorage.getItem(key);
      if (r) return JSON.parse(r);
    } catch {}
  }
  // 2. Fetch từ Supabase
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        try { localStorage.setItem(key, rows[0].value); } catch {}
        markCacheFresh(key);
        return JSON.parse(rows[0].value);
      }
    }
  } catch {}
  // 3. Fallback: localStorage (offline / lỗi mạng)
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}

// ── DEBOUNCE WRITE — mỗi key chỉ fire 1 request sau 2s yên lặng ──
const _writeTimers = {};
function storageSet(key, val) {
  const value = JSON.stringify(val);
  // 1. localStorage TRƯỚC — sync, không mất data
  try { localStorage.setItem(key, value); } catch {}
  // 2. Invalidate cache để lần next fetch sẽ re-read từ Supabase
  invalidateCache(key);
  // 3. Debounce Supabase write — delay 5s, gộp nhiều cập nhật liên tiếp (cameras có ảnh lớn)
  const debounceMs = key === STORE_KEYS.cameras || key === "cameras_img" ? 5000 : key === STORE_KEYS.orders ? 500 : 2000;
  clearTimeout(_writeTimers[key]);
  _writeTimers[key] = setTimeout(() => {
    fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method: "POST",
      headers: SB_HEADERS,
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    }).then(() => {
      markCacheFresh(key); // Sau khi write thành công, mark cache fresh
    }).catch(e => console.warn("[92K supabase] set failed:", key, e));
  }, debounceMs);
}

// Cameras: tách meta (ko ảnh) và images (có ảnh) để giảm bandwidth
// cameras_meta: dữ liệu máy không có ảnh — fetch mọi lần
// cameras_img: chỉ chứa {id, images} — fetch khi cần hiển thị ảnh
function saveCamerasToStorage(cams) {
  // Lưu meta (không images) cho key chính — nhẹ hơn nhiều
  const meta = cams.map(c => ({ ...c, images: [] }));
  storageSet(STORE_KEYS.cameras, meta);
  // Lưu images riêng — chỉ khi có ảnh
  const imgs = cams.filter(c => c.images?.length > 0).map(c => ({ id: c.id, images: c.images }));
  if (imgs.length > 0) {
    storageSet("cameras_img", imgs);
  }
}

async function loadCamerasFromStorage() {
  const [meta, imgs] = await Promise.all([
    storageGet(STORE_KEYS.cameras),
    storageGet("cameras_img"),
  ]);
  if (!meta) return null;
  if (!imgs || imgs.length === 0) return meta;
  // Merge images vào meta
  const imgMap = {};
  imgs.forEach(i => { imgMap[i.id] = i.images; });
  return meta.map(c => ({ ...c, images: imgMap[c.id] || [] }));
}

// ── ERROR BOUNDARY — bắt mọi lỗi render, hiện fallback thay vì màn hình trắng ──
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, info) { console.error("[92K] Render error:", e, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: G, fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>92 KA MÊ RA</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>Đã xảy ra lỗi giao diện.<br />Vui lòng tải lại trang.</div>
          <div style={{ color: "#333", fontSize: 11, fontFamily: "monospace", background: CARD, border: "1px solid #222", borderRadius: 10, padding: "10px 14px", marginBottom: 20, textAlign: "left", wordBreak: "break-all" }}>
            {this.state.err?.message || String(this.state.err)}
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 28px", background: "linear-gradient(135deg, #6a6a82 0%, #c8c8dc 50%, #4a4a60 100%)", color: "#0a0a18", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            🔄 Tải lại trang
          </button>
        </div>
      </div>
    );
  }
}

// ── ROOT ──

// ── FLOW BACKGROUND (aurora blobs) ──
function FlowBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Blob definitions — tông tối vàng/amber phù hợp theme camera
    const blobs = [
      { x: 0.50, y: 0.38, r: 0.65, color: "rgba(201,168,76,",   ox: 0.10, oy: 0.08, sx: 0.00018, sy: 0.00014, alpha: 0.06 }, // gold trung tâm
      { x: 0.10, y: 0.20, r: 0.55, color: "rgba(200,114,26,",   ox: 0.12, oy: 0.10, sx: 0.00022, sy: 0.00016, alpha: 0.05 }, // amber góc trái
      { x: 0.85, y: 0.70, r: 0.50, color: "rgba(180,80,20,",    ox: 0.09, oy: 0.12, sx: 0.00016, sy: 0.00024, alpha: 0.04 }, // đỏ cam góc phải
      { x: 0.20, y: 0.80, r: 0.42, color: "rgba(201,168,76,",   ox: 0.08, oy: 0.09, sx: 0.00014, sy: 0.00020, alpha: 0.04 }, // gold góc dưới
    ];

    let t = 0;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Dark base
      ctx.fillStyle = "#F4F3F1";
      ctx.fillRect(0, 0, W, H);

      // Draw each blob as a radial gradient
      blobs.forEach(b => {
        const cx = (b.x + Math.sin(t * b.sx * 1000) * b.ox) * W;
        const cy = (b.y + Math.cos(t * b.sy * 1000) * b.oy) * H;
        const radius = b.r * Math.max(W, H);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   b.color + b.alpha + ")");
        grad.addColorStop(0.4, b.color + (b.alpha * 0.5) + ")");
        grad.addColorStop(1,   b.color + "0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      // Subtle vignette — nhẹ để màu pastel nổi
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.30)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      t += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    // Dừng animation khi user chuyển tab, chạy lại khi quay về
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else draw();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", display: "block",
    }} />
  );
}

// ── SPLASH SCREEN ──
// phase: 0=invisible, 1=fade-in logo, 2=show tagline, 3=iris-close+exit
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  const isMob = useMobile();
  // Dùng ref để lưu onDone — tránh useEffect chạy lại khi parent re-render tạo function mới
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    // Tất cả timers chỉ chạy 1 lần duy nhất (deps = [])
    const t1 = setTimeout(() => setPhase(1), 60);   // fade in logo ngay
    const t2 = setTimeout(() => setPhase(2), 900);  // show tagline
    const t3 = setTimeout(() => setPhase(3), 1700); // iris close
    const t4 = setTimeout(() => onDoneRef.current?.(), 2300); // xong
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []); // ← [] cố định, không phụ thuộc onDone → không bao giờ restart

  const sz = isMob ? 1.45 : 2.2;
  const s  = n => n * sz;
  const bw = 4; // khớp hero (3px × 1.35)
  const col = "#141414"; // khớp màu chữ hero

  // Bracket spread chỉ ở phase 0
  const sp = phase === 0 ? (isMob ? 48 : 65) : 0;
  const brTr = "transform 0.85s cubic-bezier(.16,1,.3,1), opacity 0.7s ease";
  const bracketColor = "rgba(20,20,20,0.78)"; // khớp hero

  // Iris wipe ra khi phase 3
  const irisStyle = phase >= 3
    ? { clipPath: "circle(0% at 50% 50%)", transition: "clip-path 0.55s cubic-bezier(.7,0,.3,1) 0.05s" }
    : { clipPath: "circle(150% at 50% 50%)", transition: "none" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", overflow: "hidden",
      ...irisStyle,
    }}>
      {/* Lớp 1: gradient nền — khớp hero */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 52% 32%, rgba(110,185,210,0.55) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(150,195,215,0.25) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 85% 15%, rgba(130,175,200,0.20) 0%, transparent 50%),
          linear-gradient(175deg, #7AAFC0 0%, #9EC4D0 25%, #B8D4DC 55%, #C8DCE4 80%, #BDD0D8 100%)
        `,
      }} />
      {/* Lớp 2: grain noise — khớp hero */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55, pointerEvents: "none" }}>
        <filter id="splash-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="overlay" />
        </filter>
        <rect width="100%" height="100%" filter="url(#splash-grain)" opacity="0.45" />
      </svg>
      {/* Lớp 3: vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(8,20,35,0.25) 100%)",
        pointerEvents: "none",
      }} />

      {/* LOGO */}
      <div style={{
        display: "inline-flex", alignItems: "center",
        fontFamily: '"Palatino Linotype","Book Antiqua","Palatino",Georgia,"Times New Roman",serif',
        color: col, userSelect: "none", position: "relative",
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "scale(1)" : "scale(0.94)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(.2,.8,.3,1)",
        filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.08))",
      }}>
        {/* Bracket trái */}
        <div style={{ position: "relative", width: s(13), height: s(32), marginRight: s(9), flexShrink: 0 }}>
          <span style={{
            position: "absolute", top: 0, left: 0,
            width: s(13), height: s(16),
            borderLeft: `${bw}px solid ${bracketColor}`, borderTop: `${bw}px solid ${bracketColor}`,
            transform: `translate(${-sp}px,${-sp}px)`,
            opacity: phase === 0 ? 0 : 1,
            transition: brTr,
          }} />
          <span style={{
            position: "absolute", bottom: 0, left: 0,
            width: s(13), height: s(16),
            borderLeft: `${bw}px solid ${bracketColor}`, borderBottom: `${bw}px solid ${bracketColor}`,
            transform: `translate(${-sp}px,${sp}px)`,
            opacity: phase === 0 ? 0 : 1,
            transition: brTr,
          }} />
        </div>

        {/* Text */}
        <span style={{
          fontSize: s(20), fontWeight: 400, letterSpacing: s(1.5),
          whiteSpace: "nowrap", display: "inline-flex", alignItems: "center",
        }}>
          <span>92</span>
          <span style={{ marginLeft: s(10) }}>KA</span>
          <span style={{ marginLeft: s(10) }}>MÊ</span>
          <span style={{ marginLeft: s(10) }}>RA</span>
          <span style={{
            display: "inline-block", width: s(7), height: s(7), borderRadius: "50%",
            background: "radial-gradient(circle at 38% 34%, #ff5050 0%, #cc0000 52%, #820000 100%)",
            boxShadow: "0 0 7px rgba(210,0,0,0.72), 0 0 14px rgba(210,0,0,0.32), inset 0 1px 0 rgba(255,155,155,0.5)",
            marginLeft: s(3), flexShrink: 0, position: "relative", top: s(-6),
          }} />
        </span>

        {/* Bracket phải */}
        <div style={{ position: "relative", width: s(13), height: s(32), marginLeft: s(9), flexShrink: 0 }}>
          <span style={{
            position: "absolute", top: 0, right: 0,
            width: s(13), height: s(16),
            borderRight: `${bw}px solid ${bracketColor}`, borderTop: `${bw}px solid ${bracketColor}`,
            transform: `translate(${sp}px,${-sp}px)`,
            opacity: phase === 0 ? 0 : 1,
            transition: brTr,
          }} />
          <span style={{
            position: "absolute", bottom: 0, right: 0,
            width: s(13), height: s(16),
            borderRight: `${bw}px solid ${bracketColor}`, borderBottom: `${bw}px solid ${bracketColor}`,
            transform: `translate(${sp}px,${sp}px)`,
            opacity: phase === 0 ? 0 : 1,
            transition: brTr,
          }} />
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        color: "#484644",
        fontSize: isMob ? 9 : 10,
        letterSpacing: isMob ? 4 : 6,
        fontFamily: "var(--font-ui)",
        textTransform: "uppercase",
        fontWeight: 700,
        marginTop: isMob ? 18 : 26,
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        textAlign: "center",
        padding: "0 16px",
      }}>Dịch vụ cho thuê máy ảnh</div>

      {/* Đường kẻ */}
      <div style={{
        width: phase >= 2 ? (isMob ? 90 : 130) : 0,
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(20,20,20,0.35), transparent)",
        marginTop: isMob ? 10 : 14,
        transition: "width 0.5s cubic-bezier(.4,0,.2,1) 0.1s",
      }} />
    </div>
  );
}

function AppRoot() {
  const [page, setPage] = useState("home");
  const [booking, setBooking] = useState(false); // false | camId | true
  const [adminAuth, setAdminAuth] = useState(false);
  const [ready, setReady] = useState(false); // prevent flash before storage loads
  const [splashDone, setSplashDone] = useState(false);
  const isMobile = useMobile();

  // 🔑 ALL SHARED STATE — single source of truth
  const [cameras, _setCameras] = useState(CAMS_INIT);
  const [accessories, _setAccessories] = useState(ACC_INIT);
  const [orders, _setOrders] = useState(ORDERS_INIT);
  const [siteContent, _setSiteContent] = useState(SITE_INIT);
  const [photos, _setPhotos] = useState([]);
  const [feedbacks, _setFeedbacks] = useState([]);
  const [users, _setUsers] = useState({});
  const [discounts, _setDiscounts] = useState([]);

  // ── loggedUser: load từ localStorage khi mở trang, lưu lại mỗi khi thay đổi ──
  // Khách sẽ ở trạng thái đăng nhập cho đến khi tự bấm "Đăng xuất" hoặc xoá bộ nhớ
  const [loggedUser, _setLoggedUser] = useState(() => {
    try {
      const saved = localStorage.getItem("k92_session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setLoggedUser = useCallback((u) => {
    _setLoggedUser(u);
    try {
      if (u) localStorage.setItem("k92_session", JSON.stringify(u));
      else localStorage.removeItem("k92_session");
    } catch {}
  }, []);

  const [loginOpen, setLoginOpen] = useState(false);

  // Smooth scroll chỉ trên home, không khi booking modal / login đang mở
  useSmoothScroll(page === "home" && !booking && !loginOpen && !isMobile);

  // ── Wrapped setters: update state AND persist to storage ──
  // ── Wrapped setters: update React state first, persist to storage via setTimeout (outside render) ──
  const setCameras = useCallback((updater) => {
    _setCameras(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => { try { saveCamerasToStorage(next); } catch(e) { console.warn("setCameras err", e); } }, 0);
      return next;
    });
  }, []);

  const setAccessories = useCallback((updater) => {
    _setAccessories(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.accessories, next), 0);
      return next;
    });
  }, []);

  const setOrders = useCallback((updater) => {
    _setOrders(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.orders, next), 0);
      return next;
    });
  }, []);

  const setSiteContent = useCallback((updater) => {
    _setSiteContent(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.site, next), 0);
      return next;
    });
  }, []);

  const setPhotos = useCallback((updater) => {
    _setPhotos(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // ⛔ Không sync photos lên Supabase — ảnh base64 gây egress cao
      // storageSet(STORE_KEYS.photos, next) -- đã tắt
      return next;
    });
  }, []);

  const setFeedbacks = useCallback((updater) => {
    _setFeedbacks(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.feedbacks, next), 0);
      return next;
    });
  }, []);

  const setUsers = useCallback((updater) => {
    _setUsers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.users, next), 0);
      return next;
    });
  }, []);

  const setDiscounts = useCallback((updater) => {
    _setDiscounts(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => storageSet(STORE_KEYS.discounts, next), 0);
      return next;
    });
  }, []);

  // ── On mount: load persisted data from storage (non-blocking) ──
  useEffect(() => {
    // Show UI immediately with default data, then update from storage
    setReady(true);
    (async () => {
      // Ưu tiên: load cameras, accessories, orders, site trước (nhẹ, cần thiết ngay)
      const [cams, accs, ords, site, disc] = await Promise.all([
        loadCamerasFromStorage(),
        storageGet(STORE_KEYS.accessories),
        storageGet(STORE_KEYS.orders, true), // force=true: luôn lấy từ Supabase, tránh cache cũ
        storageGet(STORE_KEYS.site),
        storageGet(STORE_KEYS.discounts),
      ]);
      if (cams) _setCameras(cams);
      if (accs) _setAccessories(accs.map(a => ({
        qty: 1, active: true, priceShift: null, desc: "",
        ...a,
      })));
      if (site) _setSiteContent(site);
      if (disc) _setDiscounts(disc);
      if (ords) {
        // BUG1 FIX: không cần sync _orderNum nữa vì newOrderId() đã tự tính từ orders thực tế
        _setOrders(prev => {
          const storageIds = new Set(ords.map(o => o.id));
          const initIds = new Set(ORDERS_INIT.map(o => o.id));
          const fresh = prev.filter(o => !storageIds.has(o.id) && !initIds.has(o.id));
          const merged = [...fresh, ...ords];
          if (fresh.length > 0) setTimeout(() => storageSet(STORE_KEYS.orders, merged), 0);
          return merged;
        });
      }

      // Lazy: load feedbacks sau (photos đã tắt để giảm egress)
      setTimeout(async () => {
        const fbs = await storageGet(STORE_KEYS.feedbacks);
        if (fbs) {
          _setFeedbacks(prev => {
            const storageIds = new Set(fbs.map(f => f.id));
            const fresh = prev.filter(f => !storageIds.has(f.id));
            const merged = [...fresh, ...fbs];
            if (fresh.length > 0) setTimeout(() => storageSet(STORE_KEYS.feedbacks, merged), 0);
            return merged;
          });
        }
      }, 2000); // delay 2s sau khi UI đã render

      // Rất lazy: load users — chỉ cần khi login (delay 5s)
      setTimeout(async () => {
        const usrs = await storageGet(STORE_KEYS.users);
        if (usrs) _setUsers(usrs);
      }, 5000);
    })();
  }, []);

  // NOTE: page-sync effect removed — all state lives in App (single source of truth).
  // Reloading from storage on page change caused race conditions.
  // new orders (seen:false) and newly added cameras were overwritten by stale storage reads.

  const handleNewOrder = useCallback((order) => {
    // Always ensure seen:false so admin badge shows the notification
    setOrders(prev => [{ ...order, seen: false }, ...prev]);
  }, [setOrders]);

  // useCallback giữ reference ổn định → SplashScreen's useEffect([]) không restart
  const handleSplashDone = useCallback(() => setSplashDone(true), []);
  if (!splashDone) return <SplashScreen onDone={handleSplashDone} />;
  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Logo size={1.2} />
        <div style={{ color: MUT, fontSize: 12, marginTop: 20, letterSpacing: 3, fontFamily: "system-ui,sans-serif" }}>ĐANG TẢI...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, position: "relative", animation: "contentIn 1s ease both" }}>
      <FlowBg />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap&subset=vietnamese');
        :root {
          --font-display: 'Lora', Georgia, serif;
          --font-ui: 'Be Vietnam Pro', system-ui, sans-serif;
        }
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html{-webkit-text-size-adjust:100%;scroll-padding-top:72px;}
        body{background:#D9D9D9;overflow-x:hidden;} canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#C8C8C8}
        ::-webkit-scrollbar-thumb{background:#888888;border-radius:2px}
        /* GPU compositing layers cho các element animate nhiều */
        .nav92, .nav-inner, .btn-3d { will-change: transform; }
        .lens-float-wrap { will-change: transform; transform: translateZ(0); }
        @keyframes navCollapseIn{0%{opacity:0;transform:scale(0.85) translateY(-8px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes navExpandIn{0%{opacity:0;transform:scaleY(0.7) translateY(-10px)}100%{opacity:1;transform:scaleY(1) translateY(0)}}
        @keyframes floatY{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-9px)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes shootA{0%{opacity:0;transform:translate(0,0) rotate(-42deg)}4%{opacity:.9}80%{opacity:.5}100%{opacity:0;transform:translate(-520px,520px) rotate(-42deg)}}
        @keyframes shootB{0%{opacity:0;transform:translate(0,0) rotate(-38deg)}4%{opacity:.7}75%{opacity:.3}100%{opacity:0;transform:translate(-340px,340px) rotate(-38deg)}}
        @keyframes shootC{0%{opacity:0;transform:translate(0,0) rotate(-50deg)}4%{opacity:.6}70%{opacity:.2}100%{opacity:0;transform:translate(-260px,260px) rotate(-50deg)}}
        @keyframes twinkle{0%,100%{opacity:.12}50%{opacity:.45}}
        @keyframes splashDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.6}}
        @keyframes contentIn{0%{opacity:0}100%{opacity:1}}
        @keyframes logoRipple{0%{transform:translate(-50%,-50%) scale(0);opacity:0.8}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
        @keyframes heroFadeIn{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes lensFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
        @keyframes pageWash{0%{opacity:0}35%{opacity:1}100%{opacity:1}}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        input:focus,textarea:focus,select:focus{border-color:#2E2E2E55!important;outline:none;}

        /* ── NAV 3D STYLES ── */
        .nav92{
          transition: padding .45s cubic-bezier(.4,0,.2,1);
          will-change: padding;
        }
        .nav-inner{
          background: linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(230,228,224,0.14) 60%, rgba(200,198,195,0.10) 100%);
          border: 1px solid rgba(255,255,255,0.38);
          border-radius: 50px;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 -1px 0 rgba(0,0,0,0.06) inset,
            0 8px 40px rgba(0,0,0,0.14),
            0 2px 12px rgba(0,0,0,0.08);
          backdrop-filter: blur(28px) saturate(160%) brightness(1.04);
          -webkit-backdrop-filter: blur(28px) saturate(160%) brightness(1.04);
          transition: height .4s cubic-bezier(.4,0,.2,1),
                      padding .4s cubic-bezier(.4,0,.2,1),
                      opacity .4s ease,
                      border-radius .4s ease,
                      box-shadow .4s ease,
                      background .4s ease;
          overflow: visible;
        }
        .nav-link, .nav-social, .btn-3d{
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .nav92 button {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          -webkit-user-select: none;
          user-select: none;
        }
        .nav-inner.scrolled{
          background: linear-gradient(160deg, rgba(245,245,245,0.28) 0%, rgba(215,213,210,0.18) 100%);
          border-radius: 50px;
          border-color: rgba(255,255,255,0.42);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.6) inset,
            0 -1px 0 rgba(0,0,0,0.05) inset,
            0 12px 48px rgba(0,0,0,0.12),
            0 4px 16px rgba(0,0,0,0.07);
          backdrop-filter: blur(32px) saturate(170%) brightness(1.05);
          -webkit-backdrop-filter: blur(32px) saturate(170%) brightness(1.05);
        }
        .nav-inner.compact{
          background: linear-gradient(160deg, rgba(240,238,235,0.30) 0%, rgba(210,208,205,0.18) 100%);
          border-radius: 50px;
          border-color: rgba(255,255,255,0.35);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.5) inset,
            0 4px 20px rgba(0,0,0,0.10);
          opacity: 0.98;
          backdrop-filter: blur(32px) saturate(160%) brightness(1.04);
          -webkit-backdrop-filter: blur(32px) saturate(160%) brightness(1.04);
        }
        .nav-link{
          position: relative;
          color: #3a3734;
          font-size: 10.5px;
          background: none;
          border: none;
          cursor: pointer;
          letter-spacing: 2.5px;
          padding: 6px 2px;
          font-family: var(--font-ui);
          font-weight: 700;
          transition: color .22s, transform .22s cubic-bezier(.34,1.56,.64,1), text-shadow .22s, filter .22s;
          transform: translateY(0) translateZ(0);
          will-change: transform;
        }
        .nav-link::after{
          content:'';
          position: absolute;
          bottom: 0; left: 50%; right: 50%;
          height: 1.5px;
          background: #2E2E2E;
          transition: left .25s, right .25s;
        }
        .nav-link:hover{
          color: #111111;
          transform: translateY(-2px);
          text-shadow: none;
          filter: none;
        }
        .nav-link:hover::after{ left: 0; right: 0; }
        .nav-link:hover + .nav-link{
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        /* ── LIQUID METAL CTA BUTTON ── */
        @keyframes liqFlow{
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes liqShimmer1{
          0%   { left: -120%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 200%;  opacity: 0; }
        }
        @keyframes liqShimmer2{
          0%   { left: -120%; opacity: 0; }
          15%  { opacity: 0.6; }
          85%  { opacity: 0.6; }
          100% { left: 200%;  opacity: 0; }
        }
        /* btn-3d wrapper — viền sáng xoay kim đồng hồ */
        .btn-3d-wrap {
          position: relative;
          display: inline-flex;
          border-radius: 16px;
          padding: 1.5px;
          background: conic-gradient(
            from var(--hero-angle),
            transparent 0%,
            transparent 65%,
            rgba(180,180,210,0.25) 75%,
            rgba(230,230,255,0.7) 82%,
            rgba(255,255,255,1) 87%,
            rgba(230,230,255,0.7) 92%,
            rgba(180,180,210,0.25) 97%,
            transparent 100%
          );
          animation: heroRunLight 2.4s linear infinite;
          transition: box-shadow .28s, transform .28s cubic-bezier(.34,1.56,.64,1);
          will-change: transform;
          flex-shrink: 0;
        }
        .btn-3d-wrap:hover {
          box-shadow: 0 0 32px rgba(200,200,240,0.55), 0 0 64px rgba(200,200,240,0.2);
          transform: translateY(-4px);
        }
        .btn-3d-wrap:active {
          transform: translateY(1px);
          box-shadow: 0 0 14px rgba(200,200,240,0.3);
        }
        .btn-3d{
          position: relative;
          background: linear-gradient(
            120deg,
            #5a5a6e 0%, #9898b0 18%, #e0e0ee 32%,
            #c8c8dc 48%, #f0f0ff 60%, #8888a0 75%,
            #b0b0c8 88%, #5a5a6e 100%
          );
          color: #0a0a18;
          border: none;
          padding: 10px 22px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 3px;
          font-family: var(--font-ui);
          text-shadow: 0 1px 0 rgba(255,255,255,0.6);
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset;
          transition: filter .2s;
          will-change: filter;
          width: 100%;
        }
        .btn-3d:hover { filter: brightness(1.12); }
        .btn-3d:active { filter: brightness(0.95); }

        /* Hero button — ánh sáng chạy theo viền kim đồng hồ */
        @property --hero-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes heroRunLight {
          to { --hero-angle: 360deg; }
        }
        .btn-hero-wrap {
          position: relative;
          display: inline-block;
          border-radius: 16px;
          padding: 1.5px;
          background: conic-gradient(
            from var(--hero-angle),
            transparent 0%,
            transparent 65%,
            rgba(180,180,210,0.25) 75%,
            rgba(230,230,255,0.7) 82%,
            rgba(255,255,255,1) 87%,
            rgba(230,230,255,0.7) 92%,
            rgba(180,180,210,0.25) 97%,
            transparent 100%
          );
          animation: heroRunLight 2.4s linear infinite;
          box-shadow:
            0 0 0 0px transparent,
            0 0 18px rgba(200,200,240,0.15);
        }
        .btn-hero-wrap > button {
          display: block;
          border-radius: 14px !important;
          border: none !important;
        }

        /* Social icon buttons */
        .nav-social{
          width: 34px; height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #c8c0b0;
          transition: all .22s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          will-change: transform;
        }
        .nav-social:hover{
          background: rgba(201,168,76,0.18);
          border-color: rgba(201,168,76,0.5);
          color: #c9a84c;
          box-shadow: 0 0 18px rgba(201,168,76,0.45), 0 4px 12px rgba(0,0,0,0.4);
          transform: translateY(-5px) scale(1.12);
          filter: brightness(1.3);
        }

        /* phone number */
        .nav-phone{
          font-size: 11px;
          letter-spacing: 1.5px;
          color: #888;
          font-family: system-ui,sans-serif;
          padding: 6px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all .2s;
        }
        .nav-phone:hover{ color: #c9a84c; border-color: rgba(201,168,76,0.25); }

        /* divider */
        .nav-div{ width:1px; height:22px; background: rgba(0,0,0,0.12); flex-shrink:0; }

        @media(max-width:767px){
          input,select,textarea{font-size:16px!important;}
          ::-webkit-scrollbar{display:none}
        }
        @media(min-width:768px){
          html{zoom:1.3;}
        }
      `}</style>

      {page === "home" && (isMobile ? <MobileBackground /> : <CameraScene />)}

      {page === "home" && (
        <HomePage
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          orders={orders}
          onBook={(cam) => setBooking(cam?.id ?? true)}
          onAdmin={() => setPage("admin")}
          isMobile={isMobile}
          photos={photos}
          feedbacks={feedbacks}
          loggedUser={loggedUser}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenCustomer={() => { if (loggedUser) setPage("customer"); else setLoginOpen(true); }}
        />
      )}

      {page === "customer" && loggedUser && (
        <CustomerPage
          loggedUser={loggedUser}
          setLoggedUser={setLoggedUser}
          orders={orders}
          setOrders={setOrders}
          feedbacks={feedbacks}
          setFeedbacks={setFeedbacks}
          cameras={cameras}
          users={users}
          setUsers={setUsers}
          onBack={() => setPage("home")}
          onOpenBooking={() => { setPage("home"); setBooking(true); }}
        />
      )}

      {page === "admin" && !adminAuth && (
        <AdminLogin onLogin={() => setAdminAuth(true)} onBack={() => setPage("home")} orders={orders} setOrders={setOrders} loggedUser={loggedUser} setLoggedUser={setLoggedUser} photos={photos} setPhotos={setPhotos} cameras={cameras} setPage={setPage} usersMap={users} setUsersMap={(u) => setUsers(u)} siteContent={siteContent} />
      )}

      {page === "admin" && adminAuth && (
        <AdminDashboard
          cameras={cameras} setCameras={setCameras}
          accessories={accessories} setAccessories={setAccessories}
          orders={orders} setOrders={setOrders}
          siteContent={siteContent} setSiteContent={setSiteContent}
          photos={photos} setPhotos={setPhotos}
          feedbacks={feedbacks} setFeedbacks={setFeedbacks}
          users={users} setUsers={(u) => setUsers(u)}
          discounts={discounts} setDiscounts={setDiscounts}
          onBack={() => setPage("home")}
          isMobile={isMobile}
        />
      )}

      {loginOpen && (
        <AdminLogin
          onLogin={() => { setLoginOpen(false); setPage("admin"); setAdminAuth(true); }}
          onBack={() => setLoginOpen(false)}
          orders={orders}
          setOrders={setOrders}
          loggedUser={loggedUser}
          setLoggedUser={(u) => {
            setLoggedUser(u);
            if (u && u.email) {
              // Google user — key by email
              setUsers(prev => prev[u.email] ? prev : { ...prev, [u.email]: { name: u.name, picture: u.picture, googleId: u.googleId } });
            } else if (u && u.phone) {
              setUsers(prev => prev[u.phone] ? prev : { ...prev, [u.phone]: { name: u.name, pw: prev[u.phone]?.pw || "" } });
            }
          }}
          photos={photos}
          setPhotos={setPhotos}
          cameras={cameras}
          defaultTab="customer"
          setPage={setPage}
          usersMap={users}
          setUsersMap={(u) => setUsers(u)}
          siteContent={siteContent}
        />
      )}

      {booking && (
        <BookingModal
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          discounts={discounts}
          setDiscounts={setDiscounts}
          onClose={() => setBooking(false)}
          onSubmit={handleNewOrder}
          loggedUser={loggedUser}
          preselectedCamId={typeof booking === "number" ? booking : null}
          orders={orders}
        />
      )}
    </div>
  );
}

// ── FAVICON INJECT ──
const FAVICON_B64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAHOElEQVR42u2YS2xU1xmA//+cc+c+ZsYvbNdCoRQToDaFkiY8DKGNUJKqoV1UYVGkNl2ki2bRSqXpuu2q2bSVgMKiRM2iSaVUSMEgNQLbkICNgJKyCjF+zBgztsf2GGbGcx/nnkcXxx4erZq0Iipp71lc3ed//+9/34tSK/gsLwKf8cW01glAApAAJAAJwP8vQNLIEoAEIAFIABKABCABSEaJBOBRAHiABBEfHS2VevDnFSHkQQBEJISYAwTQWv/jYw93mVd/rKW01o7jMMbq90spwzC8DwARY87DMDTitNbMshzH+fQCTGudSqUQMYqif8GgtbYs6/qHH87OzjLKALRUqrGxsau729iXaa0N08ne45lMlhBqYFY+9tiWJ7ZGUUgI0VqbrVLK+A4R6+RGwr2heK9C5lL9ZH2HMVYoFEQcf371as45ItbvpJRKKetCpJSE0lQqRW1HI1hxPDg42NnZmbJtpdQSAA/DdDqz91vfjuMYEREJY7RarXqeF4ahZVmcc0ppOp2u1WqIqJRCRMZYFEWMMXPVKGGlrJjH94YvIcRxnCAIAMC2bSllFEWU0tGRkdu3b3+uo4NSqpSqywyCIJvNcs7rMbxh/XpgDCsVzTnt6JicnBSxsFIprTUx0ICIiGEYRksrHOjvHx8bv3Tpkm3bhULh1q1bp0+f7uvrcxxbSuk4ztDQ0KGDB13XvXHjxujIqJHAOb/w/nnjLuMx27ZP9p48euSI67qe5/357bff+MMbnuse+/2xxcVaz86dx48fl1JqrW3bvjh08cjh35VKpVOnTsVxbMJsbHT02gcfRKkUe3Gf9+RT1cVaHAsA84ZlALX8j1op1dDQ0HfmTH//wFd37z7Z23vl8uXXj70+MjKya9euwwcPLS7WAIBZFo/4/Ny8MdLGL21UUlJK5+fnDx067Pt+PR406LVr1545fWZubg4Rh4eHS6VSW2vbzMxMpVzu6uratGlTFEUm1pVSY2NjTz7xlf6+/qHBQdd1bdvu7x94550TGUJr+/fXfvwjJAig1TIBWQ5cEEKaGKWUTk/PUEoJIZTQs2fPHfjpgZ6enkKhsGPHDs/zpJRKSi/t5XK53hMnNm/ebGpCHMeO47SuWHH58mVzGwCEQbj6C6sfX7fuwvnzQoiWlhWWZWmtbTsVhGHfmb41a9bYtm1CiFDCGPvoxnBnZ+cXu7o45+VyuaurazyfL01PRd9/qXLgJ8AjpVQ95ZY8oLX2g9jkQ7Vaff7rz7e0tOQnJorFYnt7+6pVq5RS+fHcD195RQhhnhRx3NLS0nui969XrmQyGaVUEARBEPTs7Dk3cJYyVs9dzvkzz3xtoH/Ar/npdFqIGAC00ghgoh9wqaRqpQgh5XL59sJCQ0MDAExPTa1bv86yrGt/u5aOY5ibB0DOeV3tuwC4LCWKoo6Ojpd/8PLs3GxbW9veb+4tFAq58dw39r5QnC0Wi0XGGABwzleuXPnqz1597Vev1Wo1x3XDIIjC8KmtW/P5fHFmxoQEIgZB0LNz5+TkZGGqkMlmTIWRSnnp9J49exZKpdJcyaQNAGqtt2/ddv369atXr2YymZrv27a9ZcuXz507a3ueWO4e/wRAKS2llFIqpaIoKs3PD380/N2Xvtfe3n744KE/vfXWL3/+i9/++jdGrTiO41jcuXNn67Zt3d3dR48cjTmfmLiZyWQ3bNjQ1tY2dGGQUgoAQojZ4iwAfGf//uampjAIEEm1WiWIvu/nJ/Lv/uVdP/AJIXEcm0pVrla6N3ZPT03PTM9UK5Xm5uYdPT3jY+O5XI4QIoRQ+u7C8XyOEOL7/vvvvffivn3LZRRvTtxMZ9KNjY1hGJbLZR5xpZXnuk3NzUsh5/tKSttxELFaqbqeG8dxyrIIpZxzKWU2myWEKKUWFxdt206n00KIarWKgCk7FUWRqRlKqebmZmNUv1aTSnmeh4iVSsV1XR5FjusyxrTSlBIvnWaMvfnHN5997tl0Or3UB0ypnpkpXrx4camvCdHR0ZHNZIIgIIS0trYSREBUSolYAAIAZDMZcwYA2tvbpFL1yuM4DgIIKbXSiNjU1KSUMt2qsbHR6O04Tr3T1fMqm20ABCUALIS2tiqlPNdDxFw+t7CwQAkVUiDi1NSUSR6tNQOlFeiUZe3Yvr1cLtf9XlusKakQEJSOOb9vytMAYKqWBkTQwKU0O2aOElICIJoDBUIJBDB9WChhnlJSmnPmEAE0gBCiLlNxiYBKa8tiPIxqlSqzLEO7++mnU1ZKSYUAODo2aoQ4jkMp1aABAAGFEOHSlPLfnbdRa+04tsWsu7pJGQaBwb87jdZ8/15dERAJ/lvDnF426cOd+gAg8ANf+3WHAQIhxCjL6hoi4gMK3Ks8fvK3faxJ/wNRiHcHRLxPN6Y/2dCvH65Jk4/65KM+AUgAEoAEIAH4H2lkn/b/w8QDSRInAAlAApCU0aSRJR54hNffAfwBGfpIVBEqAAAAAElFTkSuQmCC";

function useFavicon() {
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAALjElEQVR42u2bz6slxRXHP6e6+973NpqJs3gxznMS0BA0i5kQDUz0OQMBXbkSItkkIAgBySYhIf+BPwhmEwhIDNlIcCWB6GbGmYAEA2ogQ/BHom/AURERdGPmdXdVFl3Vdaq6+r73ZszMiF4oXnXf+7r7fOt7Tn3PqWr44vPF54p+tq7w/eVy3OQuuMHATQKHBa4X4SBwrcA6UAG9g0+Aj5zjAwfvONi28MZpePszCcBx+JaB241wxMCtAjeLsCH+pqUbO90c7zl43cJZ63jFwovPwz+vagC2oKng7ko4YeBOIxw1gAFEouF7AmAAAYtvjpct/LV3nOrhuTPQXlUAnIB7K+HeCu6phA0DVDLwuzLDjUwwXqLF2mC80c4b7QbDAwDYwVfe6+HZ3vHMKXjmigNwHG6rhfsruK8SvtrIYHitjDfe0TULyAwOxvbl0Q/Gj397x/kenu4cTz0Pf7/sAGwBNTxQCz+qhGMN0JjB8CYA4FtgQ4n+ToGQGFgeffoIQOi/0Dn+0METZy4XAHfBDbXwkxoebIQvNwYW3vAAQg3UavSN+Fa4XjDQAb2FzhvXWQ+EYoc2vvP9zvFhB7/rHL/d76xRXUx0b4RfNcJDS2F9aWDdwLKCpcDSwJqBhRn6Sxm+W/j+wgwgLUxkSuP7gTGhHwALrhOOwzkTGbUuwh0CB26EN7fh/f8LAMfh2974H66Z1OC1YLA3bjz2wCwkGr3wLQBRS9oqE1kTQEHHkNT48ZzAEYGDmwMI736qAISRr4X7gvFrVQQgGL9m4vkA0EL9Df1aGd/44zFwZrHDAMb7TnFKTYPrLQIHNuHVvTCh2qvPh5EvjXryt4rfLRQwgRnBHRYZ/Ws9eygXqEinUOZHXwe1W4C1TXhpGz6+JAC2gEb4pff5lO4ypf+6doMqxoDg/yFYjn3jA6Y23p8bfb4wg0xElUwi+hHgwiE4eW6FffVuANTwQA0PNkQ/XmT+v1SjPfq2xCmxUtQeDZA4AzjjI7uN0b0DKjc8YOUU9b04mEypbjhwqbZ40MGbwBMXxYDjcFsj/KIRvrHM6BxGe6HcIXeJpYFFlcaCxp8PtF8o6ucBMER+cgUZ7d1tLl8HrtuEs9twft8MqIX7K+FYrSK3DmSLzGh9PtEFShMEw4L2Hef4OKfTGaidZ40ffeMi1RFwsksewagkj9VwP66sFqtV2r4Rfl4L16xV2dQ2009YUKnvqwGMpY4BlZoBMjfRoy8FyZbnD8wkVkpqH9qE/7wFr+0JgC1oGuFnjXBnIz7YSYzieeDTwW9ZcImFmbrByBDlAiHqGylMbzLNHUogjOfS313j4JND8JdzAzFWu0AFd/usLgoU77cN8cFDQFxkU56eAhcqRwhGiovGWPHBz0HjoBWorBc7NkpnZwfaW6PyAokSOlC+DvlDYJQ/XznuqeBu4M+7AyCcCCltMF4rtUbSIJbMDllsCAAsTCpsdMbXi/d9qyK+BwEZZokxWRL/e+NzAxvjSK0Mt8QY0g/33ajgBC4FoCopvlr4aS18pVHzfQhwiW8XAqFWg0Exrme5gRY/jVJ9Y7Ik04wx8FZnh84HTmYKKUlAHM4tNuFvWiFOGODLWEdHf/SjlkhV5lmhdcLCx47ACqPnLeXAjR2u14bRd0NzPtr3JlK+EehkKAcFF7WqsFipQkzvZw8F7lHjuB1VWpsCMNTwxn+qshEawQhAqPhQ+xgRAlxQf0sDYpSedWnEMgJLB6b3v7ED7a03euH/dniB5FnUOv98yvBwicxwfXxER05TqN7earLUU5e3jMrtk8qPCpaVYkRifKkpSdco5jSZoqxzwaTYONYa9DNnz6+Ob70LbigC4EvXN4/5N/MXDjcfpzB13Ega9UcjS4Zn/UbSVpcSJT0oGggKzyppLVLgZgM3FQEQOBxK13naaUoFCXVx/TCi3KVYB8uNz5hQ5yOt0+MsXR7VZWGQdLaoQNgQODwHwPVSyLSMEiK6MqPiRnJD/XC7FuOSmwx9zSojKdtydk6OWVE0ie36MgDCwVKOTYZmCCLjwLr4o3AsE2k2I92KN1Gxp8BE/Qy5kTkIM/2DRQD8ctXkmRwzmjPPzlwqVcsadcYVst+OD62UY8gGxaVaIS+376F/7ZwLrOcD4/LytcsSDd8gk6VuaNOVj5kspoS6una4H24ex9JlZvrrEwC2ZpRhYrSUlZYVX9jQdXwvQYt5qm5SBshKPGV1cpMlRaVsUXYv9ldbOQB+UaGfXa/zFZtx2crFPN5aldNbVbu3igU2a+F8n2UzAQB1HadWjMK9dOWHzEWd2xWA/kzJBfwS9YT6+pl7lxYwrCpkJEUN31pXNnACiPpuXBwptPxfSnGW3fufzEnhj0ruavVou2yJithvfUrb2ZjWBhnaVIrPMkMzb1XrJe8IJGV2OSY1wJUTj+p/VATAOT5wurAo6aLluByllqVGo9Vx5Qbjw7wdnKspCaOMahcc7Fjf/PVaG4Ho1BpiTqrwrCVgsv4HZQCGnRnF2lpvh4Sk9yPc+Ry+t8NDteLreDar/fm83knM5sbv1HzeWW+sg/96ANrwVwPhwQjBVi+n58bb+dj7zhwA287xnhM2bMaCsFipDW9DNuh89caBqXwBs/dJkC97d6GQoSW0v75V5fAw8hfs0AIQgQWtYptePi8tpxfBGHaebBcBsPCGg9edY8NJejHr09HWDkbvaKrrPMGm05L1rFmYAQCdL+jV4T5jwY6NTLig/rYurhgny+SZ8Xo6tqkbvG7hjSIAp+Ht78NZC3daPxcnF5MYnFobV28qzwCtv/HawJroOknC5N1Aj1yX0f2CaiEeJLMCah+BKxhP8fisXkKvC2v1r9jC6OvjHQtVNRguNo5okK4uFDT8vB2oX0nKFq0we80CIgA7Fi4wBEcdBLsCEP0cEOnxKyuLohZe9BuSjmrDx5t4I3ZsDGaVUl9j9db/tmcoYOriicwtjoQ4QwyAOxZ2iL4/TouUNYI+XwDiZQsvriyKbsP7Xxe+aYTv5kURnXMnC5KSKg2rNzsV9EOnAlqrAl8bAmAfA2HrlNtlIiswomV6vs+0hD/+00n4465lcb8V7QeVsKEFjwkXVnW2NhM3we+tH/2GdPQ1/cVre2fTPUDBDUZlSaosu6z10cCpekTtLnOc2tPaYA/P+a1oPw5G9/7hO294Vyg0WBvjRSfekEB/VShJag0uldn9zIao3UDo1O/6MhDP9vDcnpbGzoE9PIz4HQLXaPrPVFiSLNaqaSr4oVaQgaatVnspVZPftxkAq0AYv09d4Hzn+PVp+NeeF0ffgte+JhwSFQt2Mz7X947C/j6m1M2jeQJWBtq+QIhx4vcn4Tf7Xh7vHE8Z+I6BY90K40urtlZXjlXVNtnuEtRglnm6FfsCi0aucAm/j/Cpi9ogsQ3nDw+u/z2B9aRMtWJzQl5F0kbZPDhlEbvPRl/7f8uKkVazgvruw87x2KlsQXRfe4Q24WURviTCHfly9VzhJV/Ctqr2kQuUogtkhq9yg8TncyDg8Q4ePXcpm6TODSC8JnDA78OLIy+rR9+6rPaRydNJTYHM9/N5fI4FZZ3wZOd45Myl7hLzrvDxjfCmwEG/D29+V0Zh9LXhWrHlLpAEwBk3KIIwnSKf7hwPn4Z/f2obJbfh/c0BhAN+H96kPJsvUc+NvlaGNt3zu5IFRZeYgvB063j4efjHp75Vdhve3YRXgTW/D2929Cf7/ffhAn1ufEFHzLDgyW4fxl/UZmnPhJcYkrRbgHU3s1Nrst8/7xdcQKu5vAyWs6HV0R4e7xyP7IX2lwRAiAmH4CTwIXCdg81S/c0Wqrh9obKcVJNLwXD1jPBC53isg0d3C3iX5Y2RySbnbEV5Hy9NXd1vjJT2FebvDOV7ffN3hmR+X99n552hfH/h5/atsdJus8/de4Or3je4Wt8cveKfLb74XNHP/wA9VYA2Mg1MlAAAAABJRU5ErkJggg==";
    document.title = "92 KA MÊ RA";
  }, []);
}

export default function App() {
  useFavicon();
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
}
