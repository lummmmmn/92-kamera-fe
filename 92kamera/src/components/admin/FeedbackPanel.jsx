import React, { useState } from "react";
import { TXT, MUT, CARD, CARD2, BR, G, btn } from "../../lib/constants.js";
import { useFeedbacks, useUpdateFeedback, useDeleteFeedback } from "../../hooks/useAppData.js";

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

export default function FeedbackPanel({ isMobile }) {
  const { data: feedbacks = [], refetch } = useFeedbacks();
  const updateFeedbackMutation = useUpdateFeedback();
  const deleteFeedbackMutation = useDeleteFeedback();
  const [loadingAction, setLoadingAction] = useState(null);

  const pending = feedbacks.filter(f => f.status === "pending");
  const approved = feedbacks.filter(f => f.status === "approved");
  const rejected = feedbacks.filter(f => f.status === "rejected");

  const runAction = async (key, action) => {
    if (loadingAction) return;

    try {
      setLoadingAction(key);
      await action();
      await refetch();
    } catch (err) {
      alert("Thao tác feedback thất bại: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async (id) => {
    await runAction(`approve:${id}`, () => updateFeedbackMutation.mutateAsync({ id, data: { status: "approved", seen: true } }));
  };

  const handleReject = async (id) => {
    await runAction(`reject:${id}`, () => updateFeedbackMutation.mutateAsync({ id, data: { status: "rejected", seen: true } }));
  };

  const handleToggleHide = async (f) => {
    await runAction(`hide:${f.id}`, () => updateFeedbackMutation.mutateAsync({ id: f.id, data: { hidden: !f.hidden } }));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá vĩnh viễn feedback này?")) {
      await runAction(`delete:${id}`, () => deleteFeedbackMutation.mutateAsync(id));
    }
  };

  const isLoading = (key) => loadingAction === key;
  const isBusy = !!loadingAction;

  const FbCard = ({ f, actions }) => (
    <div style={{ background: CARD, border: `1px solid ${f.status === "approved" ? "#22c55e33" : f.status === "rejected" ? "#ef444433" : BR}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: G, fontSize: 14 }}>{"★".repeat(f.rating)}<span style={{ color: MUT }}>{"★".repeat(5 - f.rating)}</span></span>
            {f.hidden && <span style={{ background: "#44444422", color: "#888", borderRadius: 99, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>HIDDEN</span>}
          </div>
          <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{f.userName}</div>
          <div style={{ color: MUT, fontSize: 11 }}>📞 {f.phone} · 📷 {f.cameraName}</div>
          <div style={{ color: MUT, fontSize: 10, marginTop: 2 }}>Đơn: {f.orderId} · {f.date}</div>
        </div>
      </div>
      {f.text && <div style={{ color: TXT, fontSize: 12, lineHeight: 1.6, marginBottom: 12, background: CARD, padding: "8px 10px", borderRadius: 10, fontStyle: "italic" }}>"{f.text}"</div>}
      {f.images?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {f.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 12, border: `1px solid ${BR}` }} loading="lazy" />)}
        </div>
      )}
      {actions}
    </div>
  );

  return (
    <div>
      <STitle c={`Feedback đơn thuê (${feedbacks.length})`} />
      
      {/* Chờ duyệt */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>⏳ Chờ duyệt</div>
          {pending.length > 0 && <span style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{pending.length}</span>}
        </div>
        {pending.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Không có feedback chờ duyệt</div> : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
            {pending.map(f => (
              <FbCard key={f.id} f={f} actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button disabled={isBusy} onClick={() => handleApprove(f.id)} style={{ flex: 1, padding: "8px 0", background: "#EEF9F4", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`approve:${f.id}`) ? 0.55 : 1 }}>{isLoading(`approve:${f.id}`) ? "⏳ Đang duyệt..." : "✓ Duyệt"}</button>
                  <button disabled={isBusy} onClick={() => handleReject(f.id)} style={{ flex: 1, padding: "8px 0", background: "#FEF0F0", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`reject:${f.id}`) ? 0.55 : 1 }}>{isLoading(`reject:${f.id}`) ? "⏳ Đang từ chối..." : "✕ Từ chối"}</button>
                  <button disabled={isBusy} onClick={() => handleDelete(f.id)} style={{ padding: "8px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`delete:${f.id}`) ? 0.55 : 1 }}>{isLoading(`delete:${f.id}`) ? "Đang xoá..." : "🗑"}</button>
                </div>
              } />
            ))}
          </div>
        )}
      </div>

      {/* Đã duyệt */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>✅ Đã duyệt — hiện trang chủ</div>
          {approved.length > 0 && <span style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>{approved.length}</span>}
        </div>
        {approved.length === 0 ? <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có feedback được duyệt</div> : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
            {approved.map(f => (
              <FbCard key={f.id} f={f} actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button disabled={isBusy} onClick={() => handleToggleHide(f)} style={{ flex: 1, padding: "7px 0", background: f.hidden ? "#052210" : "#1a1a00", border: `1px solid ${f.hidden ? "#22c55e44" : G + "44"}`, color: f.hidden ? "#22c55e" : G, borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`hide:${f.id}`) ? 0.55 : 1 }}>
                    {isLoading(`hide:${f.id}`) ? "⏳ Đang lưu..." : f.hidden ? "👁 Hiện lại" : "🙈 Ẩn"}
                  </button>
                  <button disabled={isBusy} onClick={() => handleReject(f.id)} style={{ flex: 1, padding: "7px 0", background: "#FEF0F0", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`reject:${f.id}`) ? 0.55 : 1 }}>{isLoading(`reject:${f.id}`) ? "⏳ Đang gỡ..." : "Gỡ"}</button>
                  <button disabled={isBusy} onClick={() => handleDelete(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`delete:${f.id}`) ? 0.55 : 1 }}>{isLoading(`delete:${f.id}`) ? "Đang xoá..." : "🗑"}</button>
                </div>
              } />
            ))}
          </div>
        )}
      </div>

      {/* Từ chối */}
      {rejected.length > 0 && (
        <div>
          <div style={{ color: MUT, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>✕ Từ chối ({rejected.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
            {rejected.map(f => (
              <FbCard key={f.id} f={f} actions={
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={isBusy} onClick={() => handleApprove(f.id)} style={{ flex: 1, padding: "7px 0", background: "#EEF9F4", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`approve:${f.id}`) ? 0.55 : 1 }}>{isLoading(`approve:${f.id}`) ? "⏳ Đang duyệt..." : "Duyệt lại"}</button>
                  <button disabled={isBusy} onClick={() => handleDelete(f.id)} style={{ padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT, borderRadius: 10, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "system-ui,sans-serif", opacity: isBusy && !isLoading(`delete:${f.id}`) ? 0.55 : 1 }}>{isLoading(`delete:${f.id}`) ? "Đang xoá..." : "Xoá"}</button>
                </div>
              } />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
