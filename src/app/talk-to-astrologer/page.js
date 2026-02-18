"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Video,
  Phone,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Calendar,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import {
  trackEvent,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
  trackPageView,
} from "@/lib/analytics";
import { PageLoading } from "@/components/LoadingStates";
import PageSEO from "@/components/PageSEO";

// Lazy load heavy components for better initial load
const CallConnectingNotification = lazy(() => import("@/components/CallConnectingNotification"));
const Modal = lazy(() => import("@/components/Modal"));
const ReviewModal = lazy(() => import("@/components/ReviewModal"));

export default function TalkToAstrologer() {
  const { t } = useTranslation();
  /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialization, setFilterSpecialization] = useState("");
  const [astrologers, setAstrologers] = useState([]);
  const [fetchingAstrologers, setFetchingAstrologers] = useState(true);
  const [connectingCallType, setConnectingCallType] = useState(null); // 'video' | 'voice' | null
  const [connectingAstrologerId, setConnectingAstrologerId] = useState(null); // Store astrologer ID for connecting call
  const [callStatus, setCallStatus] = useState("connecting");
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedAstrologer, setSelectedAstrologer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCallHistoryModalOpen, setIsCallHistoryModalOpen] = useState(false);
  const [callHistory, setCallHistory] = useState([]); // Stores ALL calls
  const [totalSpending, setTotalSpending] = useState(0);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);
  const [balance, setBalance] = useState(0);
  const [callHistoryCache, setCallHistoryCache] = useState(null);
  const [callHistoryCacheTime, setCallHistoryCacheTime] = useState(0);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const [loadingAllCalls, setLoadingAllCalls] = useState(false);
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();

  /* --------------------------------------------------------------- */
  /*  Helper: Invalidate Cache & Force Refresh                      */
  /* --------------------------------------------------------------- */
  const invalidateCache = (userId) => {
    console.log("🗑️ Invalidating cache for user", userId);
    const cacheKey = `tgs:callHistory:${userId}`;
    try {
      localStorage.removeItem(cacheKey);
      setCallHistoryCache(null);
      setCallHistoryCacheTime(0);
    } catch (e) {
      console.warn("Error invalidating cache:", e);
    }
  };

  /* --------------------------------------------------------------- */
  /*  useEffect: Periodic balance refresh (optimized: every 15 seconds) */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const userId = localStorage.getItem("tgs:userId");
    if (!userId) return;

    console.log("🔄 Setting up periodic balance refresh for user:", userId);

    // Fetch balance immediately
    let previousBalance = null;
    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/payments/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-balance", userId }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.wallet) {
            const newBalance = data.wallet.balance || 0;

            // If balance changed, invalidate cache
            if (previousBalance !== null && previousBalance !== newBalance) {
              console.log(
                `💰 Balance changed: ₹${previousBalance} → ₹${newBalance}`,
              );
              invalidateCache(userId);
            }

            previousBalance = newBalance;
            setBalance(newBalance);
          }
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    // Fetch immediately
    fetchBalance();

    // Optimized: Poll every 15 seconds instead of 5 (reduces server load)
    const intervalId = setInterval(fetchBalance, 15000);

    return () => {
      console.log("🔌 Stopping balance refresh");
      clearInterval(intervalId);
    };
  }, []); // Run once on mount

  const fastNavigate = (router, path) => {
    router.push(path);
  };

  /* --------------------------------------------------------------- */
  /*  Modal open state for body scroll lock                         */
  /* --------------------------------------------------------------- */
  const isAnyModalOpen =
    isBalanceModalOpen ||
    isReviewModalOpen ||
    !!connectingCallType ||
    isCallHistoryModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const checkHasSlots = async (astrologerId) => {
  try {
    const res = await fetch(
      `/api/appointments/availability?astrologerId=${astrologerId}`,
      { cache: "no-store" }
    );

    if (!res.ok) return false;

    const data = await res.json();
    return Array.isArray(data?.availability) && data.availability.length > 0;
  } catch (e) {
    console.error("Slot check failed:", astrologerId, e);
    return false;
  }
};

  /* --------------------------------------------------------------- */
  /*  Fetch astrologers + pricing + reviews (PARALLEL LOADING)     */
  /* --------------------------------------------------------------- */
  const fetchAndUpdateAstrologers = async () => {
    try {
      // Step 1: Fetch astrologers and pricing in parallel
      const [astrologersSnap, pricingResponse] = await Promise.all([
        getDocs(collection(db, "astrologers")),
        fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-all-pricing" }),
        }).catch(() => null), // Don't fail if pricing fails
      ]);

      // Process astrologers list
      const list = astrologersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          specialization: d.specialization,
          rating: d.rating || 0,
          reviews: d.reviews || 0,
          experience: d.experience,
          languages: d.languages || ["English"],
          status: d.status || "offline",
          isOnline: d.status === "online",
          bio: d.bio || `Expert in ${d.specialization}`,
          verified: d.verified || false,
          photo: d.avatar || d.photo || d.profilePicture || d.photoURL || null,
          areasOfExpertise: Array.isArray(d.areasOfExpertise)
            ? d.areasOfExpertise
            : Array.isArray(d.specialties)
              ? d.specialties
              : [],
          specialties: Array.isArray(d.specialties)
            ? d.specialties
            : d.specialties
              ? [d.specialties]
              : d.specialization
                ? [d.specialization]
                : [],
        };
      });

      // Process pricing data (if available)
      let pricingMap = {};
      if (pricingResponse && pricingResponse.ok) {
        try {
          const pricingData = await pricingResponse.json();
          if (pricingData.success) {
            pricingData.pricing.forEach(
              (p) => (pricingMap[p.astrologerId] = p),
            );
          }
        } catch (e) {
          console.error("Pricing parse error:", e);
        }
      }

      // Apply pricing to astrologers
      list.forEach((a) => {
        const p = pricingMap[a.id];
        if (p) {
          a.pricing = p;
          a.perMinuteCharge =
            p.pricingType === "per_minute" ? p.finalPrice : null;
        } else {
          a.pricing = { pricingType: "per_minute", finalPrice: 50 };
          a.perMinuteCharge = 50;
        }
      });

      // Optimized: Show astrologers immediately, then check slots in parallel (non-blocking)
      // Update UI immediately with basic data
      setAstrologers(list);
      setFetchingAstrologers(false);

      // Check slots in parallel (non-blocking, updates as they complete)
      Promise.all(
        list.map(async (a) => {
          const hasSlots = await checkHasSlots(a.id);
          setAstrologers(prev => prev.map(ast => 
            ast.id === a.id ? { ...ast, hasSlots } : ast
          ));
          return { ...a, hasSlots };
        })
      ).then(withSlots => {
        // Final update with all slot data
        setAstrologers(withSlots);
      });

      // Step 2: Fetch reviews in parallel batches (optimized for progressive loading)
      // Update UI incrementally as reviews come in
      const BATCH_SIZE = 15; // Increased batch size for faster loading
      const updated = [];

      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (a) => {
            try {
              const res = await fetch(`/api/reviews?astrologerId=${a.id}`, {
                // Add cache to reduce server load
                cache: 'force-cache',
                next: { revalidate: 300 } // Cache for 5 minutes
              });
              const data = await res.json();
              if (res.ok && data.success && data.reviews?.length) {
                const total = data.reviews.reduce((s, r) => s + r.rating, 0);
                const avg = data.reviews.length
                  ? (total / data.reviews.length).toFixed(1)
                  : 0;
                return {
                  ...a,
                  rating: parseFloat(avg),
                  reviews: data.reviews.length,
                };
              }
              return a;
            } catch (e) {
              console.error(`Reviews error for ${a.id}:`, e);
              return a;
            }
          }),
        );
        updated.push(...batchResults);

        // Update UI incrementally for better perceived performance
        // Merge with existing astrologers to preserve slot data
        setAstrologers(prev => {
          const updatedMap = new Map(updated.map(a => [a.id, a]));
          return prev.map(ast => {
            const updatedAst = updatedMap.get(ast.id);
            return updatedAst ? { ...ast, ...updatedAst } : ast;
          });
        });
      }
    } catch (e) {
      console.error("Astrologers fetch error:", e);
      setFetchingAstrologers(false);
    }
  };

  const getSpecializations = (a) => {
    if (Array.isArray(a.specialties)) return a.specialties;
    if (Array.isArray(a.specialization)) return a.specialization;
    if (typeof a.specialization === "string") return [a.specialization];
    return [];
  };

  useEffect(() => {
    // Track page view
    trackPageView("/talk-to-astrologer", "Talk to Astrologer");

    // Initial fetch
    fetchAndUpdateAstrologers();
    
    // Optimized: Refresh every 60 seconds instead of 30 (reduces server load)
    const id = setInterval(fetchAndUpdateAstrologers, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSpecialization]);

  // Auto-start call if coming from profile page
  useEffect(() => {
    const profileCallAstrologerId = localStorage.getItem(
      "tgs:profileCallAstrologerId",
    );
    const profileCallType = localStorage.getItem("tgs:profileCallType");

    if (
      profileCallAstrologerId &&
      profileCallType &&
      !connectingCallType &&
      astrologers.length > 0
    ) {
      // Clear the localStorage values immediately to prevent re-triggering
      localStorage.removeItem("tgs:profileCallAstrologerId");
      localStorage.removeItem("tgs:profileCallType");

      // Start the call
      startCall(profileCallType, profileCallAstrologerId);
    }
  }, [astrologers.length]); // Run after astrologers are loaded

  /* --------------------------------------------------------------- */
  /*  Filtering                                                      */
  /* --------------------------------------------------------------- */
  // Memoize filtered astrologers to prevent unnecessary recalculations
  // Memoize filtered astrologers to prevent unnecessary recalculations
  const filteredAstrologers = useMemo(() => {
    return astrologers.filter((a) => {
      const search = searchTerm.toLowerCase();

      const specializations = getSpecializations(a).map((s) => s.toLowerCase());

      const matchesSearch =
        a.name?.toLowerCase().includes(search) ||
        specializations.some((s) => s.includes(search));

      const matchesFilter =
        !filterSpecialization ||
        specializations.includes(filterSpecialization.toLowerCase());

      return matchesSearch && matchesFilter;
    });
  }, [astrologers, searchTerm, filterSpecialization]);

  // Memoize pagination calculations
  const totalPages = useMemo(() => 
    Math.ceil(filteredAstrologers.length / ITEMS_PER_PAGE),
    [filteredAstrologers.length]
  );

  const paginatedAstrologers = useMemo(() => 
    filteredAstrologers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE,
    ),
    [filteredAstrologers, currentPage]
  );

  useEffect(() => {
    console.log("Astrologers loaded:", astrologers.length);
    console.log("Filtered astrologers:", filteredAstrologers.length);
  }, [astrologers, filteredAstrologers]);

  /* --------------------------------------------------------------- */
  /*  Voice / Video call handlers                                    */
  /* --------------------------------------------------------------- */
  const startCall = async (type, astrologerId) => {
    setLoading(true);

    // Track call initiation
    trackActionStart("astrologer_booking");
    trackEvent("call_initiated", {
      call_type: type,
      astrologer_id: astrologerId,
    });

    try {
      const userId = localStorage.getItem("tgs:userId");
      if (!userId) {
        trackActionAbandon("astrologer_booking", "not_logged_in");
        trackEvent("call_failed", { reason: "not_logged_in", call_type: type });
        alert("Please log in first.");
        router.push("/auth/user");
        setLoading(false);
        return;
      }

      /* ---- Balance check ---- */
      const balRes = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate-balance",
          userId,
          astrologerId,
        }),
      });
      if (balRes.ok) {
        const { success, validation } = await balRes.json();
        if (success && !validation.hasBalance) {
          trackActionAbandon("astrologer_booking", "insufficient_balance");
          trackEvent("call_failed", {
            reason: "insufficient_balance",
            call_type: type,
            required: validation.minimumRequired,
            available: validation.currentBalance,
          });
          setBalanceMessage(
            `Insufficient balance. Need ₹${validation.minimumRequired}, you have ₹${validation.currentBalance}.`,
          );
          setIsBalanceModalOpen(true);
          setLoading(false);
          return;
        }
      }

      setConnectingCallType(type);
      setConnectingAstrologerId(astrologerId);

      /* ---- Availability ---- */
      const statusRes = await fetch(
        `/api/astrologer/status?astrologerId=${astrologerId}`,
      );
      const { success, status } = await statusRes.json();

      if (!success) {
        trackActionAbandon("astrologer_booking", "status_check_failed");
        throw new Error("Cannot check astrologer status.");
      }
      if (status === "offline") {
        trackActionAbandon("astrologer_booking", "astrologer_offline");
        trackEvent("call_failed", {
          reason: "astrologer_offline",
          call_type: type,
        });
        throw new Error("Astrologer is offline.");
      }
      if (status === "busy" && !confirm("Astrologer is busy. Join queue?")) {
        trackActionAbandon("astrologer_booking", "user_declined_queue");
        trackEvent("call_cancelled", {
          reason: "user_declined_queue",
          call_type: type,
        });
        setConnectingCallType(null);
        setConnectingAstrologerId(null);
        setLoading(false);
        return;
      }

      /* ---- Create call ---- */
      const callRes = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-call",
          astrologerId,
          userId,
          callType: type,
        }),
      });
      if (!callRes.ok) {
        trackActionAbandon("astrologer_booking", "call_creation_failed");
        throw new Error("Failed to create call.");
      }
      const { call } = await callRes.json();

      localStorage.setItem("tgs:callId", call.id);
      localStorage.setItem("tgs:currentCallId", call.id);
      localStorage.setItem("tgs:astrologerId", astrologerId);

      // Track call created
      trackEvent("call_created", {
        call_id: call.id,
        call_type: type,
        astrologer_id: astrologerId,
        status: call.status,
      });

      /* ---- Billing will start automatically when both participants join and audio track is published ---- */
      /* ---- This is handled by backend via LiveKit webhooks - no frontend action needed ---- */
      console.log(
        "Call created. Billing will start automatically when call connects.",
      );

      /* ---- REAL-TIME listener for INSTANT status updates ---- */
      const callDocRef = doc(db, "calls", call.id);
      let unsubscribe = null;
      let timeoutId = null;

      console.log("📡 Setting up real-time listener for call:", call.id);

      // Use Firestore real-time listener for instant updates (no 2s delay!)
      unsubscribe = onSnapshot(
        callDocRef,
        async (snapshot) => {
          if (!snapshot.exists()) {
            console.error("❌ Call document no longer exists");
            return;
          }

          const c = snapshot.data();
          console.log(`📡 Real-time update - Call status: ${c.status}`, c);

          if (c?.status === "active" && c?.roomName) {
            console.log(
              "✅ Call accepted by astrologer! Joining room:",
              c.roomName,
            );

            // Clean up listener and timeout
            if (unsubscribe) unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);

            // Track call accepted
            trackEvent("call_accepted", {
              call_id: call.id,
              call_type: type,
              astrologer_id: astrologerId,
            });

            const sessRes = await fetch("/api/livekit/create-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                astrologerId,
                userId,
                callId: call.id,
                roomName: c.roomName,
                callType: type,
                role: "user",
                displayName: "User",
              }),
            });
            if (sessRes.ok) {
              const { roomName } = await sessRes.json();

              // Track successful call connection
              trackActionComplete("astrologer_booking", {
                call_id: call.id,
                call_type: type,
                astrologer_id: astrologerId,
                room_name: roomName,
                success: true,
              });
              trackEvent("call_connected", {
                call_id: call.id,
                call_type: type,
                astrologer_id: astrologerId,
              });

              setConnectingCallType(null);
              setConnectingAstrologerId(null);
              setLoading(false);

              console.log("🚀 Redirecting user to call room:", roomName);
              router.push(
                type === "video"
                  ? `/talk-to-astrologer/room/${roomName}`
                  : `/talk-to-astrologer/voice/${roomName}`,
              );
            } else {
              trackActionAbandon(
                "astrologer_booking",
                "session_creation_failed",
              );
              trackEvent("call_failed", {
                reason: "session_creation_failed",
                call_id: call.id,
              });
              setConnectingCallType(null);
              setConnectingAstrologerId(null);
              setLoading(false);
              alert("Failed to join room.");
            }
          } else if (c?.status === "rejected") {
            console.log("❌ Call rejected by astrologer");

            // Clean up listener and timeout
            if (unsubscribe) unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);

            // Track call rejected
            trackActionAbandon("astrologer_booking", "astrologer_rejected");
            trackEvent("call_rejected", {
              call_id: call.id,
              call_type: type,
              astrologer_id: astrologerId,
            });

            await fetch("/api/billing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel-call", callId: call.id }),
            }).catch(() => {});
            setCallStatus("rejected");
            setTimeout(() => {
              setConnectingCallType(null);
              setConnectingAstrologerId(null);
              setCallStatus("connecting");
              setLoading(false);
            }, 2000);
          } else if (c?.status === "cancelled") {
            console.log("⚠️ Call cancelled");

            // Clean up listener and timeout
            if (unsubscribe) unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);

            // Track call cancelled
            trackActionAbandon("astrologer_booking", "user_cancelled");
            trackEvent("call_cancelled", {
              call_id: call.id,
              call_type: type,
              astrologer_id: astrologerId,
            });

            setConnectingCallType(null);
            setConnectingAstrologerId(null);
            setCallStatus("connecting");
            setLoading(false);
          }
        },
        (error) => {
          console.error("❌ Error in call status listener:", error);
        },
      );

      // Timeout after 60 seconds
      timeoutId = setTimeout(() => {
        console.log("⏱️ Call timed out - astrologer not responding");

        // Clean up listener
        if (unsubscribe) unsubscribe();

        // Track timeout
        trackActionAbandon("astrologer_booking", "astrologer_timeout");
        trackEvent("call_timeout", {
          call_id: call.id,
          call_type: type,
          astrologer_id: astrologerId,
        });

        fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel-call", callId: call.id }),
        }).catch(() => {});
        setConnectingCallType(null);
        setConnectingAstrologerId(null);
        setLoading(false);
        alert("Astrologer not responding.");
      }, 60_000);
    } catch (e) {
      console.error(e);
      trackActionAbandon("astrologer_booking", e.message || "unknown_error");
      trackEvent("call_error", {
        error: e.message || "unknown_error",
        call_type: type,
        astrologer_id: astrologerId,
      });
      setConnectingCallType(null);
      setConnectingAstrologerId(null);
      setLoading(false);
      alert(e.message || "Call failed.");
    }
  };

  const handleVoiceCall = (id) => startCall("voice", id);
  const handleVideoCall = (id) => startCall("video", id);

  /* --------------------------------------------------------------- */
  /*  Call History helpers                                           */
  /* --------------------------------------------------------------- */

  // Background fetch to update cache without blocking UI
  const fetchCallHistoryInBackground = async (userId, cacheKey) => {
    try {
      const [recentCallsResponse, statsResponse, balanceResponse] =
        await Promise.all([
          fetch(`/api/calls/history?userId=${userId}&limit=20`),
          fetch(`/api/user/stats?userId=${userId}`),
          fetch("/api/payments/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get-balance", userId }),
          }),
        ]);

      let recentCalls = [];
      if (recentCallsResponse.ok) {
        try {
          const data = await recentCallsResponse.json();
          if (data.success && data.history) {
            recentCalls = data.history;
          }
        } catch (jsonError) {
          console.error("Error parsing call history response:", jsonError);
        }
      }

      let total = 0;
      let monthly = 0;
      if (statsResponse.ok) {
        try {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            total = statsData.totalSpending || 0;
            monthly = statsData.monthlySpending || 0;
          }
        } catch (jsonError) {
          console.error("Error parsing stats response:", jsonError);
        }
      }

      let balance = 0;
      if (balanceResponse.ok) {
        try {
          const balanceData = await balanceResponse.json();
          if (balanceData.success && balanceData.wallet) {
            balance = balanceData.wallet.balance || 0;
          }
        } catch (jsonError) {
          console.error("Error parsing balance response:", jsonError);
        }
      }

      // Update cache silently
      const cacheData = {
        recentCalls,
        totalSpending: total,
        monthlySpending: monthly,
        balance,
        timestamp: Date.now(),
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (e) {
          console.warn("Error updating cache:", e);
        }
      }

      // Update state if modal is still open
      setCallHistory(recentCalls);
      setTotalSpending(total);
      setMonthlySpending(monthly);
      setBalance(balance);
    } catch (error) {
      console.error("Error in background fetch:", error);
    }
  };

  const fetchCallHistory = async (forceRefresh = false) => {
    const userId = localStorage.getItem("tgs:userId");
    if (!userId) {
      alert("Please log in to view call history.");
      router.push("/auth/user");
      return;
    }

    // Check localStorage cache first (30 second cache for instant loading)
    // SKIP cache completely when forceRefresh=true (e.g., when opening modal)
    const cacheKey = `tgs:callHistory:${userId}`;
    const cacheTimeout = 30 * 1000; // 30 seconds (reduced from 10 minutes)
    const now = Date.now();

    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData.timestamp && now - cacheData.timestamp < cacheTimeout) {
            // Use cached data for instant display
            setCallHistory(cacheData.recentCalls || []);
            setTotalSpending(cacheData.totalSpending || 0);
            setMonthlySpending(cacheData.monthlySpending || 0);
            setBalance(cacheData.balance || 0);
            // Still fetch in background to update cache
            fetchCallHistoryInBackground(userId, cacheKey);
            return;
          }
        }
      } catch (e) {
        console.warn("Error reading cache:", e);
      }
    }

    // Check in-memory cache as fallback
    if (
      !forceRefresh &&
      callHistoryCache &&
      callHistoryCacheTime &&
      now - callHistoryCacheTime < cacheTimeout
    ) {
      setCallHistory(callHistoryCache.recentCalls);
      setTotalSpending(callHistoryCache.totalSpending);
      setMonthlySpending(callHistoryCache.monthlySpending);
      setBalance(callHistoryCache.balance);
      return;
    }

    setLoadingCallHistory(true);
    try {
      // STRATEGY: Fetch ALL calls once, then slice first 20 for "Recent Calls"
      // This ensures both "Recent Calls" and "View All" use the same fresh data
      const timestamp = Date.now();
      const [allCallsResponse, statsResponse, balanceResponse] =
        await Promise.all([
          fetch(
            `/api/calls/history?userId=${userId}&limit=1000&_t=${timestamp}`,
            {
              cache: "no-store",
              headers: { "Cache-Control": "no-cache" },
            },
          ), // Fetch ALL calls (up to 1000)
          fetch(`/api/user/stats?userId=${userId}&_t=${timestamp}`, {
            cache: "no-store",
          }), // Optimized spending stats from cache
          fetch("/api/payments/wallet", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({ action: "get-balance", userId }),
            cache: "no-store",
          }),
        ]);

      // Process ALL calls - store everything
      let allCalls = [];
      if (allCallsResponse.ok) {
        try {
          const data = await allCallsResponse.json();
          if (data.success && data.history) {
            allCalls = data.history;
            console.log(`📞 Fetched ${allCalls.length} total calls from API`);
            setCallHistory(allCalls); // Store ALL calls
          } else {
            setCallHistory([]);
          }
        } catch (jsonError) {
          console.error("❌ Error parsing call history response:", jsonError);
          setCallHistory([]);
        }
      } else {
        console.error(
          "❌ Call history API error:",
          allCallsResponse.status,
          allCallsResponse.statusText,
        );
        setCallHistory([]);
      }

      const recentCalls = allCalls; // For cache, we store all

      // Process spending stats (from optimized API)
      let total = 0;
      let monthly = 0;
      if (statsResponse.ok) {
        try {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            total = statsData.totalSpending || 0;
            monthly = statsData.monthlySpending || 0;
          }
        } catch (jsonError) {
          console.error("❌ Error parsing stats response:", jsonError);
        }
      } else {
        console.error(
          "❌ Stats API error:",
          statsResponse.status,
          statsResponse.statusText,
        );
      }

      setTotalSpending(total);
      setMonthlySpending(monthly);

      // Process balance
      if (balanceResponse.ok) {
        try {
          const balanceData = await balanceResponse.json();
          if (balanceData.success && balanceData.wallet) {
            const currentBalance = balanceData.wallet.balance || 0;
            setBalance(currentBalance);

            // Update both localStorage and in-memory cache
            const cacheData = {
              recentCalls,
              totalSpending: total,
              monthlySpending: monthly,
              balance: currentBalance,
              timestamp: now,
            };
          } else {
            console.warn("⚠️ Balance API returned success but no wallet data");
          }
        } catch (jsonError) {
          console.error("❌ Error parsing balance response:", jsonError);
          console.error("Response was:", await balanceResponse.text());
        }
      } else {
        console.error(
          "❌ Balance API error:",
          balanceResponse.status,
          balanceResponse.statusText,
        );
        try {
          const errorText = await balanceResponse.text();
          console.error("Error response:", errorText);
        } catch (e) {
          console.error("Could not read error response");
        }
        // Keep existing balance if API fails
      }

      // Update cache even if some APIs failed
      const cacheData = {
        recentCalls,
        totalSpending: total,
        monthlySpending: monthly,
        balance: balance || 0,
        timestamp: now,
      };

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (e) {
          console.warn("Error saving to localStorage:", e);
        }
      }

      // Update in-memory cache
      setCallHistoryCache(recentCalls);
      setCallHistoryCacheTime(now);
    } catch (error) {
      console.error("Error fetching call history:", error);
      setCallHistory([]);
      setTotalSpending(0);
      setMonthlySpending(0);
    } finally {
      setLoadingCallHistory(false);
    }
  };

  const calculateMonthlySpending = (calls) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);

    return calls
      .filter((call) => {
        try {
          const callDate = new Date(call.startedAt);
          // Ensure it's within the current month
          return (
            callDate >= monthStart &&
            callDate.getMonth() === currentMonth &&
            callDate.getFullYear() === currentYear
          );
        } catch (error) {
          return false;
        }
      })
      .reduce((sum, call) => sum + (call.cost || 0), 0);
  };

  const handleOpenCallHistory = () => {
    setIsCallHistoryModalOpen(true);
    setShowAllCalls(false); // Reset to recent calls view

    // CRITICAL: Clear ALL cached data immediately
    const userId = localStorage.getItem("tgs:userId");
    if (userId) {
      invalidateCache(userId);
    }

    // Clear state immediately to show loading
    setCallHistory([]);
    setLoadingCallHistory(true);

    // Force a small delay to ensure state clears before fetch
    setTimeout(() => {
      fetchCallHistory(true); // Force refresh, bypass all caches
    }, 10);
  };

  const handleLoadAllCalls = async () => {
    // No need to fetch again - we already have all calls loaded
    // Just toggle the view to show all instead of recent 20
    setShowAllCalls(true);
  };

  // Get status color theme
  const getStatusColor = (status) => {
    const normalizedStatus = (status || "completed").toLowerCase();
    switch (normalizedStatus) {
      case "completed":
        return {
          bg: "rgba(16, 185, 129, 0.15)", // green-500 with 15% opacity - more visible
          border: "rgba(16, 185, 129, 0.3)",
          text: "#059669", // green-600
        };
      case "cancelled":
        return {
          bg: "rgba(245, 158, 11, 0.15)", // amber-500 with 15% opacity - more visible
          border: "rgba(245, 158, 11, 0.3)",
          text: "#d97706", // amber-600
        };
      case "rejected":
        return {
          bg: "rgba(239, 68, 68, 0.15)", // red-500 with 15% opacity - more visible
          border: "rgba(239, 68, 68, 0.3)",
          text: "#dc2626", // red-600
        };
      default:
        return {
          bg: "rgba(156, 163, 175, 0.1)", // gray-400 with 10% opacity
          border: "rgba(156, 163, 175, 0.2)",
          text: "#6b7280", // gray-500
        };
    }
  };

  /* --------------------------------------------------------------- */
  /*  Review helpers                                                 */
  /* --------------------------------------------------------------- */
  const handleOpenReview = (astrologer) => {
    if (!!connectingCallType) return; // Prevent opening during connecting
    const userId = localStorage.getItem("tgs:userId");
    if (!userId) {
      alert("Please log in to leave a review.");
      router.push("/auth/user");
      return;
    }
    setSelectedAstrologer(astrologer);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async ({
    astrologerId,
    userId,
    rating,
    comment,
  }) => {
    // Track review submission
    trackEvent("review_submit_attempt", {
      astrologer_id: astrologerId,
      rating,
    });

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ astrologerId, userId, rating, comment }),
    });
    if (!res.ok) {
      trackEvent("review_submit_failed", {
        astrologer_id: astrologerId,
        error: "api_error",
      });
      throw new Error("Failed to submit review");
    }
    const data = await res.json();
    if (!data.success) {
      trackEvent("review_submit_failed", {
        astrologer_id: astrologerId,
        error: data.message,
      });
      throw new Error(data.message);
    }

    // Track successful review submission
    trackEvent("review_submit_success", {
      astrologer_id: astrologerId,
      rating,
      has_comment: !!comment,
    });
  };

  const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

        /* ---------- ACCORDION SECTION ---------- */
      const Section = ({ title, content, children }) => {
        const [open, setOpen] = useState(false);
    
        return (
          <div
            style={{
              marginBottom: "1.25rem",
              border: "1px solid rgba(212, 175, 55, 0.25)",
              borderRadius: "1rem",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))",
              overflow: "hidden",
              transition: "all 0.3s ease",
            }}
          >
            {/* HEADER */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <h2
  className="
    font-serif
    text-base sm:text-lg
    font-medium
    text-gray-800
    m-0
  "
  style={{
    fontFamily: "'Georgia','Times New Roman',serif",
  }}
>
  {title}
</h2>

    
              <span
                style={{
                  fontSize: "1.25rem",
                  color: "#b45309",
                  transform: open ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              >
                +
              </span>
            </button>
    
            {/* CONTENT */}
            {open && (
              <div
                style={{
                  padding: "0 1.25rem 1.25rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#374151",
                    lineHeight: 1.7,
                    marginBottom: "0.75rem",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {children}
                </p>
    
                <ul
                  style={{
                    paddingLeft: "1.25rem",
                    fontSize: "0.85rem",
                    color: "#374151",
                    lineHeight: 1.8,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {content.map((item, i) => (
                    <li key={i}>✔ {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      };  

  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */

  return (
    <>
      {/* Connection notification */}
      <Suspense fallback={null}>
        <CallConnectingNotification
        isOpen={!!connectingCallType}
        status={callStatus}
        type={connectingCallType}
        astrologerId={connectingAstrologerId}
        onTimeout={() => {
          setConnectingCallType(null);
          setConnectingAstrologerId(null);
          setCallStatus("connecting");
          setLoading(false);
          alert("Connection timed out.");
        }}
        onCancel={async () => {
          const callId = localStorage.getItem("tgs:currentCallId");
          if (callId) {
            try {
              // Cancel the call on backend
              await fetch("/api/calls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update-call-status",
                  callId,
                  status: "cancelled",
                }),
              });
              // Cancel billing
              await fetch("/api/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel-call", callId }),
              });
            } catch (error) {
              console.error("Error cancelling call:", error);
            }
            // Clean up local storage
            localStorage.removeItem("tgs:callId");
            localStorage.removeItem("tgs:currentCallId");
            localStorage.removeItem("tgs:astrologerId");
          }
          setConnectingCallType(null);
          setConnectingAstrologerId(null);
          setCallStatus("connecting");
          setLoading(false);
        }}
        />
      </Suspense>

      {fetchingAstrologers ? (
        <PageLoading type="astrologer" message="Loading astrologers..." />
      ) : (
        <div
          className="min-h-screen pt-0 md:pt-2 pb-2 md:pb-6 px-4 md:px-6 lg:px-8"
          style={{
            background: "#f9fafb",
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
            {/* Header */}
            <header
              className="header"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "0.1rem",
              }}
            >
              <h1 className="title">{t.talkToAstrologer.title}</h1>
              <p className="subtitle">{t.talkToAstrologer.subtitle}</p>
            </header>

            {/* Search + Filter */}
            <div
              className="card search-filter-card"
              style={{ marginTop: "1.5rem", padding: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* Search + Filter Side by Side - Responsive */}
                <div
                  className="search-filter-container"
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "stretch",
                    flexDirection: "row",
                  }}
                >
                  {/* Search Bar */}
                  <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                    <Search
                      style={{
                        position: "absolute",
                        left: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--color-gold)",
                        zIndex: 1,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search astrologer or specialization..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={!!connectingCallType}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem 0.75rem 2.5rem",
                        border: "1px solid var(--color-gray-300)",
                        borderRadius: "0.75rem",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "var(--transition-fast)",
                        opacity: !!connectingCallType ? 0.5 : 1,
                        pointerEvents: !!connectingCallType ? "none" : "auto",
                      }}
                      onFocus={(e) => {
                        if (!!connectingCallType) return;
                        e.target.style.borderColor = "var(--color-gold)";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(212, 175, 55, 0.2)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--color-gray-300)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div
                    className="filter-dropdown-wrapper"
                    style={{
                      position: "relative",
                      minWidth: "16rem",
                      maxWidth: "16rem",
                      width: "16rem",
                    }}
                  >
                    <Filter
                      style={{
                        position: "absolute",
                        left: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--color-gold)",
                        zIndex: 1,
                      }}
                    />
                    <select
                      value={filterSpecialization}
                      onChange={(e) => setFilterSpecialization(e.target.value)}
                      disabled={!!connectingCallType}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem 0.75rem 2.5rem",
                        border: "1px solid var(--color-gray-300)",
                        borderRadius: "0.75rem",
                        fontSize: "1rem",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "1.2em",
                        outline: "none",
                        opacity: !!connectingCallType ? 0.5 : 1,
                        pointerEvents: !!connectingCallType ? "none" : "auto",
                      }}
                      onFocus={(e) => {
                        if (!!connectingCallType) return;
                        e.target.style.borderColor = "var(--color-gold)";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(212, 175, 55, 0.2)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--color-gray-300)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <option value="">All Specializations</option>
                      <option value="Vedic Astrology">Vedic Astrology</option>
                      <option value="Tarot Reading">Tarot Reading</option>
                      <option value="Numerology">Numerology</option>
                      <option value="Palmistry">Palmistry</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Astrologers Card Container */}
            <div style={{ marginTop: "1.5rem" }} className="lg:p-6">
              {/* Call History + My Appointments Buttons */}
              <div
                className="action-buttons-container"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => router.push("/appointments")}
                  className="btn btn-primary"
                  disabled={!!connectingCallType}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    padding: "0.5rem 1rem",
                    background:
                      "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!connectingCallType) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 20px rgba(212, 175, 55, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(212, 175, 55, 0.3)";
                  }}
                >
                  <CalendarCheck
                    style={{
                      width: "1rem",
                      height: "1rem",
                    }}
                  />
                  My Appointments
                </button>
                <button
                  onClick={handleOpenCallHistory}
                  className="btn btn-primary"
                  disabled={!!connectingCallType}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    padding: "0.5rem 1rem",
                    background:
                      "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!connectingCallType) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 20px rgba(212, 175, 55, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(212, 175, 55, 0.3)";
                  }}
                >
                  <Clock
                    style={{
                      width: "1rem",
                      height: "1rem",
                    }}
                  />
                  Call History
                </button>
              </div>

              {/* Loading skeletons – Responsive grid */}
              {fetchingAstrologers && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="card"
                      style={{
                        padding: "1.5rem",
                        animation:
                          "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "4rem",
                            height: "4rem",
                            background: "var(--color-gray-200)",
                            borderRadius: "50%",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              height: "1.25rem",
                              background: "var(--color-gray-200)",
                              borderRadius: "0.25rem",
                              width: "8rem",
                              marginBottom: "0.5rem",
                            }}
                          />
                          <div
                            style={{
                              height: "1rem",
                              background: "var(--color-gray-200)",
                              borderRadius: "0.25rem",
                              width: "6rem",
                            }}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          height: "1rem",
                          background: "var(--color-gray-200)",
                          borderRadius: "0.25rem",
                          marginBottom: "0.5rem",
                        }}
                      />
                      <div
                        style={{
                          height: "1rem",
                          background: "var(--color-gray-200)",
                          borderRadius: "0.25rem",
                          width: "75%",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!fetchingAstrologers && filteredAstrologers.length > 0 && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  style={{
                    opacity: !!connectingCallType ? 0.5 : 1,
                    pointerEvents: !!connectingCallType ? "none" : "auto",
                  }}
                >
                  {paginatedAstrologers.map((a) => (
                    <Link
                      href={`/account/astrologer/${a.id}`}
                      key={a.id}
                      className="card group"
                      style={{
                        padding: "1.5rem",
                        transition: "var(--transition-smooth)",
                        cursor: !!connectingCallType ? "default" : "pointer",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        textDecoration: "none",
                        color: "inherit",
                        pointerEvents: !!connectingCallType ? "none" : "auto",
                      }}
                      onMouseEnter={(e) => {
                        if (!!connectingCallType) return;
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "var(--shadow-xl), var(--shadow-glow)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "var(--shadow-lg), var(--shadow-glow)";
                      }}
                    >
                      {/* Top Section: Left (Avatar + Info) and Right (Rating + Buttons) */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "1rem",
                          marginBottom: "1rem",
                          position: "relative",
                          zIndex: 20,
                        }}
                      >
                        {/* Left Side: Avatar + Name + Spec + Experience */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.75rem",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {/* Avatar + Status Indicator Dot */}
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div
                              style={{
                                width: "4rem",
                                height: "4rem",
                                background: a.photo
                                  ? `url(${a.photo})`
                                  : "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "1.125rem",
                                textTransform: "uppercase",
                                border: a.photo ? "2px solid rgba(212, 175, 55, 0.3)" : "none",
                                boxShadow: a.photo ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none",
                                overflow: "hidden",
                              }}
                            >
                              {!a.photo && (
                                a.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              )}
                            </div>
                            {/* Status Indicator Dot - properly aligned at avatar */}
                            {(a.online || a.isOnline) && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "2px",
                                  right: "2px",
                                  width: "0.875rem",
                                  height: "0.875rem",
                                  borderRadius: "50%",
                                  border: "2.5px solid white",
                                  background: "#10b981",
                                  zIndex: 10,
                                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                                }}
                              />
                            )}
                          </div>

                          {/* Name, Spec, Experience */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                              style={{
                                fontSize: "1.125rem",
                                fontWeight: 400,
                                color: "#1f2937",
                                margin: 0,
                                marginBottom: "0.25rem",
                                fontFamily: "var(--font-heading)",
                                lineHeight: 1.3,
                              }}
                              title={a.name}
                            >
                              {a.name
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1).toLowerCase(),
                                )
                                .join(" ")}
                            </h3>
                            <p
                              style={{
                                fontSize: "0.8125rem",
                                fontWeight: 500,
                                color: "var(--color-indigo)",
                                margin: "0 0 0.125rem 0",
                                fontFamily: "var(--font-body)",
                              }}
                              title={a.specialization ?? "Astrology"}
                            >
                              {a.specialization ?? "Astrology"}
                            </p>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                margin: "0",
                                fontWeight: 400,
                              }}
                            >
                              {a.experience ?? "Experienced in astrology"}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Rating + Review Button + Price */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: "0.5rem",
                            flexShrink: 0,
                          }}
                        >
                          {/* Rating */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            <Star
                              style={{
                                width: "0.875rem",
                                height: "0.875rem",
                                fill: "#f59e0b",
                                color: "#f59e0b",
                              }}
                            />
                            <span>{a.rating ?? 4.5}</span>
                            <span
                              style={{
                                color: "#6b7280",
                                fontWeight: 400,
                                marginLeft: "0.125rem",
                              }}
                            >
                              ({a.reviews ?? 2})
                            </span>
                          </div>

                          {/* Review Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenReview(a);
                            }}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.625rem",
                              height: "auto",
                              border: "1px solid #d1d5db",
                              borderRadius: "0.375rem",
                              background: "white",
                              color: "#374151",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Review
                          </button>

                          {/* Price - moved to where ONLINE was */}
                          {a.perMinuteCharge && (
                            <div
                              style={{
                                fontSize: "0.9375rem",
                                fontWeight: 700,
                                color: "#059669",
                              }}
                            >
                              ₹{a.perMinuteCharge}/min
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle Section: Bio */}
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontFamily: "var(--font-body)",
                          color: "#4b5563",
                          marginBottom: "0.75rem",
                          lineHeight: 1.5,
                          position: "relative",
                          zIndex: 20,
                        }}
                      >
                        {a.bio ??
                          `Experienced astrologer providing guidance and insights.`}
                      </p>

                      {/* Languages */}
                      {a.languages?.length > 0 && (
                        <div
                          style={{
                            marginBottom: "0.75rem",
                            position: "relative",
                            zIndex: 20,
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#4b5563",
                              marginBottom: "0.5rem",
                            }}
                          >
                            Speaks:
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.375rem",
                            }}
                          >
                            {a.languages.map((l, i) => (
                              <span
                                key={l + i}
                                style={{
                                  padding: "0.25rem 0.625rem",
                                  background: "#E0E7FF",
                                  color: "#4F46E5",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  borderRadius: "9999px",
                                }}
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-auto flex gap-2 relative z-30">
                        {/* Schedule Button */}
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!a.hasSlots) return;
                            router.push(`/appointments/book/${a.id}`);
                          }}
                          disabled={!a.hasSlots || !!connectingCallType}
                          className={`
      flex-1 h-11 px-4
      flex items-center justify-center gap-2
      rounded-md font-semibold text-sm
      transition-all duration-200
      ${
        a.hasSlots
          ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg"
          : "bg-gray-200 text-gray-400 cursor-not-allowed"
      }
    `}
                          title={
                            a.hasSlots
                              ? "Schedule Appointment"
                              : "No slots available"
                          }
                        >
                          <CalendarCheck className="w-4 h-4" />
                          {a.hasSlots ? "Schedule" : "No Slots"}
                        </Button>

                        {/* Voice Call Button */}
                        <Button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleVoiceCall(a.id);
  }}
  disabled={!a.isOnline || loading || !!connectingCallType}
  variant="outline"
  className="
    btn
  "
  title={a.isOnline ? "Voice Call" : "Offline"}
>
  {loading && connectingCallType === "voice" ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <Phone className="w-4 h-4" />
  )}
</Button>

                        {/* Video Call Button */}
<Button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleVideoCall(a.id);
  }}
  disabled={!a.isOnline || loading || !!connectingCallType}
  variant="outline"
  className="
    btn
  "
>
  {loading && connectingCallType === "video" ? (
    <Loader2 className="w-4 h-4 text-gray-800 animate-spin" />
  ) : (
    <Video className="w-4 h-4 text-gray-800 stroke-[2]" />
  )}
</Button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "2rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          minWidth: "2.5rem",
                          fontWeight: page === currentPage ? 700 : 500,
                        }}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!fetchingAstrologers && filteredAstrologers.length === 0 && (
                <div style={{ textAlign: "center", padding: "4rem 0" }}>
                  <div
                    style={{
                      width: "6rem",
                      height: "6rem",
                      background: "var(--color-gray-100)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1rem auto",
                    }}
                  >
                    <Search
                      style={{
                        width: "3rem",
                        height: "3rem",
                        color: "var(--color-gray-400)",
                      }}
                    />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "var(--color-gray-700)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    No Astrologers Found
                  </h3>
                  <p
                    style={{
                      color: "var(--color-gray-500)",
                      maxWidth: "36rem",
                      margin: "0 auto",
                    }}
                  >
                    Try adjusting your search or filter to find the right
                    astrologer for you.
                  </p>
                </div>
              )}
            </div>

           {/* TALK TO ASTROLOGER – ACCORDION CARD */}
<div
  style={{
    marginTop: "2rem",
    width: "100%",
    maxWidth: "90rem",
    marginLeft: "auto",
    marginRight: "auto",
  }}
>
  <div
    className="card shadow-xl border"
    style={{
      background: "#ffffff",
      borderColor: "#eaeaea",
      maxWidth: "100%",
      boxShadow:
        "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
    }}
  >
    {/* HERO */}
    <div
      style={{
        borderBottom: "2px solid rgba(212,175,55,0.25)",
        paddingBottom: "1.75rem",
        marginBottom: "1.75rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "'Georgia','Times New Roman',serif",
          fontSize: "32px",
          fontWeight: 500,
          color: "#111827",
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        Talk to Expert Astrologers Online
      </h1>

      <p className="text-sm mt-1 text-slate-600 max-w-3xl mx-auto">
        Connect with verified astrologers for live voice or video consultations.
        Get personalized guidance based on your birth chart, planetary periods,
        and current life situation.
      </p>

      <div className="flex justify-center mt-4 gap-3">
        <button className="btn-primary" onclick={scrollToTop}>
          Start Consultation
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/new-predictions")}
        >
          Get AI predictions
        </button>
      </div>
    </div>

    {/* ACCORDIONS */}
    <div style={{ padding: 0 }}>
      <Section
  title="What Does a Live Astrologer Consultation Involve?"
  content={[
    "One-to-one private consultation",
    "Based on your birth details and questions",
    "Voice or video interaction",
    "Real-time personalized guidance",
  ]}
>
  A live astrologer consultation is a private, one-to-one session where you
  directly interact with an experienced astrologer through voice or video
  call. Unlike automated predictions, the astrologer listens to your concerns,
  studies your birth chart, and provides guidance tailored specifically to your
  situation.

  This format allows deeper discussion, follow-up questions, and practical
  clarity that cannot be achieved through generic reports.
</Section>

<Section
  title="How Our Astrologers Analyze Your Questions"
  content={[
    "Birth chart (kundli) analysis",
    "Planetary positions and house placement",
    "Running dasha and transit influence",
    "Question-specific interpretation",
  ]}
>
  During a consultation, astrologers analyze your kundli using traditional
  Vedic astrology principles. Planetary positions, house lords, dashas, and
  current transits are examined to understand the root cause of your concern.

  Whether the question relates to career, marriage, finances, or timing, the
  analysis is focused on practical outcomes rather than abstract predictions.
</Section>

<Section
  title="Topics You Can Discuss With an Astrologer"
  content={[
    "Career growth and job changes",
    "Marriage and relationship guidance",
    "Business and financial decisions",
    "Health and stress-related concerns",
    "Important life timings and choices",
  ]}
>
  Live astrologer consultations are suitable for most life situations where
  clarity and timing matter. Users commonly seek guidance for relationships,
  career decisions, marriage compatibility, financial planning, and major life
  transitions.

  You are free to ask follow-up questions and explore multiple areas during the
  session.
</Section>

<Section
  title="Voice Call vs Video Call – What’s the Difference?"
  content={[
    "Voice call for focused discussion",
    "Video call for face-to-face interaction",
    "Same astrological analysis in both",
    "User choice based on comfort",
  ]}
>
  Both voice and video consultations provide the same level of astrological
  analysis. Voice calls are preferred by users who want quick, distraction-free
  guidance, while video calls offer a more personal, face-to-face experience.

  You can choose the consultation mode that feels most comfortable to you.
</Section>

<Section
  title="Are the Astrologers Verified and Experienced?"
  content={[
    "Background verification",
    "Experience-based onboarding",
    "Specialization-wise selection",
    "User reviews and ratings",
  ]}
>
  All astrologers available on Nirali Live Astro go through a verification
  process before being listed. This includes experience checks, area of
  specialization review, and quality assessment.

  User ratings and reviews further help maintain transparency and trust.
</Section>

<Section
  title="How Pricing and Billing Works for Calls"
  content={[
    "Per-minute transparent pricing",
    "Billing starts only after call connects",
    "Wallet-based payment system",
    "No hidden charges",
  ]}
>
  Astrologer consultations are billed on a per-minute basis. Billing starts
  only when the call is successfully connected and ends automatically when the
  call finishes.

  You can view pricing in advance and manage your wallet balance easily.
</Section>

<Section
  title="Is My Consultation Private and Secure?"
  content={[
    "One-to-one private sessions",
    "Secure call infrastructure",
    "No data shared without consent",
    "Confidential conversation",
  ]}
>
  Your consultation is completely private. Calls are conducted securely, and
  your personal details, birth information, and conversations are not shared
  with anyone.

  Privacy and confidentiality are treated as a core priority.
</Section>


<Section
  title="When Should You Consult an Astrologer?"
  content={[
    "Before major life decisions",
    "During confusing or stressful phases",
    "For clarity on timing and direction",
    "To prepare for upcoming changes",
  ]}
>
  Astrologer consultations are most helpful when you need clarity, direction,
  or timing guidance. Rather than reacting to events, astrology helps you
  prepare and make informed choices.

  Many users consult astrologers proactively to understand upcoming phases and
  avoid unnecessary stress.
</Section>

<div className="text-sm mt-6 text-gray-500 text-center mx-auto max-w-2xl"
 
>
  Astrology does not dictate fixed outcomes. A live consultation provides
  guidance based on planetary patterns and probabilities so you can make better
  decisions.
</div>

    </div>
  </div>
</div>

          </div>

          {/* Balance modal */}
          <Modal
            open={isBalanceModalOpen}
            onClose={() => setIsBalanceModalOpen(false)}
            title="Insufficient Balance"
            style={{ zIndex: 1000 }}
          >
            <div style={{ textAlign: "center", padding: "1.5rem" }}>
              <div
                style={{
                  width: "4rem",
                  height: "4rem",
                  background: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                }}
              >
                <AlertCircle
                  style={{ width: "2rem", height: "2rem", color: "#dc2626" }}
                />
              </div>
              <p
                style={{
                  color: "var(--color-gray-700)",
                  marginBottom: "1.5rem",
                }}
              >
                {balanceMessage}
              </p>
              <button
                onClick={() => {
                  router.push("/wallet");
                  setIsBalanceModalOpen(false);
                }}
                className="btn btn-primary"
                style={{ padding: "0.75rem 2rem" }}
              >
                Recharge Wallet
              </button>
            </div>
          </Modal>

          {/* Review modal - Lazy loaded */}
          {selectedAstrologer && isReviewModalOpen && (
            <Suspense fallback={null}>
              <ReviewModal
                open={isReviewModalOpen}
                onClose={() => {
                  setIsReviewModalOpen(false);
                  setSelectedAstrologer(null);
                }}
                astrologerId={selectedAstrologer.id}
                astrologerName={selectedAstrologer.name}
                onSubmit={handleSubmitReview}
                style={{ zIndex: 1000 }}
              />
            </Suspense>
          )}

          {/* Call History Modal - Lazy loaded */}
          {isCallHistoryModalOpen && (
            <Suspense fallback={null}>
              <Modal
                open={isCallHistoryModalOpen}
                onClose={() => {
                  setIsCallHistoryModalOpen(false);
                  setShowAllCalls(false); // Reset to recent calls view when closing
                }}
                title="Call History & Spending"
                style={{ zIndex: 1000 }}
              >
            <div style={{ padding: "1.5rem" }}>
              {/* Spending Summary */}
              <div
                className="card"
                style={{
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  background:
                    "linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(219, 234, 254, 0.8))",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                  }}
                >
                  {/* Total Spending */}
                  <div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--color-gray-700)",
                        margin: "0 0 0.75rem 0",
                      }}
                    >
                      Total Spending
                    </h3>
                    <p
                      style={{
                        fontSize: "1.875rem",
                        fontWeight: 700,
                        color: "#dc2626",
                        margin: 0,
                      }}
                    >
                      ₹{totalSpending?.toFixed(2) || "0.00"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                        marginTop: "0.5rem",
                        margin: "0.5rem 0 0 0",
                      }}
                    >
                      This month: ₹{monthlySpending?.toFixed(2) || "0.00"}
                    </p>
                  </div>

                  {/* Balance */}
                  <div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--color-gray-700)",
                        margin: "0 0 0.75rem 0",
                      }}
                    >
                      Current Balance
                    </h3>
                    <p
                      style={{
                        fontSize: "1.875rem",
                        fontWeight: 700,
                        color: "#059669",
                        margin: 0,
                      }}
                    >
                      ₹{balance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Call History List */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "var(--color-gray-900)",
                      margin: 0,
                    }}
                  >
                    {showAllCalls ? "All Calls" : "Recent Calls"}
                  </h3>
                  {!showAllCalls && callHistory.length >= 20 && (
                    <button
                      onClick={handleLoadAllCalls}
                      disabled={loadingAllCalls}
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--color-indigo)",
                        background: "transparent",
                        border: "1px solid var(--color-indigo)",
                        borderRadius: "0.5rem",
                        padding: "0.5rem 1rem",
                        cursor: loadingAllCalls ? "not-allowed" : "pointer",
                        opacity: loadingAllCalls ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {loadingAllCalls ? (
                        <>
                          <Loader2
                            style={{
                              width: "1rem",
                              height: "1rem",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                          Loading...
                        </>
                      ) : (
                        "View All"
                      )}
                    </button>
                  )}
                </div>
                {loadingCallHistory ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "3rem",
                    }}
                  >
                    <Loader2
                      style={{
                        width: "2rem",
                        height: "2rem",
                        animation: "spin 1s linear infinite",
                        color: "var(--color-indigo)",
                      }}
                    />
                  </div>
                ) : callHistory.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {(showAllCalls
                      ? callHistory
                      : callHistory.slice(0, 20)
                    ).map((call) => {
                      const statusColor = getStatusColor(call.status);
                      return (
                        <div
                          key={call.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.75rem",
                            background: statusColor.bg,
                            borderRadius: "0.5rem",
                            border: `1px solid ${statusColor.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: "2.5rem",
                                height: "2.5rem",
                                background:
                                  call.type === "video"
                                    ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                                    : "linear-gradient(135deg, #10b981, #059669)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                              }}
                            >
                              {call.type === "video" ? (
                                <Video
                                  style={{
                                    width: "1.25rem",
                                    height: "1.25rem",
                                  }}
                                />
                              ) : (
                                <Phone
                                  style={{
                                    width: "1.25rem",
                                    height: "1.25rem",
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 500,
                                  color: "var(--color-gray-900)",
                                  margin: 0,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={call.astrologerName}
                              >
                                {call.astrologerName || "Unknown Astrologer"}
                              </p>
                              <p
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--color-gray-500)",
                                  margin: "0.25rem 0 0 0",
                                }}
                              >
                                {new Date(call.startedAt).toLocaleString()}
                                {call.duration > 0 &&
                                  (() => {
                                    const minutes = Math.floor(call.duration);
                                    const seconds = Math.round(
                                      (call.duration - minutes) * 60,
                                    );
                                    return ` • ${minutes}:${seconds
                                      .toString()
                                      .padStart(2, "0")}`;
                                  })()}
                              </p>
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              marginLeft: "1rem",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#dc2626",
                                margin: 0,
                              }}
                            >
                              -₹{call.cost?.toFixed(2) || "0.00"}
                            </p>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                color: statusColor.text,
                                margin: "0.25rem 0 0 0",
                                textTransform: "capitalize",
                                fontWeight: 500,
                              }}
                            >
                              {call.status || "completed"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--color-gray-500)",
                    }}
                  >
                    <Clock
                      style={{
                        width: "3rem",
                        height: "3rem",
                        margin: "0 auto 1rem",
                        opacity: 0.5,
                      }}
                    />
                    <p>No call history yet.</p>
                    <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                      Start a call with an astrologer to see your history here.
                    </p>
                  </div>
                )}
              </div>
            </div>
              </Modal>
            </Suspense>
          )}
        </div>
      )}

      {/* Local animations */}
      <style jsx>{`
        /* Responsive Search + Filter Container */
        @media (max-width: 768px) {
          .search-filter-card {
            padding: 0.75rem !important;
            margin-top: 1rem !important;
          }

          .search-filter-container {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }

          .filter-dropdown-wrapper {
            min-width: 100% !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }

        @media (max-width: 640px) {
          .search-filter-card {
            padding: 0.625rem !important;
          }

          .search-filter-container {
            gap: 0.5rem !important;
          }

          .search-filter-container input,
          .search-filter-container select {
            font-size: 0.9375rem !important;
            padding: 0.625rem 0.875rem 0.625rem 2.25rem !important;
          }
        }

        /* Responsive Action Buttons - Always Side by Side */
        @media (max-width: 640px) {
          .action-buttons-container {
            justify-content: center !important;
            gap: 0.5rem !important;
            margin-bottom: 1rem !important;
            flex-wrap: nowrap !important;
          }

          .action-buttons-container button {
            flex: 1 !important;
            min-width: 0 !important;
            font-size: 0.8125rem !important;
            padding: 0.5rem 0.75rem !important;
            white-space: nowrap !important;
          }

          .action-buttons-container button svg {
            width: 0.875rem !important;
            height: 0.875rem !important;
          }
        }

        @media (max-width: 480px) {
          .action-buttons-container {
            gap: 0.375rem !important;
          }

          .action-buttons-container button {
            font-size: 0.75rem !important;
            padding: 0.5rem 0.5rem !important;
          }
        }

        @media (min-width: 640px) {
          .astrologer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.25rem !important;
          }
        }

        @media (min-width: 1024px) {
          .astrologer-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1.5rem !important;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      
      {/* SEO: FAQ Schema - Invisible to users */}
      <PageSEO 
        pageType="talk-to-astrologer"
        faqs={[
          {
            question: "What Does a Live Astrologer Consultation Involve?",
            answer: "A live astrologer consultation is a private, one-to-one session where you directly interact with an experienced astrologer through voice or video call. Unlike automated predictions, the astrologer listens to your concerns, studies your birth chart, and provides guidance tailored specifically to your situation. This format allows deeper discussion, follow-up questions, and practical clarity that cannot be achieved through generic reports."
          },
          {
            question: "How Our Astrologers Analyze Your Questions",
            answer: "During a consultation, astrologers analyze your kundli using traditional Vedic astrology principles. Planetary positions, house lords, dashas, and current transits are examined to understand the root cause of your concern. Whether the question relates to career, marriage, finances, or timing, the analysis is focused on practical outcomes rather than abstract predictions."
          },
          {
            question: "Topics You Can Discuss With an Astrologer",
            answer: "Live astrologer consultations are suitable for most life situations where clarity and timing matter. Users commonly seek guidance for relationships, career decisions, marriage compatibility, financial planning, and major life transitions. You are free to ask follow-up questions and explore multiple areas during the session."
          },
          {
            question: "Voice Call vs Video Call – What's the Difference?",
            answer: "Both voice and video consultations provide the same level of astrological analysis. Voice calls are preferred by users who want quick, distraction-free guidance, while video calls offer a more personal, face-to-face experience. You can choose the consultation mode that feels most comfortable to you."
          },
          {
            question: "Are the Astrologers Verified and Experienced?",
            answer: "All astrologers available on Nirali Live Astro go through a verification process before being listed. This includes experience checks, area of specialization review, and quality assessment. User ratings and reviews further help maintain transparency and trust."
          },
          {
            question: "How Pricing and Billing Works for Calls",
            answer: "Astrologer consultations are billed on a per-minute basis. Billing starts only when the call is successfully connected and ends automatically when the call finishes. You can view pricing in advance and manage your wallet balance easily."
          },
          {
            question: "Is My Consultation Private and Secure?",
            answer: "Your consultation is completely private. Calls are conducted securely, and your personal details, birth information, and conversations are not shared with anyone. Privacy and confidentiality are treated as a core priority."
          },
          {
            question: "When Should You Consult an Astrologer?",
            answer: "Astrologer consultations are most helpful when you need clarity, direction, or timing guidance. Rather than reacting to events, astrology helps you prepare and make informed choices. Many users consult astrologers proactively to understand upcoming phases and avoid unnecessary stress."
          }
        ]}
      />
    </>
  );
}
