import Logo from "../common/Logo.jsx";
import { G, MUT, TXT } from "../../lib/constants.js";

export default function Footer({ isMobile, siteContent }) {
  const socials = Object.entries(siteContent?.socialLinks || {}).filter(([, url]) => url);

  return (
    <footer
      style={{
        marginTop: isMobile ? 34 : 56,
        padding: isMobile ? "26px 18px 22px" : "34px 56px",
        background:
          "linear-gradient(180deg, rgba(224,244,249,0.72) 0%, rgba(172,219,229,0.82) 54%, rgba(143,200,212,0.92) 100%)",
        backdropFilter: isMobile ? "none" : "blur(34px) saturate(160%)",
        WebkitBackdropFilter: isMobile ? "none" : "blur(34px) saturate(160%)",
        borderTop: "1px solid rgba(255,255,255,0.56)",
        boxShadow: "0 -1px 0 rgba(13,27,42,0.08), inset 0 1px 0 rgba(255,255,255,0.62)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1.4fr auto",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 20 : 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "center" : "flex-start", gap: 10 }}>
          <Logo size={isMobile ? 0.66 : 0.72} />
          <div
            style={{
              color: MUT,
              fontSize: 10,
              fontFamily: "var(--font-ui)",
              fontWeight: 800,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              textAlign: isMobile ? "center" : "left",
            }}
          >
            Cho thuê máy ảnh · Núi Thành · Tam Kỳ
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "72px 1fr",
            alignItems: "baseline",
            gap: isMobile ? 10 : "8px 16px",
            padding: isMobile ? "16px 0" : "0 0 0 24px",
            borderLeft: isMobile ? "none" : "1px solid rgba(13,27,42,0.12)",
            borderTop: isMobile ? "1px solid rgba(13,27,42,0.10)" : "none",
            borderBottom: isMobile ? "1px solid rgba(13,27,42,0.10)" : "none",
          }}
        >
          <div style={{ color: G, fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 850, letterSpacing: 1.4, textTransform: "uppercase" }}>
            Hotline
          </div>
          <a
            className="footer-link-92"
            href={siteContent?.zalo ? `tel:${siteContent.zalo.replace(/\s/g, "")}` : undefined}
            style={{
              color: TXT,
              fontSize: 13,
              fontFamily: "var(--font-ui)",
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            {siteContent?.zalo || "Đang cập nhật"}
          </a>

          <div style={{ color: G, fontSize: 11, fontFamily: "var(--font-ui)", fontWeight: 850, letterSpacing: 1.4, textTransform: "uppercase" }}>
            Địa chỉ
          </div>
          <div
            style={{
              color: "rgba(5,17,31,0.72)",
              fontSize: 12,
              fontFamily: "var(--font-ui)",
              fontWeight: 560,
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {siteContent?.address || "Đang cập nhật"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "center" : "flex-end", gap: 12 }}>
          {socials.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-end" }}>
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  className="footer-link-92"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: G,
                    background: "rgba(255,255,255,0.38)",
                    border: "1px solid rgba(13,27,42,0.12)",
                    borderRadius: 999,
                    padding: "7px 11px",
                    fontSize: 10,
                    fontFamily: "var(--font-ui)",
                    fontWeight: 850,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    textDecoration: "none",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.62)",
                  }}
                >
                  {name}
                </a>
              ))}
            </div>
          )}
          <div
            style={{
              color: "rgba(5,17,31,0.58)",
              fontSize: 11,
              fontFamily: "var(--font-ui)",
              fontWeight: 650,
              letterSpacing: 0.4,
              textAlign: isMobile ? "center" : "right",
            }}
          >
            © 2026 92 KA MÊ RA / abc2z
          </div>
        </div>
      </div>
    </footer>
  );
}
