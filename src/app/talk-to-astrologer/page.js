"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CallConnectingNotification from "@/components/CallConnectingNotification";
import Modal from "@/components/Modal";
import ReviewModal from "@/components/ReviewModal";
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
  const [callStatus, setCallStatus] = useState("connecting");
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedAstrologer, setSelectedAstrologer] = useState(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  /* --------------------------------------------------------------- */
  /*  Modal open state for body scroll lock                         */
  /* --------------------------------------------------------------- */
  const isAnyModalOpen =
    isBalanceModalOpen || isReviewModalOpen || !!connectingCallType;

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

  /* --------------------------------------------------------------- */
  /*  Fetch astrologers + pricing + reviews                         */
  /* --------------------------------------------------------------- */
  const fetchAndUpdateAstrologers = async () => {
    try {
      const snap = await getDocs(collection(db, "astrologers"));
      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          specialization: d.specialization,
          rating: d.rating || 0,
          reviews: d.reviews || 0,
          experience: d.experience,
          languages: d.languages || ["English"],
          status: d.status || "offline", // Store actual status
          isOnline: d.status === "online",
          bio: d.bio || `Expert in ${d.specialization}`,
          verified: d.verified || false,
          // NEW: map areasOfExpertise / specialties for expertise display
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

      /* ---- Pricing ---- */
      try {
        const res = await fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-all-pricing" }),
        });
        const data = await res.json();
        if (data.success) {
          const map = {};
          data.pricing.forEach((p) => (map[p.astrologerId] = p));
          list.forEach((a) => {
            const p = map[a.id];
            if (p) {
              a.pricing = p;
              a.perMinuteCharge =
                p.pricingType === "per_minute" ? p.finalPrice : null;
            } else {
              a.pricing = { pricingType: "per_minute", finalPrice: 50 };
              a.perMinuteCharge = 50;
            }
          });
        }
      } catch (e) {
        console.error("Pricing fetch error:", e);
        list.forEach((a) => {
          a.pricing = { pricingType: "per_minute", finalPrice: 50 };
          a.perMinuteCharge = 50;
        });
      }

      /* ---- Reviews & rating recalc ---- */
      const updated = await Promise.all(
        list.map(async (a) => {
          try {
            const res = await fetch(`/api/reviews?astrologerId=${a.id}`);
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
            return a; // Return original if reviews fetch fails
          } catch (e) {
            console.error(`Reviews error for ${a.id}:`, e);
          }
          return a;
        })
      );

      setAstrologers(updated);
    } catch (e) {
      console.error("Astrologers fetch error:", e);
    } finally {
      setFetchingAstrologers(false);
    }
  };

  useEffect(() => {
    // Track page view
    trackPageView("/talk-to-astrologer", "Talk to Astrologer");

    fetchAndUpdateAstrologers();
    const id = setInterval(fetchAndUpdateAstrologers, 30_000);
    return () => clearInterval(id);
  }, []);

  /* --------------------------------------------------------------- */
  /*  Filtering                                                      */
  /* --------------------------------------------------------------- */
  const filteredAstrologers = astrologers.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      !filterSpecialization || a.specialization === filterSpecialization;
    return matchesSearch && matchesFilter;
  });

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
            `Insufficient balance. Need ₹${validation.minimumRequired}, you have ₹${validation.currentBalance}.`
          );
          setIsBalanceModalOpen(true);
          setLoading(false);
          return;
        }
      }

      setConnectingCallType(type);

      /* ---- Availability ---- */
      const statusRes = await fetch(
        `/api/astrologer/status?astrologerId=${astrologerId}`
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

      /* ---- Init billing ---- */
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize-call",
          callId: call.id,
          userId,
          astrologerId,
        }),
      }).catch(() => {});

      /* ---- Poll status ---- */
      let timeoutId;
      const poll = setInterval(async () => {
        const sRes = await fetch(`/api/calls?astrologerId=${astrologerId}`);
        const sData = await sRes.json();
        const c = sData.calls?.find((c) => c.id === call.id);

        if (c?.status === "active") {
          clearInterval(poll);
          clearTimeout(timeoutId);

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
            setLoading(false);
            router.push(
              type === "video"
                ? `/talk-to-astrologer/room/${roomName}`
                : `/talk-to-astrologer/voice/${roomName}`
            );
          } else {
            trackActionAbandon("astrologer_booking", "session_creation_failed");
            trackEvent("call_failed", {
              reason: "session_creation_failed",
              call_id: call.id,
            });
            setConnectingCallType(null);
            setLoading(false);
            alert("Failed to join room.");
          }
        } else if (c?.status === "rejected") {
          clearInterval(poll);
          clearTimeout(timeoutId);

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
            setCallStatus("connecting");
            setLoading(false);
          }, 2000);
        } else if (c?.status === "cancelled") {
          // Handle cancelled status (when user cancels)
          clearInterval(poll);
          clearTimeout(timeoutId);

          // Track call cancelled
          trackActionAbandon("astrologer_booking", "user_cancelled");
          trackEvent("call_cancelled", {
            call_id: call.id,
            call_type: type,
            astrologer_id: astrologerId,
          });

          setConnectingCallType(null);
          setCallStatus("connecting");
          setLoading(false);
        }
      }, 2000);

      timeoutId = setTimeout(() => {
        clearInterval(poll);

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
      setLoading(false);
      alert(e.message || "Call failed.");
    }
  };

  const handleVoiceCall = (id) => startCall("voice", id);
  const handleVideoCall = (id) => startCall("video", id);

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

  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */

  return (
    <>
      {/* Connection notification */}
      <CallConnectingNotification
        isOpen={!!connectingCallType}
        status={callStatus}
        type={connectingCallType}
        onTimeout={() => {
          setConnectingCallType(null);
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
          setCallStatus("connecting");
          setLoading(false);
        }}
      />

      {fetchingAstrologers ? (
        <PageLoading type="astrologer" message="Loading astrologers..." />
      ) : (
        <div
          className="min-h-screen py-4 md:py-8 px-4 md:px-6 lg:px-8"
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
              style={{ textAlign: "center", marginTop: "3rem" }}
            >
              <h1 className="title">{t.talkToAstrologer.title}</h1>
              <p className="subtitle">{t.talkToAstrologer.subtitle}</p>
            </header>

            {/* Search + Filter */}
            <div className="card" style={{ marginTop: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: 1, position: "relative" }}>
                  <Search
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "var(--color-gold)",
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

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "16rem",
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

            {/* Loading skeletons – Responsive grid */}
            {fetchingAstrologers && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6"
                style={{
                  opacity: !!connectingCallType ? 0.5 : 1,
                  pointerEvents: !!connectingCallType ? "none" : "auto",
                }}
              >
                {filteredAstrologers.map((a) => (
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
                    {/* Top Row: Avatar + Name + Spec + Experience + Rating + Review */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                        marginBottom: "1rem",
                        position: "relative",
                        zIndex: 20,
                      }}
                    >
                      {/* Avatar + Status Badge (with tooltip/title + aria) */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "4rem",
                            height: "4rem",
                            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "1.25rem",
                          }}
                        >
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>

                        {/* Compact colored badge with tooltip (uses title + aria for accessibility) */}
                        <div
                          title={
                            a.status === "online"
                              ? "Available now"
                              : a.status === "busy"
                              ? "Currently busy"
                              : "Currently offline"
                          }
                          aria-label={
                            a.status === "online"
                              ? "Available now"
                              : a.status === "busy"
                              ? "Currently busy"
                              : "Currently offline"
                          }
                          style={{
                            position: "absolute",
                            bottom: "-0.3rem",
                            right: "-0.3rem",
                            width: "1rem",
                            height: "1rem",
                            borderRadius: "50%",
                            border: "2px solid white",
                            background:
                              a.status === "online"
                                ? "#10b981" // green
                                : a.status === "busy"
                                ? "#f59e0b" // yellow
                                : "#9ca3af", // gray
                            boxShadow:
                              a.status === "online"
                                ? "0 0 6px rgba(16, 185, 129, 0.6)"
                                : a.status === "busy"
                                ? "0 0 6px rgba(245, 158, 11, 0.6)"
                                : "none",
                            animation:
                              a.status === "online" || a.status === "busy"
                                ? "pulse 2s infinite"
                                : "none",
                            cursor: "default",
                          }}
                        />
                      </div>

                      {/* Name, Spec, Experience */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                color: "var(--color-gray-900)",
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "var(--font-heading)",
                                lineHeight: 1.3,
                              }}
                              title={a.name}
                            >
                              {a.name}
                            </h3>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "var(--color-indigo)",
                                margin: "0.125rem 0 0",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "var(--font-body)",
                              }}
                              title={a.specialization}
                            >
                              {a.specialization}
                            </p>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-gray-500)",
                                margin: "0.25rem 0 0",
                                fontWeight: 500,
                                fontFamily: "Courier New, monospace",
                              }}
                            >
                              {a.experience}
                            </p>
                          </div>

                          {/* Rating + compact Review button (small text) */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                background: "var(--color-amber-50)",
                                color: "var(--color-amber-700)",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "9999px",
                                fontFamily: "Courier New, monospace",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
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
                              {a.rating}{" "}
                              <span
                                style={{
                                  color: "var(--color-gray-500)",
                                  marginLeft: "0.125rem",
                                  fontFamily: "Courier New, monospace",
                                }}
                              >
                                ({a.reviews})
                              </span>
                            </div>

                            {/* Small written 'Review' button (compact) */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenReview(a);
                              }}
                              disabled={!!connectingCallType}
                              title="Leave a review"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.72rem",
                                lineHeight: 1,
                                padding: "0.25rem 0.6rem",
                                borderRadius: "8px",
                                border: "1px solid var(--color-gray-200)",
                                background: "white",
                                color: "var(--color-gray-700)",
                                cursor: !!connectingCallType
                                  ? "not-allowed"
                                  : "pointer",
                                minWidth: "56px",
                                height: "28px",
                                gap: "0.25rem",
                                fontWeight: 600,
                              }}
                            >
                              Review
                            </button>

                            {/* Price tag - right under Review button */}
                            {a.perMinuteCharge && (
                              <div
                                style={{
                                  fontSize: "0.9375rem",
                                  fontWeight: 700,
                                  color: "#059669",
                                  textAlign: "right",
                                }}
                              >
                                ₹{a.perMinuteCharge}/min
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Verified Badge (kept) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginTop: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {a.verified && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "var(--color-indigo-light)",
                                color: "var(--color-indigo)",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                              }}
                            >
                              <CheckCircle
                                style={{ width: "0.75rem", height: "0.75rem" }}
                              />
                              Verified
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-gray-600)",
                        marginBottom: "1rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        position: "relative",
                        zIndex: 20,
                      }}
                    >
                      {a.bio}
                    </p>

                    {/* --- Speaks & Expertise as two columns --- */}
                    <div
                      style={{
                        marginBottom: "1rem",
                        position: "relative",
                        zIndex: 20,
                        display: "grid",
                        gridTemplateColumns: "1fr", 
                        gap: "0.75rem",
                      }}
                    >
                      {/* make two columns on wider screens */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: "0.75rem",
                        }}
                      >
                        <style>{`
      @media (min-width: 520px) {
        .speaks-expertise-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          gap: 1rem !important;
          align-items: start;
        }
      }
    `}</style>

                        <div
                          className="speaks-expertise-row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: "0.75rem",
                          }}
                        >
                          {/* Column A: Speaks */}
                          <div>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "var(--color-gray-600)",
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
                              {a.languages && a.languages.length > 0 ? (
                                a.languages.map((l, i) => (
                                  <span
                                    key={l + i}
                                    style={{
                                      padding: "0.25rem 0.625rem",
                                      background: "var(--color-indigo-light)",
                                      color: "var(--color-indigo)",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      borderRadius: "9999px",
                                    }}
                                  >
                                    {l}
                                  </span>
                                ))
                              ) : (
                                <div style={{ color: "var(--color-gray-500)" }}>
                                  Not specified
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Column B: Expertise — only render if areasOfExpertise present */}
                          {a.areasOfExpertise &&
                          a.areasOfExpertise.length > 0 ? (
                            <div>
                              <p
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "var(--color-gray-600)",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                Expertise:
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "0.375rem",
                                }}
                              >
                                {a.areasOfExpertise.map((ex, i) => (
                                  <span
                                    key={ex + i}
                                    style={{
                                      padding: "0.25rem 0.625rem",
                                      background: "#fff7ed",
                                      color: "#92400e",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      borderRadius: "9999px",
                                      border: "1px solid rgba(245,158,11,0.12)",
                                    }}
                                  >
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // if you prefer nothing shown when no expertise, keep this empty (or remove this else).
                            <div style={{ display: "none" }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons – Bottom */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginTop: "auto",
                        position: "relative",
                        zIndex: 30,
                      }}
                    >
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoCall(a.id);
                        }}
                        disabled={
                          !a.isOnline || loading || !!connectingCallType
                        }
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          height: "3rem",
                          padding: "0 1.5rem",
                          fontSize: "1rem",
                        }}
                      >
                        {loading && connectingCallType === "video" ? (
                          <Loader2
                            style={{
                              width: "1rem",
                              height: "1rem",
                              animation: "spin 1s linear infinite",
                              marginRight: "0.5rem",
                            }}
                          />
                        ) : (
                          <Video
                            style={{
                              width: "1rem",
                              height: "1rem",
                              marginRight: "0.5rem",
                            }}
                          />
                        )}
                        {a.isOnline ? "Video Call" : "Offline"}
                      </Button>

                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVoiceCall(a.id);
                        }}
                        disabled={
                          !a.isOnline || loading || !!connectingCallType
                        }
                        variant="outline"
                        className="btn btn-outline"
                        style={{
                          flex: 1,
                          height: "3rem",
                          padding: "0 1.5rem",
                          fontSize: "1rem",
                        }}
                      >
                        {loading && connectingCallType === "voice" ? (
                          <Loader2
                            style={{
                              width: "1rem",
                              height: "1rem",
                              animation: "spin 1s linear infinite",
                              marginRight: "0.5rem",
                            }}
                          />
                        ) : (
                          <Phone
                            style={{
                              width: "1rem",
                              height: "1rem",
                              marginRight: "0.5rem",
                            }}
                          />
                        )}
                        {a.isOnline ? "Voice Call" : "Offline"}
                      </Button>
                    </div>
                  </Link>
                ))}
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

          {/* Review modal */}
          {selectedAstrologer && (
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
          )}
        </div>
      )}

      {/* Local animations */}
      <style jsx>{`
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
    </>
  );
}
