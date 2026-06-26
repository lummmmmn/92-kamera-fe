import { dateAddDays, isDateInOrder } from "./format.js";

// ── SESSION LOGIC ──

/**
 * Lấy session của đơn hàng
 * @returns {"morning"|"afternoon"|"full"}
 */
export const getOrderSession = (o) => {
  if (o.session) return o.session; // đơn mới
  if (o.shift)   return o.shift;   // đơn cũ
  return "full";
};

/**
 * Kiểm tra xung đột session
 */
export const sessionConflicts = (oSession, targetSession) => {
  if (oSession === "full" || targetSession === "full") return true;
  return oSession === targetSession;
};

// ── CAMERA AVAILABILITY ──

const ACTIVE_STATUSES = ["pending", "confirmed", "active"];

/**
 * Số lượng máy ảnh còn lại cho 1 ngày + session cụ thể
 */
export const getAvailQty = (camId, camQty, orders, targetDate, targetSession) => {
  let used = 0;
  orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).forEach((o) => {
    if (targetDate && !isDateInOrder(targetDate, o)) return;
    if (
      targetDate &&
      targetSession &&
      !sessionConflicts(getOrderSession(o), targetSession)
    )
      return;
    if (o.cameras) {
      const c = o.cameras.find((c) => c.id === camId);
      if (c) used += c.qty || 1;
    } else if (o.cameraId === camId) {
      used += 1;
    }
  });
  return Math.max(0, camQty - used);
};

/**
 * Số lượng phụ kiện còn lại cho 1 ngày + session
 */
export const getAccAvailQty = (
  accName,
  accQty,
  orders,
  targetDate,
  targetSession
) => {
  let used = 0;
  orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).forEach((o) => {
    if (targetDate && !isDateInOrder(targetDate, o)) return;
    if (
      targetDate &&
      targetSession &&
      !sessionConflicts(getOrderSession(o), targetSession)
    )
      return;
    if (o.accessoriesDetail) {
      const d = o.accessoriesDetail.find((x) => x.name === accName);
      if (d) used += d.qty || 1;
    } else if (o.accessories && o.accessories.includes(accName)) {
      used += 1;
    }
  });
  return Math.max(0, accQty - used);
};

/**
 * Trả về { morning, afternoon } available qty cho 1 ngày
 */
export const getAvailability = (itemId, itemTotal, orders, date) => {
  let usedMorning = 0;
  let usedAfternoon = 0;
  orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status) && isDateInOrder(date, o))
    .forEach((o) => {
      const sess = getOrderSession(o);
      const qty = (() => {
        if (o.cameras) {
          const c = o.cameras.find((c) => c.id === itemId);
          return c ? c.qty || 1 : 0;
        }
        return o.cameraId === itemId ? 1 : 0;
      })();
      if (sess === "full")      { usedMorning += qty; usedAfternoon += qty; }
      if (sess === "morning")   { usedMorning += qty; }
      if (sess === "afternoon") { usedAfternoon += qty; }
    });
  return {
    morning:   Math.max(0, itemTotal - usedMorning),
    afternoon: Math.max(0, itemTotal - usedAfternoon),
  };
};

/**
 * Item status badge: "trống" | "còn ít" | "hết"
 */
export const getItemStatus = (morning, afternoon, itemTotal = 2) => {
  if (morning <= 0 && afternoon <= 0) return "hết";
  if (itemTotal > 1 && (morning <= 1 || afternoon <= 1)) return "còn ít";
  return "trống";
};
