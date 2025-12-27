"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  ArrowLeft,
  Video,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { PageLoading } from "@/components/LoadingStates";

export default function CallHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const userId = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("tgs:userId");
    }
    return null;
  }, []);

  // Get status color theme (same as talk-to-astrologer page)
  const getStatusColor = (status) => {
    const normalizedStatus = (status || "completed").toLowerCase();
    switch (normalizedStatus) {
      case "completed":
        return {
          bg: "rgba(16, 185, 129, 0.15)", // green-500 with 15% opacity
          border: "rgba(16, 185, 129, 0.3)",
          text: "#059669", // green-600
        };
      case "cancelled":
        return {
          bg: "rgba(245, 158, 11, 0.15)", // amber-500 with 15% opacity
          border: "rgba(245, 158, 11, 0.3)",
          text: "#d97706", // amber-600
        };
      case "rejected":
        return {
          bg: "rgba(239, 68, 68, 0.15)", // red-500 with 15% opacity
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

  // Fetch call history with React Query - Load all calls
  const { data: callHistory, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ['callHistoryAll', userId],
    queryFn: async () => {
      if (!userId) return [];
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        // Fetch all calls (no limit or high limit)
        const res = await fetch(`/api/calls/history?userId=${userId}&limit=1000`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return data.success ? (data.history || []) : [];
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn('Call history fetch timed out');
        }
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Redirect to login if no userId (after loading check)
  useEffect(() => {
    if (typeof window !== 'undefined' && !historyLoading && !userId) {
      router.push("/auth/user");
    }
  }, [userId, historyLoading, router]);

  if (historyLoading || !userId) {
    return <PageLoading type="profile" message="Loading call history..." />;
  }

  return (
    <>
      <div 
        className="min-h-screen py-8 relative"
        style={{
          background: "#f9fafb",
        }}
      >
        {/* Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        <div className="app relative">
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 1rem",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "2rem",
                marginTop: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  style={{
                    padding: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowLeft
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                    }}
                  />
                </Button>
                <h1
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: 700,
                    color: "var(--color-gray-900)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Clock
                    style={{
                      width: "1.875rem",
                      height: "1.875rem",
                      color: "var(--color-indigo)",
                    }}
                  />
                  Call History
                </h1>
              </div>
            </div>

            {/* Call History List */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
              }}
            >
              {historyError ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "var(--color-gray-500)",
                  }}
                >
                  <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
                    Error loading call history
                  </p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Please try again later
                  </p>
                </div>
              ) : !callHistory || callHistory.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "var(--color-gray-500)",
                  }}
                >
                  <Clock
                    style={{
                      width: "3rem",
                      height: "3rem",
                      margin: "0 auto 1rem",
                      color: "var(--color-gray-400)",
                    }}
                  />
                  <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
                    No call history found
                  </p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Your call history will appear here once you make calls
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {callHistory.map((call) => {
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
                              <Video style={{ width: "1.25rem", height: "1.25rem" }} />
                            ) : (
                              <Phone style={{ width: "1.25rem", height: "1.25rem" }} />
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
                              {new Date(call.startedAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                              {call.duration > 0 && ` • ${call.duration} min`}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

