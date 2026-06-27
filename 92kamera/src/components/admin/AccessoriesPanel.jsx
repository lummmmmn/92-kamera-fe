import React, { useState, useRef } from "react";
import AdminToast from "./AdminToast.jsx";
import { G, MUT, TXT, BR, BR2, CARD, CARD2, btn } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";
import { compressIcon } from "../../utils/image.js";
import { uploadPhoto } from "../../api/index.js";
import {
  useAccessories,
  useCreateAccessory,
  useUpdateAccessory,
  useDeleteAccessory,
} from "../../hooks/useAppData.js";
import { useOrders } from "../../hooks/useOrders.js";

// Subcomponent: AccIconUploader
function AccIconUploader({ image, onChange }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      // Nén ảnh icon thành 96x96
      const compressedDataUrl = await compressIcon(file);
      
      // Chuyển dataUrl thành Blob/File để upload qua API multipart
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      const uploadFile = new File([blob], "icon.jpg", { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("folder", "92kamera_accessories");

      const result = await uploadPhoto(formData);
      onChange(result.url);
    } catch (e) {
      console.warn("[92K] AccIcon upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        {image ? (
          <>
            <img src={image} alt="icon" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 12, border: `1px solid ${BR2}` }} />
            <button
              onClick={() => onChange("")}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              width: 56,
              height: 56,
              border: `2px dashed ${G}55`,
              borderRadius: 12,
              background: CARD2,
              color: G,
              cursor: uploading ? "default" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              fontSize: 9,
              fontFamily: "system-ui,sans-serif",
            }}
          >
            <span style={{ fontSize: 18 }}>{uploading ? "⏳" : "📷"}</span>
            <span>{uploading ? "Upload..." : "Ảnh icon"}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      {image && !uploading && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            fontSize: 10,
            color: MUT,
            background: "none",
            border: `1px solid ${BR}`,
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "system-ui,sans-serif",
          }}
        >
          Đổi ảnh
        </button>
      )}
      <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>96×96px JPG</span>
    </div>
  );
}

// Subcomponent: STitle (Section Title helper)
function STitle({ c, extra }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
      </div>
      {extra}
    </div>
  );
}

export default function AccessoriesPanel() {
  const { data: accessories = [] } = useAccessories();
  const { data: orders = [] } = useOrders();

  const createMutation = useCreateAccessory();
  const updateMutation = useUpdateAccessory();
  const deleteMutation = useDeleteAccessory();

  const [addAcc, setAddAcc] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [creatingAcc, setCreatingAcc] = useState(false);
  const [updatingAccId, setUpdatingAccId] = useState(null);
  const [togglingAccId, setTogglingAccId] = useState(null);
  const [deletingAccId, setDeletingAccId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "ok") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };
  
  const [na, setNa] = useState({
    name: "",
    price: "",
    qty: 1,
    active: true,
    priceShift: "",
    desc: "",
    image: "",
  });

  const activeOrders = orders.filter((o) => ["pending", "confirmed", "active"].includes(o.status));

  const getAccRented = (accName) => {
    let total = 0;
    activeOrders.forEach((o) => {
      if (o.accessoriesDetail) {
        const d = o.accessoriesDetail.find((x) => x.name === accName);
        if (d) total += d.qty || 1;
      } else if (o.accessories && o.accessories.some((a) => a === accName || a.startsWith(accName + " x"))) {
        total += 1;
      }
    });
    return total;
  };

  const accRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => {
      if (!o.accessoriesDetail || !o.days) return s;
      return (
        s +
        o.accessoriesDetail.reduce((ss, d) => {
          const found = accessories.find((a) => a.name === d.name);
          if (!found) return ss;
          const unitP =
            o.days === 0.5
              ? found.priceShift != null
                ? found.priceShift
                : Math.round(found.price / 2)
              : found.price;
          const mult = o.days === 0.5 ? 1 : o.days;
          return ss + unitP * (d.qty || 1) * mult;
        }, 0)
      );
    }, 0);

  const totalRentedUnits = accessories.reduce((s, a) => s + getAccRented(a.name), 0);
  const inp3 = { ...na, background: CARD, border: `1px solid ${BR2}`, borderRadius: 10, color: TXT, padding: "9px 13px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "system-ui,sans-serif", fontSize: 12 };

  const handleSaveNew = async () => {
    if (!na.name || !na.price || creatingAcc) return;

    try {
      setCreatingAcc(true);
      await createMutation.mutateAsync({
        name: na.name,
        price: parseInt(na.price),
        priceShift: na.priceShift ? parseInt(na.priceShift) : null,
        qty: na.qty || 1,
        active: na.active,
        desc: na.desc,
        image: na.image || "",
      });
      setNa({ name: "", price: "", qty: 1, active: true, priceShift: "", desc: "", image: "" });
      setAddAcc(false);
      showToast("Đã thêm phụ kiện mới");
    } catch (err) {
      alert("Lưu phụ kiện thất bại: " + err.message);
    } finally {
      setCreatingAcc(false);
    }
  };

  const handleSaveEdit = async (acc) => {
    if (updatingAccId) return;

    try {
      setUpdatingAccId(acc.id);
      await updateMutation.mutateAsync({
        id: acc.id,
        data: {
          ...acc,
          price: parseInt(acc.price),
          priceShift: acc.priceShift ? parseInt(acc.priceShift) : null,
          qty: parseInt(acc.qty) || 1,
        },
      });
      setEditAcc(null);
      showToast("Đã cập nhật phụ kiện");
    } catch (err) {
      alert("Cập nhật phụ kiện thất bại: " + err.message);
    } finally {
      setUpdatingAccId(null);
    }
  };

  const handleToggleActive = async (acc) => {
    if (togglingAccId) return;

    try {
      setTogglingAccId(acc.id);
      await updateMutation.mutateAsync({
        id: acc.id,
        data: {
          ...acc,
          active: !acc.active,
        },
      });
      showToast(acc.active ? "Đã ẩn phụ kiện với khách" : "Đã hiển thị phụ kiện cho khách");
    } catch (err) {
      alert("Cập nhật trạng thái phụ kiện thất bại: " + err.message);
    } finally {
      setTogglingAccId(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá phụ kiện này?")) {
      if (deletingAccId) return;

      try {
        setDeletingAccId(id);
        await deleteMutation.mutateAsync(id);
        showToast("Đã xoá phụ kiện");
      } catch (err) {
        alert("Xoá phụ kiện thất bại: " + err.message);
      } finally {
        setDeletingAccId(null);
      }
    }
  };

  return (
    <div>
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <STitle
        c={`Phụ kiện (${accessories.length})`}
        extra={
          <button onClick={() => setAddAcc(true)} style={btn("gold")}>
            + Thêm phụ kiện
          </button>
        }
      />

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "🎒", l: "Tổng mặt hàng", v: accessories.length, c: "#60a5fa" },
          { icon: "📦", l: "Đang cho thuê", v: `${totalRentedUnits} cái`, c: "#f59e0b" },
          { icon: "💰", l: "Doanh thu PK", v: fmtVND(accRevenue), c: "#22c55e" },
        ].map((s) => (
          <div key={s.l} style={{ background: CARD2, border: `1px solid ${s.c}22`, borderRadius: 14, padding: "16px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ color: MUT, fontSize: 10, marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Form thêm mới */}
      {addAcc && (
        <div style={{ background: CARD2, border: `1px solid ${G}44`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>➕ THÊM PHỤ KIỆN MỚI</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TÊN</div>
              <input style={inp3} value={na.name} onChange={(e) => setNa((p) => ({ ...p, name: e.target.value }))} placeholder="Tripod 3 chân..." />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/NGÀY (₫)</div>
              <input style={inp3} type="number" value={na.price} onChange={(e) => setNa((p) => ({ ...p, price: e.target.value }))} placeholder="50000" />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/BUỔI (₫)</div>
              <input style={inp3} type="number" value={na.priceShift} onChange={(e) => setNa((p) => ({ ...p, priceShift: e.target.value }))} placeholder="35000 (tuỳ chọn)" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÔ TẢ NGẮN</div>
              <input style={inp3} value={na.desc} onChange={(e) => setNa((p) => ({ ...p, desc: e.target.value }))} placeholder="Dùng được với mọi loại máy..." />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LƯỢNG KHO</div>
              <input style={inp3} type="number" min={1} value={na.qty} onChange={(e) => setNa((p) => ({ ...p, qty: parseInt(e.target.value) || 1 }))} placeholder="1" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>ẢNH ICON (tuỳ chọn)</div>
            <AccIconUploader image={na.image} onChange={(img) => setNa((p) => ({ ...p, image: img }))} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleSaveNew} disabled={creatingAcc} style={{ ...btn("gold"), opacity: creatingAcc ? 0.65 : 1, cursor: creatingAcc ? "not-allowed" : "pointer" }}>{creatingAcc ? "⏳ Đang lưu..." : "✓ Lưu"}</button>
            <button onClick={() => setAddAcc(false)} disabled={creatingAcc} style={{ ...btn("ghost"), opacity: creatingAcc ? 0.55 : 1, cursor: creatingAcc ? "not-allowed" : "pointer" }}>Huỷ</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: "auto" }}>
              <span style={{ color: MUT, fontSize: 11 }}>Hiển thị cho khách</span>
              <div onClick={() => setNa((p) => ({ ...p, active: !p.active }))}
                style={{ width: 38, height: 20, borderRadius: 99, background: na.active ? G : "#333", position: "relative", transition: "all .2s", cursor: "pointer", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: na.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Danh sách phụ kiện */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {accessories.map((a) => {
          const rentedNow = getAccRented(a.name);
          const stockLeft = (a.qty || 1) - rentedNow;
          const isEdit = editAcc?.id === a.id;
          return (
            <div key={a.id} style={{ background: CARD2, border: `1px solid ${a.active === false ? "#33333366" : BR2}`, borderRadius: 14, padding: "14px 16px", opacity: a.active === false ? 0.6 : 1, transition: "all .2s" }}>
              {isEdit ? (
                /* Chế độ chỉnh sửa */
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 9, marginBottom: 9 }}>
                    <div>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>TÊN</div>
                      <input style={inp3} value={editAcc.name} onChange={(e) => setEditAcc((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>GIÁ/NGÀY</div>
                      <input style={inp3} type="number" value={editAcc.price} onChange={(e) => setEditAcc((p) => ({ ...p, price: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>GIÁ/BUỔI</div>
                      <input style={inp3} type="number" value={editAcc.priceShift || ""} onChange={(e) => setEditAcc((p) => ({ ...p, priceShift: e.target.value }))} placeholder="Để trống = ½ ngày" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 9, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>MÔ TẢ</div>
                      <input style={inp3} value={editAcc.desc || ""} onChange={(e) => setEditAcc((p) => ({ ...p, desc: e.target.value }))} placeholder="Mô tả ngắn..." />
                    </div>
                    <div>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>SỐ LƯỢNG</div>
                      <input style={inp3} type="number" min={1} value={editAcc.qty || 1} onChange={(e) => setEditAcc((p) => ({ ...p, qty: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>ẢNH ICON</div>
                    <AccIconUploader image={editAcc.image || ""} onChange={(img) => setEditAcc((p) => ({ ...p, image: img }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleSaveEdit(editAcc)} disabled={updatingAccId === editAcc.id} style={{ ...btn("gold"), opacity: updatingAccId === editAcc.id ? 0.65 : 1, cursor: updatingAccId === editAcc.id ? "not-allowed" : "pointer" }}>{updatingAccId === editAcc.id ? "⏳ Đang lưu..." : "✓ Lưu"}</button>
                    <button onClick={() => setEditAcc(null)} disabled={updatingAccId === editAcc.id} style={{ ...btn("ghost"), opacity: updatingAccId === editAcc.id ? 0.55 : 1, cursor: updatingAccId === editAcc.id ? "not-allowed" : "pointer" }}>Huỷ</button>
                  </div>
                </div>
              ) : (
                /* Chế độ xem */
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {a.image && <img src={a.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: `1px solid ${BR}` }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                      {a.active === false && (
                        <span style={{ background: "#33333366", color: "#888", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>ẨN</span>
                      )}
                      {rentedNow > 0 && (
                        <span style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>
                          {rentedNow} đang thuê
                        </span>
                      )}
                    </div>
                    {a.desc && <div style={{ color: MUT, fontSize: 11, marginBottom: 7 }}>{a.desc}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: G, fontWeight: 700, fontSize: 12 }}>{fmtVND(a.price)}/ngày</span>
                      {a.priceShift && (
                        <span style={{ color: G + "aa", fontSize: 11 }}>· {fmtVND(a.priceShift)}/buổi</span>
                      )}
                      <span style={{ color: stockLeft > 0 ? "#22c55e" : "#ef4444", fontSize: 11, background: stockLeft > 0 ? "#22c55e15" : "#ef444415", padding: "2px 8px", borderRadius: 99 }}>
                        Kho: {stockLeft}/{a.qty || 1}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    <div onClick={() => togglingAccId ? null : handleToggleActive(a)}
                      title={a.active === false ? "Bật hiển thị" : "Ẩn khỏi trang khách"}
                      style={{ width: 36, height: 18, borderRadius: 99, background: a.active === false ? "#333" : G, position: "relative", cursor: togglingAccId ? "not-allowed" : "pointer", transition: "all .2s", flexShrink: 0, opacity: togglingAccId && togglingAccId !== a.id ? 0.55 : 1 }}>
                      <div style={{ position: "absolute", top: 1, left: a.active === false ? 1 : 17, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button disabled={deletingAccId === a.id || togglingAccId === a.id} onClick={() => setEditAcc({ ...a })} style={{ ...btn("ghost"), padding: "5px 9px", fontSize: 13, opacity: deletingAccId === a.id || togglingAccId === a.id ? 0.55 : 1, cursor: deletingAccId === a.id || togglingAccId === a.id ? "not-allowed" : "pointer" }}>✏️</button>
                      <button disabled={deletingAccId === a.id || togglingAccId === a.id} onClick={() => handleDelete(a.id)} style={{ ...btn("danger"), padding: "5px 9px", fontSize: 13, opacity: deletingAccId === a.id ? 0.65 : 1, cursor: deletingAccId === a.id || togglingAccId === a.id ? "not-allowed" : "pointer" }}>{deletingAccId === a.id ? "Đang xoá..." : "🗑"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
