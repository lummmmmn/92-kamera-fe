import React, { useState } from "react";
import Logo from "../common/Logo.jsx";
import { G, MUT, TXT, BG, CARD, BR } from "../../lib/constants.js";
import { fmtDays } from "../../utils/format.js";
import {
  useCameras,
  useCreateCamera,
  useUpdateCamera,
  useDeleteCamera,
  useFeedbacks,
  useDiscounts,
  useUpdateDiscount,
} from "../../hooks/useAppData.js";
import {
  useOrders,
  useUpdateOrder,
  useUpdateOrderStatus,
  useDeleteOrder,
} from "../../hooks/useOrders.js";

// Import all sub-panels
import OverviewPanel from "./OverviewPanel.jsx";
import CamerasPanel from "./CamerasPanel.jsx";
import AccessoriesPanel from "./AccessoriesPanel.jsx";
import OrdersPanel from "./OrdersPanel.jsx";
import RentalCalendar from "./RentalCalendar.jsx";
import DeliveryPanel from "./DeliveryPanel.jsx";
import GalleryPanel from "./GalleryPanel.jsx";
import FeedbackPanel from "./FeedbackPanel.jsx";
import UsersPanel from "./UsersPanel.jsx";
import DiscountsPanel from "./DiscountsPanel.jsx";
import InventoryPanel from "./InventoryPanel.jsx";
import SitePanel from "./SitePanel.jsx";
import SecurityPanel from "./SecurityPanel.jsx";

export default function AdminDashboard({ onBack, isMobile }) {
  const [tab, setTab] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [exporting, setExporting] = useState(false);

  // Queries
  const { data: orders = [], refetch: refetchOrders, isLoading: isLoadingOrders } = useOrders();
  const { data: cameras = [], isLoading: isLoadingCameras } = useCameras();
  const { data: feedbacks = [], isLoading: isLoadingFeedbacks } = useFeedbacks();
  const { data: discounts = [], refetch: refetchDiscounts, isLoading: isLoadingDiscounts } = useDiscounts();

  const isInitialLoading = isLoadingOrders || isLoadingCameras || isLoadingFeedbacks || isLoadingDiscounts;

  // Mutations
  const updateOrderMutation = useUpdateOrder();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const updateDiscountMutation = useUpdateDiscount();

  const createCamMutation = useCreateCamera();
  const updateCamMutation = useUpdateCamera();
  const deleteCamMutation = useDeleteCamera();

  const unseenCount = orders.filter((o) => !o.seen).length;
  const unseenFeedbackCount = feedbacks.filter((f) => f.status === "pending").length;

  const TABS = [
    { k: "overview", l: "📊 Tổng quan" },
    { k: "cameras", l: "📷 Máy ảnh" },
    { k: "accessories", l: "🎒 Phụ kiện" },
    { k: "orders", l: "📋 Đơn thuê", badge: unseenCount },
    { k: "calendar", l: "📅 Lịch thuê" },
    { k: "delivery", l: "🚗 Phí giao nhận" },
    { k: "media", l: "🖼️ Media & Feedback", badge: unseenFeedbackCount },
    { k: "users", l: "👥 Khách hàng" },
    { k: "discounts", l: "🏷️ Mã giảm giá" },
    { k: "inventory", l: "📦 Tồn kho" },
    { k: "content", l: "✏️ Nội dung web" },
    { k: "security", l: "🔑 Bảo mật" },
  ];

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;
      const [y, m] = exportMonth.split("-").map(Number);
      const rows = orders.filter((o) => {
        if (!o.date) return false;
        const d = new Date(o.date + "T00:00:00");
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
      const sheetData = [
        [
          "Mã đơn", "Ngày", "Khách", "SĐT", "Zalo", "Địa chỉ", "Máy",
          "Ca/Ngày", "Phụ kiện", "Mã giảm giá", "Loại mã",
          "Giảm thuê (đ)", "Giảm ship (đ)", "Giảm (đ)", "Tổng (đ)",
          "Trạng thái", "Ghi chú KH", "Ghi chú nội bộ"
        ],
        ...rows.map((o) => [
          o.id,
          o.date,
          o.name,
          o.phone,
          o.zalo || "",
          o.address || "",
          o.cameraName,
          fmtDays(o.days, o.session || o.shift),
          (o.accessories || []).join(", "),
          o.appliedDiscounts ? o.appliedDiscounts.map((x) => x.code).join(" + ") : (o.discountCode || ""),
          o.appliedDiscounts ? o.appliedDiscounts.map((x) => (x.scope === "delivery" ? "Ship" : "Thuê")).join(" + ") : (o.discountCode ? "Thuê" : ""),
          o.rentalDiscountAmt || (o.discountCode && !o.deliveryDiscountAmt ? o.discountAmt || 0 : 0),
          o.deliveryDiscountAmt || 0,
          o.discountAmt || 0,
          o.total,
          o.status,
          o.note || "",
          o.adminNote || "",
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, `Thang ${m}-${y}`);
      XLSX.writeFile(wb, `Bao_cao_don_hang_${m}_${y}.xlsx`);
    } catch (err) {
      alert("Xuất Excel thất bại: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleSetDiscountsWrapper = async (updatedListOrFn) => {
    let nextList = updatedListOrFn;
    if (typeof updatedListOrFn === "function") {
      nextList = updatedListOrFn(discounts);
    }
    await Promise.all(
      nextList.map((d) => updateDiscountMutation.mutateAsync({ id: d.id, data: d }))
    );
    refetchDiscounts();
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui,sans-serif", position: "relative", zIndex: 1 }}>
      {/* Sidebar overlay */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: "fixed", top: 0, left: navOpen ? 0 : -260, bottom: 0, zIndex: 999,
          width: 248, background: "linear-gradient(175deg, rgba(232,240,248,0.96) 0%, rgba(197,216,236,0.90) 55%, rgba(181,206,230,0.87) 100%)",
          backdropFilter: "blur(32px) saturate(180%) brightness(1.04)", WebkitBackdropFilter: "blur(32px) saturate(180%) brightness(1.04)",
          borderRight: "1.5px solid rgba(255,255,255,0.80)",
          boxShadow: navOpen ? "1px 0 0 rgba(255,255,255,0.95) inset, 4px 0 40px rgba(0,0,0,0.28)" : "none",
          transition: "left .28s cubic-bezier(0.22,1,0.36,1)",
          display: "flex", flexDirection: "column", paddingTop: 0, overflowY: "auto",
        }}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(139,174,207,0.35)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Logo size={0.62} />
          <button onClick={() => setNavOpen(false)} style={{ background: "rgba(8,20,36,0.08)", border: "1px solid rgba(8,20,36,0.12)", color: TXT, width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "10px 10px", flex: 1 }}>
          {TABS.map((t) => {
            const isActive = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => { setTab(t.k); setNavOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 11,
                  padding: "11px 14px", borderRadius: 11, border: "none",
                  borderBottom: "1px solid rgba(139,174,207,0.22)", cursor: "pointer",
                  background: isActive ? "rgba(8,20,36,0.10)" : "transparent", color: isActive ? TXT : MUT,
                  fontFamily: "system-ui,sans-serif", fontSize: 13, fontWeight: isActive ? 700 : 400,
                  textAlign: "left", marginBottom: 2, borderLeft: isActive ? `3px solid ${BR}` : "3px solid transparent",
                  transition: "all .18s", position: "relative",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(8,20,36,0.06)"; e.currentTarget.style.color = TXT; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUT; } }}
              >
                <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{t.l.split(" ")[0]}</span>
                <span style={{ flex: 1 }}>{t.l.split(" ").slice(1).join(" ")}</span>
                {t.badge > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(139,174,207,0.35)", flexShrink: 0 }}>
          <button onClick={onBack} style={{ width: "100%", padding: "10px 14px", background: "rgba(8,20,36,0.06)", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "system-ui,sans-serif", textAlign: "left" }}>← Về trang khách</button>
        </div>
      </div>

      {/* Admin Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,6,0.55)", backdropFilter: "blur(32px) saturate(160%)", WebkitBackdropFilter: "blur(32px) saturate(160%)", borderBottom: `1px solid rgba(42,42,42,0.6)`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setNavOpen((v) => !v)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5, flexShrink: 0 }}>
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
            <span style={{ display: "block", width: 16, height: 1.5, background: "#fff", borderRadius: 2 }} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={0.58} />
            <span style={{ color: "rgba(255,255,255,0.30)", fontSize: 13 }}>|</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
              {TABS.find((t) => t.k === tab)?.l || ""}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {unseenCount + unseenFeedbackCount > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>{unseenCount + unseenFeedbackCount}</span>
          )}
          <button onClick={onBack} style={{ background: "none", border: `1px solid rgba(255,255,255,0.15)`, color: "rgba(255,255,255,0.45)", padding: "6px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>← Web</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 14px" : "32px 24px" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        {isInitialLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 14 }}>
            <div style={{ width: 36, height: 36, border: "3.5px solid rgba(201,168,76,0.18)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ color: MUT, fontSize: 13, fontWeight: 500, fontFamily: "system-ui,sans-serif" }}>Đang tải dữ liệu hệ thống...</div>
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewPanel isMobile={isMobile} setTab={setTab} />}
            {tab === "cameras" && (
              <CamerasPanel
                cameras={cameras}
                onCreateCamera={createCamMutation.mutateAsync}
                onUpdateCamera={updateCamMutation.mutateAsync}
                onDeleteCamera={deleteCamMutation.mutateAsync}
                isMobile={isMobile}
              />
            )}
            {tab === "accessories" && <AccessoriesPanel />}
            {tab === "orders" && (
              <OrdersPanel
                orders={orders}
                onUpdateOrder={updateOrderMutation.mutateAsync}
                onUpdateOrderStatus={updateOrderStatusMutation.mutateAsync}
                onDeleteOrder={deleteOrderMutation.mutateAsync}
                discounts={discounts}
                setDiscounts={handleSetDiscountsWrapper}
                exportMonth={exportMonth}
                setExportMonth={setExportMonth}
                handleExportExcel={handleExportExcel}
                exporting={exporting}
                refetchOrders={refetchOrders}
              />
            )}
            {tab === "calendar" && <RentalCalendar orders={orders} cameras={cameras} />}
            {tab === "delivery" && <DeliveryPanel isMobile={isMobile} />}
            {tab === "media" && (
              <div>
                <GalleryPanel isMobile={isMobile} />
                <div style={{ height: 32 }} />
                <FeedbackPanel isMobile={isMobile} />
              </div>
            )}
            {tab === "users" && <UsersPanel />}
            {tab === "discounts" && <DiscountsPanel isMobile={isMobile} />}
            {tab === "inventory" && <InventoryPanel isMobile={isMobile} />}
            {tab === "content" && <SitePanel isMobile={isMobile} />}
            {tab === "security" && <SecurityPanel />}
          </>
        )}
      </div>
    </div>
  );
}
