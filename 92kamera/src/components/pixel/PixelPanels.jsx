import React, { useLayoutEffect, useRef, useState } from "react";
import PhotoLightbox from "../common/PhotoLightbox.jsx";
import { CA_SHIFTS, DELIVERY_AREAS_DEFAULT, STATUS_CFG } from "../../lib/constants.js";
import { cdnUrl, fmtVND } from "../../utils/format.js";

/* ── Ảnh giữ chỗ bằng pixel khi máy/phụ kiện chưa có ảnh thật ── */
const BG = ["#bcd0ff", "#ff8fb1", "#9fe0b4", "#ffd23f"];
function PixelCam({ seed = 0 }) {
  const k = Math.abs(Number(seed) || 0) % BG.length;
  return (
    <svg viewBox="0 0 40 30" role="img" aria-label="Ảnh minh hoạ" preserveAspectRatio="xMidYMid meet">
      <rect width="40" height="30" fill={BG[k]} />
      <rect x="4" y="27" width="32" height="1" fill="#14181f" />
      <rect x="3" y="10" width="34" height="16" fill="#14181f" />
      <rect x="15" y="5" width="10" height="6" fill="#14181f" />
      <rect x="5" y="7" width="5" height="3" fill="#14181f" />
      <rect x="13" y="10" width="14" height="14" fill="#14181f" />
      <rect x="14" y="11" width="12" height="12" fill="#2f6bff" />
      <rect x="17" y="14" width="6" height="6" fill="#bcd0ff" />
      <rect x="19" y="16" width="2" height="2" fill="#14181f" />
      <rect x="31" y="12" width="3" height="2" fill="#ff8fb1" />
    </svg>
  );
}

/* Mô tả thu gọn 2 dòng, bấm XEM THÊM mới bung ra */
function Desc({ text }) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  if (!text) return null;
  return (
    <>
      <small ref={ref} className={`px-desc${open ? " open" : ""}`}>{text}</small>
      {(clamped || open) && (
        <button type="button" className="px-tg" onClick={() => setOpen((o) => !o)}>
          {open ? "THU GỌN ▲" : "XEM THÊM ▼"}
        </button>
      )}
    </>
  );
}

const hashId = (s) => String(s ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

/* ── THIẾT BỊ ── */
export function DevicesPanel({ cameras = [], onPick }) {
  const [lb, setLb] = useState(null);
  if (!cameras.length) return <p className="px-empty">Chưa có thiết bị nào.</p>;
  return (
    <>
      {cameras.map((cam) => {
        const imgs = (cam.images || []).filter(Boolean);
        const out = cam.status === "unavailable";
        const st = STATUS_CFG[cam.status];
        return (
          <div className="px-it px-cm" key={cam.id}>
            <button
              type="button"
              className="px-ph"
              aria-label={imgs.length ? `Xem ảnh ${cam.name}` : cam.name}
              onClick={() => imgs.length && setLb({ photos: imgs.map((u, i) => ({ id: `${cam.id}-${i}`, url: u })), idx: 0 })}
              style={imgs.length ? undefined : { cursor: "default" }}
            >
              {imgs.length ? <img src={cdnUrl(imgs[0], "thumb")} alt={cam.name} loading="lazy" /> : <PixelCam seed={hashId(cam.id)} />}
            </button>
            <div className="px-tx">
              <b>{cam.name}</b>
              <Desc text={cam.desc} />
              {st ? <span className={`px-st ${cam.status}`}>{st.label}</span> : null}
            </div>
            <div className="px-pr">
              <span><em>{fmtVND(cam.price)}</em>/ngày</span>
              <button type="button" className="px-pb p" disabled={out} onClick={() => onPick?.(cam)}>
                {out ? "HẾT MÁY" : "ĐẶT"}
              </button>
            </div>
          </div>
        );
      })}
      {lb && <PhotoLightbox photos={lb.photos} startIndex={lb.idx} onClose={() => setLb(null)} />}
    </>
  );
}

/* ── PHỤ KIỆN ── */
export function AccessoriesPanel({ accessories = [], onBook }) {
  const list = accessories.filter((a) => a.active !== false);
  if (!list.length) return <p className="px-empty">Chưa có phụ kiện nào.</p>;
  return (
    <>
      {list.map((a) => (
        <div className="px-it px-cm" key={a.id}>
          <div className="px-ph" style={{ cursor: "default" }}>
            {a.image ? <img src={cdnUrl(a.image, "thumb")} alt={a.name} loading="lazy" /> : <PixelCam seed={hashId(a.id) + 1} />}
          </div>
          <div className="px-tx">
            <b>{a.name}</b>
            <Desc text={a.desc} />
          </div>
          <div className="px-pr">
            <span><em>{fmtVND(a.price)}</em>/ngày</span>
            {a.priceShift ? <span>{fmtVND(a.priceShift)}/ca</span> : null}
          </div>
        </div>
      ))}
      <div className="px-links">
        <button type="button" className="px-pb p lg" onClick={() => onBook?.()}>ĐẶT MÁY</button>
      </div>
      <p className="px-note" style={{ marginTop: 12 }}>Chọn phụ kiện ở bước 2 khi đặt máy.</p>
    </>
  );
}

/* ── GIAO NHẬN ── */
export function DeliveryPanel({ deliveryFees = [], address }) {
  const list = deliveryFees.length ? deliveryFees : DELIVERY_AREAS_DEFAULT;
  return (
    <>
      <p>Nhận tại tiệm miễn phí{address ? <>: <b>{address}</b></> : null}. Giao tận nơi tính phí một chiều theo khu vực:</p>
      {list.map((z) => (
        <div className="px-it" key={z.name} style={{ padding: "8px 0" }}>
          <b>{z.name}</b>
          <div className="px-pr"><em>{z.fee ? fmtVND(z.fee) : "Miễn phí"}</em></div>
        </div>
      ))}
    </>
  );
}

/* ── ƯU ĐÃI ── */
export function PerksPanel({ onBook }) {
  return (
    <>
      <p>Có mã giảm giá? Nhập ở <b>bước 3</b> khi đặt máy, hệ thống tự tính lại tổng tiền.</p>
      <div className="px-ca v">
        <div><b>Giảm tiền thuê</b>Trừ vào tiền thuê máy và phụ kiện</div>
        <div><b>Giảm phí giao</b>Trừ vào phí giao nhận</div>
        <div><b>Giảm tổng đơn</b>Trừ vào cả đơn, gồm phí giao</div>
      </div>
      <p className="px-note" style={{ marginTop: 12 }}>Đăng nhập tài khoản để xem huy hiệu khách thân thiết và lịch sử đơn.</p>
      <div className="px-links">
        <button type="button" className="px-pb p lg" onClick={() => onBook?.()}>ĐẶT MÁY</button>
      </div>
    </>
  );
}

/* ── ẢNH KHÁCH ── */
export function GalleryPanel({ albums = [], photos = [], onUpload, onLoadMoreAlbums, hasMoreAlbums, onLoadMorePhotos, hasMorePhotos }) {
  const [open, setOpen] = useState(null);
  const [lb, setLb] = useState(null);
  const albumPhotos = (a) => (a.photos || []).filter((p) => p?.url);
  const openLb = (arr, idx) => setLb({ photos: arr.map((p, i) => ({ id: p.id || p.public_id || i, url: p.url })), idx });

  let body;
  if (open) {
    const arr = albumPhotos(open);
    body = (
      <>
        <button type="button" className="px-pb" onClick={() => setOpen(null)}>← QUAY LẠI</button>
        <p style={{ margin: "12px 0" }}>
          <b>{open.cameraTag || open.name}</b>
          <span className="px-note"> · {arr.length} ảnh{open.cameraTag && open.name !== open.cameraTag ? ` · ${open.name}` : ""}</span>
        </p>
        <div className="px-albums">
          {arr.map((p, i) => (
            <button type="button" className="px-album" key={p.id || p.url || i} onClick={() => openLb(arr, i)} aria-label={`Xem ảnh ${i + 1}`}>
              <div className="im"><img src={cdnUrl(p.url, "thumb")} alt="" loading="lazy" /></div>
            </button>
          ))}
        </div>
      </>
    );
  } else {
    const loose = photos.filter((p) => p?.url);
    body = (
      <>
        {albums.length ? (
          <div className="px-albums">
            {albums.map((a) => {
              const n = albumPhotos(a).length;
              const cover = a.coverUrl || albumPhotos(a)[0]?.url;
              return (
                <button type="button" className="px-album" key={a.id} onClick={() => setOpen(a)}>
                  <div className="im">{cover ? <img src={cdnUrl(cover, "thumb")} alt="" loading="lazy" /> : null}</div>
                  <div className="cap">{a.cameraTag || a.name}<small>{n} ảnh</small></div>
                </button>
              );
            })}
          </div>
        ) : null}
        {hasMoreAlbums ? <p className="px-more"><button type="button" className="px-pb" onClick={onLoadMoreAlbums}>XEM THÊM ALBUM</button></p> : null}
        {loose.length ? (
          <>
            <p style={{ margin: "16px 0 8px" }}><b>Ảnh mới</b></p>
            <div className="px-albums">
              {loose.map((p, i) => (
                <button type="button" className="px-album" key={p.id || p.url || i} onClick={() => openLb(loose, i)} aria-label={`Xem ảnh ${i + 1}`}>
                  <div className="im"><img src={cdnUrl(p.url, "thumb")} alt="" loading="lazy" /></div>
                </button>
              ))}
            </div>
          </>
        ) : null}
        {hasMorePhotos ? <p className="px-more"><button type="button" className="px-pb" onClick={onLoadMorePhotos}>XEM THÊM ẢNH</button></p> : null}
        {!albums.length && !loose.length ? <p className="px-empty">Chưa có ảnh nào. Thuê máy xong, đăng ảnh của bạn lên đây nhé.</p> : null}
      </>
    );
  }

  return (
    <>
      {body}
      <div className="px-links">
        <button type="button" className="px-pb p lg" onClick={onUpload}>ĐĂNG ẢNH CỦA BẠN</button>
      </div>
      <p className="px-note" style={{ marginTop: 12 }}>Đăng nhập để đăng ảnh bạn chụp từ máy thuê.</p>
      {lb && <PhotoLightbox photos={lb.photos} startIndex={lb.idx} onClose={() => setLb(null)} />}
    </>
  );
}

/* ── HƯỚNG DẪN ── */
export function GuidePanel({ onBook }) {
  return (
    <>
      <ol className="px-steps">
        <li><i>1</i><div><b>Chọn thiết bị</b><p>Chọn máy bạn cần, xem tình trạng còn máy hay không.</p></div></li>
        <li><i>2</i><div><b>Thời gian và phụ kiện</b><p>Chọn ngày, ca nhận trả, thêm lens, thẻ nhớ, pin, chân máy.</p></div></li>
        <li><i>3</i><div><b>Thông tin đặt</b><p>Điền thông tin, chọn nơi nhận, nhập mã giảm giá rồi gửi đơn. Tiệm xác nhận qua Zalo.</p></div></li>
      </ol>
      <div className="px-ca">
        {CA_SHIFTS.map((c) => (<div key={c.key}><b>{c.label}</b>{c.time}</div>))}
      </div>
      <div className="px-links">
        <button type="button" className="px-pb p lg" onClick={() => onBook?.()}>ĐẶT MÁY</button>
      </div>
    </>
  );
}

/* ── LIÊN HỆ ── */
export const zaloHref = (site = {}) =>
  site.zaloLink || `https://zalo.me/${String(site.zalo || site.phone || "").replace(/\D/g, "")}`;

export function ContactPanel({ site = {} }) {
  const open = CA_SHIFTS[0]?.startH, close = CA_SHIFTS[CA_SHIFTS.length - 1]?.endH;
  const phone = site.phone || site.zalo;
  const socials = Object.entries(site.socialLinks || {}).filter(([, v]) => v);
  return (
    <>
      <p>Nhắn Zalo, tiệm trả lời trong giờ mở cửa và giữ máy theo ca bạn chọn.</p>
      <p>
        {site.address ? <><b>{site.address}</b><br /></> : null}
        {phone ? <>Điện thoại / Zalo: <b>{phone}</b><br /></> : null}
        Mở cửa {String(open).padStart(2, "0")}:00 – {close}:00 mỗi ngày
      </p>
      <div className="px-links">
        <a className="px-pb p lg" href={zaloHref(site)} target="_blank" rel="noopener noreferrer">NHẮN ZALO</a>
        {phone ? <a className="px-pb lg" href={`tel:${String(phone).replace(/\D/g, "")}`}>GỌI</a> : null}
        {socials.map(([k, v]) => (
          <a key={k} className="px-pb" href={v} target="_blank" rel="noopener noreferrer">{k.toUpperCase()}</a>
        ))}
      </div>
    </>
  );
}
