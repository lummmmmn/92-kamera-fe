import { useState } from "react";
import ImageUploader from "../common/ImageUploader.jsx";
import Badge from "../common/Badge.jsx";
import { G, MUT, TXT, BR2, CARD, CARD2, inp2, btn } from "../../lib/constants.js";
import { cdnUrl, fmtVND } from "../../utils/format.js";

export default function CamerasPanel({
  cameras,
  onCreateCamera,
  onUpdateCamera,
  onDeleteCamera,
  isMobile,
}) {
  const [addCamOpen, setAddCamOpen] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [nc, setNc] = useState({
    name: "",
    price: "",
    desc: "",
    qty: 1,
    status: "available",
    icon: "📷",
    images: [],
    imagesMeta: [],
  });

  const handleCreate = async () => {
    if (!nc.name || !nc.price) return;
    try {
      await onCreateCamera({ ...nc, price: parseInt(nc.price) });
      setNc({ name: "", price: "", desc: "", qty: 1, status: "available", icon: "📷", images: [], imagesMeta: [] });
      setAddCamOpen(false);
    } catch (err) {
      alert("Đăng sản phẩm thất bại: " + err.message);
    }
  };

  const handleUpdate = async (c) => {
    try {
      await onUpdateCamera({ id: c.id, data: editCam });
      setEditCam(null);
    } catch (err) {
      alert("Lưu cập nhật thất bại: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Chắc chắn xoá máy ảnh này?")) {
      try {
        await onDeleteCamera(id);
      } catch (err) {
        alert("Xoá thất bại: " + err.message);
      }
    }
  };

  const STitle = ({ c, extra }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
      </div>
      {extra}
    </div>
  );

  return (
    <div>
      <STitle
        c={`Quản lý máy ảnh (${cameras.length})`}
        extra={
          <button onClick={() => setAddCamOpen(true)} style={{ ...btn("gold"), display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Thêm máy ảnh
          </button>
        }
      />

      {/* ADD CAMERA FORM */}
      {addCamOpen && (
        <div style={{ background: CARD2, border: `1px solid ${G}44`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ color: G, fontWeight: 700, fontSize: 14, marginBottom: 18 }}>📷 Thêm máy mới</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TÊN MÁY *</div>
              <input style={inp2} value={nc.name} onChange={(e) => setNc((p) => ({ ...p, name: e.target.value }))} placeholder="VD: Sony A7 IV" />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>GIÁ/NGÀY *</div>
              <input style={inp2} type="number" value={nc.price} onChange={(e) => setNc((p) => ({ ...p, price: e.target.value }))} placeholder="200000" />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SỐ LƯỢNG</div>
              <input style={inp2} type="number" min={1} value={nc.qty} onChange={(e) => setNc((p) => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MÔ TẢ</div>
              <input style={inp2} value={nc.desc} onChange={(e) => setNc((p) => ({ ...p, desc: e.target.value }))} placeholder="Mô tả ngắn về máy..." />
            </div>
            <div>
              <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>TRẠNG THÁI</div>
              <select style={{ ...inp2, cursor: "pointer" }} value={nc.status} onChange={(e) => setNc((p) => ({ ...p, status: e.target.value }))}>
                <option value="available">Còn máy</option>
                <option value="rented">Đang thuê</option>
                <option value="unavailable">Hết máy</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>HÌNH ẢNH SẢN PHẨM</div>
            <ImageUploader
              images={nc.images}
              imagesMeta={nc.imagesMeta || []}
              onChange={(imgs) => setNc((p) => ({ ...p, images: imgs }))}
              onChangeMeta={(meta) => setNc((p) => ({ ...p, imagesMeta: meta }))}
              max={6}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCreate} disabled={!nc.name || !nc.price} style={{ ...btn("gold"), opacity: !nc.name || !nc.price ? 0.5 : 1 }}>
              ✓ Đăng sản phẩm
            </button>
            <button onClick={() => setAddCamOpen(false)} style={btn("ghost")}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* CAMERA LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cameras.map((c) => (
          <div key={c.id} style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {/* Thumbnail */}
              <div
                style={{
                  flexShrink: 0,
                  width: 70,
                  height: 70,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: CARD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  border: `1px solid ${BR2}`,
                }}
              >
                {c.images?.length > 0 ? (
                  <img src={cdnUrl(c.images[0], "thumb")} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{c.icon}</span>
                )}
              </div>

              {/* Info / Edit */}
              <div style={{ flex: 1 }}>
                {editCam?.id === c.id ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr", gap: 9, marginBottom: 10 }}>
                      <input style={inp2} value={editCam.name} onChange={(e) => setEditCam((p) => ({ ...p, name: e.target.value }))} placeholder="Tên máy" />
                      <input
                        style={inp2}
                        type="number"
                        value={editCam.price}
                        onChange={(e) => setEditCam((p) => ({ ...p, price: parseInt(e.target.value) || 0 }))}
                        placeholder="Giá/ngày"
                      />
                      <input
                        style={inp2}
                        type="number"
                        min={1}
                        value={editCam.qty}
                        onChange={(e) => setEditCam((p) => ({ ...p, qty: parseInt(e.target.value) || 1 }))}
                        placeholder="SL"
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr", gap: 9, marginBottom: 10 }}>
                      <input style={inp2} value={editCam.desc} onChange={(e) => setEditCam((p) => ({ ...p, desc: e.target.value }))} placeholder="Mô tả" />
                      <select style={{ ...inp2, cursor: "pointer" }} value={editCam.status} onChange={(e) => setEditCam((p) => ({ ...p, status: e.target.value }))}>
                        <option value="available">Còn máy</option>
                        <option value="rented">Đang thuê</option>
                        <option value="unavailable">Hết máy</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: MUT, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>HÌNH ẢNH ({(editCam.images || []).length}/6)</div>
                      <ImageUploader
                        images={editCam.images || []}
                        imagesMeta={editCam.imagesMeta || []}
                        onChange={(imgs) => setEditCam((p) => ({ ...p, images: imgs }))}
                        onChangeMeta={(meta) => setEditCam((p) => ({ ...p, imagesMeta: meta }))}
                        max={6}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleUpdate(c)} style={btn("gold")}>
                        ✓ Lưu & cập nhật
                      </button>
                      <button onClick={() => setEditCam(null)} style={btn("ghost")}>
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ color: TXT, fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                      <Badge status={c.status} />
                      {c.images?.length > 0 && (
                        <span style={{ color: G, fontSize: 10, background: G + "15", padding: "2px 8px", borderRadius: 99 }}>📷 {c.images.length} ảnh</span>
                      )}
                    </div>
                    <div style={{ color: MUT, fontSize: 12, marginBottom: 6 }}>{c.desc}</div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ color: G, fontWeight: 700, fontSize: 13 }}>{fmtVND(c.price)}/ngày</span>
                      <span style={{ color: MUT, fontSize: 11 }}>SL: {c.qty}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {editCam?.id !== c.id && (
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <button onClick={() => setEditCam({ ...c, images: c.images || [], imagesMeta: c.imagesMeta || [] })} style={btn("ghost")}>
                    ✏️ Sửa
                  </button>
                  <button onClick={() => handleDelete(c.id)} style={btn("danger")}>
                    🗑
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
