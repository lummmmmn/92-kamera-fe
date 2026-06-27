import { useState, useRef } from "react";
import { G, CARD2, BR2, MUT, RED } from "../../lib/constants.js";
import { uploadImage } from "../../api/upload.js";
import { updateCamera } from "../../api/index.js";

/**
 * Multi-image uploader for cameras/accessories
 * Calls BE upload endpoint — no direct Cloudinary access
 *
 * @param {string[]} images       - current image URL array
 * @param {Array}    imagesMeta   - [{ url, public_id }]
 * @param {Function} onChange     - (urls: string[]) => void
 * @param {Function} onChangeMeta - (metas: object[]) => void
 * @param {number}   max          - max images (default 3)
 * @param {string}   cameraId     - camera id for upload endpoint
 */
export default function ImageUploader({
  images = [],
  imagesMeta = [],
  onChange,
  onChangeMeta,
  max = 3,
  cameraId,
}) {
  const fileRef    = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const handleFiles = async (files) => {
    const remaining  = max - images.length;
    const toProcess  = Array.from(files).slice(0, remaining).filter((f) => f.type.startsWith("image/"));
    if (!toProcess.length) return;
    setUploading(true);
    setUploadErr("");
    try {
      const results = await Promise.all(
        toProcess.map((file) =>
          uploadImage(file, {
            folder: "92kamera_cameras",
            maxPx: 1200,
            quality: 0.85,
          })
        )
      );
      const newUrls = results.map((r) => r.url);
      const newMeta = results.map((r) => ({ url: r.url, public_id: r.public_id }));
      const nextImages = [...images, ...newUrls];
      const nextMeta   = [...imagesMeta, ...newMeta];
      onChange(nextImages);
      if (onChangeMeta) onChangeMeta(nextMeta);

      // Persist lên BE: gửi mảng URL mới xuống endpoint update camera
      if (cameraId && cameraId !== "undefined" && cameraId !== "null") {
        await updateCamera(cameraId, { images: nextImages, imagesMeta: nextMeta });
      }
    } catch {
      setUploadErr("❌ Upload thất bại — thử lại hoặc kiểm tra kết nối");
    }
    setUploading(false);
  };

  const removeImg = (i) => {
    onChange(images.filter((_, idx) => idx !== i));
    if (onChangeMeta) onChangeMeta(imagesMeta.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {images.map((src, i) => (
          <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
            <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1px solid ${BR2}` }} />
            <button
              onClick={() => removeImg(i)}
              style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
            >✕</button>
          </div>
        ))}

        {images.length < max && !uploading && (
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: 72, height: 72, border: `2px dashed ${G}55`, borderRadius: 10, background: CARD2, color: G, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, fontFamily: "system-ui,sans-serif" }}
          >
            <span style={{ fontSize: 20 }}>+</span>
            <span>Thêm ảnh</span>
          </button>
        )}

        {uploading && (
          <div style={{ width: 72, height: 72, border: `1px solid ${BR2}`, borderRadius: 10, background: CARD2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: MUT, fontFamily: "system-ui,sans-serif" }}>
            ⏳ Upload...
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {uploadErr && <div style={{ color: RED, fontSize: 10, marginBottom: 4 }}>{uploadErr}</div>}
      {images.length > 0 && (
        <div style={{ color: MUT, fontSize: 10 }}>
          {images.length}/{max} ảnh · Nhấn ✕ để xoá
        </div>
      )}
    </div>
  );
}
