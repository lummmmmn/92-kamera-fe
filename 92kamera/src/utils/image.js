/**
 * Image processing utilities
 */

/**
 * Resizes an image file maintaining aspect ratio. 
 * Resolves to a File object of JPEG type.
 */
export function resizeImageFile(file, maxEdge = 2400, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    // TIMEOUT 15s - for unsupported formats like HEIC on Chrome/Edge
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "Không đọc được ảnh sau 15s — định dạng này (vd. HEIC/HEIF từ iPhone hoặc 1 số máy ảnh) có thể không được trình duyệt hỗ trợ. Hãy đổi ảnh sang JPG/PNG trước khi upload."
        )
      );
    }, 15000);

    img.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Ảnh bị lỗi hoặc không đúng định dạng"));
    };

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Không nén được ảnh — có thể ảnh quá lớn cho thiết bị này"));
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.src = objectUrl;
  });
}

/**
 * Compress an image to data URL format
 */
export function compressImage(file, maxW = 480, quality = 0.55) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxW / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress icon: crops square 96x96, ~3-8KB
 */
export function compressIcon(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
