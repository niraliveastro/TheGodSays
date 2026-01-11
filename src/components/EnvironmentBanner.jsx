export default function EnvironmentBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "40%",
        right: "-60px",
        transform: "rotate(-90deg)",
        background: "#b91c1c",
        color: "#fff",
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: "bold",
        letterSpacing: "1px",
        zIndex: 9999,
        borderRadius: "4px 4px 0 0",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        pointerEvents: "none", // important: does NOT block clicks
      }}
    >
      🚧 STAGING
    </div>
  );
}
