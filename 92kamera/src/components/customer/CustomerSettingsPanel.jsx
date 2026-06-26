import React, { useState, useRef } from "react";
import { G, MUT, TXT, BR } from "../../lib/constants.js";
import { compressImage } from "../../utils/image.js";
import { useUsers, useUpsertUser } from "../../hooks/useAppData.js";

export default function CustomerSettingsPanel({ loggedUser, setLoggedUser }) {
  const avatarRef = useRef();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // TanStack Query
  const { data: usersMap = {} } = useUsers();
  const upsertUserMutation = useUpsertUser();

  const [settingsForm, setSettingsForm] = useState({
    displayName: loggedUser?.displayName || loggedUser?.name || "",
    phone: loggedUser?.phone || "",
    zalo: loggedUser?.zalo || "",
    address: loggedUser?.address || "",
  });

  const handleSaveSettings = () => {
    const key = loggedUser.email || loggedUser.phone;
    const updated = {
      ...loggedUser,
      displayName: settingsForm.displayName || loggedUser.name,
      phone: settingsForm.phone,
      zalo: settingsForm.zalo,
      address: settingsForm.address,
    };
    setLoggedUser(updated);

    // Save to users backend map
    const existingUserData = usersMap[key] || {};
    const nextUserData = {
      ...existingUserData,
      displayName: settingsForm.displayName || loggedUser.name,
      phone: settingsForm.phone,
      zalo: settingsForm.zalo,
      address: settingsForm.address,
    };

    upsertUserMutation.mutate({
      [key]: nextUserData,
    });

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleAvatarChange = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarLoading(true);
    try {
      const compressed = await compressImage(file, 300, 0.65);
      const updated = { ...loggedUser, avatar: compressed };
      setLoggedUser(updated);

      const key = loggedUser.email || loggedUser.phone;
      const existingUserData = usersMap[key] || {};
      upsertUserMutation.mutate({
        [key]: { ...existingUserData, avatar: compressed },
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        .sp-inp { transition: border-color .2s, box-shadow .2s !important; }
        .sp-inp:focus { border-color: rgba(201,168,76,0.65) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.1) !important; outline: none !important; }
        .sp-inp::placeholder { color: rgba(74,106,138,0.7) !important; }
        .sp-save:hover { box-shadow: 0 6px 28px rgba(201,168,76,0.4) !important; transform: translateY(-1px); }
        .sp-save { transition: all .2s ease !important; }
        .sp-upload:hover { border-color: rgba(201,168,76,0.6) !important; background: rgba(255,255,255,0.20) !important; }
      `}</style>

      <div style={{ color: TXT, fontWeight: 800, fontSize: 20, marginBottom: 4, fontFamily: "system-ui,sans-serif" }}>
        Cài đặt hồ sơ
      </div>
      <div style={{ width: 36, height: 3, background: G, borderRadius: 2, marginBottom: 28 }} />

      {/* Avatar block */}
      <div
        style={{
          background: "rgba(255,255,255,0.13)",
          border: `1px solid rgba(255,255,255,0.22)`,
          borderRadius: 28,
          padding: "28px 20px 24px",
          textAlign: "center",
          marginBottom: 14,
          backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
          WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
          boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
        }}
      >
        <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }} onClick={() => avatarRef.current?.click()} title="Đổi ảnh đại diện">
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${G}22, rgba(255,255,255,0.10))`,
              border: `3px solid ${G}88`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: `0 0 0 5px ${G}14, 0 0 32px ${G}18`,
            }}
          >
            {loggedUser?.avatar || loggedUser?.picture ? (
              <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: G, fontWeight: 800, fontFamily: "system-ui,sans-serif" }}>{loggedUser?.name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: `linear-gradient(135deg,${G},#a07030)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              border: `2.5px solid rgba(255,255,255,0.30)`,
              cursor: "pointer",
              boxShadow: `0 0 12px ${G}99`,
            }}
          >
            {avatarLoading ? "⏳" : "📷"}
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) handleAvatarChange(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
        <div style={{ color: TXT, fontWeight: 700, fontSize: 15, marginBottom: 4, fontFamily: "system-ui,sans-serif" }}>
          {loggedUser?.displayName || loggedUser?.name || "Chưa đặt tên"}
        </div>
        <div style={{ color: MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 18 }}>
          {loggedUser?.email || loggedUser?.phone || ""}
        </div>
        {/* Upload zone */}
        <div
          className="sp-upload"
          onClick={() => avatarRef.current?.click()}
          style={{ border: `1.5px dashed ${G}44`, borderRadius: 20, padding: "16px 12px", cursor: "pointer", transition: "all .2s" }}
        >
          <div style={{ fontSize: 22, marginBottom: 5 }}>☁️</div>
          <div style={{ color: G, fontWeight: 600, fontSize: 12, fontFamily: "system-ui,sans-serif", marginBottom: 3 }}>Tải ảnh lên</div>
          <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>JPG, PNG – Tối đa 5MB</div>
        </div>
      </div>

      {/* Form fields */}
      <div
        style={{
          background: "rgba(255,255,255,0.13)",
          border: `1px solid rgba(255,255,255,0.22)`,
          borderRadius: 28,
          overflow: "hidden",
          marginBottom: 14,
          backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
          WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
          boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
        }}
      >
        {[
          { key: "displayName", icon: "👤", label: "Tên hiển thị", hint: "Tự động điền khi đặt máy", type: "text", placeholder: "Tên của bạn" },
          { key: "phone", icon: "📞", label: "Số điện thoại", hint: "Gửi thông tin đặt máy", type: "tel", placeholder: "0901 234 567" },
          { key: "zalo", icon: "💬", label: "Zalo", hint: "Xác nhận đơn qua Zalo", type: "tel", placeholder: "Số Zalo" },
          { key: "address", icon: "📍", label: "Địa chỉ nhận máy", hint: "Tự động điền khi đặt máy", type: "text", placeholder: "Số nhà, đường, phường..." },
        ].map(({ key, icon, label, hint, type, placeholder }, idx, arr) => (
          <div key={key} style={{ padding: "18px 20px", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.18)" : "none" }}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 14, opacity: 0.45 }}>{icon}</span>
              <span style={{ color: MUT, fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
                {label.toUpperCase()}
              </span>
              <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>— {hint}</span>
            </div>
            {/* Input */}
            <input
              className="sp-inp"
              type={type}
              value={settingsForm[key]}
              onChange={(e) => setSettingsForm((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.30)",
                borderRadius: 16,
                color: TXT,
                fontSize: 14,
                fontFamily: "system-ui,sans-serif",
                boxSizing: "border-box",
                caretColor: G,
              }}
            />
          </div>
        ))}

        {/* Google row */}
        <div style={{ padding: "18px 20px", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 14, opacity: 0.45 }}>✉️</span>
            <span style={{ color: MUT, fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>
              TÀI KHOẢN GOOGLE
            </span>
          </div>
          <input
            readOnly
            value={loggedUser?.email || ""}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 16,
              color: MUT,
              fontSize: 13,
              fontFamily: "system-ui,sans-serif",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#22c55e", fontSize: 13 }}>✅</span>
            <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600, fontFamily: "system-ui,sans-serif" }}>Đã xác minh</span>
          </div>
        </div>

        {/* Save button */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
          <button
            className="sp-save"
            onClick={handleSaveSettings}
            style={{
              width: "100%",
              padding: "15px 0",
              background: settingsSaved ? "#052" : `linear-gradient(135deg,#d4a93a,${G},#a07830)`,
              color: settingsSaved ? "#22c55e" : "#050300",
              border: settingsSaved ? "1px solid #22c55e44" : "none",
              borderRadius: 20,
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 15,
              fontFamily: "system-ui,sans-serif",
              letterSpacing: 0.3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: settingsSaved ? "none" : `0 4px 24px ${G}35`,
            }}
          >
            {settingsSaved ? (
              <>
                <span>✓</span>
                <span>Đã lưu hồ sơ!</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Lưu cài đặt</span>
              </>
            )}
          </button>
          <div style={{ textAlign: "center", marginTop: 10, color: MUT, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "system-ui,sans-serif" }}>
            <span>🛡️</span>
            <span>Thông tin của bạn được bảo mật tuyệt đối</span>
          </div>
        </div>
      </div>
    </div>
  );
}
