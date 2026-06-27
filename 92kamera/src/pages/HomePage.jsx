import React, { useState } from "react";
import Navbar from "../components/layout/Navbar.jsx";
import HeroSection from "../components/home/HeroSection.jsx";
import CameraSection from "../components/home/CameraSection.jsx";
import AccessorySection from "../components/home/AccessorySection.jsx";
import ProcessSection from "../components/home/ProcessSection.jsx";
import FeedbackSection from "../components/home/FeedbackSection.jsx";
import RoadmapSection from "../components/home/RoadmapSection.jsx";
import Footer from "../components/layout/Footer.jsx";
import QuickSearchFloat from "../components/booking/QuickSearchFloat.jsx";
import OrderLookupWidget from "../components/booking/OrderLookupWidget.jsx";
import { TXT } from "../lib/constants.js";

export default function HomePage({
  cameras,
  displayCameras,
  accessories,
  siteContent,
  orders,
  onBook,
  onAdmin,
  isMobile,
  photos,
  albums,
  feedbacks,
  onLoadMoreCameras,
  hasMoreCameras,
  onLoadMoreFeedbacks,
  hasMoreFeedbacks,
  onLoadMorePhotos,
  hasMorePhotos,
  onLoadMoreAlbums,
  hasMoreAlbums,
  loggedUser,
  onOpenLogin,
  onOpenCustomer,
}) {
  const [qrHidden, setQrHidden] = useState(false);
  const [qsTrigger, setQsTrigger] = useState(0);
  const [lookupOpen, setLookupOpen] = useState(false);

  const openQS = () => setQsTrigger((p) => p + 1);

  return (
    <div style={{ position: "relative", zIndex: 1, fontFamily: "var(--font-display)", color: TXT }}>
      <div className="home-page-shell-92">
        {/* NAV */}
        <Navbar
          isMobile={isMobile}
          loggedUser={loggedUser}
          onOpenLogin={onOpenLogin}
          onOpenCustomer={onOpenCustomer}
          onAdmin={onAdmin}
          siteContent={siteContent}
          onBook={onBook}
          openQS={openQS}
          orders={orders}
        />

        {/* HERO */}
        <HeroSection
          isMobile={isMobile}
          loggedUser={loggedUser}
          onOpenLogin={onOpenLogin}
          onOpenCustomer={onOpenCustomer}
          onBook={onBook}
          openQS={openQS}
          setLookupOpen={setLookupOpen}
          siteContent={siteContent}
        />

        <div className="home-lower-shell-92">
          {/* CAMERAS */}
          <CameraSection
            id="cameras"
            cameras={displayCameras || cameras}
            onBook={onBook}
            isMobile={isMobile}
            onLoadMore={onLoadMoreCameras}
            hasMore={hasMoreCameras}
          />

          {/* ACCESSORIES */}
          <AccessorySection
            accessories={accessories}
            onBook={onBook}
            isMobile={isMobile}
          />

          {/* PROCESS */}
          <ProcessSection isMobile={isMobile} />

          {/* CUSTOMER PHOTO FEED */}
          <FeedbackSection
            photos={photos}
            albums={albums}
            feedbacks={feedbacks}
            isMobile={isMobile}
            onLoadMorePhotos={onLoadMorePhotos}
            hasMorePhotos={hasMorePhotos}
            onLoadMoreAlbums={onLoadMoreAlbums}
            hasMoreAlbums={hasMoreAlbums}
            onLoadMoreFeedbacks={onLoadMoreFeedbacks}
            hasMoreFeedbacks={hasMoreFeedbacks}
          />

          {/* ABOUT — Lộ Trình Phát Triển */}
          <RoadmapSection isMobile={isMobile} />

          {/* FOOTER */}
          <Footer isMobile={isMobile} siteContent={siteContent} />
        </div>
      </div>

      {/* Quick Search Float */}
      <QuickSearchFloat
        cameras={cameras}
        accessories={accessories}
        orders={orders}
        onBook={onBook}
        openTrigger={qsTrigger}
      />

      {/* Order Lookup Widget */}
      <OrderLookupWidget
        orders={orders}
        compact={isMobile}
        forceOpen={lookupOpen}
        onForceClose={() => setLookupOpen(false)}
      />

      {/* QR góc phải — hover để phóng to, có nút X đóng */}
      <style>{`
        .text-type { display:inline-block; white-space:pre-wrap; }
        .text-type__cursor { margin-left:0.25rem; display:inline-block; opacity:1; animation:cursorBlink 1s step-end infinite; }
        .text-type__cursor--hidden { display:none; }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity:0; width:0; padding:0; margin:0; position:absolute; }
        @media (min-width: 1024px) {
          .home-page-shell-92,
          .home-lower-shell-92 {
            zoom: 1;
          }
        }
        .qr-corner {
          position:fixed; bottom:20px; right:20px; z-index:999; cursor:pointer;
          transition: opacity .3s, transform .3s;
        }
        .qr-corner.hidden { opacity:0; pointer-events:none; transform:scale(0.7); }
        .qr-wrap {
          position:relative;
          display:flex; flex-direction:column; align-items:center; gap:6px;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1);
          transform-origin: bottom right;
          transform: scale(1);
        }
        .qr-corner:hover .qr-wrap { transform: scale(3.2); }
        .qr-box {
          width:48px; height:48px; padding:4px;
          background: #000;
          border-radius:6px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5);
          line-height:0;
          transition: box-shadow .3s;
        }
        .qr-corner:hover .qr-box { box-shadow: 0 0 0 2px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.8); }
        .qr-close {
          position:absolute; top:-8px; right:-8px; z-index:10;
          width:18px; height:18px;
          background:#222; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:9px; color:#fff; line-height:1;
          box-shadow:0 1px 4px rgba(0,0,0,0.5);
          opacity:0; transition:opacity .2s;
          cursor:pointer;
        }
        .qr-corner:hover .qr-close { opacity:1; }
        .qr-label {
          font-size:6px; letter-spacing:1.5px; color:#555;
          font-family:system-ui,sans-serif;
          white-space:nowrap;
          transition: color .3s;
        }
        .qr-corner:hover .qr-label { color:#111; }
      `}</style>
      {siteContent?.cornerQR && (
        <div className={"qr-corner" + (qrHidden ? " hidden" : "")}>
          <div className="qr-close" onClick={(e) => { e.stopPropagation(); setQrHidden(true); }}>✕</div>
          <div className="qr-wrap">
            <div className="qr-box">
              <img src={siteContent.cornerQR} alt="QR Liên hệ" style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
            <div className="qr-label">QR LIÊN HỆ</div>
          </div>
        </div>
      )}
    </div>
  );
}
