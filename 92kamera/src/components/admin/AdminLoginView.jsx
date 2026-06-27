import { useState, useEffect } from "react";
import { sha256 } from "../../utils/hash.js";
import { G, MUT, TXT, CARD, BR } from "../../lib/constants.js";

const BF_KEY = "k92_bf";
const BF_MAX = 5;
const BF_LOCK_MS = 15 * 60 * 1000;

export default function AdminLoginView({ onLogin, loginAsync, storedAdminHash, shake, setShake, err, setErr }) {
  const [pw, setPw] = useState("");

  const getBfState = () => {
    try {
      return JSON.parse(localStorage.getItem(BF_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const saveBfState = (s) => {
    try {
      localStorage.setItem(BF_KEY, JSON.stringify(s));
    } catch {}
  };

  const [lockUntil, setLockUntil] = useState(() => {
    const s = getBfState();
    return s.lockUntil || 0;
  });

  const [failCount, setFailCount] = useState(() => {
    const s = getBfState();
    if (s.lockUntil && Date.now() > s.lockUntil) return 0;
    return s.fails || 0;
  });

  const isLocked = () => Date.now() < lockUntil;
  const lockRemainMin = () => Math.ceil((lockUntil - Date.now()) / 60000);

  const checkAdmin = async () => {
    if (isLocked()) {
      setErr(true);
      setShake(true);
      setTimeout(() => {
        setErr(false);
        setShake(false);
      }, 2000);
      return;
    }

    const inputHash = await sha256(pw);
    if (inputHash === storedAdminHash) {
      saveBfState({ fails: 0, lockUntil: 0 });
      setFailCount(0);
      setLockUntil(0);

      try {
        // Call useAdminAuth login mutation
        const result = await loginAsync({ username: "admin", password: pw });
        const token = result?.token || localStorage.getItem("admin_token");
        onLogin(token);
      } catch (fbErr) {
        console.error("[92K] Login auth error:", fbErr.message);
        alert("Đăng nhập thất bại.\n\nChi tiết: " + fbErr.message);
        setErr(true);
        setShake(true);
        setTimeout(() => {
          setErr(false);
          setShake(false);
        }, 2000);
      }
    } else {
      const newFails = failCount + 1;
      if (newFails >= BF_MAX) {
        const until = Date.now() + BF_LOCK_MS;
        saveBfState({ fails: newFails, lockUntil: until });
        setFailCount(newFails);
        setLockUntil(until);
      } else {
        saveBfState({ fails: newFails, lockUntil: 0 });
        setFailCount(newFails);
      }
      setErr(true);
      setShake(true);
      setTimeout(() => {
        setErr(false);
        setShake(false);
      }, 2000);
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      {/* Lock icon with glow */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, filter: "drop-shadow(0 0 18px rgba(201,168,76,0.25))", marginBottom: 10 }}>🔐</div>
        <h3
          style={{
            color: TXT,
            fontWeight: 700,
            marginBottom: 4,
            fontFamily: "Georgia,serif",
            fontSize: 19,
            letterSpacing: 0.5,
            margin: "0 0 6px",
          }}
        >
          Quản trị viên
        </h3>
        <p style={{ color: MUT, fontSize: 12, marginBottom: 24, letterSpacing: 0.3, fontFamily: "system-ui,sans-serif", margin: "0 0 24px" }}>
          Nhập mật khẩu để truy cập dashboard
        </p>
      </div>

      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isLocked() && checkAdmin()}
        placeholder="••••••••"
        disabled={isLocked()}
        style={{
          width: "100%",
          padding: "14px 18px",
          background: isLocked() ? "#f3f4f6" : CARD,
          border: `1.5px solid ${err ? "#ef4444" : BR}`,
          borderRadius: 16,
          color: TXT,
          fontSize: 18,
          outline: "none",
          boxSizing: "border-box",
          marginBottom: 8,
          fontFamily: "monospace",
          letterSpacing: 4,
          textAlign: "center",
          transition: "border .2s",
          boxShadow: err ? "0 0 20px rgba(239,68,68,0.12)" : "none",
          opacity: isLocked() ? 0.5 : 1,
        }}
      />

      {isLocked() ? (
        <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>
          🔒 Quá nhiều lần sai. Thử lại sau <strong>{lockRemainMin()}</strong> phút.
        </p>
      ) : err ? (
        <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>
          ❌ Sai mật khẩu ({BF_MAX - failCount} lần thử còn lại).
        </p>
      ) : null}

      <button
        onClick={checkAdmin}
        disabled={isLocked()}
        style={{
          width: "100%",
          padding: "14px 0",
          background: isLocked() ? "#9ca3af" : `linear-gradient(135deg, ${G}, #b8923e)`,
          color: "#FFF",
          border: "none",
          borderRadius: 16,
          cursor: isLocked() ? "not-allowed" : "pointer",
          fontWeight: 800,
          fontSize: 14,
          fontFamily: "system-ui,sans-serif",
          marginTop: 4,
          boxShadow: isLocked() ? "none" : `0 4px 24px ${G}44`,
          letterSpacing: 0.5,
          transition: "opacity .2s",
        }}
        onMouseEnter={(e) => {
          if (!isLocked()) e.currentTarget.style.opacity = "0.88";
        }}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Đăng nhập
      </button>
    </div>
  );
}
