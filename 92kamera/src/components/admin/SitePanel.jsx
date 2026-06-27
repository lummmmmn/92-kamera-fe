import React, { useState, useEffect } from "react";
import { TXT, MUT, CARD, CARD2, BR, BR2, G, btn } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";
import { compressImage } from "../../utils/image.js";
import { useSiteContent, useUpdateSiteContent, useCameras, useAccessories } from "../../hooks/useAppData.js";
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

export default function SitePanel({ isMobile }) {
  const { data: siteContent = {} } = useSiteContent();
  const updateSiteMutation = useUpdateSiteContent();
  
  const { data: cameras = [] } = useCameras();
  const { data: accessories = [] } = useAccessories();
  const { data: orders = [] } = useOrders();

  const [localSite, setLocalSite] = useState(() => ({ ...siteContent }));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (siteContent) setLocalSite({ ...siteContent });
  }, [siteContent]);

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      await updateSiteMutation.mutateAsync(localSite);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Lưu nội dung thất bại: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // System Stats calculation
  const activeCount = orders.filter(o => ["pending", "confirmed", "active"].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === "completed");
  const monthRev = completedOrders.reduce((s, o) => s + o.total, 0); // doanh thu thực tế hoàn thành

  const inp2 = {
    padding: "9px 13px",
    background: "rgba(255,255,255,0.55)",
    border: `1px solid ${BR}`,
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
      <STitle c="Chỉnh sửa nội dung website" />
      {saved && (
        <div style={{ background: "#EEF9F4", border: "1px solid #22c55e44", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
          ✓ Đã lưu! Nội dung đã cập nhật ra website ngay lập tức.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
        <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22 }}>
          <div style={{ color: TXT, fontWeight: 600, marginBottom: 16, fontSize: 13 }}>📌 Thông tin liên hệ & Slogan</div>
          {[
            { k: "zalo", l: "Số Zalo / Hotline" },
            { k: "phone", l: "Số điện thoại" },
            { k: "address", l: "Địa chỉ" },
            { k: "slogan", l: "Slogan header (dòng nhỏ trên logo)" },
            { k: "tagline", l: "Tagline (dòng nghiêng dưới logo)" },
            { k: "desc", l: "Mô tả về chúng tôi (trang About)" },
            { k: "secretText", l: "🔒 Chữ bí mật (hover/giữ vào tên 92 KA MÊ RA)" },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 13 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>{f.l.toUpperCase()}</div>
              {f.k === "desc" ? (
                <textarea
                  style={{ ...inp2, minHeight: 70, resize: "vertical" }}
                  value={localSite[f.k] || ""}
                  onChange={e => setLocalSite(p => ({ ...p, [f.k]: e.target.value }))}
                />
              ) : (
                <input
                  style={inp2}
                  value={localSite[f.k] || ""}
                  onChange={e => setLocalSite(p => ({ ...p, [f.k]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <button onClick={handleSave} style={{ ...btn("gold"), transition: "background .3s" }}>
            {saved ? "✓ Đã lưu!" : "💾 Lưu & cập nhật web ngay"}
          </button>
        </div>

        <div>
          {/* SOCIAL LINKS */}
          <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
            <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔗 Link mạng xã hội (4 logo đầu trang)</div>
            <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>Dán link vào ô tương ứng. Logo nào có link sẽ sáng lên và click được. Để trống = mờ, không click.</div>
            {[
              { k: "youtube", label: "YouTube", ph: "https://youtube.com/@kenh-cua-ban", svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
              { k: "facebook", label: "Facebook", ph: "https://facebook.com/page-cua-ban", svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
              { k: "tiktok", label: "TikTok", ph: "https://tiktok.com/@tenban", svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/></svg> },
              { k: "instagram", label: "Instagram", ph: "https://instagram.com/tenban", svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
            ].map(({ k, label, svg, ph }) => {
              const url = localSite.socialLinks?.[k];
              return (
                <div key={k} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    title={url ? `Mở ${label} ↗` : `Chưa có link ${label}`}
                    onClick={() => url && window.open(url, "_blank")}
                    style={{ width: 34, height: 34, borderRadius: 12, background: url ? `${G}22` : "#111", border: `1px solid ${url ? G + "66" : BR2}`, display: "flex", alignItems: "center", justifyContent: "center", color: url ? G : MUT, flexShrink: 0, cursor: url ? "pointer" : "default", transition: "all .2s", position: "relative" }}
                  >
                    {svg}
                    {url && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "1.5px solid #111" }} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      {label.toUpperCase()}
                      {url && <span style={{ color: "#22c55e", fontSize: 9, fontWeight: 700 }}>● ĐÃ CÓ LINK</span>}
                    </div>
                    <input
                      style={{ ...inp2, fontSize: 11 }}
                      value={url || ""}
                      placeholder={ph}
                      onChange={e => setLocalSite(p => ({ ...p, socialLinks: { ...(p.socialLinks || {}), [k]: e.target.value } }))}
                    />
                  </div>
                </div>
              );
            })}
            <button onClick={handleSave} style={{ ...btn("gold") }}>
              {saved ? "✓ Đã lưu!" : "💾 Lưu link mạng xã hội"}
            </button>
          </div>

          {/* ZALO CONFIG */}
          <div style={{ background: CARD2, border: `1px solid #06c75530`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
            <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>💬 Cấu hình Zalo thanh toán</div>
            <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>Link và QR này sẽ hiện ra cho khách ngay sau khi đặt đơn xong.</div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>LINK ZALO OA / ZALO CÁ NHÂN</div>
              <input style={inp2} value={localSite.zaloLink || ""} onChange={e => setLocalSite(p => ({ ...p, zaloLink: e.target.value }))} placeholder="https://zalo.me/0901234567" />
              <div style={{ color: "#333", fontSize: 10, marginTop: 4 }}>VD: https://zalo.me/0901234567 hoặc link OA của shop</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>ẢNH QR CODE (ZALO / CHUYỂN KHOẢN)</div>
              {localSite.zaloQR ? (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 8, flexShrink: 0 }}>
                    <img src={localSite.zaloQR} alt="QR" style={{ width: 100, height: 100, objectFit: "contain", display: "block" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#22c55e", fontSize: 12, marginBottom: 10 }}>✓ Đã có QR · Khách sẽ thấy sau khi đặt đơn</div>
                    <button onClick={() => setLocalSite(p => ({ ...p, zaloQR: "" }))} style={{ ...btn("danger"), fontSize: 11 }}>🗑 Xoá QR</button>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", border: `2px dashed ${G}44`, borderRadius: 12, padding: "18px 0", textAlign: "center", cursor: "pointer", background: CARD2, color: MUT, fontSize: 12 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <div>Nhấn để upload ảnh QR</div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>PNG / JPG · Khuyên dùng QR vuông</div>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                      const file = e.target.files[0]; if (!file) return;
                      const compressed = await compressImage(file, 600, 0.9);
                      setLocalSite(p => ({ ...p, zaloQR: compressed }));
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              )}
            </div>
            <button onClick={handleSave} style={{ ...btn("gold") }}>
              {saved ? "✓ Đã lưu!" : "💾 Lưu cấu hình Zalo"}
            </button>
          </div>

          {/* CORNER QR */}
          <div style={{ background: CARD2, border: `1px solid #a78bfa30`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
            <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>`📌` QR góc phải trang chủ</div>
            <div style={{ color: MUT, fontSize: 11, marginBottom: 16, lineHeight: 1.6 }}>QR hiện cố định ở góc dưới-phải trang chủ. Khách hover để phóng to, bấm X để ẩn.</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>ẢNH QR (LIÊN HỆ / CHUYỂN KHOẢN)</div>
              {localSite.cornerQR ? (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 8, flexShrink: 0 }}>
                    <img src={localSite.cornerQR} alt="Corner QR" style={{ width: 100, height: 100, objectFit: "contain", display: "block" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#22c55e", fontSize: 12, marginBottom: 10 }}>✓ Đã có QR · Đang hiển thị góc trang chủ</div>
                    <button onClick={() => setLocalSite(p => ({ ...p, cornerQR: "" }))} style={{ ...btn("danger"), fontSize: 11 }}>🗑 Xoá QR</button>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", border: `2px dashed #a78bfa44`, borderRadius: 12, padding: "18px 0", textAlign: "center", cursor: "pointer", background: CARD2, color: MUT, fontSize: 12 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <div>Nhấn để upload ảnh QR góc trang</div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>PNG / JPG · Khuyên dùng QR vuông</div>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                      const file = e.target.files[0]; if (!file) return;
                      const compressed = await compressImage(file, 600, 0.9);
                      setLocalSite(p => ({ ...p, cornerQR: compressed }));
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              )}
            </div>
            <button onClick={handleSave} style={{ ...btn("gold") }}>
              {saved ? "✓ Đã lưu!" : "💾 Lưu QR góc trang"}
            </button>
          </div>

          <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
            <div style={{ color: TXT, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>📊 Thống kê hiển thị (trang About)</div>
            {Array.isArray(localSite.stats) && localSite.stats.map(([e, n, l], i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input style={{ ...inp2, width: 40, textAlign: "center", padding: "6px 4px" }} value={e} onChange={ev => { const s = [...localSite.stats]; s[i] = [ev.target.value, n, l]; setLocalSite(p => ({ ...p, stats: s })); }} />
                <input style={{ ...inp2, width: 70, textAlign: "center", padding: "6px 8px", color: G, fontWeight: 700 }} value={n} onChange={ev => { const s = [...localSite.stats]; s[i] = [e, ev.target.value, l]; setLocalSite(p => ({ ...p, stats: s })); }} />
                <input style={{ ...inp2, flex: 1 }} value={l} onChange={ev => { const s = [...localSite.stats]; s[i] = [e, n, ev.target.value]; setLocalSite(p => ({ ...p, stats: s })); }} />
              </div>
            ))}
            <button onClick={handleSave} style={{ ...btn("ghost"), fontSize: 11, marginTop: 4 }}>Lưu thống kê</button>
          </div>

          <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 22 }}>
            <div style={{ color: TXT, fontWeight: 600, marginBottom: 14, fontSize: 13 }}>🔢 Tổng hệ thống (tự động)</div>
            {[
              [`Tổng máy ảnh`, cameras.length],
              [`Tổng phụ kiện`, accessories.length],
              [`Tổng đơn thuê`, orders.length],
              [`Đơn hoàn thành`, completedOrders.length],
              [`Đang xử lý`, activeCount],
              [`Doanh thu tháng`, fmtVND(monthRev)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BR2}` }}>
                <span style={{ color: MUT, fontSize: 12 }}>{l}</span>
                <span style={{ color: G, fontWeight: 700, fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
