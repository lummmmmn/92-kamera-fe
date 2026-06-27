import React, { useState, useRef } from "react";
import AdminToast from "./AdminToast.jsx";
import { G, MUT, TXT, BR2, CARD, CARD2, btn } from "../../lib/constants.js";
import { fmtVND, todayStr } from "../../utils/format.js";
import { useDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from "../../hooks/useAppData.js";

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

export default function DiscountsPanel({ isMobile }) {
  const { data: discounts = [], refetch } = useDiscounts();
  const createDiscountMutation = useCreateDiscount();
  const updateDiscountMutation = useUpdateDiscount();
  const deleteDiscountMutation = useDeleteDiscount();

  const [editDiscId, setEditDiscId] = useState(null);
  const [pendingDeleteDiscId, setPendingDeleteDiscId] = useState(null);
  const [discMsg, setDiscMsg] = useState(null);
  const [savingDisc, setSavingDisc] = useState(false);
  const [deletingDiscId, setDeletingDiscId] = useState(null);
  const [togglingDiscId, setTogglingDiscId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "ok") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const [discForm, setDiscForm] = useState({
    code: "",
    type: "percent",
    value: "",
    minOrder: "",
    maxUse: "",
    active: true,
    requiredBadge: "none",
    voucherScope: "rental",
  });

  const saveDisc = async () => {
    if (savingDisc) return;

    setDiscMsg(null);
    const code = (discForm.code || "").trim().toUpperCase();
    if (!code) {
      setDiscMsg({ type: "err", text: "Nhập mã code" });
      return;
    }
    const val = parseFloat(discForm.value);
    if (!val || val <= 0) {
      setDiscMsg({ type: "err", text: "Giá trị giảm phải > 0" });
      return;
    }
    if (discForm.type === "percent" && val > 100) {
      setDiscMsg({ type: "err", text: "Phần trăm tối đa 100%" });
      return;
    }
    const duplicate = discounts.find(d => d.code.toUpperCase() === code && d.id !== editDiscId);
    if (duplicate) {
      setDiscMsg({ type: "err", text: "Mã này đã tồn tại" });
      return;
    }

    const payload = {
      code,
      type: discForm.type,
      value: val,
      minOrder: parseFloat(discForm.minOrder) || 0,
      maxUse: parseInt(discForm.maxUse) || 0,
      active: discForm.active,
      requiredBadge: discForm.requiredBadge || "none",
      voucherScope: discForm.voucherScope || "rental",
    };

    try {
      setSavingDisc(true);
      if (editDiscId) {
        await updateDiscountMutation.mutateAsync({ id: editDiscId, data: payload });
        showToast("Đã cập nhật mã giảm giá");
      } else {
        await createDiscountMutation.mutateAsync({ ...payload, usedCount: 0, createdAt: todayStr() });
        showToast("Đã tạo mã giảm giá mới");
      }
      setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true, requiredBadge: "none", voucherScope: "rental" });
      setEditDiscId(null);
      refetch();
    } catch (e) {
      setDiscMsg({ type: "err", text: `Lỗi: ${e.message || "Không lưu được"}` });
    } finally {
      setSavingDisc(false);
    }
  };

  const startEdit = (d) => {
    setEditDiscId(d.id);
    setDiscForm({
      code: d.code,
      type: d.type,
      value: String(d.value),
      minOrder: d.minOrder ? String(d.minOrder) : "",
      maxUse: d.maxUse ? String(d.maxUse) : "",
      active: d.active,
      requiredBadge: d.requiredBadge || "none",
      voucherScope: d.voucherScope || "rental",
    });
    setDiscMsg(null);
  };

  const deleteDisc = async (id) => {
    if (deletingDiscId) return;

    try {
      setDeletingDiscId(id);
      await deleteDiscountMutation.mutateAsync(id);
      await refetch();
      setPendingDeleteDiscId(null);
      showToast("Đã xoá mã giảm giá");
    } catch (e) {
      setDiscMsg({ type: "err", text: `Xóa mã thất bại: ${e.message || "Không xóa được"}` });
    } finally {
      setDeletingDiscId(null);
    }
  };

  const toggleActive = async (d) => {
    if (togglingDiscId) return;

    try {
      setTogglingDiscId(d.id);
      await updateDiscountMutation.mutateAsync({ id: d.id, data: { ...d, active: !d.active } });
      await refetch();
      showToast(d.active ? "Đã tắt mã giảm giá" : "Đã kích hoạt mã giảm giá");
    } catch (e) {
      setDiscMsg({ type: "err", text: `Cập nhật mã thất bại: ${e.message || "Không lưu được"}` });
    } finally {
      setTogglingDiscId(null);
    }
  };

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
  };

  return (
    <div>
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <STitle c="Mã giảm giá" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginBottom: 24 }}>
        {/* Form tạo/sửa */}
        <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 20 }}>
          <div style={{ color: TXT, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
            {editDiscId ? "✏️ Chỉnh sửa mã" : "➕ Tạo mã mới"}
          </div>
          {discMsg && (
            <div style={{ background: discMsg.type === "ok" ? "#022" : "#160505", border: `1px solid ${discMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: discMsg.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 12 }}>
              {discMsg.text}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÃ CODE *</div>
            <input style={{ ...inp2, textTransform: "uppercase", fontFamily: "monospace", letterSpacing: 2 }}
              value={discForm.code} onChange={e => setDiscForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="VD: THUE20" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>LOẠI GIẢM GIÁ *</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["percent", "% Phần trăm"], ["fixed", "đ Tiền mặt"]].map(([v, l]) => (
                <button key={v} onClick={() => setDiscForm(p => ({ ...p, type: v }))}
                  style={{ flex: 1, padding: "9px 0", background: discForm.type === v ? "#FFF8ED" : CARD, color: discForm.type === v ? G : MUT, border: `1px solid ${discForm.type === v ? G : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: discForm.type === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>🎯 ÁP DỤNG CHO *</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["rental", "🎞️ Giảm tiền thuê"], ["delivery", "🚗 Giảm phí giao nhận"]].map(([v, l]) => (
                <button key={v} onClick={() => setDiscForm(p => ({ ...p, voucherScope: v }))}
                  style={{ flex: 1, padding: "9px 6px", background: discForm.voucherScope === v ? "#FFF8ED" : CARD, color: discForm.voucherScope === v ? G : MUT, border: `1px solid ${discForm.voucherScope === v ? G : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: discForm.voucherScope === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s", textAlign: "center" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>
              GIÁ TRỊ GIẢM * {discForm.type === "percent" ? "(nhập số % — VD: 20 = giảm 20%)" : "(nhập số tiền — VD: 50000)"}
            </div>
            <input style={inp2} type="number" min="0"
              value={discForm.value} onChange={e => setDiscForm(p => ({ ...p, value: e.target.value }))}
              placeholder={discForm.type === "percent" ? "VD: 20" : "VD: 50000"} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>HẠN MỨC ĐƠN TỐI THIỂU (để trống = không giới hạn)</div>
            <input style={inp2} type="number" min="0"
              value={discForm.minOrder} onChange={e => setDiscForm(p => ({ ...p, minOrder: e.target.value }))} placeholder="VD: 200000" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LẦN DÙNG TỐI ĐA (để trống = không giới hạn)</div>
            <input style={inp2} type="number" min="0"
              value={discForm.maxUse} onChange={e => setDiscForm(p => ({ ...p, maxUse: e.target.value }))} placeholder="VD: 10" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>🏅 YÊU CẦU HUY HIỆU</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { v: "none", label: "🔓 Không yêu cầu", col: MUT },
                { v: "dong", label: "🥉 Khách Đồng", col: "#cd7f32" },
                { v: "bac", label: "🥈 Khách Bạc", col: "#aaa" },
                { v: "vang", label: "🥇 Khách Vàng", col: G },
                { v: "daigiadagia", label: "👑 Đại Gia", col: G },
                { v: "vip", label: "💎 VIP (5tr+)", col: "#38bdf8" },
                { v: "kimcuong", label: "💠 Kim Cương (10tr+)", col: "#e879f9" },
              ].map(({ v, label, col }) => (
                <button key={v} onClick={() => setDiscForm(p => ({ ...p, requiredBadge: v }))}
                  style={{ padding: "8px 6px", background: discForm.requiredBadge === v ? "#FFF8ED" : CARD, color: discForm.requiredBadge === v ? col : MUT, border: `1px solid ${discForm.requiredBadge === v ? col + "88" : BR2}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: discForm.requiredBadge === v ? 700 : 400, fontFamily: "system-ui,sans-serif", transition: "all .15s", textAlign: "center" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setDiscForm(p => ({ ...p, active: !p.active }))}
              style={{ width: 36, height: 20, borderRadius: 14, background: discForm.active ? "#22c55e" : "#333", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: discForm.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </button>
            <span style={{ color: discForm.active ? "#22c55e" : MUT, fontSize: 12, fontFamily: "system-ui,sans-serif" }}>{discForm.active ? "Đang hoạt động" : "Tắt mã"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveDisc} disabled={savingDisc} style={{ ...btn("gold"), flex: 1, opacity: savingDisc ? 0.65 : 1, cursor: savingDisc ? "not-allowed" : "pointer" }}>{savingDisc ? "⏳ Đang lưu..." : editDiscId ? "💾 Lưu thay đổi" : "➕ Tạo mã"}</button>
            {editDiscId && <button disabled={savingDisc} onClick={() => { setEditDiscId(null); setDiscForm({ code: "", type: "percent", value: "", minOrder: "", maxUse: "", active: true, requiredBadge: "none", voucherScope: "rental" }); setDiscMsg(null); }} style={{ ...btn("ghost"), opacity: savingDisc ? 0.55 : 1, cursor: savingDisc ? "not-allowed" : "pointer" }}>Huỷ</button>}
          </div>
        </div>

        {/* Stats & Help */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { l: "Tổng mã", v: discounts.length, c: G },
              { l: "Đang hoạt động", v: discounts.filter(d => d.active).length, c: "#22c55e" },
              { l: "Tổng lượt dùng", v: discounts.reduce((s, d) => s + (d.usedCount || 0), 0), c: "#60a5fa" },
              { l: "Đã tắt", v: discounts.filter(d => !d.active).length, c: MUT },
            ].map(s => (
              <div key={s.l} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 9, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: s.c, fontWeight: 800, fontSize: 22 }}>{s.v}</div>
                <div style={{ color: MUT, fontSize: 11, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: CARD2, border: `1px solid ${G}22`, borderRadius: 9, padding: "12px 16px" }}>
            <div style={{ color: MUT, fontSize: 11, lineHeight: 1.7 }}>
              <div style={{ color: G, fontWeight: 700, marginBottom: 6, fontSize: 12 }}>💡 Hướng dẫn</div>
              <div>• <span style={{ color: TXT }}>% Phần trăm:</span> VD: giá trị 20 → giảm 20% tổng đơn</div>
              <div>• <span style={{ color: TXT }}>đ Tiền mặt:</span> VD: giá trị 50000 → giảm 50.000đ</div>
              <div>• <span style={{ color: TXT }}>Hạn mức:</span> Đơn phải đạt X đồng mới được dùng</div>
              <div>• Phát mã cho khách qua Zalo / Facebook</div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách mã */}
      <div style={{ color: TXT, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Danh sách mã ({discounts.length})</div>
      {discounts.length === 0 && <div style={{ color: MUT, textAlign: "center", padding: 40, fontSize: 13 }}>Chưa có mã giảm giá nào</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {discounts.map(d => (
          <div key={d.id} style={{ background: CARD2, border: `1px solid ${d.active ? G + "33" : BR2}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: G, fontWeight: 800, fontSize: 16, fontFamily: "monospace", letterSpacing: 2 }}>{d.code}</span>
                <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: d.active ? "#022" : BR2, color: d.active ? "#22c55e" : MUT, border: `1px solid ${d.active ? "#22c55e44" : BR2}` }}>{d.active ? "ĐANG BẬT" : "TẮT"}</span>
                <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, background: "#FFF8ED", color: G, border: `1px solid ${G}44` }}>
                  {d.type === "percent" ? `Giảm ${d.value}%` : `Giảm ${fmtVND(d.value)}`}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, background: d.voucherScope === "delivery" ? "#0a1a2a" : "#1a1200", color: d.voucherScope === "delivery" ? "#60a5fa" : G, border: `1px solid ${d.voucherScope === "delivery" ? "#60a5fa44" : G + "44"}` }}>
                  {d.voucherScope === "delivery" ? "🚗 Ship" : "🎞️ Thuê"}
                </span>
              </div>
              <div style={{ color: MUT, fontSize: 11, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {d.minOrder > 0 && <span>Đơn tối thiểu: <span style={{ color: TXT }}>{fmtVND(d.minOrder)}</span></span>}
                <span>Đã dùng: <span style={{ color: d.maxUse && d.usedCount >= d.maxUse ? "#ef4444" : "#60a5fa" }}>{d.usedCount || 0}{d.maxUse ? `/${d.maxUse}` : ""} lượt</span></span>
                <span>Tạo: {d.createdAt}</span>
                {d.requiredBadge && d.requiredBadge !== "none" && (
                  <span style={{ color: d.requiredBadge === "kimcuong" ? "#e879f9" : d.requiredBadge === "vip" ? "#38bdf8" : d.requiredBadge === "vang" || d.requiredBadge === "daigiadagia" ? G : d.requiredBadge === "bac" ? "#aaa" : "#cd7f32", fontWeight: 700 }}>
                    🏅 Cần: {d.requiredBadge === "dong" ? "🥉 Khách Đồng" : d.requiredBadge === "bac" ? "🥈 Khách Bạc" : d.requiredBadge === "vang" ? "🥇 Khách Vàng" : d.requiredBadge === "daigiadagia" ? "👑 Đại Gia" : d.requiredBadge === "vip" ? "💎 VIP (5tr+)" : "💠 Kim Cương (10tr+)"}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button disabled={!!togglingDiscId || deletingDiscId === d.id} onClick={() => toggleActive(d)}
                style={{ padding: "6px 12px", background: d.active ? "#160505" : "#021a0a", color: d.active ? "#ef4444" : "#22c55e", border: `1px solid ${d.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 10, cursor: togglingDiscId || deletingDiscId === d.id ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: togglingDiscId && togglingDiscId !== d.id ? 0.55 : 1 }}>
                {togglingDiscId === d.id ? "Đang lưu..." : d.active ? "Tắt" : "Bật"}
              </button>
              <button disabled={deletingDiscId === d.id || togglingDiscId === d.id} onClick={() => startEdit(d)} style={{ padding: "6px 12px", background: CARD, color: TXT, border: `1px solid ${BR2}`, borderRadius: 10, cursor: deletingDiscId === d.id || togglingDiscId === d.id ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: deletingDiscId === d.id || togglingDiscId === d.id ? 0.55 : 1 }}>✏️</button>
              {pendingDeleteDiscId === d.id ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "system-ui,sans-serif" }}>Xoá?</span>
                  <button disabled={deletingDiscId === d.id} onClick={() => deleteDisc(d.id)} style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, cursor: deletingDiscId === d.id ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: deletingDiscId === d.id ? 0.7 : 1 }}>{deletingDiscId === d.id ? "..." : "✓"}</button>
                  <button disabled={deletingDiscId === d.id} onClick={() => setPendingDeleteDiscId(null)} style={{ padding: "6px 10px", background: CARD, color: MUT, border: `1px solid ${BR2}`, borderRadius: 10, cursor: deletingDiscId === d.id ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: deletingDiscId === d.id ? 0.55 : 1 }}>✕</button>
                </div>
              ) : (
                <button disabled={togglingDiscId === d.id} onClick={() => setPendingDeleteDiscId(d.id)} style={{ padding: "6px 12px", background: "#FEF0F0", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 10, cursor: togglingDiscId === d.id ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: togglingDiscId === d.id ? 0.55 : 1 }}>🗑</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
