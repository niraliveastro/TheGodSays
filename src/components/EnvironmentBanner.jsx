export default function EnvironmentBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <div
      title="Staging / Preview Environment"
      style={{
        position: "fixed",
        top: "12px",
        right: "12px",
        width: "10px",
        height: "10px",
        backgroundColor: "#dc2626", // red-600
        borderRadius: "50%",
        zIndex: 9999,
        boxShadow: "0 0 0 2px rgba(220,38,38,0.25)",
        pointerEvents: "none", // never blocks UI
      }}
    />
  );
}
