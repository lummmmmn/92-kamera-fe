/**
 * export-data.js
 * Kéo toàn bộ data từ Supabase kv_store → public/data.json
 * Chạy bởi GitHub Actions mỗi khi có thay đổi, hoặc chạy tay: node scripts/export-data.js
 *
 * Env cần có:
 *   SUPABASE_URL  — ví dụ: https://gtgjixgcillbjwnnkavx.supabase.co
 *   SUPABASE_KEY  — anon key (public ok, chỉ đọc)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SB_URL = process.env.SUPABASE_URL || "https://gtgjixgcillbjwnnkavx.supabase.co";
const SB_KEY = process.env.SUPABASE_KEY;

if (!SB_KEY) {
  console.error("❌ Thiếu SUPABASE_KEY trong env");
  process.exit(1);
}

const HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

// Keys cần export — khớp với STORE_KEYS trong App.jsx
const EXPORT_KEYS = {
  cameras:     "k92_cameras_v2",
  accessories: "k92_accessories_v2",
  orders:      "k92_orders_v2",
  site:        "k92_site_v2",
  feedbacks:   "k92_feedbacks_v1",
  albums:      "k92_albums_v1",
  discounts:   "k92_discounts_v1",
  // users KHÔNG export — chứa PII (phone, password hash)
};

async function fetchKey(key) {
  const url = `${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value,updated_at`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.warn(`⚠️  fetch ${key} → HTTP ${res.status}`);
    return { value: null, updatedAt: null };
  }
  const rows = await res.json();
  if (!rows.length) return { value: null, updatedAt: null };
  try {
    return {
      value: JSON.parse(rows[0].value),
      updatedAt: rows[0].updated_at,
    };
  } catch {
    return { value: null, updatedAt: null };
  }
}

// Tính sẵn availability cho mỗi camera × ngày tiếp theo 60 ngày
// User đọc file này → không cần tính runtime → 0 request Supabase
function buildAvailabilityCache(cameras, orders) {
  if (!cameras || !orders) return {};
  const active = ["pending", "confirmed", "active"];
  const sessions = ["morning", "afternoon"];
  const cache = {};

  // Lấy 60 ngày tới
  const dates = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Helper: check date trong order
  function isDateInOrder(dateStr, order) {
    if (!order.date) return false;
    const start = order.date;
    const days = order.days || 1;
    const end = new Date(start);
    end.setDate(end.getDate() + (days === 0.5 ? 0 : days - 1));
    const endStr = end.toISOString().slice(0, 10);
    return dateStr >= start && dateStr <= endStr;
  }

  function sessionConflicts(oSess, target) {
    if (oSess === "full" || target === "full") return true;
    return oSess === target;
  }

  function getOrderSession(o) {
    if (o.session) return o.session;
    if (o.shift)   return o.shift;
    return "full";
  }

  const activeOrders = orders.filter(o => active.includes(o.status));

  cameras.forEach(cam => {
    cache[cam.id] = {};
    dates.forEach(date => {
      cache[cam.id][date] = {};
      sessions.forEach(sess => {
        let used = 0;
        activeOrders.forEach(o => {
          if (!isDateInOrder(date, o)) return;
          if (!sessionConflicts(getOrderSession(o), sess)) return;
          if (o.cameras) {
            const c = o.cameras.find(c => c.id === cam.id);
            if (c) used += c.qty || 1;
          } else if (o.cameraId === cam.id) {
            used += 1;
          }
        });
        cache[cam.id][date][sess] = Math.max(0, (cam.qty || 1) - used);
      });
    });
  });

  return cache;
}

async function main() {
  console.log("🚀 Bắt đầu export data từ Supabase...\n");

  const results = {};
  const meta = {};

  for (const [name, key] of Object.entries(EXPORT_KEYS)) {
    process.stdout.write(`  📦 ${name.padEnd(14)}`);
    const { value, updatedAt } = await fetchKey(key);
    results[name] = value;
    meta[name] = { updatedAt, count: Array.isArray(value) ? value.length : (value ? 1 : 0) };
    console.log(
      value
        ? `✅  ${meta[name].count} items  (${updatedAt?.slice(0, 19) || "unknown time"})`
        : `⬛  (empty)`
    );
  }

  // Tính availability cache sẵn
  process.stdout.write("  📦 availability   ");
  const avail = buildAvailabilityCache(results.cameras, results.orders);
  const availCount = Object.keys(avail).length;
  console.log(`✅  ${availCount} cameras × 60 ngày`);

  // Lọc orders: chỉ giữ field cần thiết cho client (bỏ PII nếu cần)
  // Giữ nguyên để app hoạt động đúng — user đã login mới thấy đơn của họ
  const snapshot = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      keys: Object.keys(EXPORT_KEYS),
    },
    ...results,
    availabilityCache: avail,
  };

  // Ghi ra public/data.json — Vercel serve file này tĩnh
  const outDir = path.join(__dirname, "..", "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "data.json");

  const json = JSON.stringify(snapshot);
  fs.writeFileSync(outPath, json, "utf8");

  const sizeKB = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);
  console.log(`\n✅  Đã ghi → public/data.json  (${sizeKB} KB)`);
  console.log(`   Vercel sẽ serve file này tĩnh, CDN cache toàn cầu.`);
  console.log(`   1.000 người xem = vẫn chỉ 1 file, 0 request Supabase.\n`);
}

main().catch(err => {
  console.error("❌ Export thất bại:", err.message);
  process.exit(1);
});
