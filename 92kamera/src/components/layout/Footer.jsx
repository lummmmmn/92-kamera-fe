import Logo from "../common/Logo.jsx";

export default function Footer({ isMobile, siteContent }) {
  return (
    <footer
      style={{
        padding: isMobile ? "20px 16px" : "28px 60px",
        display: "flex",
        flexWrap: "wrap",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: isMobile ? 10 : 16,
        background: "linear-gradient(135deg, rgba(107,184,212,0.55) 0%, rgba(107,184,212,0.45) 100%)",
        backdropFilter: isMobile ? "none" : "blur(52px) saturate(180%) brightness(1.04)",
        WebkitBackdropFilter: isMobile ? "none" : "blur(52px) saturate(180%) brightness(1.04)",
        borderTop: "1px solid rgba(107,184,212,0.35)",
      }}
    >
      <Logo size={0.7} />
      <div
        style={{
          color: "rgba(10,10,20,0.75)",
          fontSize: 12,
          fontFamily: "var(--font-ui)",
          fontWeight: 500,
          letterSpacing: 0.5,
          display: "grid",
          gridTemplateColumns: "auto auto 1fr",
          gap: "2px 4px",
        }}
      >
        <span>Hotline</span>
        <span>:</span>
        <span>{siteContent?.zalo}</span>
        <span>Địa chỉ</span>
        <span>:</span>
        <span>{siteContent?.address}</span>
      </div>
      <div
        style={{
          color: "rgba(10,10,20,0.55)",
          fontSize: 11,
          fontFamily: "var(--font-ui)",
          fontWeight: 400,
        }}
      >
        © 2026 92 KA MÊ RA/abc2z
      </div>
    </footer>
  );
}
