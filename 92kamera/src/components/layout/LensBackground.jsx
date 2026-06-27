export default function LensBackground({ isMob = false }) {
  return (
    <div
      className="lens-bg-92k"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        transform: "translateZ(0)",
      }}
    >
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(200,220,210,0.10) 0%, transparent 50%, rgba(180,200,225,0.08) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(20,50,75,0.14) 100%)",
        }}
      />
      {!isMob && (
        <div
          className="lens-grain-92k"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35) 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(13,27,42,0.20) 0 1px, transparent 1px)",
            backgroundSize: "34px 34px, 46px 46px",
          }}
        />
      )}
      <style>{`
        body.is-scrolling .lens-grain-92k { opacity: 0; }
      `}</style>
    </div>
  );
}
