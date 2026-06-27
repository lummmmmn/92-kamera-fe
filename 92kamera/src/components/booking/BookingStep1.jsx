import { G, BR, TXT, MUT, CARD } from "../../lib/constants.js";
import { cdnUrl } from "../../utils/format.js";

export default function BookingStep1({
  availCams,
  selCams,
  toggleCam,
  camImgIdx,
  setCamImgIdx,
  expandedCam,
  setExpandedCam,
  totalCamSelected,
  setStep,
  preselectedUnavailable,
  setCamQty,
}) {
  const CAM_TAGS = {
    "Fujifilm X-T20": ["Mirrorless", "24MP", "4K", "Film Simulation"],
    "Sony ZV-E10": ["Vlog", "4K", "APS-C"],
    "DJI Pocket 3": ["Gimbal", "4K", "Chống rung"],
    "Canon EOS M50 II": ["Mirrorless", "4K", "WiFi"],
    "GoPro Hero 12": ["Action Cam", "5.3K", "Chống nước"],
    "Nikon Z30": ["Mirrorless", "4K", "60fps"],
  };

  const CAM_DETAIL = {
    "Fujifilm X-T20": ["Nhỏ gọn • Màu film đẹp • Dễ sử dụng", "Phù hợp: du lịch, street, chân dung"],
    "Sony ZV-E10": ["Màn lật 180° • Quay vlog chuyên nghiệp", "Phù hợp: vlog, review, du lịch"],
    "DJI Pocket 3": ["Gimbal tích hợp • Chống rung xuất sắc", "Phù hợp: vlog, travel, cinematic"],
    "Canon EOS M50 II": ["Lấy nét nhanh • Video 4K mượt", "Phù hợp: vlog, sự kiện, chụp ảnh"],
    "GoPro Hero 12": ["Chống nước 10m • Quay 5.3K siêu nét", "Phù hợp: thể thao, du lịch, phượt"],
    "Nikon Z30": ["Nhẹ • 4K 60fps • Lên màu đẹp", "Phù hợp: vlog, sáng tạo nội dung"],
  };

  const CAM_POPULAR = ["Fujifilm X-T20"];

  const qtyBtn = (onClick, label) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        border: "1px solid rgba(0,0,0,0.20)",
        borderRadius: 6,
        background: "rgba(255,255,255,0.70)",
        color: "#1a3a5a",
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "monospace",
      }}
    >
      {label}
    </button>
  );

  const selectedCamList = availCams.filter((c) => selCams[c.id] > 0);

  return (
    <div>
      {preselectedUnavailable && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FEF0F0", border: "1px solid #C0290A44", borderRadius: 12, color: "#C0290A", fontSize: 12, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
          ⚠️ Máy bạn chọn hiện không còn cho thuê. Vui lòng chọn máy khác bên dưới.
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ color: TXT, fontWeight: 700, fontSize: 18, letterSpacing: 0.3 }}>Chọn thiết bị</div>
          <div style={{ color: MUT, fontSize: 12, marginTop: 3, fontFamily: "system-ui,sans-serif" }}>Chọn máy ảnh / phụ kiện bạn muốn thuê</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalCamSelected > 0 && (
            <span style={{ background: G + "22", color: G, border: `1px solid ${G}44`, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
              ✓ {totalCamSelected} máy
            </span>
          )}
          <button
            onClick={() => setStep(2)}
            style={{
              padding: "7px 12px",
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.65)",
              borderRadius: 12,
              color: MUT,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "system-ui,sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            ⊞ Xem tất cả phụ kiện
          </button>
        </div>
      </div>

      {/* Camera list — 2 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {availCams.map((c) => {
          const isSelected = (selCams[c.id] || 0) > 0;
          const tags = CAM_TAGS[c.name] || [];
          const details = CAM_DETAIL[c.name] || [c.desc];
          const isPopular = CAM_POPULAR.includes(c.name);
          return (
            <div
              key={c.id}
              style={{
                border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? "#2979CF" : BR}`,
                borderRadius: 16,
                background: isSelected ? "rgba(197,228,248,0.85)" : "rgba(255,255,255,0.38)",
                transition: "all .2s",
                overflow: "hidden",
                position: "relative",
                boxShadow: isSelected ? "0 0 0 3px rgba(41,121,207,0.22), 0 6px 24px rgba(41,121,207,0.18)" : "none",
              }}
            >
              <div style={{ position: "relative", width: "100%", paddingTop: "130%", background: "rgba(197,216,236,0.60)", overflow: "hidden" }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleCam(c)}
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    zIndex: 3,
                    width: 24,
                    height: 24,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? "#2979CF" : "rgba(255,255,255,0.6)"}`,
                    background: isSelected ? "#2979CF" : "rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all .2s",
                    boxShadow: isSelected ? "0 0 8px rgba(41,121,207,0.6)" : "none",
                  }}
                >
                  {isSelected && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>

                {/* Images slider */}
                {c.images?.length > 0 ? (
                  (() => {
                    const imgs = c.images.slice(0, 6);
                    const idx = camImgIdx[c.id] || 0;
                    const safeIdx = Math.min(idx, imgs.length - 1);
                    const goPrev = (e) => {
                      e.stopPropagation();
                      setCamImgIdx((p) => ({ ...p, [c.id]: safeIdx > 0 ? safeIdx - 1 : imgs.length - 1 }));
                    };
                    const goNext = (e) => {
                      e.stopPropagation();
                      setCamImgIdx((p) => ({ ...p, [c.id]: safeIdx < imgs.length - 1 ? safeIdx + 1 : 0 }));
                    };
                    let _tx = null;
                    const onTouchStart = (e) => {
                      _tx = e.touches[0].clientX;
                    };
                    const onTouchEnd = (e) => {
                      if (_tx === null || imgs.length <= 1) return;
                      const dx = e.changedTouches[0].clientX - _tx;
                      if (Math.abs(dx) < 30) return;
                      if (dx < 0) setCamImgIdx((p) => ({ ...p, [c.id]: safeIdx < imgs.length - 1 ? safeIdx + 1 : 0 }));
                      else setCamImgIdx((p) => ({ ...p, [c.id]: safeIdx > 0 ? safeIdx - 1 : imgs.length - 1 }));
                      _tx = null;
                    };
                    return (
                      <>
                        <img
                          src={cdnUrl(imgs[safeIdx], "thumb")}
                          alt={c.name}
                          onClick={() => toggleCam(c)}
                          onTouchStart={onTouchStart}
                          onTouchEnd={onTouchEnd}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", cursor: "pointer" }}
                        />
                        {imgs.length > 1 && (
                          <>
                            <button onClick={goPrev} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 4, background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, color: "#fff", fontSize: 14, lineHeight: 1 }}>‹</button>
                            <button onClick={goNext} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 4, background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, color: "#fff", fontSize: 14, lineHeight: 1 }}>›</button>
                            <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, zIndex: 4 }}>
                              {imgs.map((_, di) => (
                                <div
                                  key={di}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCamImgIdx((p) => ({ ...p, [c.id]: di }));
                                  }}
                                  style={{
                                    width: di === safeIdx ? 14 : 5,
                                    height: 5,
                                    borderRadius: 3,
                                    background: di === safeIdx ? "#fff" : "rgba(255,255,255,0.45)",
                                    cursor: "pointer",
                                    transition: "all .2s",
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <span onClick={() => toggleCam(c)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, cursor: "pointer" }}>
                    {c.icon}
                  </span>
                )}

                {/* Info overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background:
                      expandedCam === c.id
                        ? "linear-gradient(to top, rgba(8,6,0,0.97) 0%, rgba(8,6,0,0.95) 80%, rgba(8,6,0,0.6) 100%)"
                        : "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
                    transition: "background .3s",
                    padding: expandedCam === c.id ? "14px 12px 12px" : "28px 12px 10px",
                  }}
                >
                  <div onClick={() => toggleCam(c)} style={{ cursor: "pointer", marginBottom: 5 }}>
                    <div style={{ color: isSelected ? "#E0F0FF" : "#fff", fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif", lineHeight: 1.3, marginBottom: 3, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{c.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 14, fontFamily: "system-ui,sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{new Intl.NumberFormat("vi-VN").format(c.price)}đ</span>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "system-ui,sans-serif" }}>/ ngày</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCam(expandedCam === c.id ? null : c.id);
                    }}
                    style={{
                      background: expandedCam === c.id ? "rgba(255,255,255,0.15)" : "none",
                      border: expandedCam === c.id ? "1px solid rgba(255,255,255,0.30)" : "none",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 10,
                      fontFamily: "system-ui,sans-serif",
                      cursor: "pointer",
                      padding: expandedCam === c.id ? "2px 8px" : 0,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {expandedCam === c.id ? "▴ Thu gọn" : "▾ Chi tiết"}
                  </button>

                  {expandedCam === c.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(41,121,207,0.25)" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                        {tags.slice(0, 3).map((t) => (
                          <span key={t} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 8, padding: "2px 6px", fontSize: 9, fontFamily: "system-ui,sans-serif" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div style={{ color: "#bbb", fontSize: 10, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>{details[0]}</div>
                      {details[1] && <div style={{ color: "#888", fontSize: 10, fontFamily: "system-ui,sans-serif", marginTop: 4, lineHeight: 1.5 }}>{details[1]}</div>}
                    </div>
                  )}
                </div>
              </div>

              {isSelected && (() => {
                const totalStock = c.qty || 1;
                const curQty = selCams[c.id] || 1;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.50)", borderTop: `1px solid rgba(255,255,255,0.60)` }}>
                    <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>SL:</span>
                    {qtyBtn(() => setCamQty(c.id, curQty - 1, totalStock), "−")}
                    <span style={{ color: G, fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center", fontFamily: "system-ui,sans-serif" }}>{curQty}</span>
                    {qtyBtn(() => setCamQty(c.id, curQty + 1, totalStock), "+")}
                    <span style={{ color: "#444", fontSize: 9, fontFamily: "system-ui,sans-serif", marginLeft: "auto" }}>/ {totalStock} máy</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {(() => {
        const overQty = selectedCamList.filter((c) => (selCams[c.id] || 1) > (c.qty || 1));
        return (
          <>
            {overQty.length > 0 && (
              <div style={{ marginBottom: 10, padding: "9px 13px", background: "rgba(255,240,200,0.75)", border: "1px solid #f59e0b66", borderRadius: 12, color: "#92400e", fontSize: 12, fontFamily: "system-ui,sans-serif", lineHeight: 1.5 }}>
                ⚠️ {overQty.map((c) => `${c.name} (kho chỉ có ${c.qty || 1})`).join(", ")} — vui lòng giảm số lượng.
              </div>
            )}
            <button
              onClick={() => setStep(2)}
              className="bk-next"
              style={{
                width: "100%",
                padding: 15,
                background: "linear-gradient(135deg, rgba(139,174,207,0.90) 0%, rgba(101,145,188,0.85) 100%)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.55)",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 15,
                fontFamily: "system-ui,sans-serif",
                letterSpacing: 0.5,
                backdropFilter: "blur(16px) saturate(160%)",
                WebkitBackdropFilter: "blur(16px) saturate(160%)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.60) inset, 0 4px 20px rgba(8,20,60,0.18)",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {selectedCamList.length > 0 ? `Tiếp theo → (${totalCamSelected} máy)` : "Tiếp theo → chọn phụ kiện / thời gian"}
              </span>
            </button>
          </>
        );
      })()}
    </div>
  );
}

