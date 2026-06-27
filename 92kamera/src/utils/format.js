// ── FORMAT HELPERS ──

/**
 * Format số tiền VNĐ
 * @param {number} n
 * @returns {string} e.g. "200.000 ₫"
 */
export const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN").format(n || 0) + " ₫";

/**
 * Format số ngày / buổi thuê
 * @param {number} d - số ngày (0.5 = 1 buổi)
 * @param {string} shiftOrSession - "morning" | "afternoon" | "full"
 */
export const fmtDays = (d, shiftOrSession) => {
  if (d === 0.5) {
    if (shiftOrSession === "morning")   return "🌅 Ca sáng (6h–12h)";
    if (shiftOrSession === "afternoon") return "🌇 Ca chiều (14h–20h)";
    return "1 buổi";
  }
  return `${d} ngày`;
};

/**
 * Trả về ngày hôm nay dạng "YYYY-MM-DD"
 */
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Cộng thêm n ngày vào dateStr
 * - n < 1 (buổi): cùng ngày
 * - n >= 1: cộng đúng n ngày
 */
export const dateAddDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + (n < 1 ? 0 : Math.ceil(n)));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Kiểm tra dateStr có nằm trong khoảng thuê của đơn o không
 */
export const isDateInOrder = (dateStr, o) => {
  if (!o.date || !o.days) return false;
  const endDate = dateAddDays(o.date, o.days);
  if (o.days < 1) return dateStr >= o.date && dateStr <= endDate;
  return dateStr >= o.date && dateStr < endDate;
};

/**
 * Tạo ID đơn hàng mới
 * Format: #92KXXXX-YY (XXXX = số thứ tự, YY = 2-hex random)
 */
export const newOrderId = (existingOrders = []) => {
  const existingIds = new Set((existingOrders || []).map((o) => o.id));
  let maxNum = 3;
  (existingOrders || []).forEach((o) => {
    if (o.id && o.id.startsWith("#92K")) {
      const n = parseInt(o.id.slice(4), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  const seq = String(maxNum + 1).padStart(4, "0");
  const rnd = () => Math.random().toString(16).slice(2, 4).toUpperCase();
  let candidate = `#92K${seq}-${rnd()}`;
  let tries = 0;
  while (existingIds.has(candidate) && tries++ < 16)
    candidate = `#92K${seq}-${rnd()}`;
  return candidate;
};

/**
 * Decode Google JWT token payload
 */
export const decodeGoogleJWT = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return {
      googleId: decoded.sub,
      email:    decoded.email,
      name:     decoded.name,
      picture:  decoded.picture,
    };
  } catch {
    return null;
  }
};

/**
 * Tạo link CDN Cloudinary với các transformation
 * @param {string} url 
 * @param {"thumb"|"full"} mode 
 */
export function cdnUrl(url, mode = "thumb") {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const t = mode === "full"
    ? "w_2000,q_auto:best,f_auto"
    : "w_800,q_100,e_sharpen:60,f_auto";
  return url.replace("/upload/", `/upload/${t}/`);
}

