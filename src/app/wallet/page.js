"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import Wallet from "@/components/Wallet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageLoading } from "@/components/LoadingStates";

export default function WalletPage() {
  const { t } = useTranslation();
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // Check if user came from a return URL (optional - for "Back" button display)
  const [returnUrl, setReturnUrl] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedReturnUrl = sessionStorage.getItem('tgs:returnUrl');
      if (storedReturnUrl) {
        setReturnUrl(storedReturnUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // Store current wallet page as return URL for after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tgs:returnUrl', '/wallet');
      }
      router.push("/auth/user");
    }
    // Redirect astrologers
    if (userProfile?.collection === "astrologers") {
      router.push("/astrologer-dashboard");
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
    return <PageLoading type="wallet" message={t.messages.loading || "Loading your wallet..."} />;
  }

  if (!user) {
    return null;
  }

  // Redirect astrologers (client-side fallback)
  if (userProfile?.collection === "astrologers") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
        padding: "2rem 0",
      }}
    >
      <div className="app">
        {/* Orbs */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Wallet Header */}
        <header className="header">
          <h1 className="title">{t.wallet.title}</h1>
          <p className="subtitle">
            {t.wallet.subtitle}
          </p>
        </header>

        {/* Wallet Component */}
        <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <Wallet />
        </div>

        {/* Footer Note */}
        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            padding: "1.5rem",
            color: "var(--color-gray-500)",
            fontSize: "0.875rem",
          }}
        >
          <p>
            All transactions are secure and processed instantly. Minimum
            withdrawal: ₹500
          </p>
        </div>
      </div>
    </div>
  );
}
