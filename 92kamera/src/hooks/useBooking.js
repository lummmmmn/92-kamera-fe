import { useState, useEffect, useRef } from "react";
import { todayStr, dateAddDays } from "../utils/format.js";
import { getAvailQty, getAccAvailQty } from "../utils/availability.js";
import { STORE_KEYS, DURATIONS, DELIVERY_AREAS_DEFAULT } from "../lib/constants.js";
import { getOrders, getDiscounts } from "../api/index.js";
import { useCreateOrder } from "./useOrders.js";

export function useBooking({
  cameras,
  accessories,
  siteContent,
  discounts,
  setDiscounts,
  deliveryFees,
  onClose,
  onSubmit,
  loggedUser,
  preselectedCamId,
  orders: initialOrders,
  preselectedCams,
  preselectedAccs,
  preselectedDate,
  preselectedDays,
  noDate,
}) {
  const hasQuickSelect = preselectedDate && preselectedDays && (
    (preselectedCams && Object.keys(preselectedCams).length > 0) ||
    (preselectedAccs && Object.keys(preselectedAccs).length > 0)
  );

  const initialStep = noDate ? 2 : !hasQuickSelect ? 1 : 3;
  const [step, setStep] = useState(initialStep);
  const [liveOrdersForCheck, setLiveOrdersForCheck] = useState(initialOrders || []);

  // Poll fresh orders at step 2
  useEffect(() => {
    if (step !== 2) return;
    const fetchFresh = () =>
      getOrders()
        .then((fresh) => {
          if (fresh && Array.isArray(fresh)) setLiveOrdersForCheck(fresh);
        })
        .catch(() => {});
    fetchFresh();
    const iv = setInterval(fetchFresh, 30000);
    return () => clearInterval(iv);
  }, [step]);

  const [expandedCam, setExpandedCam] = useState(null);
  const [camImgIdx, setCamImgIdx] = useState({});

  const [selCams, setSelCams] = useState(() => {
    if (preselectedCams && Object.keys(preselectedCams).length > 0) {
      const filtered = {};
      Object.entries(preselectedCams).forEach(([id, qty]) => {
        const cam = cameras.find((c) => String(c.id) === String(id));
        if (cam && cam.status === "available") filtered[cam.id] = qty;
      });
      return filtered;
    }
    if (!preselectedCamId) return {};
    const cam = cameras.find((c) => c.id === preselectedCamId);
    if (!cam || cam.status !== "available") return {};
    return { [preselectedCamId]: 1 };
  });

  const [selDur, setSelDur] = useState(() => {
    if (!preselectedDays) return null;
    const found = DURATIONS.find((d) => d.days === preselectedDays && d.session === "full");
    return found || { days: preselectedDays, session: "full", label: `${preselectedDays} ngày` };
  });

  const [customDays, setCustomDays] = useState("");
  const [pickDate, setPickDate] = useState(preselectedDate || todayStr());

  const [selAcc, setSelAcc] = useState(() => {
    if (preselectedAccs && Object.keys(preselectedAccs).length > 0) return { ...preselectedAccs };
    return {};
  });

  const [info, setInfo] = useState({
    name: loggedUser?.displayName || loggedUser?.name || "",
    phone: loggedUser?.phone || "",
    zalo: loggedUser?.zalo || loggedUser?.phone || "",
    address: loggedUser?.address || "",
    note: "",
  });

  // Delivery states
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryWard, setDeliveryWard] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("Núi Thành");
  const [deliveryPickup, setDeliveryPickup] = useState("home");
  const [deliveryReturn, setDeliveryReturn] = useState("home");
  const [selfPickup, setSelfPickup] = useState(false);

  const deliveryType = deliveryWard
    ? deliveryPickup === "home" && deliveryReturn === "home"
      ? "both"
      : deliveryPickup === "home"
      ? "deliver"
      : deliveryReturn === "home"
      ? "pickup"
      : ""
    : "";

  const deliveryFeeData = (deliveryFees || DELIVERY_AREAS_DEFAULT).find((x) => x.name === deliveryWard);
  const deliveryFee2Way = deliveryFeeData ? deliveryFeeData.fee : 0;
  const deliveryFeeCalc = selfPickup
    ? 0
    : !deliveryWard
    ? 0
    : deliveryPickup === "home" && deliveryReturn === "home"
    ? deliveryFee2Way
    : deliveryPickup === "home" || deliveryReturn === "home"
    ? Math.round(deliveryFee2Way / 2)
    : 0;

  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Discount states
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [discountMsg, setDiscountMsg] = useState(null);
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const discountInFlight = useRef(false);

  const appliedRental = appliedDiscounts.find((d) => d.scope === "rental") || null;
  const appliedDelivery = appliedDiscounts.find((d) => d.scope === "delivery") || null;
  const appliedTotal = appliedDiscounts.find((d) => d.scope === "total") || null;

  const days = selDur ? selDur.days : parseFloat(customDays) || 0;
  const selSession = selDur ? selDur.session : days >= 1 ? "full" : null;

  // Auto-clamp camera quantities
  useEffect(() => {
    if (!pickDate || !days || !selSession) return;
    const activeOrds = liveOrdersForCheck.filter((o) => !["cancelled", "completed"].includes(o.status));
    const sess = selSession || "full";
    const dateRange = [];
    if (days < 1) {
      dateRange.push(pickDate);
    } else {
      for (let i = 0; i < Math.ceil(days); i++) dateRange.push(dateAddDays(pickDate, i));
    }

    setSelCams((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((camId) => {
        const cam = cameras.find((c) => String(c.id) === String(camId));
        if (!cam) return;
        const minAvail = Math.min(...dateRange.map((d) => getAvailQty(cam.id, cam.qty || 1, activeOrds, d, sess)));
        if (minAvail > 0 && next[camId] > minAvail) {
          next[camId] = minAvail;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pickDate, selSession, days, liveOrdersForCheck, cameras]);

  // Auto-remove out-of-stock accessories
  useEffect(() => {
    if (!pickDate || !days) return;
    const activeOrds = liveOrdersForCheck.filter((o) => !["cancelled", "completed"].includes(o.status));
    const sess = selSession || "full";
    const dateRange = [];
    if (days < 1) {
      dateRange.push(pickDate);
    } else {
      for (let i = 0; i < Math.ceil(days); i++) dateRange.push(dateAddDays(pickDate, i));
    }

    setSelAcc((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((name) => {
        const acc = accessories.find((a) => a.name === name);
        if (!acc) return;
        const minAvail = Math.min(...dateRange.map((d) => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
        if (minAvail > 0 && next[name] > minAvail) {
          next[name] = minAvail;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pickDate, selSession, days, liveOrdersForCheck, accessories]);

  const availCams = cameras.filter((c) => c.status === "available");
  const selectedCamList = availCams.filter((c) => selCams[c.id] > 0);
  const preselectedUnavailable = preselectedCamId
    ? !cameras.find((c) => c.id === preselectedCamId && c.status === "available")
    : false;
  const totalCamSelected = Object.values(selCams).reduce((s, q) => s + (q || 0), 0);

  const camCost = selectedCamList.reduce((s, c) => s + c.price * (selCams[c.id] || 0) * days, 0);
  const accCost = Object.entries(selAcc).reduce((s, [name, qty]) => {
    const a = accessories.find((x) => x.name === name);
    if (!a) return s;
    const unitPrice = days === 0.5 ? (a.priceShift != null ? a.priceShift : Math.round(a.price / 2)) : a.price;
    const multiplier = days === 0.5 ? 1 : days;
    return s + unitPrice * qty * multiplier;
  }, 0);
  const subtotal = camCost + accCost;

  // Discount validation effect — tự huỷ mã khi điều kiện không còn thoả
  useEffect(() => {
    if (appliedDiscounts.length === 0) return;
    const allDiscs = Array.isArray(discounts) ? discounts : [];
    setAppliedDiscounts((prev) => {
      let changed = false;
      const next = prev.filter((ad) => {
        if (ad.scope === "delivery" && deliveryFeeCalc === 0) {
          setDiscountMsg({ type: "err", text: `Không có phí giao nhận — mã ${ad.code} đã bị huỷ` });
          changed = true;
          return false;
        }
        const disc = allDiscs.find((d) => d.id === ad.id);
        if (!disc) return true;
        if (disc.minOrder && subtotal < disc.minOrder) {
          setDiscountMsg({ type: "err", text: `Đơn giảm xuống dưới ${new Intl.NumberFormat("vi-VN").format(disc.minOrder)}đ — mã ${ad.code} đã bị huỷ` });
          changed = true;
          return false;
        }
        // Auto-huỷ nếu số ngày thuê giảm xuống dưới minDays
        if (disc.minDays && days < disc.minDays) {
          setDiscountMsg({ type: "err", text: `Cần thuê tối thiểu ${disc.minDays} ngày — mã ${ad.code} đã bị huỷ` });
          changed = true;
          return false;
        }
        return true;
      });
      return changed ? next : prev;
    });
  }, [subtotal, deliveryFeeCalc, days, discounts, appliedDiscounts.length]);

  useEffect(() => {
    if (appliedDiscounts.length >= 2) {
      setDiscountExpanded(false);
    }
  }, [appliedDiscounts.length]);

  const rentalDiscountAmt = appliedRental
    ? Math.min(
        appliedRental.type === "percent"
          ? Math.round((subtotal * appliedRental.value) / 100)
          : appliedRental.discountAmt,
        subtotal
      )
    : 0;

  const deliveryDiscountAmt = appliedDelivery
    ? Math.min(
        appliedDelivery.type === "percent"
          ? Math.round((deliveryFeeCalc * appliedDelivery.value) / 100)
          : appliedDelivery.discountAmt,
        deliveryFeeCalc
      )
    : 0;

  const totalDiscountAmt = appliedTotal
    ? Math.min(
        appliedTotal.type === "percent"
          ? Math.round(((subtotal + deliveryFeeCalc) * appliedTotal.value) / 100)
          : appliedTotal.discountAmt,
        subtotal + deliveryFeeCalc
      )
    : 0;

  const discountAmt = rentalDiscountAmt + deliveryDiscountAmt + totalDiscountAmt;
  const total = Math.max(0, subtotal - rentalDiscountAmt + deliveryFeeCalc - deliveryDiscountAmt - totalDiscountAmt);

  const applyDiscount = async () => {
    if (discountInFlight.current) return false;
    discountInFlight.current = true;
    setDiscountLoading(true);
    setDiscountMsg(null);
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountMsg({ type: "err", text: "Nhập mã giảm giá trước" });
      discountInFlight.current = false;
      setDiscountLoading(false);
      return false;
    }
    try {
      let allDiscs = [];
      try {
        const freshDiscs = await getDiscounts();
        allDiscs = Array.isArray(freshDiscs) ? freshDiscs : Array.isArray(discounts) ? discounts : [];
      } catch {
        allDiscs = Array.isArray(discounts) ? discounts : [];
      }

      const disc = allDiscs.find((d) => d.code.toUpperCase() === code && d.active === true);
      if (!disc) {
        setDiscountMsg({ type: "err", text: "Mã không tồn tại hoặc đã bị tắt" });
        return false;
      }

      if (appliedDiscounts.some((ad) => ad.code === disc.code.toUpperCase())) {
        setDiscountMsg({ type: "err", text: "Mã này đã được áp dụng rồi" });
        return false;
      }

      // Backend chỉ lưu voucherScope = "rental"/"delivery"; mã "giảm tổng đơn" được đánh dấu
      // bằng field phụ totalScope (xem ghi chú trong DiscountsPanel.jsx)
      const scope = disc.totalScope ? "total" : disc.voucherScope === "delivery" ? "delivery" : "rental";

      if (appliedDiscounts.some((ad) => ad.scope === scope)) {
        const scopeLabel = scope === "delivery" ? "giảm phí giao nhận" : scope === "total" ? "giảm tổng đơn" : "giảm tiền thuê";
        setDiscountMsg({ type: "err", text: `Đã có mã ${scopeLabel} rồi. Mỗi loại chỉ dùng 1 mã.` });
        return false;
      }

      // Mã giảm tổng đơn không dùng chung với mã giảm thuê/giảm ship — tránh giảm trùng trên cùng 1 khoản tiền
      if (scope === "total" && appliedDiscounts.length > 0) {
        setDiscountMsg({ type: "err", text: "Mã giảm tổng đơn không dùng chung với mã giảm thuê/giảm ship khác. Vui lòng gỡ mã hiện tại trước." });
        return false;
      }
      if (scope !== "total" && appliedDiscounts.some((ad) => ad.scope === "total")) {
        setDiscountMsg({ type: "err", text: "Đang dùng mã giảm tổng đơn — không thể áp dụng thêm mã giảm thuê/giảm ship." });
        return false;
      }

      if (appliedDiscounts.length >= 2) {
        setDiscountMsg({ type: "err", text: "Đã đủ 2 mã giảm giá (1 giảm thuê + 1 giảm ship)" });
        return false;
      }

      const base = scope === "delivery" ? deliveryFeeCalc : scope === "total" ? subtotal + deliveryFeeCalc : subtotal;

      if (disc.maxUse && disc.usedCount >= disc.maxUse) {
        setDiscountMsg({ type: "err", text: "Mã này đã dùng hết số lượt" });
        return false;
      }
      if (disc.minOrder && subtotal < disc.minOrder) {
        setDiscountMsg({ type: "err", text: `Đơn hàng tối thiểu ${new Intl.NumberFormat("vi-VN").format(disc.minOrder)}đ mới được áp dụng mã này` });
        return false;
      }
      // Check số ngày thuê tối thiểu
      if (disc.minDays && days < disc.minDays) {
        setDiscountMsg({ type: "err", text: `Mã này yêu cầu thuê tối thiểu ${disc.minDays} ngày (hiện tại: ${days} ngày)` });
        return false;
      }

      if (scope === "delivery" && deliveryFeeCalc === 0) {
        setDiscountMsg({ type: "err", text: "Mã này dành cho phí giao nhận. Vui lòng chọn dịch vụ giao nhận trước." });
        return false;
      }

      // Check required badge
      if (disc.requiredBadge && disc.requiredBadge !== "none") {
        const userOrders = (Array.isArray(liveOrdersForCheck) ? liveOrdersForCheck : []).filter(
          (o) =>
            (loggedUser?.email && o.userEmail === loggedUser.email) ||
            (loggedUser?.phone && o.userPhone === loggedUser.phone) ||
            (info.phone && o.phone === info.phone)
        );
        const validUserOrders = userOrders.filter((o) => o.status !== "cancelled");
        const totalDaysUser = validUserOrders.reduce((s, o) => s + (o.days || 0), 0);
        const totalSpentUser = validUserOrders.reduce((s, o) => s + (o.total || 0), 0);
        const orderCount = validUserOrders.length;

        const hasDong = orderCount >= 1;
        const hasBac = orderCount >= 3;
        const hasVang = orderCount >= 5;
        const hasDaiGia = totalDaysUser >= 30;
        const hasVip = totalSpentUser >= 5000000;
        const hasKimCuong = totalSpentUser >= 10000000;

        const badgeMap = { dong: hasDong, bac: hasBac, vang: hasVang, daigiadagia: hasDaiGia, vip: hasVip, kimcuong: hasKimCuong };
        const badgeName = {
          dong: "🥉 Khách Đồng (cần 1+ đơn)",
          bac: "🥈 Khách Bạc (cần 3+ đơn)",
          vang: "🥇 Khách Vàng (cần 5+ đơn)",
          daigiadagia: "👑 Đại Gia (cần 30+ ngày thuê)",
          vip: "💎 Khách VIP (cần chi 5,000,000đ+)",
          kimcuong: "💠 Kim Cương (cần chi 10,000,000đ+)",
        };

        if (!badgeMap[disc.requiredBadge]) {
          setDiscountMsg({ type: "err", text: `🏅 Mã này chỉ dành cho ${badgeName[disc.requiredBadge]}. Hãy thuê thêm để mở khoá!` });
          return false;
        }
      }

      const amt = disc.type === "percent" ? Math.round((base * disc.value) / 100) : disc.value;
      const scopeLabel = scope === "delivery" ? "🚗 Giảm ship" : scope === "total" ? "💰 Giảm tổng đơn" : "🎞️ Giảm thuê";
      setAppliedDiscounts((prev) => [
        ...prev,
        { code: disc.code.toUpperCase(), type: disc.type, value: disc.value, discountAmt: amt, id: disc.id, scope, minDays: disc.minDays || 0 },
      ]);
      setDiscountCode("");
      setDiscountMsg({
        type: "ok",
        text: `${scopeLabel} áp dụng! Giảm ${disc.type === "percent" ? disc.value + "%" : new Intl.NumberFormat("vi-VN").format(disc.value) + "đ"}`,
      });
      return true;
    } finally {
      discountInFlight.current = false;
      setDiscountLoading(false);
    }
  };

  const removeDiscount = (code) => {
    if (code) {
      setAppliedDiscounts((prev) => prev.filter((d) => d.code !== code));
    } else {
      setAppliedDiscounts([]);
    }
    setDiscountCode("");
    setDiscountMsg(null);
  };

  const returnInfo = () => {
    if (!pickDate || !days) return null;
    const fmtDate = (ds) => {
      const d = new Date(ds + "T00:00:00");
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    if (days === 0.5) {
      const isM = selSession === "morning";
      const isA = selSession === "afternoon";
      return {
        pickTime: isM ? "06:00" : isA ? "14:00" : "--:--",
        pickDate: fmtDate(pickDate),
        dropTime: isM ? "12:00" : isA ? "20:00" : "--:--",
        dropDate: fmtDate(pickDate),
        totalH: 6,
        totalLabel: "6 giờ (1 buổi)",
      };
    }

    const totalH = Math.ceil(days) * 24;
    const endDs = dateAddDays(pickDate, days);
    return {
      pickTime: "12:00",
      pickDate: fmtDate(pickDate),
      dropTime: "12:00",
      dropDate: fmtDate(endDs),
      totalH,
      totalLabel: `${totalH} giờ (${Math.ceil(days)} ngày)`,
    };
  };

  const toggleCam = (cam) => {
    setSelCams((p) => {
      const cur = p[cam.id] || 0;
      if (cur > 0) {
        const n = { ...p };
        delete n[cam.id];
        return n;
      }
      return { ...p, [cam.id]: 1 };
    });
  };

  const setCamQty = (camId, qty, maxQty) => {
    const q = Math.max(0, Math.min(maxQty, parseInt(qty) || 0));
    setSelCams((p) => {
      if (q === 0) {
        const n = { ...p };
        delete n[camId];
        return n;
      }
      return { ...p, [camId]: q };
    });
  };

  const toggleAcc = (name) => {
    setSelAcc((p) => {
      if (p[name]) {
        const n = { ...p };
        delete n[name];
        return n;
      }
      return { ...p, [name]: 1 };
    });
  };

  const setAccQty = (name, qty, maxQty = 999) => {
    const q = Math.max(0, Math.min(maxQty, parseInt(qty) || 0));
    setSelAcc((p) => {
      if (q === 0) {
        const n = { ...p };
        delete n[name];
        return n;
      }
      return { ...p, [name]: q };
    });
  };

  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitKeyRef = useRef("sk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));

  const createOrderMutation = useCreateOrder();

  const handleFinish = async () => {
    if (submitting) return;
    const hasAcc = Object.values(selAcc).some((q) => (q || 0) > 0);
    if (selectedCamList.length === 0 && !hasAcc) {
      setSubmitError("❌ Vui lòng chọn ít nhất 1 máy ảnh hoặc phụ kiện trước khi đặt.");
      return;
    }
    if (!pickDate) {
      setSubmitError("❌ Vui lòng chọn ngày thuê ở bước 2.");
      return;
    }
    if (!days || days <= 0) {
      setSubmitError("❌ Vui lòng chọn thời lượng thuê ở bước 2.");
      return;
    }
    if (!selDur && (days < 1 || Math.abs(days * 2 - Math.round(days * 2)) > 0.0001)) {
      setSubmitError("❌ Số ngày tự nhập phải từ 1 ngày trở lên và theo bội số 0.5 (VD: 1, 1.5, 2).");
      return;
    }
    const phoneClean = info.phone.replace(/\s/g, "");
    if (!/^(0|\+84)\d{9}$/.test(phoneClean)) {
      setSubmitError("❌ Số điện thoại không hợp lệ. Vui lòng nhập đúng format (VD: 0901234567).");
      return;
    }
    if (pickDate < todayStr()) {
      setSubmitError("❌ Ngày thuê đã qua. Vui lòng chọn lại từ hôm nay.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const sess = selSession || "full";
      const submitDateRange = [];
      if (days < 1) {
        submitDateRange.push(pickDate);
      } else {
        for (let i = 0; i < Math.ceil(days); i++) submitDateRange.push(dateAddDays(pickDate, i));
      }

      // Re-fetch orders list for final stock validation
      const freshOrders = await getOrders();
      const activeOrds = (freshOrders || []).filter((o) => !["cancelled", "completed"].includes(o.status));

      for (const cam of selectedCamList) {
        const need = selCams[cam.id] || 1;
        const minAvail = Math.min(...submitDateRange.map((d) => getAvailQty(cam.id, cam.qty || 1, activeOrds, d, sess)));
        if (minAvail < need) {
          setSubmitError(`❌ "${cam.name}" vừa hết trong khoảng này (còn ${minAvail}). Vui lòng chọn ngày khác.`);
          setSubmitting(false);
          return;
        }
      }

      for (const [name, qty] of Object.entries(selAcc)) {
        if (!qty || qty <= 0) continue;
        const acc = accessories.find((a) => a.name === name);
        if (!acc) continue;
        const minAvail = Math.min(...submitDateRange.map((d) => getAccAvailQty(name, acc.qty || 0, activeOrds, d, sess)));
        if (minAvail < qty) {
          setSubmitError(`❌ Phụ kiện "${name}" vừa hết trong khoảng này (còn ${minAvail}). Vui lòng điều chỉnh.`);
          setSubmitting(false);
          return;
        }
      }

      // Build order body
      const camNames = selectedCamList.map((c) => `${c.name}${selCams[c.id] > 1 ? ` x${selCams[c.id]}` : ""}`).join(", ");
      const accNames = Object.entries(selAcc).map(([n, q]) => (q > 1 ? `${n} x${q}` : n));
      const firstCam = selectedCamList[0];

      const orderData = {
        submitKey: submitKeyRef.current,
        cameraName: camNames,
        cameraId: firstCam?.id || null,
        cameras: selectedCamList.map((c) => ({ id: c.id, name: c.name, qty: selCams[c.id], price: c.price })),
        accessories: accNames,
        accessoriesDetail: Object.entries(selAcc).map(([name, qty]) => ({ name, qty })),
        days,
        subtotal,
        discountCode: appliedRental?.code || appliedDelivery?.code || appliedTotal?.code || null,
        discountAmt,
        rentalDiscountAmt,
        deliveryDiscountAmt,
        totalDiscountAmt,
        appliedDiscounts: appliedDiscounts.map((x) => ({ code: x.code, scope: x.scope, amt: x.discountAmt })),
        total,
        session: selSession || "full",
        shift: days === 0.5 ? selSession : null,
        createdAt: new Date().toISOString(),
        ...info,
        address: selfPickup
          ? "Thôn Thạnh Mỹ, xã Tam Mỹ, thành phố Đà Nẵng (tự đến shop nhận)"
          : [deliveryStreet, deliveryWard, deliveryDistrict].filter(Boolean).join(", ") || info.address,
        deliveryWard: selfPickup ? "" : deliveryWard || "",
        deliveryDistrict: selfPickup ? "" : deliveryDistrict || "",
        deliveryType: selfPickup ? "selfPickup" : deliveryWard ? deliveryType : "",
        deliveryFee: deliveryFeeCalc,
        status: "pending",
        date: pickDate,
        seen: false,
        userPhone: loggedUser?.phone || info.phone,
        userEmail: loggedUser?.email || "",
      };

      // Call API mutation
      const finalOrder = await createOrderMutation.mutateAsync(orderData);

      setOrderId(finalOrder.id);
      onSubmit(finalOrder);
      setDone(true);
    } catch (e) {
      console.error("[92K] submit error:", e);
      const msg = e.response?.data?.message || "❌ Lỗi kết nối. Vui lòng thử lại.";
      setSubmitError(msg);
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    liveOrdersForCheck,
    expandedCam,
    setExpandedCam,
    camImgIdx,
    setCamImgIdx,
    selCams,
    setSelCams,
    selDur,
    setSelDur,
    customDays,
    setCustomDays,
    pickDate,
    setPickDate,
    selAcc,
    setSelAcc,
    info,
    setInfo,
    deliveryStreet,
    setDeliveryStreet,
    deliveryWard,
    setDeliveryWard,
    deliveryDistrict,
    setDeliveryDistrict,
    deliveryPickup,
    setDeliveryPickup,
    deliveryReturn,
    setDeliveryReturn,
    selfPickup,
    setSelfPickup,
    deliveryType,
    deliveryFeeCalc,
    deliveryFee2Way,
    done,
    setDone,
    orderId,
    setOrderId,
    summaryOpen,
    setSummaryOpen,
    discountCode,
    setDiscountCode,
    appliedDiscounts,
    setAppliedDiscounts,
    discountMsg,
    setDiscountMsg,
    discountExpanded,
    setDiscountExpanded,
    discountLoading,
    appliedRental,
    appliedDelivery,
    appliedTotal,
    days,
    selSession,
    availCams,
    selectedCamList,
    preselectedUnavailable,
    totalCamSelected,
    camCost,
    accCost,
    subtotal,
    rentalDiscountAmt,
    deliveryDiscountAmt,
    totalDiscountAmt,
    discountAmt,
    total,
    applyDiscount,
    removeDiscount,
    returnInfo,
    toggleCam,
    setCamQty,
    toggleAcc,
    setAccQty,
    submitError,
    setSubmitError,
    submitting,
    handleFinish,
    hasQuickSelect,
  };
}
