"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Globe,
  Star,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { PageLoading } from "@/components/LoadingStates";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import "../astrology.css"

export default function AstrologerProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser, userProfile, signOut, loading: authLoading } = useAuth();

  /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
    languages: [],
    perMinuteCharge: 0,
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [earningsData, setEarningsData] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [totalCalls, setTotalCalls] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [perMinuteRate, setPerMinuteRate] = useState(50);
  const [apiError, setApiError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* --------------------------------------------------------------- */
  /*  Fetch astrologer + history                                     */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Redirect if not authenticated or not an astrologer
    if (!authUser || userProfile?.collection !== "astrologers") {
      router.push("/auth/astrologer");
      return;
    }

    fetchAstrologerData();
  }, [authUser, userProfile, authLoading, router]);

  const fetchAstrologerData = async () => {
    try {
      setLoading(true);

      // Fetch astrologer profile from Firestore
      const astrologerResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/user/profile?userId=${authUser.uid}&userType=astrologer`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      let astrologerData = {
        name: authUser.displayName || "Astrologer",
        email: authUser.email,
        phone: authUser.phoneNumber || "",
        specialization: "Vedic Astrology",
        experience: "10+ years",
        languages: ["Hindi", "English"],
        pricing: { finalPrice: 50 },
        bio: "Experienced astrologer specializing in Vedic astrology.",
        verified: true,
        status: "online",
      };

      if (astrologerResponse.ok) {
        const profileData = await astrologerResponse.json();
        if (profileData.success && profileData.user) {
          astrologerData = { ...astrologerData, ...profileData.user };
        }
      }

      // Fetch reviews and ratings
      let reviewsData = { rating: 0, reviews: 0 };
      try {
        console.log("Fetching reviews for astrologer:", authUser.uid);
        const reviewsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/reviews?astrologerId=${
            authUser.uid
          }`
        );
        console.log("Reviews response status:", reviewsResponse.status);

        const reviewsResult = await reviewsResponse.json();
        console.log("Reviews API response:", reviewsResult);

        if (reviewsResponse.ok && reviewsResult.success && reviewsResult.reviews) {
          const reviews = reviewsResult.reviews;
          console.log("Found reviews:", reviews.length, reviews);

          if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, review) => {
              const rating = parseFloat(review.rating) || 0;
              console.log(
                "Processing review rating:",
                review.rating,
                "->",
                rating
              );
              return sum + rating;
            }, 0);

            const avgRating = totalRating / reviews.length;

            reviewsData = {
              rating: parseFloat(avgRating.toFixed(1)),
              reviews: reviews.length,
            };

            console.log("Final reviews data:", reviewsData);
          } else {
            console.log("No reviews found");
            reviewsData = { rating: 0, reviews: 0 };
          }
        } else {
          // Handle 503 or other errors gracefully
          console.warn("Reviews API error:", reviewsResult.message || "Unknown error");
          reviewsData = { rating: 0, reviews: 0 };
        }
      } catch (reviewError) {
        console.error("Error fetching reviews:", reviewError);
        reviewsData = { rating: 0, reviews: 0 };
      }

      // Merge reviews data into astrologer profile
      const finalAstrologerData = { ...astrologerData, ...reviewsData };
      setAstrologer(finalAstrologerData);
      setIsOnline(finalAstrologerData.status === "online");
      setPerMinuteRate(finalAstrologerData.pricing?.finalPrice || 50);
      setAvgRating(finalAstrologerData.rating || 0);
      setReviewsCount(finalAstrologerData.reviews || 0);

      setEditForm({
        name: finalAstrologerData.name,
        email: finalAstrologerData.email,
        phone: finalAstrologerData.phone,
        specialization: finalAstrologerData.specialization,
        experience: finalAstrologerData.experience,
        languages: finalAstrologerData.languages,
        perMinuteCharge: finalAstrologerData.pricing?.finalPrice || 50,
        bio: finalAstrologerData.bio,
      });

      // Fetch earnings and call history
      await Promise.all([
        fetchEarnings(),
        fetchCallHistory()
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching astrologer data:", error);
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      setEarningsLoading(true);
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-earnings-history",
          astrologerId: authUser.uid,
          limit: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // The API returns the earnings data directly (not nested in 'earnings')
          setEarningsData({
            totalEarnings: data.totalEarnings || 0,
            availableEarnings: data.availableEarnings || 0,
            redeemedEarnings: data.redeemedEarnings || 0,
            transactions: data.transactions || []
          });
        } else {
          // Set default values if no earnings data
          setEarningsData({
            totalEarnings: 0,
            availableEarnings: 0,
            redeemedEarnings: 0,
            transactions: []
          });
        }
      } else {
        console.error("Failed to fetch earnings");
        setEarningsData({
          totalEarnings: 0,
          availableEarnings: 0,
          redeemedEarnings: 0,
          transactions: []
        });
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      setEarningsData({
        totalEarnings: 0,
        availableEarnings: 0,
        redeemedEarnings: 0,
        transactions: []
      });
    } finally {
      setEarningsLoading(false);
    }
  };

  const fetchCallHistory = async (retryCount = 0) => {
    try {
      setIsRetrying(true);
      setApiError(null);

      const responseUrl = `${
        process.env.NEXT_PUBLIC_BASE_URL || ""
      }/api/calls/history?astrologerId=${authUser.uid}`;
      console.log("Fetching call history from:", responseUrl);

      const historyResponse = await fetch(responseUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Call history response status:", historyResponse.status);

      if (historyResponse.ok) {
        const data = await historyResponse.json();
        console.log("Call history data:", data);

        if (data.success && data.history && data.history.length > 0) {
          setCallHistory(data.history);
          setTotalCalls(data.history.length);
          setIsRetrying(false);
        } else {
          console.log("No call history found");
          setCallHistory([]);
          setTotalCalls(0);
          setIsRetrying(false);
        }
      } else {
        const errorText = await historyResponse.text();
        console.error("Call history API error:", errorText);
        setApiError(
          "Unable to load call history. This might be due to database indexing issues."
        );
        setCallHistory([]);
        setTotalCalls(0);
        setIsRetrying(false);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
      setApiError("Failed to connect to server. Please try again later.");
      setCallHistory([]);
      setTotalCalls(0);
      setIsRetrying(false);
    }
  };

  const handleRetryFetch = () => {
    fetchCallHistory();
  };

  // Removed calculatePerformanceMetrics - earnings now come from API

  /* --------------------------------------------------------------- */
  /*  Toggle online status                                           */
  /* --------------------------------------------------------------- */
  const toggleOnline = async () => {
    setToggling(true);
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      alert(`Status updated to ${newStatus ? "online" : "offline"}!`);
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Save profile changes                                           */
  /* --------------------------------------------------------------- */
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update astrologer data locally (in real app, update Firebase/Firestore)
      setAstrologer((prev) => ({ ...prev, ...editForm }));
      setIsEditModalOpen(false);
      alert("Profile updated successfully!");
    } catch (e) {
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth/astrologer");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  /**
   * Compress and resize image for avatar upload.
   * @param {File} file - Image file to compress
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<Blob>} Compressed image blob
   */
  const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to compress image"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle avatar file upload.
   * Validates file type/size, compresses image, converts to base64,
   * and updates Firestore. Ensures base64 size < 800KB.
   * @param {Event} e - File input change event
   */
  const handleAvatarUpload = async (e) => {
    if (!authUser) return;

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate original file size (max 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      alert(
        "Image size should be less than 2MB (will be compressed automatically)"
      );
      return;
    }

    try {
      setUploadingAvatar(true);

      // Step 1: Compress the image
      const compressedFile = await compressImage(file, 300, 300, 0.7);

      // Step 2: Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });

      // Step 3: Validate final size (base64 < 800KB to stay under Firestore limits)
      if (base64.length > 800 * 1024) {
        throw new Error("Compressed image too large for storage");
      }

      // Step 4: Update Firestore directly
      const docRef = doc(db, "astrologers", authUser.uid);
      await updateDoc(docRef, { avatar: base64 });

      // Step 5: Update local state
      setAstrologer((prev) => ({ ...prev, avatar: base64 }));

      // Reset input
      e.target.value = "";

      alert("Avatar updated successfully!");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      alert(`Failed to upload: ${err.message}. Please try a smaller image.`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */
  if (loading) {
    return <PageLoading type="profile" message="Loading your profile..." />;
  }

  if (!astrologer) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-gray-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "1.125rem", color: "var(--color-gray-600)" }}>
          No astrologer data found.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-gray-50)",
        }}
      >
        <div className="app">
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
          <header className="astrologer-header" style={{marginTop: "-50px"}} >
            <h1 className="title">Account Settings</h1>
            <p className="subtitle">
              Manage your profile, availability, pricing, and earnings.
            </p>
          </header>

          <div className="astrologer-profile-grid">
            {/* Left: Profile Card */}
            <div
              className="card"
              style={{ padding: "2rem", position: "relative" }}
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
                      backgroundImage: astrologer.avatar
                        ? `url(${astrologer.avatar})`
                        : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1.75rem",
                    }}
                  >
                    {!astrologer.avatar &&
                      astrologer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                  </div>
                  <label
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
                      cursor: uploadingAvatar ? "not-allowed" : "pointer",
                      opacity: uploadingAvatar ? 0.5 : 1,
                    }}
                  >
                    {uploadingAvatar ? (
                      <Loader2
                        style={{ width: "1rem", height: "1rem" }}
                        className="animate-spin"
                      />
                    ) : (
                      <Camera style={{ width: "1rem", height: "1rem" }} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      fontSize: "2.25rem",
                      fontWeight: 600,
                      color: "var(--color-gray-900)",
                      fontFamily: "var(--font-heading)",
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {astrologer.name}
                    {astrologer.verified && (
                      <CheckCircle
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          color: "#10b981",
                          display: "inline-block",
                          marginLeft: "0.5rem",
                        }}
                      />
                    )}
                  </h2>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-gray-500)",
                      margin: 0,
                    }}
                  >
                    {astrologer.specialization} • {astrologer.experience}
                  </p>
                </div>
              </div>

              <div
                style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}
              >
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
                    {astrologer.email}
                  </span>
                </div>
                {astrologer.phone && (
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
                      {astrologer.phone}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Globe
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "var(--color-indigo)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {astrologer.languages?.map((l, i) => (
                      <span
                        key={l + i}
                        style={{
                          padding: "0.25rem 0.625rem",
                          background: "var(--color-indigo-light)",
                          color: "var(--color-indigo)",
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
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Button
                    onClick={() => setIsEditModalOpen(true)}
                    className="btn btn-outline"
                    style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
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
                    onClick={toggleOnline}
                    disabled={toggling}
                    className={isOnline ? "btn btn-success" : "btn btn-offline"}
                    style={{ flex: 1, height: "3rem", fontSize: "1rem" }}
                  >
                    {toggling ? (
                      <Loader2
                        style={{
                          width: "1rem",
                          height: "1rem",
                          animation: "spin 1s linear infinite",
                          marginRight: "0.5rem",
                        }}
                      />
                    ) : isOnline ? (
                      <ToggleRight
                        style={{
                          width: "1rem",
                          height: "1rem",
                          marginRight: "0.5rem",
                        }}
                      />
                    ) : (
                      <ToggleLeft
                        style={{
                          width: "1rem",
                          height: "1rem",
                          marginRight: "0.5rem",
                        }}
                      />
                    )}
                    {isOnline ? "Online" : "Go Online"}
                  </Button>
                </div>
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

            {/* Right: Earnings + Stats */}
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Earnings */}
              <div className="card" style={{ padding: "1.5rem" }}>
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
                        fontSize: "1.75rem",
                        fontWeight: 600,
                        color: "var(--color-gray-900)",
                        fontFamily: "var(--font-heading)",
                        lineHeight: 1.3,
                        margin: 0,
                      }}
                    >
                      Total Earnings
                    </h3>
                  </div>
                  <TrendingUp
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "#10b981",
                    }}
                  />
                </div>

                {apiError && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#dc2626",
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        Data Loading Issue
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#7f1d1d",
                          margin: "0.25rem 0 0 0",
                        }}
                      >
                        {apiError}
                      </p>
                    </div>
                    <Button
                      onClick={handleRetryFetch}
                      disabled={isRetrying}
                      variant="outline"
                      style={{
                        fontSize: "0.75rem",
                        height: "2rem",
                        padding: "0 0.75rem",
                        borderColor: "#dc2626",
                        color: "#dc2626",
                      }}
                    >
                      {isRetrying ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                )}

                {earningsLoading ? (
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <Loader2
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        color: "#d4af37",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto",
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: "1.875rem",
                        fontWeight: 700,
                        color: "#059669",
                      }}
                    >
                      ₹{earningsData?.totalEarnings?.toFixed(2) || "0.00"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                        marginTop: "0.5rem",
                      }}
                    >
                      Available: ₹{earningsData?.availableEarnings?.toFixed(2) || "0.00"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                        marginTop: "0.25rem",
                      }}
                    >
                      Redeemed: ₹{earningsData?.redeemedEarnings?.toFixed(2) || "0.00"}
                    </p>
                  </>
                )}
                {apiError && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#dc2626",
                      marginTop: "0.5rem",
                    }}
                  >
                    ⚠️ Showing ₹0.00 due to database connection issues
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: "var(--color-gray-900)",
                    fontFamily: "var(--font-heading)",
                    lineHeight: 1.3,
                    marginBottom: "1rem",
                  }}
                >
                  Performance
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
                      {totalCalls || 0}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                      }}
                    >
                      Avg Rating
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Star
                        style={{
                          width: "1rem",
                          height: "1rem",
                          fill: "#fbbf24",
                          color: "#fbbf24",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          color: "var(--color-gray-900)",
                        }}
                      >
                        {avgRating || "0.0"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                      }}
                    >
                      Rate/min
                    </p>
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#059669",
                      }}
                    >
                      ₹{perMinuteRate || 0}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-gray-500)",
                      }}
                    >
                      Reviews
                    </p>
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--color-gray-900)",
                      }}
                    >
                      {reviewsCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call History */}
          <div
            className="card"
            style={{ marginTop: "2rem", padding: "1.5rem" }}
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
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--color-gray-900)",
                  fontFamily: "var(--font-heading)",
                  lineHeight: 1.3,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  margin: 0,
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
                onClick={() => router.push("/astrologer-dashboard")}
                variant="ghost"
                style={{ fontSize: "0.875rem", color: "var(--color-indigo)" }}
              >
                View All
              </Button>
            </div>

            {callHistory.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {callHistory.map((call) => (
                  <div
                    key={call.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem",
                      background: "var(--color-gray-50)",
                      borderRadius: "0.5rem",
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
                        }}
                      >
                        {call.type === "video" ? "V" : "A"}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "var(--color-gray-900)",
                            margin: 0,
                          }}
                        >
                          {call.userName || "Anonymous User"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-gray-500)",
                            margin: 0,
                          }}
                        >
                          {new Date(call.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "#059669",
                          margin: 0,
                        }}
                      >
                        +₹{(call.finalAmount || call.cost || 0).toFixed(2)}
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-gray-500)",
                          margin: 0,
                        }}
                      >
                        {call.durationMinutes || call.duration || Math.floor((call.actualDurationSeconds || 0) / 60) || "0"} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--color-gray-500)",
                  padding: "2rem 0",
                }}
              >
                No calls yet. Go online to receive calls!
              </p>
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
              style={inputStyle}
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
              style={inputStyle}
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
              Phone
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              style={inputStyle}
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
              Specialization
            </label>
            <input
              type="text"
              value={editForm.specialization}
              onChange={(e) =>
                setEditForm({ ...editForm, specialization: e.target.value })
              }
              style={inputStyle}
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
              Experience (e.g., 10+ years)
            </label>
            <input
              type="text"
              value={editForm.experience}
              onChange={(e) =>
                setEditForm({ ...editForm, experience: e.target.value })
              }
              style={inputStyle}
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
              Languages (comma separated)
            </label>
            <input
              type="text"
              value={editForm.languages.join(", ")}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  languages: e.target.value
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Hindi, English, Tamil"
              style={inputStyle}
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
              Rate per Minute (₹)
            </label>
            <input
              type="number"
              value={editForm.perMinuteCharge}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  perMinuteCharge: parseInt(e.target.value) || 0,
                })
              }
              style={inputStyle}
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
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
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

      {/* Local Styles */}
      <style jsx>{`
        .astrologer-profile-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }
        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
          .astrologer-profile-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .btn-success {
          background: #10b981;
          color: white;
          border: none;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-offline {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        .btn-offline:hover {
          background: #e5e7eb;
          color: #111827;
          border-color: #cbd5e1;
        }
      `}</style>
    </>
  );
}

/* Reusable input style */
const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid var(--color-gray-300)",
  borderRadius: "0.75rem",
  fontSize: "1rem",
  outline: "none",
};
inputStyle[":focus"] = { borderColor: "var(--color-gold)" };
