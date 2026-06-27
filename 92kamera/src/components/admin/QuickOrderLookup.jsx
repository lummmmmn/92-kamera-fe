import { useEffect, useState } from "react";
import Badge from "../common/Badge.jsx";
import { G, CARD, BR2, MUT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";

export default function QuickOrderLookup({ orders, inp2, setExpandedOrder, setSearch, setOrderFilter, setExportMonth, setShowAllMonths, onClearSearch, resetToken }) {
  const [quickId, setQuickId] = useState("");
  const [quickResult, setQuickResult] = useState(null);
  const [quickErr, setQuickErr] = useState(false);

  useEffect(() => {
    setQuickId("");
    setQuickErr(false);
    setQuickResult(null);
  }, [resetToken]);

  const clearLookup = () => {
    setQuickId("");
    setQuickErr(false);
    setQuickResult(null);
    if (onClearSearch) {
      onClearSearch();
    } else {
      setSearch?.("");
      setOrderFilter?.("all");
      setShowAllMonths?.(true);
      setExpandedOrder?.(null);
    }
  };

  const lookup = () => {
    const q = quickId.trim().toUpperCase();
    if (!q) return;
    const found = orders.find((o) => o.id.toUpperCase() === q || o.id.toUpperCase().includes(q));
    if (found) {
      setQuickResult(found);
      setQuickErr(false);
      setOrderFilter?.("all");
      setSearch?.(found.id);
      setShowAllMonths?.(false);
      if (found.date && setExportMonth) {
        const d = new Date(found.date + "T00:00:00");
        if (!Number.isNaN(d.getTime())) {
          setExportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
      setExpandedOrder(found.id);
    } else {
      setQuickResult(null);
      setQuickErr(true);
    }
  };

  return (
    <div style={{ marginBottom: 18, background: CARD, border: `1px solid ${BR2}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: MUT, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>⚡ TRA CỨU NHANH MÃ ĐƠN</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={quickId}
          onChange={(e) => {
            const value = e.target.value;
            setQuickId(value);
            setQuickErr(false);
            setQuickResult(null);
            if (!value.trim()) clearLookup();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") lookup();
            if (e.key === "Escape") clearLookup();
          }}
          placeholder="#92K0001 hoặc nhập một phần mã..."
          style={{ ...inp2, flex: 1, fontFamily: "monospace", letterSpacing: 1 }}
        />
        {quickId && (
          <button
            type="button"
            onClick={clearLookup}
            style={{
              padding: "10px 14px",
              background: "rgba(13,27,42,0.08)",
              color: MUT,
              border: `1px solid ${BR2}`,
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            Xoá
          </button>
        )}
        <button
          onClick={lookup}
          style={{
            padding: "10px 18px",
            background: G,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            fontFamily: "system-ui,sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          Tìm
        </button>
      </div>
      {quickErr && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>❌ Không tìm thấy mã đơn này</div>}
      {quickResult && (
        <div style={{ marginTop: 10, background: "#EEF9F4", border: "1px solid #22c55e33", borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div>
              <span style={{ color: G, fontWeight: 800, fontFamily: "monospace", fontSize: 13 }}>{quickResult.id}</span>
              <span style={{ marginLeft: 10 }}>
                <Badge status={quickResult.status} />
              </span>
            </div>
            <span style={{ color: G, fontWeight: 700 }}>{fmtVND(quickResult.total)}</span>
          </div>
          {quickResult.date && (
            <div style={{ color: MUT, fontSize: 11, marginTop: 6 }}>
              Đã mở đúng tháng của đơn để bạn xem trong danh sách bên dưới.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
