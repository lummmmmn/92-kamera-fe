import { useState, useRef } from "react";
import Badge from "../common/Badge.jsx";
import QuickOrderLookup from "./QuickOrderLookup.jsx";
import AdminNoteEditor from "./AdminNoteEditor.jsx";
import AdminToast from "./AdminToast.jsx";
import { G, MUT, TXT, BR2, CARD, CARD2, RED, ORDER_STATUSES, STATUS_CFG } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";

// Inner subcomponent DeleteOrderBtn
function DeleteOrderBtn({ onDelete, loading }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        style={{
          marginTop: 12,
          padding: "6px 14px",
          background: "#FEF0F0",
          color: "#cc3333",
          border: "1px solid #B0282844",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "system-ui,sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        🗑️ Xoá đơn này
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
      <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>Chắc chắn xoá đơn này?</span>
      <button
        onClick={onDelete}
        disabled={loading}
        style={{
          padding: "4px 10px",
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 10,
          fontWeight: 700,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Đang xoá..." : "Xoá"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        disabled={loading}
        style={{
          padding: "4px 10px",
          background: "rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.12)",
          color: MUT,
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 10,
          opacity: loading ? 0.55 : 1,
        }}
      >
        Huỷ
      </button>
    </div>
  );
}

// Inner subcomponent CopyOrderBtn
function CopyOrderBtn({ copyFn }) {
  const [done, setDone] = useState(false);
  const handle = () => {
    copyFn();
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button
      onClick={handle}
      style={{
        padding: "8px 16px",
        background: done ? "#EEF9F4" : CARD,
        color: done ? "#22c55e" : "#c9a84c",
        border: `1px solid ${done ? "#22c55e55" : `${G}55`}`,
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
        fontFamily: "system-ui,sans-serif",
        transition: "all .2s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {done ? "✅ Đã sao chép!" : "📋 Sao chép đơn"}
    </button>
  );
}

export default function OrdersPanel({
  orders,
  onUpdateOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  discounts,
  setDiscounts,
  exportMonth,
  setExportMonth,
  handleExportExcel,
  exporting,
  isMobile,
  inp2,
  btn,
}) {
  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editOrderMsg, setEditOrderMsg] = useState(null);
  const [toast, setToast] = useState(null);
  const [savingEditId, setSavingEditId] = useState(null);
  const [statusSaving, setStatusSaving] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [lookupResetToken, setLookupResetToken] = useState(0);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "ok") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const clearOrderSearch = () => {
    setSearch("");
    setOrderFilter("all");
    setShowAllMonths(true);
    setExpandedOrder(null);
    setLookupResetToken((value) => value + 1);
  };

  const handleSearchChange = (value) => {
    if (!value.trim()) {
      clearOrderSearch();
      return;
    }
    setSearch(value);
  };

  const searchTerm = search.trim().toLowerCase();

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (
      searchTerm &&
      !`${o.id || ""} ${o.name || ""} ${o.cameraName || ""} ${o.phone || ""} ${o.userPhone || ""}`
        .toLowerCase()
        .includes(searchTerm)
    ) return false;
    if (!showAllMonths && exportMonth && o.date) {
      const [ey, em] = exportMonth.split("-").map(Number);
      const d = new Date(o.date + "T00:00:00");
      if (d.getFullYear() !== ey || d.getMonth() + 1 !== em) return false;
    }
    return true;
  });

  const handleSaveEdit = async (o) => {
    if (savingEditId) return;

    if (!editOrder.name.trim()) {
      setEditOrderMsg({ type: "err", text: "Tên không được để trống" });
      return;
    }
    if (!editOrder.phone.trim()) {
      setEditOrderMsg({ type: "err", text: "SĐT không được để trống" });
      return;
    }
    if (!editOrder.date) {
      setEditOrderMsg({ type: "err", text: "Ngày thuê không được để trống" });
      return;
    }

    try {
      setSavingEditId(o.id);
      await onUpdateOrder({
        id: o.id,
        data: {
          ...o,
          name: editOrder.name.trim(),
          phone: editOrder.phone.trim(),
          zalo: editOrder.zalo?.trim() || o.zalo,
          address: editOrder.address?.trim() || o.address,
          note: editOrder.note?.trim() || "",
          date: editOrder.date,
          days: editOrder.days,
          total: editOrder.total,
          seen: true,
        },
      });
      setEditOrderMsg({ type: "ok", text: "✓ Đã lưu thay đổi!" });
      showToast("Đã lưu thông tin / ghi chú đơn");
      setTimeout(() => {
        setEditOrder(null);
        setEditOrderMsg(null);
      }, 1200);
    } catch (err) {
      setEditOrderMsg({ type: "err", text: "Lưu thất bại: " + err.message });
    } finally {
      setSavingEditId(null);
    }
  };

  const handleStatusChange = async (o, newStatus) => {
    if (statusSaving || o.status === newStatus) return;

    try {
      setStatusSaving({ orderId: o.id, status: newStatus });
      await onUpdateOrderStatus({ id: o.id, status: newStatus, adminNote: o.adminNote || "" });

      // Rollback discount usage count locally if status changed to cancelled
      if (newStatus === "cancelled" && o.status !== "cancelled") {
        const discIds = [];
        if (Array.isArray(o.appliedDiscounts) && o.appliedDiscounts.length > 0) {
          o.appliedDiscounts.forEach((ad) => {
            if (ad.code) {
              const found = (discounts || []).find((d) => d.code.toUpperCase() === ad.code.toUpperCase());
              if (found?.id) discIds.push(found.id);
            }
          });
        } else if (o.discountCode) {
          const found = (discounts || []).find((d) => d.code.toUpperCase() === o.discountCode.toUpperCase());
          if (found?.id) discIds.push(found.id);
        }

        if (discIds.length > 0 && setDiscounts) {
          setDiscounts((prev) =>
            (prev || []).map((d) => (discIds.includes(d.id) ? { ...d, usedCount: Math.max(0, (d.usedCount || 0) - 1) } : d))
          );
        }
      }
      showToast(`Đã đổi trạng thái: ${ORDER_STATUSES[newStatus] || newStatus}`);
    } catch (err) {
      alert("Đổi trạng thái thất bại: " + err.message);
    } finally {
      setStatusSaving(null);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (deletingOrderId) return;

    try {
      setDeletingOrderId(id);
      await onDeleteOrder(id);
      showToast("Đã xoá đơn thuê");
    } catch (err) {
      alert("Xoá đơn thất bại: " + err.message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  return (
    <div>
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>
            {showAllMonths ? "Tất cả đơn" : `Đơn tháng ${exportMonth ? exportMonth.split("-")[1] + "/" + exportMonth.split("-")[0] : ""}`} ({filteredOrders.length})
          </h2>
          <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
        </div>
      </div>

      {/* EXPORT EXCEL BAR */}
      <div
        style={{
          background: "#EEF9F4",
          border: "1px solid #22c55e33",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#22c55e", fontSize: 18 }}>📊</span>
        <div>
          <div style={{ color: TXT, fontSize: 12, fontWeight: 600 }}>Xuất báo cáo Excel</div>
          <div style={{ color: MUT, fontSize: 10 }}>Danh sách đơn + tổng kết doanh thu theo tháng</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => {
              setShowAllMonths(false);
              const [y, m] = exportMonth.split("-").map(Number);
              const d = new Date(y, m - 2);
              setExportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            }}
            style={{
              width: 28,
              height: 28,
              background: CARD2,
              border: `1px solid ${BR2}`,
              borderRadius: 10,
              color: TXT,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "system-ui,sans-serif",
            }}
          >
            ‹
          </button>
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => {
              setShowAllMonths(false);
              setExportMonth(e.target.value);
            }}
            style={{
              padding: "6px 10px",
              background: CARD2,
              border: `1px solid ${G}55`,
              borderRadius: 10,
              color: G,
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              outline: "none",
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
            }}
          />
          <button
            onClick={() => {
              setShowAllMonths(false);
              const [y, m] = exportMonth.split("-").map(Number);
              const d = new Date(y, m);
              setExportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            }}
            style={{
              width: 28,
              height: 28,
              background: CARD2,
              border: `1px solid ${BR2}`,
              borderRadius: 10,
              color: TXT,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "system-ui,sans-serif",
            }}
          >
            ›
          </button>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          style={{
            padding: "8px 18px",
            background: exporting ? "#111" : "#0d2010",
            color: exporting ? MUT : "#22c55e",
            border: "1px solid #22c55e44",
            borderRadius: 10,
            cursor: exporting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 12,
            fontFamily: "system-ui,sans-serif",
            whiteSpace: "nowrap",
            transition: "all .2s",
          }}
        >
          {exporting ? "⏳ Đang xuất..." : "⬇️ Tải Excel"}
        </button>
      </div>

      {orders.filter((o) => !o.seen).length > 0 && (
        <div
          style={{
            background: "#F5F0FF",
            border: "1px solid #a78bfa44",
            borderRadius: 9,
            padding: "12px 16px",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>Có {orders.filter((o) => !o.seen).length} đơn mới chưa xem!</span>
        </div>
      )}

      {orders.filter((o) => o.status === "cancelled" && o.cancelledBy === "customer" && !o.cancelSeenByAdmin).length > 0 && (
        <div
          onClick={() => setOrderFilter("cancelled")}
          style={{
            background: "#FEF0F0",
            border: "1px solid #ef444444",
            borderRadius: 9,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
            Có {orders.filter((o) => o.status === "cancelled" && o.cancelledBy === "customer" && !o.cancelSeenByAdmin).length} đơn khách xin huỷ
            — bấm để xem
          </span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="🔍 Tìm theo tên, mã đơn, máy..."
          style={{ ...inp2, width: 280 }}
        />
        {search && (
          <button
            type="button"
            onClick={clearOrderSearch}
            style={{
              padding: "8px 12px",
              background: "rgba(13,27,42,0.08)",
              color: MUT,
              border: `1px solid ${BR2}`,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "system-ui,sans-serif",
              fontWeight: 700,
              transition: "all .2s",
            }}
          >
            Xoá tìm kiếm
          </button>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setOrderFilter(s)}
              style={{
                padding: "8px 12px",
                background: orderFilter === s ? "#FFF8ED" : CARD,
                color: orderFilter === s ? G : MUT,
                border: `1px solid ${orderFilter === s ? G : BR2}`,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "system-ui,sans-serif",
                fontWeight: orderFilter === s ? 700 : 400,
                transition: "all .2s",
              }}
            >
              {s === "all" ? "Tất cả trạng thái" : STATUS_CFG[s]?.label || s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAllMonths((value) => !value)}
            style={{
              padding: "8px 12px",
              background: showAllMonths ? "#FFF8ED" : CARD,
              color: showAllMonths ? G : MUT,
              border: `1px solid ${showAllMonths ? G : BR2}`,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "system-ui,sans-serif",
              fontWeight: showAllMonths ? 700 : 400,
              transition: "all .2s",
            }}
          >
            {showAllMonths ? "Đang xem mọi tháng" : "Tất cả tháng"}
          </button>
        </div>
      </div>

      <QuickOrderLookup
        orders={orders}
        inp2={inp2}
        setExpandedOrder={setExpandedOrder}
        setSearch={setSearch}
        setOrderFilter={setOrderFilter}
        setExportMonth={setExportMonth}
        setShowAllMonths={setShowAllMonths}
        onClearSearch={clearOrderSearch}
        resetToken={lookupResetToken}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredOrders.length === 0 && (
          <div style={{ color: MUT, textAlign: "center", padding: 40, fontSize: 14 }}>Không tìm thấy đơn nào</div>
        )}
        {filteredOrders.map((o) => (
          <div
            key={o.id}
            style={{
              background: CARD2,
              border: `1px solid ${!o.seen ? "#60a5fa33" : BR2}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {/* Order card header */}
            <div
              onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ color: !o.seen ? "#60a5fa" : TXT, fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>{o.id}</span>
                  {!o.seen && (
                    <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>
                      MỚI
                    </span>
                  )}
                  {o.adminNote && (
                    <span
                      title={o.adminNote}
                      style={{ background: "#FFF8ED", color: "#f59e0b", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, cursor: "help" }}
                    >
                      🔒 NOTE
                    </span>
                  )}
                  {o.cancelledBy === "customer" && (
                    <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>
                      ⚠️ KHÁCH HUỶ
                    </span>
                  )}
                  <Badge status={o.status} />
                </div>
                <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>
                  {o.date} · {o.name} · 📞 {o.phone}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: G, fontSize: 18, fontWeight: 800 }}>{fmtVND(o.total)}</div>
                <div style={{ color: MUT, fontSize: 11 }}>{fmtDays(o.days, o.session || o.shift)}</div>
              </div>
            </div>

            {/* Expanded Order info */}
            {expandedOrder === o.id && (
              <div style={{ borderTop: `1px solid ${BR2}`, padding: "14px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <span style={{ padding: "3px 10px", background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, color: TXT, fontSize: 11 }}>
                    📷 {o.cameraName}
                  </span>
                  {(() => {
                    const sess = o.session || o.shift;
                    return sess === "morning" || sess === "afternoon" ? (
                      <span
                        style={{
                          padding: "3px 10px",
                          background: sess === "morning" ? "#0a0800" : "#080010",
                          border: `1px solid ${sess === "morning" ? "#f59e0b44" : "#818cf844"}`,
                          borderRadius: 99,
                          color: sess === "morning" ? "#f59e0b" : "#818cf8",
                          fontSize: 11,
                        }}
                      >
                        {sess === "morning" ? "🌅 Ca sáng 6h–12h" : "🌇 Ca chiều 14h–20h"}
                      </span>
                    ) : null;
                  })()}
                  {(o.accessories || []).map((a) => (
                    <span key={a} style={{ padding: "3px 10px", background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, color: MUT, fontSize: 11 }}>
                      {a}
                    </span>
                  ))}
                </div>

                {/* Timing */}
                {(() => {
                  if (!o.date || !o.days) return null;
                  const fmtD = (ds) => {
                    const d = new Date(ds + "T00:00:00");
                    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                  };
                  let pickTime, pickDate, dropTime, dropDate;
                  if (o.days === 0.5) {
                    const _sess = o.session || o.shift;
                    pickTime = _sess === "morning" ? "06:00" : _sess === "afternoon" ? "14:00" : "--:--";
                    dropTime = _sess === "morning" ? "12:00" : _sess === "afternoon" ? "20:00" : "--:--";
                    pickDate = dropDate = fmtD(o.date);
                  } else {
                    pickTime = dropTime = "12:00";
                    pickDate = fmtD(o.date);
                    dropDate = fmtD(dateAddDays(o.date, o.days));
                  }
                  return (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#EEF9F4",
                          border: "1px solid #22c55e33",
                          borderRadius: 10,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "#22c55e",
                          fontWeight: 700,
                        }}
                      >
                        Nhận: {pickTime} · {pickDate}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#FFF8ED",
                          border: "1px solid #f59e0b33",
                          borderRadius: 10,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        Trả: {dropTime} · {dropDate}
                      </span>
                    </div>
                  );
                })()}

                {o.address && <div style={{ color: MUT, fontSize: 11, marginBottom: 6 }}>📍 {o.address}</div>}
                {o.note && <div style={{ color: MUT, fontSize: 11, marginBottom: 12, fontStyle: "italic" }}>💬 {o.note}</div>}

                {o.cancelledBy === "customer" && (
                  <div
                    style={{
                      background: "#FEF0F0",
                      border: "1px solid #ef444433",
                      borderRadius: 10,
                      padding: "9px 14px",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <div>
                      <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>Khách tự huỷ đơn</div>
                      {o.cancelledAt && (
                        <div style={{ color: "#ef444499", fontSize: 10, marginTop: 2 }}>
                          Lúc: {new Date(o.cancelledAt).toLocaleString("vi-VN")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <CopyOrderBtn
                    copyFn={() => {
                      const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                      const fmtD = (ds) => {
                        const d = new Date(ds + "T00:00:00");
                        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                      };
                      let pickTime, pickDate, dropTime, dropDate;
                      if (o.date && o.days) {
                        if (o.days === 0.5) {
                          pickTime = (o.session || o.shift) === "morning" ? "06:00" : (o.session || o.shift) === "afternoon" ? "14:00" : "--:--";
                          dropTime = (o.session || o.shift) === "morning" ? "12:00" : (o.session || o.shift) === "afternoon" ? "20:00" : "--:--";
                          pickDate = dropDate = fmtD(o.date);
                        } else {
                          pickTime = dropTime = "12:00";
                          pickDate = fmtD(o.date);
                          dropDate = fmtD(dateAddDays(o.date, o.days));
                        }
                      }
                      const statusLabels = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", active: "Đang thuê", completed: "Hoàn thành", cancelled: "Đã huỷ" };
                      const lines = [
                        "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                        "━━━━━━━━━━━━━━━━━━━━━━",
                        `Mã đơn : ${o.id}`,
                        `📷 Máy  : ${o.cameraName}`,
                        `🎒 Phụ kiện: ${accList}`,
                        `📅 Ngày thuê: ${o.date}`,
                        `⏱ Thời gian: ${fmtDays(o.days, o.session || o.shift)}`,
                        pickDate ? `📦 Giờ nhận : ${pickTime} · ${pickDate}` : null,
                        dropDate ? `📅 Giờ trả  : ${dropTime} · ${dropDate}` : null,
                        ...(o.appliedDiscounts && o.appliedDiscounts.length > 0
                          ? o.appliedDiscounts.map((ad) =>
                              ad.scope === "delivery"
                                ? `🚗 Mã ship: ${ad.code} (-${fmtVND(ad.amt || 0)})`
                                : `🎞️ Mã thuê: ${ad.code} (-${fmtVND(ad.amt || 0)})`
                            )
                          : o.discountCode
                          ? [`🏷️ Mã giảm giá: ${o.discountCode} (-${fmtVND(o.discountAmt || 0)})`]
                          : []),
                        `💰 Tổng tiền: ${fmtVND(o.total)}`,
                        "━━━━━━━━━━━━━━━━━━━━━━",
                        `👤 Tên   : ${o.name}`,
                        `📞 SĐT   : ${o.phone}`,
                        `📍 Địa chỉ: ${o.address || "—"}`,
                        o.note ? `💬 Ghi chú: ${o.note}` : null,
                        "━━━━━━━━━━━━━━━━━━━━━━",
                        `⏳ Trạng thái: ${statusLabels[o.status] || o.status}`,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      navigator.clipboard?.writeText(lines).catch(() => {});
                    }}
                  />
                </div>

                <AdminNoteEditor order={o} onUpdateOrder={onUpdateOrder} onToast={showToast} />

                {(o.appliedDiscounts?.length > 0 || o.discountCode) && (
                  <div style={{ fontSize: 11, marginBottom: 8, background: "#EEF9F4", border: "1px solid #22c55e22", borderRadius: 10, padding: "6px 12px" }}>
                    {o.appliedDiscounts && o.appliedDiscounts.length > 0 ? (
                      o.appliedDiscounts.map((ad) => (
                        <div key={ad.code} style={{ color: ad.scope === "delivery" ? "#60a5fa" : "#22c55e" }}>
                          {ad.scope === "delivery" ? "🚗 Mã ship" : "🎞️ Mã thuê"}: <strong>{ad.code}</strong> — Giảm {fmtVND(ad.amt || 0)}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#22c55e" }}>
                        🏷️ Mã giảm giá: <strong>{o.discountCode}</strong> — Giảm {fmtVND(o.discountAmt || 0)}
                      </div>
                    )}
                    <div style={{ color: "#888", fontSize: 10, marginTop: 3 }}>Tổng gốc: {fmtVND(o.subtotal || o.total)}</div>
                  </div>
                )}

                {/* EDIT DETAILS FORM */}
                <div style={{ borderTop: `1px solid ${BR2}`, paddingTop: 12, marginBottom: 12 }}>
                  {editOrder?.id === o.id ? (
                    <div style={{ background: "rgba(201,168,76,0.07)", border: `1px solid ${BR2}`, borderRadius: 14, padding: 16 }}>
                      <div style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
                        ✏️ CHỈNH SỬA THÔNG TIN ĐƠN
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>HỌ TÊN</div>
                          <input
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.name}
                            onChange={(e) => setEditOrder((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Tên khách hàng"
                          />
                        </div>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ ĐIỆN THOẠI</div>
                          <input
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.phone}
                            onChange={(e) => setEditOrder((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="0901234567"
                          />
                        </div>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>ZALO</div>
                          <input
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.zalo || ""}
                            onChange={(e) => setEditOrder((p) => ({ ...p, zalo: e.target.value }))}
                            placeholder="Zalo (tuỳ chọn)"
                          />
                        </div>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>NGÀY THUÊ</div>
                          <input
                            type="date"
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.date}
                            onChange={(e) => setEditOrder((p) => ({ ...p, date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ NGÀY / BUỔI</div>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.days}
                            onChange={(e) => setEditOrder((p) => ({ ...p, days: parseFloat(e.target.value) || p.days }))}
                          />
                        </div>
                        <div>
                          <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TỔNG TIỀN (₫)</div>
                          <input
                            type="number"
                            style={{ ...inp2, fontSize: 12 }}
                            value={editOrder.total}
                            onChange={(e) => setEditOrder((p) => ({ ...p, total: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>ĐỊA CHỈ</div>
                        <input
                          style={{ ...inp2, fontSize: 12 }}
                          value={editOrder.address || ""}
                          onChange={(e) => setEditOrder((p) => ({ ...p, address: e.target.value }))}
                          placeholder="Địa chỉ nhận / trả máy"
                        />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GHI CHÚ KHÁCH</div>
                        <textarea
                          style={{ ...inp2, fontSize: 12, minHeight: 56, resize: "vertical" }}
                          value={editOrder.note || ""}
                          onChange={(e) => setEditOrder((p) => ({ ...p, note: e.target.value }))}
                          placeholder="Ghi chú của khách..."
                        />
                      </div>
                      {editOrderMsg && (
                        <div
                          style={{
                            marginBottom: 10,
                            padding: "7px 12px",
                            background: editOrderMsg.type === "ok" ? "#EEF9F4" : "#FEF0F0",
                            border: `1px solid ${editOrderMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`,
                            borderRadius: 10,
                            color: editOrderMsg.type === "ok" ? "#22c55e" : "#ef4444",
                            fontSize: 12,
                          }}
                        >
                          {editOrderMsg.text}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleSaveEdit(o)}
                          disabled={savingEditId === o.id}
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            background: "#FFF8ED",
                            border: `1px solid ${G}55`,
                            color: G,
                            borderRadius: 10,
                            cursor: savingEditId === o.id ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "system-ui,sans-serif",
                            opacity: savingEditId === o.id ? 0.72 : 1,
                          }}
                        >
                          {savingEditId === o.id ? "⏳ Đang lưu..." : "✓ Lưu thay đổi"}
                        </button>
                        <button
                          onClick={() => {
                            setEditOrder(null);
                            setEditOrderMsg(null);
                          }}
                          disabled={savingEditId === o.id}
                          style={{
                            padding: "9px 16px",
                            background: "none",
                            border: `1px solid ${BR2}`,
                            color: MUT,
                            borderRadius: 10,
                            cursor: savingEditId === o.id ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontFamily: "system-ui,sans-serif",
                            opacity: savingEditId === o.id ? 0.55 : 1,
                          }}
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditOrder({
                          id: o.id,
                          name: o.name,
                          phone: o.phone,
                          zalo: o.zalo || "",
                          address: o.address || "",
                          note: o.note || "",
                          date: o.date,
                          days: o.days,
                          total: o.total,
                        });
                        setEditOrderMsg(null);
                      }}
                      style={{
                        padding: "7px 14px",
                        background: "rgba(255,248,237,0.60)",
                        border: `1px solid ${G}33`,
                        color: G,
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "system-ui,sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      ✏️ Chỉnh sửa thông tin đơn
                    </button>
                  )}
                </div>

                {/* STATUS TRANSITION BUTTONS */}
                <div style={{ borderTop: `1px solid ${BR2}`, paddingTop: 12 }}>
                  <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ĐỔI TRẠNG THÁI:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(ORDER_STATUSES).map(([s, l]) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(o, s)}
                        disabled={!!statusSaving && statusSaving.orderId === o.id}
                        style={{
                          padding: "6px 12px",
                          background: o.status === s ? "#FFF8ED" : CARD,
                          color: o.status === s ? G : MUT,
                          border: `1px solid ${o.status === s ? G + "55" : BR2}`,
                          borderRadius: 99,
                          cursor: statusSaving?.orderId === o.id ? "not-allowed" : "pointer",
                          fontSize: 11,
                          fontWeight: o.status === s ? 700 : 400,
                          fontFamily: "system-ui,sans-serif",
                          transition: "all .15s",
                          opacity: statusSaving?.orderId === o.id && statusSaving?.status !== s ? 0.55 : 1,
                        }}
                      >
                        {statusSaving?.orderId === o.id && statusSaving?.status === s ? "⏳ Đang đổi..." : l}
                      </button>
                    ))}
                  </div>
                  <DeleteOrderBtn onDelete={() => handleDeleteOrder(o.id)} loading={deletingOrderId === o.id} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
