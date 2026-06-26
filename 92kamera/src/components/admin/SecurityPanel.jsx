import React, { useState } from "react";
import { TXT, MUT, CARD2, BR2, ADMIN_PW_DEFAULT_HASH, btn, inp2 } from "../../lib/constants.js";
import { sha256 } from "../../utils/hash.js";

// Section Title Helper
function STitle({ c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: TXT, fontWeight: 600, fontSize: 18, fontFamily: "system-ui,sans-serif" }}>{c}</h2>
        <div style={{ width: 30, height: 2, background: "#0D1B2A", marginTop: 6 }} />
      </div>
    </div>
  );
}

export default function SecurityPanel() {
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);

  const handleChangePw = async () => {
    setPwMsg(null);
    if (!pwOld || !pwNew || !pwConfirm) {
      setPwMsg({ type: "err", text: "Vui lòng điền đầy đủ" });
      return;
    }

    const currentHash = localStorage.getItem("k92_admin_pw_hash") || ADMIN_PW_DEFAULT_HASH;
    const oldHash = await sha256(pwOld);

    if (oldHash !== currentHash) {
      setPwMsg({ type: "err", text: "Mật khẩu hiện tại không đúng" });
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ type: "err", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: "err", text: "Mật khẩu xác nhận không khớp" });
      return;
    }

    const newHash = await sha256(pwNew);
    localStorage.setItem("k92_admin_pw_hash", newHash);

    setPwOld("");
    setPwNew("");
    setPwConfirm("");
    setPwMsg({ type: "ok", text: "✓ Đổi mật khẩu thành công!" });
    setTimeout(() => setPwMsg(null), 3000);
  };

  return (
    <div>
      <STitle c="Bảo mật tài khoản quản trị" />
      <div style={{ maxWidth: 480 }}>
        <div style={{ background: CARD2, border: `1px solid ${BR2}`, borderRadius: 14, padding: 24 }}>
          <div style={{ color: TXT, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔑 Đổi mật khẩu Admin</div>
          <div style={{ color: MUT, fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
            Mật khẩu được lưu riêng, chỉ có hiệu lực trên thiết bị này.
          </div>
          {pwMsg && (
            <div
              style={{
                background: pwMsg.type === "ok" ? "#022" : "#160505",
                border: `1px solid ${pwMsg.type === "ok" ? "#22c55e44" : "#ef444433"}`,
                borderRadius: 12,
                padding: "11px 14px",
                marginBottom: 16,
                color: pwMsg.type === "ok" ? "#22c55e" : "#ef4444",
                fontSize: 13,
              }}
            >
              {pwMsg.text}
            </div>
          )}
          <div style={{ marginBottom: 13 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MẬT KHẨU HIỆN TẠI</div>
            <input
              type="password"
              style={inp2}
              value={pwOld}
              onChange={(e) => setPwOld(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>MẬT KHẨU MỚI</div>
            <input
              type="password"
              style={inp2}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: MUT, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>XÁC NHẬN MẬT KHẨU MỚI</div>
            <input
              type="password"
              style={inp2}
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              onKeyDown={(e) => e.key === "Enter" && handleChangePw()}
            />
          </div>
          <button onClick={handleChangePw} style={btn("gold")}>
            Đổi mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
