import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import * as THREE from "three";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

// ── HELPERS ──
let _orderNum = 4;
let _camIdNum = 100;
const newOrderId = () => `#92K${String(_orderNum++).padStart(4, "0")}`;
const newCamId = () => _camIdNum++;
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " ₫";
const todayStr = () => new Date().toISOString().split("T")[0];

const G = "#c9a84c", BG = "#060606", CARD = "#0d0d0d", BR = "#1d1d1d", TXT = "#f0e8d0", MUT = "#666", RED = "#cc3333";
const CARD2 = "#0d0d0d", BR2 = "#1a1a1a";

// ── GOOGLE OAUTH ──
const GOOGLE_CLIENT_ID = "338403275162-fa55lm8g53eu1h6ursqpd714ce1qre8m.apps.googleusercontent.com";
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
const SITE_INIT = { zalo: "0855 471 202", address: "Xã Tam Mỹ - Thành Phố Đà Nẵng", tagline: "Trải nghiệm máy ảnh · Bắt giữ khoảnh khắc", desc: "Chúng tôi cung cấp dịch vụ cho thuê máy ảnh khu vực Núi Thành - Tam Kỳ.", phone: "0855 471 202", slogan: "Dịch vụ cho thuê máy ảnh · Núi Thành - Tam Kỳ", stats: [["📸", "50+", "Lượt thuê / tháng"], ["🎬", "10+", "Loại thiết bị"], ["⭐", "98%", "Khách hài lòng"]], zaloLink: "", zaloQR: "" };
const DURATIONS = [{ label: "1 ngày", days: 1 }, { label: "3 ngày", days: 3 }, { label: "7 ngày", days: 7 }, { label: "1 tháng", days: 30 }];
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
  const bw = 1.5;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", fontFamily: '"Times New Roman",Georgia,serif', color: col, userSelect: "none" }}>
      <span style={{ display: "inline-block", width: s(11), height: s(32), borderLeft: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, marginRight: s(9), flexShrink: 0 }} />
      <span style={{ fontSize: s(20), fontWeight: 400, letterSpacing: s(1.5), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
        <span>92</span>
        <span style={{ marginLeft: s(10) }}>KA</span>
        <span style={{ marginLeft: s(10) }}>MÊ</span>
        <span style={{ marginLeft: s(10) }}>RA</span>
        <span style={{ display: "inline-block", width: s(7), height: s(7), borderRadius: "50%", background: "radial-gradient(circle at 36% 30%, #ff5555 0%, #bb0000 55%, #6a0000 100%)", boxShadow: `0 0 ${s(5)}px rgba(190,0,0,0.75), inset 0 ${s(1)}px 0 rgba(255,170,170,0.4)`, marginLeft: s(3), flexShrink: 0, position: "relative", top: s(-6) }} />
      </span>
      <span style={{ display: "inline-block", width: s(11), height: s(32), borderRight: `${bw}px solid ${col}`, borderTop: `${bw}px solid ${col}`, borderBottom: `${bw}px solid ${col}`, marginLeft: s(9), flexShrink: 0 }} />
    </div>
  );
}

// ── IMAGE COMPRESS HELPER ──
function compressImage(file, maxW = 600, quality = 0.65) {
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
function ImageUploader({ images = [], onChange, max = 5 }) {
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
function CameraScene() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const W = el.clientWidth || window.innerWidth, H = el.clientHeight || window.innerHeight;
    const isMob = window.innerWidth < 768;
    const SEG = isMob ? 28 : 56; // Geometry segments: half on mobile for better performance
    const renderer = new THREE.WebGLRenderer({ antialias: !isMob, alpha: true, powerPreference: "low-power" });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMob ? 1 : 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();

    // Camera closer → camera body fills more of the hero like reference
    const cam3d = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    cam3d.position.set(0, 0.6, 4.0);
    cam3d.lookAt(0, 0.2, 0);

    scene.fog = new THREE.FogExp2(0x000000, 0.028);

    // ── Lighting (cinematic warm + dramatic like reference) ──
    scene.add(new THREE.AmbientLight(0x0a0806, 1));

    // Warm amber key — upper-left (the dominant warm glow in reference)
    const kl = new THREE.DirectionalLight(0xc8721a, 3.8); kl.position.set(-4, 6, 3); scene.add(kl);

    // Back-light — warm orange from behind camera body (creates the halo glow)
    const backL = new THREE.PointLight(0xb85c08, 5, 14); backL.position.set(0, 2.5, -5); scene.add(backL);

    // Animated warm fill — top-left sweeping light
    const swingL = new THREE.PointLight(0xc9a84c, 3.5, 16); swingL.position.set(-5, 3, 1); scene.add(swingL);

    // Cool blue rim from right (separation light)
    const rimL = new THREE.DirectionalLight(0x0d2040, 1.4); rimL.position.set(6, 0, -3); scene.add(rimL);

    // Red accent — pulsing (for the recording dot atmosphere)
    const redL = new THREE.PointLight(0xcc2200, 2.8, 9); redL.position.set(2.5, -0.5, 3.5); scene.add(redL);

    // Platform/floor up-light — subtle gold from below
    const floorL = new THREE.PointLight(0xc9a84c, 1.8, 7); floorL.position.set(0, -4, 0.5); scene.add(floorL);

    // ── Materials ──
    const mBody  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.10, metalness: 0.98 });
    const mDark  = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.14, metalness: 0.95 });
    const mMid   = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.22, metalness: 0.92 });
    const mGold  = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.06, metalness: 1.0 });
    const mGlass = new THREE.MeshStandardMaterial({ color: 0x020510, roughness: 0.0, metalness: 0.12, transparent: true, opacity: 0.96 });
    const mGlassDeep = new THREE.MeshStandardMaterial({ color: 0x04080e, roughness: 0.02, metalness: 0.08, transparent: true, opacity: 0.99 });
    const mRed   = new THREE.MeshStandardMaterial({ color: 0xdd1100, roughness: 0.2, metalness: 0.5, emissive: 0xcc0000, emissiveIntensity: 1.4 });
    const mGrip  = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.99, metalness: 0.01 });
    const mSilv  = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.10, metalness: 0.98 });
    const mPlat  = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.04, metalness: 0.85 });
    const mRingD = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.08, metalness: 0.94 });

    const GRP = new THREE.Group(); scene.add(GRP);
    // Scale up significantly so camera fills the hero background like reference
    GRP.scale.set(1.55, 1.55, 1.55);
    GRP.position.set(0, 0.25, 0);

    // ── Camera Body ──
    GRP.add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.05, 1.55), mBody));

    // Top viewfinder hump
    const hump = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.58, 1.35), mMid);
    hump.position.set(-0.52, 1.32, 0); GRP.add(hump);

    // Grip (right)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.82, 0.52), mGrip);
    grip.position.set(1.32, -0.05, -0.1); GRP.add(grip);
    // Grip ridges
    for (let i = 0; i < 9; i++) {
      const gr = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.04, 0.5), mDark);
      gr.position.set(1.32, -0.68 + i * 0.17, -0.1); GRP.add(gr);
    }

    // Strap lugs both sides
    [-1.52, 1.52].forEach(x => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.36), mMid);
      l.position.set(x, 0.62, 0); GRP.add(l);
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 6, 12), mGold);
      hole.position.set(x, 0.62, 0); hole.rotation.z = Math.PI / 2; GRP.add(hole);
    });

    // ── Lens System — multi-stage like reference ──
    // Mounting plate (large base disk)
    const mountPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, SEG), mMid);
    mountPlate.rotation.x = Math.PI / 2; mountPlate.position.set(0, 0, 0.82); GRP.add(mountPlate);

    // Outer chrome mounting ring
    const mountRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.055, 8, SEG + 16), mSilv);
    mountRing.position.set(0, 0, 0.86); GRP.add(mountRing);

    // Stage 1 — focus/zoom barrel (outermost, widest)
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.75, SEG), mDark);
    b1.rotation.x = Math.PI / 2; b1.position.set(0, 0, 1.22); GRP.add(b1);
    // Knurled focus ring on stage 1
    const focusRingGeo = new THREE.CylinderGeometry(0.94, 0.94, 0.28, SEG);
    const focusMesh = new THREE.Mesh(focusRingGeo, mRingD);
    focusMesh.rotation.x = Math.PI / 2; focusMesh.position.set(0, 0, 1.05); GRP.add(focusMesh);
    for (let i = 0; i < (isMob ? 22 : 44); i++) {
      const a = (i / (isMob ? 22 : 44)) * Math.PI * 2;
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.29, 0.016), mMid);
      tk.position.set(Math.cos(a) * 0.94, Math.sin(a) * 0.94, 1.05); tk.rotation.z = a; GRP.add(tk);
    }
    // Gold line ring after stage 1
    const gl1 = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.022, 6, SEG + 16), mGold);
    gl1.position.set(0, 0, 1.28); GRP.add(gl1);

    // Stage 2 — aperture barrel
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.58, SEG), mDark);
    b2.rotation.x = Math.PI / 2; b2.position.set(0, 0, 1.55); GRP.add(b2);
    const gl2r = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.018, 6, SEG + 16), mGold);
    gl2r.position.set(0, 0, 1.58); GRP.add(gl2r);
    const sr1 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.016, 6, SEG + 16), mSilv);
    sr1.position.set(0, 0, 1.76); GRP.add(sr1);

    // Stage 3 — inner barrel
    const b3 = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.44, SEG), mDark);
    b3.rotation.x = Math.PI / 2; b3.position.set(0, 0, 1.80); GRP.add(b3);
    const gl3 = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.016, 6, SEG + 16), mGold);
    gl3.position.set(0, 0, 1.83); GRP.add(gl3);

    // Stage 4 — front element housing
    const b4 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.30, SEG), mDark);
    b4.rotation.x = Math.PI / 2; b4.position.set(0, 0, 2.00); GRP.add(b4);

    // Front lens glass (large dark circle)
    const frontGlass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 72), mGlass);
    frontGlass.position.set(0, 0, 2.16); GRP.add(frontGlass);

    // Lens internal reflection rings
    [0.32, 0.21, 0.12].forEach((r, i) => {
      const lrm = new THREE.Mesh(new THREE.TorusGeometry(r, 0.010 - i * 0.002, 6, 72),
        new THREE.MeshStandardMaterial({ color: 0x404040 + i * 0x080808, roughness: 0.06, metalness: 0.94 }));
      lrm.position.set(0, 0, 2.17); GRP.add(lrm);
    });

    // Deep center glass
    const glDeep = new THREE.Mesh(new THREE.CircleGeometry(0.10, 48), mGlassDeep);
    glDeep.position.set(0, 0, 2.18); GRP.add(glDeep);

    // ── Top Controls ──
    const dial1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 22), mMid);
    dial1.position.set(-0.88, 1.07, 0.3); GRP.add(dial1);
    const dial2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 18), mMid);
    dial2.position.set(-0.28, 1.07, 0.3); GRP.add(dial2);
    const shutBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 18), mSilv);
    shutBase.position.set(0.9, 1.07, 0.42); GRP.add(shutBase);
    const shutBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 18), mGold);
    shutBtn.position.set(0.9, 1.12, 0.42); GRP.add(shutBtn);

    // Red record dot (emissive glow)
    const rd = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 16), mRed);
    rd.position.set(1.32, 0.80, -0.58); GRP.add(rd);

    // ── Platform / Pedestal (like reference — dark stage under camera) ──
    const platGRP = new THREE.Group(); scene.add(platGRP);

    // Main platform top surface
    const platTop = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.16, 3.6), mPlat);
    platTop.position.set(0, -2.02, 0); platGRP.add(platTop);
    // Gold rim edge on platform
    const platRim = new THREE.Mesh(new THREE.BoxGeometry(6.04, 0.022, 3.64), mGold);
    platRim.position.set(0, -1.94, 0); platGRP.add(platRim);
    // Mid tier
    const platMid = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.10, 3.0), mPlat);
    platMid.position.set(0, -2.20, 0); platGRP.add(platMid);

    // Reflective floor plane
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(16, 10),
      new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.03, metalness: 0.88, transparent: true, opacity: 0.55 }));
    refl.rotation.x = -Math.PI / 2; refl.position.set(0, -2.32, 0); platGRP.add(refl);

    // ── Particles ──
    const N = isMob ? 120 : 300; const pPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pPos[i * 3]     = (Math.random() - .5) * 28;
      pPos[i * 3 + 1] = (Math.random() - .5) * 22;
      pPos[i * 3 + 2] = (Math.random() - .5) * 16;
    }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.055, transparent: true, opacity: 0.38 }));
    scene.add(pts);

    let mx = 0, my = 0, t = 0, raf;
    const onMM = (e) => { mx = (e.clientX / W - .5) * 2; my = -(e.clientY / H - .5) * 2; };
    window.addEventListener("mousemove", onMM, { passive: true });
    const tick = () => {
      raf = requestAnimationFrame(tick); t += 0.008;
      // Slower, stately rotation — mouse follow + gentle auto-spin
      GRP.rotation.y += (mx * 0.38 - GRP.rotation.y) * 0.026;
      GRP.rotation.x += (my * 0.10 - GRP.rotation.x) * 0.026;
      GRP.rotation.y += 0.0022;
      // Gentle float
      GRP.position.y = 0.25 + Math.sin(t) * 0.09;
      // Animated warm swing light
      swingL.position.x = Math.cos(t * 0.35) * 5 - 1.5;
      swingL.position.y = Math.sin(t * 0.28) * 2 + 3;
      // Pulsing red dot atmosphere
      redL.intensity = 2.4 + Math.sin(t * 2.2) * 0.6;
      pts.rotation.y += 0.00055;
      renderer.render(scene, cam3d);
    };
    tick();
    const onR = () => { const w = window.innerWidth, h = window.innerHeight; cam3d.aspect = w / h; cam3d.updateProjectionMatrix(); renderer.setSize(w, h); };
    window.addEventListener("resize", onR, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMM); window.removeEventListener("resize", onR); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ── MOBILE BACKGROUND (replaces heavy 3D scene) ──
function MobileBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#060606", overflow: "hidden" }}>
      {/* Radial gold glow center */}
      <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)", width: 340, height: 340, background: "radial-gradient(circle, #c9a84c0d 0%, transparent 70%)", borderRadius: "50%" }} />
      {/* Warm amber top-left glow */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: 280, height: 280, background: "radial-gradient(circle, #c8721a0a 0%, transparent 65%)", borderRadius: "50%" }} />
      {/* Red dot glow bottom-right */}
      <div style={{ position: "absolute", bottom: "20%", right: "-5%", width: 200, height: 200, background: "radial-gradient(circle, #cc22000a 0%, transparent 70%)", borderRadius: "50%" }} />
      {/* Subtle scanline texture */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(201,168,76,0.012) 3px, rgba(201,168,76,0.012) 4px)" }} />
    </div>
  );
}

// ── FEEDBACK CARD (dùng chung cho cả mobile & desktop) ──
function FeedbackCard({ c, hov, onEnter, onLeave }) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ width: 240, flexShrink: 0, background: CARD, borderRadius: 14, overflow: "hidden", border: `1px solid ${hov ? G + "55" : BR}`, transition: "all .3s", transform: hov ? "translateY(-6px) scale(1.02)" : "none", boxShadow: hov ? `0 16px 40px rgba(201,168,76,0.1)` : "none" }}>
      <div style={{ position: "relative" }}>
        {c.hasImg ? (
          <img src={c.img} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: 140, background: `linear-gradient(135deg,#0d0b00,#1a1400)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 36 }}>📷</div>
            <div style={{ color: G + "66", fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>92 KAMERA</div>
          </div>
        )}
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", borderRadius: 99, padding: "3px 10px", fontSize: 11 }}>
          <span style={{ color: G }}>{"★".repeat(c.rating)}</span><span style={{ color: "#333" }}>{"★".repeat(5 - c.rating)}</span>
        </div>
        {c.extraImages > 0 && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.8)", color: G, borderRadius: 99, padding: "3px 9px", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>+{c.extraImages}</div>
        )}
        {c.type === "feedback" && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: G + "cc", color: "#000", borderRadius: 99, padding: "2px 8px", fontSize: 9, fontFamily: "system-ui,sans-serif", fontWeight: 700, letterSpacing: .5 }}>ĐÃ THUÊ ✓</div>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {c.text ? (
          <div style={{ color: TXT, fontSize: 12, lineHeight: 1.6, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", fontStyle: "italic" }}>"{c.text}"</div>
        ) : !c.hasImg ? (
          <div style={{ color: MUT, fontSize: 12, lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>Khách hàng hài lòng 😊</div>
        ) : null}
        <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>📷 {c.camera}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ color: "#5a5a5a", fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>{c.userName}</div>
          <div style={{ color: "#3a3a3a", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{c.date}</div>
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
        <div style={{ fontSize: 9, letterSpacing: 7, color: MUT, fontFamily: "system-ui,sans-serif", marginBottom: 14 }}>SOCIAL PROOF</div>
        <h2 style={{ fontSize: 30, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px", color: TXT, fontFamily: '"Times New Roman",Georgia,serif' }}>Feedback Khách Hàng</h2>
        <div style={{ width: 36, height: 1, background: G, margin: "14px auto 20px" }} />
        <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>Chưa có feedback nào được duyệt</div>
      </div>
    </div>
  );

  if (all.length === 0) return emptySection;

  // ── HEADER dùng chung ──
  const header = (
    <div style={{ textAlign: "center", marginBottom: 32, position: "relative", zIndex: 2, padding: "0 16px" }}>
      <div style={{ fontSize: 9, letterSpacing: 7, color: MUT, fontFamily: "system-ui,sans-serif", marginBottom: 14 }}>SOCIAL PROOF</div>
      <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px", color: TXT, fontFamily: '"Times New Roman",Georgia,serif' }}>Feedback Khách Hàng</h2>
      <div style={{ width: 36, height: 1, background: G, margin: "14px auto 12px" }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0e0e0e", border: `1px solid ${G}33`, borderRadius: 99, padding: "6px 20px", marginBottom: 18 }}>
        <span style={{ color: G, fontSize: 16 }}>{"★".repeat(Math.round(parseFloat(avgRating)))}</span>
        <span style={{ color: G, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>{avgRating}</span>
        <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>· {all.length} đánh giá</span>
      </div>
    </div>
  );

  // ── MOBILE: scroll ngang tay, snap từng card ──
  if (isMobile) {
    return (
      <div id="feedback" style={{ padding: "56px 0 52px", borderTop: `1px solid ${BR}`, background: "linear-gradient(180deg,#060606 0%,#080700 50%,#060606 100%)" }}>
        <style>{`
          .fb-scroll::-webkit-scrollbar{display:none}
          .fb-scroll{-ms-overflow-style:none;scrollbar-width:none;}
        `}</style>
        {header}
        <div
          className="fb-scroll"
          style={{
            display: "flex", gap: 16, overflowX: "auto", overflowY: "visible",
            scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
            paddingLeft: 20, paddingRight: 20, paddingBottom: 8,
            touchAction: "pan-x",
          }}
        >
          {all.map((c) => (
            <div key={c.key} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
              <FeedbackCard c={c} hov={false} onEnter={() => {}} onLeave={() => {}} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, color: MUT, fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif" }}>← VUỐT ĐỂ XEM THÊM →</div>
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

// ── CUSTOMER PHOTO UPLOAD MODAL ──
function CustomerPhotoUpload({ loggedUser, cameras, setPhotos, onClose }) {
  const [img, setImg] = useState(null);
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(5);
  const [cameraUsed, setCameraUsed] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const compressed = await compressImage(file, 900, 0.78);
    setImg(compressed);
  };

  const handleSubmit = () => {
    if (!img) return;
    const photo = { id: "photo_" + Date.now(), phone: loggedUser.phone || "", email: loggedUser.email || "", userName: loggedUser.name, url: img, caption, rating, cameraUsed, date: todayStr(), status: "pending", seen: false };
    setPhotos(prev => [photo, ...prev]);
    setDone(true);
  };

  const inpS = { padding: "10px 13px", background: "#111", border: `1px solid ${BR}`, borderRadius: 8, color: TXT, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 16, padding: 32, width: "min(460px,96vw)", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer" }}>✕</button>
        <Logo size={0.72} />
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: TXT, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>📸 Đăng ảnh của bạn</div>
          <div style={{ fontSize: 11, color: MUT, fontFamily: "system-ui,sans-serif" }}>Ảnh sẽ được admin xét duyệt trước khi hiển thị công khai</div>
        </div>
        {!done ? (
          <>
            <div style={{ marginBottom: 16 }}>
              {img ? (
                <div style={{ position: "relative" }}>
                  <img src={img} alt="" style={{ width: "100%", height: 210, objectFit: "cover", borderRadius: 10, border: `1px solid ${BR}` }} />
                  <button onClick={() => setImg(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.8)", color: MUT, border: `1px solid ${BR}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Đổi ảnh</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} style={{ width: "100%", height: 170, border: `2px dashed ${G}44`, borderRadius: 10, background: "#0a0900", color: G, cursor: "pointer", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 36 }}>📷</span>
                  <span style={{ fontSize: 13 }}>Chọn ảnh của bạn</span>
                  <span style={{ fontSize: 10, color: MUT }}>JPG, PNG — tối đa 10MB</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 5, fontFamily: "system-ui,sans-serif" }}>CHIA SẺ TRẢI NGHIỆM</div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bạn cảm thấy thế nào khi dùng máy?" style={{ ...inpS, resize: "none", minHeight: 72, lineHeight: 1.6 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 5, fontFamily: "system-ui,sans-serif" }}>MÁY ĐÃ THUÊ</div>
              <select value={cameraUsed} onChange={e => setCameraUsed(e.target.value)} style={inpS}>
                <option value="">-- Chọn máy đã thuê --</option>
                {cameras.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>ĐÁNH GIÁ DỊCH VỤ</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, color: s <= rating ? G : "#2a2a2a", padding: 2, lineHeight: 1, transition: "color .15s" }}>★</button>
                ))}
                <span style={{ color: MUT, fontSize: 12, marginLeft: 6, fontFamily: "system-ui,sans-serif" }}>{["","Tệ","Tạm","Ổn","Tốt","Xuất sắc"][rating]}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!img} style={{ width: "100%", padding: 13, background: img ? G : "#1a1a1a", color: img ? "#000" : MUT, border: "none", borderRadius: 8, cursor: img ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", boxShadow: img ? `0 0 20px ${G}33` : "none" }}>
              Gửi ảnh & đánh giá
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ color: G, fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>Đã gửi thành công!</div>
            <div style={{ color: MUT, fontSize: 13, marginBottom: 24, lineHeight: 1.7, fontFamily: "system-ui,sans-serif" }}>Ảnh của bạn đang chờ duyệt.<br />Cảm ơn bạn đã chia sẻ trải nghiệm! 💛</div>
            <button onClick={onClose} style={{ padding: "11px 36px", background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── FEEDBACK MODAL (post-order rating — only for completed orders) ──
function FeedbackModal({ order, loggedUser, feedbacks, setFeedbacks, onClose }) {
  // Tìm feedback đã gửi cho đơn này (nếu có)
  const existingFb = feedbacks.find(f => f.orderId === order?.id && f.phone === loggedUser?.phone);
  // Cho phép edit nếu chưa admin xử lý (pending), không cho edit nếu đã approved/rejected
  const isEditing = !!existingFb && existingFb.status === "pending";
  const isLocked = !!existingFb && existingFb.status !== "pending";

  const [rating, setRating] = useState(existingFb?.rating || 5);
  const [text, setText] = useState(existingFb?.text || "");
  const [images, setImages] = useState(existingFb?.images || []);
  const [done, setDone] = useState(false);
  const [hovStar, setHovStar] = useState(0);

  const starLabels = ["", "Tệ 😞", "Tạm 😐", "Ổn 🙂", "Tốt 😊", "Xuất sắc 🤩"];

  const handleSubmit = () => {
    if (!loggedUser || !order) return;
    if (isEditing && existingFb) {
      // CẬP NHẬT feedback cũ (status → pending lại để admin duyệt lại)
      setFeedbacks(prev => prev.map(f =>
        f.id === existingFb.id
          ? { ...f, rating, text, images, date: todayStr(), status: "pending", hidden: false, seen: false }
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
        images,
        userName: loggedUser.name,
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
            <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.7, marginBottom: 24 }}>Đánh giá đang chờ admin duyệt.<br />Ảnh đẹp của bạn sẽ sớm xuất hiện trên trang chủ!</div>
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

            {/* Photo upload */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 6, fontFamily: "system-ui,sans-serif" }}>ẢNH CHỤP BẰNG MÁY ĐÃ THUÊ (tùy chọn — tối đa 6 ảnh)</div>
              <div style={{ fontSize: 10, color: "#444", marginBottom: 10, fontFamily: "system-ui,sans-serif" }}>Ảnh đẹp sẽ hiện trên trang chủ nếu được duyệt 📸</div>
              <ImageUploader images={images} onChange={setImages} max={6} />
            </div>

            <button onClick={handleSubmit}
              style={{ width: "100%", padding: 14, background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 24px ${G}44` }}>
              {isEditing ? "✏️ Cập nhật đánh giá" : "🌟 Gửi đánh giá"}
            </button>
            <div style={{ color: "#333", fontSize: 11, textAlign: "center", marginTop: 10, fontFamily: "system-ui,sans-serif" }}>
              {isEditing ? "⚠️ Cập nhật sẽ gửi lại để admin duyệt" : "Ảnh & nhận xét sẽ chờ admin duyệt trước khi công khai"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── CUSTOMER DASHBOARD PAGE ──
function CustomerPage({ loggedUser, setLoggedUser, orders, feedbacks, setFeedbacks, cameras, onBack, onOpenBooking, users, setUsers }) {
  const [tab, setTab] = useState("dashboard");
  const [fbOrder, setFbOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const avatarRef = useRef();
  const [avatarLoading, setAvatarLoading] = useState(false);

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
      const compressed = await compressImage(file, 400, 0.82);
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
  if (myFeedbacks.some(f => f.status === "approved" && f.images?.length > 0)) badges.push({ icon: "📸", label: "Creator Nổi Bật", desc: "Có ảnh feedback được duyệt", col: "#a78bfa" });
  if (totalDays >= 30) badges.push({ icon: "👑", label: "Đại Gia Khoảnh Khắc", desc: "Tổng 30+ ngày thuê", col: G });

  const filteredOrders = filterStatus === "all" ? myOrders : myOrders.filter(o => o.status === filterStatus);

  const tabStyle = (k) => ({
    padding: "12px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? G : "transparent"}`,
    color: tab === k ? G : MUT, fontWeight: tab === k ? 700 : 400, fontSize: 13, cursor: "pointer",
    fontFamily: "system-ui,sans-serif", transition: "all .2s", whiteSpace: "nowrap"
  });

  const orderStatusColor = { pending: "#60a5fa", confirmed: "#a78bfa", active: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box;} @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.97)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${BR}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            {completedOrders.filter(o => !feedbacks.some(f => f.orderId === o.id && (f.email === loggedUser?.email || f.phone === loggedUser?.phone))).length > 0 && (
              <div style={{ background: "#0a0900", border: `1px solid ${G}44`, borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ color: G, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⭐ Bạn có {completedOrders.filter(o => !feedbacks.some(f => f.orderId === o.id && (f.email === loggedUser?.email || f.phone === loggedUser?.phone))).length} đơn chưa đánh giá!</div>
                <div style={{ color: MUT, fontSize: 12, marginBottom: 14 }}>Chia sẻ trải nghiệm để giúp cộng đồng và nhận huy hiệu Creator.</div>
                <button onClick={() => setTab("orders")} style={{ padding: "9px 22px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Đánh giá ngay →</button>
              </div>
            )}

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
            <div style={{ color: TXT, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Đơn thuê của tôi</div>
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
                {onOpenBooking && <button onClick={onOpenBooking} style={{ marginTop: 16, padding: "10px 24px", background: G, color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>Thuê ngay</button>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredOrders.map(o => {
                  const hasFeedback = feedbacks.some(f => f.orderId === o.id && f.phone === loggedUser?.phone);
                  const fbStatus = feedbacks.find(f => f.orderId === o.id && f.phone === loggedUser?.phone)?.status;
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
                  const canDeleteImg = f.status === "pending"; // Chỉ xoá ảnh khi chưa admin duyệt
                  const handleDeleteImg = (imgIdx) => {
                    setFeedbacks(prev => prev.map(fb =>
                      fb.id === f.id
                        ? { ...fb, images: fb.images.filter((_, i) => i !== imgIdx), seen: false }
                        : fb
                    ));
                  };
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
                    {/* ── ẢNH: xem và xoá (chỉ khi chưa duyệt) ── */}
                    {f.images?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>
                          ẢNH ĐÃ TẢI LÊN ({f.images.length}) {canDeleteImg && <span style={{ color: "#ef444488" }}>· Nhấn ✕ để xoá</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {f.images.map((img, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={img} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${BR}`, display: "block" }} loading="lazy" />
                              {canDeleteImg && (
                                <button
                                  onClick={() => handleDeleteImg(i)}
                                  title="Xoá ảnh này"
                                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #060606", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1, padding: 0 }}>
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {f.status === "approved" && !f.hidden && (
                      <div style={{ marginTop: 10, fontSize: 10, color: "#22c55e66", fontFamily: "system-ui,sans-serif" }}>✨ Đang hiển thị trên trang chủ</div>
                    )}
                    {canDeleteImg && (
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
                { icon: "📸", label: "Creator Nổi Bật", desc: "Có ảnh feedback được duyệt", col: "#a78bfa", unlocked: myFeedbacks.some(f => f.status === "approved" && f.images?.length > 0) },
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

function BookingModal({ cameras, accessories, siteContent, onClose, onSubmit, loggedUser }) {
  const [step, setStep] = useState(1);
  // selCams: { [camId]: qty }
  const [selCams, setSelCams] = useState({});
  const [selDur, setSelDur] = useState(null);
  const [customDays, setCustomDays] = useState("");
  const [pickDate, setPickDate] = useState(todayStr());
  // selAcc: { [accName]: qty }
  const [selAcc, setSelAcc] = useState({});
  const [info, setInfo] = useState({ name: loggedUser?.displayName || loggedUser?.name || "", phone: loggedUser?.phone || "", zalo: loggedUser?.zalo || loggedUser?.phone || "", address: loggedUser?.address || "", note: "" });
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");

  const days = selDur ? selDur.days : (parseInt(customDays) || 0);
  const availCams = cameras.filter(c => c.status === "available");
  const selectedCamList = availCams.filter(c => selCams[c.id] > 0);
  const totalCamSelected = Object.values(selCams).reduce((s, q) => s + (q || 0), 0);

  const camCost = selectedCamList.reduce((s, c) => s + c.price * (selCams[c.id] || 0) * days, 0);
  const accCost = Object.entries(selAcc).reduce((s, [name, qty]) => {
    const a = accessories.find(x => x.name === name);
    return s + (a ? a.price * qty * days : 0);
  }, 0);
  const total = camCost + accCost;

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
      days, total, ...info, status: "pending", date: pickDate, seen: false, userPhone: loggedUser?.phone || info.phone, userEmail: loggedUser?.email || ""
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
              <div style={{ borderTop: `1px solid ${G}33`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: MUT, fontSize: 12 }}>{days} ngày · từ {pickDate} → {endDate()}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: G, fontWeight: 800, fontSize: 20 }}>{fmtVND(total)}</div>
                  <div style={{ color: MUT, fontSize: 10 }}>Tổng cộng</div>
                </div>
              </div>
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
              📸 Xác nhận đặt thuê · {fmtVND(total)}
            </button>
          </div>
        )}

        {/* DONE */}
        {done && (
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📸</div>
            <div style={{ color: G, fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", marginBottom: 6, letterSpacing: 1 }}>Đặt đơn thành công!</div>
            <div style={{ color: MUT, fontSize: 13, marginBottom: 10 }}>Mã đơn của bạn</div>
            <div style={{ color: TXT, fontSize: 28, fontWeight: 900, fontFamily: "monospace", letterSpacing: 5, background: "#111", padding: "12px 24px", borderRadius: 10, border: `1px solid ${G}44`, display: "inline-block", marginBottom: 12 }}>{orderId}</div>
            <div style={{ color: MUT, fontSize: 14, marginBottom: 20 }}>Tổng: <span style={{ color: G, fontWeight: 700, fontSize: 16 }}>{fmtVND(total)}</span></div>

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

            <div style={{ color: "#333", fontSize: 11, marginBottom: 22 }}>Đơn thuê đã được tạo · Vui lòng xác nhận qua Zalo 📸</div>
            <button onClick={onClose} style={{ width: "100%", padding: 12, background: "#111", color: MUT, border: `1px solid ${BR}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOMEPAGE ──
function HomePage({ cameras, accessories, siteContent, onBook, onAdmin, isMobile, photos, feedbacks, loggedUser, onOpenLogin, onOpenCustomer }) {
  const [scrollY, setScrollY] = useState(0);
  const [hov, setHov] = useState(null);
  const [ticker, setTicker] = useState(0);
  const [logoClick, setLogoClick] = useState(0);
  const handleLogoClick = () => { const n = logoClick + 1; setLogoClick(n); if (n >= 5) { setLogoClick(0); onAdmin(); } };
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    const t = setInterval(() => setTicker(p => (p + 1) % cameras.length), 3000);
    return () => { window.removeEventListener("scroll", h); clearInterval(t); };
  }, [cameras.length]);
  const marquee = cameras.map(c => `${c.icon || "📷"} ${c.name}`);

  return (
    <div style={{ position: "relative", zIndex: 1, fontFamily: '"Times New Roman",Georgia,serif', color: TXT }}>
      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: isMobile ? "12px 16px" : "16px 60px", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrollY > 60 ? "rgba(4,4,4,0.97)" : "transparent", backdropFilter: scrollY > 60 ? "blur(28px)" : "none", borderBottom: scrollY > 60 ? `1px solid ${BR}` : "none", transition: "all .4s" }}>
        <div onClick={handleLogoClick} style={{ cursor: "default" }}><Logo size={isMobile ? 0.68 : 0.82} /></div>
        <div style={{ display: "flex", gap: isMobile ? 10 : 24, alignItems: "center" }}>
          {!isMobile && [["MÁY ẢNH", "cameras"], ["PHỤ KIỆN", "accessories"], ["FEEDBACK", "feedback"], ["VỀ CHÚNG TÔI", "about"]].map(([t, id]) => (
            <button key={t} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{ color: MUT, fontSize: 11, background: "none", border: "none", cursor: "pointer", letterSpacing: 2.5, transition: "color .2s", fontFamily: "system-ui,sans-serif", padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = TXT} onMouseLeave={e => e.currentTarget.style.color = MUT}>{t}</button>
          ))}
          {!isMobile && (loggedUser ? (
            <button onClick={onOpenCustomer || onOpenLogin} style={{ color: G, fontSize: 11, background: G + "15", border: `1px solid ${G}44`, padding: "5px 14px 5px 5px", borderRadius: 99, cursor: "pointer", letterSpacing: 1, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: G + "33", border: `1px solid ${G}55`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                {loggedUser.avatar ? <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : loggedUser.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loggedUser.name}</span>
            </button>
          ) : (
            <button onClick={onOpenLogin} style={{ color: MUT, fontSize: 11, background: "none", border: `1px solid ${BR}`, padding: "7px 16px", borderRadius: 3, cursor: "pointer", letterSpacing: 2, transition: "all .2s", fontFamily: "system-ui,sans-serif" }}>ĐĂNG NHẬP</button>
          ))}
          <button onClick={onBook} style={{ background: G, color: "#000", border: "none", padding: isMobile ? "8px 16px" : "9px 22px", borderRadius: 3, cursor: "pointer", fontWeight: 700, fontSize: 11, letterSpacing: 2, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 20px ${G}44` }}>THUÊ NGAY</button>
          {isMobile && (loggedUser ? (
            <button onClick={onOpenCustomer || onOpenLogin} style={{ color: G, fontSize: 10, background: G + "15", border: `1px solid ${G}44`, padding: "4px", borderRadius: 99, cursor: "pointer", fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: G + "33", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                {loggedUser.avatar ? <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : loggedUser.name?.[0]?.toUpperCase()}
              </div>
            </button>
          ) : (
            <button onClick={onOpenLogin} style={{ color: MUT, fontSize: 10, background: "none", border: `1px solid ${BR}`, padding: "6px 10px", borderRadius: 3, cursor: "pointer", letterSpacing: 1, fontFamily: "system-ui,sans-serif" }}>ĐĂNG NHẬP</button>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: isMobile ? "0 16px" : "0 24px", userSelect: "none", position: "relative", overflow: "hidden" }}>

        {/* ── Shooting stars ── */}
        <div style={{ position: "absolute", top: "8%", right: "18%", width: 120, height: 1.5, background: `linear-gradient(to left, ${G}cc, ${G}44, transparent)`, borderRadius: 2, animation: "shootA 5.5s ease-in 0s infinite", boxShadow: `0 0 6px ${G}88` }} />
        <div style={{ position: "absolute", top: "14%", right: "32%", width: 80, height: 1, background: `linear-gradient(to left, ${G}99, transparent)`, borderRadius: 2, animation: "shootB 7s ease-in 1.8s infinite" }} />
        <div style={{ position: "absolute", top: "6%", right: "8%", width: 55, height: 1, background: `linear-gradient(to left, #c8703388, transparent)`, borderRadius: 2, animation: "shootC 9s ease-in 3.2s infinite" }} />
        <div style={{ position: "absolute", top: "22%", left: "12%", width: 70, height: 1, background: `linear-gradient(to right, ${G}77, transparent)`, borderRadius: 2, transform: "rotate(40deg)", animation: "shootB 8s ease-in 2.5s infinite" }} />

        {/* ── Ambient particles ── */}
        {[
          { left: "8%", top: "30%", s: 2 }, { left: "88%", top: "20%", s: 1.5 },
          { left: "15%", top: "70%", s: 1 }, { left: "78%", top: "65%", s: 2 },
          { left: "92%", top: "45%", s: 1.5 }, { left: "4%", top: "55%", s: 1 },
        ].map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.left, top: p.top, width: p.s, height: p.s, borderRadius: "50%", background: G, opacity: .18, animation: `twinkle ${2.8 + i * .7}s ease-in-out ${i * .5}s infinite` }} />
        ))}

        {/* ── Side accent lines — hidden on mobile ── */}
        {!isMobile && <div style={{ position: "absolute", left: 48, top: "50%", width: 1, height: 120, background: `linear-gradient(to bottom,transparent,${G}55,transparent)`, transform: "translateY(-50%)" }} />}
        {!isMobile && <div style={{ position: "absolute", right: 48, top: "50%", width: 1, height: 120, background: `linear-gradient(to bottom,transparent,${G}55,transparent)`, transform: "translateY(-50%)" }} />}

        {/* ── Slogan ── */}
        <div style={{ fontSize: 10, letterSpacing: 8, color: "#444", marginBottom: 22, fontFamily: "system-ui,sans-serif", textTransform: "uppercase" }}>{siteContent.slogan}</div>

        {/* ── Logo — vừa phải, centered ── */}
        <Logo size={isMobile ? 1.3 : 1.8} />

        {/* ── Divider ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "24px 0 20px" }}>
          <div style={{ width: 44, height: 1, background: `linear-gradient(to right,transparent,${G})` }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: RED, boxShadow: `0 0 6px ${RED}88` }} />
          <div style={{ width: 44, height: 1, background: `linear-gradient(to left,transparent,${G})` }} />
        </div>

        {/* ── Tagline ── */}
        <div style={{ fontSize: 13, color: "#4a4a4a", letterSpacing: 3.5, fontStyle: "italic", marginBottom: 8 }}>{siteContent.tagline}</div>

        {/* ── Camera ticker ── */}
        <div style={{ marginTop: 14, padding: "6px 20px", background: "rgba(14,14,14,0.8)", border: `1px solid ${BR}`, borderRadius: 99, fontSize: 12, color: MUT, letterSpacing: 1, minWidth: 220, textAlign: "center", backdropFilter: "blur(8px)" }}>{marquee[ticker % marquee.length]}</div>

        {/* ── CTA Buttons — all handlers preserved ── */}
        <div style={{ marginTop: 36, display: "flex", gap: 12 }}>
          <button onClick={onBook} style={{ padding: "13px 40px", background: G, color: "#000", border: "none", borderRadius: 2, cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: 2.5, fontFamily: "system-ui,sans-serif", boxShadow: `0 4px 28px ${G}55` }}>THUÊ NGAY</button>
          <button onClick={() => document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ padding: "13px 40px", background: "transparent", color: TXT, border: `1px solid ${BR}`, borderRadius: 2, fontSize: 12, letterSpacing: 2.5, fontFamily: "system-ui,sans-serif", cursor: "pointer" }}>XEM MÁY ẢNH</button>
        </div>

        {/* ── USP badges — 2 items only ── */}
        <div style={{ marginTop: 26, display: "inline-flex", border: `1px solid ${BR}`, borderRadius: 6, overflow: "hidden", background: "rgba(6,6,6,0.55)", backdropFilter: "blur(12px)" }}>
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
        </div>

      </div>

      {/* Scroll cue */}
      <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 5, animation: "floatY 2.2s ease-in-out infinite" }}>
        <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom,transparent,${G}88)` }} />
        <div style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: 3, fontFamily: "system-ui,sans-serif" }}>SCROLL</div>
      </div>

      {/* CUSTOMER PHOTO FEED */}
      <FeedbackMarquee photos={photos || []} feedbacks={feedbacks || []} isMobile={isMobile} />

      {/* CAMERAS */}
      <div id="cameras" style={{ padding: isMobile ? "72px 16px 56px" : "110px 60px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 14, fontFamily: "system-ui,sans-serif" }}>BỘ SƯU TẬP</div>
          <h2 style={{ fontSize: 38, fontWeight: 400, letterSpacing: 2, margin: 0 }}>Máy Ảnh Cho Thuê</h2>
          <div style={{ width: 40, height: 1, background: G, margin: "20px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: isMobile ? 16 : 24 }}>
          {cameras.map(c => (
            <div key={c.id} onMouseEnter={() => setHov(c.id)} onMouseLeave={() => setHov(null)}
              style={{ background: CARD, border: `1px solid ${hov === c.id ? G + "66" : BR}`, borderRadius: 12, overflow: "hidden", transition: "all .3s", transform: hov === c.id ? "translateY(-8px)" : "translateY(0)", boxShadow: hov === c.id ? `0 24px 60px rgba(201,168,76,0.07)` : "none" }}>
              <CamImage cam={c} height={176} />
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TXT }}>{c.name}</h3>
                  <Badge status={c.status} />
                </div>
                <p style={{ color: MUT, fontSize: 12, marginBottom: 18, lineHeight: 1.7 }}>{c.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: G, fontSize: 17, fontWeight: 700 }}>{fmtVND(c.price)}<span style={{ color: MUT, fontSize: 10 }}>/ngày</span></span>
                  <button onClick={onBook} disabled={c.status !== "available"}
                    style={{ padding: "8px 18px", background: c.status === "available" ? G : "#141414", color: c.status === "available" ? "#000" : MUT, border: `1px solid ${c.status === "available" ? G : BR}`, borderRadius: 4, cursor: c.status === "available" ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 11, fontFamily: "system-ui,sans-serif", letterSpacing: 1.5 }}>
                    {c.status === "available" ? "THUÊ NGAY" : "HẾT MÁY"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
              <div style={{ color: TXT, fontWeight: 500, marginBottom: 6, fontSize: 13 }}>{a.name}</div>
              <div style={{ color: G, fontWeight: 700, fontSize: 14 }}>{fmtVND(a.price)}<span style={{ color: MUT, fontSize: 10 }}>/ngày</span></div>
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
          <button onClick={onBook} style={{ padding: "16px 56px", background: G, color: "#000", border: "none", borderRadius: 2, cursor: "pointer", fontWeight: 700, fontSize: 13, letterSpacing: 3, fontFamily: "system-ui,sans-serif", boxShadow: `0 4px 40px ${G}55` }}>BẮT ĐẦU ĐẶT THUÊ</button>
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" style={{ padding: isMobile ? "56px 16px 72px" : "80px 60px 100px", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>VỀ CHÚNG TÔI</div>
        <h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 400, letterSpacing: 2, marginBottom: 28 }}>92 KA MÊ RA</h2>
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
        <div style={{ color: "#333", fontSize: 12, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>Zalo: {siteContent.zalo} · {siteContent.address}</div>
        <div style={{ color: "#222", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>© 2026 92 KA MÊ RA</div>
      </footer>
    </div>
  );
}

// ── LOGIN MODAL (Khách hàng Google OAuth + Quản trị) ──
function AdminLogin({ onLogin, onBack, orders = [], defaultTab = "customer", loggedUser, setLoggedUser, photos = [], setPhotos, cameras = [], setPage, usersMap, setUsersMap, siteContent }) {
  const [tab, setTab] = useState(defaultTab);

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
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          const info = decodeGoogleJWT(res.credential);
          if (!info) { setGsiErr(true); return; }
          // Merge với profile đã lưu (nếu có)
          const savedProfile = (usersMap || {})[info.email] || {};
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
          // Lưu vào users storage (key = email), giữ lại profile đã chỉnh
          const updated = { ...(usersMap || {}), [info.email]: { ...savedProfile, name: info.name, picture: info.picture, googleId: info.googleId, joinDate: savedProfile.joinDate || todayStr() } };
          if (setUsersMap) setUsersMap(updated);
          storageSet("k92_users_v1", updated);
        },
        use_fedcm_for_prompt: false,
      });
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
                <div style={{ color: TXT, fontSize: 16, fontWeight: 600, fontFamily: "Georgia,serif", letterSpacing: 0.5, marginBottom: 6 }}>Đăng nhập để đặt máy</div>
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
                  <div style={{ color: G, fontWeight: 700, fontSize: 16 }}>{loggedUser.name}</div>
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
            <h3 style={{ color: TXT, fontWeight: 400, marginBottom: 6, fontFamily: "Georgia,serif", fontSize: 18, letterSpacing: 1 }}>Quản trị viên</h3>
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
function AdminDashboard({ cameras, setCameras, accessories, setAccessories, orders, setOrders, siteContent, setSiteContent, photos, setPhotos, feedbacks, setFeedbacks, users, setUsers, onBack, isMobile }) {
  const [tab, setTab] = useState("overview");
  const [mediaSubTab, setMediaSubTab] = useState("photos");
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

  // Track new unseen orders
  const unseenCount = orders.filter(o => !o.seen).length;

  // Poll storage every 8s — sync orders, photos, feedbacks across browser tabs
  useEffect(() => {
    const poll = setInterval(async () => {
      const [ords, phs, fbs] = await Promise.all([
        storageGet(STORE_KEYS.orders),
        storageGet(STORE_KEYS.photos),
        storageGet(STORE_KEYS.feedbacks),
      ]);

      // Orders: merge new ones (not yet in this tab's state)
      if (ords) {
        setOrders(prev => {
          const prevIds = new Set(prev.map(o => o.id));
          const newOnes = ords.filter(o => !prevIds.has(o.id));
          if (newOnes.length === 0) return prev;
          return [...newOnes.map(o => ({ ...o, seen: false })), ...prev];
        });
      }

      // Photos: merge new uploads from customer tab
      if (phs) {
        setPhotos(prev => {
          const prevIds = new Set(prev.map(p => p.id));
          const newOnes = phs.filter(p => !prevIds.has(p.id));
          if (newOnes.length === 0) return prev;
          return [...newOnes.map(p => ({ ...p, seen: false })), ...prev];
        });
      }

      // Feedbacks: merge new submissions from customer tab
      if (fbs) {
        setFeedbacks(prev => {
          const prevIds = new Set(prev.map(f => f.id));
          const newOnes = fbs.filter(f => !prevIds.has(f.id));
          if (newOnes.length === 0) return prev;
          return [...newOnes.map(f => ({ ...f, seen: false })), ...prev];
        });
      }
    }, 8000);
    return () => clearInterval(poll);
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

  const unseenPhotosCount = (photos || []).filter(p => p.status === "pending" && !p.seen).length;

  const unseenFeedbackCount = (feedbacks || []).filter(f => f.status === "pending" && !f.seen).length;

  const TABS = [
    { k: "overview", l: "📊 Tổng quan" },
    { k: "cameras", l: "📷 Máy ảnh" },
    { k: "accessories", l: "🎒 Phụ kiện" },
    { k: "orders", l: "📋 Đơn thuê", badge: unseenCount },
    { k: "media", l: "📸 Ảnh & Feedback", badge: unseenPhotosCount + unseenFeedbackCount },
    { k: "users", l: "👥 Khách hàng" },
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
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui,sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;}
        input:focus,textarea:focus,select:focus{border-color:#c9a84c55!important;outline:none;}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>

      {/* ADMIN HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.97)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${BR}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredOrders.length === 0 && <div style={{ color: MUT, textAlign: "center", padding: 40, fontSize: 14 }}>Không tìm thấy đơn nào</div>}
              {filteredOrders.map(o => (
                <div key={o.id} style={{ background: CARD2, border: `1px solid ${!o.seen ? "#60a5fa33" : BR2}`, borderRadius: 10, overflow: "hidden" }}>
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
                      <div style={{ borderTop: `1px solid ${BR2}`, paddingTop: 12 }}>
                        <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ĐỔI TRẠNG THÁI:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(ORDER_STATUSES).map(([s, l]) => (
                            <button key={s} onClick={() => setOrders(p => p.map(x => x.id === o.id ? { ...x, status: s } : x))}
                              style={{ padding: "6px 12px", background: o.status === s ? "#130f00" : "#0e0e0e", color: o.status === s ? G : MUT, border: `1px solid ${o.status === s ? G + "55" : BR2}`, borderRadius: 99, cursor: "pointer", fontSize: 11, fontWeight: o.status === s ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHOTOS & REVIEWS */}
        {tab === "media" && (
          <div>
            {/* Sub-tab selector */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#111", borderRadius: 8, padding: 3 }}>
              {[["photos", "📸 Ảnh khách"], ["feedbacks", "⭐ Feedback đơn thuê"]].map(([k, l]) => (
                <button key={k} onClick={() => setMediaSubTab(k)}
                  style={{ flex: 1, padding: "9px 0", background: mediaSubTab === k ? "#1a1a1a" : "none", border: "none", color: mediaSubTab === k ? TXT : MUT, borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: mediaSubTab === k ? 700 : 400 }}>
                  {l}
                  {k === "photos" && unseenPhotosCount > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 9 }}>{unseenPhotosCount}</span>}
                  {k === "feedbacks" && unseenFeedbackCount > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 9 }}>{unseenFeedbackCount}</span>}
                </button>
              ))}
            </div>

            {/* ── Ảnh khách ── */}
            {mediaSubTab === "photos" && (() => {
              const pending = (photos || []).filter(p => p.status === "pending").sort((a, b) => new Date(b.date) - new Date(a.date));
              const approved = (photos || []).filter(p => p.status === "approved").sort((a, b) => new Date(b.date) - new Date(a.date));
              const rejected = (photos || []).filter(p => p.status === "rejected").sort((a, b) => new Date(b.date) - new Date(a.date));
              const approvePhoto = (id) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "approved", seen: true } : p));
              const rejectPhoto = (id) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "rejected", seen: true } : p));
              const deletePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));
              const PhotoCard = ({ p, actions }) => (
                <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 12, overflow: "hidden" }}>
                  <img src={p.url} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} loading="lazy" />
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{p.userName}</div>
                        <div style={{ color: MUT, fontSize: 11, marginTop: 1 }}>📞 {p.phone}</div>
                      </div>
                      <div style={{ color: G, fontSize: 13 }}>{"★".repeat(p.rating || 5)}</div>
                    </div>
                    {p.cameraUsed && <div style={{ color: MUT, fontSize: 11, marginBottom: 5 }}>📷 {p.cameraUsed}</div>}
                    {p.caption && <div style={{ color: TXT, fontSize: 12, lineHeight: 1.6, marginBottom: 10, background: "#111", padding: "8px 10px", borderRadius: 6, fontStyle: "italic" }}>"{p.caption}"</div>}
                    <div style={{ color: "#2a2a2a", fontSize: 10, marginBottom: 10 }}>{p.date}</div>
                    {actions}
                  </div>
                </div>
              );
              return (
                <>
                  <STitle c={`Ảnh khách (${(photos||[]).length})`} />
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>⏳ Chờ duyệt</div>
                      {pending.length > 0 && <span style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{pending.length}</span>}
                    </div>
                    {pending.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Không có ảnh chờ duyệt</div> : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
                        {pending.map(p => (
                          <PhotoCard key={p.id} p={p} actions={
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => approvePhoto(p.id)} style={{ flex: 1, padding: "8px 0", background: "#052210", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✓ Duyệt</button>
                              <button onClick={() => rejectPhoto(p.id)} style={{ flex: 1, padding: "8px 0", background: "#160505", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>✕ Từ chối</button>
                            </div>
                          } />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>✅ Đã duyệt — hiển thị trang chủ</div>
                      {approved.length > 0 && <span style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{approved.length}</span>}
                    </div>
                    {approved.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Chưa có ảnh nào được duyệt</div> : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
                        {approved.map(p => (
                          <PhotoCard key={p.id} p={p} actions={
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => rejectPhoto(p.id)} style={{ flex: 1, padding: "7px 0", background: "#160505", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Gỡ khỏi trang</button>
                              <button onClick={() => deletePhoto(p.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
                            </div>
                          } />
                        ))}
                      </div>
                    )}
                  </div>
                  {rejected.length > 0 && (
                    <div>
                      <div style={{ color: MUT, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>✕ Đã từ chối ({rejected.length})</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
                        {rejected.map(p => (
                          <PhotoCard key={p.id} p={p} actions={
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => approvePhoto(p.id)} style={{ flex: 1, padding: "7px 0", background: "#052210", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Duyệt lại</button>
                              <button onClick={() => deletePhoto(p.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Xoá</button>
                            </div>
                          } />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Feedback đơn thuê ── */}
            {mediaSubTab === "feedbacks" && (() => {
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

        {tab === "security" && (
          <div>
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
const STORE_KEYS = { cameras: "k92_cameras_v2", accessories: "k92_accessories_v2", orders: "k92_orders_v2", site: "k92_site_v2", photos: "k92_photos_v1", feedbacks: "k92_feedbacks_v1", users: "k92_users_v1" };

const SB_URL = "https://gtgjixgcillbjwnnkavx.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Z2ppeGdjaWxsYmp3bm5rYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTg4MzMsImV4cCI6MjA5MjU3NDgzM30.iFh0KP4vrTZUDMrakW1a9nM8naJScP-D1WqJKrH0hiI";
const SB_TABLE = "kv_store";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" };

// GET từ Supabase, fallback localStorage nếu offline
async function storageGet(key) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        const parsed = JSON.parse(rows[0].value);
        // Cache vào localStorage để dùng khi offline
        try { localStorage.setItem(key, rows[0].value); } catch {}
        return parsed;
      }
    }
  } catch {}
  // Fallback: localStorage (offline / lỗi mạng)
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}

// SET lên Supabase + cache localStorage
async function storageSet(key, val) {
  const value = JSON.stringify(val);
  // Upsert lên Supabase
  try {
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method: "POST",
      headers: SB_HEADERS,
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    });
  } catch (e) {
    console.warn("[92K supabase] set failed:", key, e);
  }
  // Cache localStorage
  try { localStorage.setItem(key, value); } catch {}
}

// Cameras: lưu cả ảnh lên Supabase (text column không giới hạn size)
async function saveCamerasToStorage(cams) {
  await storageSet(STORE_KEYS.cameras, cams);
}

async function loadCamerasFromStorage() {
  return await storageGet(STORE_KEYS.cameras);
}

// ── ROOT ──
export default function App() {
  const [page, setPage] = useState("home");
  const [booking, setBooking] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [ready, setReady] = useState(false); // prevent flash before storage loads
  const isMobile = useMobile();

  // 🔑 ALL SHARED STATE — single source of truth
  const [cameras, _setCameras] = useState(CAMS_INIT);
  const [accessories, _setAccessories] = useState(ACC_INIT);
  const [orders, _setOrders] = useState(ORDERS_INIT);
  const [siteContent, _setSiteContent] = useState(SITE_INIT);
  const [photos, _setPhotos] = useState([]);
  const [feedbacks, _setFeedbacks] = useState([]);
  const [users, _setUsers] = useState({});
  const [loggedUser, setLoggedUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // ── Wrapped setters: update state AND persist to storage ──
  // ── Wrapped setters: update React state first, persist to storage via setTimeout (outside render) ──
  const setCameras = useCallback((updater) => {
    _setCameras(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => saveCamerasToStorage(next).catch(e => console.warn("setCameras err", e)), 0);
      return next;
    });
  }, []);

  const setAccessories = useCallback((updater) => {
    _setAccessories(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.accessories, next), 0);
      return next;
    });
  }, []);

  const setOrders = useCallback((updater) => {
    _setOrders(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.orders, next), 0);
      return next;
    });
  }, []);

  const setSiteContent = useCallback((updater) => {
    _setSiteContent(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.site, next), 0);
      return next;
    });
  }, []);

  const setPhotos = useCallback((updater) => {
    _setPhotos(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.photos, next), 0);
      return next;
    });
  }, []);

  const setFeedbacks = useCallback((updater) => {
    _setFeedbacks(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.feedbacks, next), 0);
      return next;
    });
  }, []);

  const setUsers = useCallback((updater) => {
    _setUsers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setTimeout(() => storageSet(STORE_KEYS.users, next), 0);
      return next;
    });
  }, []);

  // ── On mount: load persisted data from storage (non-blocking) ──
  useEffect(() => {
    // Show UI immediately with default data, then update from storage
    setReady(true);
    (async () => {
      const [cams, accs, ords, site, phs, fbs, usrs] = await Promise.all([
        loadCamerasFromStorage(),
        storageGet(STORE_KEYS.accessories),
        storageGet(STORE_KEYS.orders),
        storageGet(STORE_KEYS.site),
        storageGet(STORE_KEYS.photos),
        storageGet(STORE_KEYS.feedbacks),
        storageGet(STORE_KEYS.users),
      ]);
      if (cams) _setCameras(cams);
      if (accs) _setAccessories(accs);
      // Photos: merge to avoid overwriting items added before storage resolved
      if (phs) {
        _setPhotos(prev => {
          const storageIds = new Set(phs.map(p => p.id));
          const fresh = prev.filter(p => !storageIds.has(p.id));
          return [...fresh, ...phs];
        });
      }
      // Feedbacks: merge to avoid overwriting items added before storage resolved
      if (fbs) {
        _setFeedbacks(prev => {
          const storageIds = new Set(fbs.map(f => f.id));
          const fresh = prev.filter(f => !storageIds.has(f.id));
          const merged = [...fresh, ...fbs];
          if (fresh.length > 0) setTimeout(() => storageSet(STORE_KEYS.feedbacks, merged), 0);
          return merged;
        });
      }
      if (usrs) _setUsers(usrs);
      if (ords) {
        // ── FIX 1: Sync _orderNum to avoid duplicate order IDs across sessions ──
        // Without this, _orderNum resets to 4 on every reload. If storage has
        // orders up to #92K0010, new orders would get #92K0004 (duplicate) causing
        // React key collisions → admin cannot see the new order.
        for (const o of ords) {
          const m = o.id?.match(/#92K(\d+)/);
          if (m) _orderNum = Math.max(_orderNum, parseInt(m[1]) + 1);
        }
        // ── FIX 2: Merge instead of overwrite to prevent losing pending orders ──
        // Using _setOrders(ords) directly overwrites any order placed by the customer
        // BEFORE the async storage load completed (race condition).
        // Instead, merge: keep any "fresh" orders not yet in storage.
        _setOrders(prev => {
          const storageIds = new Set(ords.map(o => o.id));
          const initIds = new Set(ORDERS_INIT.map(o => o.id));
          // Fresh = orders added to state after mount but before storage loaded
          const fresh = prev.filter(o => !storageIds.has(o.id) && !initIds.has(o.id));
          const merged = [...fresh, ...ords];
          // ── FIX 3: Persist merged result so fresh orders survive next reload ──
          if (fresh.length > 0) {
            setTimeout(() => storageSet(STORE_KEYS.orders, merged), 0);
          }
          return merged;
        });
      }
      if (site) _setSiteContent(site);
    })();
  }, []);

  // NOTE: page-sync effect removed — all state lives in App (single source of truth).
  // Reloading from storage on page change caused race conditions:
  // new orders (seen:false) and newly added cameras were overwritten by stale storage reads.

  const handleNewOrder = useCallback((order) => {
    // Always ensure seen:false so admin badge shows the notification
    setOrders(prev => [{ ...order, seen: false }, ...prev]);
  }, [setOrders]);

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Logo size={1.2} />
        <div style={{ color: MUT, fontSize: 12, marginTop: 20, letterSpacing: 3, fontFamily: "system-ui,sans-serif" }}>ĐANG TẢI...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
        body{background:#060606;overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#060606}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        @keyframes floatY{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-9px)}}
        @keyframes pulseIn{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes shootA{0%{opacity:0;transform:translate(0,0) rotate(-42deg)}4%{opacity:.9}80%{opacity:.5}100%{opacity:0;transform:translate(-520px,520px) rotate(-42deg)}}
        @keyframes shootB{0%{opacity:0;transform:translate(0,0) rotate(-38deg)}4%{opacity:.7}75%{opacity:.3}100%{opacity:0;transform:translate(-340px,340px) rotate(-38deg)}}
        @keyframes shootC{0%{opacity:0;transform:translate(0,0) rotate(-50deg)}4%{opacity:.6}70%{opacity:.2}100%{opacity:0;transform:translate(-260px,260px) rotate(-50deg)}}
        @keyframes twinkle{0%,100%{opacity:.12}50%{opacity:.45}}
        select option{background:#111;color:#f0e8d0}
        input[type=date]{color-scheme:dark}
        input:focus,textarea:focus,select:focus{border-color:#c9a84c55!important;outline:none;}
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
          onBook={() => setBooking(true)}
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
        <AdminLogin onLogin={() => setAdminAuth(true)} onBack={() => setPage("home")} orders={orders} loggedUser={loggedUser} setLoggedUser={setLoggedUser} photos={photos} setPhotos={setPhotos} cameras={cameras} setPage={setPage} usersMap={users} setUsersMap={(u) => setUsers(u)} siteContent={siteContent} />
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
          onBack={() => setPage("home")}
          isMobile={isMobile}
        />
      )}

      {loginOpen && (
        <AdminLogin
          onLogin={() => { setLoginOpen(false); setPage("admin"); setAdminAuth(true); }}
          onBack={() => setLoginOpen(false)}
          orders={orders}
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
          onClose={() => setBooking(false)}
          onSubmit={handleNewOrder}
          loggedUser={loggedUser}
        />
      )}
    </div>
  );
}
