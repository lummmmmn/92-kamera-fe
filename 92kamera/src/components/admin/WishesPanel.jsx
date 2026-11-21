import React, { useState } from "react";
import { TXT, MUT, CARD, BR, G } from "../../lib/constants.js";
import { WISH_SOCKS } from "../pixel/wishSocks.js";
import {
  useWishes, useMarkWishRead, useDeleteWish, useDeleteReadWishes, useWishSocks, useUpdateWishSocks,
} from "../../hooks/useWishes.js";

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

const fmtTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
};

export default function WishesPanel({ isMobile }) {
  const { data: wishes = [], isLoading, refetch } = useWishes();
  const { data: socks } = useWishSocks();
  const markRead = useMarkWishRead();
  const removeWish = useDeleteWish();
  const removeRead = useDeleteReadWishes();
  const updateSocks = useUpdateWishSocks();
  const [busyKey, setBusyKey] = useState(null);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const run = async (key, action) => {
    if (busyKey) return;
    try {
      setBusyKey(key);
      await action();
    } catch (err) {
      alert("Thao tác điều ước thất bại: " + (err?.response?.data?.error || err.message));
    } finally {
      setBusyKey(null);
    }
  };

  const unread = wishes.filter((w) => !w.read).length;
  const readCount = wishes.length - unread;
  const shown = onlyUnread ? wishes.filter((w) => !w.read) : wishes;
  const sockLabel = (id) => {
    const s = WISH_SOCKS.find((k) => k.id === Number(id));
    return s ? `Tất ${s.name} #${s.id}` : `Tất #${id}`;
  };

  const smallBtn = (extra = {}) => ({
    padding: "7px 12px", background: "none", border: `1px solid ${BR}`, color: MUT,
    borderRadius: 10, cursor: busyKey ? "not-allowed" : "pointer", fontSize: 11,
    fontFamily: "system-ui,sans-serif", opacity: busyKey ? 0.55 : 1, ...extra,
  });

  return (
    <div>
      <STitle c={`Điều ước trong tất (${wishes.length})`} />

      {/* Bật / tắt từng tất */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: TXT, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🧦 Bật / tắt từng tất</div>
        <div style={{ color: MUT, fontSize: 12, marginBottom: 12 }}>
          Tất đang mở: khách bấm vào và gửi được điều ước. Tất đang tắt: chỉ là đồ trang trí, khách không bấm được.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${WISH_SOCKS.length},1fr)`, gap: 12 }}>
          {WISH_SOCKS.map((s) => {
            const enabled = socks ? socks[s.id] !== false : false;
            const key = `sock:${s.id}`;
            return (
              <div key={s.id} style={{ background: CARD, border: `1px solid ${enabled ? "#22c55e55" : BR}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                <div style={{ width: 22, height: 22, margin: "0 auto 6px", background: s.color, border: "2px solid #14181f" }} />
                <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{sockLabel(s.id)}</div>
                <div style={{ color: enabled ? "#22c55e" : MUT, fontSize: 11, fontWeight: 700, margin: "4px 0 10px" }}>
                  {socks ? (enabled ? "ĐANG MỞ" : "ĐANG TẮT") : "..."}
                </div>
                <button
                  disabled={!socks || !!busyKey}
                  onClick={() => run(key, () => updateSocks.mutateAsync({ [s.id]: !enabled }))}
                  style={{
                    width: "100%", padding: "8px 0", borderRadius: 10, cursor: !socks || busyKey ? "not-allowed" : "pointer",
                    fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif",
                    background: enabled ? "#FEF0F0" : "#EEF9F4",
                    border: `1px solid ${enabled ? "#ef444433" : "#22c55e44"}`,
                    color: enabled ? "#ef4444" : "#22c55e", opacity: busyKey && busyKey !== key ? 0.55 : 1,
                  }}
                >
                  {busyKey === key ? "⏳ Đang lưu..." : enabled ? "Tắt tất này" : "Mở tất này"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danh sách điều ước */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ color: TXT, fontWeight: 700, fontSize: 14 }}>💌 Điều ước khách gửi</div>
        {unread > 0 && (
          <span style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>
            {unread} chưa đọc
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setOnlyUnread((v) => !v)} style={smallBtn({ cursor: "pointer", opacity: 1, color: onlyUnread ? G : MUT, fontWeight: onlyUnread ? 700 : 400 })}>
          {onlyUnread ? "Đang lọc: chưa đọc" : "Chỉ xem chưa đọc"}
        </button>
        <button
          disabled={readCount === 0 || !!busyKey}
          onClick={() => {
            if (window.confirm(`Xoá vĩnh viễn ${readCount} điều ước đã đọc? (điều ước chưa đọc được giữ lại)`)) {
              run("delread", () => removeRead.mutateAsync());
            }
          }}
          style={smallBtn({ cursor: readCount === 0 || busyKey ? "not-allowed" : "pointer", opacity: readCount === 0 ? 0.45 : 1, color: "#ef4444" })}
        >
          {busyKey === "delread" ? "Đang xoá..." : `🗑 Xoá tất cả đã đọc (${readCount})`}
        </button>
        <button onClick={() => refetch()} style={smallBtn({ cursor: "pointer", opacity: 1 })}>↻ Tải lại</button>
      </div>

      {isLoading ? (
        <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Đang tải...</div>
      ) : shown.length === 0 ? (
        <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>
          {onlyUnread ? "Không có điều ước chưa đọc" : "Chưa có điều ước nào"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
          {shown.map((w) => (
            <div key={w.id} style={{ background: CARD, border: `1px solid ${w.read ? BR : "#ef444455"}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>🧦 {sockLabel(w.sockId)}</div>
                {!w.read && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 8px", fontSize: 9, fontWeight: 800 }}>MỚI</span>}
              </div>
              <div style={{ color: MUT, fontSize: 11, marginBottom: 10 }}>{fmtTime(w.createdAt)}</div>
              <div style={{ color: TXT, fontSize: 13, lineHeight: 1.6, marginBottom: 10, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{w.message}</div>
              <div style={{ fontSize: 12, marginBottom: 12, color: MUT }}>
                {w.phone ? (
                  <>📞 <a href={`tel:${w.phone}`} style={{ color: TXT, fontWeight: 700 }}>{w.phone}</a></>
                ) : (
                  <span>🕶️ Ẩn danh (không để lại liên lạc)</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={!!busyKey}
                  onClick={() => run(`read:${w.id}`, () => markRead.mutateAsync({ id: w.id, read: !w.read }))}
                  style={smallBtn({ flex: 1 })}
                >
                  {busyKey === `read:${w.id}` ? "⏳ Đang lưu..." : w.read ? "Đánh dấu chưa đọc" : "✓ Đã đọc"}
                </button>
                <button
                  disabled={!!busyKey}
                  onClick={() => {
                    if (window.confirm("Xoá vĩnh viễn điều ước này?")) run(`del:${w.id}`, () => removeWish.mutateAsync(w.id));
                  }}
                  style={smallBtn()}
                >
                  {busyKey === `del:${w.id}` ? "Đang xoá..." : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
