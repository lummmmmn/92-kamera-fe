import React, { useState, useRef } from "react";
import AdminToast from "./AdminToast.jsx";
import { G, MUT, TXT, BR2, CARD, CARD2, STATUS_CFG } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";
import { useUsers, useUpsertUser, useFeedbacks } from "../../hooks/useAppData.js";
import { useOrders } from "../../hooks/useOrders.js";

// Section Title Helper
function STitle({ c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
      </div>
    </div>
  );
}

export default function UsersPanel() {
  const { data: users = {}, refetch } = useUsers();
  const { data: orders = [] } = useOrders();
  const { data: feedbacks = [] } = useFeedbacks();
  const upsertUserMutation = useUpsertUser();

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const [resetPwMsg, setResetPwMsg] = useState(null);
  const [resettingPhone, setResettingPhone] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "ok") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const handleResetPassword = async (phone, userObj) => {
    if (resetPwVal.length < 4) {
      setResetPwMsg({ type: "err", text: "Tối thiểu 4 ký tự" });
      return;
    }
    if (resettingPhone) return;
    try {
      setResettingPhone(phone);
      await upsertUserMutation.mutateAsync({
        phone,
        name: userObj.name,
        pw: resetPwVal,
        googleId: userObj.googleId || "",
        email: userObj.email || "",
        picture: userObj.picture || "",
      });
      setResetPwMsg({ type: "ok", text: `✓ Đã đổi! Nhắn khách: MK mới là "${resetPwVal}"` });
      showToast("Đã đổi mật khẩu khách hàng");
      setResetPwVal("");
      refetch();
      setTimeout(() => {
        setResetTarget(null);
        setResetPwMsg(null);
      }, 3000);
    } catch (e) {
      setResetPwMsg({ type: "err", text: `Lỗi: ${e.message || "Không thể lưu"}` });
    } finally {
      setResettingPhone(null);
    }
  };

  const userEntries = Object.entries(users || {});

  const inp2 = {
    padding: "9px 13px",
    background: CARD,
    border: `1px solid ${BR2}`,
    borderRadius: 10,
    color: TXT,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "system-ui,sans-serif",
    marginBottom: 0
  };

  return (
    <div>
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <STitle c={`Khách hàng đã đăng ký (${userEntries.length})`} />
      {userEntries.length === 0 ? (
        <div style={{ textAlign: "center", color: MUT, padding: 40, fontSize: 14 }}>Chưa có khách hàng đăng ký tài khoản</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {userEntries.map(([phone, u]) => {
            const userOrders = orders.filter(o => o.phone === phone);
            const userFeedbacks = feedbacks.filter(f => f.phone === phone);
            const totalSpent = userOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
            const totalDays = userOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.days || 0), 0);
            
            let badge = null;
            if (userOrders.length >= 5) badge = { icon: "🥇", label: "Khách Vàng", col: G };
            else if (userOrders.length >= 3) badge = { icon: "🥈", label: "Khách Bạc", col: "#aaa" };
            else if (userOrders.length >= 1) badge = { icon: "🥉", label: "Khách Đồng", col: "#cd7f32" };

            return (
              <div key={phone} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                      {badge && (
                        <span style={{ background: badge.col + "22", color: badge.col, border: `1px solid ${badge.col}44`, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                          {badge.icon} {badge.label}
                        </span>
                      )}
                    </div>
                    <div style={{ color: MUT, fontSize: 11 }}>📞 {phone}</div>
                    <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${G}22`, borderRadius: 10, padding: "4px 10px" }}>
                      <span style={{ color: MUT, fontSize: 10 }}>🔑 Mật khẩu:</span>
                      <span style={{ color: G, fontSize: 11, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>{u.pw || "—"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { l: "Đơn", v: userOrders.length, c: "#60a5fa" },
                      { l: "Ngày thuê", v: totalDays, c: "#a78bfa" },
                      { l: "Chi tiêu", v: fmtVND(totalSpent), c: G, small: true },
                      { l: "Feedback", v: userFeedbacks.length, c: "#22c55e" },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: "center" }}>
                        <div style={{ color: s.c, fontWeight: 700, fontSize: s.small ? 11 : 16 }}>{s.v}</div>
                        <div style={{ color: MUT, fontSize: 9, marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setResetTarget(phone === resetTarget ? null : phone);
                        setResetPwVal("");
                        setResetPwMsg(null);
                      }}
                      style={{
                        padding: "5px 12px",
                        background: resetTarget === phone ? "#0a1a0a" : "#160b0b",
                        border: `1px solid ${resetTarget === phone ? "#22c55e44" : "#ef444430"}`,
                        color: resetTarget === phone ? "#22c55e" : "#ef4444",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 11,
                        fontFamily: "system-ui,sans-serif",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resetTarget === phone ? "✕ Đóng" : "🔑 Đổi mật khẩu"}
                    </button>
                  </div>
                </div>

                {/* Reset password box */}
                {resetTarget === phone && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BR2}` }}>
                    <div style={{ color: MUT, fontSize: 11, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>
                      Mật khẩu mới cho <span style={{ color: TXT, fontWeight: 700 }}>{u.name}</span>
                      <span style={{ color: MUT, fontSize: 10 }}> · Sau khi lưu nhắn khách qua Zalo</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={resetPwVal}
                        onChange={e => {
                          setResetPwVal(e.target.value);
                          setResetPwMsg(null);
                        }}
                        placeholder="Nhập mật khẩu mới..."
                        type="text"
                        style={{ ...inp2, flex: 1, fontFamily: "monospace" }}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleResetPassword(phone, u);
                        }}
                      />
                      <button
                        onClick={() => handleResetPassword(phone, u)}
                        disabled={resettingPhone === phone}
                        style={{
                          padding: "9px 16px",
                          background: G,
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          cursor: resettingPhone === phone ? "not-allowed" : "pointer",
                          fontWeight: 700,
                          fontSize: 12,
                          fontFamily: "system-ui,sans-serif",
                          whiteSpace: "nowrap",
                          opacity: resettingPhone === phone ? 0.65 : 1,
                        }}
                      >
                        {resettingPhone === phone ? "⏳ Lưu..." : "Lưu"}
                      </button>
                    </div>
                    {resetPwMsg && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontFamily: "system-ui,sans-serif",
                          color: resetPwMsg.type === "ok" ? "#22c55e" : "#ef4444",
                          background: resetPwMsg.type === "ok" ? "#0a1a0a" : "#160505",
                          border: `1px solid ${resetPwMsg.type === "ok" ? "#22c55e33" : "#ef444433"}`,
                          borderRadius: 10,
                          padding: "8px 12px",
                        }}
                      >
                        {resetPwMsg.text}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Orders */}
                {userOrders.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BR2}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {userOrders.slice(0, 4).map(o => (
                      <span key={o.id} style={{ fontSize: 10, color: MUT, background: CARD, border: `1px solid ${BR2}`, borderRadius: 99, padding: "2px 10px", fontFamily: "monospace" }}>
                        {o.id} <span style={{ color: STATUS_CFG[o.status]?.color || "#888" }}>· {STATUS_CFG[o.status]?.label}</span>
                      </span>
                    ))}
                    {userOrders.length > 4 && <span style={{ fontSize: 10, color: MUT }}>+{userOrders.length - 4} đơn nữa</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
