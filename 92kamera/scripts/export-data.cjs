// scripts/sync-data.js
// Đọc kv_store (7 key) + gallery_photos (limit 100) từ Firestore, ghi ra data.json tĩnh.
// Chạy bởi .github/workflows/sync-data.yml mỗi 15 phút.
//
// Chi phí cố định mỗi lần chạy: 7 reads (kv_store) + tối đa 100 reads (gallery_photos)
// = ~107 reads. x96 lần/ngày (24h / 15p) ≈ 10.300 reads/ngày — KHÔNG phụ thuộc số khách.
//
// orders  → KHÔNG export, khách fetch Firestore trực tiếp (cần fresh tuyệt đối, tránh double booking)
// users   → KHÔNG export (PII)
// photos  → export NHƯNG limit 100 để tránh đọc hết collection mỗi 15 phút

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ── CONFIG ──
const KV_COLLECTION = "kv_store";
const GALLERY_COLLECTION = "gallery_photos";
const PHOTO_LIMIT = 100;
const OUT_PATH = path.join(__dirname, "..", "public", "data.json"); // Vite copy public/* ra root khi build

// 7 key kv_store cần export ra data.json (khớp STORE_KEYS trong app, trừ orders + users)
const EXPORT_KEYS = {
  cameras: "k92_cameras_v2",
  accessories: "k92_accessories_v2",
  site: "k92_site_v2",
  feedbacks: "k92_feedbacks_v1",
  discounts: "k92_discounts_v1",
  albums: "k92_albums_v1",
  deliveryFees: "k92_delivery_fees_v1",
};

// ── INIT FIREBASE ADMIN ──
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) {
  console.error("[sync-data] Thiếu env FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

async function fetchKvKey(docId) {
  const snap = await db.collection(KV_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  try {
    return JSON.parse(snap.data().value);
  } catch (e) {
    console.warn(`[sync-data] Key "${docId}" parse JSON lỗi:`, e.message);
    return null;
  }
}

async function fetchGalleryPhotos() {
  const snap = await db
    .collection(GALLERY_COLLECTION)
    .orderBy("uploaded_at", "desc")
    .limit(PHOTO_LIMIT)
    .get();
  return snap.docs.map((d) => d.data());
}

async function main() {
  const t0 = Date.now();
  const result = {};

  // 7 reads — chạy song song
  const keyNames = Object.keys(EXPORT_KEYS);
  const values = await Promise.all(keyNames.map((k) => fetchKvKey(EXPORT_KEYS[k])));
  keyNames.forEach((k, i) => {
    result[k] = values[i];
  });

  // Tối đa 100 reads
  result.photos = await fetchGalleryPhotos();

  result._generatedAt = new Date().toISOString();

  fs.writeFileSync(OUT_PATH, JSON.stringify(result));

  const reads = keyNames.length + result.photos.length;
  console.log(
    `[sync-data] OK — ${reads} Firestore reads — ${Date.now() - t0}ms — ghi vào ${OUT_PATH}`
  );
}

main().catch((err) => {
  console.error("[sync-data] Lỗi:", err);
  process.exit(1);
});
