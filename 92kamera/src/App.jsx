import { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

// ── HELPERS ──
let _orderNum = 4;
let _camIdNum = 100;
const newOrderId = () => `#92K${String(_orderNum++).padStart(4, "0")}`;
const newCamId = () => _camIdNum++;
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " ₫";
const todayStr = () => new Date().toISOString().split("T")[0];

const G = "#c9a84c", BG = "#060606", CARD = "#161410", BR = "#2a2a2a", TXT = "#f0e8d0", MUT = "#999", RED = "#cc3333";
const CARD2 = "#0d0d0d", BR2 = "#1a1a1a";

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
  { id: 1, name: "Tripod 3 chân", price: 50000 }, { id: 2, name: "Mic thu âm", price: 80000 },
  { id: 3, name: "Pin dự phòng", price: 30000 }, { id: 4, name: "Lens 50mm f/1.8", price: 150000 },
  { id: 5, name: "ND Filter set", price: 40000 }, { id: 6, name: "Túi đựng máy", price: 30000 },
  { id: 7, name: "Thẻ nhớ 128GB", price: 20000 },
];
const ORDERS_INIT = [
  { id: "#92K0001", cameraName: "Fujifilm X-T20", cameraId: 1, accessories: ["Tripod 3 chân"], days: 3, total: 650000, name: "Nguyễn Văn An", phone: "0901234567", zalo: "0901234567", address: "123 Trần Phú, Đà Nẵng", note: "", status: "active", date: "2026-04-15", seen: true },
  { id: "#92K0002", cameraName: "Sony ZV-E10", cameraId: 2, accessories: [], days: 7, total: 1260000, name: "Trần Thị Bình", phone: "0912345678", zalo: "0912345678", address: "45 Lê Lợi, Hội An", note: "Cần thêm pin", status: "completed", date: "2026-04-10", seen: true },
  { id: "#92K0003", cameraName: "GoPro Hero 12", cameraId: 5, accessories: ["Mic thu âm", "Pin dự phòng"], days: 1, total: 360000, name: "Lê Văn Cường", phone: "0923456789", zalo: "0923456789", address: "78 Nguyễn Huệ, Tam Kỳ", note: "", status: "confirmed", date: "2026-04-20", seen: true },
];
const SITE_INIT = { zalo: "0855 471 202", address: "Thạnh Mỹ Xã Tam Mỹ Thành Phố Đà Nẵng", tagline: "Trải nghiệm máy ảnh · Bắt giữ khoảnh khắc", desc: "Chúng tôi cung cấp dịch vụ cho thuê máy ảnh khu vực Núi Thành - Tam Kỳ.", phone: "0855 471 202", slogan: "Dịch vụ cho thuê máy ảnh · Núi Thành - Tam Kỳ", stats: [["📸", "50+", "Lượt thuê / tháng"], ["🎬", "10+", "Loại thiết bị"], ["⭐", "98%", "Khách hài lòng"]], zaloLink: "", zaloQR: "", socialLinks: { youtube: "", facebook: "", tiktok: "", instagram: "" } };
const DURATIONS = [{ label: "1 ngày", days: 1 }, { label: "3 ngày", days: 3 }, { label: "7 ngày", days: 7 }, { label: "1 tháng", days: 30 }];

// ── NÚT SAO CHÉP ĐƠN (có feedback "Đã sao chép!") ──
function CopyOrderBtn({ copyFn }) {
  const [done, setDone] = useState(false);
  const handle = () => { copyFn(); setDone(true); setTimeout(() => setDone(false), 2000); };
  return (
    <button onClick={handle}
      style={{ padding: "8px 16px", background: done ? "#022a12" : "#0e0e0e", color: done ? "#22c55e" : "#c9a84c", border: `1px solid ${done ? "#22c55e55" : "#c9a84c55"}`, borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", transition: "all .2s", display: "flex", alignItems: "center", gap: 6 }}>
      {done ? "✅ Đã sao chép!" : "📋 Sao chép đơn"}
    </button>
  );
}

// ── NÚT XOÁ ĐƠN (có xác nhận 2 bước) ──
function DeleteOrderBtn({ orderId, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      style={{ marginTop: 12, padding: "6px 14px", background: "#1a0505", color: "#cc3333", border: "1px solid #cc333344", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
      🗑️ Xoá đơn này
    </button>
  );
  return (
    <div style={{ marginTop: 12, background: "#1a0505", border: "1px solid #cc333366", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>⚠️ Xác nhận xoá <strong>{orderId}</strong>? Không thể hoàn tác!</span>
      <button onClick={onDelete} style={{ padding: "5px 14px", background: "#cc3333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
      <button onClick={() => setConfirm(false)} style={{ padding: "5px 12px", background: "#111", color: "#999", border: "1px solid #333", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Huỷ</button>
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
    <div style={{ marginBottom: 18, background: "#0a0a0a", border: `1px solid ${BR2}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>⚡ TRA CỨU NHANH MÃ ĐƠN</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={quickId} onChange={e => { setQuickId(e.target.value); setQuickErr(false); setQuickResult(null); }}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="#92K0001 hoặc nhập một phần mã..." style={{ ...inp2, flex: 1, fontFamily: "monospace", letterSpacing: 1 }} />
        <button onClick={lookup} style={{ padding: "10px 18px", background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>Tìm</button>
      </div>
      {quickErr && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>❌ Không tìm thấy mã đơn này</div>}
      {quickResult && (
        <div style={{ marginTop: 10, background: "#0d1a0a", border: "1px solid #22c55e33", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={{ color: G, fontWeight: 800, fontFamily: "monospace", fontSize: 13 }}>{quickResult.id}</span>
              <span style={{ marginLeft: 10 }}><Badge status={quickResult.status} /></span>
            </div>
            <span style={{ color: G, fontWeight: 700 }}>{fmtVND(quickResult.total)}</span>
          </div>
          <div style={{ color: TXT, fontSize: 12, marginTop: 4 }}>📷 {quickResult.cameraName} · {quickResult.days} ngày</div>
          <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>👤 {quickResult.name} · 📞 {quickResult.phone}</div>
          <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>📅 {quickResult.date}{quickResult.address ? ` · 📍 ${quickResult.address}` : ""}</div>
          {quickResult.discountCode && <div style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>🏷️ Mã: {quickResult.discountCode} — Giảm {fmtVND(quickResult.discountAmt || 0)}</div>}
          <button onClick={() => { setSearch(quickResult.id); setOrderFilter("all"); setQuickId(""); setQuickResult(null); }}
            style={{ marginTop: 8, padding: "5px 12px", background: "#111", color: G, border: `1px solid ${G}44`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
            → Xem trong danh sách
          </button>
        </div>
      )}
    </div>
  );
}
const QR_CODE = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iLTIgLTIgNzAgNzAiPjxnIGNsYXNzPSJsYXllciI+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPjxwYXRoIGQ9Ik0xIDE2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTEgMjJhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMXYtMnYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTF2LTJ2LTJ2LTJ2LTJhMSwxIDAgMCwxIDEsLTFNMSAzNGExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTEgNDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zIDQwaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zIDQ2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUgMTZoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01IDM0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUgNDRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNSA0OGExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJoLTJoLTJoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTkgMThhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU05IDI2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTkgMzRhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU05IDM4aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNOSA0MmExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTEzIDI0YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTF2LTJ2LTJhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0xMyA0MGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0xMyA0NGExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWgyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWgtMmgtMmgtMmgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTcgMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwwIDEsMWgyaDJhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWgtMmgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTE3IDZhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTcgNTBoMmgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0ydi0yYTEsMSAwIDAsMSAxLC0xTTE3IDU4YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNMTcgNjRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTkgMjhhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMTkgMzJoMmgyaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0xOSA0NmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yMSAyNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTIxIDM2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDE2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDQ4YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTIzIDU4YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFoLTJoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTIzIDY0aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMjUgMTJhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0yNSAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yNyAxOGgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTI3IDQ0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTI3IDYyaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMjkgMjRoMmExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWgyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxdjJ2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU0yOSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0yOSA1MmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMSAzMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMSA0MmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJ2LTJhMSwxIDAgMCwxIDEsLTFNMzEgNTBhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzEgNTRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzMgNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zMyA0OGgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNSAyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xaDJoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzUgNDRoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAxMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU0zNyAzMGExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYydjJ2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxdjJ2MnYyYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYydjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMCAtMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFoLTJhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMCAxLC0xdi0yYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMXYtMnYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTM3IDUyYTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwwIDEsMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwwIDEsLTF2LTJhMSwxIDAgMCwxIDEsLTFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMCAxLDFoMmExLDEgMCAwLDAgMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDEgMSwxdjJ2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MmExLDEgMCAwLDAgMSwxYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwwIC0xLC0xaC0yYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFoLTJoLTJhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwwIC0xLDF2MnYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xaDJhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwwIC0xLC0xYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwwIC0xLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMCAtMSwtMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNMzkgNjRhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNDEgNGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00MSAyMGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00MSA0NmExLDEgMCAwLDEgMSwxdjJhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xdi0yYTEsMSAwIDAsMSAxLC0xTTQzIDE2aDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDUgMGgyYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDUgNmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00NSA0OGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00NyAxOGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMCAxLDFhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMnYtMnYtMmExLDEgMCAwLDEgMSwtMU00OSA0YTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNDkgMTBhMSwxIDAgMCwxIDEsMXYyYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMXYtMmExLDEgMCAwLDEgMSwtMU00OSAxNmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU00OSA2MmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01MSAyMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU01MSA1NmgyaDJhMSwxIDAgMCwwIDEsLTF2LTJ2LTJhMSwxIDAgMCwwIC0xLC0xaC0yaC0yYTEsMSAwIDAsMCAtMSwxdjJ2MmExLDEgMCAwLDAgMSwxTTUzIDQyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTUzIDUyYTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTU1IDQ0YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTU5IDQwaDJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDAgLTEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTF2LTJhMSwxIDAgMCwxIDEsLTFNNTkgNThhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjEgMzZhMSwxIDAgMCwwIDEsLTFhMSwxIDAgMCwxIDEsLTFoMmExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMCAtMSwxYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MSA2MGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MSA2NGExLDEgMCAwLDEgMSwxYTEsMSAwIDAsMSAtMSwxYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMU02MyAxNmgyYTEsMSAwIDAsMSAxLDF2MnYyYTEsMSAwIDAsMSAtMSwxaC0yYTEsMSAwIDAsMSAtMSwtMWExLDEgMCAwLDEgMSwtMWExLDEgMCAwLDAgMSwtMWExLDEgMCAwLDAgLTEsLTFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTYzIDI2YTEsMSAwIDAsMSAxLDFhMSwxIDAgMCwxIC0xLDFhMSwxIDAgMCwxIC0xLC0xYTEsMSAwIDAsMSAxLC0xTTYzIDQ0YTEsMSAwIDAsMCAxLC0xYTEsMSAwIDAsMSAxLC0xYTEsMSAwIDAsMSAxLDF2MmExLDEgMCAwLDEgLTEsMWgtMmExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjUgNDhhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTFNNjUgNjJhMSwxIDAgMCwxIDEsMWExLDEgMCAwLDEgLTEsMWExLDEgMCAwLDEgLTEsLTFhMSwxIDAgMCwxIDEsLTEiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2ZmZmZmZiIgaWQ9InN2Z18xIiAvPjwvZz48cGF0aCBkPSJNMywwaDhhMywzIDAgMCwxIDMsM3Y4YTMsMyAwIDAsMSAtMywzaC04YTMsMyAwIDAsMSAtMywtM3YtOGEzLDMgMCAwLDEgMywtM3pNNC4xLDJhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAtMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NnY1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTZoNS44MDAwMDAwMDAwMDAwMDFhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAyLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NnYtNS44MDAwMDAwMDAwMDAwMDFhMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5NiAwIDAsMCAtMi4wOTk5OTk5OTk5OTk5OTk2LC0yLjA5OTk5OTk5OTk5OTk5OTZoLTUuODAwMDAwMDAwMDAwMDAxek01LjUsNGgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8cGF0aCBkPSJNNTUsMGg4YTMsMyAwIDAsMSAzLDN2OGEzLDMgMCAwLDEgLTMsM2gtOGEzLDMgMCAwLDEgLTMsLTN2LThhMywzIDAgMCwxIDMsLTN6TTU2LjEsMmEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2djUuODAwMDAwMDAwMDAwMDAxYTIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTYgMCAwLDAgMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5Nmg1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwtMi4wOTk5OTk5OTk5OTk5OTk2di01LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NmgtNS44MDAwMDAwMDAwMDAwMDF6TTU3LjUsNGgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgo8cGF0aCBkPSJNMyw1Mmg4YTMsMyAwIDAsMSAzLDN2OGEzLDMgMCAwLDEgLTMsM2gtOGEzLDMgMCAwLDEgLTMsLTN2LThhMywzIDAgMCwxIDMsLTN6TTQuMSw1NGEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2djUuODAwMDAwMDAwMDAwMDAxYTIuMDk5OTk5OTk5OTk5OTk5NiwyLjA5OTk5OTk5OTk5OTk5OTYgMCAwLDAgMi4wOTk5OTk5OTk5OTk5OTk2LDIuMDk5OTk5OTk5OTk5OTk5Nmg1LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIDIuMDk5OTk5OTk5OTk5OTk5NiwtMi4wOTk5OTk5OTk5OTk5OTk2di01LjgwMDAwMDAwMDAwMDAwMWEyLjA5OTk5OTk5OTk5OTk5OTYsMi4wOTk5OTk5OTk5OTk5OTk2IDAgMCwwIC0yLjA5OTk5OTk5OTk5OTk5OTYsLTIuMDk5OTk5OTk5OTk5OTk5NmgtNS44MDAwMDAwMDAwMDAwMDF6TTUuNSw1NmgzYTEuNSwxLjUgMCAwLDEgMS41LDEuNXYzYTEuNSwxLjUgMCAwLDEgLTEuNSwxLjVoLTNhMS41LDEuNSAwIDAsMSAtMS41LC0xLjV2LTNhMS41LDEuNSAwIDAsMSAxLjUsLTEuNXoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPm51bGw8L3N2Zz4=";
const REV_DATA = [{ m: "T1", v: 3200000 }, { m: "T2", v: 4800000 }, { m: "T3", v: 3900000 }, { m: "T4", v: 5500000 }, { m: "T5 (dự)", v: 6200000 }];
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
const inp2 = { padding: "9px 13px", background: "#111", border: `1px solid ${BR2}`, borderRadius: 6, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" };
const btn = (variant = "gold") => ({
  padding: "9px 18px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif",
  ...(variant === "gold" ? { background: G, color: "#000" } : variant === "ghost" ? { background: "#111", color: TXT, border: `1px solid ${BR2}` } : { background: "#160505", color: "#ef4444", border: "1px solid #ef444430" }),
});

// ── BADGE ──
function Badge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: "#888" };
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: c.color + "22", color: c.color, border: `1px solid ${c.color}44`, whiteSpace: "nowrap", letterSpacing: .5 }}>{c.label}</span>;
}

// ── LOGO ──
function Logo({ light = true, size = 1 }) {
  const col = light ? "#f0e8d0" : "#1a1a1a";
  const s = n => n * size;
  const bw = 2.5;
  const [clicked, setClicked] = useState(false);
  const handleClick = () => { setClicked(true); setTimeout(() => setClicked(false), 600); };
  const spread = clicked ? s(7) : 0;
  const tr = { transition: clicked ? "none" : "transform 0.5s cubic-bezier(.4,0,.2,1)" };
  return (
    <div onClick={handleClick} style={{ display: "inline-flex", alignItems: "center", fontFamily: '"Times New Roman",Georgia,serif', color: col, userSelect: "none", cursor: "pointer" }}>
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
            <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: `1px solid ${BR2}` }} />
            <button onClick={() => removeImg(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
          </div>
        ))}
        {images.length < max && (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: 72, height: 72, border: `2px dashed ${G}55`, borderRadius: 6, background: "#0a0a00", color: G, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>
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

// ── CAMERA IMAGE DISPLAY ──
function CamImage({ cam, height = 176 }) {
  const [idx, setIdx] = useState(0);
  const imgs = cam.images || [];
  if (imgs.length === 0) {
    return (
      <div style={{ height, background: "linear-gradient(135deg,#0e0e0e,#141009)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70, borderBottom: `1px solid ${BR}` }}>
        {cam.icon || "📷"}
      </div>
    );
  }
  return (
    <div style={{ height, position: "relative", overflow: "hidden", borderBottom: `1px solid ${BR}`, background: "#060606" }}>
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

// ── 3D SCENE (desktop only) ──
function LensBackground({ isMob }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const tiltX = isMob ? 0 : mousePos.y * -4;   // tilt vertical
  const tiltY = isMob ? 0 : mousePos.x * 6;    // tilt horizontal
  const shiftX = isMob ? 0 : mousePos.x * -18; // parallax shift
  const shiftY = isMob ? 0 : mousePos.y * -10;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
        background: "#020202",
        perspective: "900px",
      }}
    >
      {/* Ảnh lens — 3D perspective transform theo chuột */}
      <div style={{
        position: "absolute",
        inset: "-8%",
        transformStyle: "preserve-3d",
        transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.08)`,
        transition: "transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)",
        willChange: "transform",
      }}>
        <img
          src="data:image/png;base64,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"
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: isMob ? "center center" : "62% center",
            filter: "brightness(0.88) contrast(1.12) saturate(1.1)",
            transform: `translate(${shiftX}px, ${shiftY}px) scale(1.05)`,
            transition: "transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94)",
            willChange: "transform",
          }}
        />

        {/* Vignette overlay — tạo chiều sâu cong mặt lens */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 85% 90% at 62% 50%, transparent 0%, transparent 38%, rgba(1,1,1,0.25) 60%, rgba(0,0,0,0.72) 82%, rgba(0,0,0,0.95) 100%)",
          pointerEvents: "none",
        }} />

        {/* Depth layer — làm mờ viền tạo bokeh feel */}
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "none",
          background: "radial-gradient(ellipse 60% 65% at 62% 50%, transparent 0%, transparent 42%, rgba(0,0,0,0.08) 65%, rgba(0,0,0,0.0) 100%)",
        }} />
      </div>

      {/* Ambient light glow từ lens — phản chiều sáng thực */}
      <div style={{
        position: "absolute",
        left: isMob ? "50%" : "62%", top: "50%",
        transform: `translate(-50%,-50%) translate(${shiftX * 0.3}px, ${shiftY * 0.3}px)`,
        width: "55vmin", height: "55vmin", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(40,120,180,0.06) 0%, rgba(20,60,100,0.04) 45%, transparent 70%)",
        transition: "transform 0.25s ease",
        pointerEvents: "none",
      }} />

      {/* Warm rim light từ bên phải ảnh */}
      <div style={{
        position: "absolute", right: "-5%", top: "20%",
        width: "30vmin", height: "60vmin",
        background: "radial-gradient(ellipse, rgba(200,120,30,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* LEFT gradient — text readability */}
      <div style={{
        position: "absolute", inset: 0,
        background: isMob
          ? "linear-gradient(to right, rgba(2,2,2,0.97) 0%, rgba(2,2,2,0.86) 48%, rgba(2,2,2,0.15) 100%)"
          : "linear-gradient(to right, rgba(2,2,2,0.96) 0%, rgba(2,2,2,0.80) 28%, rgba(2,2,2,0.28) 50%, rgba(2,2,2,0.0) 66%)",
        pointerEvents: "none",
      }} />

      {/* TOP gradient — không bị chói */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.40) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

function CameraScene() {
  return <LensBackground isMob={false} />;
}


function MobileBackground() {
  return <LensBackground isMob={true} />;
}

// ── FEEDBACK CARD (text-only, không ảnh) ──
function FeedbackCard({ c, hov, onEnter, onLeave }) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ width: 240, flexShrink: 0, background: CARD, borderRadius: 14, overflow: "hidden", border: `1px solid ${hov ? G + "55" : BR}`, transition: "all .3s", transform: hov ? "translateY(-6px) scale(1.02)" : "none", boxShadow: hov ? `0 16px 40px rgba(201,168,76,0.1)` : "none", display: "flex", flexDirection: "column", padding: "18px 18px 14px" }}>

      {/* Stars */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: G, fontSize: 15 }}>{"★".repeat(c.rating)}</span>
        <span style={{ color: "#2a2a2a", fontSize: 15 }}>{"★".repeat(5 - c.rating)}</span>
      </div>

      {/* Review text */}
      <div style={{ color: TXT, fontSize: 12, lineHeight: 1.7, flex: 1, fontStyle: "italic", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
        "{c.text || "Khách hàng hài lòng 😊"}"
      </div>

      {/* Footer */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BR}` }}>
        <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>📷 {c.camera}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#aaa", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>{c.userName}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {c.type === "feedback" && <span style={{ background: G + "22", color: G, borderRadius: 99, padding: "2px 8px", fontSize: 9, fontFamily: "system-ui,sans-serif", fontWeight: 700, letterSpacing: .5 }}>ĐÃ THUÊ ✓</span>}
            <span style={{ color: "#555", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{c.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FEEDBACK MARQUEE (homepage social proof — shows approved photos + order feedbacks) ──
function FeedbackMarquee({ photos, feedbacks, isMobile }) {
  const [paused, setPaused] = useState(false);
  const [hovCard, setHovCard] = useState(null);

  const approvedPhotos = (photos || []).filter(p => p.status === "approved").map(p => ({
    key: "ph_" + p.id, img: p.url, hasImg: true, rating: p.rating || 5,
    text: p.caption, userName: p.userName, camera: p.cameraUsed || "Máy ảnh", date: p.date, type: "photo", extraImages: 0
  }));
  const approvedFeedbacks = (feedbacks || []).filter(f => f.status === "approved" && !f.hidden).map(f => ({
    key: "fb_" + f.id,
    img: f.images?.length > 0 ? f.images[0] : null,
    hasImg: !!(f.images?.length > 0),
    rating: f.rating || 5,
    text: f.text, userName: f.userName, camera: f.cameraName || "Máy ảnh", date: f.date, type: "feedback",
    extraImages: (f.images?.length || 0) > 1 ? f.images.length - 1 : 0
  }));

  const all = [...approvedPhotos, ...approvedFeedbacks];
  const avgRating = all.length ? (all.reduce((s, c) => s + c.rating, 0) / all.length).toFixed(1) : "5.0";

  const emptySection = (
    <div id="feedback" style={{ padding: "72px 16px 64px", borderTop: `1px solid ${BR}`, background: "linear-gradient(180deg,#060606 0%,#080700 50%,#060606 100%)" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 30, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px", color: TXT, fontFamily: 'var(--font-display)' }}>Feedback Khách Hàng</h2>
        <div style={{ width: 36, height: 1, background: G, margin: "14px auto 20px" }} />
        <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>Chưa có feedback nào được duyệt</div>
      </div>
    </div>
  );

  // ── HOOKS luôn ở đây, không đặt trong if/else ──
  const fbScrollRef = useRef(null);
  const fbPausedRef = useRef(false);
  const fbIdxRef = useRef(0);
  useEffect(() => {
    if (!isMobile) return;
    const el = fbScrollRef.current;
    if (!el || all.length === 0) return;
    const t = setInterval(() => {
      if (fbPausedRef.current || !el) return;
      const cards = el.querySelectorAll("[data-fbcard]");
      if (!cards.length) return;
      fbIdxRef.current = (fbIdxRef.current + 1) % cards.length;
      const card = cards[fbIdxRef.current];
      el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
    }, 2800);
    const onTouch = () => { fbPausedRef.current = true; setTimeout(() => { fbPausedRef.current = false; }, 5000); };
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => { clearInterval(t); el.removeEventListener("touchstart", onTouch); };
  }, [all.length, isMobile]);

  if (all.length === 0) return emptySection;

  // ── HEADER dùng chung ──
  const header = (
    <div style={{ textAlign: "center", marginBottom: 32, position: "relative", zIndex: 2, padding: "0 16px" }}>
      <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px", color: TXT, fontFamily: 'var(--font-display)' }}>Feedback Khách Hàng</h2>
      <div style={{ width: 36, height: 1, background: G, margin: "14px auto 12px" }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0e0e0e", border: `1px solid ${G}33`, borderRadius: 99, padding: "6px 20px", marginBottom: 18 }}>
        <span style={{ color: G, fontSize: 16 }}>{"★".repeat(Math.round(parseFloat(avgRating)))}</span>
        <span style={{ color: G, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>{avgRating}</span>
        <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>· {all.length} đánh giá</span>
      </div>
    </div>
  );

  // ── MOBILE: auto-scroll + vuốt tay ──
  if (isMobile) {

    return (
      <div id="feedback" style={{ padding: "56px 0 52px", borderTop: `1px solid ${BR}`, background: "linear-gradient(180deg,#060606 0%,#080700 50%,#060606 100%)" }}>
        <style>{`.fb-scroll::-webkit-scrollbar{display:none}.fb-scroll{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
        {header}
        <div ref={fbScrollRef} className="fb-scroll"
          style={{ display: "flex", gap: 16, overflowX: "auto", overflowY: "visible", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", paddingLeft: 20, paddingRight: 20, paddingBottom: 8 }}>
          {all.map((c) => (
            <div key={c.key} data-fbcard="1" style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <FeedbackCard c={c} hov={false} onEnter={() => {}} onLeave={() => {}} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── DESKTOP: marquee animation ──
  const minItems = 8;
  let combined = [...all];
  while (combined.length < minItems) combined = [...combined, ...all];
  combined = [...combined, ...combined];
  const dur = Math.max(30, combined.length * 3.5);

  return (
    <div id="feedback" style={{ padding: "72px 0 64px", borderTop: `1px solid ${BR}`, overflow: "hidden", background: "linear-gradient(180deg,#060606 0%,#080700 50%,#060606 100%)", position: "relative" }}>
      <style>{`
        @keyframes scrollFeed{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
      `}</style>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: `radial-gradient(ellipse,${G}06,transparent 70%)`, pointerEvents: "none" }} />

      {header}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => setPaused(p => !p)}
          style={{ background: paused ? G + "22" : "none", border: `1px solid ${paused ? G : BR}`, color: paused ? G : MUT, padding: "6px 22px", borderRadius: 99, fontSize: 10, cursor: "pointer", fontFamily: "system-ui,sans-serif", letterSpacing: 1.5, transition: "all .3s" }}>
          {paused ? "▶ TIẾP TỤC" : "⏸ DỪNG"}
        </button>
      </div>

      <div style={{ overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(to right,#060606,transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(to left,#060606,transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 20, width: "max-content", animation: `scrollFeed ${dur}s linear infinite`, animationPlayState: paused ? "paused" : "running", paddingLeft: 20 }}>
          {combined.map((c, i) => (
            <FeedbackCard key={c.key + "_" + i} c={c} hov={hovCard === i}
              onEnter={() => { setHovCard(i); setPaused(true); }}
              onLeave={() => { setHovCard(null); setPaused(false); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CUSTOMER PHOTO FEED (kept for backward compat – used internally) ──
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

  const inpS = { padding: "10px 13px", background: "#111", border: `1px solid ${BR}`, borderRadius: 8, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 16, padding: 32, width: "min(480px,96vw)", position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer" }}>✕</button>
        <Logo size={0.72} />

        {/* Đã được admin xử lý → không cho edit */}
        {isLocked ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{existingFb.status === "approved" ? "🌟" : "😔"}</div>
            <div style={{ color: G, fontSize: 17, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
              {existingFb.status === "approved" ? "Đánh giá đã được duyệt!" : "Đánh giá đã bị từ chối"}
            </div>
            <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.7 }}>
              {existingFb.status === "approved"
                ? "Đánh giá của bạn đang hiển thị trên trang chủ."
                : "Admin đã từ chối đánh giá này. Liên hệ Zalo nếu cần hỗ trợ."}
            </div>
            <button onClick={onClose} style={{ marginTop: 20, padding: "10px 32px", background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đóng</button>
          </div>
        ) : done ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌟</div>
            <div style={{ color: G, fontSize: 18, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>{isEditing ? "Đã cập nhật đánh giá! 💛" : "Cảm ơn bạn! 💛"}</div>
            <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.7, marginBottom: 24 }}>Đánh giá đang chờ admin duyệt.<br />Cảm ơn bạn đã chia sẻ trải nghiệm! 💛</div>
            <button onClick={onClose} style={{ padding: "11px 36px", background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đóng</button>
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
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 34, color: s <= (hovStar || rating) ? G : "#2a2a2a", padding: 2, lineHeight: 1, transition: "all .1s", transform: s <= (hovStar || rating) ? "scale(1.15)" : "scale(1)" }}>★</button>
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
              style={{ width: "100%", padding: 14, background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 24px ${G}44` }}>
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

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui,sans-serif", position: "relative", zIndex: 1 }}>
      <style>{`*{box-sizing:border-box;} @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.55)", backdropFilter: "blur(32px) saturate(160%)", WebkitBackdropFilter: "blur(32px) saturate(160%)", borderBottom: `1px solid rgba(42,42,42,0.6)`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background .3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          <div style={{ marginRight: 8, flexShrink: 0 }}><Logo size={0.65} /></div>
          {[["dashboard","📊 Dashboard"],["orders","📋 Đơn thuê"],["feedbacks","⭐ Feedback"],["badges","🏅 Huy hiệu"],["settings","⚙️ Cài đặt"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={tabStyle(k)}>{l}</button>
          ))}
        </div>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${BR}`, color: MUT, padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, flexShrink: 0, marginLeft: 16 }}>← Trang chủ</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>

        {/* Profile banner */}
        <div style={{ background: `linear-gradient(135deg,#0a0900,#110e00)`, border: `1px solid ${G}33`, borderRadius: 14, padding: "22px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {/* Clickable avatar */}
          <div style={{ position: "relative", flexShrink: 0 }} onClick={() => avatarRef.current?.click()} title="Đổi ảnh đại diện">
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: G + "22", border: `2px solid ${G}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, overflow: "hidden", cursor: "pointer", transition: "border-color .2s" }}>
              {(loggedUser?.avatar || loggedUser?.picture)
                ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{loggedUser?.name?.[0]?.toUpperCase() || "👤"}</span>}
            </div>
            {/* Camera icon overlay */}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid #060606", cursor: "pointer", boxShadow: `0 0 8px ${G}66` }}>
              {avatarLoading ? "⏳" : "📷"}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: G, fontWeight: 700, fontSize: 17 }}>{loggedUser?.displayName || loggedUser?.name}</div>
            <div style={{ color: MUT, fontSize: 12, marginTop: 3 }}>{loggedUser?.email ? `✉️ ${loggedUser.email}` : `📞 ${loggedUser?.phone}`}</div>
            <div style={{ color: "#333", fontSize: 10, marginTop: 2, fontFamily: "system-ui,sans-serif" }}>Bấm ảnh đại diện để thay đổi</div>
            {badges.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {badges.slice(-2).map(b => (
                  <span key={b.label} style={{ background: b.col + "22", color: b.col, border: `1px solid ${b.col}44`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>{b.icon} {b.label}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setLoggedUser(null); onBack(); }}
            style={{ background: "none", border: `1px solid ${BR}`, color: MUT, padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, flexShrink: 0 }}>Đăng xuất</button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div>
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { icon: "📋", label: "Tổng đơn", value: myOrders.length, col: "#60a5fa" },
                { icon: "💰", label: "Đã chi tiêu", value: fmtVND(totalSpent), col: G, small: true },
                { icon: "📅", label: "Tổng ngày thuê", value: totalDays + " ngày", col: "#a78bfa" },
                { icon: "✅", label: "Đơn hoàn thành", value: completedOrders.length, col: "#22c55e" },
              ].map(s => (
                <div key={s.label} style={{ background: CARD, border: `1px solid ${s.col}22`, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ color: s.col, fontWeight: 800, fontSize: s.small ? 13 : 24, lineHeight: 1.3 }}>{s.value}</div>
                  <div style={{ color: MUT, fontSize: 10, marginTop: 5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Thiết bị đã thuê */}
            {usedCameras.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
                <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 14 }}>THIẾT BỊ ĐÃ THUÊ</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {usedCameras.map(c => (
                    <span key={c} style={{ background: G + "15", color: G, border: `1px solid ${G}33`, borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 600 }}>📷 {c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action */}
            {(() => {
              const unreviewed = completedOrders.filter(o => !feedbacks.some(f =>
                f.orderId === o.id && (
                  (myEmail && f.email === myEmail) ||
                  (myPhone && normPhone(f.phone) === myPhone)
                )
              ));
              return unreviewed.length > 0 && (
                <div style={{ background: "#0a0900", border: `1px solid ${G}44`, borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
                  <div style={{ color: G, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⭐ Bạn có {unreviewed.length} đơn chưa đánh giá!</div>
                  <div style={{ color: MUT, fontSize: 12, marginBottom: 14 }}>Chia sẻ trải nghiệm để giúp cộng đồng và nhận huy hiệu Creator.</div>
                  <button onClick={() => setTab("orders")} style={{ padding: "9px 22px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Đánh giá ngay →</button>
                </div>
              );
            })()}

            {/* CTA book more */}
            {onOpenBooking && (
              <button onClick={onOpenBooking} style={{ width: "100%", padding: "14px 0", background: "transparent", border: `1px solid ${G}55`, color: G, borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "system-ui,sans-serif", fontWeight: 600, letterSpacing: 1 }}>
                📷 Thuê thêm thiết bị →
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
                style={{ padding: "6px 12px", background: "#0e0e0e", color: refreshing ? MUT : G, border: `1px solid ${refreshing ? BR : G + "55"}`, borderRadius: 6, cursor: refreshing ? "default" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all .2s" }}>
                <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>🔄</span>
                {refreshing ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
            <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

            {/* Status filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {["all","pending","confirmed","active","completed","cancelled"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding: "7px 14px", background: filterStatus === s ? "#130f00" : "#0e0e0e", color: filterStatus === s ? G : MUT, border: `1px solid ${filterStatus === s ? G + "55" : BR}`, borderRadius: 99, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: filterStatus === s ? 700 : 400, transition: "all .15s" }}>
                  {s === "all" ? "Tất cả" : (STATUS_CFG[s]?.label || s)}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: MUT }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14 }}>Chưa có đơn thuê nào</div>
                {onOpenBooking && <button onClick={onOpenBooking} className="btn-3d" style={{ marginTop: 16, padding: "10px 24px", borderRadius: 6, fontSize: 12, letterSpacing: 2 }}>Thuê ngay</button>}
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
                    <div key={o.id} style={{ background: CARD, border: `1px solid ${o.status === "active" ? "#f59e0b33" : o.status === "completed" ? "#22c55e22" : BR}`, borderRadius: 12, padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: G, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{o.id}</span>
                            <Badge status={o.status} />
                          </div>
                          <div style={{ color: TXT, fontSize: 13, fontWeight: 600 }}>📷 {o.cameraName}</div>
                          <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>{o.date} · {o.days} ngày · {fmtVND(o.total)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ color: G, fontWeight: 800, fontSize: 16 }}>{fmtVND(o.total)}</div>
                        </div>
                      </div>
                      {/* Status progress for active orders */}
                      {o.status === "active" && (
                        <div style={{ background: "#0a0800", border: `1px solid #f59e0b22`, borderRadius: 6, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#f59e0b" }}>
                          🎬 Đang thuê · Nhớ giữ gìn thiết bị cẩn thận nhé!
                        </div>
                      )}
                      {/* Feedback actions */}
                      <div style={{ borderTop: `1px solid ${BR}`, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {o.status === "completed" && (
                          <CopyOrderBtn copyFn={() => {
                            const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                            const lines = [
                              "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              `Mã đơn : ${o.id}`,
                              `📷 Máy  : ${o.cameraName}`,
                              `🎒 Phụ kiện: ${accList}`,
                              `📅 Ngày thuê: ${o.date}`,
                              `⏱ Thời gian: ${o.days} ngày`,
                              o.discountCode ? `🏷️ Mã giảm giá: ${o.discountCode} (-${fmtVND(o.discountAmt || 0)})` : null,
                              `💰 Tổng tiền: ${fmtVND(o.total)}`,
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              `👤 Tên   : ${o.name}`,
                              `📞 SĐT   : ${o.phone}`,
                              `📍 Địa chỉ: ${o.address || "—"}`,
                              o.note ? `💬 Ghi chú: ${o.note}` : null,
                              "━━━━━━━━━━━━━━━━━━━━━━",
                              "✅ Trạng thái: Hoàn thành",
                            ].filter(Boolean).join("\n");
                            navigator.clipboard?.writeText(lines).catch(() => {});
                          }} />
                        )}
                        {canFeedback && !hasFeedback && (
                          <button onClick={() => setFbOrder(o)}
                            style={{ padding: "8px 20px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 16px ${G}33` }}>
                            ⭐ Đánh giá
                          </button>
                        )}
                        {hasFeedback && fbStatus === "pending" && (
                          <button onClick={() => setFbOrder(o)}
                            style={{ padding: "8px 20px", background: "#1a1000", color: G, border: `1px solid ${G}55`, borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                            ✏️ Sửa đánh giá
                          </button>
                        )}
                        {hasFeedback && fbStatus === "approved" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                            🌟 Đã được duyệt
                          </span>
                        )}
                        {hasFeedback && fbStatus === "rejected" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
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
                  <div key={f.id} style={{ background: CARD, border: `1px solid ${f.status === "approved" ? "#22c55e33" : f.status === "rejected" ? "#ef444433" : BR}`, borderRadius: 12, padding: "18px 20px" }}>
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
            <div style={{ color: TXT, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Huy hiệu của tôi</div>
            <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { icon: "🥉", label: "Khách Đồng", desc: "Thuê ít nhất 1 lần", col: "#cd7f32", unlocked: myOrders.length >= 1 },
                { icon: "🥈", label: "Khách Bạc", desc: "Thuê 3+ lần", col: "#aaa", unlocked: myOrders.length >= 3 },
                { icon: "🥇", label: "Khách Vàng", desc: "Thuê 5+ lần", col: G, unlocked: myOrders.length >= 5 },
                { icon: "👑", label: "Đại Gia Khoảnh Khắc", desc: "Thuê tổng 30+ ngày", col: G, unlocked: totalDays >= 30 },
                { icon: "💎", label: "Khách VIP", desc: "Chi tiêu 5,000,000đ+", col: "#38bdf8", unlocked: totalSpent >= 5000000 },
              ].map(b => (
                <div key={b.label} style={{ background: CARD, border: `1px solid ${b.unlocked ? b.col + "44" : BR}`, borderRadius: 14, padding: "22px 18px", textAlign: "center", opacity: b.unlocked ? 1 : 0.4, transition: "all .3s", position: "relative" }}>
                  {b.unlocked && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />}
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{b.icon}</div>
                  <div style={{ color: b.unlocked ? b.col : MUT, fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{b.label}</div>
                  <div style={{ color: MUT, fontSize: 10 }}>{b.desc}</div>
                  {b.unlocked && <div style={{ color: "#22c55e", fontSize: 10, marginTop: 8, fontWeight: 600 }}>✓ Đã mở khoá</div>}
                </div>
              ))}
            </div>

            {/* Leaderboard hint */}
            <div style={{ background: "#0a0900", border: `1px solid ${G}33`, borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ color: G, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🏆 Thống kê của bạn</div>
              {[
                ["Tổng đơn đã thuê", myOrders.length + " đơn"],
                ["Tổng ngày thuê", totalDays + " ngày"],
                ["Tổng chi tiêu", fmtVND(totalSpent)],
                ["Số đánh giá gửi", myFeedbacks.length + " feedback"],
                ["Đánh giá được duyệt", myFeedbacks.filter(f => f.status === "approved").length + " đánh giá"],
                ["Huy hiệu đã mở", badges.length + " / 6 huy hiệu"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BR}` }}>
                  <span style={{ color: MUT, fontSize: 12 }}>{l}</span>
                  <span style={{ color: G, fontWeight: 700, fontSize: 12 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div>
            <div style={{ color: TXT, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Cài đặt hồ sơ</div>
            <div style={{ width: 30, height: 2, background: G, marginBottom: 22 }} />

            <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 14, padding: "24px 22px", maxWidth: 520 }}>
              {/* Avatar section */}
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ position: "relative", flexShrink: 0 }} onClick={() => avatarRef.current?.click()} title="Đổi ảnh đại diện">
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: G + "22", border: `2px solid ${G}55`, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                    {(loggedUser?.avatar || loggedUser?.picture)
                      ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span>{loggedUser?.name?.[0]?.toUpperCase() || "👤"}</span>}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid #060606", cursor: "pointer" }}>
                    {avatarLoading ? "⏳" : "📷"}
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { if (e.target.files[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
                </div>
                <div>
                  <div style={{ color: TXT, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Ảnh đại diện</div>
                  <div style={{ color: MUT, fontSize: 12 }}>Bấm vào ảnh để thay đổi<br />Ảnh được lưu vào hồ sơ của bạn</div>
                </div>
              </div>

              {/* Form fields */}
              {[
                { key: "displayName", label: "Tên hiển thị", type: "text", placeholder: loggedUser?.name || "Tên của bạn", hint: "Tên này sẽ tự điền khi đặt máy" },
                { key: "phone", label: "Số điện thoại", type: "tel", placeholder: "0901 234 567", hint: "Tự điền SĐT khi đặt máy" },
                { key: "zalo", label: "Zalo", type: "tel", placeholder: "Số Zalo (nếu khác SĐT)", hint: "Dùng để xác nhận đơn qua Zalo" },
                { key: "address", label: "Địa chỉ nhận máy", type: "text", placeholder: "Số nhà, đường, phường...", hint: "Tự điền địa chỉ khi đặt máy" },
              ].map(({ key, label, type, placeholder, hint }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 5, fontFamily: "system-ui,sans-serif" }}>{label.toUpperCase()}</div>
                  <input
                    type={type}
                    value={settingsForm[key]}
                    onChange={e => setSettingsForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ padding: "10px 13px", background: "#111", border: `1px solid ${BR}`, borderRadius: 8, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}
                  />
                  <div style={{ color: "#333", fontSize: 10, marginTop: 4, fontFamily: "system-ui,sans-serif" }}>{hint}</div>
                </div>
              ))}

              {/* Google info (readonly) */}
              <div style={{ background: "#0a0a0a", border: `1px solid ${BR}`, borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
                <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>TÀI KHOẢN GOOGLE</div>
                <div style={{ color: TXT, fontSize: 13 }}>✉️ {loggedUser?.email}</div>
                <div style={{ color: "#333", fontSize: 11, marginTop: 4 }}>Tên Google: {loggedUser?.name}</div>
              </div>

              <button onClick={handleSaveSettings}
                style={{ width: "100%", padding: "12px 0", background: settingsSaved ? "#022" : G, color: settingsSaved ? "#22c55e" : "#000", border: settingsSaved ? "1px solid #22c55e44" : "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", transition: "all .3s" }}>
                {settingsSaved ? "✓ Đã lưu hồ sơ!" : "💾 Lưu cài đặt"}
              </button>
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

function BookingModal({ cameras, accessories, siteContent, discounts, setDiscounts, onClose, onSubmit, loggedUser, preselectedCamId }) {
  const [step, setStep] = useState(1);
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

  // ── Discount state ──
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { code, type, value, discountAmt }
  const [discountMsg, setDiscountMsg] = useState(null); // { type: "ok"|"err", text }

  const days = selDur ? selDur.days : (parseInt(customDays) || 0);
  const availCams = cameras.filter(c => c.status === "available");
  const selectedCamList = availCams.filter(c => selCams[c.id] > 0);
  const totalCamSelected = Object.values(selCams).reduce((s, q) => s + (q || 0), 0);

  const camCost = selectedCamList.reduce((s, c) => s + c.price * (selCams[c.id] || 0) * days, 0);
  const accCost = Object.entries(selAcc).reduce((s, [name, qty]) => {
    const a = accessories.find(x => x.name === name);
    return s + (a ? a.price * qty * days : 0);
  }, 0);
  const subtotal = camCost + accCost;
  const discountAmt = appliedDiscount ? Math.min(appliedDiscount.discountAmt, subtotal) : 0;
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
    const amt = disc.type === "percent" ? Math.round(subtotal * disc.value / 100) : disc.value;
    setAppliedDiscount({ code: disc.code, type: disc.type, value: disc.value, discountAmt: amt, id: disc.id });
    setDiscountMsg({ type: "ok", text: `Áp dụng thành công! Giảm ${disc.type === "percent" ? disc.value + "%" : fmtVND(disc.value)}` });
  };

  const removeDiscount = () => { setAppliedDiscount(null); setDiscountCode(""); setDiscountMsg(null); };

  const endDate = () => { if (!pickDate || !days) return ""; const d = new Date(pickDate); d.setDate(d.getDate() + days); return d.toLocaleDateString("vi-VN"); };

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
  const setAccQty = (name, qty) => {
    const q = Math.max(0, Math.min(20, parseInt(qty) || 0));
    setSelAcc(p => { if (q === 0) { const n = { ...p }; delete n[name]; return n; } return { ...p, [name]: q }; });
  };

  const handleFinish = () => {
    const id = newOrderId();
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
      ...info, status: "pending", date: pickDate, seen: false, userPhone: loggedUser?.phone || info.phone, userEmail: loggedUser?.email || ""
    });
    setDone(true);
  };

  const overlay = { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" };
  const box = { background: "#080808", border: `1px solid ${BR}`, borderRadius: 16, padding: "min(32px, 5vw)", width: "min(600px,96vw)", position: "relative", margin: "auto" };
  const inpS = { padding: "11px 14px", background: "#0e0e0e", border: `1px solid ${BR}`, borderRadius: 8, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif", transition: "border .2s" };
  const qtyBtn = (onClick, label) => (
    <button onClick={onClick} style={{ width: 26, height: 26, border: `1px solid ${BR}`, borderRadius: 5, background: "#111", color: TXT, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "monospace" }}>{label}</button>
  );

  const stepLabel = ["Chọn thiết bị", "Thời gian & phụ kiện", "Thông tin đặt"];

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && !done && onClose()}>
      <div style={box}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        <div style={{ marginBottom: 24 }}>
          <Logo size={0.72} />
          {!done && (
            <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
              {stepLabel.map((l, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 2, background: step > i + 1 ? G : step === i + 1 ? G + "88" : "#1a1a1a", borderRadius: 1, marginBottom: 5, transition: "all .3s" }} />
                  <div style={{ fontSize: 9, color: step >= i + 1 ? G : MUT, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STEP 1 — chọn nhiều máy */}
        {!done && step === 1 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ color: TXT, fontWeight: 600, fontSize: 15 }}>Chọn máy ảnh</div>
              {totalCamSelected > 0 && (
                <span style={{ background: G + "22", color: G, border: `1px solid ${G}44`, borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>
                  Đã chọn {totalCamSelected} máy
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {availCams.map(c => {
                const isSelected = (selCams[c.id] || 0) > 0;
                return (
                  <div key={c.id}
                    style={{ border: `1px solid ${isSelected ? G : BR}`, borderRadius: 10, padding: 14, background: isSelected ? "#130f00" : "#0e0e0e", transition: "all .2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => toggleCam(c)}>
                      {c.images?.length > 0
                        ? <img src={c.images[0]} alt={c.name} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, border: `1px solid ${BR}`, flexShrink: 0 }} />
                        : <div style={{ width: 52, height: 52, background: "#111", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{c.icon}</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: isSelected ? G : TXT, fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                        <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>{c.desc}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: G, fontWeight: 700, fontSize: 14 }}>{fmtVND(c.price)}</div>
                        <div style={{ color: MUT, fontSize: 10 }}>/ngày</div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${isSelected ? G : BR}`, background: isSelected ? G : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                        {isSelected && <span style={{ color: "#000", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                    </div>
                    {/* qty control khi đã chọn */}
                    {isSelected && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${G}22` }}>
                        <span style={{ color: MUT, fontSize: 11, flex: 1 }}>Số lượng máy:</span>
                        {qtyBtn(() => setCamQty(c.id, (selCams[c.id] || 1) - 1, c.qty), "−")}
                        <span style={{ color: G, fontWeight: 700, fontSize: 15, minWidth: 24, textAlign: "center" }}>{selCams[c.id]}</span>
                        {qtyBtn(() => setCamQty(c.id, (selCams[c.id] || 1) + 1, c.qty), "+")}
                        <span style={{ color: MUT, fontSize: 10 }}>/ {c.qty} máy có sẵn</span>
                        <span style={{ color: G, fontSize: 12, fontWeight: 700, marginLeft: "auto" }}>+{fmtVND(c.price * (selCams[c.id] || 1))}/ngày</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => totalCamSelected > 0 && setStep(2)} disabled={totalCamSelected === 0}
              style={{ width: "100%", padding: 13, background: totalCamSelected > 0 ? G : "#1a1a1a", color: totalCamSelected > 0 ? "#000" : MUT, border: "none", borderRadius: 8, cursor: totalCamSelected > 0 ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>
              Tiếp theo → {totalCamSelected > 0 && `(${totalCamSelected} máy)`}
            </button>
          </div>
        )}

        {/* STEP 2 — thời gian + phụ kiện multi-qty */}
        {!done && step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: MUT, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 16 }}>← Quay lại</button>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {DURATIONS.map(d => (
                <button key={d.days} onClick={() => { setSelDur(d); setCustomDays(""); }}
                  style={{ flex: 1, padding: "10px 4px", background: selDur?.days === d.days ? "#130f00" : "#0e0e0e", color: selDur?.days === d.days ? G : MUT, border: `1px solid ${selDur?.days === d.days ? G : BR}`, borderRadius: 7, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: selDur?.days === d.days ? 700 : 400 }}>{d.label}</button>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>HOẶC NHẬP SỐ NGÀY</div>
              <input style={inpS} type="number" min={1} value={customDays} onChange={e => { setCustomDays(e.target.value); setSelDur(null); }} placeholder="VD: 5" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>NGÀY BẮT ĐẦU</div>
              <input style={inpS} type="date" value={pickDate} min={todayStr()} onChange={e => setPickDate(e.target.value)} />
            </div>
            {days > 0 && (
              <div style={{ background: "#0a0800", border: `1px solid ${G}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: MUT }}>
                Trả máy: <span style={{ color: TXT, fontWeight: 600 }}>{endDate()}</span> · Tiền máy: <span style={{ color: G, fontWeight: 700 }}>{fmtVND(camCost)}</span>
              </div>
            )}

            {/* Phụ kiện multi-select + qty */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: TXT, fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Phụ kiện đi kèm</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {accessories.map(a => {
                  const isSelected = (selAcc[a.name] || 0) > 0;
                  return (
                    <div key={a.id} style={{ border: `1px solid ${isSelected ? G + "66" : BR}`, borderRadius: 8, padding: "10px 14px", background: isSelected ? "#0a0900" : "#0d0d0d", transition: "all .2s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => toggleAcc(a.name)}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? G : BR}`, background: isSelected ? G : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                          {isSelected && <span style={{ color: "#000", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ color: isSelected ? TXT : MUT, fontSize: 13, flex: 1 }}>{a.name}</span>
                        <span style={{ color: G, fontSize: 12, fontWeight: 700 }}>{fmtVND(a.price)}/ngày</span>
                      </div>
                      {isSelected && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${G}22` }}>
                          <span style={{ color: MUT, fontSize: 11 }}>Số lượng:</span>
                          {qtyBtn(() => setAccQty(a.name, (selAcc[a.name] || 1) - 1), "−")}
                          <span style={{ color: G, fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>{selAcc[a.name]}</span>
                          {qtyBtn(() => setAccQty(a.name, (selAcc[a.name] || 1) + 1), "+")}
                          {days > 0 && <span style={{ color: MUT, fontSize: 11, marginLeft: "auto" }}>= {fmtVND(a.price * selAcc[a.name] * days)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => days > 0 && setStep(3)} disabled={days === 0}
              style={{ width: "100%", padding: 13, background: days > 0 ? G : "#1a1a1a", color: days > 0 ? "#000" : MUT, border: "none", borderRadius: 8, cursor: days > 0 ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>
              Tiếp theo →
            </button>
          </div>
        )}

        {/* STEP 3 — xác nhận + thông tin */}
        {!done && step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: MUT, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 16 }}>← Quay lại</button>

            {/* Tóm tắt đơn */}
            <div style={{ background: "#0a0800", border: `1px solid ${G}33`, borderRadius: 9, padding: "14px 16px", marginBottom: 18 }}>
              <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>TÓM TẮT ĐƠN THUÊ</div>
              {/* Danh sách máy */}
              {selectedCamList.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: TXT }}>📷 {c.name} <span style={{ color: MUT }}>×{selCams[c.id]}</span></span>
                  <span style={{ color: G, fontWeight: 600 }}>{fmtVND(c.price * selCams[c.id] * days)}</span>
                </div>
              ))}
              {/* Phụ kiện */}
              {Object.entries(selAcc).length > 0 && (
                <div style={{ borderTop: `1px solid ${BR}`, marginTop: 8, paddingTop: 8 }}>
                  {Object.entries(selAcc).map(([name, qty]) => {
                    const a = accessories.find(x => x.name === name);
                    return (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: MUT }}>🎒 {name} ×{qty}</span>
                        <span style={{ color: MUT }}>{fmtVND((a?.price || 0) * qty * days)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ borderTop: `1px solid ${G}33`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: appliedDiscount ? 6 : 0 }}>
                  <span style={{ color: MUT, fontSize: 12 }}>{days} ngày · từ {pickDate} → {endDate()}</span>
                  <div style={{ textAlign: "right" }}>
                    {appliedDiscount ? (
                      <>
                        <div style={{ color: MUT, fontSize: 12, textDecoration: "line-through" }}>{fmtVND(subtotal)}</div>
                        <div style={{ color: "#22c55e", fontSize: 12 }}>- {fmtVND(discountAmt)} ({appliedDiscount.code})</div>
                        <div style={{ color: G, fontWeight: 800, fontSize: 20 }}>{fmtVND(total)}</div>
                      </>
                    ) : (
                      <div style={{ color: G, fontWeight: 800, fontSize: 20 }}>{fmtVND(total)}</div>
                    )}
                    <div style={{ color: MUT, fontSize: 10 }}>Tổng cộng</div>
                  </div>
                </div>
              </div>
            </div>

            {/* MÃ GIẢM GIÁ */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>MÃ GIẢM GIÁ (TÙY CHỌN)</div>
              {appliedDiscount ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#021a0a", border: "1px solid #22c55e44", borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13, flex: 1 }}>{appliedDiscount.code} — Giảm {fmtVND(discountAmt)}</span>
                  <button onClick={removeDiscount} style={{ background: "none", border: "none", color: MUT, cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inpS, flex: 1, textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace", marginBottom: 0 }}
                    value={discountCode}
                    onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountMsg(null); }}
                    onKeyDown={e => e.key === "Enter" && applyDiscount()}
                    placeholder="NHẬP MÃ..."
                  />
                  <button onClick={applyDiscount}
                    style={{ padding: "11px 16px", background: G + "22", border: `1px solid ${G}55`, color: G, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>
                    Áp dụng
                  </button>
                </div>
              )}
              {discountMsg && (
                <div style={{ marginTop: 6, fontSize: 12, color: discountMsg.type === "ok" ? "#22c55e" : "#ef4444", fontFamily: "system-ui,sans-serif" }}>
                  {discountMsg.text}
                </div>
              )}
            </div>

            {[["name", "Họ và tên *", "text"], ["phone", "Số điện thoại *", "tel"], ["zalo", "Zalo (để xác nhận đơn)", "tel"], ["address", "Địa chỉ nhận/trả máy", "text"]].map(([k, l, t]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>{l.toUpperCase()}</div>
                <input style={inpS} type={t} value={info[k]} onChange={e => setInfo(p => ({ ...p, [k]: e.target.value }))} placeholder={l} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GHI CHÚ</div>
              <textarea style={{ ...inpS, resize: "vertical", minHeight: 70 }} value={info.note} onChange={e => setInfo(p => ({ ...p, note: e.target.value }))} placeholder="Yêu cầu đặc biệt..." />
            </div>
            <button onClick={() => info.name && info.phone && handleFinish()}
              disabled={!info.name || !info.phone}
              style={{ width: "100%", padding: 14, background: info.name && info.phone ? G : "#1a1a1a", color: info.name && info.phone ? "#000" : MUT, border: "none", borderRadius: 8, cursor: info.name && info.phone ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 15, fontFamily: "system-ui,sans-serif" }}>
              📸 Xác nhận đặt thuê · {fmtVND(total)}{appliedDiscount ? " 🏷️" : ""}
            </button>
          </div>
        )}

        {/* DONE */}
        {done && (
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📸</div>
            <div style={{ color: G, fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 6, letterSpacing: 1 }}>Đặt đơn thành công!</div>
            <div style={{ color: MUT, fontSize: 13, marginBottom: 10 }}>Mã đơn của bạn</div>
            <div style={{ color: TXT, fontSize: 28, fontWeight: 900, fontFamily: "monospace", letterSpacing: 5, background: "#111", padding: "12px 24px", borderRadius: 10, border: `1px solid ${G}44`, display: "inline-block", marginBottom: 12 }}>{orderId}</div>
            <div style={{ color: MUT, fontSize: 14, marginBottom: 20 }}>
              {appliedDiscount && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 6 }}>🏷️ Mã {appliedDiscount.code} — Đã giảm {fmtVND(discountAmt)}</div>}
              Tổng: <span style={{ color: G, fontWeight: 700, fontSize: 16 }}>{fmtVND(total)}</span>
            </div>

            {/* QR thanh toán / liên hệ */}
            {siteContent.zaloQR && (
              <div style={{ margin: "0 auto 18px", maxWidth: 220 }}>
                <div style={{ color: MUT, fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>QUÉT QR ĐỂ LIÊN HỆ / ĐẶT CỌC</div>
                <div style={{ background: "#fff", borderRadius: 12, padding: 10, display: "inline-block", boxShadow: `0 0 30px ${G}22` }}>
                  <img src={siteContent.zaloQR} alt="Zalo QR" style={{ width: 180, height: 180, objectFit: "contain", display: "block" }} />
                </div>
              </div>
            )}

            {/* Nút Zalo */}
            {(() => {
              const zaloMsg = encodeURIComponent(
                "Xin chào 92 KA MÊ RA! 📸\nMã đơn: " + orderId +
                "\nThiết bị: " + selectedCamList.map(c => c.name + " x" + selCams[c.id]).join(", ") +
                "\nSố ngày: " + days + " ngày" +
                (appliedDiscount ? "\nMã giảm giá: " + appliedDiscount.code + " (-" + fmtVND(discountAmt) + ")" : "") +
                "\nTổng tiền: " + fmtVND(total) +
                "\nKhách: " + info.name + " | SĐT: " + info.phone
              );
              const base = siteContent.zaloLink
                ? siteContent.zaloLink + "?text=" + zaloMsg
                : "https://zalo.me/" + (siteContent.zalo || "").replace(/\s/g, "") + "?text=" + zaloMsg;
              return (
                <div style={{ marginBottom: 14 }}>
                  <a href={base} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-block", padding: "14px 36px", background: "#06c755", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 20px rgba(6,199,85,0.3)" }}>
                    💬 Nhắn Zalo chốt đơn
                  </a>
                </div>
              );
            })()}

            <div style={{ color: "#06c755", fontSize: 12, fontWeight: 800, marginBottom: 16, background: "#021a0a", border: "1px solid #06c75544", borderRadius: 8, padding: "10px 14px", fontFamily: "system-ui,sans-serif", lineHeight: 1.7 }}>
              📌 Đơn thuê đã được tạo · Vui lòng xác nhận qua Zalo.<br/>Để được xử lý đơn nhanh hơn.
            </div>
            <CopyOrderBtn copyFn={() => {
              const accList = (() => { try { return Object.entries(selAcc).filter(([,q])=>q>0).map(([n,q])=>q>1?`${n} x${q}`:n).join(", ") || "Không có"; } catch { return "Không có"; } })();
              const lines = [
                "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `Mã đơn : ${orderId}`,
                `📷 Máy  : ${selectedCamList.map(c => `${c.name}${selCams[c.id]>1?` x${selCams[c.id]}`:""}`).join(", ")}`,
                `🎒 Phụ kiện: ${accList}`,
                `⏱ Thời gian: ${days} ngày`,
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
            }} />
            <div style={{ marginTop: 10 }} />
            <button onClick={onClose} style={{ width: "100%", padding: 12, background: "#111", color: MUT, border: `1px solid ${BR}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CAMERA FEATURED CAROUSEL ──
function CameraFeatured({ id, cameras, onBook, isMobile }) {
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
      <div id={id} style={{ padding: "72px 0 56px", background: BG, overflow: "hidden" }}>
        <style>{`.cam-scroll::-webkit-scrollbar{display:none}.cam-scroll{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
        <div style={{ padding: "0 16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:7, color:MUT, fontFamily:"system-ui,sans-serif", marginBottom:6 }}>BỘ SƯU TẬP</div>
            <h2 style={{ fontSize:24, fontWeight:400, letterSpacing:2, margin:0, color:TXT, fontFamily:'var(--font-display)' }}>Máy Ảnh Cho Thuê</h2>
          </div>
        </div>
        <div ref={camScrollRef} className="cam-scroll"
          style={{ display:"flex", gap:12, overflowX:"auto", scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", paddingLeft:16, paddingRight:16, paddingBottom:8 }}>
          {cameras.map((cam, i) => {
            const { brand, model } = parseName(cam.name);
            const isAvail = cam.status === "available";
            const isAct = i === active;
            return (
              <div key={cam.id} data-camcard="1"
                style={{ scrollSnapAlign:"start", flexShrink:0, width:"calc(100vw - 48px)", height:320, borderRadius:4, overflow:"hidden", border:`1px solid ${isAct ? G+"66" : BR}`, position:"relative", background:"#060606" }}>
                <div style={{ position:"absolute", inset:0, zIndex:0 }}><CamImage cam={cam} height={320} /></div>
                <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.3) 60%,transparent 100%)", pointerEvents:"none" }} />
                {!isAvail && <div style={{ position:"absolute",top:14,right:14,zIndex:10,background:"rgba(204,51,51,0.25)",border:"1px solid #cc3333",color:"#ff6666",fontSize:8,fontWeight:700,letterSpacing:2,padding:"4px 10px",fontFamily:"system-ui,sans-serif",borderRadius:2 }}>ĐÃ THUÊ</div>}
                <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:2, padding:"0 20px 20px" }}>
                  <div style={{ fontSize:8,letterSpacing:4,color:"rgba(255,255,255,0.5)",fontFamily:"system-ui,sans-serif",marginBottom:4,fontWeight:600 }}>{brand}</div>
                  <div style={{ fontSize:28,fontWeight:700,letterSpacing:0.5,color:"#fff",lineHeight:1,marginBottom:5,fontFamily:"system-ui,sans-serif",textShadow:"0 2px 12px rgba(0,0,0,0.8)" }}>{model}</div>
                  <div style={{ fontSize:8,letterSpacing:3,color:"rgba(255,255,255,0.45)",fontFamily:"system-ui,sans-serif",marginBottom:14 }}>{shortDesc(cam.desc)}</div>
                  <div style={{ width:28,height:1,background:G+"88",marginBottom:14 }} />
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <span style={{ color:G,fontSize:15,fontWeight:700,fontFamily:"system-ui,sans-serif" }}>{fmtVND(cam.price)}</span>
                      <span style={{ color:"rgba(255,255,255,0.35)",fontSize:9,marginLeft:4,fontFamily:"system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <button onClick={isAvail ? () => onBook(cam) : undefined} disabled={!isAvail}
                      className={isAvail ? "btn-3d" : ""}
                      style={isAvail ? { borderRadius:3,fontSize:9,letterSpacing:2,animation:"none",padding:"7px 15px" } : { background:"none",border:`1px solid #333`,cursor:"not-allowed",color:"#444",fontSize:9,fontFamily:"system-ui,sans-serif",fontWeight:700,letterSpacing:2,padding:"6px 12px",borderRadius:3 }}>
                      {isAvail ? "THUÊ NGAY" : "HẾT MÁY"}
                    </button>
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
    <div id={id} style={{ padding: "96px 0 80px", background: BG, overflow: "hidden", position: "relative" }}>
      <style>{`@keyframes scrollCam{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}`}</style>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:300, background:`radial-gradient(ellipse,${G}06,transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ textAlign:"center", marginBottom:32, position:"relative", zIndex:2 }}>
        <div style={{ fontSize:9, letterSpacing:7, color:MUT, fontFamily:"system-ui,sans-serif", marginBottom:14 }}>BỘ SƯU TẬP</div>
        <h2 style={{ fontSize:30, fontWeight:400, letterSpacing:2, margin:"0 0 6px", color:TXT, fontFamily:"var(--font-display)" }}>Máy Ảnh Cho Thuê</h2>
        <div style={{ width:36, height:1, background:G, margin:"14px auto 18px" }} />
        <button onClick={() => setCfPaused(p => !p)}
          style={{ background: cfPaused ? G+"22" : "none", border:`1px solid ${cfPaused ? G : BR}`, color: cfPaused ? G : MUT, padding:"6px 22px", borderRadius:99, fontSize:10, cursor:"pointer", fontFamily:"system-ui,sans-serif", letterSpacing:1.5, transition:"all .3s" }}>
          {cfPaused ? "▶ TIẾP TỤC" : "⏸ DỪNG"}
        </button>
      </div>

      <div style={{ overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:120, background:"linear-gradient(to right,#060606,transparent)", zIndex:2, pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:120, background:"linear-gradient(to left,#060606,transparent)", zIndex:2, pointerEvents:"none" }} />
        <div style={{ display:"flex", gap:20, width:"max-content", animation:`scrollCam ${dur}s linear infinite`, animationPlayState: cfPaused ? "paused" : "running", paddingLeft:20 }}>
          {combined.map((cam, i) => {
            const parts = cam.name.split(" ");
            const brandMap = { fujifilm:"FUJIFILM", sony:"SONY", canon:"CANON", nikon:"NIKON", dji:"DJI", gopro:"GOPRO" };
            const b = brandMap[parts[0].toLowerCase()] || parts[0].toUpperCase();
            const m = parts.slice(1).join(" ");
            const isAvail = cam.status === "available";
            return (
              <div key={cam.id+"_"+i}
                onMouseEnter={() => setCfPaused(true)}
                onMouseLeave={() => setCfPaused(false)}
                style={{ flexShrink:0, width:280, height:360, borderRadius:4, overflow:"hidden", border:`1px solid ${G}44`, position:"relative", background:"#060606", cursor:"pointer" }}
                onClick={() => isAvail && onBook(cam)}>
                <div style={{ position:"absolute", inset:0, zIndex:0 }}><CamImage cam={cam} height={360} /></div>
                <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to top,rgba(6,6,6,0.92) 0%,rgba(6,6,6,0.4) 50%,rgba(6,6,6,0.1) 100%)", pointerEvents:"none" }} />
                {!isAvail && <div style={{ position:"absolute",top:14,right:14,zIndex:10,background:"rgba(204,51,51,0.25)",border:"1px solid #cc3333",color:"#ff6666",fontSize:8,fontWeight:700,letterSpacing:2,padding:"4px 10px",fontFamily:"system-ui,sans-serif",borderRadius:2 }}>ĐÃ THUÊ</div>}
                <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:2, padding:"0 20px 20px" }}>
                  <div style={{ fontSize:8,letterSpacing:4,color:"rgba(255,255,255,0.45)",fontFamily:"system-ui,sans-serif",marginBottom:4,fontWeight:600 }}>{b}</div>
                  <div style={{ fontSize:26,fontWeight:700,color:"#fff",lineHeight:1,marginBottom:6,fontFamily:"system-ui,sans-serif",textShadow:"0 2px 12px rgba(0,0,0,0.8)" }}>{m}</div>
                  <div style={{ width:24,height:1,background:G+"88",marginBottom:12 }} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <span style={{ color:G,fontSize:14,fontWeight:700,fontFamily:"system-ui,sans-serif" }}>{fmtVND(cam.price)}</span>
                      <span style={{ color:"rgba(255,255,255,0.35)",fontSize:9,marginLeft:4,fontFamily:"system-ui,sans-serif" }}>/ngày</span>
                    </div>
                    <button onClick={e=>{e.stopPropagation(); isAvail && onBook(cam);}} disabled={!isAvail}
                      className={isAvail ? "btn-3d" : ""}
                      style={isAvail ? { borderRadius:3,fontSize:9,letterSpacing:2,animation:"none",padding:"7px 14px" } : { background:"none",border:`1px solid #333`,cursor:"not-allowed",color:"#444",fontSize:9,fontFamily:"system-ui,sans-serif",padding:"6px 12px",borderRadius:3 }}>
                      {isAvail ? "THUÊ NGAY" : "HẾT MÁY"}
                    </button>
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

// ── HOMEPAGE ──
function HomePage({ cameras, accessories, siteContent, onBook, onAdmin, isMobile, photos, feedbacks, loggedUser, onOpenLogin, onOpenCustomer }) {
  const [scrollY, setScrollY] = useState(0);
  const [scrollDir, setScrollDir] = useState("up");
  const prevScrollY = useRef(0);
  const [hov, setHov] = useState(null);
  const [ticker, setTicker] = useState(0);
  const [logoClick, setLogoClick] = useState(0);
  const [logoRipple, setLogoRipple] = useState(false);
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
      const curr = window.scrollY;
      if (curr > prevScrollY.current + 2) setScrollDir("down");
      else if (curr < prevScrollY.current - 2) setScrollDir("up");
      prevScrollY.current = curr;
      setScrollY(curr);
    };
    window.addEventListener("scroll", h, { passive: true });
    const t = setInterval(() => setTicker(p => (p + 1) % cameras.length), 3000);
    return () => { window.removeEventListener("scroll", h); clearInterval(t); };
  }, [cameras.length]);
  // navState: "top" | "visible" | "compact"
  const navState = scrollY < 60 ? "top" : (scrollDir === "up" ? "visible" : "compact");
  const marquee = cameras.map(c => `${c.icon || "📷"} ${c.name}`);

  return (
    <div style={{ position: "relative", zIndex: 1, fontFamily: 'var(--font-display)', color: TXT }}>
      {/* NAV */}
      <nav className="nav92" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: navState === "top" ? "8px 20px 0" : "0" }}>
        <div className={`nav-inner${navState !== "top" ? " scrolled" : ""}${navState === "compact" ? " compact" : ""}`}
          style={{ display: "flex", alignItems: "center", padding: isMobile ? "6px 12px" : "0 16px", height: isMobile ? "auto" : (navState === "compact" ? 24 : 34), gap: isMobile ? 8 : 0, overflow: "hidden" }}>

          {/* LOGO */}
          <div onClick={handleLogoClick} style={{ cursor: "pointer", flexShrink: 0, marginRight: isMobile ? 0 : 20, transition: "transform .45s cubic-bezier(.4,0,.2,1)", transform: `scale(${navState === "compact" ? 0.82 : 1})`, transformOrigin: "left center", position: "relative" }}>
            <Logo size={isMobile ? 0.47 : 0.47} />
            {logoRipple && (
              <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden", background: "rgba(0,0,0,0)" }}>
                {/* gold ripple circle expanding from top-left */}
                <div style={{ position: "absolute", top: 40, left: 80, width: "200vmax", height: "200vmax", borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.06) 40%, transparent 70%)`, animation: "logoRipple 0.7s cubic-bezier(.2,0,.4,1) forwards", pointerEvents: "none" }} />
                {/* dark wash overlay */}
                <div style={{ position: "absolute", inset: 0, background: "#060606", animation: "pageWash 0.7s ease forwards", pointerEvents: "none" }} />
              </div>
            )}
          </div>

          {/* NAV LINKS — desktop only */}
          {!isMobile && (
            <>
              <div className="nav-div" style={{ marginRight: 20 }} />
              {[["MÁY ẢNH", "cameras"], ["PHỤ KIỆN", "accessories"], ["FEEDBACK", "feedback"], ["VỀ CHÚNG TÔI", "about"]].map(([t, id]) => (
                <button key={t} className="nav-link"
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{ marginRight: 20 }}>{t}</button>
              ))}
              <div className="nav-div" />
            </>
          )}

          {/* SPACER */}
          <div style={{ flex: 1 }} />

          {/* SOCIAL ICONS — desktop */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 6, marginRight: 12 }}>
              {/* YouTube */}
              <button className="nav-social" title="YouTube"
                onClick={() => { const u = siteContent.socialLinks?.youtube; if (u) window.open(u, "_blank"); }}
                style={{ opacity: siteContent.socialLinks?.youtube ? 1 : 0.32, cursor: siteContent.socialLinks?.youtube ? "pointer" : "default" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
              </button>
              {/* Facebook */}
              <button className="nav-social" title="Facebook"
                onClick={() => { const u = siteContent.socialLinks?.facebook; if (u) window.open(u, "_blank"); }}
                style={{ opacity: siteContent.socialLinks?.facebook ? 1 : 0.32, cursor: siteContent.socialLinks?.facebook ? "pointer" : "default" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </button>
              {/* TikTok */}
              <button className="nav-social" title="TikTok"
                onClick={() => { const u = siteContent.socialLinks?.tiktok; if (u) window.open(u, "_blank"); }}
                style={{ opacity: siteContent.socialLinks?.tiktok ? 1 : 0.32, cursor: siteContent.socialLinks?.tiktok ? "pointer" : "default" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/></svg>
              </button>
              {/* Instagram */}
              <button className="nav-social" title="Instagram"
                onClick={() => { const u = siteContent.socialLinks?.instagram; if (u) window.open(u, "_blank"); }}
                style={{ opacity: siteContent.socialLinks?.instagram ? 1 : 0.32, cursor: siteContent.socialLinks?.instagram ? "pointer" : "default" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: isMobile ? 6 : 8, alignItems: "center" }}>
            {/* USER */}
            {loggedUser ? (
              <button onClick={onOpenCustomer || onOpenLogin}
                style={{ color: G, fontSize: isMobile ? 10 : 11, background: G + "15", border: `1px solid ${G}44`, padding: isMobile ? "4px" : "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", letterSpacing: 1, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 7, boxShadow: `0 2px 8px ${G}22` }}>
                <div style={{ width: isMobile ? 30 : 26, height: isMobile ? 30 : 26, borderRadius: "50%", background: G + "33", border: `1px solid ${G}55`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                  {loggedUser.avatar ? <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : loggedUser.name?.[0]?.toUpperCase()}
                </div>
                {!isMobile && <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loggedUser.displayName || loggedUser.name}</span>}
              </button>
            ) : (
              isMobile ? (
                /* Mobile: icon button */
                <button onClick={onOpenLogin}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
              ) : (
                <button onClick={onOpenLogin}
                  style={{ color: MUT, fontSize: 10, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.08)`, padding: "7px 14px", borderRadius: 6, cursor: "pointer", letterSpacing: 2, transition: "all .2s", fontFamily: "system-ui,sans-serif", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = TXT; e.currentTarget.style.borderColor = `${G}55`; e.currentTarget.style.background = `${G}10`; }}
                  onMouseLeave={e => { e.currentTarget.style.color = MUT; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>ĐĂNG NHẬP</button>
              )
            )}

            {/* 3D CTA BUTTON */}
            <button className="btn-3d" onClick={onBook} style={{ fontSize: isMobile ? 10 : undefined, padding: isMobile ? "0 14px" : undefined, letterSpacing: isMobile ? 2 : undefined }}>THUÊ NGAY</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ height: "100vh", position: "relative", overflow: "hidden", userSelect: "none" }}>

        {/* ── Camera specs top-right ── */}
        {!isMobile && <div style={{ position: "absolute", top: 100, right: 48, textAlign: "right", zIndex: 4 }}>
          {["4K", "24FPS", "WB 5600K"].map(t => (
            <div key={t} style={{ fontSize: 11, letterSpacing: 3, color: "#5a5550", fontFamily: "system-ui,sans-serif", lineHeight: 2 }}>{t}</div>
          ))}
        </div>}

        {/* ── Battery top-right bottom ── */}
        {!isMobile && <div style={{ position: "absolute", bottom: 56, right: 48, display: "flex", alignItems: "center", gap: 8, zIndex: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#4a4540", fontFamily: "system-ui,sans-serif" }}>87%</div>
          <div style={{ position: "relative", width: 28, height: 13, border: `1px solid #4a4540`, borderRadius: 3 }}>
            <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 3, height: 7, background: "#4a4540", borderRadius: "0 1px 1px 0" }} />
            <div style={{ margin: 2, height: "calc(100% - 4px)", width: "87%", background: "#5a6a4a", borderRadius: 1 }} />
          </div>
        </div>}

        {/* ── Camera specs bottom-left ── */}
        <div style={{ position: "absolute", bottom: isMobile ? 100 : 56, left: isMobile ? 20 : 48, zIndex: 4 }}>
          {["ISO 400", "F 1.8", "1/50"].map(t => (
            <div key={t} style={{ fontSize: 11, letterSpacing: 2, color: "#4a4540", fontFamily: "system-ui,sans-serif", lineHeight: 1.9 }}>{t}</div>
          ))}
        </div>

        {/* ── Hero content — left-aligned ── */}
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: isMobile ? 20 : 60, zIndex: 4, maxWidth: isMobile ? "90%" : 520 }}>

          {/* Label */}
          <div style={{ fontSize: 9.5, letterSpacing: 5, color: G, fontFamily: "system-ui,sans-serif", marginBottom: 18, opacity: 1, textShadow: `0 0 12px ${G}66` }}>
            DỊCH VỤ CHO THUÊ MÁY ẢNH NÚI THÀNH · TAM KỲ
          </div>

          {/* Logo dùng component chuẩn */}
          <Logo size={isMobile ? 1.6 : 2.4} />

          {/* Tagline 2 dòng */}
          <div style={{ marginTop: 20, marginBottom: 32 }}>
            <div style={{ fontSize: isMobile ? 14 : 18, letterSpacing: isMobile ? 2 : 3, color: "#c0b8a8", fontFamily: 'var(--font-display)', fontStyle: "italic", fontWeight: 300, lineHeight: 2, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>Trải nghiệm máy ảnh</div>
            <div style={{ fontSize: isMobile ? 14 : 18, letterSpacing: isMobile ? 2 : 3, color: "#c0b8a8", fontFamily: 'var(--font-display)', fontStyle: "italic", fontWeight: 300, lineHeight: 2, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>Bắt giữ khoảnh khắc</div>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button onClick={onBook} className="btn-3d" style={{ padding: "11px 28px", borderRadius: 3, fontSize: 11, letterSpacing: 3 }}>THUÊ NGAY</button>
            <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${BR}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="12" viewBox="0 0 10 12" fill={TXT}><polygon points="0,0 10,6 0,12"/></svg>
              </div>
              <span style={{ fontSize: 11, letterSpacing: 3, color: TXT, fontFamily: "system-ui,sans-serif" }}>XEM GIỚI THIỆU</span>
            </button>
          </div>
        </div>

        {/* ── Shooting stars ── */}
        <div style={{ position: "absolute", top: "8%", right: "18%", width: 120, height: 1.5, background: `linear-gradient(to left, ${G}cc, ${G}44, transparent)`, borderRadius: 2, animation: "shootA 5.5s ease-in 0s infinite", boxShadow: `0 0 6px ${G}88` }} />
        <div style={{ position: "absolute", top: "14%", right: "32%", width: 80, height: 1, background: `linear-gradient(to left, ${G}99, transparent)`, borderRadius: 2, animation: "shootB 7s ease-in 1.8s infinite" }} />
        <div style={{ position: "absolute", top: "6%", right: "8%", width: 55, height: 1, background: `linear-gradient(to left, #c8703388, transparent)`, borderRadius: 2, animation: "shootC 9s ease-in 3.2s infinite" }} />

      </div>

      {/* Scroll cue */}
      <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 5, animation: "floatY 2.2s ease-in-out infinite" }}>
        <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom,transparent,${G}88)` }} />
        <div style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: 3, fontFamily: "system-ui,sans-serif" }}>SCROLL</div>
      </div>

      {/* CUSTOMER PHOTO FEED */}
      <FeedbackMarquee photos={photos || []} feedbacks={feedbacks || []} isMobile={isMobile} />

      {/* CAMERAS — Featured Carousel */}
      <CameraFeatured id="cameras" cameras={cameras} onBook={onBook} isMobile={isMobile} />

      {/* ACCESSORIES */}
      <div id="accessories" style={{ padding: isMobile ? "40px 16px 72px" : "60px 60px 100px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 14, fontFamily: "system-ui,sans-serif" }}>PHỤ KIỆN</div>
          <h2 style={{ fontSize: 34, fontWeight: 400, letterSpacing: 2, margin: 0 }}>Bổ Sung Trang Thiết Bị</h2>
          <div style={{ width: 40, height: 1, background: G, margin: "18px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 16 }}>
          {accessories.map(a => (
            <div key={a.id} style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 8, padding: "16px 18px", textAlign: "center", transition: "all .2s", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = G + "55"; e.currentTarget.style.background = "#110f00"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BR; e.currentTarget.style.background = CARD; }}>
              <div style={{ color: TXT, fontWeight: 500, marginBottom: 6, fontSize: 13, fontFamily: '"Times New Roman",Georgia,serif' }}>{a.name}</div>
              <div style={{ color: G, fontWeight: 700, fontSize: 14, fontFamily: '"Times New Roman",Georgia,serif' }}>{fmtVND(a.price)}<span style={{ color: MUT, fontSize: 10, fontFamily: '"Times New Roman",Georgia,serif' }}>/ngày</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: `1px solid ${BR}`, borderBottom: `1px solid ${BR}`, padding: isMobile ? "44px 16px" : "72px 60px", textAlign: "center", background: "#0a0800", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: `radial-gradient(circle,${G}08,transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>ĐẶT THUÊ NGAY HÔM NAY</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, letterSpacing: 2, margin: "0 0 10px" }}>Không cần đăng ký tài khoản</h2>
          <p style={{ color: MUT, fontSize: 14, marginBottom: 32, letterSpacing: 1 }}>Chọn máy → Chọn ngày → Chốt Zalo. Đơn giản vậy thôi.</p>
          <button onClick={onBook} className="btn-3d" style={{ padding: "16px 56px", borderRadius: 2, fontSize: 13, letterSpacing: 3 }}>BẮT ĐẦU ĐẶT THUÊ</button>
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}><div style={{ display: "inline-flex", border: `1px solid ${BR}`, borderRadius: 6, overflow: "hidden", background: "rgba(6,6,6,0.55)", backdropFilter: "blur(12px)" }}>
            <div style={{ padding: "11px 28px", display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: G, fontFamily: "system-ui,sans-serif", fontWeight: 700, lineHeight: 1.4 }}>THỦ TỤC</div>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: TXT, fontFamily: "system-ui,sans-serif", fontWeight: 600, lineHeight: 1.4 }}>NHANH GỌN</div>
              </div>
            </div>
            <div style={{ width: 1, background: BR, margin: "10px 0" }} />
            <div style={{ padding: "11px 28px", display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: G, fontFamily: "system-ui,sans-serif", fontWeight: 700, lineHeight: 1.4 }}>HỖ TRỢ</div>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: TXT, fontFamily: "system-ui,sans-serif", fontWeight: 600, lineHeight: 1.4 }}>24 / 7</div>
              </div>
            </div>
          </div></div>
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" style={{ padding: isMobile ? "56px 16px 72px" : "80px 60px 100px", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>VỀ CHÚNG TÔI</div>
        <h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 400, letterSpacing: 2, marginBottom: 28, fontFamily: '"Times New Roman",Georgia,serif' }}>92 KA MÊ RA</h2>
        <p style={{ color: MUT, fontSize: isMobile ? 13 : 15, lineHeight: 2, maxWidth: 680, margin: "0 auto 64px" }}>{siteContent.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill,minmax(130px,1fr))" : "repeat(3,1fr)", gap: isMobile ? 14 : 40, marginTop: 48 }}>
          {siteContent.stats.map(([e, n, l]) => (
            <div key={n} style={{ padding: "28px 20px", border: `1px solid ${BR}`, borderRadius: 10, background: CARD }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{e}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: G, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>{n}</div>
              <div style={{ fontSize: 11, color: MUT, letterSpacing: 2, fontFamily: "system-ui,sans-serif" }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BR}`, padding: isMobile ? "20px 16px" : "28px 60px", display: "flex", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 16 }}>
        <Logo size={0.7} />
        <div style={{ color: "#999", fontSize: 12, fontFamily: "system-ui,sans-serif", letterSpacing: 1, display: "grid", gridTemplateColumns: "auto auto 1fr", gap: "2px 4px" }}>
          <span>Hotline</span><span>:</span><span>{siteContent.zalo}</span>
          <span>Địa chỉ</span><span>:</span><span>{siteContent.address}</span>
        </div>
        <div style={{ color: "#666", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>© 2026 92 KA MÊ RA/abc2z</div>
      </footer>

      {/* QR góc phải — hover để phóng to */}
      <style>{`
        .qr-corner{ position:fixed; bottom:20px; right:20px; z-index:999; cursor:pointer; }
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
        .qr-corner:hover .qr-label{ color:#c9a84c; }
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
                storageSet("k92_users_v1", updated);
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

  const tabBtn = (k, label) => (
    <button onClick={() => setTab(k)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? G : "transparent"}`, color: tab === k ? G : MUT, fontWeight: tab === k ? 700 : 400, fontSize: 13, cursor: "pointer", fontFamily: "system-ui,sans-serif", transition: "all .2s" }}>{label}</button>
  );

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.97)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 16, padding: "36px 40px 40px", width: "min(420px,94vw)", textAlign: "center", boxShadow: "0 0 80px rgba(201,168,76,0.08)", transform: shake ? "translateX(-5px)" : "none", transition: "transform .1s", maxHeight: "92vh", overflowY: "auto" }}>

        <Logo size={0.88} />

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BR}`, margin: "28px -40px 0", padding: "0 40px" }}>
          {tabBtn("customer", "👤 Khách hàng")}
          {tabBtn("admin", "🔐 Quản trị")}
        </div>

        {/* ── Tab khách hàng ── */}
        {tab === "customer" && (
          <div style={{ marginTop: 24, textAlign: "left" }}>

            {/* Chưa đăng nhập — hiện Google button */}
            {!loggedUser && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                <div style={{ color: TXT, fontSize: 16, fontWeight: 600, fontFamily: "var(--font-display)", letterSpacing: 0.5, marginBottom: 6 }}>Đăng nhập để đặt máy</div>
                <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", lineHeight: 1.7, marginBottom: 28 }}>
                  Theo dõi đơn thuê · Gửi đánh giá<br />Không cần tạo tài khoản riêng
                </div>

                {/* Google button container */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  {gsiErr ? (
                    <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui,sans-serif", padding: "12px 0" }}>
                      ❌ Không tải được Google Sign-In.<br />
                      <span style={{ color: MUT, fontSize: 11 }}>Kiểm tra kết nối mạng và thử lại.</span>
                    </div>
                  ) : !gsiReady ? (
                    <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", padding: "12px 0" }}>
                      ⏳ Đang tải Google Sign-In...
                    </div>
                  ) : (
                    <div ref={googleBtnRef} style={{ minHeight: 44 }} />
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 16px" }}>
                  <div style={{ flex: 1, height: 1, background: BR }} />
                  <span style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "system-ui,sans-serif" }}>BẢO MẬT BỞI GOOGLE</span>
                  <div style={{ flex: 1, height: 1, background: BR }} />
                </div>
                <div style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
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
                  <div style={{ width: 76, height: 76, borderRadius: "50%", background: G + "22", border: `2px solid ${G}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, overflow: "hidden", margin: "0 auto 10px" }}>
                    {(loggedUser.picture || loggedUser.avatar)
                      ? <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                      : <span>{loggedUser.name?.[0]?.toUpperCase() || "👤"}</span>}
                  </div>
                  <div style={{ color: G, fontWeight: 700, fontSize: 16 }}>{loggedUser.displayName || loggedUser.name}</div>
                  <div style={{ color: MUT, fontSize: 12, marginTop: 2 }}>✉️ {loggedUser.email}</div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "#0e0e0e", border: `1px solid ${BR}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: G, fontWeight: 800, fontSize: 22 }}>{myOrders.length}</div>
                    <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>Tổng đơn</div>
                  </div>
                  <div style={{ background: "#0e0e0e", border: `1px solid ${BR}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: G, fontWeight: 800, fontSize: 13, lineHeight: 1.6 }}>{fmtVND(totalSpent)}</div>
                    <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>Đã chi</div>
                  </div>
                </div>

                {/* Completed orders with feedback CTA */}
                {completedOrders.length > 0 && (
                  <div style={{ background: "#0a0900", border: `1px solid ${G}33`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: G, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 10, fontWeight: 700 }}>
                      ⭐ ĐƠN CÓ THỂ ĐÁNH GIÁ ({completedOrders.length})
                    </div>
                    {completedOrders.slice(0, 3).map(o => (
                      <div key={o.id} style={{ background: "#111", border: `1px solid ${BR}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: G, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</div>
                          <div style={{ color: TXT, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>📷 {o.cameraName}</div>
                        </div>
                        {setPage && (
                          <button onClick={() => { setPage("customer"); onBack(); }}
                            style={{ flexShrink: 0, padding: "6px 14px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>
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
                  <button onClick={() => { setPage("customer"); onBack(); }} style={{ width: "100%", padding: "11px 0", background: G + "15", border: `1px solid ${G}44`, color: G, borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span>👤</span> Mở trang cá nhân đầy đủ →
                  </button>
                )}

                {/* All orders list */}
                {myOrders.length > 0 ? (
                  <div style={{ maxHeight: 180, overflowY: "auto" }}>
                    <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>TẤT CẢ ĐƠN</div>
                    {myOrders.map(o => (
                      <div key={o.id} style={{ background: "#0e0e0e", border: `1px solid ${BR}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</span>
                          <Badge status={o.status} />
                        </div>
                        <div style={{ color: TXT, fontSize: 12, marginTop: 4 }}>{o.cameraName}</div>
                        <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>{o.days} ngày · {fmtVND(o.total)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có đơn thuê nào</div>
                )}

                <button onClick={() => {
                  setLoggedUser(null);
                  try { window.google?.accounts?.id?.disableAutoSelect(); } catch {}
                }} style={{ width: "100%", padding: 10, background: "none", color: MUT, border: `1px solid ${BR}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginTop: 10 }}>Đăng xuất Google</button>
              </div>
            );
            })()}
          </div>
        )}

        {/* ── Tab quản trị ── */}
        {tab === "admin" && (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ color: TXT, fontWeight: 400, marginBottom: 6, fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 1 }}>Quản trị viên</h3>
            <p style={{ color: MUT, fontSize: 12, marginBottom: 20, letterSpacing: .5, fontFamily: "system-ui,sans-serif" }}>Nhập mật khẩu để truy cập dashboard</p>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && checkAdmin()} placeholder="••••••••" style={{ width: "100%", padding: "13px 16px", background: "#111", border: `2px solid ${err ? "#ef4444" : BR}`, borderRadius: 8, color: TXT, fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "monospace", letterSpacing: 3, textAlign: "center", transition: "border .2s" }} />
            {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>❌ Sai mật khẩu. Thử lại!</p>}
            <button onClick={checkAdmin} style={{ width: "100%", padding: 13, background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginTop: 4, boxShadow: `0 0 20px ${G}44` }}>Đăng nhập</button>
            <p style={{ color: "#2a2a2a", fontSize: 10, marginTop: 20, fontFamily: "monospace" }}>Demo password: admin92</p>
          </div>
        )}

        <button onClick={onBack} style={{ width: "100%", padding: 10, background: "none", color: MUT, border: `1px solid ${BR}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginTop: 16 }}>← Về trang chủ</button>
      </div>
    </div>
    </>
  );
}

// ── ADMIN DASHBOARD ──
function AdminDashboard({ cameras, setCameras, accessories, setAccessories, orders, setOrders, siteContent, setSiteContent, photos, setPhotos, feedbacks, setFeedbacks, users, setUsers, discounts, setDiscounts, onBack, isMobile }) {
  const [tab, setTab] = useState("overview");
  const [editCam, setEditCam] = useState(null);
  const [addCamOpen, setAddCamOpen] = useState(false);
  const [nc, setNc] = useState({ name: "", price: "", desc: "", qty: 1, status: "available", icon: "📷", images: [] });
  const [editAcc, setEditAcc] = useState(null);
  const [addAcc, setAddAcc] = useState(false);
  const [na, setNa] = useState({ name: "", price: "" });
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
  const [discForm, setDiscForm] = useState({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true });
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
          const prevIds = new Set(prev.map(o => o.id));
          const newOnes = data.filter(o => !prevIds.has(o.id) && !deletedOrderIdsRef.current.has(o.id));
          count = newOnes.length;
          if (count === 0) return prev;
          setNewOrderIds(ids => new Set([...ids, ...newOnes.map(o => o.id)]));
          return [...newOnes.map(o => ({ ...o, seen: false })), ...prev];
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
        input:focus,textarea:focus,select:focus{border-color:#c9a84c55!important;outline:none;}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes newOrderIn{0%{background:#c9a84c18;box-shadow:0 0 0 2px #c9a84c88}60%{background:#c9a84c08;box-shadow:0 0 0 1px #c9a84c33}100%{background:transparent;box-shadow:none}}
        .new-order-flash{animation:newOrderIn 2.8s ease forwards}
      `}</style>

      {/* ADMIN HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.55)", backdropFilter: "blur(32px) saturate(160%)", WebkitBackdropFilter: "blur(32px) saturate(160%)", borderBottom: `1px solid rgba(42,42,42,0.6)`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background .3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, overflowX: "auto", padding: "0 0 0 0", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div style={{ marginRight: 16, flexShrink: 0 }}><Logo size={0.65} /></div>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ position: "relative", padding: "16px 4px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: tab === t.k ? G : MUT, fontFamily: "system-ui,sans-serif", fontWeight: tab === t.k ? 700 : 400, borderBottom: `2px solid ${tab === t.k ? G : "transparent"}`, whiteSpace: "nowrap", transition: "all .2s" }}>
              {t.l}
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: 8, right: -10, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, animation: "pulseIn .3s ease" }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${BR}`, color: MUT, padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, flexShrink: 0, marginLeft: 20 }}>← Web</button>
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
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 10, padding: "20px 18px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ color: MUT, fontSize: 11, marginTop: 5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 20 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>Doanh thu theo tháng</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={REV_DATA} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="m" tick={{ fill: MUT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: MUT, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(1) + "M"} />
                    <Tooltip contentStyle={{ background: "#111", border: `1px solid ${BR}`, borderRadius: 6, color: TXT, fontSize: 12 }} formatter={v => [fmtVND(v), "Doanh thu"]} />
                    <Bar dataKey="v" fill={G} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 18, flex: 1 }}>
                  <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>MÁY HOT NHẤT</div>
                  {hotCam.name ? (
                    <div>
                      <div style={{ fontSize: 30, marginBottom: 6 }}>{hotCam.icon || "📷"}</div>
                      <div style={{ color: G, fontWeight: 700, fontSize: 14 }}>{hotCam.name}</div>
                      <div style={{ color: MUT, fontSize: 11, marginTop: 4 }}>{hotCam.cnt} đơn đã thuê</div>
                    </div>
                  ) : <div style={{ color: MUT, fontSize: 12 }}>Chưa có dữ liệu</div>}
                </div>
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 18, flex: 1 }}>
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
            <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 20 }}>
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
              <div style={{ background: "#0a0900", border: `1px solid ${G}44`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
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
                <div key={c.id} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {/* Thumbnail */}
                    <div style={{ flexShrink: 0, width: 70, height: 70, borderRadius: 8, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, border: `1px solid ${BR2}` }}>
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
        {tab === "accessories" && (
          <div>
            <STitle c={`Phụ kiện (${accessories.length})`} extra={
              <button onClick={() => setAddAcc(true)} style={btn("gold")}>+ Thêm phụ kiện</button>
            } />
            {addAcc && (
              <div style={{ background: CARD2, border: `1px solid ${G}44`, borderRadius: 9, padding: 18, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TÊN</div><input style={inp2} value={na.name} onChange={e => setNa(p => ({ ...p, name: e.target.value }))} placeholder="Tên phụ kiện" /></div>
                  <div><div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/NGÀY</div><input style={inp2} type="number" value={na.price} onChange={e => setNa(p => ({ ...p, price: e.target.value }))} placeholder="50000" /></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { if (na.name && na.price) { setAccessories(p => [...p, { id: Date.now(), name: na.name, price: parseInt(na.price) }]); setNa({ name: "", price: "" }); setAddAcc(false); } }} style={btn("gold")}>✓ Lưu</button>
                  <button onClick={() => setAddAcc(false)} style={btn("ghost")}>Huỷ</button>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 9 }}>
              {accessories.map(a => (
                <div key={a.id} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 8, padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  {editAcc?.id === a.id ? (
                    <div style={{ display: "flex", gap: 7, flex: 1 }}>
                      <input style={{ ...inp2, flex: 1 }} value={editAcc.name} onChange={e => setEditAcc(p => ({ ...p, name: e.target.value }))} />
                      <input style={{ ...inp2, width: 90 }} type="number" value={editAcc.price} onChange={e => setEditAcc(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
                      <button onClick={() => saveAcc(a, editAcc)} style={{ ...btn("gold"), padding: "7px 10px" }}>✓</button>
                      <button onClick={() => setEditAcc(null)} style={{ ...btn("ghost"), padding: "7px 9px" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div style={{ color: TXT, fontWeight: 500, fontSize: 13 }}>{a.name}</div>
                        <div style={{ color: G, fontSize: 12, marginTop: 3, fontWeight: 700 }}>{fmtVND(a.price)}/ngày</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setEditAcc({ ...a })} style={{ ...btn("ghost"), padding: "6px 9px" }}>✏️</button>
                        <button onClick={() => setAccessories(p => p.filter(x => x.id !== a.id))} style={{ ...btn("danger"), padding: "6px 9px" }}>🗑</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div>
            <STitle c={`Đơn thuê (${orders.length})`} />

            {/* New orders alert */}
            {orders.filter(o => !o.seen).length > 0 && (
              <div style={{ background: "#0a0410", border: "1px solid #a78bfa44", borderRadius: 9, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>Có {orders.filter(o => !o.seen).length} đơn mới chưa xem!</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên, mã đơn, máy..." style={{ ...inp2, width: 280 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["all", "pending", "confirmed", "active", "completed", "cancelled"].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    style={{ padding: "8px 12px", background: orderFilter === s ? "#130f00" : "#0e0e0e", color: orderFilter === s ? G : MUT, border: `1px solid ${orderFilter === s ? G : BR2}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: orderFilter === s ? 700 : 400, transition: "all .2s" }}>
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
                <div key={o.id} className={newOrderIds.has(o.id) ? "new-order-flash" : ""} style={{ background: CARD2, border: `1px solid ${!o.seen ? "#60a5fa33" : BR2}`, borderRadius: 10, overflow: "hidden" }}>
                  {/* Order header */}
                  <div onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                    style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <span style={{ color: !o.seen ? "#60a5fa" : TXT, fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>{o.id}</span>
                        {!o.seen && <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>MỚI</span>}
                        <Badge status={o.status} />
                      </div>
                      <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>{o.date} · {o.name} · 📞 {o.phone}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: G, fontSize: 18, fontWeight: 800 }}>{fmtVND(o.total)}</div>
                      <div style={{ color: MUT, fontSize: 11 }}>{o.days} ngày</div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedOrder === o.id && (
                    <div style={{ borderTop: `1px solid ${BR2}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <span style={{ padding: "3px 10px", background: "#111", border: `1px solid ${BR2}`, borderRadius: 99, color: TXT, fontSize: 11 }}>📷 {o.cameraName}</span>
                        {o.accessories.map(a => <span key={a} style={{ padding: "3px 10px", background: "#111", border: `1px solid ${BR2}`, borderRadius: 99, color: MUT, fontSize: 11 }}>{a}</span>)}
                      </div>
                      {o.address && <div style={{ color: MUT, fontSize: 11, marginBottom: 6 }}>📍 {o.address}</div>}
                      {o.note && <div style={{ color: MUT, fontSize: 11, marginBottom: 12, fontStyle: "italic" }}>💬 {o.note}</div>}
                      {o.discountCode && (
                        <div style={{ color: "#22c55e", fontSize: 11, marginBottom: 8, background: "#021a0a", border: "1px solid #22c55e22", borderRadius: 6, padding: "6px 12px" }}>
                          🏷️ Mã giảm giá: <strong>{o.discountCode}</strong> — Giảm {fmtVND(o.discountAmt || 0)} · Tổng gốc: {fmtVND(o.subtotal || o.total)}
                        </div>
                      )}
                      <div style={{ borderTop: `1px solid ${BR2}`, paddingTop: 12 }}>
                        <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ĐỔI TRẠNG THÁI:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(ORDER_STATUSES).map(([s, l]) => (
                            <button key={s} onClick={() => {
                              setOrders(p => p.map(x => x.id === o.id ? { ...x, status: s } : x));
                              // Tăng usedCount khi đơn chuyển sang "completed" và có mã giảm giá
                              if (s === "completed" && o.status !== "completed" && o.discountCode) {
                                setDiscounts(prev => prev.map(d => d.code === o.discountCode ? { ...d, usedCount: (d.usedCount || 0) + 1 } : d));
                              }
                            }}
                              style={{ padding: "6px 12px", background: o.status === s ? "#130f00" : "#0e0e0e", color: o.status === s ? G : MUT, border: `1px solid ${o.status === s ? G + "55" : BR2}`, borderRadius: 99, cursor: "pointer", fontSize: 11, fontWeight: o.status === s ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <DeleteOrderBtn orderId={o.id} onDelete={() => { deletedOrderIdsRef.current.add(o.id); setOrders(p => p.filter(x => x.id !== o.id)); setExpandedOrder(null); }} />
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
                <div style={{ background: CARD, border: `1px solid ${f.status === "approved" ? "#22c55e33" : f.status === "rejected" ? "#ef444433" : BR}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: G, fontSize: 14 }}>{"★".repeat(f.rating)}<span style={{ color: "#2a2a2a" }}>{"★".repeat(5 - f.rating)}</span></span>
                        {f.hidden && <span style={{ background: "#44444422", color: "#888", borderRadius: 99, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>HIDDEN</span>}
                      </div>
                      <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{f.userName}</div>
                      <div style={{ color: MUT, fontSize: 11 }}>📞 {f.phone} · 📷 {f.cameraName}</div>
                      <div style={{ color: MUT, fontSize: 10, marginTop: 2 }}>Đơn: {f.orderId} · {f.date}</div>
                    </div>
                  </div>
                  {f.text && <div style={{ color: TXT, fontSize: 12, lineHeight: 1.6, marginBottom: 12, background: "#111", padding: "8px 10px", borderRadius: 6, fontStyle: "italic" }}>"{f.text}"</div>}
                  {f.images?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      {f.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: `1px solid ${BR}` }} loading="lazy" />)}
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
                              <button onClick={() => approveFb(f.id)} style={{ flex: 1, padding: "8px 0", background: "#052210", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✓ Duyệt</button>
                              <button onClick={() => rejectFb(f.id)} style={{ flex: 1, padding: "8px 0", background: "#160505", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✕ Từ chối</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "8px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
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
                              <button onClick={() => toggleHide(f.id)} style={{ flex: 1, padding: "7px 0", background: f.hidden ? "#052210" : "#1a1a00", border: `1px solid ${f.hidden ? "#22c55e44" : G + "44"}`, color: f.hidden ? "#22c55e" : G, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                                {f.hidden ? "👁 Hiện lại" : "🙈 Ẩn"}
                              </button>
                              <button onClick={() => rejectFb(f.id)} style={{ flex: 1, padding: "7px 0", background: "#160505", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Gỡ</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
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
                              <button onClick={() => approveFb(f.id)} style={{ flex: 1, padding: "7px 0", background: "#052210", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Duyệt lại</button>
                              <button onClick={() => deleteFb(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
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
                    <div key={phone} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: "16px 20px" }}>
                      {/* Header: tên + stats + nút */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                            {badge && <span style={{ background: badge.col + "22", color: badge.col, border: `1px solid ${badge.col}44`, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{badge.icon} {badge.label}</span>}
                          </div>
                          <div style={{ color: MUT, fontSize: 11 }}>📞 {phone}</div>
                          {/* Hiện mật khẩu để admin nhắn Zalo */}
                          <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, background: "#0e0e00", border: `1px solid ${G}22`, borderRadius: 6, padding: "4px 10px" }}>
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
                              <div style={{ color: s.col, fontWeight: 700, fontSize: s.small ? 11 : 16 }}>{s.v}</div>
                              <div style={{ color: MUT, fontSize: 9, marginTop: 2 }}>{s.l}</div>
                            </div>
                          ))}
                          <button onClick={() => { setResetTarget(phone === resetTarget ? null : phone); setResetPwVal(""); setResetPwMsg(null); }}
                            style={{ padding: "5px 12px", background: resetTarget === phone ? "#0a1a0a" : "#160b0b", border: `1px solid ${resetTarget === phone ? "#22c55e44" : "#ef444430"}`, color: resetTarget === phone ? "#22c55e" : "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
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
                              style={{ padding: "9px 16px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>
                              Lưu
                            </button>
                          </div>
                          {resetPwMsg && <div style={{ marginTop: 8, fontSize: 12, fontFamily: "system-ui,sans-serif", color: resetPwMsg.type === "ok" ? "#22c55e" : "#ef4444", background: resetPwMsg.type === "ok" ? "#0a1a0a" : "#160505", border: `1px solid ${resetPwMsg.type === "ok" ? "#22c55e33" : "#ef444433"}`, borderRadius: 6, padding: "8px 12px" }}>{resetPwMsg.text}</div>}
                        </div>
                      )}
                      {/* Đơn gần đây */}
                      {userOrders.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BR2}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {userOrders.slice(0, 4).map(o => (
                            <span key={o.id} style={{ fontSize: 10, color: MUT, background: "#111", border: `1px solid ${BR2}`, borderRadius: 99, padding: "2px 10px", fontFamily: "monospace" }}>
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
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.col}30`, borderRadius: 10, padding: "22px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 38, fontWeight: 800, color: s.col }}>{s.c}</div>
                  <div style={{ color: MUT, fontSize: 12, marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, overflow: "hidden", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr", background: "#090909", borderBottom: `1px solid ${BR2}` }}>
                {["Ảnh", "Tên máy", "SL tổng", "Đang thuê", "Rảnh", "Trạng thái"].map(h => <div key={h} style={{ padding: "10px 12px", color: MUT, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{h.toUpperCase()}</div>)}
              </div>
              {cameras.map((c, i) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 1fr", borderBottom: i < cameras.length - 1 ? `1px solid ${BR2}` : "none", alignItems: "center" }}>
                  <div style={{ padding: "10px 12px" }}>
                    {c.images?.length > 0
                      ? <img src={c.images[0]} alt={c.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, border: `1px solid ${BR2}` }} />
                      : <div style={{ width: 36, height: 36, background: "#111", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>}
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
              <div style={{ background: "#022", border: "1px solid #22c55e44", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
                ✓ Đã lưu! Nội dung đã cập nhật ra website ngay lập tức.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 22 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>📌 Thông tin liên hệ & Slogan</div>
                {[
                  { k: "zalo", l: "Số Zalo / Hotline" },
                  { k: "phone", l: "Số điện thoại" },
                  { k: "address", l: "Địa chỉ" },
                  { k: "slogan", l: "Slogan header (dòng nhỏ trên logo)" },
                  { k: "tagline", l: "Tagline (dòng nghiêng dưới logo)" },
                  { k: "desc", l: "Mô tả về chúng tôi (trang About)" },
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
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 22, marginBottom: 14 }}>
                  <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔗 Link mạng xã hội (4 logo đầu trang)</div>
                  <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>Dán link vào ô tương ứng. Logo nào có link sẽ sáng lên và click được. Để trống = mờ, không click.</div>
                  {[
                    { k: "youtube", label: "YouTube", icon: "▶", ph: "https://youtube.com/@kenh-cua-ban" },
                    { k: "facebook", label: "Facebook", icon: "f", ph: "https://facebook.com/page-cua-ban" },
                    { k: "tiktok", label: "TikTok", icon: "♪", ph: "https://tiktok.com/@tenban" },
                    { k: "instagram", label: "Instagram", icon: "◎", ph: "https://instagram.com/tenban" },
                  ].map(({ k, label, icon, ph }) => (
                    <div key={k} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: siteContent.socialLinks?.[k] ? `${G}22` : "#111", border: `1px solid ${siteContent.socialLinks?.[k] ? G + "55" : BR2}`, display: "flex", alignItems: "center", justifyContent: "center", color: siteContent.socialLinks?.[k] ? G : MUT, fontSize: 12, flexShrink: 0, fontWeight: 700 }}>{icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>{label.toUpperCase()}</div>
                        <input
                          style={{ ...inp2, fontSize: 11 }}
                          value={siteContent.socialLinks?.[k] || ""}
                          placeholder={ph}
                          onChange={e => setSiteContent(p => ({ ...p, socialLinks: { ...(p.socialLinks || {}), [k]: e.target.value } }))}
                        />
                      </div>
                    </div>
                  ))}
                  <button onClick={saveSiteContent} style={{ ...btn("gold") }}>
                    {saved ? "✓ Đã lưu!" : "💾 Lưu link mạng xã hội"}
                  </button>
                </div>

                {/* ZALO CONFIG */}
                <div style={{ background: CARD2, border: `1px solid #06c75530`, borderRadius: 10, padding: 22, marginBottom: 14 }}>
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
                        <div style={{ background: "#fff", borderRadius: 8, padding: 8, flexShrink: 0 }}>
                          <img src={siteContent.zaloQR} alt="QR" style={{ width: 100, height: 100, objectFit: "contain", display: "block" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#22c55e", fontSize: 12, marginBottom: 10 }}>✓ Đã có QR · Khách sẽ thấy sau khi đặt đơn</div>
                          <button onClick={() => setSiteContent(p => ({ ...p, zaloQR: "" }))} style={{ ...btn("danger"), fontSize: 11 }}>🗑 Xoá QR</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "block", border: `2px dashed ${G}44`, borderRadius: 8, padding: "18px 0", textAlign: "center", cursor: "pointer", background: "#0a0900", color: MUT, fontSize: 12 }}>
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
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 22, marginBottom: 14 }}>
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

                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 22 }}>
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
              createdAt: editDiscId ? (discList.find(d => d.id === editDiscId)?.createdAt || todayStr()) : todayStr(),
            };
            if (editDiscId) {
              setDiscounts(prev => prev.map(d => d.id === editDiscId ? newDisc : d));
            } else {
              setDiscounts(prev => [newDisc, ...prev]);
            }
            setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true });
            setEditDiscId(null);
            setDiscMsg({ type: "ok", text: editDiscId ? "✓ Đã cập nhật mã giảm giá" : "✓ Đã tạo mã giảm giá mới" });
            setTimeout(() => setDiscMsg(null), 2500);
          };
          const startEdit = (d) => {
            setEditDiscId(d.id);
            setDiscForm({ code: d.code, type: d.type, value: String(d.value), minOrder: d.minOrder ? String(d.minOrder) : "", maxUse: d.maxUse ? String(d.maxUse) : "", active: d.active });
            setDiscMsg(null);
          };
          const deleteDisc = (id) => setDiscounts(prev => prev.filter(d => d.id !== id));
          const toggleActive = (id) => setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));

          return (
            <div>
              <STitle c="Mã giảm giá" />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginBottom: 24 }}>
                {/* Form tạo/sửa */}
                <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 20 }}>
                  <div style={{ color: TXT, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
                    {editDiscId ? "✏️ Chỉnh sửa mã" : "➕ Tạo mã mới"}
                  </div>
                  {discMsg && (
                    <div style={{ background: discMsg.type === "ok" ? "#022" : "#160505", border: `1px solid ${discMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`, borderRadius: 7, padding: "10px 14px", marginBottom: 12, color: discMsg.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 12 }}>{discMsg.text}</div>
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
                          style={{ flex: 1, padding: "9px 0", background: discForm.type === v ? "#130f00" : "#0e0e0e", color: discForm.type === v ? G : MUT, border: `1px solid ${discForm.type === v ? G : BR2}`, borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: discForm.type === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setDiscForm(p => ({ ...p, active: !p.active }))}
                      style={{ width: 36, height: 20, borderRadius: 10, background: discForm.active ? "#22c55e" : "#333", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: discForm.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                    </button>
                    <span style={{ color: discForm.active ? "#22c55e" : MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{discForm.active ? "Đang hoạt động" : "Tắt mã"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveDisc} style={{ ...btn("gold"), flex: 1 }}>{editDiscId ? "💾 Lưu thay đổi" : "➕ Tạo mã"}</button>
                    {editDiscId && <button onClick={() => { setEditDiscId(null); setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true }); setDiscMsg(null); }} style={{ ...btn("ghost") }}>Huỷ</button>}
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
                  <div style={{ background: "#0a0900", border: `1px solid ${G}22`, borderRadius: 9, padding: "12px 16px" }}>
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
                  <div key={d.id} style={{ background: CARD2, border: `1px solid ${d.active ? G + "33" : BR2}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ color: G, fontWeight: 800, fontSize: 16, fontFamily: "monospace", letterSpacing: 2 }}>{d.code}</span>
                        <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: d.active ? "#022" : "#1a1a1a", color: d.active ? "#22c55e" : MUT, border: `1px solid ${d.active ? "#22c55e44" : BR2}` }}>{d.active ? "ĐANG BẬT" : "TẮT"}</span>
                        <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, background: "#130f00", color: G, border: `1px solid ${G}44` }}>
                          {d.type === "percent" ? `Giảm ${d.value}%` : `Giảm ${fmtVND(d.value)}`}
                        </span>
                      </div>
                      <div style={{ color: MUT, fontSize: 11, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {d.minOrder > 0 && <span>Đơn tối thiểu: <span style={{ color: TXT }}>{fmtVND(d.minOrder)}</span></span>}
                        <span>Đã dùng: <span style={{ color: d.maxUse && d.usedCount >= d.maxUse ? "#ef4444" : "#60a5fa" }}>{d.usedCount || 0}{d.maxUse ? `/${d.maxUse}` : ""} lượt</span></span>
                        <span>Tạo: {d.createdAt}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(d.id)}
                        style={{ padding: "6px 12px", background: d.active ? "#160505" : "#021a0a", color: d.active ? "#ef4444" : "#22c55e", border: `1px solid ${d.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                        {d.active ? "Tắt" : "Bật"}
                      </button>
                      <button onClick={() => startEdit(d)} style={{ padding: "6px 12px", background: "#111", color: TXT, border: `1px solid ${BR2}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>✏️</button>
                      <button onClick={() => { if (window.confirm("Xoá mã " + d.code + "?")) deleteDisc(d.id); }} style={{ padding: "6px 12px", background: "#160505", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>🗑</button>
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
              <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, padding: 24 }}>
                <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔑 Đổi mật khẩu Admin</div>
                <div style={{ color: MUT, fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>Mật khẩu được lưu riêng, chỉ có hiệu lực trên thiết bị này.</div>
                {pwMsg && (
                  <div style={{ background: pwMsg.type === "ok" ? "#022" : "#160505", border: `1px solid ${pwMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`, borderRadius: 8, padding: "11px 14px", marginBottom: 16, color: pwMsg.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 13 }}>
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
  const debounceMs = key === STORE_KEYS.cameras || key === "cameras_img" ? 5000 : 2000;
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
      <div style={{ minHeight: "100vh", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: "#c9a84c", fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>92 KA MÊ RA</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>Đã xảy ra lỗi giao diện.<br />Vui lòng tải lại trang.</div>
          <div style={{ color: "#333", fontSize: 11, fontFamily: "monospace", background: "#111", border: "1px solid #222", borderRadius: 6, padding: "10px 14px", marginBottom: 20, textAlign: "left", wordBreak: "break-all" }}>
            {this.state.err?.message || String(this.state.err)}
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 28px", background: "#c9a84c", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
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
      ctx.fillStyle = "#060606";
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
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=in, 1=hold, 2=out
  const isMob = useMobile();
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const logoSize = isMob ? 1.45 : 2.2;
  const lineW    = isMob ? 120  : 180;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#060606",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: phase === 2 ? 0 : 1,
      transition: phase === 2 ? "opacity 0.6s ease-in" : "none",
      pointerEvents: "none",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: isMob ? 300 : 500, height: isMob ? 200 : 300,
        background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Top line — draws in */}
      <div style={{
        width: phase >= 1 ? lineW : 0,
        height: 1,
        background: "linear-gradient(to right, transparent, #c9a84c88, transparent)",
        marginBottom: isMob ? 22 : 32,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
      }} />

      {/* Logo */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(18px) scale(0.92)",
        transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(.2,.8,.3,1)",
        maxWidth: "90vw", overflow: "hidden",
      }}>
        <Logo size={logoSize} />
      </div>

      {/* Red dot pulse */}
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "radial-gradient(circle at 36% 30%, #ff5555, #bb0000)",
        boxShadow: "0 0 10px rgba(190,0,0,0.9), 0 0 24px rgba(190,0,0,0.4)",
        marginTop: isMob ? 12 : 16,
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 0.5s ease 0.4s",
        animation: phase >= 1 ? "splashDot 1.4s ease-in-out infinite" : "none",
      }} />

      {/* Tagline */}
      <div style={{
        color: "#555",
        fontSize: isMob ? 9 : 10,
        letterSpacing: isMob ? 3 : 5,
        fontFamily: "system-ui,sans-serif",
        textTransform: "uppercase",
        marginTop: isMob ? 16 : 22,
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 0.7s ease 0.6s",
        textAlign: "center",
        padding: "0 16px",
      }}>Dịch vụ cho thuê máy ảnh</div>

      {/* Bottom line */}
      <div style={{
        width: phase >= 1 ? lineW : 0,
        height: 1,
        background: "linear-gradient(to right, transparent, #c9a84c55, transparent)",
        marginTop: isMob ? 20 : 28,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1) 0.2s",
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

  // ── Wrapped setters: update state AND persist to storage ──
  // ── Wrapped setters: update React state first, persist to storage via setTimeout (outside render) ──
  const setCameras = useCallback((updater) => {
    _setCameras(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== prev) setTimeout(() => saveCamerasToStorage(next).catch(e => console.warn("setCameras err", e)), 0);
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
      if (accs) _setAccessories(accs);
      if (site) _setSiteContent(site);
      if (disc) _setDiscounts(disc);
      if (ords) {
        for (const o of ords) {
          const m = o.id?.match(/#92K(\d+)/);
          if (m) _orderNum = Math.max(_orderNum, parseInt(m[1]) + 1);
        }
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

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Logo size={1.2} />
        <div style={{ color: MUT, fontSize: 12, marginTop: 20, letterSpacing: 3, fontFamily: "system-ui,sans-serif" }}>ĐANG TẢI...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, position: "relative" }}>
      <FlowBg />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        :root { --font-display: 'Cormorant Garamond', Georgia, serif; }
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;scroll-padding-top:72px;}
        body{background:#060606;overflow-x:hidden;} canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#060606}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        @keyframes floatY{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-9px)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes shootA{0%{opacity:0;transform:translate(0,0) rotate(-42deg)}4%{opacity:.9}80%{opacity:.5}100%{opacity:0;transform:translate(-520px,520px) rotate(-42deg)}}
        @keyframes shootB{0%{opacity:0;transform:translate(0,0) rotate(-38deg)}4%{opacity:.7}75%{opacity:.3}100%{opacity:0;transform:translate(-340px,340px) rotate(-38deg)}}
        @keyframes shootC{0%{opacity:0;transform:translate(0,0) rotate(-50deg)}4%{opacity:.6}70%{opacity:.2}100%{opacity:0;transform:translate(-260px,260px) rotate(-50deg)}}
        @keyframes twinkle{0%,100%{opacity:.12}50%{opacity:.45}}
        @keyframes splashDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.6}}
        @keyframes logoRipple{0%{transform:translate(-50%,-50%) scale(0);opacity:0.8}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
        @keyframes pageWash{0%{opacity:0}35%{opacity:1}100%{opacity:1}}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        input:focus,textarea:focus,select:focus{border-color:#c9a84c55!important;outline:none;}

        /* ── NAV 3D STYLES ── */
        .nav92{
          transition: padding .45s cubic-bezier(.4,0,.2,1);
          will-change: padding;
        }
        .nav-inner{
          background: linear-gradient(180deg, rgba(14,13,11,0.55) 0%, rgba(8,7,6,0.52) 100%);
          border: 1px solid rgba(201,168,76,0.22);
          border-radius: 12px;
          box-shadow:
            0 2px 0 rgba(201,168,76,0.10),
            0 8px 40px rgba(0,0,0,0.55),
            0 1px 0 rgba(255,255,255,0.06) inset,
            0 -1px 0 rgba(0,0,0,0.4) inset;
          transform: perspective(900px) rotateX(1deg);
          transform-origin: top center;
          backdrop-filter: blur(32px) saturate(160%);
          -webkit-backdrop-filter: blur(32px) saturate(160%);
          transition: height .4s cubic-bezier(.4,0,.2,1),
                      padding .4s cubic-bezier(.4,0,.2,1),
                      opacity .4s ease,
                      border-radius .4s ease,
                      transform .4s cubic-bezier(.4,0,.2,1),
                      box-shadow .4s ease,
                      background .4s ease;
          overflow: hidden;
        }
        .nav-inner.scrolled{
          background: linear-gradient(180deg, rgba(10,9,8,0.72) 0%, rgba(6,6,6,0.68) 100%);
          border-radius: 0 0 12px 12px;
          transform: perspective(900px) rotateX(0deg);
          box-shadow:
            0 4px 0 rgba(201,168,76,0.09),
            0 12px 48px rgba(0,0,0,0.65),
            0 1px 0 rgba(255,255,255,0.05) inset;
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
        }
        .nav-inner.compact{
          background: linear-gradient(180deg, rgba(8,7,6,0.62) 0%, rgba(5,4,4,0.58) 100%);
          border-top: none;
          border-left: none;
          border-right: none;
          border-radius: 0;
          box-shadow: 0 2px 16px rgba(0,0,0,0.5);
          opacity: 0.82;
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
        }
        .nav-link{
          position: relative;
          color: #666;
          font-size: 10px;
          background: none;
          border: none;
          cursor: pointer;
          letter-spacing: 2.5px;
          padding: 6px 2px;
          font-family: system-ui,sans-serif;
          transition: color .2s;
        }
        .nav-link::after{
          content:'';
          position: absolute;
          bottom: 0; left: 50%; right: 50%;
          height: 1px;
          background: #c9a84c;
          transition: left .25s, right .25s;
        }
        .nav-link:hover{ color: #f0e8d0; }
        .nav-link:hover::after{ left: 0; right: 0; }

        /* 3D gold CTA button */
        @keyframes glassShimmer{0%{left:-100%}100%{left:220%}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 16px rgba(201,168,76,0.35),0 0 32px rgba(201,168,76,0.15),0 4px 20px rgba(0,0,0,0.5)}50%{box-shadow:0 0 24px rgba(201,168,76,0.55),0 0 48px rgba(201,168,76,0.25),0 4px 20px rgba(0,0,0,0.5)}}
        .btn-3d{
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg,rgba(255,228,110,0.13) 0%,rgba(201,168,76,0.07) 50%,rgba(180,140,40,0.12) 100%);
          color: #f0d878;
          border: 1px solid rgba(201,168,76,0.6);
          padding: 10px 22px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 3px;
          font-family: system-ui,sans-serif;
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            0 1px 0 rgba(255,235,120,0.25) inset,
            0 -1px 0 rgba(0,0,0,0.3) inset,
            0 0 18px rgba(201,168,76,0.35),
            0 0 36px rgba(201,168,76,0.12),
            0 4px 20px rgba(0,0,0,0.5);
          transform: translateY(0) perspective(400px) rotateX(0deg);
          transition: transform .15s, box-shadow .15s, background .15s, color .15s, border-color .15s;
          animation: glowPulse 3s ease-in-out infinite;
          text-shadow: 0 0 12px rgba(255,220,80,0.6);
        }
        .btn-3d::before{
          content:'';
          position:absolute;
          top:0;left:-100%;
          width:55%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,235,120,0.22),transparent);
          animation:glassShimmer 3.5s ease-in-out infinite;
          pointer-events:none;
        }
        .btn-3d::after{
          content:'';
          position:absolute;
          top:0;left:0;right:0;
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,240,140,0.5),transparent);
          pointer-events:none;
        }
        .btn-3d:hover{
          background: linear-gradient(135deg,rgba(255,228,110,0.22) 0%,rgba(201,168,76,0.13) 50%,rgba(180,140,40,0.2) 100%);
          border-color: rgba(255,210,70,0.85);
          color: #fff8c0;
          transform: translateY(-2px) perspective(400px) rotateX(2deg);
          box-shadow:
            0 1px 0 rgba(255,235,120,0.35) inset,
            0 -1px 0 rgba(0,0,0,0.3) inset,
            0 0 28px rgba(201,168,76,0.6),
            0 0 56px rgba(201,168,76,0.22),
            0 8px 28px rgba(0,0,0,0.5);
          text-shadow: 0 0 18px rgba(255,220,80,0.9);
          animation: none;
        }
        .btn-3d:active{
          transform: translateY(2px) perspective(400px) rotateX(-1deg);
          box-shadow:
            0 0 10px rgba(201,168,76,0.25),
            0 2px 10px rgba(0,0,0,0.4);
          animation: none;
        }

        /* Social icon buttons */
        .nav-social{
          width: 30px; height: 30px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #555;
          transition: all .2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset;
        }
        .nav-social:hover{
          background: rgba(201,168,76,0.12);
          border-color: rgba(201,168,76,0.3);
          color: #c9a84c;
          box-shadow: 0 3px 8px rgba(201,168,76,0.2), 0 1px 0 rgba(255,255,255,0.06) inset;
          transform: translateY(-1px);
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
        .nav-div{ width:1px; height:20px; background: rgba(255,255,255,0.08); flex-shrink:0; }

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
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
}
