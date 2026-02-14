"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Chat from "@/components/Chat";
import { Wallet } from "lucide-react";

const PENDING_CHAT_KEY = "tgs_ai_astrologer_chat_pending";

export default function TalkToAIAstrologerChatIndexPage() {
  const router = useRouter();
  const { getUserId } = useAuth();
  const userId = getUserId();
  const initRanRef = useRef(false);

  const [pending, setPending] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10, maxFreeQuestionsForGuests: 2 });
  const [walletBalance, setWalletBalance] = useState(null);

  const fetchWalletBalance = useCallback(async () => {
    if (!userId) {
      setWalletBalance(null);
      return;
    }
    try {
      const res = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-balance", userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setWalletBalance(data.wallet.balance ?? 0);
        }
      }
    } catch (e) {
      console.warn("[AI Astrologer Chat] Wallet fetch error:", e);
    }
  }, [userId]);

  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(PENDING_CHAT_KEY) : null;
      if (!raw) {
        router.replace("/talk-to-ai-astrologer");
        return;
      }
      const data = JSON.parse(raw);
      if (data && data.chatData) {
        setPending({ chatData: data.chatData, formDataHash: data.formDataHash || null });
      } else {
        router.replace("/talk-to-ai-astrologer");
      }
    } catch {
      router.replace("/talk-to-ai-astrologer");
    }
  }, [router]);

  /* Minimum loader display time so user sees "Loading chat…" after form submit */
  useEffect(() => {
    if (!pending?.chatData) return;
    const t = setTimeout(() => setShowContent(true), 280);
    return () => clearTimeout(t);
  }, [pending?.chatData]);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const res = await fetch("/api/pricing/public");
        if (res.ok) {
          const data = await res.json();
          if (data.pricing) setPricing(data.pricing);
        }
      } catch (e) {
        console.warn("[AI Astrologer Chat] Pricing fetch error:", e);
      }
    };
    loadPricing();
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  useEffect(() => {
    if (!pending) return;
    document.body.classList.add("talk-to-ai-chat-fullscreen-active");
    return () => document.body.classList.remove("talk-to-ai-chat-fullscreen-active");
  }, [pending]);

  const handleConversationId = useCallback(
    (id) => {
      if (!id) return;
      try {
        sessionStorage.removeItem(PENDING_CHAT_KEY);
      } catch (_) {}
      router.replace(`/talk-to-ai-astrologer/chat/${id}`);
    },
    [router]
  );

  const showLoader = pending === null || !pending?.chatData || !showContent;
  if (showLoader) {
    return (
      <div className="talk-to-ai-chat-loading" aria-busy="true" aria-label="Loading chat">
        <div className="talk-to-ai-chat-loading-spinner" />
        <span className="talk-to-ai-chat-loading-text">Loading chat…</span>
      </div>
    );
  }

  return (
    <main
      className="talk-to-ai-chat-fullscreen talk-to-ai-fullscreen"
      style={{
        position: "fixed",
        top: 128,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        background: "#fdfbf7",
        padding: 0,
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflow: "hidden",
        zIndex: 40,
      }}
    >
      <header
        className="talk-to-ai-chat-header flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-amber-200/50 shadow-sm flex-wrap"
        style={{
          background: "linear-gradient(135deg, #b8972e 0%, #d4af37 50%, #ca8a04 100%)",
          borderColor: "rgba(212, 175, 55, 0.5)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <img
            src="/images/astrologer2.png"
            alt="Mr. Astro"
            className="mr-astro-avatar"
          />
          <div className="flex flex-col">
            <h2 className="title mr-astro-title">Mr. Astro</h2>
            <span className="mr-astro-subtitle">Predictions Assistant</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="talk-to-ai-credits-pill flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300/50 bg-white/20"
            title="Credits per question"
          >
            <span className="text-xs opacity-90">{pricing.creditsPerQuestion} credits/question</span>
          </div>
          <div
            className="talk-to-ai-wallet-pill flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300/50 bg-white/20"
            title="Wallet balance"
          >
            <Wallet className="w-4 h-4" />
            {userId ? (
              <span className="text-sm font-semibold">
                {walletBalance !== null ? `${walletBalance} credits` : "…"}
              </span>
            ) : (
              <span className="text-sm opacity-90">{pricing.maxFreeQuestionsForGuests ?? 2} free chats</span>
            )}
          </div>
          {userId && walletBalance !== null && walletBalance < (pricing.creditsPerQuestion || 10) && (
            <button
              type="button"
              onClick={() => router.push("/wallet")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/25 text-white border border-white/40 hover:bg-white/35"
            >
              Top up
            </button>
          )}
        </div>
      </header>
      <div
        className="talk-to-ai-chat-viewport flex-1 flex flex-col min-h-0"
        style={{ width: "100%", height: "100%", flex: "1 1 0%" }}
      >
        <Chat
          key="ai-astrologer-chat-pending"
          pageTitle="Talk to AI Astrologer"
          initialData={pending.chatData}
          chatType="prediction"
          shouldReset={false}
          formDataHash={pending.formDataHash}
          embedded={true}
          fullHeight={true}
          onMessageSent={fetchWalletBalance}
          onConversationIdChange={handleConversationId}
          welcomeMessage="Welcome! How can I help you today?"
          suggestedQuestionsVertical={true}
          bubbleBgOpacity={0.3}
          suggestedQuestionIcon="arrow"
        />
      </div>
    </main>
  );
}
