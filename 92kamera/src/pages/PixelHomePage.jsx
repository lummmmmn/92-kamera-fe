import React, { useEffect, useMemo, useRef, useState } from "react";
import "../components/pixel/pixel.css";
import { buildScene } from "../components/pixel/pixelScene.js";
import PixelDialog from "../components/pixel/PixelDialog.jsx";
import {
  AccessoriesPanel, ContactPanel, DeliveryPanel, DevicesPanel,
  GalleryPanel, GuidePanel, PerksPanel, RoadmapPanel, zaloHref,
} from "../components/pixel/PixelPanels.jsx";
import QuickSearchFloat from "../components/booking/QuickSearchFloat.jsx";
import OrderLookupWidget from "../components/booking/OrderLookupWidget.jsx";

// Bàn phím: mỗi chức năng là 1 phím. { l, k, f, s, c } = nhãn, hành động, nhãn F, số cột (12 cột/hàng), class; { d } = phím trang trí.
// "book" mở thẳng BookingModal có sẵn (giữ nguyên logic đặt máy).
const KB = [
  [{ d: "ESC", c: "r", s: 1 }, { l: "THIẾT BỊ", k: "devices", f: "F1" }, { l: "LỊCH TRỐNG", k: "avail", f: "F2" }, { l: "PHỤ KIỆN", k: "acc", f: "F3" }, { l: "GIAO NHẬN", k: "delivery", f: "F4" }, { l: "ƯU ĐÃI", k: "perks", f: "F5" }, { d: "*", c: "g", s: 1 }],
  [{ d: "TAB", s: 2 }, { l: "ẢNH KHÁCH", k: "gallery", f: "F6" }, { l: "TRA ĐƠN", k: "lookup", f: "F7" }, { l: "HƯỚNG DẪN", k: "guide", f: "F8" }, { l: "LIÊN HỆ", k: "contact", f: "F9" }, { l: "LỘ TRÌNH", k: "roadmap", f: "F10" }],
  [{ d: "CTRL", s: 2 }, { d: "ALT", c: "y", s: 1 }, { l: "ĐẶT MÁY", k: "book", f: "SPACE", s: 6, c: "p sp" }, { d: "ALT", c: "y", s: 1 }, { d: "FN", s: 2 }],
];
const TITLES = {
  devices: "Thiết bị", acc: "Phụ kiện", delivery: "Giao nhận", perks: "Ưu đãi",
  gallery: "Ảnh khách", guide: "Hướng dẫn thuê", roadmap: "Lộ trình phát triển", contact: "Liên hệ",
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
      <div className="px92-snow" aria-hidden="true" />
      <div className="px92-w">
        <header className="px92-hd">
          <div>
            <h1>Hi, mình là 92 KA MÊ RA</h1>
            <p className="in">Tiệm thuê máy ảnh theo ca ở Núi Thành, Tam Kỳ. Chọc vào màn hình xanh hoặc gõ phím bên dưới nha bro!</p>
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
          <div className="px92-mon">
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
        <div className="px92-chin"><span className="logo">92 KA MÊ RA</span><span className="slots"><i /><i /></span><span className="led" /></div>
          </div>
        </div>
        <nav className="px92-kb" aria-label="Chức năng">
          {KB.map((row, i) => (
            <div className="row" key={i}>
              {row.map((c, j) => (c.d ? (
                <div key={j} className={`px92-key d${c.c ? " " + c.c : ""}`} style={{ gridColumn: `span ${c.s || 1}` }} aria-hidden="true">{c.d}</div>
              ) : (
                <button key={c.k} type="button" className={`px92-key${c.c ? " " + c.c : ""}`} style={{ gridColumn: `span ${c.s || 2}` }} onClick={() => run(c.k)}>
                  {c.f ? <small>{c.f}</small> : null}{c.l}
                </button>
              )))}
            </div>
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
          {panel === "roadmap" && <RoadmapPanel />}
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
