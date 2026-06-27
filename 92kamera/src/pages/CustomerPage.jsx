import React, { useState, useCallback, useEffect } from "react";
import ConfirmDialog from "../components/common/ConfirmDialog.jsx";
import FeedbackModal from "../components/common/FeedbackModal.jsx";
import { useMobile } from "../hooks/useMobile.js";
import { G, MUT, BR } from "../lib/constants.js";
import { useOrders } from "../hooks/useOrders.js";
import { useFeedbacks } from "../hooks/useAppData.js";

// Import Panels
import DashboardPanel from "../components/customer/DashboardPanel.jsx";
import CustomerOrdersPanel from "../components/customer/CustomerOrdersPanel.jsx";
import CustomerFeedbacksPanel from "../components/customer/CustomerFeedbacksPanel.jsx";
import CustomerBadgesPanel from "../components/customer/CustomerBadgesPanel.jsx";
import CustomerSettingsPanel from "../components/customer/CustomerSettingsPanel.jsx";

export default function CustomerPage({ loggedUser, setLoggedUser, onBack, onOpenBooking }) {
  const [tab, setTab] = useState("dashboard");
  const [fbOrder, setFbOrder] = useState(null);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMobile();

  // React Query queries
  const { data: orders = [], refetch: refetchOrders, isLoading: isLoadingOrders, isRefetching } = useOrders();
  const { data: feedbacks = [], isLoading: isLoadingFeedbacks } = useFeedbacks();

  const isInitialLoading = isLoadingOrders || isLoadingFeedbacks;

  const handleRefreshOrders = useCallback(async () => {
    await refetchOrders();
  }, [refetchOrders]);

  useEffect(() => {
    if (tab !== "orders") return;
    handleRefreshOrders();
    const t = setInterval(handleRefreshOrders, 30000);
    return () => clearInterval(t);
  }, [tab, handleRefreshOrders]);

  // Compute profile and statistics metrics
  const normPhone = (p) => (p || "").replace(/[^0-9]/g, "");
  const myPhone = normPhone(loggedUser?.phone);
  const myEmail = (loggedUser?.email || "").toLowerCase();

  const myOrders = loggedUser
    ? orders.filter((o) => {
        if (myEmail && o.userEmail?.toLowerCase() === myEmail) return true;
        if (myPhone && (normPhone(o.phone) === myPhone || normPhone(o.userPhone) === myPhone)) return true;
        return false;
      })
    : [];

  const myFeedbacks = loggedUser
    ? feedbacks.filter((f) => {
        if (myEmail && f.email === myEmail) return true;
        if (myPhone && normPhone(f.phone) === myPhone) return true;
        return false;
      })
    : [];

  const completedOrders = myOrders.filter((o) => o.status === "completed");
  const validOrders = myOrders.filter((o) => o.status !== "cancelled");
  const totalSpent = validOrders.reduce((s, o) => s + o.total, 0);
  const totalDays = validOrders.reduce((s, o) => s + (o.days || 0), 0);
  const usedCameras = [...new Set(validOrders.map((o) => o.cameraName))];

  // Badges array for profile banner
  const badges = [];
  if (validOrders.length >= 1) badges.push({ icon: "🥉", label: "Khách Đồng", col: "#cd7f32" });
  if (validOrders.length >= 3) badges.push({ icon: "🥈", label: "Khách Bạc", col: "#aaa" });
  if (validOrders.length >= 5) badges.push({ icon: "🥇", label: "Khách Vàng", col: G });
  if (totalDays >= 30) badges.push({ icon: "👑", label: "Đại Gia Khoảnh Khắc", col: G });

  const TABS = [
    ["dashboard", "⊞", "Dashboard"],
    ["orders", "≡", "Đơn thuê"],
    ["feedbacks", "☆", "Feedback"],
    ["badges", "◎", "Huy hiệu"],
    ["settings", "✦", "Cài đặt"],
  ];
  const currentTab = TABS.find(([k]) => k === tab);

  const tabStyle = (k) => ({
    padding: "12px 18px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${tab === k ? G : "transparent"}`,
    color: tab === k ? G : MUT,
    fontWeight: tab === k ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "system-ui,sans-serif",
    transition: "all .2s",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "system-ui,sans-serif", position: "relative", zIndex: 1 }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulseIn { 0%{transform:scale(0.7);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes cMenuIn { 0%{opacity:0;transform:translateY(-8px) scale(0.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes lookupSlideIn { 0%{opacity:0;transform:scale(0.88) translateY(24px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      {/* Header */}
      {isMobile ? (
        <>
          <div style={{ position: "fixed", top: 10, left: 12, zIndex: 200 }}>
            <button
              onPointerDown={(e) => { e.preventDefault(); setMobileMenuOpen((o) => !o); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: mobileMenuOpen ? `linear-gradient(135deg,${G}22,${G}11)` : "rgba(255,255,255,0.13)",
                border: `1.5px solid ${mobileMenuOpen ? G + "88" : "rgba(255,255,255,0.60)"}`,
                borderRadius: 50,
                padding: "8px 14px 8px 10px",
                backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
                boxShadow: mobileMenuOpen
                  ? `0 0 0 3px ${G}22, 0 8px 32px rgba(0,0,0,0.3)`
                  : "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
                cursor: "pointer",
                transition: "all .22s",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>{currentTab?.[1]}</span>
              <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>
                {currentTab?.[2]}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ marginLeft: 2, transition: "transform .22s", transform: mobileMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M2 3.5L5 6.5L8 3.5" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {mobileMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  background: "linear-gradient(160deg, rgba(232,240,248,0.97) 0%, rgba(197,216,236,0.94) 60%, rgba(181,206,230,0.92) 100%)",
                  border: "1.5px solid rgba(255,255,255,0.88)",
                  borderRadius: 22,
                  backdropFilter: "blur(40px) saturate(160%) brightness(1.04)",
                  WebkitBackdropFilter: "blur(40px) saturate(160%) brightness(1.04)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 32px rgba(13,27,42,0.18), 0 0 0 1px rgba(255,255,255,0.28)",
                  minWidth: 190,
                  padding: "8px 0",
                  animation: "cMenuIn .22s cubic-bezier(.4,0,.2,1)",
                  zIndex: 201,
                }}
              >
                {TABS.map(([k, ico, label]) => (
                  <button
                    key={k}
                    onPointerDown={(e) => { e.preventDefault(); setTab(k); setMobileMenuOpen(false); }}
                    style={{
                      width: "100%",
                      background: tab === k ? "rgba(13,27,42,0.06)" : "none",
                      border: "none",
                      borderBottom: "1px solid rgba(13,27,42,0.10)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 18px",
                      cursor: "pointer",
                      borderLeft: `3px solid ${tab === k ? G : "transparent"}`,
                      transition: "all .15s",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{ico}</span>
                    <span style={{ color: tab === k ? G : MUT, fontSize: 13, fontWeight: tab === k ? 700 : 400, fontFamily: "system-ui,sans-serif" }}>
                      {label}
                    </span>
                    {tab === k && (
                      <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 8px ${G}66` }} />
                    )}
                  </button>
                ))}
                <div style={{ height: 1, background: "rgba(13,27,42,0.10)", margin: "6px 14px" }} />
                <button
                  onPointerDown={(e) => { e.preventDefault(); onBack(); }}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 18px",
                    cursor: "pointer",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span style={{ fontSize: 14, width: 20, textAlign: "center", color: MUT }}>←</span>
                  <span style={{ color: G, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500 }}>Trang chủ</span>
                </button>
              </div>
            )}
            {mobileMenuOpen && (
              <div onPointerDown={(e) => { e.preventDefault(); setMobileMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: -1 }} />
            )}
          </div>

          <button
            onPointerDown={(e) => { e.preventDefault(); onBack(); }}
            style={{
              position: "fixed",
              top: 10,
              right: 12,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.13)",
              border: "1.5px solid rgba(255,255,255,0.65)",
              borderRadius: 50,
              padding: "8px 14px",
              backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
              boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.80) inset",
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ color: MUT, fontSize: 13, lineHeight: 1 }}>←</span>
            <span style={{ color: G, fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif", letterSpacing: 0.3 }}>Trang chủ</span>
          </button>
        </>
      ) : (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(255,255,255,0.22)",
            backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            borderBottom: `1.5px solid rgba(255,255,255,0.72)`,
            boxShadow: "0 1px 0 rgba(255,255,255,0.90) inset, 0 4px 24px rgba(13,27,42,0.10)",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {TABS.map(([k, ico, label]) => (
              <button key={k} onClick={() => setTab(k)} style={tabStyle(k)}>
                <span style={{ fontSize: 14, opacity: tab === k ? 1 : 0.6, marginRight: 7 }}>{ico}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: `1.5px solid rgba(255,255,255,0.65)`,
              color: MUT,
              padding: "8px 16px",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 12,
              flexShrink: 0,
              marginLeft: 20,
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: 0.2,
              boxShadow: "0 1px 0 rgba(255,255,255,0.80) inset",
            }}
          >
            ← Trang chủ
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "64px 16px 32px" : "32px 24px" }}>
        {/* Profile banner */}
        <div
          style={{
            background: "rgba(255,255,255,0.13)",
            border: `1px solid rgba(255,255,255,0.22)`,
            borderRadius: 28,
            padding: "28px 20px 24px",
            marginBottom: 20,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            backdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.04)",
            boxShadow: "0 2px 40px rgba(5,17,31,0.10), 0 1px 0 rgba(255,255,255,0.30) inset",
          }}
        >
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: `radial-gradient(circle, ${G}0b 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${G}22, rgba(255,255,255,0.10))`,
                border: `2.5px solid ${G}77`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                overflow: "hidden",
                boxShadow: `0 0 0 5px ${G}14, 0 0 28px ${G}1a`,
              }}
            >
              {loggedUser?.avatar || loggedUser?.picture ? (
                <img src={loggedUser.avatar || loggedUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: G, fontWeight: 800, fontSize: 34, fontFamily: "system-ui,sans-serif" }}>
                  {loggedUser?.name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
          </div>

          <div style={{ color: G, fontWeight: 800, fontSize: 22, fontFamily: "system-ui,sans-serif", marginBottom: 5, letterSpacing: 0.2 }}>
            {loggedUser?.displayName || loggedUser?.name}
          </div>
          <div
            style={{
              color: MUT,
              fontSize: 12.5,
              fontFamily: "system-ui,sans-serif",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 12 }}>✉</span>
            <span>{loggedUser?.email || loggedUser?.phone}</span>
          </div>

          {badges.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
              {badges.slice(-2).map((b, i, arr) => {
                const isActive = i === arr.length - 1;
                return (
                  <span
                    key={b.label}
                    style={{
                      background: isActive ? b.col + "1a" : "transparent",
                      color: isActive ? b.col : "#4A4A4A",
                      border: `1px solid ${isActive ? b.col + "55" : BR}`,
                      borderRadius: 99,
                      padding: "5px 13px",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "system-ui,sans-serif",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          <button
            onClick={() => { setLoggedUser(null); onBack(); }}
            style={{
              padding: "11px 28px",
              background: `linear-gradient(135deg,${G}22,${G}0d)`,
              border: `1px solid ${G}55`,
              color: G,
              borderRadius: 16,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "system-ui,sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              transition: "all .2s",
            }}
          >
            <span>⇥</span>
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Tab panels */}
        {isInitialLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 14 }}>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(201,168,76,0.18)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ color: MUT, fontSize: 13, fontFamily: "system-ui,sans-serif" }}>Đang tải thông tin tài khoản...</div>
          </div>
        ) : (
          <>
            {tab === "dashboard" && (
              <DashboardPanel
                myOrders={myOrders}
                completedOrders={completedOrders}
                feedbacks={feedbacks}
                totalSpent={totalSpent}
                totalDays={totalDays}
                usedCameras={usedCameras}
                setTab={setTab}
                setFbOrder={setFbOrder}
                onOpenBooking={onOpenBooking}
                myEmail={myEmail}
                myPhone={myPhone}
              />
            )}

            {tab === "orders" && (
              <CustomerOrdersPanel
                myOrders={myOrders}
                feedbacks={feedbacks}
                refreshing={isRefetching}
                refreshOrders={handleRefreshOrders}
                onOpenBooking={onOpenBooking}
                setFbOrder={setFbOrder}
                loggedUser={loggedUser}
                setConfirmCfg={setConfirmCfg}
                myEmail={myEmail}
                myPhone={myPhone}
              />
            )}

            {tab === "feedbacks" && (
              <CustomerFeedbacksPanel
                myFeedbacks={myFeedbacks}
                myOrders={myOrders}
                setFbOrder={setFbOrder}
              />
            )}

            {tab === "badges" && (
              <CustomerBadgesPanel myOrders={myOrders} myFeedbacks={myFeedbacks} totalSpent={totalSpent} totalDays={totalDays} />
            )}

            {tab === "settings" && <CustomerSettingsPanel loggedUser={loggedUser} setLoggedUser={setLoggedUser} />}
          </>
        )}
      </div>

      {fbOrder && (
        <FeedbackModal order={fbOrder} loggedUser={loggedUser} feedbacks={feedbacks} onClose={() => setFbOrder(null)} />
      )}

      <ConfirmDialog message={confirmCfg?.message} onOk={confirmCfg?.onOk} onCancel={() => setConfirmCfg(null)} />
    </div>
  );
}
