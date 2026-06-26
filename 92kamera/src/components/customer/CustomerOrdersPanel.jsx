import React, { useState } from "react";
import Badge from "../common/Badge.jsx";
import { G, MUT, TXT, STATUS_CFG } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";
import { useUpdateOrder } from "../../hooks/useOrders.js";

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
        background: done ? "#EEF9F4" : "rgba(255,255,255,0.13)",
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

export default function CustomerOrdersPanel({
  myOrders = [],
  feedbacks = [],
  refreshing = false,
  refreshOrders,
  onOpenBooking,
  setFbOrder,
  loggedUser,
  setConfirmCfg,
  myEmail = "",
  myPhone = "",
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const updateOrderMutation = useUpdateOrder();

  const normPhone = (p) => (p || "").replace(/[^0-9]/g, "");

  const filteredOrders =
    filterStatus === "all" ? myOrders : myOrders.filter((o) => o.status === filterStatus);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ color: TXT, fontWeight: 700, fontSize: 17 }}>Đơn thuê của tôi</div>
        <button
          onClick={() => refreshOrders?.(false)}
          disabled={refreshing}
          style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.13)",
            color: refreshing ? MUT : G,
            border: `1px solid ${refreshing ? "rgba(255,255,255,0.22)" : G + "55"}`,
            borderRadius: 10,
            cursor: refreshing ? "default" : "pointer",
            fontSize: 11,
            fontFamily: "system-ui,sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all .2s",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>🔄</span>
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>
      <div style={{ width: 30, height: 2, background: G, marginBottom: 18 }} />

      {/* Status filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "7px 14px",
              background: filterStatus === s ? `${G}22` : "rgba(255,255,255,0.13)",
              color: filterStatus === s ? G : MUT,
              border: `1px solid ${filterStatus === s ? G + "55" : "rgba(255,255,255,0.22)"}`,
              borderRadius: 99,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "system-ui,sans-serif",
              fontWeight: filterStatus === s ? 700 : 400,
              transition: "all .15s",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {s === "all" ? "Tất cả" : STATUS_CFG[s]?.label || s}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: MUT }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14 }}>Chưa có đơn thuê nào</div>
          {onOpenBooking && (
            <div className="btn-3d-wrap" style={{ marginTop: 16, borderRadius: 12, display: "inline-block" }}>
              <button
                onClick={onOpenBooking}
                className="btn-3d"
                style={{ padding: "10px 24px", borderRadius: 10, fontSize: 12, letterSpacing: 2 }}
              >
                Gửi yêu cầu thuê
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredOrders.map((o) => {
            const _matchFb = (f) =>
              f.orderId === o.id &&
              ((myEmail && f.email === myEmail) || (myPhone && normPhone(f.phone) === myPhone));
            const hasFeedback = feedbacks.some(_matchFb);
            const fbStatus = feedbacks.find(_matchFb)?.status;
            const canFeedback = o.status === "completed";

            return (
              <div
                key={o.id}
                style={{
                  background: "rgba(255,255,255,0.13)",
                  border: `1px solid ${
                    o.status === "active" ? "#f59e0b44" : o.status === "completed" ? "#22c55e33" : "rgba(255,255,255,0.22)"
                  }`,
                  borderRadius: 16,
                  padding: "16px 20px",
                  backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                  WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                  boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: G, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{o.id}</span>
                      <Badge status={o.status} />
                    </div>
                    <div style={{ color: TXT, fontSize: 13, fontWeight: 600 }}>📷 {o.cameraName}</div>
                    <div style={{ color: MUT, fontSize: 11, marginTop: 3 }}>
                      {o.date} · {fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: G, fontWeight: 800, fontSize: 16 }}>{fmtVND(o.total)}</div>
                  </div>
                </div>

                {o.status === "active" && (
                  <div style={{ background: "#FFF8ED", border: `1px solid #f59e0b22`, borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#f59e0b" }}>
                    🎬 Đang thuê · Nhớ giữ gìn thiết bị cẩn thận nhé!
                  </div>
                )}

                <div style={{ borderTop: `1px solid rgba(255,255,255,0.22)`, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <CopyOrderBtn
                    copyFn={() => {
                      const accList =
                        Array.isArray(o.accessories) && o.accessories.length > 0
                          ? o.accessories.join(", ")
                          : "Không có";
                      const fmtD = (ds) =>
                        new Date(ds + "T00:00:00").toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                      let pickTime = "",
                        pickDate = "",
                        dropTime = "",
                        dropDate = "";
                      if (o.date && o.days) {
                        if (o.days === 0.5) {
                          pickTime =
                            (o.session || o.shift) === "morning"
                              ? "06:00"
                              : (o.session || o.shift) === "afternoon"
                              ? "14:00"
                              : "--:--";
                          dropTime =
                            (o.session || o.shift) === "morning"
                              ? "12:00"
                              : (o.session || o.shift) === "afternoon"
                              ? "20:00"
                              : "--:--";
                          pickDate = dropDate = fmtD(o.date);
                        } else {
                          pickTime = dropTime = "12:00";
                          pickDate = fmtD(o.date);
                          dropDate = fmtD(dateAddDays(o.date, o.days));
                        }
                      }
                      const statusLabels = {
                        pending: "Chờ xác nhận",
                        confirmed: "Đã xác nhận",
                        active: "Đang thuê",
                        completed: "Hoàn thành",
                        cancelled: "Đã huỷ",
                      };
                      const lines = [
                        "📋 ĐƠN THUÊ MÁY ẢNH 92KAMERA",
                        "━━━━━━━━━━━━━━━━━━━━━━",
                        `Mã đơn : ${o.id}`,
                        `📷 Máy  : ${o.cameraName}`,
                        `🎒 Phụ kiện: ${accList}`,
                        `📅 Ngày thuê: ${o.date}`,
                        `⏱ Thời gian: ${fmtDays(o.days, o.session || o.shift)}`,
                        pickDate ? `Giờ nhận : ${pickTime} · ${pickDate}` : null,
                        dropDate ? `Giờ trả  : ${dropTime} · ${dropDate}` : null,
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
                  {canFeedback && !hasFeedback && (
                    <button
                      onClick={() => setFbOrder?.(o)}
                      style={{ padding: "8px 20px", background: "#c9a84c", color: "#1a1200", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif", boxShadow: "0 0 16px #c9a84c44" }}
                    >
                      ⭐ Đánh giá
                    </button>
                  )}
                  {hasFeedback && fbStatus === "pending" && (
                    <button
                      onClick={() => setFbOrder?.(o)}
                      style={{ padding: "8px 20px", background: "#FFF8ED", color: G, border: `1px solid ${G}55`, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "system-ui,sans-serif" }}
                    >
                      ✏️ Sửa đánh giá
                    </button>
                  )}
                  {hasFeedback && fbStatus === "approved" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                      🌟 Đã được duyệt
                    </span>
                  )}
                  {hasFeedback && fbStatus === "rejected" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>
                      ✕ Bị từ chối
                    </span>
                  )}
                  {o.status === "pending" && (
                    <span style={{ color: MUT, fontSize: 11, display: "flex", alignItems: "center" }}>⏳ Đang chờ admin xác nhận</span>
                  )}
                  {loggedUser && o.status === "pending" && (
                    <button
                      onClick={() => {
                        setConfirmCfg?.({
                          message: `Bạn có chắc muốn huỷ đơn ${o.id}?\n\nĐơn sẽ chuyển sang trạng thái "Đã huỷ" và không thể khôi phục.`,
                          onOk: () => {
                            updateOrderMutation.mutate({
                              id: o.id,
                              data: {
                                ...o,
                                status: "cancelled",
                                cancelledBy: "customer",
                                cancelledAt: new Date().toISOString(),
                              },
                            });
                            setConfirmCfg?.(null);
                          },
                        });
                      }}
                      style={{ padding: "7px 16px", background: "#FEF0F0", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", marginLeft: "auto" }}
                    >
                      ✕ Huỷ đơn
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
