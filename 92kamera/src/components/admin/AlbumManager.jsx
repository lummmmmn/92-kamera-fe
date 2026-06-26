import React, { useState } from "react";
import { TXT, MUT, CARD, CARD2, BR, G, btn } from "../../lib/constants.js";
import { cdnUrl } from "../../utils/format.js";
import AlbumLightbox from "../common/AlbumLightbox.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

export default function AlbumManager({ photos, albums, setAlbums, isMobile }) {
  const [mode, setMode] = useState("list"); // "list" | "create" | "edit"
  const [editAlbum, setEditAlbum] = useState(null);
  const [form, setForm] = useState({ name: "", cameraTag: "", coverId: "", photoIds: [] });
  const [openAlbum, setOpenAlbum] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [deletingAlbumId, setDeletingAlbumId] = useState(null);
  const photoId = (photo) => photo?.public_id || photo?.id || photo?._id;

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const startCreate = () => {
    setForm({ name: "", cameraTag: "", coverId: "", photoIds: [] });
    setEditAlbum(null);
    setMode("create");
  };

  const startEdit = (alb) => {
    setForm({
      name: alb.name,
      cameraTag: alb.cameraTag || "",
      coverId: alb.coverId || "",
      photoIds: (alb.photos || []).map((p) => photoId(p)).filter(Boolean),
    });
    setEditAlbum(alb);
    setMode("edit");
  };

  const togglePhoto = (p) => {
    const id = photoId(p);
    if (!id) return;

    setForm((f) => {
      const has = f.photoIds.includes(id);
      const newIds = has ? f.photoIds.filter((x) => x !== id) : [...f.photoIds, id];
      const coverId = has && f.coverId === id ? "" : f.coverId;
      return { ...f, photoIds: newIds, coverId };
    });
  };

  const handleSave = async () => {
    if (savingAlbum) return;

    if (!form.name.trim()) {
      showMsg("err", "Nhập tên album");
      return;
    }
    if (form.photoIds.length === 0) {
      showMsg("err", "Chọn ít nhất 1 ảnh");
      return;
    }
    const selectedPhotos = (photos || []).filter((p) => form.photoIds.includes(photoId(p)));
    const coverId = form.coverId || form.photoIds[0];
    const coverPhoto = selectedPhotos.find((p) => photoId(p) === coverId) || selectedPhotos[0];
    const now = new Date().toISOString();
    try {
      setSavingAlbum(true);
      if (editAlbum) {
        await setAlbums((prev) =>
          prev.map((a) =>
            a.id === editAlbum.id
              ? {
                  ...a,
                  name: form.name.trim(),
                  cameraTag: form.cameraTag.trim(),
                  coverId,
                  coverUrl: coverPhoto?.url,
                  photos: selectedPhotos,
                  updatedAt: now,
                }
              : a
          )
        );
        showMsg("ok", "✓ Đã lưu album");
      } else {
        await setAlbums((prev) => [
          {
            id: "tmp_alb_" + Date.now(),
            name: form.name.trim(),
            cameraTag: form.cameraTag.trim(),
            coverId,
            coverUrl: coverPhoto?.url,
            photos: selectedPhotos,
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ]);
        showMsg("ok", "✓ Tạo album thành công");
      }
      setMode("list");
    } catch (err) {
      showMsg("err", "Lưu album thất bại: " + err.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDelete = (alb) => {
    setConfirmCfg({
      message: `Xóa album "${alb.name}"?\n\nẢnh gốc không bị xóa.`,
      id: alb.id,
      onOk: async () => {
        if (deletingAlbumId) return;

        try {
          setDeletingAlbumId(alb.id);
          await setAlbums((prev) => prev.filter((a) => a.id !== alb.id));
          showMsg("ok", "✓ Đã xóa album");
          setConfirmCfg(null);
        } catch (err) {
          showMsg("err", "Xóa album thất bại: " + err.message);
        } finally {
          setDeletingAlbumId(null);
        }
      },
    });
  };

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Title + nút tạo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, color: TXT, fontWeight: 700, fontSize: 15, fontFamily: "system-ui,sans-serif" }}>
            📂 Album Máy Ảnh ({(albums || []).length})
          </h3>
          <div style={{ color: MUT, fontSize: 11, marginTop: 4, fontFamily: "system-ui,sans-serif" }}>
            Phân loại ảnh theo từng máy để khách xem màu sắc, độ nét
          </div>
        </div>
        {mode === "list" && (
          <button onClick={startCreate} style={{ ...btn("gold"), fontSize: 12, padding: "7px 14px" }}>
            + Tạo album
          </button>
        )}
        {(mode === "create" || mode === "edit") && (
          <button onClick={() => setMode("list")} style={{ ...btn("ghost"), fontSize: 12, padding: "7px 14px" }}>
            ← Quay lại
          </button>
        )}
      </div>

      {msg && (
        <div
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            marginBottom: 14,
            background: msg.type === "ok" ? "#EEF9F4" : "#FEF0F0",
            border: `1px solid ${msg.type === "ok" ? "#22c55e44" : "#ef444433"}`,
            color: msg.type === "ok" ? "#22c55e" : "#ef4444",
            fontSize: 13,
            fontFamily: "system-ui,sans-serif",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* FORM TẠO / SỬA */}
      {(mode === "create" || mode === "edit") && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${BR}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", color: TXT, fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: "system-ui,sans-serif" }}>Tên album *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Sony A7C — Chụp phong cảnh"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: CARD2,
                  border: `1px solid ${BR}`,
                  borderRadius: 10,
                  color: TXT,
                  fontSize: 13,
                  fontFamily: "system-ui,sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: TXT, fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: "system-ui,sans-serif" }}>Tag máy ảnh</label>
              <input
                value={form.cameraTag}
                onChange={(e) => setForm((f) => ({ ...f, cameraTag: e.target.value }))}
                placeholder="VD: Sony A7C · Full-frame"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: CARD2,
                  border: `1px solid ${BR}`,
                  borderRadius: 10,
                  color: TXT,
                  fontSize: 13,
                  fontFamily: "system-ui,sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Chọn ảnh */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: TXT, fontSize: 12, fontWeight: 600, marginBottom: 10, fontFamily: "system-ui,sans-serif" }}>
              Chọn ảnh cho album — <span style={{ color: G, fontWeight: 700 }}>{form.photoIds.length}</span> ảnh đã chọn
              {form.photoIds.length > 0 && <span style={{ color: MUT, fontWeight: 400 }}> · Bấm vào ảnh đã chọn để bỏ</span>}
            </div>
            {(photos || []).length === 0 ? (
              <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>Chưa có ảnh nào — upload ảnh trước</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: 8 }}>
                {(photos || []).map((p) => {
                  const id = photoId(p);
                  const selected = form.photoIds.includes(id);
                  const isCover = form.coverId === id;
                  return (
                    <div
                      key={id}
                      style={{
                        position: "relative",
                        borderRadius: 10,
                        overflow: "hidden",
                        aspectRatio: "1/1",
                        cursor: "pointer",
                        border: selected ? `2px solid ${G}` : `2px solid transparent`,
                        opacity: selected ? 1 : 0.55,
                        transition: "all .18s",
                      }}
                    >
                      <img
                        src={cdnUrl(p.url, "thumb")}
                        alt=""
                        onClick={() => togglePhoto(p)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                      {selected && (
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            left: 4,
                            background: G,
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: "#E8F0F8",
                            fontWeight: 800,
                          }}
                        >
                          ✓
                        </div>
                      )}
                      {selected && (
                        <button
                          onClick={() => setForm((f) => ({ ...f, coverId: isCover ? "" : id }))}
                          title={isCover ? "Đang là ảnh bìa" : "Đặt làm ảnh bìa"}
                          style={{
                            position: "absolute",
                            bottom: 4,
                            right: 4,
                            background: isCover ? G : "rgba(0,0,0,0.55)",
                            border: "none",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: 9,
                            color: isCover ? "#E8F0F8" : "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontFamily: "system-ui,sans-serif",
                          }}
                        >
                          {isCover ? "★ BÌA" : "☆ bìa"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={savingAlbum}
              style={{ ...btn("gold"), flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700, opacity: savingAlbum ? 0.65 : 1, cursor: savingAlbum ? "not-allowed" : "pointer" }}
            >
              {savingAlbum ? "⏳ Đang lưu..." : mode === "edit" ? "💾 Lưu thay đổi" : "✓ Tạo album"}
            </button>
            <button
              onClick={() => setMode("list")}
              disabled={savingAlbum}
              style={{ ...btn("ghost"), padding: "10px 20px", fontSize: 13, opacity: savingAlbum ? 0.55 : 1, cursor: savingAlbum ? "not-allowed" : "pointer" }}
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* DANH SÁCH ALBUM */}
      {mode === "list" &&
        ((albums || []).length === 0 ? (
          <div style={{ color: MUT, fontSize: 13, padding: "20px 0", textAlign: "center", border: `1px dashed ${BR}`, borderRadius: 12 }}>
            Chưa có album nào · Bấm "Tạo album" để bắt đầu
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
            {(albums || []).map((alb) => (
              <div key={alb.id} style={{ background: CARD, border: `1px solid ${BR}`, borderRadius: 14, overflow: "hidden", display: "flex", gap: 0 }}>
                {/* Cover */}
                <div onClick={() => setOpenAlbum(alb)} style={{ width: 90, flexShrink: 0, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {alb.coverUrl ? (
                    <img src={cdnUrl(alb.coverUrl, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: CARD2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                      📷
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(5,12,22,0.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity .2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                  >
                    <span style={{ color: "#fff", fontSize: 20 }}>▶</span>
                  </div>
                </div>
                {/* Info */}
                <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: TXT, fontWeight: 700, fontSize: 13, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>{alb.name}</div>
                    {alb.cameraTag && <div style={{ color: G, fontSize: 11, fontFamily: "system-ui,sans-serif", marginBottom: 4 }}>📷 {alb.cameraTag}</div>}
                    <div style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>{(alb.photos || []).length} ảnh</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => setOpenAlbum(alb)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background: "rgba(201,168,76,0.10)",
                        border: `1px solid ${G}44`,
                        color: G,
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "system-ui,sans-serif",
                      }}
                    >
                      👁 Xem
                    </button>
                    <button
                      onClick={() => startEdit(alb)}
                      disabled={deletingAlbumId === alb.id}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background: CARD2,
                        border: `1px solid ${BR}`,
                        color: TXT,
                        borderRadius: 8,
                        cursor: deletingAlbumId === alb.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontFamily: "system-ui,sans-serif",
                        opacity: deletingAlbumId === alb.id ? 0.55 : 1,
                      }}
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(alb)}
                      disabled={deletingAlbumId === alb.id}
                      style={{
                        padding: "6px 10px",
                        background: "#FEF0F0",
                        border: "1px solid #ef444433",
                        color: "#ef4444",
                        borderRadius: 8,
                        cursor: deletingAlbumId === alb.id ? "not-allowed" : "pointer",
                        fontSize: 11,
                        fontFamily: "system-ui,sans-serif",
                        opacity: deletingAlbumId === alb.id ? 0.65 : 1,
                      }}
                    >
                      {deletingAlbumId === alb.id ? "Đang xoá..." : "🗑"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Album Lightbox trong admin */}
      {openAlbum && <AlbumLightbox album={openAlbum} onClose={() => setOpenAlbum(null)} />}
      <ConfirmDialog message={confirmCfg?.message} onOk={confirmCfg?.onOk} onCancel={() => setConfirmCfg(null)} loading={!!deletingAlbumId} />
    </div>
  );
}
