import { dateAddDays, isDateInOrder } from "./format.js";

// ── SESSION LOGIC (giữ nguyên cho đơn cũ / chỗ khác còn dùng) ──
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

// ── CA MODEL MỚI: 3 CA/NGÀY ĐỘC LẬP (ca1 07-12 / ca2 12-17 / ca3 17-20) ──

/**
 * Đơn cũ (chỉ có session/shift cho cả khoảng ngày) → suy ra ca tương đương
 * để không phá vỡ tồn kho đã đặt trước đó. Suy diễn bảo thủ (chặn rộng hơn
 * một chút để tránh double-book):
 *  - "morning"   (6h-12h)  → chiếm ca1
 *  - "afternoon" (14h-20h) → chiếm ca2 + ca3
 *  - "full" / không rõ    → chiếm cả 3 ca
 */
const legacyCaForSession = (sess) => {
  if (sess === "morning") return ["ca1"];
  if (sess === "afternoon") return ["ca2", "ca3"];
  return ["ca1", "ca2", "ca3"];
};

/**
 * Lấy lịch ca chi tiết của 1 đơn hàng.
 * Đơn mới lưu sẵn o.caSchedule = [{date,ca}]. Đơn cũ tự suy ra.
 */
export const getOrderCaSchedule = (o) => {
  if (o.caSchedule && o.caSchedule.length) return o.caSchedule;
  if (!o.date || !o.days) return [];
  const caList = legacyCaForSession(getOrderSession(o));
  const nDays = o.days < 1 ? 1 : Math.ceil(o.days);
  const out = [];
  for (let i = 0; i < nDays; i++) {
    const ds = dateAddDays(o.date, i);
    caList.forEach((ca) => out.push({ date: ds, ca }));
  }
  return out;
};

/**
 * Số lượng máy còn lại cho 1 ngày + 1 ca cụ thể (độc lập với 2 ca kia)
 */
export const getAvailQtyByCa = (camId, camQty, orders, targetDate, targetCa) => {
  let used = 0;
  orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).forEach((o) => {
    const hit = getOrderCaSchedule(o).some((s) => s.date === targetDate && s.ca === targetCa);
    if (!hit) return;
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
 * Số lượng phụ kiện còn lại cho 1 ngày + 1 ca cụ thể
 */
export const getAccAvailQtyByCa = (accName, accQty, orders, targetDate, targetCa) => {
  let used = 0;
  orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).forEach((o) => {
    const hit = getOrderCaSchedule(o).some((s) => s.date === targetDate && s.ca === targetCa);
    if (!hit) return;
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
 * Kiểm tra 1 ngày còn ca nào trống không, cho danh sách máy đã chọn.
 * Dùng để tô màu lịch (không biết trước khách sẽ chọn ca nào nên check cả 3 ca).
 * @returns {"ok"|"low"|"full"}
 */
export const getDayCaStatus = (camsList, orders, date) => {
  const activeOrds = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  let anyFull = false;
  let anyLow = false;
  ["ca1", "ca2", "ca3"].forEach((ca) => {
    camsList.forEach(({ id, qty: need, camQty }) => {
      const avail = getAvailQtyByCa(id, camQty, activeOrds, date, ca);
      if (avail < need) anyFull = true;
      else if (avail <= 1 && camQty > 1) anyLow = true;
    });
  });
  return anyFull ? "full" : anyLow ? "low" : "ok";
};

/**
 * Cảnh báo khi khách chọn 1 ca mà ca liền trước/sau (cùng ngày) đã có khách thuê
 * → máy có thể nhận trễ 1-2 tiếng vì người trước trả trễ.
 */
export const getAdjacentCaWarning = (camsList, orders, date, caIdx) => {
  const activeOrds = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const isCaTaken = (idx) => {
    if (idx < 1 || idx > 3 || !camsList.length) return false;
    const caKey = `ca${idx}`;
    return camsList.some(
      ({ id, camQty }) => getAvailQtyByCa(id, camQty, activeOrds, date, caKey) < camQty
    );
  };
  if (isCaTaken(caIdx - 1) || isCaTaken(caIdx + 1)) {
    return "⚠️ Ca liền kề đã có khách thuê — máy có thể nhận trễ 1–2 tiếng so với dự kiến do người trước trả trễ. Bạn cân nhắc chọn ca khác để tránh ảnh hưởng lịch của mình.";
  }
  return null;
};
