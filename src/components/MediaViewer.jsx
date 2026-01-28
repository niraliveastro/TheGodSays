"use client";

import { X } from "lucide-react";
import Image from "next/image";

export default function MediaViewer({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "var(--space-lg)",
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "50%",
          padding: "0.75rem",
          cursor: "pointer",
          color: "#fff",
          backdropFilter: "blur(10px)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255,255,255,0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255,255,255,0.2)";
        }}
      >
        <X style={{ width: "24px", height: "24px" }} />
      </button>

      {/* Media container */}
      <div
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-md)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        {item.mediaType === "image" ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              maxHeight: "80vh",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <img
              src={item.mediaUrl}
              alt={item.title || "Gallery item"}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          </div>
        ) : (
          <video
            src={item.mediaUrl}
            controls
            autoPlay
            style={{
              width: "100%",
              maxHeight: "80vh",
              borderRadius: "var(--radius-md)",
              backgroundColor: "#000",
            }}
          />
        )}

        {/* Title and description */}
        {(item.title || item.description) && (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-md)",
              maxWidth: "600px",
              width: "100%",
            }}
          >
            {item.title && (
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                  color: "var(--color-gray-900)",
                }}
              >
                {item.title}
              </h3>
            )}
            {item.description && (
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--color-gray-700)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
