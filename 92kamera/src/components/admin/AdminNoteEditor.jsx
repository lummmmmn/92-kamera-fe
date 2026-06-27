import { useState } from "react";
import { G, MUT, RED, CARD } from "../../lib/constants.js";

export default function AdminNoteEditor({ order, onUpdateOrder, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.adminNote || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (saving || deleting) return;

    try {
      setSaving(true);
      await onUpdateOrder({ id: order.id, data: { ...order, adminNote: draft } });
      setSaved(true);
      setEditing(false);
      onToast?.("Đã lưu ghi chú nội bộ");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Lưu ghi chú thất bại: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (saving || deleting) return;

    try {
      setDeleting(true);
      setDraft("");
      await onUpdateOrder({ id: order.id, data: { ...order, adminNote: "" } });
      setEditing(false);
      onToast?.("Đã xoá ghi chú nội bộ");
    } catch (err) {
      alert("Xoá ghi chú thất bại: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const hasNote = !!(order.adminNote && order.adminNote.trim());

  return (
    <div
      style={{
        background: "#FFF8ED",
        border: `1px solid ${hasNote ? "#f59e0b44" : "#2a2a2a12"}`,
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing ? 8 : hasNote ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: "system-ui,sans-serif" }}>
            GHI CHÚ NỘI BỘ
          </span>
          <span style={{ color: "#555", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>· Khách không thấy</span>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setDraft(order.adminNote || "");
              setEditing(true);
            }}
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: "1px solid #f59e0b44",
              color: "#f59e0b",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "system-ui,sans-serif",
              fontWeight: 600,
            }}
          >
            {hasNote ? "Sửa" : "+ Thêm ghi chú"}
          </button>
        )}
      </div>
      {!editing && hasNote && (
        <div style={{ color: "#f59e0b", fontSize: 12, fontStyle: "italic", lineHeight: 1.5, fontFamily: "system-ui,sans-serif" }}>
          {order.adminNote}
        </div>
      )}
      {editing && (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="VD: khách hay trả trễ, cần đặt cọc trước..."
            style={{
              width: "100%",
              padding: "8px 10px",
              background: CARD,
              border: "1px solid #f59e0b44",
              borderRadius: 10,
              color: "#f59e0b",
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              resize: "vertical",
              minHeight: 72,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={save}
              disabled={saving || deleting}
              style={{
                padding: "6px 14px",
                background: "#FFF8ED",
                border: "1px solid #f59e0b66",
                color: "#f59e0b",
                borderRadius: 10,
                cursor: saving || deleting ? "not-allowed" : "pointer",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "system-ui,sans-serif",
                opacity: saving || deleting ? 0.65 : 1,
              }}
            >
              {saving ? "⏳ Đang lưu..." : saved ? "✓ Đã lưu!" : "💾 Lưu"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving || deleting}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid #2a2a2a",
                color: MUT,
                borderRadius: 10,
                cursor: saving || deleting ? "not-allowed" : "pointer",
                fontSize: 11,
                fontFamily: "system-ui,sans-serif",
                opacity: saving || deleting ? 0.55 : 1,
              }}
            >
              Huỷ
            </button>
            {hasNote && (
              <button
                onClick={deleteNote}
                disabled={saving || deleting}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid #cc333333",
                  color: RED,
                  borderRadius: 10,
                  cursor: saving || deleting ? "not-allowed" : "pointer",
                  fontSize: 11,
                  fontFamily: "system-ui,sans-serif",
                  marginLeft: "auto",
                  opacity: saving || deleting ? 0.65 : 1,
                }}
              >
                {deleting ? "Đang xoá..." : "Xoá ghi chú"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
