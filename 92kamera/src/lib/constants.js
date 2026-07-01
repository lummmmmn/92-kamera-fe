// ── DESIGN TOKENS ──
export const G    = "#0D1B2A";
export const BG   = "#8fc8d4";
export const CARD = "#C5D8EC";
export const BR   = "#8BAECF";
export const TXT  = "#05111F";
export const MUT  = "#4A6A8A";
export const RED  = "#C0290A";
export const CARD2 = "#B5CEEA";
export const BR2   = "#7A9FBF";

// ── BASE STYLES ──
export const inp2 = {
  padding: "9px 13px",
  background: CARD,
  border: `1px solid ${BR2}`,
  borderRadius: 10,
  color: TXT,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "system-ui,sans-serif",
};

export const btn = (variant = "gold") => ({
  padding: "9px 18px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  fontFamily: "system-ui,sans-serif",
  ...(variant === "gold"
    ? { background: G, color: "#E8F0F8" }
    : variant === "ghost"
    ? { background: CARD, color: TXT, border: `1px solid ${BR2}` }
    : { background: "#FEF0F0", color: "#C0290A", border: "1px solid #C0290A30" }),
});

// ── STATUS CONFIG ──
export const STATUS_CFG = {
  available:   { label: "Còn máy",       color: "#22c55e" },
  rented:      { label: "Đang thuê",     color: "#f59e0b" },
  unavailable: { label: "Hết máy",       color: "#ef4444" },
  pending:     { label: "Đang nhận đơn", color: "#60a5fa" },
  confirmed:   { label: "Đã xác nhận",   color: "#a78bfa" },
  active:      { label: "Đang thuê",     color: "#f59e0b" },
  completed:   { label: "Hoàn thành",    color: "#0e7490" },
  cancelled:   { label: "Đã huỷ",        color: "#6b7280" },
};

export const ORDER_STATUSES = {
  pending:   "Đang nhận đơn",
  confirmed: "Đã xác nhận",
  active:    "Đang thuê",
  completed: "Hoàn thành",
  cancelled: "Huỷ đơn",
};

// ── FIREBASE CONFIG ──
export const FB_CONFIG = {
  apiKey:            "AIzaSyCwsR5eFqeV7hEBNwPi5Jl76fyceCC40TQ",
  authDomain:        "kamera-a88d1.firebaseapp.com",
  projectId:         "kamera-a88d1",
  storageBucket:     "kamera-a88d1.firebasestorage.app",
  messagingSenderId: "960787597336",
  appId:             "1:960787597336:web:32b80b9fc0150cf12f9b6d",
  measurementId:     "G-D8R7YTY42S",
};
export const FB_KV_COLLECTION      = "kv_store";
export const FB_GALLERY_COLLECTION = "gallery_photos";
export const FB_ADMIN_UID          = "Zgqk4QDXStU92JUjeqVBwSAGOOy1";
export const FB_ADMIN_EMAIL        = "admin@92kamera.com";
export const FB_ADMIN_FIREBASE_PW  = "92kamera@zxc";

// ── STORE KEYS ──
export const STORE_KEYS = {
  cameras:      "k92_cameras_v2",
  accessories:  "k92_accessories_v2",
  orders:       "k92_orders_v2",
  site:         "k92_site_v2",
  feedbacks:    "k92_feedbacks_v1",
  users:        "k92_users_v1",
  discounts:    "k92_discounts_v1",
  albums:       "k92_albums_v1",
  deliveryFees: "k92_delivery_fees_v1",
};

// ── CLOUDINARY CONFIG ──
export const CLOUD_NAME     = "dgre5eh7l";
export const UPLOAD_PRESET  = "92kamerafeedback";
export const CLOUDINARY_TAG = "92kamera";

// ── GOOGLE OAUTH ──
export const GOOGLE_CLIENT_ID =
  "338403275162-fa55lm8g53eu1h6ursqpd714ce1qre8m.apps.googleusercontent.com";

// ── ADMIN ──
export const ADMIN_PW_DEFAULT_HASH =
  "db08beaae1b06ae2e84f101f8e37a8c03e16eb8e514ec8c2274b5d89aa2f9d22";

// ── DURATIONS (giữ lại cho các nơi khác còn dùng - quick-select cũ, v.v.) ──
export const DURATIONS = [
  { label: "🌅 Ca Sáng",  days: 0.5, session: "morning"   },
  { label: "🌇 Ca Chiều", days: 0.5, session: "afternoon" },
  { label: "☀️ Cả ngày",  days: 1,   session: "full"      },
  { label: "3 ngày",      days: 3,   session: "full"      },
  { label: "7 ngày",      days: 7,   session: "full"      },
  { label: "1 tháng",     days: 30,  session: "full"      },
];

export const SHIFTS = [
  { key: "morning",   label: "🌅 Ca Sáng",  time: "6:00 – 12:00",  session: "morning"   },
  { key: "afternoon", label: "🌇 Ca Chiều", time: "14:00 – 20:00", session: "afternoon" },
];

// ── CA MODEL MỚI: 3 CA/NGÀY, ĐỘC LẬP (07:00–20:00) ──
export const CA_SHIFTS = [
  { key: "ca1", idx: 1, label: "Ca 1 — Sáng", short: "Ca 1", time: "07:00–12:00", startH: 7,  endH: 12, color: "#22c55e" },
  { key: "ca2", idx: 2, label: "Ca 2 — Trưa", short: "Ca 2", time: "12:00–17:00", startH: 12, endH: 17, color: "#3b82f6" },
  { key: "ca3", idx: 3, label: "Ca 3 — Tối",  short: "Ca 3", time: "17:00–20:00", startH: 17, endH: 20, color: "#f59e0b" },
];

export const PICKUP_HOUR_PRESETS = [7, 8, 10, 12, 14, 17, 19];
export const RETURN_HOUR_PRESETS = [12, 17, 20];
export const DAY_COUNT_PRESETS = [1, 2, 3, 7];

// ── INITIAL / FALLBACK DATA ──
export const CAMS_INIT = [
  { id: 1, name: "Fujifilm X-T20",   price: 200000, status: "available", desc: "Màu sắc tự nhiên, phong cách retro cổ điển",   qty: 2, icon: "📷", images: [] },
  { id: 2, name: "Sony ZV-E10",      price: 180000, status: "available", desc: "Màn lật 180°, quay vlog chuyên nghiệp",         qty: 1, icon: "🎥", images: [] },
  { id: 3, name: "DJI Pocket 3",     price: 300000, status: "rented",    desc: "Gimbal tích hợp, chống rung xuất sắc",          qty: 1, icon: "🎬", images: [] },
  { id: 4, name: "Canon EOS M50 II", price: 220000, status: "available", desc: "Eye-AF tốc độ cao, video 4K",                   qty: 2, icon: "📸", images: [] },
  { id: 5, name: "GoPro Hero 12",    price: 250000, status: "available", desc: "Chống nước 10m, quay 5.3K siêu nét",            qty: 3, icon: "🏄", images: [] },
  { id: 6, name: "Nikon Z30",        price: 230000, status: "available", desc: "Không gương lật, video 4K 60fps",               qty: 1, icon: "🌅", images: [] },
];

export const ACC_INIT = [
  { id: 1, name: "Tripod 3 chân",   price: 50000,  priceShift: 35000, qty: 2, active: true, desc: "Dùng được cho mọi loại máy ảnh",     image: "" },
  { id: 2, name: "Mic thu âm",      price: 80000,  priceShift: 50000, qty: 2, active: true, desc: "Cổng 3.5mm, thu âm rõ nét",           image: "" },
  { id: 3, name: "Pin dự phòng",    price: 30000,  priceShift: 20000, qty: 4, active: true, desc: "Pin lithium, dùng được hầu hết máy",  image: "" },
  { id: 4, name: "Lens 50mm f/1.8", price: 150000, priceShift: null,  qty: 1, active: true, desc: "Phù hợp Canon M-mount",               image: "" },
  { id: 5, name: "ND Filter set",   price: 40000,  priceShift: 25000, qty: 2, active: true, desc: "Bộ 3 filter: ND4, ND8, ND16",         image: "" },
  { id: 6, name: "Túi đựng máy",    price: 30000,  priceShift: 20000, qty: 3, active: true, desc: "Có lớp đệm bảo vệ, đeo vai",         image: "" },
  { id: 7, name: "Thẻ nhớ 128GB",   price: 20000,  priceShift: 15000, qty: 5, active: true, desc: "Class 10, tốc độ ghi 100MB/s",        image: "" },
];

export const ORDERS_INIT = [
  { id: "#92K0001", cameraName: "Fujifilm X-T20", cameraId: 1, accessories: ["Tripod 3 chân"], accessoriesDetail: [{ name: "Tripod 3 chân", qty: 1 }], days: 3, total: 650000, name: "Nguyễn Văn An", phone: "0901234567", zalo: "0901234567", address: "123 Trần Phú, Đà Nẵng", note: "", status: "completed", date: "2026-04-15", seen: true },
  { id: "#92K0002", cameraName: "Sony ZV-E10",    cameraId: 2, accessories: [], accessoriesDetail: [], days: 7, total: 1260000, name: "Trần Thị Bình", phone: "0912345678", zalo: "0912345678", address: "45 Lê Lợi, Hội An", note: "Cần thêm pin", status: "completed", date: "2026-04-10", seen: true },
  { id: "#92K0003", cameraName: "GoPro Hero 12",  cameraId: 5, accessories: ["Mic thu âm", "Pin dự phòng"], accessoriesDetail: [{ name: "Mic thu âm", qty: 1 }, { name: "Pin dự phòng", qty: 1 }], days: 1, total: 360000, name: "Lê Văn Cường", phone: "0923456789", zalo: "0923456789", address: "78 Nguyễn Huệ, Tam Kỳ", note: "", status: "completed", date: "2026-04-20", seen: true },
];

export const SITE_INIT = {
  zalo: "0855 471 202",
  address: "Thôn Thạnh Mỹ, xã Tam Mỹ, thành phố Đà Nẵng",
  tagline: "Trải nghiệm máy ảnh · Bắt giữ khoảnh khắc",
  desc: "Chúng tôi cung cấp dịch vụ cho thuê máy ảnh khu vực Núi Thành - Tam Kỳ.",
  phone: "0855 471 202",
  slogan: "Dịch vụ cho thuê máy ảnh · Núi Thành - Tam Kỳ",
  stats: [
    ["📸", "50+",  "Lượt thuê / tháng"],
    ["🎬", "10+",  "Loại thiết bị"],
    ["⭐", "98%",  "Khách hài lòng"],
  ],
  zaloLink: "",
  zaloQR: "",
  cornerQR: "",
  socialLinks: { youtube: "", facebook: "", tiktok: "", instagram: "" },
  secretText: "",
};

export const DELIVERY_AREAS_DEFAULT = [
  { name: "Tam Mỹ Tây",         fee: 0 },
  { name: "Tam Mỹ Đông",        fee: 20000 },
  { name: "Tam Xuân 1",         fee: 20000 },
  { name: "Tam Xuân 2",         fee: 40000 },
  { name: "Thị trấn Núi Thành", fee: 40000 },
  { name: "Tam Hiệp",           fee: 40000 },
  { name: "Tam Nghĩa",          fee: 40000 },
  { name: "Tam Anh Bắc",        fee: 40000 },
  { name: "Tam Anh Nam",        fee: 40000 },
  { name: "Tam Hải",            fee: 40000 },
  { name: "Tam Hòa",            fee: 60000 },
  { name: "Tam Quang",          fee: 60000 },
  { name: "Tam Giang",          fee: 60000 },
  { name: "Tam Tiến",           fee: 60000 },
  { name: "Tam Thạnh",          fee: 60000 },
  { name: "Tam Ngọc",           fee: 80000 },
  { name: "Tam Phú",            fee: 80000 },
  { name: "Tam Thăng",          fee: 80000 },
  { name: "Tam Sơn",            fee: 100000 },
  { name: "Tam Thanh",          fee: 100000 },
  { name: "An Mỹ",              fee: 100000 },
  { name: "An Phú",             fee: 100000 },
  { name: "An Sơn",             fee: 100000 },
  { name: "An Xuân",            fee: 100000 },
  { name: "Hòa Hương",          fee: 100000 },
  { name: "Hòa Thuận",          fee: 100000 },
  { name: "Tân Thạnh",          fee: 100000 },
  { name: "Trường Xuân",        fee: 100000 },
  { name: "Tam Trà",            fee: 100000 },
];

// ── STATIC DATA ──
export const STATIC_DATA_URL = "/data.json";
