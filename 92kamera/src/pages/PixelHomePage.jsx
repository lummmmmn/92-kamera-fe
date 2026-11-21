import React, { useEffect, useMemo, useRef, useState } from "react";
import "../components/pixel/pixel.css";
import { buildScene } from "../components/pixel/pixelScene.js";
import PixelDialog from "../components/pixel/PixelDialog.jsx";
import {
  AccessoriesPanel, ContactPanel, DeliveryPanel, DevicesPanel,
  GalleryPanel, GuidePanel, PerksPanel, zaloHref,
} from "../components/pixel/PixelPanels.jsx";
import QuickSearchFloat from "../components/booking/QuickSearchFloat.jsx";
import OrderLookupWidget from "../components/booking/OrderLookupWidget.jsx";

// Thứ tự nút ở thanh dưới. "book" mở thẳng BookingModal có sẵn (giữ nguyên logic đặt máy).
const BAR = [
  ["ĐẶT MÁY", "book"], ["THIẾT BỊ", "devices"], ["LỊCH TRỐNG", "avail"], ["PHỤ KIỆN", "acc"],
  ["GIAO NHẬN", "delivery"], ["ƯU ĐÃI", "perks"], ["ẢNH KHÁCH", "gallery"], ["TRA ĐƠN", "lookup"],
  ["HƯỚNG DẪN", "guide"], ["LIÊN HỆ", "contact"],
];
const TITLES = {
  devices: "Thiết bị", acc: "Phụ kiện", delivery: "Giao nhận", perks: "Ưu đãi",
  gallery: "Ảnh khách", guide: "Hướng dẫn thuê", contact: "Liên hệ",
};
// 3 màn hình xanh trong tiệm: máy ảnh → danh sách thiết bị, đặt máy → đặt luôn, liên hệ → liên hệ
const SCREEN_ACTIONS = ["devices", "book", "contact"];

export default function PixelHomePage({
  cameras = [], accessories = [], siteContent, orders = [], onBook, onAdmin,
  photos = [], albums = [], deliveryFees = [],
  onLoadMorePhotos, hasMorePhotos, onLoadMoreAlbums, hasMoreAlbums,
  loggedUser, onOpenLogin, onOpenCustomer,
}) {
  const [panel, setPanel] = useState(null);
  const [qsTrigger, setQsTrigger] = useState(0);
  const [lookupOpen, setLookupOpen] = useState(false);
  const roomRef = useRef(null);
  const scene = useMemo(() => buildScene(), []);
  const site = siteContent || {};

  // Chủ tiệm "nhột" khi bấm (giữ nguyên hành vi bản demo)
  useEffect(() => {
    const root = roomRef.current;
    if (!root) return undefined;
    const body = root.querySelector("#sgb");
    const txt = root.querySelector("#sgt");
    if (!body || !txt) return undefined;
    let timer;
    const tick = () => {
      txt.textContent = "Nhột nha bro!";
      clearTimeout(timer);
      timer = setTimeout(() => { txt.textContent = "Chào bro nha!"; }, 1800);
    };
    const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tick(); } };
    body.addEventListener("click", tick);
    body.addEventListener("keydown", key);
    return () => { clearTimeout(timer); body.removeEventListener("click", tick); body.removeEventListener("keydown", key); };
  }, [scene]);

  // Trang chủ pixel nằm gọn một màn hình: khoá cuộn html/body khi đang hiển thị
  useEffect(() => {
    document.documentElement.classList.add("px92-lock");
    return () => document.documentElement.classList.remove("px92-lock");
  }, []);

  const closePanel = () => setPanel(null);
  const book = (cam) => { setPanel(null); onBook?.(cam); };

  const run = (key) => {
    if (key === "book") return book(undefined);
    if (key === "avail") { setPanel(null); return setQsTrigger((n) => n + 1); }
    if (key === "lookup") { setPanel(null); return setLookupOpen(true); }
    setPanel(key);
  };

  const accountLabel = loggedUser && loggedUser.role !== "admin" ? (loggedUser.name || "TÀI KHOẢN") : "TÀI KHOẢN";

  return (
    <div className="px92">
      <div className="px92-w">
        <header className="px92-hd">
          <div>
            <h1>Hi, mình là 92 KA MÊ RA</h1>
            <p className="in">Tiệm thuê máy ảnh theo ca ở Núi Thành, Tam Kỳ. Chọc vào màn hình xanh hoặc bấm nút bên dưới nha bro!</p>
          </div>
          <div className="px92-hr">
            <div className="row">
              <button type="button" className="px-pb" onClick={onOpenCustomer}>{accountLabel}</button>
              <a className="px-pb p" href={zaloHref(site)} target="_blank" rel="noopener noreferrer">NHẮN ZALO</a>
            </div>
            <button type="button" className="px92-adm" onClick={onAdmin}>admin</button>
          </div>
        </header>

        <div className="px92-stage">
          <div className="px92-room" ref={roomRef}>
            <div dangerouslySetInnerHTML={{
              __html: `<svg viewBox="0 0 ${scene.W} ${scene.H}" role="img" aria-label="Tiệm 92 KA MÊ RA với ba màn hình xanh">${scene.svg}</svg>`,
            }} />
            {scene.screens.map((m, k) => (
              <button
                key={m[1]} type="button" className="px92-hit" aria-label={m[1]}
                onClick={() => run(SCREEN_ACTIONS[k])}
                style={{
                  left: `${((m[0] - 1) / scene.W) * 100}%`, top: `${(19 / scene.H) * 100}%`,
                  width: `${(30 / scene.W) * 100}%`, height: `${(22 / scene.H) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        <nav className="px92-bar" aria-label="Chức năng">
          {BAR.map(([label, key]) => (
            <button key={key} type="button" className={`px-pb${key === "book" ? " p" : ""}`} onClick={() => run(key)}>{label}</button>
          ))}
        </nav>
      </div>

      {panel && (
        <PixelDialog title={TITLES[panel]} onClose={closePanel}>
          {panel === "devices" && <DevicesPanel cameras={cameras} onPick={book} />}
          {panel === "acc" && <AccessoriesPanel accessories={accessories} onBook={() => book(undefined)} />}
          {panel === "delivery" && <DeliveryPanel deliveryFees={deliveryFees} address={site.address} />}
          {panel === "perks" && <PerksPanel onBook={() => book(undefined)} />}
          {panel === "gallery" && (
            <GalleryPanel
              albums={albums} photos={photos}
              onUpload={() => { setPanel(null); onOpenCustomer?.(); }}
              onLoadMoreAlbums={onLoadMoreAlbums} hasMoreAlbums={hasMoreAlbums}
              onLoadMorePhotos={onLoadMorePhotos} hasMorePhotos={hasMorePhotos}
            />
          )}
          {panel === "guide" && <GuidePanel onBook={() => book(undefined)} />}
          {panel === "contact" && <ContactPanel site={site} />}
        </PixelDialog>
      )}

      {/* Lịch trống: dùng lại bộ tìm máy trống theo ca có sẵn */}
      <QuickSearchFloat cameras={cameras} accessories={accessories} orders={orders} onBook={onBook} openTrigger={qsTrigger} pixel />
      {/* Tra đơn: dùng lại widget có sẵn, mở bằng forceOpen nên không hiện nút nổi */}
      <OrderLookupWidget orders={orders} compact forceOpen={lookupOpen} onForceClose={() => setLookupOpen(false)} pixel />
    </div>
  );
}
