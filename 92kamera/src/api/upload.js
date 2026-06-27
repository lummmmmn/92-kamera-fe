/**
 * upload.js
 *
 * Hàm uploadImage — compress ảnh rồi gửi lên BE endpoint /api/upload.
 * BE sẽ upload lên Cloudinary và trả về secure_url.
 *
 * Dùng thay thế cho việc truyền base64 trực tiếp vào các API khác.
 */

import api from "../lib/axios.js";
import { compressImage } from "../utils/imageCompress.js";

/**
 * Compress + upload ảnh lên Cloudinary qua BE.
 *
 * @param {File} file           - File object từ input[type=file]
 * @param {object} options
 *   folder    — Cloudinary folder (mặc định BE tự chọn)
 *   public_id — Custom public_id (tùy chọn)
 *   maxPx     — Max edge px trước khi compress (default: 1200)
 *   quality   — JPEG quality 0–1 (default: 0.82)
 *   onProgress — Callback(percent: number) — nếu muốn hiện progress bar
 *
 * @returns {Promise<{ url: string, public_id: string, width: number, height: number, bytes: number, format: string }>}
 */
export async function uploadImage(file, options = {}) {
  const {
    folder,
    public_id,
    maxPx = 1200,
    quality = 0.82,
    onProgress,
  } = options;

  // 1. Compress ảnh phía FE trước khi gửi
  const compressed = await compressImage(file, { maxPx, quality });

  // 2. Build FormData
  const formData = new FormData();
  formData.append("file", compressed, file.name || "upload.jpg");
  if (folder) formData.append("folder", folder);
  if (public_id) formData.append("public_id", public_id);

  // 3. Gửi lên BE — BE upload lên Cloudinary và trả về URL
  const response = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (evt) => {
          const percent = evt.total
            ? Math.round((evt.loaded / evt.total) * 100)
            : 0;
          onProgress(percent);
        }
      : undefined,
  });

  return response.data;
  // { ok, url, secure_url, public_id, width, height, format, bytes }
}
