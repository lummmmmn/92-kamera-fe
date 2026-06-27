import React, { useState, useEffect } from "react";
import { TXT, MUT, CARD, CARD2, BR, BR2, G } from "../../lib/constants.js";
import { useDeliveryFees, useUpdateDeliveryFees } from "../../hooks/useAppData.js";

export default function DeliveryPanel({ isMobile }) {
  const { data: fees = [], refetch } = useDeliveryFees();
  const updateDeliveryMutation = useUpdateDeliveryFees();

  const [localFees, setLocalFees] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [savingArea, setSavingArea] = useState(null);
  const [addingArea, setAddingArea] = useState(false);
  const [newArea, setNewArea] = useState({ name: "", fee: "" });
  const [savingNewArea, setSavingNewArea] = useState(false);

  useEffect(() => {
    if (fees) {
      setLocalFees(fees.map((f) => ({ ...f })));
    }
  }, [fees]);

  const parseFeeInput = (val) => {
    const num = parseInt(String(val).replace(/\D/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  const handleFeeChange = (idx, val) => {
    const num = parseFeeInput(val);
    setLocalFees((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, fee: num } : f))
    );
    setSaved(false);
  };

  const handleStartEdit = (areaName) => {
    if (saving || savingArea || savingNewArea) return;
    setAddingArea(false);
    setEditingArea(areaName);
    setSaved(false);
  };

  const handleCancelEdit = (idx, areaName) => {
    const original = fees.find((f) => f.name === areaName);
    if (original) {
      setLocalFees((prev) => prev.map((f, i) => (i === idx ? { ...original } : f)));
    }
    setEditingArea(null);
  };

  const handleSaveArea = async (areaName) => {
    if (saving || savingArea || savingNewArea) return;

    setSavingArea(areaName);
    try {
      await updateDeliveryMutation.mutateAsync(localFees);
      await refetch();
      setSaved(true);
      setEditingArea(null);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Lưu phí giao nhận thất bại: " + err.message);
    } finally {
      setSavingArea(null);
    }
  };

  const handleStartAdd = () => {
    if (saving || savingArea || savingNewArea) return;
    setEditingArea(null);
    setNewArea({ name: "", fee: "" });
    setAddingArea(true);
    setSaved(false);
  };

  const handleCancelAdd = () => {
    if (savingNewArea) return;
    setAddingArea(false);
    setNewArea({ name: "", fee: "" });
  };

  const handleSaveNewArea = async () => {
    if (saving || savingArea || savingNewArea) return;

    const name = newArea.name.trim();
    if (!name) {
      alert("Nhập tên khu vực/xã");
      return;
    }

    const exists = localFees.some((f) => f.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      alert("Khu vực/xã này đã tồn tại");
      return;
    }

    const nextFees = [...localFees, { name, fee: parseFeeInput(newArea.fee) }];

    setSavingNewArea(true);
    try {
      await updateDeliveryMutation.mutateAsync(nextFees);
      setLocalFees(nextFees);
      await refetch();
      setSaved(true);
      setAddingArea(false);
      setNewArea({ name: "", fee: "" });
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Thêm khu vực/xã thất bại: " + err.message);
    } finally {
      setSavingNewArea(false);
    }
  };

  const handleSave = async () => {
    if (savingArea || savingNewArea) return;

    setSaving(true);
    try {
      await updateDeliveryMutation.mutateAsync(localFees);
      setSaved(true);
      await refetch();
      setEditingArea(null);
      setAddingArea(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Lưu phí giao nhận thất bại: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp2 = {
    background: "rgba(255,255,255,0.55)",
    border: `1px solid ${BR}`,
    borderRadius: 9,
    padding: "7px 11px",
    color: TXT,
    fontSize: 13,
    fontFamily: "system-ui,sans-serif",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>
            🚗 Quản lý phí giao nhận
          </h2>
          <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          onClick={handleStartAdd}
          disabled={saving || !!savingArea || savingNewArea || addingArea}
          style={{
            padding: "9px 16px",
            background: "rgba(13,27,42,0.08)",
            color: TXT,
            border: `1px solid ${BR}`,
            borderRadius: 12,
            cursor: saving || savingArea || savingNewArea || addingArea ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "system-ui,sans-serif",
            opacity: saving || savingArea || savingNewArea || addingArea ? 0.6 : 1,
          }}
        >
          + Thêm khu vực
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !!savingArea || savingNewArea}
          style={{
            padding: "9px 22px",
            background: saved ? "#22c55e" : `linear-gradient(135deg,${G},#1a3a5c)`,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: saving || savingArea || savingNewArea ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "system-ui,sans-serif",
            opacity: saving || savingArea || savingNewArea ? 0.7 : 1,
            transition: "all .2s",
          }}
        >
          {saving ? "⏳ Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu tất cả"}
        </button>
        </div>
      </div>

      <div
        style={{
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.25)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 12,
          color: MUT,
          fontFamily: "system-ui,sans-serif",
          lineHeight: 1.6,
        }}
      >
        Giá nhập là phí <strong>2 chiều</strong> (giao + nhận lại). Phí 1 chiều = ½ giá 2 chiều. Nhập 0 = miễn phí. Sau khi lưu, khách mở lại trang sẽ thấy giá mới.
      </div>

      <div style={{ background: "rgba(255,255,255,0.45)", border: `1px solid ${BR}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header bảng */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 180px 170px", gap: 0, background: "rgba(8,20,36,0.07)", padding: "10px 16px", borderBottom: `1px solid ${BR}` }}>
          <span style={{ color: MUT, fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>KHU VỰC</span>
          {!isMobile && <span style={{ color: MUT, fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 1, textAlign: "right" }}>PHÍ 2 CHIỀU (đ)</span>}
          {!isMobile && <span style={{ color: MUT, fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 1, textAlign: "right" }}>THAO TÁC</span>}
        </div>

        {addingArea && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 180px 170px",
              gap: isMobile ? 8 : 12,
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: `1px solid rgba(139,174,207,0.25)`,
              background: "rgba(201,168,76,0.08)",
            }}
          >
            <input
              style={inp2}
              value={newArea.name}
              disabled={savingNewArea}
              onChange={(e) => setNewArea((p) => ({ ...p, name: e.target.value }))}
              placeholder="Tên khu vực / xã mới"
              autoFocus
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "flex-end", gap: 6 }}>
              <input
                type="text"
                inputMode="numeric"
                disabled={savingNewArea}
                style={{ ...inp2, textAlign: "right", width: 120, opacity: savingNewArea ? 0.65 : 1 }}
                value={newArea.fee}
                onChange={(e) => setNewArea((p) => ({ ...p, fee: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
              />
              <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", flexShrink: 0 }}>đ</span>
            </div>
            <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end", gap: 8 }}>
              <button
                onClick={handleSaveNewArea}
                disabled={savingNewArea}
                style={{ padding: "7px 12px", background: "#0d1b2a", color: "#fff", border: "none", borderRadius: 10, cursor: savingNewArea ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: savingNewArea ? 0.7 : 1 }}
              >
                {savingNewArea ? "Đang thêm..." : "Lưu"}
              </button>
              <button
                onClick={handleCancelAdd}
                disabled={savingNewArea}
                style={{ padding: "7px 12px", background: CARD2, color: MUT, border: `1px solid ${BR}`, borderRadius: 10, cursor: savingNewArea ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: savingNewArea ? 0.55 : 1 }}
              >
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* Rows */}
        {localFees.map((area, idx) => {
          const isEditing = editingArea === area.name;
          const isSaving = savingArea === area.name;
          const rowDisabled = saving || savingNewArea || (!!savingArea && !isSaving);

          return (
            <div
              key={area.name}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 180px 170px",
                gap: isMobile ? 8 : 12,
                alignItems: "center",
                padding: "10px 16px",
                borderBottom: idx < localFees.length - 1 ? `1px solid rgba(139,174,207,0.25)` : "none",
                background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.18)",
              }}
            >
              <div>
                <span style={{ color: TXT, fontSize: 13, fontFamily: "system-ui,sans-serif", fontWeight: 500 }}>{area.name}</span>
                {area.fee === 0 && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: "#22c55e", fontFamily: "system-ui,sans-serif" }}>Miễn phí</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "flex-end", gap: 6 }}>
                {isEditing ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isSaving}
                    style={{ ...inp2, textAlign: "right", width: 120, opacity: isSaving ? 0.65 : 1 }}
                    value={area.fee === 0 ? "0" : String(area.fee)}
                    onChange={(e) => handleFeeChange(idx, e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span style={{ color: TXT, fontSize: 15, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
                    {new Intl.NumberFormat("vi-VN").format(area.fee)}
                  </span>
                )}
                <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", flexShrink: 0 }}>đ</span>
              </div>
              <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end", gap: 8 }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleSaveArea(area.name)}
                      disabled={isSaving}
                      style={{ padding: "7px 12px", background: "#0d1b2a", color: "#fff", border: "none", borderRadius: 10, cursor: isSaving ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: isSaving ? 0.7 : 1 }}
                    >
                      {isSaving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button
                      onClick={() => handleCancelEdit(idx, area.name)}
                      disabled={isSaving}
                      style={{ padding: "7px 12px", background: CARD2, color: MUT, border: `1px solid ${BR}`, borderRadius: 10, cursor: isSaving ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isSaving ? 0.55 : 1 }}
                    >
                      Huỷ
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStartEdit(area.name)}
                    disabled={rowDisabled}
                    style={{ padding: "7px 14px", background: "rgba(13,27,42,0.08)", color: TXT, border: `1px solid ${BR}`, borderRadius: 10, cursor: rowDisabled ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: rowDisabled ? 0.55 : 1 }}
                  >
                    Sửa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview logic */}
      <div style={{ marginTop: 20, background: "rgba(255,255,255,0.35)", border: `1px solid ${BR}`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ color: MUT, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 10 }}>
          VÍ DỤ TÍNH PHÍ
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {localFees
            .filter((f) => f.fee > 0)
            .slice(0, 4)
            .map((f) => (
              <div key={f.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "system-ui,sans-serif" }}>
                <span style={{ color: TXT }}>{f.name}</span>
                <span style={{ color: MUT }}>
                  1 chiều: <strong style={{ color: G }}>{new Intl.NumberFormat("vi-VN").format(Math.round(f.fee / 2))}đ</strong>
                  {" · "}
                  2 chiều: <strong style={{ color: G }}>{new Intl.NumberFormat("vi-VN").format(f.fee)}đ</strong>
                </span>
              </div>
            ))}
          {localFees.some((f) => f.fee === 0) && (
            <div style={{ fontSize: 12, color: "#22c55e", fontFamily: "system-ui,sans-serif" }}>
              ✓ {localFees.filter((f) => f.fee === 0).map((f) => f.name).join(", ")}: Miễn phí giao nhận
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
