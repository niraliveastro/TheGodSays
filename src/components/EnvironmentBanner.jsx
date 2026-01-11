export default function EnvironmentBanner() {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;
  
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "#b91c1c",
          color: "white",
          textAlign: "center",
          fontWeight: "bold",
          padding: "8px",
          zIndex: 9999,
          letterSpacing: "1px",
        }}
      >
        🚧 STAGING / PREVIEW ENVIRONMENT 🚧
      </div>
    );
  }
  