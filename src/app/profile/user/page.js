"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Mail,
  Phone,
  Wallet,
  Clock,
  Edit2,
  Camera,
  Loader2,
  CheckCircle,
  Users,
  Plus,
  X,
  Sparkles,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import FamilyMemberPredictions from "@/components/FamilyMemberPredictions";
import { PageLoading } from "@/components/LoadingStates";

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();
      /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyForm, setFamilyForm] = useState({
    name: "",
    dob: "",
    time: "",
    place: "",
    relation: "Self",
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);

  /* --------------------------------------------------------------- */
  /*  Fetch user + call history + family members with React Query   */
  /* --------------------------------------------------------------- */
  const userId = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("tgs:userId");
    }
    return null;
  }, []);

  // Fetch profile data with React Query for caching and faster loading
  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/user/profile?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      return data.success ? data.user : null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    retry: 1, // Only retry once on failure
  });

  // Call history state
  const [historyLoading, setHistoryLoading] = useState(false);
  
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

  // Background fetch to update cache without blocking UI
  const fetchCallHistoryInBackground = useCallback(async (userId, cacheKey) => {
    try {
      const res = await fetch(`/api/calls/history?userId=${userId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.history) {
          const cacheData = {
            recentCalls: data.history,
            timestamp: Date.now(),
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (e) {
              console.warn('Error updating cache:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in background fetch:", error);
    }
  }, []);

  // Fetch call history with caching (same logic as talk-to-astrologer page)
  const fetchCallHistory = useCallback(async (forceRefresh = false) => {
    if (!userId) return;

    // Check localStorage cache first (10 minute cache for instant loading)
    const cacheKey = `tgs:callHistory:${userId}`;
    const cacheTimeout = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();
    
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData.timestamp && now - cacheData.timestamp < cacheTimeout) {
            // Use cached data for instant display
            setCallHistory((cacheData.recentCalls || []).slice(0, 5));
            // Still fetch in background to update cache
            fetchCallHistoryInBackground(userId, cacheKey);
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading cache:', e);
      }
    }

    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/calls/history?userId=${userId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.history) {
          const recentCalls = data.history.slice(0, 5); // Show only 5 in profile
          setCallHistory(recentCalls);
          
          // Update cache
          if (typeof window !== 'undefined') {
            try {
              const cacheData = {
                recentCalls: data.history,
                timestamp: now,
              };
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (e) {
              console.warn('Error saving to localStorage:', e);
            }
          }
        } else {
          setCallHistory([]);
        }
      } else {
        setCallHistory([]);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
      setCallHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, fetchCallHistoryInBackground]);

  // Fetch call history on mount
  useEffect(() => {
    if (userId) {
      fetchCallHistory(false); // Use cache if available
    }
  }, [userId, fetchCallHistory]);
  
  // Load call history from cache immediately for instant display
  useEffect(() => {
    if (userId && typeof window !== 'undefined') {
      const cacheKey = `tgs:callHistory:${userId}`;
      const cacheTimeout = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();
      
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData.timestamp && now - cacheData.timestamp < cacheTimeout) {
            // Use cached data immediately for instant display
            setCallHistory((cacheData.recentCalls || []).slice(0, 5));
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
  }, [userId]);

  // Fetch family members with React Query
  const { data: familyData } = useQuery({
    queryKey: ['familyMembers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/family/members?userId=${userId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.success ? (data.members || []) : [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
  });

  // Update state when data is fetched
  useEffect(() => {
    if (profileData) {
      setUser(profileData);
      setEditForm({
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
      });
    }
  }, [profileData]);


  useEffect(() => {
    if (familyData) {
      setFamilyMembers(familyData);
    }
  }, [familyData]);

  // Handle loading and auth redirect - Optimize: show content immediately when ready
  useEffect(() => {
    if (!userId) {
      router.push("/auth");
      return;
    }
    // Show page immediately as soon as we have profile data
    // Don't wait for other data - show page right away
    if (profileData || user) {
      setLoading(false);
    } else if (profileLoading) {
      // Only show loading if we're still fetching and have no data
      setLoading(true);
    }
  }, [userId, profileLoading, profileData, user, router]);

  /* --------------------------------------------------------------- */
  /*  Save profile changes                                           */
  /* --------------------------------------------------------------- */
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userId = localStorage.getItem("tgs:userId");
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => ({ ...prev, ...editForm }));
        setIsEditModalOpen(false);
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Family member handlers                                         */
  /* --------------------------------------------------------------- */
  const handleAddFamilyMember = async () => {
    if (
      !familyForm.name ||
      !familyForm.dob ||
      !familyForm.time ||
      !familyForm.place
    ) {
      alert("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      const userId = localStorage.getItem("tgs:userId");
      const res = await fetch("/api/family/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...familyForm }),
      });
      const data = await res.json();
      if (data.success) {
        setFamilyMembers((prev) => [...prev, data.member]);
        setFamilyForm({
          name: "",
          dob: "",
          time: "",
          place: "",
          relation: "Self",
        });
        setIsFamilyModalOpen(false);
      } else {
        alert(data.message || "Failed to add family member");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleViewPredictions = (member) => {
    setSelectedMember(member);
    setShowPredictions(true);
    setShowFamilyPanel(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth/user");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */
  if (loading) {
    return <PageLoading type="profile" message="Loading your profile..." />;
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "#f9fafb",
        }}
      >
        <p 
          className="text-lg"
          style={{
            color: "#4b5563",
          }}
        >
          No user data found.
        </p>
      </div>
    );
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
          {/* Left Toolbar */}
          <div
            className={`fixed left-0 top-16 h-full shadow-2xl transition-transform duration-300 ${
              showFamilyPanel ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ 
              width: "320px", 
              zIndex: 30,
              background: "white",
            }}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: "var(--color-gold)" }} />
                  Family Members
                </h3>
                <button
                  onClick={() => setShowFamilyPanel(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <button
                onClick={() => setIsFamilyModalOpen(true)}
                className="w-full mb-4 px-4 py-3 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                }}
              >
                <Plus className="w-4 h-4" />
                Add Family Member
              </button>

              <div className="flex-1 overflow-y-auto space-y-3">
                {familyMembers.length > 0 ? (
                  familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 transition-all cursor-pointer"
                      style={{
                        borderColor: "var(--color-gray-200)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-gold)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-gray-200)";
                      }}
                      onClick={() => handleViewPredictions(member)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{
                            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                          }}
                        >
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {member.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {member.relation}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>📅 {new Date(member.dob).toLocaleDateString()}</p>
                        <p>🕐 {member.time}</p>
                        <p>📍 {member.place}</p>
                      </div>
                      <button 
                        className="mt-3 w-full px-3 py-2 bg-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        style={{
                          border: "1px solid var(--color-gold)",
                          color: "var(--color-gold-dark)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(212, 175, 55, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                        }}
                      >
                        <Sparkles className="w-4 h-4" />
                        View Predictions
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No family members added yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setShowFamilyPanel(!showFamilyPanel)}
            className="fixed left-0 top-1/2 -translate-y-1/2 text-white p-3 rounded-r-xl shadow-lg hover:shadow-xl transition-all z-40"
            style={{ 
              marginLeft: showFamilyPanel ? "320px" : "0",
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
            }}
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Header */}
          <header className="header">
            <h1 className="title">My Profile</h1>
            <p className="subtitle">
              Manage your account details, wallet balance, and call history.
            </p>
          </header>

          <div className="profile-grid">
            {/* Left: Profile Card */}
            <div
              className="card"
              style={{ 
                padding: "2rem", 
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "6rem",
                      height: "6rem",
                      background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "1.75rem",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <button
                    style={{
                      position: "absolute",
                      bottom: "0",
                      right: "0",
                      width: "2rem",
                      height: "2rem",
                      background: "var(--color-gold)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => alert("Avatar upload coming soon!")}
                  >
                    <Camera style={{ width: "1rem", height: "1rem" }} />
                  </button>
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 500,
                      color: "var(--color-gray-900)",
                    }}
                  >
                    {user.name}
                  </h2>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-gray-500)",
                    }}
                  >
                    Member since{" "}
                    {new Date(
                      user.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Mail
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "var(--color-indigo)",
                    }}
                  />
                  <span
                    style={{ fontSize: "1rem", color: "var(--color-gray-700)" }}
                  >
                    {user.email}
                  </span>
                </div>
                {user.phone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <Phone
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--color-indigo)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "1rem",
                        color: "var(--color-gray-700)",
                      }}
                    >
                      {user.phone}
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-outline"
                  style={{ width: "100%", height: "3rem", fontSize: "1rem" }}
                >
                  <Edit2
                    style={{
                      width: "1rem",
                      height: "1rem",
                      marginRight: "0.5rem",
                    }}
                  />
                  Edit Profile
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  style={{
                    width: "100%",
                    height: "3rem",
                    fontSize: "1rem",
                    color: "#dc2626",
                    borderColor: "#dc2626",
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Right: Wallet + Stats */}
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Wallet */}
              <div 
                className="card" 
                style={{ 
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <Wallet
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        color: "var(--color-gold)",
                      }}
                    />
                    <h3 
                      style={{ 
                        fontSize: "1.125rem", 
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Wallet Balance
                    </h3>
                  </div>
                  <CheckCircle
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "#10b981",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: 700,
                    color: "#059669",
                  }}
                >
                  ₹{user.balance?.toFixed(2) || "0.00"}
                </p>
                <Button
                  onClick={() => router.push("/wallet")}
                  className="btn btn-primary"
                  style={{
                    marginTop: "1rem",
                    width: "100%",
                    height: "3rem",
                    fontSize: "1rem",
                  }}
                >
                  Recharge Now
                </Button>
              </div>

              {/* Quick Stats */}
              <div 
                className="card" 
                style={{ 
                  padding: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "#1f2937",
                    marginBottom: "1rem",
                  }}
                >
                  Quick Stats
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                      }}
                    >
                      Total Calls
                    </p>
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--color-gray-900)",
                      }}
                    >
                      {user.totalCalls || 0}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                      }}
                    >
                      Minutes Used
                    </p>
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--color-gray-900)",
                      }}
                    >
                      {user.minutesUsed || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call History */}
          <div
            className="card"
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
            }}
          >
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
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Clock
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    color: "var(--color-indigo)",
                  }}
                />
                Recent Calls
              </h3>
              <Button
                onClick={() => router.push("/call-history")}
                variant="ghost"
                style={{ fontSize: "0.875rem", color: "var(--color-indigo)" }}
              >
                View All
              </Button>
            </div>

            {historyLoading ? (
              // Skeleton loader for call history
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem",
                      background: "rgba(243, 244, 246, 0.8)",
                      borderRadius: "0.5rem",
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          background: "rgba(209, 213, 219, 0.8)",
                          borderRadius: "50%",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            width: "8rem",
                            height: "1rem",
                            background: "rgba(209, 213, 219, 0.8)",
                            borderRadius: "0.25rem",
                            marginBottom: "0.5rem",
                          }}
                        />
                        <div
                          style={{
                            width: "6rem",
                            height: "0.75rem",
                            background: "rgba(209, 213, 219, 0.6)",
                            borderRadius: "0.25rem",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          width: "4rem",
                          height: "0.875rem",
                          background: "rgba(209, 213, 219, 0.8)",
                          borderRadius: "0.25rem",
                          marginBottom: "0.5rem",
                          marginLeft: "auto",
                        }}
                      />
                      <div
                        style={{
                          width: "3rem",
                          height: "0.75rem",
                          background: "rgba(209, 213, 219, 0.6)",
                          borderRadius: "0.25rem",
                          marginLeft: "auto",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : callHistory.length > 0 ? (
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
                            {new Date(call.startedAt).toLocaleString()}
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
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--color-gray-500)",
                }}
              >
                <Clock
                  style={{
                    width: "3rem",
                    height: "3rem",
                    margin: "0 auto 1rem",
                    opacity: 0.5,
                    color: "inherit",
                  }}
                />
                <p>No call history yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-gray-700)",
                marginBottom: "0.5rem",
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid var(--color-gray-300)",
                borderRadius: "0.75rem",
                fontSize: "1rem",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--color-gold)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--color-gray-300)")
              }
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-gray-700)",
                marginBottom: "0.5rem",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid var(--color-gray-300)",
                borderRadius: "0.75rem",
                fontSize: "1rem",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--color-gold)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--color-gray-300)")
              }
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-gray-700)",
                marginBottom: "0.5rem",
              }}
            >
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              placeholder="+91 98765 43210"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid var(--color-gray-300)",
                borderRadius: "0.75rem",
                fontSize: "1rem",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--color-gold)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--color-gray-300)")
              }
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn btn-primary"
              style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
            >
              {saving ? (
                <Loader2
                  style={{
                    width: "1rem",
                    height: "1rem",
                    animation: "spin 1s linear infinite",
                    marginRight: "0.5rem",
                  }}
                />
              ) : (
                <CheckCircle
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.5rem",
                  }}
                />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={() => setIsEditModalOpen(false)}
              variant="outline"
              className="btn btn-outline"
              style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Family Member Modal */}
      <Modal
        open={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title="Add Family Member"
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={familyForm.name}
              onChange={(e) =>
                setFamilyForm({ ...familyForm, name: e.target.value })
              }
              placeholder="Enter full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relation
            </label>
            <select
              value={familyForm.relation}
              onChange={(e) =>
                setFamilyForm({ ...familyForm, relation: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none focus:border-amber-500 transition-colors"
            >
              <option value="Self">Self</option>
              <option value="Spouse">Spouse</option>
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              value={familyForm.dob}
              onChange={(e) =>
                setFamilyForm({ ...familyForm, dob: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time of Birth
            </label>
            <input
              type="time"
              value={familyForm.time}
              onChange={(e) =>
                setFamilyForm({ ...familyForm, time: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Place of Birth
            </label>
            <PlaceAutocomplete
              value={familyForm.place}
              onChange={(value) =>
                setFamilyForm({ ...familyForm, place: value })
              }
              placeholder="City, Country"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button
              onClick={handleAddFamilyMember}
              disabled={saving}
              className="btn btn-primary"
              style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {saving ? "Adding..." : "Add Member"}
            </Button>
            <Button
              onClick={() => setIsFamilyModalOpen(false)}
              variant="outline"
              className="btn btn-outline"
              style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Predictions - Full Featured Modal */}
      {showPredictions && selectedMember && (
        <FamilyMemberPredictions
          member={selectedMember}
          onClose={() => {
            setShowPredictions(false);
            setSelectedMember(null);
          }}
        />
      )}

      {/* Local Animations & Styles */}
      <style jsx>{`
        .card {
          border-radius: 1rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: var(--transition-smooth);
        }
        .card {
          background: rgba(255, 255, 255, 0.85) !important;
          border: 1px solid rgba(212, 175, 55, 0.2) !important;
          box-shadow: var(--shadow-lg) !important;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl) !important;
        }
        [data-theme="light"] .card:hover,
        :not([data-theme]) .card:hover {
          box-shadow: var(--shadow-xl) !important;
        }

        .profile-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-30px) translateX(20px);
          }
          50% {
            transform: translateY(-60px) translateX(-20px);
          }
          75% {
            transform: translateY(-30px) translateX(30px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}