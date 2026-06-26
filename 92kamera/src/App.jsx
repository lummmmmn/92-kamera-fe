import React, { useState, useEffect, useCallback } from "react";
import { useMobile } from "./hooks/useMobile.js";
import { useScrollPerfClass } from "./hooks/useScrollPerf.js";
import { BG, MUT, CAMS_INIT } from "./lib/constants.js";
import { setAuthToken, clearAuthToken } from "./lib/axios.js";

// Components
import SplashScreen from "./components/home/SplashScreen.jsx";
import HomePage from "./pages/HomePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import CustomerPage from "./pages/CustomerPage.jsx";
import BookingModal from "./components/booking/BookingModal.jsx";
import AdminLogin from "./components/admin/AdminLogin.jsx";
import LensBackground from "./components/layout/LensBackground.jsx";
import Logo from "./components/common/Logo.jsx";

// Hooks
import {
  useCameras,
  useAccessories,
  useSiteContent,
  useFeedbacks,
  useAlbums,
  usePhotos,
  useDiscounts,
  useDeliveryFees,
  useUsers,
  useUpsertUser,
} from "./hooks/useAppData.js";
import { useOrders } from "./hooks/useOrders.js";

function AppErrorBoundary({ children }) {
  return children;
}

function AppRoot() {
  const [page, setPage] = useState("home");
  const [booking, setBooking] = useState(false); // false | camId | true (QuickSelect object)
  const [loginOpen, setLoginOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const isMobile = useMobile();

  // Shared state: session loggedUser (customer OR admin)
  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      const saved = localStorage.getItem("k92_session");
      if (saved) return JSON.parse(saved);
      // Nếu có admin_token thì khởi tạo admin session
      const adminToken = localStorage.getItem("admin_token");
      if (adminToken) return { name: "Admin", role: "admin", token: adminToken };
      return null;
    } catch {
      return null;
    }
  });

  // Synchronize Axios Auth Token with loggedUser session
  useEffect(() => {
    if (loggedUser?.token) {
      setAuthToken(loggedUser.token);
    } else {
      const adminToken = localStorage.getItem("admin_token");
      if (page === "admin" && adminToken) {
        setAuthToken(adminToken);
      } else {
        clearAuthToken();
      }
    }
  }, [loggedUser, page]);

  // Scroll Performance
  useScrollPerfClass();

  // React Query data queries
  const { data: cameras = CAMS_INIT } = useCameras();
  const { data: accessories = [] } = useAccessories();
  const { data: siteContent } = useSiteContent();
  const { data: orders = [] } = useOrders();
  const { data: feedbacks = [] } = useFeedbacks();
  const { data: albums = [] } = useAlbums();
  const { data: photos = [] } = usePhotos();
  const { data: discounts = [] } = useDiscounts();
  const { data: deliveryFees = [] } = useDeliveryFees();
  const { data: usersMap = {} } = useUsers();
  const upsertUserMutation = useUpsertUser();

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash;
      if (h === "#/admin") {
        setPage("admin");
      } else if (h === "#/customer" && loggedUser) {
        setPage("customer");
      } else {
        setPage("home");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [loggedUser]);

  const handleSetLoggedUser = (u) => {
    setLoggedUser(u);
    if (u) {
      // Admin dùng admin_token riêng, không lưu vào k92_session
      if (u.role === "admin") return;
      localStorage.setItem("k92_session", JSON.stringify(u));
      const key = u.email || u.phone;
      if (key && !usersMap[key]) {
        const newUserData = u.email
          ? { name: u.name, picture: u.picture, googleId: u.googleId }
          : { name: u.name, pw: "" };
        upsertUserMutation.mutate({ [key]: newUserData });
      }
    } else {
      localStorage.removeItem("k92_session");
    }
  };

  const handleSplashDone = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (!splashDone) {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  return (
    <div className="app-shell-92" style={{ minHeight: "100vh", position: "relative" }}>
      {/* Background elements */}
      {page === "home" && <LensBackground isMob={isMobile} />}

      {/* Pages Router */}
      {page === "home" && (
        <HomePage
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          orders={orders}
          onBook={(cam) => {
            if (cam && typeof cam === "object" && cam.preselectedCams) {
              setBooking(cam);
            } else {
              setBooking(cam?.id ?? true);
            }
          }}
          onAdmin={() => {
            window.location.hash = "#/admin";
          }}
          isMobile={isMobile}
          photos={photos}
          albums={albums}
          feedbacks={feedbacks}
          loggedUser={loggedUser}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenCustomer={() => {
            if (loggedUser) window.location.hash = "#/customer";
            else setLoginOpen(true);
          }}
        />
      )}

      {page === "customer" && loggedUser && (
        <CustomerPage
          loggedUser={loggedUser}
          setLoggedUser={handleSetLoggedUser}
          onBack={() => {
            window.location.hash = "#/";
          }}
          onOpenBooking={() => {
            window.location.hash = "#/";
            setBooking(true);
          }}
        />
      )}

      {page === "admin" && (
        <AdminPage
          onBack={() => {
            window.location.hash = "#/";
          }}
          isMobile={isMobile}
          loggedUser={loggedUser}
          setLoggedUser={handleSetLoggedUser}
          setPage={(p) => {
            if (p === "customer") window.location.hash = "#/customer";
            else if (p === "home") window.location.hash = "#/";
          }}
        />
      )}

      {/* Overlay Modal for Customer/Admin Login */}
      {loginOpen && (
        <AdminLogin
          onLogin={(adminToken) => {
            const token = adminToken || localStorage.getItem("admin_token");
            const adminUser = { name: "Admin", role: "admin", token };
            setLoggedUser(adminUser);
            setLoginOpen(false);
            window.location.hash = "#/admin";
          }}
          onBack={() => setLoginOpen(false)}
          orders={orders}
          loggedUser={loggedUser}
          setLoggedUser={handleSetLoggedUser}
          photos={photos}
          cameras={cameras}
          defaultTab="customer"
          setPage={(p) => {
            if (p === "customer") window.location.hash = "#/customer";
            else if (p === "home") window.location.hash = "#/";
          }}
          usersMap={usersMap}
          setUsersMap={(updater) => {
            const nextUsers = typeof updater === "function" ? updater(usersMap) : updater;
            upsertUserMutation.mutate(nextUsers);
          }}
          siteContent={siteContent}
          setOrders={() => {}}
        />
      )}

      {/* Booking Overlay Modal */}
      {booking && (
        <BookingModal
          cameras={cameras}
          accessories={accessories}
          siteContent={siteContent}
          discounts={discounts}
          deliveryFees={deliveryFees}
          onClose={() => setBooking(false)}
          onSubmit={() => {}}
          loggedUser={loggedUser}
          preselectedCamId={typeof booking === "number" ? booking : null}
          preselectedCams={booking && typeof booking === "object" && booking.preselectedCams ? booking.preselectedCams : null}
          preselectedAccs={booking && typeof booking === "object" && booking.preselectedAccs ? booking.preselectedAccs : null}
          preselectedDate={booking && typeof booking === "object" ? booking.date : null}
          preselectedDays={booking && typeof booking === "object" ? booking.days : null}
          noDate={booking && typeof booking === "object" ? !!booking.noDate : false}
          orders={orders}
          isMobile={isMobile}
        />
      )}

      {/* Styles Injection */}
      <style>{`
        input, select, textarea { font-size: 16px !important; }
        :root {
          --navy-92: #0D1B2A;
          --navy-soft-92: #17324b;
          --sky-92: #8fc8d4;
          --sky-soft-92: #d8eef4;
          --line-92: rgba(13,27,42,0.14);
        }
        html {
          scroll-behavior: smooth;
          width: 100%;
          overflow-x: hidden;
        }
        body, #root {
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }
        @media (min-width: 1024px) {
          .app-shell-92 {
            zoom: 1.12;
          }
        }
        .home-section {
          content-visibility: auto;
          contain-intrinsic-size: 1px 720px;
        }
        .nav92, .nav-inner, .btn-3d, .btn-hero-wrap {
          will-change: transform;
        }
        .nav-inner {
          max-width: min(1180px, calc(100vw - 32px));
          margin: 0 auto;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(247,252,253,0.88) 0%, rgba(216,238,244,0.72) 100%);
          border: 1px solid rgba(255,255,255,0.64);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.88) inset,
            0 18px 48px rgba(13,27,42,0.13),
            0 4px 18px rgba(13,27,42,0.08);
          backdrop-filter: blur(28px) saturate(170%);
          -webkit-backdrop-filter: blur(28px) saturate(170%);
        }
        .nav-inner.scrolled {
          background:
            linear-gradient(180deg, rgba(239,249,251,0.94) 0%, rgba(202,229,237,0.82) 100%);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.90) inset,
            0 14px 38px rgba(13,27,42,0.16);
        }
        .nav-div {
          width: 1px;
          height: 22px;
          flex: 0 0 1px;
          background: linear-gradient(to bottom, transparent, rgba(13,27,42,0.20), transparent);
        }
        .nav-link {
          appearance: none;
          border: 0;
          background: transparent;
          color: rgba(13,27,42,0.68);
          border-radius: 11px;
          padding: 8px 11px;
          font-family: var(--font-ui), system-ui, sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
          line-height: 1;
          cursor: pointer;
          position: relative;
          transition: color .22s ease, background .22s ease, transform .22s ease;
        }
        .nav-link::after {
          content: "";
          position: absolute;
          left: 11px;
          right: 11px;
          bottom: 4px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(13,27,42,0.55), transparent);
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .22s ease;
        }
        .nav-link:hover {
          color: var(--navy-92);
          background: rgba(13,27,42,0.07);
          transform: translateY(-1px);
        }
        .nav-link:hover::after {
          transform: scaleX(1);
        }
        .footer-link-92 {
          transition: color .22s ease, background .22s ease, border-color .22s ease, transform .22s ease, box-shadow .22s ease;
        }
        .footer-link-92:hover {
          color: var(--navy-92) !important;
          background: rgba(255,255,255,0.56) !important;
          border-color: rgba(13,27,42,0.22) !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(13,27,42,0.10), inset 0 1px 0 rgba(255,255,255,0.72) !important;
        }
        .btn-3d-wrap, .btn-hero-wrap {
          display: inline-flex;
          align-items: stretch;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255,255,255,0.78), rgba(13,27,42,0.10));
          box-shadow: 0 10px 26px rgba(13,27,42,0.18);
        }
        .btn-3d {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
          font-family: var(--font-ui), system-ui, sans-serif;
          font-weight: 850;
          line-height: 1;
          cursor: pointer;
          transition: transform .22s ease, filter .22s ease, box-shadow .22s ease, background .22s ease;
        }
        .btn-3d:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .btn-3d:active {
          transform: translateY(0) scale(0.985);
        }
        .nav-link:focus-visible,
        .btn-3d:focus-visible,
        .btn-hero-wrap button:focus-visible,
        .footer-link-92:focus-visible {
          outline: 2px solid rgba(13,27,42,0.55);
          outline-offset: 3px;
        }
        @keyframes navExpandIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logoRipple {
          from { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes pageWash {
          from { opacity: 0; }
          45% { opacity: .18; }
          to { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
        @media(max-width:767px) {
          ::-webkit-scrollbar { display:none }
          html, body { overscroll-behavior-y: none; }
        }
      `}</style>
    </div>
  );
}

const FAVICON_B64 = "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s/1/9H1V11XKVXXe5WUs6VSsVistm4068rXq66biomVUp7rWhbO5XI+f2L5H2b2aH5vX6n0z5m9dffu3T+8/fVbbw0PD0ul9N64/sLOnXp77n//4//M5P/93yO7du3at29fPp9Pr16du3Llz9PT3a2tI2NjgRByXfeT3/t9s56VpjtJKf3U/uV/+ofOzg4jZGFqamKmt2t7tuvp3cRKa81pYVnKjXgRx265XLalvF4vTUxMeI5TrdaUkof27z/yH39/c+/ee/furW/9b27f/tdDh35n584n61OT42Pjly4t/vQff/XWf+7evevw4cOG46lU2rZtW7fbeZ1KJn9//LgR1XW7d+zY7/n1q5Xy1asjIyOGh9b6y9Nf9nN/tHefMZbJZAz5rWc+3dnZuX379vHxcT/vmzN5z35v29Z/yq9cuXz06NE//vGPvV5vsVh03exXb/72H+pTU1OfvPHGG598cuhfDx16av3Tnuv6Xj4IQwP55s2bN27a1L1jx5VyuVAoLNjHjZiv1pXy+FhXV5fR+0qlvFgo7P/L3/ad6evv7zdP+nntF1b12R8MD/f19XV1dbmuWywWe7v7u7u70ul0tVpVSi3Yx3Wlz+wB4N///rch/9kfevPmWze+/8Odb739m9u3P/i//L//w//1D//6V7u2b9/1299dfqJv9+49e/c++t/aPj1bLpe7du4yU6WURsnM3n6lZGyG5X/f1/u/r/e2bZv3rE61v2ffM19vf/Wb21///3t1/b49cWv3brv3r3v37v/Fw6M1tqP6f+xAAAAAElFTkSuQmCC";

function useFavicon() {
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = "data:image/png;base64," + FAVICON_B64;
    document.title = "92 KA MÊ RA";
  }, []);
}

export default function App() {
  useFavicon();
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
};
