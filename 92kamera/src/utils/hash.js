/**
 * SHA-256 hash dùng Web Crypto API (có sẵn trên browser, không cần thư viện)
 * Lưu hash thay vì plaintext — ai đọc được Firestore cũng không biết password gốc
 */
export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
