import { useState, useRef } from "react";
import { G, MUT, TXT } from "../../lib/constants.js";
import { cdnUrl } from "../../utils/format.js";
import PhotoLightbox from "../common/PhotoLightbox.jsx";

export default function FeedbackSection({
  photos,
  albums,
  feedbacks,
  isMobile,
  onLoadMorePhotos,
  hasMorePhotos,
  onLoadMoreAlbums,
  hasMoreAlbums,
  onLoadMoreFeedbacks,
  hasMoreFeedbacks,
}) {
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index ảnh rời
  const [openAlbum, setOpenAlbum] = useState(null); // album object
  const [albumPhotoLightbox, setAlbumPhotoLightbox] = useState(null);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const sectionRef = useRef(null);

  const cards = (feedbacks || [])
    .filter((f) => f.status === "approved" && !f.hidden)
    .map((f) => ({
      key: "fb_" + f.id,
      rating: f.rating || 5,
      text: f.text || "Khách hàng hài lòng 😊",
      userName: f.userName || "Khách hàng",
      camera: f.cameraName || "Máy ảnh",
      date: f.date,
    }));

  const total = cards.length;
  const avgRating = total ? (cards.reduce((s, c) => s + c.rating, 0) / total).toFixed(1) : "5.0";

  const photosArr = photos || [];
  const getTime = (value) => {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(time) ? time : 0;
  };
  const getAlbumTime = (album) => {
    const photosInAlbum = album.photos || [];
    const newestPhotoTime = Math.max(
      0,
      ...photosInAlbum.map((photo) =>
        Math.max(
          getTime(photo.updatedAt),
          getTime(photo.createdAt),
          getTime(photo.uploadedAt),
          getTime(photo.date)
        )
      )
    );
    return Math.max(getTime(album.updatedAt), getTime(album.createdAt), getTime(album.date), newestPhotoTime);
  };
  const albumsArr = (albums || [])
    .filter((a) => (a.photos || []).length > 0)
    .map((album, index) => ({ album, index, time: getAlbumTime(album) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ album }) => album);
  const hasAlbums = albumsArr.length > 0;
  const hasPhotos = photosArr.length > 0;
  const openAlbumPhotos = openAlbum?.photos || [];

  const [swipeIdx, setSwipeIdx] = useState(0);

  if (total === 0 && !hasAlbums && !hasPhotos) {
    return (
      <div
        id="feedback"
        ref={sectionRef}
        className="home-section"
        style={{
          padding: "72px 16px 64px",
          margin: isMobile ? "20px 12px" : "32px 20px",
          borderRadius: 28,
          border: "none",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(13,27,42,0.08) inset, 0 4px 6px rgba(13,27,42,0.06) inset, 0 16px 64px rgba(5,17,31,0.20), 0 4px 18px rgba(5,17,31,0.12), 0 0 0 1px rgba(13,27,42,0.07)",
          background: isMobile ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.13)",
          backdropFilter: isMobile ? "none" : "blur(52px) saturate(180%) brightness(1.04)",
          WebkitBackdropFilter: isMobile ? "none" : "blur(52px) saturate(180%) brightness(1.04)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, letterSpacing: 1, margin: "0 0 14px", color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>
          Feedback khách hàng
        </h2>
        <div style={{ width: 36, height: 1, background: G, margin: "0 auto 20px" }} />
        <div style={{ color: TXT, fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 500 }}>Chưa có feedback nào được duyệt</div>
      </div>
    );
  }

  let band = [...cards];
  if (cards.length > 0) {
    while (band.length < 10) band = [...band, ...cards];
  }
  band = [...band, ...band];
  const dur = Math.max(35, band.length * 4);

  const FeedbackCard = ({ c, style: extraStyle }) => (
    <div
      style={{
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(5,17,31,0.08)",
        borderRadius: 20,
        padding: "22px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 24px rgba(5,17,31,0.10)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        ...extraStyle,
      }}
    >
      <div>
        {Array.from({ length: 5 }).map((_, si) => (
          <span key={si} style={{ color: si < c.rating ? "#c9a84c" : "rgba(13,27,42,0.12)", fontSize: 15 }}>
            ★
          </span>
        ))}
      </div>
      <div style={{ color: G, fontSize: 13.5, lineHeight: 1.75, fontStyle: "italic", fontFamily: "var(--font-display)", fontWeight: 400, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
        "{c.text}"
      </div>
      <div style={{ paddingTop: 12, borderTop: "1px solid rgba(13,27,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: G, fontSize: 12, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{c.userName}</div>
          <div style={{ color: MUT, fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 500, marginTop: 2 }}>📷 {c.camera}</div>
        </div>
        <span style={{ background: G + "14", color: G, borderRadius: 99, padding: "3px 10px", fontSize: 9.5, fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: 0.5 }}>
          ĐÃ THUÊ ✓
        </span>
      </div>
    </div>
  );

  const GalleryImage = ({ src, alt = "" }) => (
    <>
      <img
        aria-hidden="true"
        src={src}
        alt=""
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          filter: "blur(18px)",
          transform: "scale(1.08)",
          opacity: 0.48,
        }}
      />
      <img
        className="gal-img"
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          transition: "transform .35s ease",
        }}
      />
    </>
  );

  return (
    <div
      id="feedback"
      ref={sectionRef}
      className="home-section"
      style={{
        padding: isMobile ? "48px 0 44px" : "72px 0 64px",
        margin: isMobile ? "16px 0" : "32px 20px",
        background: "transparent",
        boxShadow: "none",
        border: "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes marqueeRun{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .marquee-band{will-change:transform;}
        .gal-thumb:hover .gal-overlay{opacity:1!important;}
        .gal-thumb:hover .gal-img{transform:scale(1.01);}
        .fb-swipe-card{transition:transform .35s cubic-bezier(.25,.46,.45,.94),opacity .35s ease;}
      `}</style>

      {/* Header */}
      {total > 0 && (
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36, padding: "0 20px" }}>
          <div style={{ fontSize: isMobile ? 9 : 10.5, letterSpacing: 7, color: G, opacity: 0.5, marginBottom: 12, fontFamily: "var(--font-ui)", fontWeight: 700 }}>
            ĐÁNH GIÁ / FEEDBACK
          </div>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", color: G, fontFamily: "var(--font-display)", textShadow: "0 1px 3px rgba(13,27,42,0.10)" }}>
            Feedback khách hàng
          </h2>
          <p style={{ fontSize: isMobile ? 14 : 16, color: MUT, fontFamily: "var(--font-ui)", lineHeight: 1.75, maxWidth: isMobile ? 260 : 430, margin: "0 auto 14px", fontWeight: 500 }}>
            {isMobile ? <>Trải nghiệm thật<br />từ khách đã thuê máy</> : <>Trải nghiệm thật từ những khách hàng<br />đã tin tưởng dịch vụ 92 Ka Mê Ra</>}
          </p>
          <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${G}55,transparent)`, margin: "0 auto 16px" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 99, padding: "5px 18px", backdropFilter: "blur(24px) saturate(160%)" }}>
            <span style={{ color: "#c9a84c", fontSize: 15 }}>{"★".repeat(Math.round(parseFloat(avgRating)))}</span>
            <span style={{ color: "#c9a84c", fontWeight: 800, fontSize: 14, fontFamily: "var(--font-ui)" }}>{avgRating}</span>
            <span style={{ color: MUT, fontSize: 12, fontFamily: "var(--font-ui)", fontWeight: 500 }}>· {total} đánh giá</span>
          </div>
        </div>
      )}

      {/* ── MOBILE: swipe card ── */}
      {total > 0 && isMobile && (
        <div style={{ padding: "0 16px" }}>
          <FeedbackCard c={cards[swipeIdx]} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 18 }}>
            <button
              onClick={() => setSwipeIdx((i) => (i - 1 + cards.length) % cards.length)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(13,27,42,0.12)",
                color: G,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5,17,31,0.10)",
              }}
            >
              ‹
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              {cards.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setSwipeIdx(i)}
                  style={{
                    width: i === swipeIdx ? 18 : 6,
                    height: 6,
                    borderRadius: 99,
                    background: i === swipeIdx ? G : G + "40",
                    cursor: "pointer",
                    transition: "all .3s ease",
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setSwipeIdx((i) => (i + 1) % cards.length)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(13,27,42,0.12)",
                color: G,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5,17,31,0.10)",
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── DESKTOP: marquee ── */}
      {total > 0 && !isMobile && (
        <div style={{ position: "relative" }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right,rgba(180,220,235,0.70),transparent)", zIndex: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to left,rgba(180,220,235,0.70),transparent)", zIndex: 2, pointerEvents: "none" }} />
          <div
            className="marquee-band"
            style={{
              display: "flex",
              gap: 16,
              width: "max-content",
              animation: `marqueeRun ${dur}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {band.map((c, i) => (
              <FeedbackCard key={c.key + "_" + i} c={c} style={{ width: 280, flexShrink: 0, transition: "all .28s cubic-bezier(.34,1.56,.64,1)" }} />
            ))}
          </div>
        </div>
      )}

      {(hasMoreFeedbacks || hasMorePhotos || hasMoreAlbums) && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 22, padding: "0 16px" }}>
          {hasMoreFeedbacks && (
            <button
              type="button"
              onClick={onLoadMoreFeedbacks}
              style={{
                background: "rgba(255,255,255,0.70)",
                border: `1px solid rgba(13,27,42,0.12)`,
                color: G,
                padding: "10px 16px",
                borderRadius: 999,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                letterSpacing: 1.2,
                fontWeight: 700,
              }}
            >
              TẢI THÊM FEEDBACK
            </button>
          )}
          {hasMorePhotos && (
            <button
              type="button"
              onClick={onLoadMorePhotos}
              style={{
                background: "rgba(255,255,255,0.70)",
                border: `1px solid rgba(13,27,42,0.12)`,
                color: G,
                padding: "10px 16px",
                borderRadius: 999,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                letterSpacing: 1.2,
                fontWeight: 700,
              }}
            >
              TẢI THÊM ẢNH
            </button>
          )}
        </div>
      )}

      {/* ── GALLERY / ALBUM ── */}
      {(hasAlbums || hasPhotos) && (
        <div style={{ padding: isMobile ? "48px 16px 0" : "60px 40px 0" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36 }}>
            <div style={{ fontSize: isMobile ? 9 : 11, letterSpacing: 7, color: G, opacity: 0.5, marginBottom: 10, fontFamily: "var(--font-ui)", fontWeight: 700 }}>
              PHÂN LOẠI THEO MÁY ẢNH · XEM ALBUM ĐẦY ĐỦ
            </div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", color: G, fontFamily: "var(--font-display)", textShadow: "0 2px 8px rgba(13,27,42,0.12)" }}>
              Ảnh thực tế
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 16, color: MUT, fontFamily: "var(--font-ui)", lineHeight: 1.75, maxWidth: isMobile ? 260 : 430, margin: "0 auto", fontWeight: 500 }}>
              {isMobile ? <>Khoảnh khắc từ khách hàng<br />đã thuê máy tại 92 Ka Mê Ra</> : <>Những khoảnh khắc thực tế được ghi lại<br />bởi khách hàng đã thuê máy tại 92 Ka Mê Ra</>}
            </p>
          </div>

          {openAlbum ? (
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: 14,
                  marginBottom: isMobile ? 16 : 20,
                  padding: isMobile ? "14px 14px" : "16px 18px",
                  borderRadius: isMobile ? 18 : 22,
                  background: "rgba(255,255,255,0.24)",
                  border: "1px solid rgba(255,255,255,0.36)",
                  boxShadow: "0 10px 30px rgba(13,27,42,0.10), inset 0 1px 0 rgba(255,255,255,0.55)",
                  backdropFilter: isMobile ? "none" : "blur(20px) saturate(150%)",
                  WebkitBackdropFilter: isMobile ? "none" : "blur(20px) saturate(150%)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: G, fontSize: isMobile ? 18 : 24, fontFamily: "var(--font-display)", fontWeight: 800, lineHeight: 1.25, marginBottom: 4 }}>
                    {openAlbum.cameraTag || openAlbum.name}
                  </div>
                  <div style={{ color: MUT, fontSize: isMobile ? 12 : 14.5, fontFamily: "var(--font-ui)", fontWeight: 650, lineHeight: 1.5 }}>
                    {openAlbum.cameraTag && openAlbum.name !== openAlbum.cameraTag ? openAlbum.name + " · " : ""}{openAlbumPhotos.length} ảnh
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAlbumPhotoLightbox(null);
                    setOpenAlbum(null);
                  }}
                  style={{
                    alignSelf: isMobile ? "flex-start" : "center",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: isMobile ? "9px 14px" : "10px 18px",
                    borderRadius: 999,
                    background: "rgba(13,27,42,0.08)",
                    border: "1px solid rgba(13,27,42,0.14)",
                    color: G,
                    cursor: "pointer",
                    fontSize: isMobile ? 11 : 13,
                    fontFamily: "var(--font-ui)",
                    fontWeight: 850,
                    letterSpacing: 1.4,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
                  }}
                >
                  ← TẤT CẢ ALBUM
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))",
                  gap: isMobile ? 8 : 12,
                }}
              >
                {openAlbumPhotos.map((p, i) => (
                  <div
                    key={p.id || p.url || i}
                    className="gal-thumb"
                    onClick={() => setAlbumPhotoLightbox(i)}
                    style={{
                      position: "relative",
                      borderRadius: isMobile ? 14 : 18,
                      overflow: "hidden",
                      aspectRatio: isMobile ? "4/5" : "1/1",
                      cursor: "pointer",
                      background: "rgba(13,27,42,0.08)",
                      boxShadow: "0 4px 18px rgba(5,17,31,0.13)",
                    }}
                  >
                    <GalleryImage src={cdnUrl(p.url, "thumb")} alt={openAlbum.name} />
                    <div className="gal-overlay" style={{ position: "absolute", inset: 0, background: "rgba(5,17,31,0.32)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}>
                      <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: "50%", background: "rgba(255,255,255,0.90)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.20)" }}>
                        <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="7" />
                          <line x1="16.5" y1="16.5" x2="22" y2="22" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
          {hasAlbums && (() => {
            const displayed = showAllAlbums ? albumsArr : albumsArr.slice(0, 3);
            const [big, ...smalls] = displayed;
            const expandedCardSizing = showAllAlbums && !isMobile
              ? { aspectRatio: "4 / 3", minHeight: 220 }
              : {};
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : showAllAlbums ? "1fr 1fr 1fr" : "1fr 1fr",
                  gridTemplateRows: isMobile ? "auto" : showAllAlbums ? "auto" : "1fr 1fr",
                  gap: isMobile ? 10 : 14,
                  height: isMobile ? "auto" : showAllAlbums ? "auto" : 480,
                }}
              >
                {big && (
                  <div
                    key={big.id}
                    className="gal-thumb"
                    onClick={() => setOpenAlbum(big)}
                    style={{
                      gridRow: isMobile || showAllAlbums ? "auto" : "1 / 3",
                      position: "relative",
                      borderRadius: isMobile ? 18 : 24,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "rgba(13,27,42,0.08)",
                      boxShadow: "0 4px 28px rgba(5,17,31,0.18)",
                      minHeight: isMobile ? 280 : showAllAlbums ? 220 : "unset",
                      ...expandedCardSizing,
                    }}
                  >
                    {big.coverUrl ? (
                      <GalleryImage src={cdnUrl(big.coverUrl, "thumb")} alt={big.name} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "rgba(13,27,42,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📷</div>
                    )}
                    <div className="gal-overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,17,31,0.22)", opacity: 0, transition: "opacity .25s" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.22)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="7" />
                          <line x1="16.5" y1="16.5" x2="22" y2="22" />
                        </svg>
                      </div>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isMobile ? "48px 18px 16px" : "72px 24px 22px", background: "linear-gradient(to top, rgba(5,12,22,0.85) 0%, rgba(5,12,22,0.35) 60%, transparent 100%)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 12, padding: isMobile ? "5px 12px" : "6px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                          <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="5" width="22" height="16" rx="2" />
                            <circle cx="12" cy="15" r="3" />
                          </svg>
                          <span style={{ color: "rgba(255,255,255,0.95)", fontSize: isMobile ? 13 : 15, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{big.cameraTag || big.name}</span>
                        </div>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 13 : 14, fontFamily: "var(--font-ui)", fontWeight: 500, marginBottom: 3 }}>{big.name !== big.cameraTag ? big.name : ""}</div>
                      <div style={{ color: "rgba(255,255,255,0.60)", fontSize: isMobile ? 12 : 13, fontFamily: "var(--font-ui)" }}>{(big.photos || []).length} ảnh</div>
                    </div>
                  </div>
                )}

                {isMobile && smalls.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {smalls.map((alb) => (
                      <div
                        key={alb.id}
                        className="gal-thumb"
                        onClick={() => setOpenAlbum(alb)}
                        style={{
                          position: "relative",
                          borderRadius: 18,
                          overflow: "hidden",
                          cursor: "pointer",
                          background: "rgba(13,27,42,0.08)",
                          boxShadow: "0 4px 20px rgba(5,17,31,0.15)",
                          minHeight: 160,
                        }}
                      >
                        {alb.coverUrl ? (
                          <GalleryImage src={cdnUrl(alb.coverUrl, "thumb")} alt={alb.name} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "rgba(13,27,42,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>📷</div>
                        )}
                        <div className="gal-overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,17,31,0.22)", opacity: 0, transition: "opacity .25s" }}>
                          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="7" />
                              <line x1="16.5" y1="16.5" x2="22" y2="22" />
                            </svg>
                          </div>
                        </div>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 16px 14px", background: "linear-gradient(to top, rgba(5,12,22,0.85) 0%, rgba(5,12,22,0.35) 60%, transparent 100%)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <div style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 10, padding: "4px 11px", display: "flex", alignItems: "center", gap: 6 }}>
                              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="5" width="22" height="16" rx="2" />
                                <circle cx="12" cy="15" r="3" />
                              </svg>
                              <span style={{ color: "rgba(255,255,255,0.95)", fontSize: 13.5, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{alb.cameraTag || alb.name}</span>
                            </div>
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13.5, fontFamily: "var(--font-ui)", fontWeight: 500, marginBottom: 2 }}>{alb.name !== alb.cameraTag ? alb.name : ""}</div>
                          <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 12.5, fontFamily: "var(--font-ui)" }}>{(alb.photos || []).length} ảnh</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isMobile &&
                  smalls.map((alb) => (
                    <div
                      key={alb.id}
                      className="gal-thumb"
                      onClick={() => setOpenAlbum(alb)}
                      style={{
                        position: "relative",
                        borderRadius: 22,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "rgba(13,27,42,0.08)",
                        boxShadow: "0 4px 20px rgba(5,17,31,0.15)",
                        ...expandedCardSizing,
                      }}
                    >
                      {alb.coverUrl ? (
                        <GalleryImage src={cdnUrl(alb.coverUrl, "thumb")} alt={alb.name} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "rgba(13,27,42,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>📷</div>
                      )}
                      <div className="gal-overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,17,31,0.22)", opacity: 0, transition: "opacity .25s" }}>
                        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7" />
                            <line x1="16.5" y1="16.5" x2="22" y2="22" />
                          </svg>
                        </div>
                      </div>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "52px 20px 18px", background: "linear-gradient(to top, rgba(5,12,22,0.85) 0%, rgba(5,12,22,0.35) 60%, transparent 100%)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 10, padding: "5px 13px", display: "flex", alignItems: "center", gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="5" width="22" height="16" rx="2" />
                              <circle cx="12" cy="15" r="3" />
                            </svg>
                            <span style={{ color: "rgba(255,255,255,0.95)", fontSize: 14.5, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{alb.cameraTag || alb.name}</span>
                          </div>
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14.5, fontFamily: "var(--font-ui)", fontWeight: 500, marginBottom: 2 }}>{alb.name !== alb.cameraTag ? alb.name : ""}</div>
                        <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, fontFamily: "var(--font-ui)" }}>{(alb.photos || []).length} ảnh</div>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })()}

          {hasAlbums && albumsArr.length > 3 && (
            <div style={{ textAlign: "center", marginTop: isMobile ? 20 : 28 }}>
              <button
                onClick={() => setShowAllAlbums((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: `1.5px solid ${G}55`,
                  borderRadius: 99,
                  padding: isMobile ? "10px 24px" : "12px 32px",
                  color: G,
                  fontSize: isMobile ? 11 : 12,
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: "pointer",
                  transition: "all .25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = G + "12";
                  e.currentTarget.style.borderColor = G + "aa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = G + "55";
                }}
              >
                {showAllAlbums ? "THU GỌN" : "XEM TẤT CẢ ALBUM"}
                {showAllAlbums ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {hasMoreAlbums && (
            <div style={{ textAlign: "center", marginTop: isMobile ? 18 : 26 }}>
              <button
                type="button"
                onClick={onLoadMoreAlbums}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid rgba(13,27,42,0.12)`,
                  color: G,
                  padding: isMobile ? "10px 20px" : "11px 24px",
                  borderRadius: 999,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "system-ui,sans-serif",
                  letterSpacing: 1.2,
                  fontWeight: 700,
                }}
              >
                TẢI THÊM ALBUM
              </button>
            </div>
          )}

          {!hasAlbums && hasPhotos && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 8 : 10 }}>
              {photosArr.map((p, i) => (
                <div
                  key={p.id || i}
                  className="gal-thumb"
                  onClick={() => {
                    setLightbox(i);
                  }}
                  style={{
                    position: "relative",
                    borderRadius: isMobile ? 12 : 16,
                    overflow: "hidden",
                    aspectRatio: "1/1",
                    cursor: "pointer",
                    background: "rgba(13,27,42,0.08)",
                    boxShadow: "0 2px 12px rgba(5,17,31,0.12)",
                  }}
                >
                  <GalleryImage src={cdnUrl(p.url, "thumb")} />
                  <div className="gal-overlay" style={{ position: "absolute", inset: 0, background: "rgba(5,17,31,0.38)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.90)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="16.5" y1="16.5" x2="22" y2="22" />
                      </svg>
                    </div>
                  </div>
                  {!isMobile && i === 7 && photosArr.length > 8 && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(5,17,31,0.60)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>+{photosArr.length - 8}</span>
                    </div>
                  )}
                  {isMobile && i === 3 && photosArr.length > 4 && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(5,17,31,0.60)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>+{photosArr.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      )}

      {lightbox !== null && <PhotoLightbox photos={photosArr} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      {openAlbum && albumPhotoLightbox !== null && (
        <PhotoLightbox
          photos={openAlbumPhotos}
          startIndex={albumPhotoLightbox}
          onClose={() => setAlbumPhotoLightbox(null)}
        />
      )}
    </div>
  );
}
