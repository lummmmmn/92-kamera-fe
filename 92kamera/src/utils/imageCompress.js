/**
 * imageCompress.js
 *
 * Compress ảnh phía browser dùng Canvas API trước khi upload lên server.
 * - Resize về maxPx (cạnh dài) nếu ảnh vượt quá
 * - Encode sang JPEG với quality cho trước
 * - Trả về Blob (dùng cho FormData)
 *
 * Không cần thư viện thêm — chạy thuần browser.
 */

/**
 * @param {File | Blob} file - Ảnh gốc từ input[type=file]
 * @param {{ maxPx?: number, quality?: number, mimeType?: string }} options
 *   maxPx    — Cạnh dài tối đa (px). Default: 1200
 *   quality  — JPEG quality 0–1. Default: 0.82
 *   mimeType — Output MIME. Default: "image/jpeg"
 * @returns {Promise<Blob>} Ảnh đã nén
 */
export async function compressImage(
  file,
  { maxPx = 1200, quality = 0.82, mimeType = "image/jpeg" } = {}
) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Tính kích thước output — giữ nguyên tỉ lệ
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height / width) * maxPx);
          width = maxPx;
        } else {
          width = Math.round((width / height) * maxPx);
          height = maxPx;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context không khả dụng"));
        return;
      }

      // Vẽ ảnh vào canvas với kích thước đã scale
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob thất bại"));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không load được ảnh để compress"));
    };

    img.src = url;
  });
}

/**
 * Trả về kích thước file dạng human-readable (KB / MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
