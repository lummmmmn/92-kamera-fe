import React, { useState } from "react";
import { useSendWish } from "../../hooks/useWishes.js";

const MAX_LENGTH = 500;

/** Form điều ước trong hộp thoại pixel: hoàn toàn ẩn danh, SĐT là tuỳ chọn. */
export default function WishPanel({ sock, onClose }) {
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // ô bẫy bot — người thật không thấy
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const send = useSendWish();
  const busy = send.isPending;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const text = message.trim();
    if (!text) { setError("Viết điều ước trước đã nha bro!"); return; }
    setError("");
    try {
      await send.mutateAsync({ sockId: sock.id, message: text, phone: phone.trim(), website });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Gửi chưa được, thử lại sau nha bro!");
    }
  };

  if (done) {
    return (
      <div className="px-wish-ok">
        <b>Đã nhét vào tất rồi nha!</b>
        <p>Cảm ơn bro, tiệm sẽ đọc điều ước của bạn.</p>
        <button type="button" className="px-pb p lg" onClick={onClose}>ĐÓNG</button>
      </div>
    );
  }

  return (
    <form className="px-wish" onSubmit={submit}>
      <p>
        Viết điều ước rồi bỏ vào chiếc tất {sock.name} nha. <b>Hoàn toàn ẩn danh</b> như hòm thư góp ý —
        chỉ khi bạn để lại số điện thoại thì tiệm mới liên hệ lại được.
      </p>
      <label>
        Điều ước của bạn
        <textarea
          value={message} maxLength={MAX_LENGTH} rows={5} required autoFocus
          placeholder="Ví dụ: mong tiệm có thêm lens 50mm..."
          onChange={(e) => setMessage(e.target.value)}
        />
        <span className="cnt">{message.length}/{MAX_LENGTH}</span>
      </label>
      <label>
        Số điện thoại <small>(không bắt buộc — chỉ điền nếu muốn tiệm liên hệ lại)</small>
        <input
          type="tel" inputMode="tel" autoComplete="off" value={phone} maxLength={20}
          placeholder="09xx xxx xxx" onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <div className="hp" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error ? <div className="err" role="alert">{error}</div> : null}
      <button type="submit" className="px-pb p lg" disabled={busy}>{busy ? "ĐANG GỬI..." : "BỎ VÀO TẤT"}</button>
    </form>
  );
}
