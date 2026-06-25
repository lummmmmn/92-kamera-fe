import React, { useState, useEffect } from "react";
import { TXT, MUT, CARD, CARD2, BR, BR2, G } from "../../lib/constants.js";
import { useDeliveryFees, useUpdateDeliveryFees } from "../../hooks/useAppData.js";

export default function DeliveryPanel({ isMobile }) {
  const { data: fees = [], refetch } = useDeliveryFees();
  const updateDeliveryMutation = useUpdateDeliveryFees();

  const [localFees, setLocalFees] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fees) {
      setLocalFees(fees.map((f) => ({ ...f })));
    }
  }, [fees]);

  const handleFeeChange = (idx, val) => {
    const num = parseInt(val.replace(/\D/g, ""), 10);
    setLocalFees((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, fee: isNaN(num) ? 0 : num } : f))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDeliveryMutation.mutateAsync(localFees);
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2500);
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
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "9px 22px",
            background: saved ? "#22c55e" : `linear-gradient(135deg,${G},#1a3a5c)`,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "system-ui,sans-serif",
            opacity: saving ? 0.7 : 1,
            transition: "all .2s",
          }}
        >
          {saving ? "⏳ Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu thay đổi"}
        </button>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 0, background: "rgba(8,20,36,0.07)", padding: "10px 16px", borderBottom: `1px solid ${BR}` }}>
          <span style={{ color: MUT, fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 1 }}>KHU VỰC</span>
          <span style={{ color: MUT, fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 1, textAlign: "right" }}>PHÍ 2 CHIỀU (đ)</span>
        </div>

        {/* Rows */}
        {localFees.map((area, idx) => (
          <div
            key={area.name}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: 12,
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="text"
                inputMode="numeric"
                style={{ ...inp2, textAlign: "right", width: 120 }}
                value={area.fee === 0 ? "0" : String(area.fee)}
                onChange={(e) => handleFeeChange(idx, e.target.value)}
              />
              <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif", flexShrink: 0 }}>đ</span>
            </div>
          </div>
        ))}
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
