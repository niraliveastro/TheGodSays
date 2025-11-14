"use client";

/**
 * PricingPage Component
 * 
 * This is a client-side React component for the astrologer pricing settings page.
 * It handles authentication checks, loading states, and renders the pricing management interface.
 * The page allows astrologers to set their consultation rates for voice and video calls.
 * 
 * Key Features:
 * - Authentication guard: Redirects unauthenticated users to the login page.
 * - Loading spinner during auth resolution.
 * - Decorative background with animated orbs.
 * - Header with title and descriptive text.
 * - PricingManager component for rate configuration.
 * - Footer note about payment processing.
 * 
 * Dependencies:
 * - AuthContext: Provides user authentication state.
 * - PricingManager: Child component for managing pricing.
 * - Next.js Router: For programmatic navigation.
 * 
 * Styling: Uses inline styles for layout and a gradient background.
 * Assumes CSS classes like 'app', 'card', 'title', 'orb' are defined globally.
 * 
 * @returns {JSX.Element|null} The pricing page UI or null if unauthenticated.
 */
import { useAuth } from "@/contexts/AuthContext";
import PricingManager from "@/components/PricingManager";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PricingPage() {
  const { user, userProfile, loading } = useAuth(); // Destructure auth state: current user, profile, and loading indicator
  const router = useRouter(); // Next.js router for navigation

  /**
   * Effect to handle authentication redirect.
   * Runs when user or loading state changes.
   * If auth is resolved and no user is present, redirects to the astrologer auth page.
   */
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/astrologer");
    }
  }, [user, loading, router]); // Dependencies: re-run if user, loading, or router changes

  /**
   * Render loading state.
   * Displays a centered spinner with a message while authentication is resolving.
   * Uses inline styles for a simple, branded loading animation.
   */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)", // Subtle gold-to-beige gradient for branding
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              border: "4px solid transparent",
              borderTop: "4px solid #d4af37", // Gold accent color
              borderRadius: "50%",
              animation: "spin 1s linear infinite", // Assumes global @keyframes spin defined
              margin: "0 auto 1rem",
            }}
          ></div>
          <p style={{ color: "var(--color-gray-600)", fontSize: "1rem" }}>
            Loading pricing settings...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Early return for unauthenticated users.
   * Component will unmount or show nothing until auth resolves.
   */
  if (!user) {
    return null;
  }

  /**
   * Main render: Pricing settings page layout.
   * Includes decorative orbs, header, pricing manager, and footer.
   */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)", // Consistent branding gradient
        padding: "2rem 0",
      }}
    >
      <div className="app"> {/* Main app wrapper class */}
        {/* Decorative fixed orbs for background animation */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none", // Allows interaction with underlying content
          }}
        >
          <div className="orb orb1" /> {/* Assumes CSS classes for orb positioning/animation */}
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Header Section */}
        <header style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 className="title">Pricing Settings</h1> {/* Title with assumed styled class */}
          <p
            style={{
              color: "var(--color-gray-600)", // Muted text color from theme
              fontSize: "1.125rem",
              maxWidth: "640px",
              margin: "0 auto", // Center and constrain width for readability
            }}
          >
            Set your consultation rates for voice and video calls. Clients will
            see these prices when booking.
          </p>
        </header>

        {/* Pricing Configuration Card */}
        <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}> {/* Card class with centered max-width */}
          <PricingManager /> {/* Renders the pricing management form/component */}
        </div>

        {/* Footer Informational Note */}
        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            padding: "1.5rem",
            color: "var(--color-gray-500)", // Subtle gray for secondary text
            fontSize: "0.875rem",
          }}
        >
          <p>
            All earnings are processed securely. You’ll receive payments
            directly to your registered account.
          </p>
        </div>
      </div>
    </div>
  );
}