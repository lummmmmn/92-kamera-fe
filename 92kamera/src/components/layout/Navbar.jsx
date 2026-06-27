import { useState, useEffect, useRef } from "react";
import { G, BG } from "../../lib/constants.js";
import Logo from "../common/Logo.jsx";
import DesktopFAB from "./DesktopFAB.jsx";
import MobileFAB from "./MobileFAB.jsx";

export default function Navbar({
  isMobile,
  loggedUser,
  onOpenLogin,
  onOpenCustomer,
  onAdmin,
  siteContent,
  onBook,
  openQS,
  orders,
}) {
  const [navState, setNavState] = useState("top");
  const prevScrollY = useRef(0);
  const scrollRaf = useRef(null);

  const [logoClick, setLogoClick] = useState(0);
  const [logoRipple, setLogoRipple] = useState(false);
  const [navForceOpen, setNavForceOpen] = useState(false);

  const handleLogoClick = () => {
    const n = logoClick + 1;
    setLogoClick(n);
    if (n >= 5) {
      setLogoClick(0);
      onAdmin();
      return;
    }
    setLogoRipple(true);
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRaf.current) return;
      scrollRaf.current = requestAnimationFrame(() => {
        scrollRaf.current = null;
        const curr = window.scrollY;
        let nextState = navState;
        if (curr < 60) {
          nextState = "top";
        } else if (curr > prevScrollY.current + 8) {
          nextState = "compact";
        } else if (curr < prevScrollY.current - 8) {
          nextState = "visible";
        }
        prevScrollY.current = curr;
        setNavState((prev) => (prev === nextState ? prev : nextState));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [navState]);

  // Đóng nav khi cuộn xuống
  useEffect(() => {
    if (navState === "compact") setNavForceOpen(false);
  }, [navState]);

  const isCollapsed = !navForceOpen;

  return (
    <>
      <nav
        className="nav92"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "8px 10px" : "12px 16px",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {/* ── DESKTOP: full bar (chỉ hiện khi mở) ── */}
        {!isMobile && !isCollapsed && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 49, background: "transparent" }}
              onClick={() => setNavForceOpen(false)}
            />
            <div
              className={`nav-inner${navState !== "top" ? " scrolled" : ""}`}
              style={{
                pointerEvents: "all",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                height: 45,
                gap: 0,
                width: "100%",
                overflow: "visible",
                animation: "navExpandIn .38s cubic-bezier(.4,0,.2,1)",
                transformOrigin: "top center",
              }}
            >
              <div
                onClick={handleLogoClick}
                style={{
                  cursor: "pointer",
                  flexShrink: 0,
                  marginRight: 16,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "center",
                }}
              >
                <Logo size={0.58} />
                {logoRipple && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: 40,
                        left: 80,
                        width: "200vmax",
                        height: "200vmax",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.06) 40%, transparent 70%)`,
                        animation: "logoRipple 0.7s cubic-bezier(.2,0,.4,1) forwards",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: BG,
                        animation: "pageWash 0.7s ease forwards",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="nav-div" style={{ marginRight: 16 }} />
              {[
                ["MÁY ẢNH", "cameras"],
                ["PHỤ KIỆN", "accessories"],
                ["QUY TRÌNH", "quy-trinh"],
                ["FEEDBACK", "feedback"],
                ["VỀ CHÚNG TÔI", "about"],
              ].map(([t, id]) => (
                <button
                  key={t}
                  className="nav-link"
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{ marginRight: 20 }}
                >
                  {t}
                </button>
              ))}
              <div className="nav-div" />
              <div style={{ flex: 1 }} />
              <div className="nav-div" style={{ marginRight: 16 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {loggedUser ? (
                  <button
                    onClick={
                      loggedUser.role === "admin"
                        ? () => (window.location.hash = "#/admin")
                        : onOpenCustomer || onOpenLogin
                    }
                    style={{
                      color: loggedUser.role === "admin" ? "#1f5fbf" : G,
                      fontSize: 11,
                      background: loggedUser.role === "admin" ? "rgba(31,95,191,0.12)" : "rgba(244,251,253,0.70)",
                      border: `1px solid ${loggedUser.role === "admin" ? "rgba(31,95,191,0.28)" : "rgba(13,27,42,0.16)"}`,
                      padding: "4px 12px 4px 4px",
                      borderRadius: 99,
                      cursor: "pointer",
                      letterSpacing: 1,
                      fontFamily: "system-ui,sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      boxShadow: loggedUser.role === "admin" ? "0 8px 20px rgba(31,95,191,0.14)" : "0 8px 22px rgba(13,27,42,0.12)",
                      flexShrink: 0,
                      transition: "transform .2s ease, background .2s ease, box-shadow .2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: loggedUser.role === "admin" ? "rgba(58,123,253,0.2)" : G + "33",
                        border: `1px solid ${loggedUser.role === "admin" ? "rgba(58,123,253,0.45)" : G + "55"}`,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {loggedUser.role === "admin" ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(58,123,253,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      ) : loggedUser.avatar ? (
                        <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: G }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                    <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {loggedUser.displayName || loggedUser.name}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenLogin}
                    style={{
                      color: G,
                      fontSize: 10,
                      background: "rgba(244,251,253,0.70)",
                      border: "1px solid rgba(13,27,42,0.16)",
                      padding: "8px 18px 8px 13px",
                      borderRadius: 99,
                      cursor: "pointer",
                      letterSpacing: 2,
                      transition: "all .2s",
                      fontFamily: "system-ui,sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      fontWeight: 750,
                      boxShadow: "0 8px 22px rgba(13,27,42,0.12), inset 0 1px 0 rgba(255,255,255,0.70)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.borderColor = "rgba(13,27,42,0.28)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.86)";
                      e.currentTarget.style.color = G;
                      e.currentTarget.style.boxShadow = "0 12px 28px rgba(13,27,42,0.16), inset 0 1px 0 rgba(255,255,255,0.80)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "rgba(13,27,42,0.16)";
                      e.currentTarget.style.background = "rgba(244,251,253,0.70)";
                      e.currentTarget.style.color = G;
                      e.currentTarget.style.boxShadow = "0 8px 22px rgba(13,27,42,0.12), inset 0 1px 0 rgba(255,255,255,0.70)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    ĐĂNG NHẬP
                  </button>
                )}
                <div className="btn-3d-wrap" style={{ borderRadius: 16, flexShrink: 0 }}>
                  <button
                    className="btn-3d"
                    onClick={openQS}
                    style={{
                      fontSize: 11,
                      padding: "10px 22px",
                      letterSpacing: 3,
                      whiteSpace: "nowrap",
                      background: "linear-gradient(135deg, #0D1B2A 0%, #17324B 100%)",
                      color: "#f4fbff",
                      border: "1px solid rgba(255,255,255,0.28)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 10px 24px rgba(13,27,42,0.24)",
                    }}
                  >
                    THUÊ NGAY
                  </button>
                </div>
                <button
                  onClick={() => setNavForceOpen(false)}
                  style={{
                    marginLeft: 12,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(13,27,42,0.06)",
                    border: "1px solid rgba(13,27,42,0.12)",
                    color: "rgba(13,27,42,0.6)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(13,27,42,0.12)";
                    e.currentTarget.style.color = "rgba(13,27,42,0.85)";
                    e.currentTarget.style.transform = "rotate(90deg) scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(13,27,42,0.06)";
                    e.currentTarget.style.color = "rgba(13,27,42,0.6)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* ── DESKTOP FAB — luôn render, ẩn/hiện bằng CSS để không bị unmount ── */}
      {!isMobile && (
        <>
          {isCollapsed && loggedUser && (
            <div
              onClick={
                loggedUser.role === "admin"
                  ? () => (window.location.hash = "#/admin")
                  : onOpenCustomer || onOpenLogin
              }
              style={{
                position: "fixed",
                top: 23,
                right: 76,
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: loggedUser.role === "admin" ? "rgba(58,123,253,0.12)" : "rgba(255, 255, 255, 0.45)",
                border: loggedUser.role === "admin" ? "1px solid rgba(58,123,253,0.35)" : "1px solid rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "4px 12px 4px 6px",
                borderRadius: 99,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(13,27,42,0.12)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: "all",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.background = loggedUser.role === "admin" ? "rgba(58,123,253,0.20)" : "rgba(255, 255, 255, 0.65)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(13,27,42,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.background = loggedUser.role === "admin" ? "rgba(58,123,253,0.12)" : "rgba(255, 255, 255, 0.45)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,27,42,0.12)";
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: loggedUser.role === "admin" ? "rgba(58,123,253,0.2)" : "rgba(13, 27, 42, 0.15)",
                  border: loggedUser.role === "admin" ? "1px solid rgba(58,123,253,0.45)" : "1px solid rgba(13, 27, 42, 0.2)",
                  flexShrink: 0,
                }}
              >
                {loggedUser.role === "admin" ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(58,123,253,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ) : loggedUser.avatar ? (
                  <img src={loggedUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d1b2a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: loggedUser.role === "admin" ? "#3a7bfd" : "#0d1b2a",
                  fontFamily: "system-ui, sans-serif",
                  letterSpacing: 0.5,
                  maxWidth: 90,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {loggedUser.displayName || loggedUser.name}
              </span>
            </div>
          )}
          <DesktopFAB onOpen={() => setNavForceOpen(true)} visible={isCollapsed} />
        </>
      )}

      {/* ── MOBILE FAB MENU ── */}
      {isMobile && (
        <MobileFAB
          siteContent={siteContent}
          onBook={onBook}
          loggedUser={loggedUser}
          onOpenLogin={onOpenLogin}
          onOpenCustomer={onOpenCustomer}
          orders={orders}
        />
      )}
    </>
  );
}
