import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TXT, MUT, CARD, CARD2, BR, G, btn } from "../../lib/constants.js";
import { cdnUrl } from "../../utils/format.js";
import { uploadImage } from "../../api/upload.js";
import {
  usePhotos,
  useDeletePhoto,
  useAlbums,
  useCreateAlbum,
  useUpdateAlbum,
  useDeleteAlbum
} from "../../hooks/useAppData.js";
import AlbumManager from "./AlbumManager.jsx";
import PhotoLightbox from "../common/PhotoLightbox.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import AdminToast from "./AdminToast.jsx";

const PHOTO_PAGE_SIZE = 48;
const ALBUM_PAGE_SIZE = 12;

export default function GalleryPanel({ isMobile }) {
  const qc = useQueryClient();
  const [photoPage, setPhotoPage] = useState(0);
  const [albumPage, setAlbumPage] = useState(0);
  const [photoPages, setPhotoPages] = useState({});
  const [albumPages, setAlbumPages] = useState({});

  const photoQuery = usePhotos({ limit: PHOTO_PAGE_SIZE, offset: photoPage * PHOTO_PAGE_SIZE });
  const albumQuery = useAlbums({ limit: ALBUM_PAGE_SIZE, offset: albumPage * ALBUM_PAGE_SIZE });

  useEffect(() => {
    const pageItems = Array.isArray(photoQuery.data) ? photoQuery.data : [];
    setPhotoPages((prev) => {
      const current = prev[photoPage] || [];
      if (current === pageItems) return prev;
      return { ...prev, [photoPage]: pageItems };
    });
  }, [photoPage, photoQuery.data]);

  useEffect(() => {
    const pageItems = Array.isArray(albumQuery.data) ? albumQuery.data : [];
    setAlbumPages((prev) => {
      const current = prev[albumPage] || [];
      if (current === pageItems) return prev;
      return { ...prev, [albumPage]: pageItems };
    });
  }, [albumPage, albumQuery.data]);

  const photos = Object.keys(photoPages)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((page) => photoPages[page] || []);
  const albums = Object.keys(albumPages)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((page) => albumPages[page] || []);
  const photoHasMore = (photoQuery.data?.length || 0) === PHOTO_PAGE_SIZE;
  const albumHasMore = (albumQuery.data?.length || 0) === ALBUM_PAGE_SIZE;
  const isLoadingPhotos = photoQuery.isFetching;
  const isLoadingAlbums = albumQuery.isFetching;
  const refetchAlbums = albumQuery.refetch;

  const deletePhotoMutation = useDeletePhoto();
  const createAlbumMutation = useCreateAlbum();
  const updateAlbumMutation = useUpdateAlbum();
  const deleteAlbumMutation = useDeleteAlbum();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadStage, setUploadStage] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const dirty = removedIds.length > 0 || draft.some(p => p._new);
  const photoId = (photo) => photo?.public_id || photo?.id || photo?._id;
  const isDataImageUrl = (url) => typeof url === "string" && url.startsWith("data:image");
  const toAlbumPhoto = (photo) => ({
    id: photoId(photo),
    public_id: photo?.public_id || photoId(photo),
    url: photo?.url,
    uploadedAt: photo?.uploadedAt || photo?.uploaded_at,
    uploaded_at: photo?.uploaded_at || photo?.uploadedAt,
    uploaded_by: photo?.uploaded_by,
  });
  const sanitizeAlbumForSave = (album) => {
    const albumPhotos = (album.photos || []).map(toAlbumPhoto).filter((p) => p.id && p.url);
    const hasBase64Photo = albumPhotos.some((p) => isDataImageUrl(p.url));

    if (hasBase64Photo || isDataImageUrl(album.coverUrl)) {
      throw new Error(`Album "${album.name || album.id}" đang chứa ảnh base64. Hãy upload lại ảnh đó lên Cloudinary rồi lưu album.`);
    }

    const nextCoverId = album.coverId || photoId(albumPhotos[0]);
    const nextCover = albumPhotos.find((p) => photoId(p) === nextCoverId) || albumPhotos[0];

    return {
      ...album,
      photos: albumPhotos,
      coverId: photoId(nextCover),
      coverUrl: nextCover?.url,
    };
  };

  const resetGalleryPaging = () => {
    setPhotoPage(0);
    setAlbumPage(0);
    setPhotoPages({});
    setAlbumPages({});
  };

  useEffect(() => {
    setDraft((prev) => {
      const loaded = new Map();
      for (const photo of photos || []) {
        const id = photoId(photo);
        if (id && !removedIds.includes(id)) {
          loaded.set(id, photo);
        }
      }

      const next = [];
      const seen = new Set();

      for (const item of prev) {
        const id = photoId(item);
        if (!id) continue;
        if (item._new) {
          next.push(item);
          seen.add(id);
          continue;
        }
        const merged = loaded.get(id);
        if (merged) {
          next.push({ ...merged, ...item });
          seen.add(id);
        }
      }

      for (const photo of photos || []) {
        const id = photoId(photo);
        if (!id || seen.has(id) || removedIds.includes(id)) continue;
        next.push(photo);
      }

      return next;
    });
  }, [photos, removedIds]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!fileArr.length) return;

    const MAX_PER_BATCH = 8;
    const batch = fileArr.slice(0, MAX_PER_BATCH);
    const skipped = fileArr.length - batch.length;

    setUploading(true);
    setUploadMsg(null);
    setUploadProgress({ done: 0, total: batch.length });

    const newOnes = [];
    let lastError = null;

    for (let i = 0; i < batch.length; i++) {
      try {
        setUploadStage(`Đang nén & upload ảnh ${i + 1}/${batch.length}...`);

        const r = await uploadImage(batch[i], {
          folder: "92kamera_gallery",
          maxPx: 2400,
          quality: 0.88,
          onProgress: (pct) => {
            // optional: hiện progress network nếu cần
          },
        });

        newOnes.push({
          id: r.public_id,
          public_id: r.public_id,
          url: r.url,
          uploadedAt: new Date().toISOString(),
          _new: true,
        });
      } catch (e) {
        console.error("Upload error:", batch[i].name, e);
        lastError = e;
      }
      setUploadProgress({ done: i + 1, total: batch.length });
    }

    setUploading(false);
    setUploadStage("");
    setUploadProgress({ done: 0, total: 0 });

    if (newOnes.length > 0) {
      setDraft(prev => [...newOnes, ...prev]);
      const skipNote = skipped > 0 ? ` (${skipped} ảnh còn lại, upload tiếp ở lượt sau)` : "";
      setUploadMsg({
        type: "ok",
        text: `✓ Đã thêm ${newOnes.length}/${batch.length} ảnh${skipNote} — bấm "Lưu & cập nhật web" để áp dụng`,
      });
      setTimeout(() => setUploadMsg(null), 6000);
    } else {
      setUploadMsg({
        type: "err",
        text: `❌ Upload thất bại: ${lastError?.message || "lỗi không rõ"}`,
      });
      setTimeout(() => setUploadMsg(null), 7000);
    }
  };

  const handleDelete = (photo) => {
    const id = photoId(photo);
    if (!id) return;

    setConfirmCfg({
      message: 'Xóa ảnh này?\n\nẢnh sẽ bị xóa khi bạn bấm "Lưu & cập nhật web".',
      onOk: () => {
        setConfirmCfg(null);
        if (photo._new) {
          setDraft(prev => prev.filter(p => photoId(p) !== id));
        } else {
          setRemovedIds(prev => prev.includes(id) ? prev : [...prev, id]);
          setDraft(prev => prev.filter(p => photoId(p) !== id));
        }
        setUploadMsg({
          type: "ok",
          text: "✓ Đã đánh dấu xóa ảnh — bấm \"Lưu & cập nhật web\" để áp dụng",
        });
        setTimeout(() => setUploadMsg(null), 4000);
      },
    });
  };

  const handleSaveAndPublish = async () => {
    setSaving(true);
    setUploadMsg(null);
    try {
      const removedSet = new Set(removedIds);

      // 1. Thực hiện xóa các ảnh cũ trên server song song
      await Promise.all(removedIds.map((pid) => deletePhotoMutation.mutateAsync(pid)));

      // 2. Cập nhật hoặc xóa các album tương ứng song song
      const albumPromises = (albums || []).map(async (album) => {
        const currentPhotos = Array.isArray(album.photos) ? album.photos : [];
        const nextPhotos = currentPhotos.filter((p) => !removedSet.has(photoId(p)));

        if (nextPhotos.length === currentPhotos.length) return;

        if (nextPhotos.length === 0) {
          await deleteAlbumMutation.mutateAsync(album.id);
          return;
        }

        const coverStillExists = nextPhotos.some((p) => photoId(p) === album.coverId);
        const nextCover = coverStillExists
          ? nextPhotos.find((p) => photoId(p) === album.coverId)
          : nextPhotos[0];

        const nextAlbum = sanitizeAlbumForSave({
            ...album,
            photos: nextPhotos,
            coverId: photoId(nextCover),
            coverUrl: nextCover?.url,
            updatedAt: new Date().toISOString(),
        });

        await updateAlbumMutation.mutateAsync({
          id: album.id,
          data: nextAlbum,
        });
      });

      await Promise.all(albumPromises);
      // 2. Refresh lại danh sách ảnh gốc từ server
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["photos"] }),
        qc.invalidateQueries({ queryKey: ["albums"] }),
      ]);
      resetGalleryPaging();

      setRemovedIds([]);
      setUploadMsg({
        type: "ok",
        text: "✓ Đã lưu thay đổi thành công lên database!",
      });
      setTimeout(() => setUploadMsg(null), 8000);
    } catch (e) {
      console.error("Save gallery failed:", e);
      setUploadMsg({
        type: "err",
        text: `❌ Lưu thất bại: ${e.message || "lỗi hệ thống"}`,
      });
      setTimeout(() => setUploadMsg(null), 8000);
    } finally {
      setSaving(false);
    }
  };

  const setAlbumsWrapper = async (updatedAlbumsOrFn) => {
    let nextAlbums = updatedAlbumsOrFn;
    if (typeof updatedAlbumsOrFn === "function") {
      nextAlbums = updatedAlbumsOrFn(albums);
    }
    // So sánh để xem có thêm mới, sửa hay xóa album
    const currentIds = albums.map(a => a.id);
    const nextIds = nextAlbums.map(a => a.id);

    // 1. Tìm album bị xóa
    const deletedIds = currentIds.filter(id => !nextIds.includes(id));
    for (const id of deletedIds) {
      await deleteAlbumMutation.mutateAsync(id);
    }

    // 2. Tìm album được thêm mới hoặc cập nhật
    for (const alb of nextAlbums) {
      if (alb.id.startsWith("tmp_alb_")) {
        // ID tạm của FE -> tạo mới
        const { id, ...data } = sanitizeAlbumForSave(alb);
        await createAlbumMutation.mutateAsync(data);
      } else {
        // ID thật -> Chỉ gửi request cập nhật nếu có thay đổi thực sự để tránh spam request làm treo hệ thống
        const original = albums.find((a) => a.id === alb.id);
        if (original) {
          const photoId = (p) => p?.public_id || p?.id || p?._id;
          const origPhotoIds = (original.photos || []).map(photoId).join(",");
          const nextPhotoIds = (alb.photos || []).map(photoId).join(",");

          const hasChanged =
            original.name !== alb.name ||
            original.cameraTag !== alb.cameraTag ||
            original.coverId !== alb.coverId ||
            origPhotoIds !== nextPhotoIds;

          if (hasChanged) {
            await updateAlbumMutation.mutateAsync({ id: alb.id, data: sanitizeAlbumForSave(alb) });
          }
        }
      }
    }
    await refetchAlbums();
    resetGalleryPaging();
  };

  const pct = uploadProgress.total > 0 ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0;

  return (
    <>
      <AdminToast toast={uploadMsg} onClose={() => setUploadMsg(null)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>
            Ảnh Gallery Khách ({draft.length})
          </h2>
          <div style={{ width: 30, height: 2, background: G, marginTop: 6 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
            ☁️ Cloudinary
          </div>
          <button
            onClick={handleSaveAndPublish}
            disabled={!dirty || saving}
            style={{
              ...btn("gold"),
              fontSize: 12,
              padding: "8px 16px",
              opacity: !dirty || saving ? 0.5 : 1,
              cursor: !dirty || saving ? "default" : "pointer",
            }}
          >
            {saving ? "⏳ Đang lưu..." : "✓ Lưu & cập nhật web"}
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => {
          if (!uploading) document.getElementById("gal-upload-input").click();
        }}
        onDragOver={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = G;
        }}
        onDragLeave={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = BR;
        }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = BR;
          handleUpload(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${BR}`,
          borderRadius: 16,
          padding: "28px 20px",
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          marginBottom: 18,
          background: "rgba(255,255,255,0.35)",
          transition: "border-color .2s",
        }}
      >
        <input
          id="gal-upload-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => {
            handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
        {uploading ? (
          <>
            <div style={{ color: TXT, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif", marginBottom: 10 }}>
              ⏳ {uploadStage || `Đang xử lý ${uploadProgress.done}/${uploadProgress.total} ảnh...`}
            </div>
            <div style={{ width: "100%", maxWidth: 280, margin: "0 auto", height: 6, background: BR, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: G, borderRadius: 99, transition: "width .3s ease" }} />
            </div>
            <div style={{ color: G, fontSize: 11, marginTop: 6, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>{pct}%</div>
          </>
        ) : (
          <>
            <div style={{ color: TXT, fontWeight: 700, fontSize: 14, fontFamily: "system-ui,sans-serif" }}>
              Bấm hoặc kéo thả ảnh vào đây
            </div>
            <div style={{ color: MUT, fontSize: 11, marginTop: 4, fontFamily: "system-ui,sans-serif" }}>
              Ảnh → Cloudinary CDN · Bấm "Lưu & cập nhật web" để áp dụng
            </div>
          </>
        )}
      </div>



      {dirty && (
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            marginBottom: 14,
            background: "rgba(201,168,76,0.1)",
            border: "1px solid rgba(201,168,76,0.3)",
            color: G,
            fontSize: 12,
            fontFamily: "system-ui,sans-serif",
            fontWeight: 600,
          }}
        >
          ⚠️ Có thay đổi chưa lưu — bấm "Lưu & cập nhật web" để áp dụng cho khách
        </div>
      )}

      {draft.length === 0 ? (
        <div style={{ color: MUT, fontSize: 13, padding: "16px 0" }}>
          {isLoadingPhotos ? "Đang tải ảnh..." : "Chưa có ảnh nào — upload ảnh khách lên để hiện ở trang chủ"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {draft.map((p, i) => (
            <div key={p.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1/1", background: CARD2 }}>
              <img
                src={cdnUrl(p.url, "thumb")}
                alt=""
                onClick={() => setPreviewIdx(i)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }}
                loading="lazy"
              />
              {p._new && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    background: G,
                    color: "#E8F0F8",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 6,
                    fontFamily: "system-ui,sans-serif",
                  }}
                >
                  MỚI
                </div>
              )}
              <button
                onClick={() => handleDelete(p)}
                title="Xóa ảnh"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(192,41,10,0.85)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {(photoHasMore || isLoadingPhotos) && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <button
            type="button"
            disabled={isLoadingPhotos}
            onClick={() => setPhotoPage((p) => p + 1)}
            style={{ ...btn("ghost"), fontSize: 12, padding: "8px 14px", opacity: isLoadingPhotos ? 0.6 : 1 }}
          >
            {isLoadingPhotos ? "Đang tải..." : "Tải thêm ảnh"}
          </button>
        </div>
      )}

      {/* Lightbox to xem ảnh */}
      {previewIdx !== null && draft.length > 0 && (
        <PhotoLightbox photos={draft} startIndex={previewIdx} onClose={() => setPreviewIdx(null)} />
      )}

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.2)",
          marginBottom: 28,
          fontSize: 11,
          color: MUT,
          fontFamily: "system-ui,sans-serif",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: G }}>💡 Quản lý:</strong> Bấm 🗑 để đánh dấu xóa, rồi bấm "Lưu & cập nhật web" để áp dụng thật.
      </div>
      <div style={{ width: "100%", height: 1, background: BR, marginBottom: 28, opacity: 0.4 }} />

      {/* Album Manager */}
      {(albumHasMore || isLoadingAlbums) && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <button
            type="button"
            disabled={isLoadingAlbums}
            onClick={() => setAlbumPage((p) => p + 1)}
            style={{ ...btn("ghost"), fontSize: 12, padding: "8px 14px", opacity: isLoadingAlbums ? 0.6 : 1 }}
          >
            {isLoadingAlbums ? "Đang tải album..." : "Tải thêm album"}
          </button>
        </div>
      )}
      <AlbumManager photos={draft} albums={albums} setAlbums={setAlbumsWrapper} isMobile={isMobile} />

      <ConfirmDialog message={confirmCfg?.message} onOk={confirmCfg?.onOk} onCancel={() => setConfirmCfg(null)} />
    </>
  );
}
