

import { useState, useEffect, useRef, useCallback } from "react";
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
      <img src={imgs[idx]} alt={cam.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

// ── 3D SCENE ──
function CameraScene() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const W = el.clientWidth || window.innerWidth, H = el.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const mountPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 56), mMid);
    mountPlate.rotation.x = Math.PI / 2; mountPlate.position.set(0, 0, 0.82); GRP.add(mountPlate);

    // Outer chrome mounting ring
    const mountRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.055, 8, 72), mSilv);
    mountRing.position.set(0, 0, 0.86); GRP.add(mountRing);

    // Stage 1 — focus/zoom barrel (outermost, widest)
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.75, 56), mDark);
    b1.rotation.x = Math.PI / 2; b1.position.set(0, 0, 1.22); GRP.add(b1);
    // Knurled focus ring on stage 1
    const focusRingGeo = new THREE.CylinderGeometry(0.94, 0.94, 0.28, 56);
    const focusMesh = new THREE.Mesh(focusRingGeo, mRingD);
    focusMesh.rotation.x = Math.PI / 2; focusMesh.position.set(0, 0, 1.05); GRP.add(focusMesh);
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.29, 0.016), mMid);
      tk.position.set(Math.cos(a) * 0.94, Math.sin(a) * 0.94, 1.05); tk.rotation.z = a; GRP.add(tk);
    }
    // Gold line ring after stage 1
    const gl1 = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.022, 6, 72), mGold);
    gl1.position.set(0, 0, 1.28); GRP.add(gl1);

    // Stage 2 — aperture barrel
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.58, 56), mDark);
    b2.rotation.x = Math.PI / 2; b2.position.set(0, 0, 1.55); GRP.add(b2);
    const gl2r = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.018, 6, 72), mGold);
    gl2r.position.set(0, 0, 1.58); GRP.add(gl2r);
    const sr1 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.016, 6, 72), mSilv);
    sr1.position.set(0, 0, 1.76); GRP.add(sr1);

    // Stage 3 — inner barrel
    const b3 = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.44, 56), mDark);
    b3.rotation.x = Math.PI / 2; b3.position.set(0, 0, 1.80); GRP.add(b3);
    const gl3 = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.016, 6, 72), mGold);
    gl3.position.set(0, 0, 1.83); GRP.add(gl3);

    // Stage 4 — front element housing
    const b4 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.30, 56), mDark);
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
    const N = 300; const pPos = new Float32Array(N * 3);
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
    window.addEventListener("mousemove", onMM);
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
    window.addEventListener("resize", onR);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMM); window.removeEventListener("resize", onR); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ── BOOKING MODAL ──
function BookingModal({ cameras, accessories, siteContent, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  // selCams: { [camId]: qty }
  const [selCams, setSelCams] = useState({});
  const [selDur, setSelDur] = useState(null);
  const [customDays, setCustomDays] = useState("");
  const [pickDate, setPickDate] = useState(todayStr());
  // selAcc: { [accName]: qty }
  const [selAcc, setSelAcc] = useState({});
  const [info, setInfo] = useState({ name: "", phone: "", zalo: "", address: "", note: "" });
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
      days, total, ...info, status: "pending", date: pickDate, seen: false
    });
    setDone(true);
  };

  const overlay = { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
  const box = { background: "#080808", border: `1px solid ${BR}`, borderRadius: 16, padding: 32, width: "min(600px,96vw)", maxHeight: "92vh", overflowY: "auto", position: "relative" };
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
function HomePage({ cameras, accessories, siteContent, onBook, onAdmin }) {
  const [scrollY, setScrollY] = useState(0);
  const [hov, setHov] = useState(null);
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h);
    const t = setInterval(() => setTicker(p => (p + 1) % cameras.length), 3000);
    return () => { window.removeEventListener("scroll", h); clearInterval(t); };
  }, [cameras.length]);
  const marquee = cameras.map(c => `${c.icon || "📷"} ${c.name}`);

  return (
    <div style={{ position: "relative", zIndex: 1, fontFamily: '"Times New Roman",Georgia,serif', color: TXT }}>
      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrollY > 60 ? "rgba(4,4,4,0.97)" : "transparent", backdropFilter: scrollY > 60 ? "blur(28px)" : "none", borderBottom: scrollY > 60 ? `1px solid ${BR}` : "none", transition: "all .4s" }}>
        <Logo size={0.82} />
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[["MÁY ẢNH", "cameras"], ["PHỤ KIỆN", "accessories"], ["VỀ CHÚNG TÔI", "about"]].map(([t, id]) => (
            <button key={t} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{ color: MUT, fontSize: 11, background: "none", border: "none", cursor: "pointer", letterSpacing: 2.5, transition: "color .2s", fontFamily: "system-ui,sans-serif", padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = TXT} onMouseLeave={e => e.currentTarget.style.color = MUT}>{t}</button>
          ))}
          <button onClick={onAdmin} style={{ color: MUT, fontSize: 11, background: "none", border: `1px solid ${BR}`, padding: "7px 16px", borderRadius: 3, cursor: "pointer", letterSpacing: 2, transition: "all .2s", fontFamily: "system-ui,sans-serif" }}
            onMouseEnter={e => { e.target.style.color = TXT; e.target.style.borderColor = "#444"; }}
            onMouseLeave={e => { e.target.style.color = MUT; e.target.style.borderColor = BR; }}>ADMIN</button>
          <button onClick={onBook} style={{ background: G, color: "#000", border: "none", padding: "9px 22px", borderRadius: 3, cursor: "pointer", fontWeight: 700, fontSize: 11, letterSpacing: 2, fontFamily: "system-ui,sans-serif", boxShadow: `0 0 20px ${G}44` }}>THUÊ NGAY</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", userSelect: "none", position: "relative", overflow: "hidden" }}>

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

        {/* ── Side accent lines ── */}
        <div style={{ position: "absolute", left: 48, top: "50%", width: 1, height: 120, background: `linear-gradient(to bottom,transparent,${G}55,transparent)`, transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", right: 48, top: "50%", width: 1, height: 120, background: `linear-gradient(to bottom,transparent,${G}55,transparent)`, transform: "translateY(-50%)" }} />

        {/* ── Slogan ── */}
        <div style={{ fontSize: 10, letterSpacing: 8, color: "#444", marginBottom: 22, fontFamily: "system-ui,sans-serif", textTransform: "uppercase" }}>{siteContent.slogan}</div>

        {/* ── Logo — vừa phải, centered ── */}
        <Logo size={1.8} />

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

      {/* CAMERAS */}
      <div id="cameras" style={{ padding: "110px 48px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 14, fontFamily: "system-ui,sans-serif" }}>BỘ SƯU TẬP</div>
          <h2 style={{ fontSize: 38, fontWeight: 400, letterSpacing: 2, margin: 0 }}>Máy Ảnh Cho Thuê</h2>
          <div style={{ width: 40, height: 1, background: G, margin: "20px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 20 }}>
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
      <div id="accessories" style={{ padding: "60px 48px 100px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 14, fontFamily: "system-ui,sans-serif" }}>PHỤ KIỆN</div>
          <h2 style={{ fontSize: 34, fontWeight: 400, letterSpacing: 2, margin: 0 }}>Bổ Sung Trang Thiết Bị</h2>
          <div style={{ width: 40, height: 1, background: G, margin: "18px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
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
      <div style={{ borderTop: `1px solid ${BR}`, borderBottom: `1px solid ${BR}`, padding: "60px 48px", textAlign: "center", background: "#0a0800", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: `radial-gradient(circle,${G}08,transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>ĐẶT THUÊ NGAY HÔM NAY</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, letterSpacing: 2, margin: "0 0 10px" }}>Không cần đăng ký tài khoản</h2>
          <p style={{ color: MUT, fontSize: 14, marginBottom: 32, letterSpacing: 1 }}>Chọn máy → Chọn ngày → Chốt Zalo. Đơn giản vậy thôi.</p>
          <button onClick={onBook} style={{ padding: "16px 56px", background: G, color: "#000", border: "none", borderRadius: 2, cursor: "pointer", fontWeight: 700, fontSize: 13, letterSpacing: 3, fontFamily: "system-ui,sans-serif", boxShadow: `0 4px 40px ${G}55` }}>BẮT ĐẦU ĐẶT THUÊ</button>
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" style={{ padding: "80px 48px 100px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 7, color: MUT, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>VỀ CHÚNG TÔI</div>
        <h2 style={{ fontSize: 34, fontWeight: 400, letterSpacing: 2, marginBottom: 28 }}>92 KA MÊ RA</h2>
        <p style={{ color: MUT, fontSize: 15, lineHeight: 2, maxWidth: 680, margin: "0 auto 64px" }}>{siteContent.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32, marginTop: 48 }}>
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
      <footer style={{ borderTop: `1px solid ${BR}`, padding: "24px 48px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Logo size={0.7} />
        <div style={{ color: "#333", fontSize: 12, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>Zalo: {siteContent.zalo} · {siteContent.address}</div>
        <div style={{ color: "#222", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>© 2026 92 KA MÊ RA</div>
      </footer>
    </div>
  );
}

// ── ADMIN LOGIN ──
function AdminLogin({ onLogin, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const check = () => {
    if (pw === "admin92") { onLogin(); }
    else { setErr(true); setShake(true); setTimeout(() => { setErr(false); setShake(false); }, 2000); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.99)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: BG, border: `1px solid ${BR}`, borderRadius: 16, padding: 48, width: "min(380px,90vw)", textAlign: "center", boxShadow: "0 0 80px rgba(201,168,76,0.08)", transform: shake ? "translateX(-5px)" : "none", transition: "transform .1s" }}>
        <Logo size={0.88} />
        <h3 style={{ color: TXT, fontWeight: 400, marginTop: 28, marginBottom: 6, fontFamily: "Georgia,serif", fontSize: 18, letterSpacing: 1 }}>Quản trị viên</h3>
        <p style={{ color: MUT, fontSize: 12, marginBottom: 28, letterSpacing: .5, fontFamily: "system-ui,sans-serif" }}>Nhập mật khẩu để truy cập dashboard</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} placeholder="••••••••" style={{ width: "100%", padding: "13px 16px", background: "#111", border: `2px solid ${err ? "#ef4444" : BR}`, borderRadius: 8, color: TXT, fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "monospace", letterSpacing: 3, textAlign: "center", transition: "border .2s" }} />
        {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>❌ Sai mật khẩu. Thử lại!</p>}
        <button onClick={check} style={{ width: "100%", padding: 13, background: G, color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginTop: 4, boxShadow: `0 0 20px ${G}44` }}>Đăng nhập</button>
        <button onClick={onBack} style={{ width: "100%", padding: 11, background: "none", color: MUT, border: `1px solid ${BR}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", marginTop: 10 }}>← Về trang chủ</button>
        <p style={{ color: "#2a2a2a", fontSize: 10, marginTop: 20, fontFamily: "monospace" }}>Demo password: admin92</p>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ──
function AdminDashboard({ cameras, setCameras, accessories, setAccessories, orders, setOrders, siteContent, setSiteContent, onBack }) {
  const [tab, setTab] = useState("overview");
  const [editCam, setEditCam] = useState(null);
  const [addCamOpen, setAddCamOpen] = useState(false);
  const [nc, setNc] = useState({ name: "", price: "", desc: "", qty: 1, status: "available", icon: "📷", images: [] });
  const [editAcc, setEditAcc] = useState(null);
  const [addAcc, setAddAcc] = useState(false);
  const [na, setNa] = useState({ name: "", price: "" });
  const [saved, setSaved] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Track new unseen orders
  const unseenCount = orders.filter(o => !o.seen).length;

  // Mark orders as seen when entering orders tab
  useEffect(() => {
    if (tab === "orders") {
      setOrders(prev => prev.map(o => ({ ...o, seen: true })));
    }
  }, [tab]);

  const todayRev = orders.filter(o => o.status !== "cancelled" && o.date === todayStr()).reduce((s, o) => s + o.total, 0);
  const monthRev = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const activeCount = orders.filter(o => ["active", "confirmed", "pending"].includes(o.status)).length;

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

  const TABS = [
    { k: "overview", l: "📊 Tổng quan" },
    { k: "cameras", l: "📷 Máy ảnh" },
    { k: "accessories", l: "🎒 Phụ kiện" },
    { k: "orders", l: "📋 Đơn thuê", badge: unseenCount },
    { k: "inventory", l: "📦 Tồn kho" },
    { k: "content", l: "✏️ Nội dung web" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 24, overflowX: "auto", padding: "0 0 0 0" }}>
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <STitle c="Dashboard tổng quan" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { l: "Doanh thu hôm nay", v: fmtVND(todayRev), c: "#22c55e", icon: "💰" },
                { l: "Doanh thu tháng", v: fmtVND(monthRev), c: G, icon: "📈" },
                { l: "Đơn đang xử lý", v: activeCount, c: "#60a5fa", icon: "📋" },
                { l: "Đơn mới (chưa xem)", v: unseenCount, c: "#ef4444", icon: "🔔" },
              ].map(s => (
                <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 10, padding: "20px 18px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ color: MUT, fontSize: 11, marginTop: 5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12, marginBottom: 14 }}>
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
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 9, marginBottom: 10 }}>
                            <input style={inp2} value={editCam.name} onChange={e => setEditCam(p => ({ ...p, name: e.target.value }))} placeholder="Tên máy" />
                            <input style={inp2} type="number" value={editCam.price} onChange={e => setEditCam(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} placeholder="Giá/ngày" />
                            <input style={inp2} type="number" min={1} value={editCam.qty} onChange={e => setEditCam(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} placeholder="SL" />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 9, marginBottom: 10 }}>
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

        {/* INVENTORY */}
        {tab === "inventory" && (
          <div>
            <STitle c="Quản lý tồn kho" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
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
            <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 10, overflow: "hidden" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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

      </div>
    </div>
  );
}

// ── STORAGE HELPERS ──
const STORE_KEYS = { cameras: "k92_cameras_v2", accessories: "k92_accessories_v2", orders: "k92_orders_v2", site: "k92_site_v2" };

async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch { /* no storage, fine */ }
}

// Store cameras: metadata in k92_cameras_v2 (no images), images per-camera key
async function saveCamerasToStorage(cams) {
  try {
    // 1. Save metadata (no images) first
    const meta = cams.map(c => ({ ...c, images: [] }));
    await window.storage.set(STORE_KEYS.cameras, JSON.stringify(meta));
    // 2. Save images one by one sequentially to avoid race conditions
    for (const c of cams) {
      try {
        await window.storage.set("k92img_" + c.id, JSON.stringify(c.images || []));
      } catch { /* image too large, skip */ }
    }
  } catch (e) { console.warn("saveCameras failed", e); }
}

async function loadCamerasFromStorage() {
  try {
    const r = await window.storage.get(STORE_KEYS.cameras);
    if (!r) return null;
    const meta = JSON.parse(r.value);
    const result = [];
    for (const c of meta) {
      try {
        const ir = await window.storage.get("k92img_" + c.id);
        result.push({ ...c, images: ir ? JSON.parse(ir.value) : [] });
      } catch {
        result.push({ ...c, images: [] });
      }
    }
    return result;
  } catch { return null; }
}

// ── ROOT ──
export default function App() {
  const [page, setPage] = useState("home");
  const [booking, setBooking] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [ready, setReady] = useState(false); // prevent flash before storage loads

  // 🔑 ALL SHARED STATE — single source of truth
  const [cameras, _setCameras] = useState(CAMS_INIT);
  const [accessories, _setAccessories] = useState(ACC_INIT);
  const [orders, _setOrders] = useState(ORDERS_INIT);
  const [siteContent, _setSiteContent] = useState(SITE_INIT);

  // ── Wrapped setters: update state AND persist to storage ──
  const setCameras = useCallback((updater) => {
    _setCameras(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Fire async save without blocking render
      saveCamerasToStorage(next).catch(e => console.warn("setCameras storage err", e));
      return next;
    });
  }, []);

  const setAccessories = useCallback((updater) => {
    _setAccessories(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storageSet(STORE_KEYS.accessories, next);
      return next;
    });
  }, []);

  const setOrders = useCallback((updater) => {
    _setOrders(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storageSet(STORE_KEYS.orders, next);
      return next;
    });
  }, []);

  const setSiteContent = useCallback((updater) => {
    _setSiteContent(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storageSet(STORE_KEYS.site, next);
      return next;
    });
  }, []);

  // ── On mount: load persisted data from storage ──
  useEffect(() => {
    (async () => {
      const [cams, accs, ords, site] = await Promise.all([
        loadCamerasFromStorage(),
        storageGet(STORE_KEYS.accessories),
        storageGet(STORE_KEYS.orders),
        storageGet(STORE_KEYS.site),
      ]);
      if (cams) _setCameras(cams);
      if (accs) _setAccessories(accs);
      if (ords) _setOrders(ords);
      if (site) _setSiteContent(site);
      setReady(true);
    })();
  }, []);

  // ── Sync from storage whenever page changes (home ↔ admin) ──
  useEffect(() => {
    if (ready) {
      (async () => {
        const [cams, accs, ords, site] = await Promise.all([
          loadCamerasFromStorage(),
          storageGet(STORE_KEYS.accessories),
          storageGet(STORE_KEYS.orders),
          storageGet(STORE_KEYS.site),
        ]);
        if (cams) _setCameras(cams);
        if (accs) _setAccessories(accs);
        if (ords) _setOrders(ords);
        if (site) _setSiteContent(site);
      })();
    }
  }, [page, ready]);

  const handleNewOrder = useCallback((order) => {
    setOrders(prev => [order, ...prev]);
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
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
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
      `}</style>

      {page === "home" && <CameraScene />}

      {page === "home" && (
        <HomePage
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          onBook={() => setBooking(true)}
          onAdmin={() => setPage("admin")}
        />
      )}

      {page === "admin" && !adminAuth && (
        <AdminLogin onLogin={() => setAdminAuth(true)} onBack={() => setPage("home")} />
      )}

      {page === "admin" && adminAuth && (
        <AdminDashboard
          cameras={cameras} setCameras={setCameras}
          accessories={accessories} setAccessories={setAccessories}
          orders={orders} setOrders={setOrders}
          siteContent={siteContent} setSiteContent={setSiteContent}
          onBack={() => setPage("home")}
        />
      )}

      {booking && (
        <BookingModal
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          onClose={() => setBooking(false)}
          onSubmit={handleNewOrder}
        />
      )}
    </div>
  );
}
