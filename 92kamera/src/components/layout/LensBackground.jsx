export default function LensBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "#8fc8d4" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 130% 85% at 50% 22%, #5fccdd 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 15% 55%, rgba(77,193,213,0.7) 0%, transparent 60%), linear-gradient(180deg, #8fc8d4 0%, #a9b8bc 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(236,243,248,0.58) 0%, transparent 40%, rgba(220,235,244,0.27) 100%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(186,206,220,0.30) 0%, transparent 50%)" }} />
      {/* Vintage: phủ tone ấm lạnh xen nhau nhẹ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(200,220,210,0.10) 0%, transparent 50%, rgba(180,200,225,0.08) 100%)",
        }}
      />
      {/* Vintage: rìa tối nhẹ tạo depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(20,50,75,0.14) 100%)",
        }}
      />
      {/* Film grain đậm hơn chút */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.22 }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-bg">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="5" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-bg)" />
      </svg>
    </div>
  );
}
