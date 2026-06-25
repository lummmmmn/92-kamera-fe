import { useState } from "react";
import Badge from "../common/Badge.jsx";
import { G, MUT, TXT, CARD, CARD2, BR } from "../../lib/constants.js";
import { fmtVND, fmtDays, dateAddDays } from "../../utils/format.js";

// CopyOrderBtn inline helper
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

export default function CustomerLoginView({
  loggedUser,
  setLoggedUser,
  myOrders,
  totalSpent,
  completedOrders,
  setPage,
  onBack,
  isInAppBrowser,
  openInExternalBrowser,
  gsiErr,
  gsiReady,
  googleBtnRef,
  GoogleIcon,
}) {
  return (
    <div style={{ marginTop: 24, textAlign: "left" }}>
      {/* Chưa đăng nhập */}
      {!loggedUser && (
        <div style={{ textAlign: "center" }}>
          {/* Camera illustration with glow */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 18 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse 80% 55% at 50% 60%, rgba(139,107,61,0.12) 0%, transparent 70%)",
                filter: "blur(10px)",
                transform: "scale(1.4) translateY(10px)",
                borderRadius: "50%",
              }}
            />
            <div className="cam-float-92k" style={{ fontSize: 64, lineHeight: 1, position: "relative", filter: "drop-shadow(0 4px 24px rgba(201,168,76,0.3))" }}>
              📷
            </div>
          </div>

          <div style={{ color: TXT, fontSize: 20, fontWeight: 700, fontFamily: "'Georgia', serif", letterSpacing: 0.3, marginBottom: 8 }}>
            Đăng nhập
          </div>
          <div style={{ color: MUT, fontSize: 12.5, fontFamily: "system-ui,sans-serif", lineHeight: 1.75, marginBottom: 28 }}>
            Đăng nhập ngay để nhận ưu đãi của thành viên
          </div>

          {/* Google button area */}
          <div style={{ marginBottom: 16 }}>
            {isInAppBrowser ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ color: TXT, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.7, marginBottom: 12 }}>
                  Facebook đang mở trang bằng trình duyệt nhúng nên Google có thể chặn đăng nhập.
                </div>
                <button
                  onClick={openInExternalBrowser}
                  style={{
                    width: "100%",
                    padding: "13px 18px",
                    borderRadius: 16,
                    border: `1px solid ${BR}`,
                    background: "#fff",
                    color: "#0d1b2a",
                    fontSize: 13,
                    fontFamily: "system-ui,sans-serif",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <GoogleIcon /> Mở bằng trình duyệt để đăng nhập
                </button>
                <div style={{ color: MUT, fontSize: 10.5, fontFamily: "system-ui,sans-serif", lineHeight: 1.6, marginTop: 10 }}>
                  Nếu iPhone vẫn ở trong Facebook, bấm biểu tượng chia sẻ rồi chọn “Open in Browser/Safari”.
                </div>
              </div>
            ) : gsiErr ? (
              <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "system-ui,sans-serif", padding: "12px 0" }}>
                ❌ Không tải được Google Sign-In.
                <br />
                <span style={{ color: MUT, fontSize: 11 }}>Kiểm tra kết nối mạng và thử lại.</span>
              </div>
            ) : !gsiReady ? (
              <div
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 16,
                  background: CARD,
                  border: `1px solid ${BR}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: TXT,
                  fontSize: 13,
                  fontFamily: "var(--font-ui)",
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ opacity: 0.6, fontSize: 15 }}>⏳</span>
                <span>Đang tải Google Sign-In…</span>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div ref={googleBtnRef} style={{ minHeight: 44 }} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 12px" }}>
            <div style={{ flex: 1, height: 1, background: `${BR}` }} />
            <span style={{ color: "#666", fontSize: 10, fontFamily: "system-ui,sans-serif", letterSpacing: 2, fontWeight: 600 }}>
              BẢO MẬT BỞI GOOGLE
            </span>
            <div style={{ flex: 1, height: 1, background: `${BR}` }} />
          </div>
          <div style={{ color: "#555", fontSize: 11, fontFamily: "system-ui,sans-serif", lineHeight: 1.7, textAlign: "center" }}>
            92 KA MÊ RA chỉ nhận tên và email.
            <br />
            Không đọc dữ liệu Google Drive hay Gmail.
          </div>
        </div>
      )}

      {/* Đã đăng nhập — hiện profile */}
      {loggedUser && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {/* Avatar ring */}
            <div style={{ position: "relative", display: "inline-block", margin: "0 auto 12px" }}>
              <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: `conic-gradient(${G}, ${G}55, ${G})`, opacity: 0.6 }} />
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: G + "22",
                  border: `3px solid ${BG}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {loggedUser.picture || loggedUser.avatar ? (
                  <img
                    src={loggedUser.avatar || loggedUser.picture}
                    alt="avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span style={{ color: G, fontWeight: 800, fontSize: 28, fontFamily: "serif" }}>
                    {loggedUser.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
            <div style={{ color: TXT, fontWeight: 700, fontSize: 16, fontFamily: "Georgia,serif" }}>
              {loggedUser.displayName || loggedUser.name}
            </div>
            <div style={{ color: MUT, fontSize: 11.5, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <span style={{ fontSize: 10 }}>✉</span>
              <span>{loggedUser.email}</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ color: G, fontWeight: 800, fontSize: 24, fontFamily: "Georgia,serif" }}>{myOrders.length}</div>
              <div style={{ color: MUT, fontSize: 11, marginTop: 3, letterSpacing: 0.5 }}>Tổng đơn</div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ color: G, fontWeight: 800, fontSize: 13, lineHeight: 1.6, fontFamily: "Georgia,serif" }}>
                {fmtVND(totalSpent)}
              </div>
              <div style={{ color: MUT, fontSize: 11, marginTop: 3, letterSpacing: 0.5 }}>Đã chi</div>
            </div>
          </div>

          {/* Completed orders with feedback CTA */}
          {completedOrders.length > 0 && (
            <div style={{ background: CARD2, border: `1px solid ${G}33`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: G, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 10, fontWeight: 700 }}>
                ⭐ ĐƠN CÓ THỂ ĐÁNH GIÁ ({completedOrders.length})
              </div>
              {completedOrders.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: CARD,
                    border: `1px solid ${BR}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: G, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</div>
                    <div style={{ color: TXT, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      📷 {o.cameraName}
                    </div>
                  </div>
                  {setPage && (
                    <button
                      onClick={() => {
                        setPage("customer");
                        onBack();
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "6px 14px",
                        background: "#c9a84c",
                        color: "#1a1200",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 11,
                        fontFamily: "system-ui,sans-serif",
                        whiteSpace: "nowrap",
                        boxShadow: "0 0 12px #c9a84c44",
                      }}
                    >
                      ⭐ Đánh giá
                    </button>
                  )}
                </div>
              ))}
              {completedOrders.length > 3 && (
                <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", textAlign: "center", paddingTop: 4 }}>
                  +{completedOrders.length - 3} đơn khác...
                </div>
              )}
            </div>
          )}

          {/* Customer Dashboard link */}
          {setPage && (
            <button
              onClick={() => {
                setPage("customer");
                onBack();
              }}
              style={{
                width: "100%",
                padding: "11px 0",
                background: G + "15",
                border: `1px solid ${G}44`,
                color: G,
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "system-ui,sans-serif",
                fontWeight: 700,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>👤</span> Mở trang cá nhân đầy đủ →
            </button>
          )}

          {/* All orders list */}
          {myOrders.length > 0 ? (
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: 1, fontFamily: "system-ui,sans-serif", marginBottom: 8 }}>
                TẤT CẢ ĐƠN
              </div>
              {myOrders.map((o) => (
                <div key={o.id} style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{o.id}</span>
                    <Badge status={o.status} />
                  </div>
                  <div style={{ color: TXT, fontSize: 12, marginTop: 4 }}>{o.cameraName}</div>
                  <div style={{ color: MUT, fontSize: 11, marginTop: 2 }}>
                    {fmtDays(o.days, o.session || o.shift)} · {fmtVND(o.total)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <CopyOrderBtn
                      copyFn={() => {
                        const accList = Array.isArray(o.accessories) && o.accessories.length > 0 ? o.accessories.join(", ") : "Không có";
                        const fmtD = (ds) => {
                          const d = new Date(ds + "T00:00:00");
                          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                        };
                        let pickTime = "",
                          pickDate = "",
                          dropTime = "",
                          dropDate = "";
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có đơn thuê nào</div>
          )}

          <button
            onClick={() => {
              setLoggedUser(null);
              try {
                window.google?.accounts?.id?.disableAutoSelect();
              } catch {}
            }}
            style={{
              width: "100%",
              padding: 10,
              background: "none",
              color: MUT,
              border: `1px solid ${BR}`,
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              marginTop: 10,
            }}
          >
            Đăng xuất Google
          </button>
        </div>
      )}
    </div>
  );
}
