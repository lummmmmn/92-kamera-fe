import { useState, useEffect, useRef } from "react";
import Logo from "../common/Logo.jsx";
import CustomerLoginView from "./CustomerLoginView.jsx";
import AdminLoginView from "./AdminLoginView.jsx";
import { useAdminAuth } from "../../hooks/useAdminAuth.js";
import { G, MUT, TXT, BG, CARD, BR, ADMIN_PW_DEFAULT_HASH } from "../../lib/constants.js";
import { getOrders, googleLogin } from "../../api/index.js";
import { todayStr } from "../../utils/format.js";

const GOOGLE_CLIENT_ID = "338403275162-fa55lm8g53eu1h6ursqpd714ce1qre8m.apps.googleusercontent.com";
let _gsiInitialized = false;

function decodeGoogleJWT(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { googleId: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture };
  } catch {
    return null;
  }
}

export default function AdminLogin({
  onLogin,
  onBack,
  orders = [],
  defaultTab = "customer",
  loggedUser,
  setLoggedUser,
  setPage,
  usersMap,
  setUsersMap,
  siteContent,
  setOrders,
}) {
  const [tab, setTab] = useState(defaultTab);
  const { loginAsync } = useAdminAuth();

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isInAppBrowser = /FBAN|FBAV|FBIOS|FB_IAB|Instagram|Line|Zalo|TikTok|Bytedance|Twitter/i.test(ua);
  const openInExternalBrowser = () => {
    const url = window.location.href;
    if (/Android/i.test(ua)) {
      const clean = url.replace(/^https?:\/\//, "");
      window.location.href = `intent://${clean}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Sync orders when component mounts
  useEffect(() => {
    if (!setOrders) return;
    let cancelled = false;
    const fetchFresh = async () => {
      try {
        const fresh = await getOrders();
        if (cancelled || !fresh || !Array.isArray(fresh)) return;
        setOrders((prev) => {
          const freshIds = new Set(fresh.map((o) => o.id));
          const localOnly = prev.filter((o) => !freshIds.has(o.id));
          return [...localOnly, ...fresh];
        }, { skipStorage: true });
      } catch {}
    };
    fetchFresh();
    const poll = setInterval(fetchFresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [setOrders]);

  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const [storedAdminHash, setStoredAdminHash] = useState(ADMIN_PW_DEFAULT_HASH);

  useEffect(() => {
    const hash = localStorage.getItem("k92_admin_pw_hash") || ADMIN_PW_DEFAULT_HASH;
    setStoredAdminHash(hash);
  }, []);

  // Google GSI script load
  const googleBtnRef = useRef();
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiErr, setGsiErr] = useState(false);
  const usersMapRef = useRef(usersMap);

  useEffect(() => {
    usersMapRef.current = usersMap;
  }, [usersMap]);

  useEffect(() => {
    if (loggedUser) return;
    if (isInAppBrowser) {
      setGsiErr(false);
      return;
    }
    if (window.google?.accounts?.id) {
      setGsiReady(true);
      return;
    }
    const existing = document.getElementById("gsi-script-92k");
    if (existing) {
      const handler = () => setGsiReady(true);
      existing.addEventListener("load", handler);
      return () => existing.removeEventListener("load", handler);
    }
    const script = document.createElement("script");
    script.id = "gsi-script-92k";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    script.onerror = () => setGsiErr(true);
    document.head.appendChild(script);
  }, [loggedUser, isInAppBrowser]);

  // Google Button render
  useEffect(() => {
    if (isInAppBrowser) return;
    if (!gsiReady || loggedUser || !googleBtnRef.current) return;
    try {
      if (!_gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (res) => {
            const info = decodeGoogleJWT(res.credential);
            if (!info) {
              setGsiErr(true);
              return;
            }
            try {
              window.google.accounts.id.disableAutoSelect();
            } catch {}

            try {
              // Call Backend Google Auth API
              const loginResult = await googleLogin(res.credential);
              const backendUser = loginResult.user || {};
              const backendToken = loginResult.token;

              const currentMap = usersMapRef.current || {};
              const savedProfile = currentMap[info.email] || {};
              
              const user = {
                name: backendUser.name || info.name,
                displayName: savedProfile.displayName || backendUser.name || info.name,
                email: backendUser.email || info.email,
                picture: backendUser.avatar || info.picture,
                googleId: backendUser.googleId || info.googleId,
                avatar: backendUser.avatar || savedProfile.avatar || null,
                phone: backendUser.phone || savedProfile.phone || "",
                zalo: savedProfile.zalo || backendUser.zalo || savedProfile.zalo || "",
                address: backendUser.address || savedProfile.address || "",
                token: backendToken,
              };

              setLoggedUser(user);

              if (setUsersMap) {
                setUsersMap((prev) => {
                  const latest = prev || {};
                  const existingUser = latest[info.email] || {};
                  const updated = {
                    ...latest,
                    [info.email]: {
                      ...existingUser,
                      name: user.name,
                      picture: user.picture,
                      googleId: user.googleId,
                      joinDate: existingUser.joinDate || todayStr(),
                    },
                  };
                  localStorage.setItem("k92_users_v1", JSON.stringify(updated));
                  return updated;
                });
              }
            } catch (e) {
              console.error("[92K] Google login API error:", e);
              setGsiErr(true);
            }
          },
          use_fedcm_for_prompt: false,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        _gsiInitialized = true;
      }
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width: Math.min(320, window.innerWidth - 100),
        text: "signin_with",
        logo_alignment: "left",
      });
    } catch (e) {
      setGsiErr(true);
    }
  }, [gsiReady, loggedUser, isInAppBrowser, setLoggedUser, setUsersMap]);

  // Order sorting/filtering for user profile
  const _myEmail = (loggedUser?.email || "").toLowerCase();
  const _normP = (p) => (p || "").replace(/[^0-9]/g, "");
  const _myPh = _normP(loggedUser?.phone);
  const myOrders = loggedUser
    ? orders.filter((o) => {
        if (_myEmail && o.userEmail?.toLowerCase() === _myEmail) return true;
        if (_myPh && (_normP(o.phone) === _myPh || _normP(o.userPhone) === _myPh)) return true;
        return false;
      })
    : [];
  const totalSpent = myOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const completedOrders = myOrders.filter((o) => o.status === "completed");

  // Injected CSS Keyframes
  useEffect(() => {
    const id = "login-keyframes-92k";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes loginFadeIn {
        from { opacity: 0; transform: translateY(18px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
      @keyframes loginGlow {
        0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(139,180,220,0.18); }
        50%       { box-shadow: 0 1px 0 rgba(255,255,255,0.90) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 20px 56px rgba(0,0,0,0.34), 0 0 0 1px rgba(139,180,220,0.30); }
      }
      @keyframes camFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-6px); }
      }
      .login-card-92k { animation: loginFadeIn .45s cubic-bezier(0.22,1,0.36,1) both, loginGlow 4s ease-in-out 1s infinite; }
      .cam-float-92k  { animation: camFloat 3.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const tabBtn = (k, icon, label) => (
    <button
      onClick={() => setTab(k)}
      style={{
        flex: 1,
        padding: "13px 0",
        background: "none",
        border: "none",
        borderBottom: `2px solid ${tab === k ? G : "transparent"}`,
        color: tab === k ? G : MUT,
        fontWeight: tab === k ? 700 : 400,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "system-ui,sans-serif",
        transition: "all .25s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ letterSpacing: 0.3 }}>{label}</span>
    </button>
  );

  const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.5 29.6 1.5 24 1.5 14.9 1.5 7.2 7 3.7 14.8l7 5.4C12.4 14 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.3-4 6.8-10 6.8-17z" />
      <path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7-5.4C1.8 17.2 1 20.5 1 24c0 3.5.8 6.8 2.2 9.7l7.5-5.1z" />
      <path fill="#34A853" d="M24 46.5c5.4 0 10-1.8 13.3-4.8l-7.5-5.8c-1.8 1.2-4.1 1.9-6.8 1.9-6.3 0-11.6-4.3-13.5-10.1l-7.5 5.1C7.2 41 15 46.5 24 46.5z" />
    </svg>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background:
          "radial-gradient(ellipse 130% 85% at 50% 22%, #5fccdd 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 15% 55%, rgba(77,193,213,0.7) 0%, transparent 60%), linear-gradient(180deg, #8fc8d4 0%, #a9b8bc 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(236,243,248,0.58) 0%, transparent 40%, rgba(220,235,244,0.27) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(186,206,220,0.30) 0%, transparent 50%)", pointerEvents: "none" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-login">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="5" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-login)" />
      </svg>

      <div
        className="login-card-92k"
        style={{
          background: "linear-gradient(160deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 60%, rgba(181,206,230,0.76) 100%)",
          border: "1px solid rgba(255,255,255,0.60)",
          borderRadius: 28,
          padding: "32px 36px 36px",
          width: "min(520px,93vw)",
          textAlign: "center",
          transform: shake ? "translateX(-6px)" : undefined,
          transition: "transform .1s",
          maxHeight: "92vh",
          overflowY: "auto",
          position: "relative",
          scrollbarWidth: "none",
          backdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
          WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.30), 0 2px 16px rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ position: "absolute", top: 14, left: 14, width: 18, height: 18, borderTop: `1.5px solid ${G}55`, borderLeft: `1.5px solid ${G}55`, borderRadius: "2px 0 0 0" }} />
        <div style={{ position: "absolute", top: 14, right: 14, width: 18, height: 18, borderTop: `1.5px solid ${G}55`, borderRight: `1.5px solid ${G}55`, borderRadius: "0 2px 0 0" }} />

        <div style={{ marginBottom: 6 }}>
          <Logo size={0.88} />
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${BR}`, margin: "20px -36px 0", padding: "0 36px" }}>
          {tabBtn("customer", "👤", "Khách hàng")}
          {tabBtn("admin", "🔐", "Quản trị")}
        </div>

        {tab === "customer" && (
          <CustomerLoginView
            loggedUser={loggedUser}
            setLoggedUser={setLoggedUser}
            myOrders={myOrders}
            totalSpent={totalSpent}
            completedOrders={completedOrders}
            setPage={setPage}
            onBack={onBack}
            isInAppBrowser={isInAppBrowser}
            openInExternalBrowser={openInExternalBrowser}
            gsiErr={gsiErr}
            gsiReady={gsiReady}
            googleBtnRef={googleBtnRef}
            GoogleIcon={GoogleIcon}
          />
        )}

        {tab === "admin" && (
          <AdminLoginView
            onLogin={onLogin}
            loginAsync={loginAsync}
            storedAdminHash={storedAdminHash}
            shake={shake}
            setShake={setShake}
            err={err}
            setErr={setErr}
          />
        )}

        <button
          onClick={onBack}
          style={{
            width: "100%",
            padding: "13px 0",
            background: "none",
            color: MUT,
            border: `1px solid ${BR}`,
            borderRadius: 16,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "system-ui,sans-serif",
            marginTop: 20,
            letterSpacing: 0.3,
            transition: "border-color .2s, color .2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = G + "55";
            e.currentTarget.style.color = G;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BR;
            e.currentTarget.style.color = MUT;
          }}
        >
          ← Về trang chủ
        </button>
      </div>
    </div>
  );
}
