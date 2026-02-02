"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Star,
  CheckCircle,
  Phone,
  Video,
  Languages,
  Globe,
  Award,
  Calendar,
  TrendingUp,
  MessageCircle,
  IndianRupee,
  Edit2,
  X,
  Save,
  Camera,
  CalendarCheck,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import GalleryModal from "@/components/GalleryModal";
import MediaViewer from "@/components/MediaViewer";

/**
 * AstrologerProfile Component
 * - Added: areasOfExpertise (array) with multi-select UI in edit modal
 * - Stored as array in Firestore under `areasOfExpertise`
 */

const EXPERTISE_OPTIONS = [
  "Relationships",
  "Career",
  "Health",
  "Finance",
  "Marriage",
  "Education",
  "Business",
  "Travel",
  "Family",
  "Spirituality",
];

export default function AstrologerProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [astrologer, setAstrologer] = useState(null);
  const [perMinuteCharge, setPerMinuteCharge] = useState(50);
  const [rating, setRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    specialization: "",
    specialties: "",
    bio: "",
    languages: "",
    experience: "",
    status: "offline",
    areasOfExpertise: [], // NEW: store as array
  });

  // Gallery state
  const [gallery, setGallery] = useState([]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch astrologer data
  useEffect(() => {
    async function fetchAstrologerData() {
      if (!id) return;

      try {
        setLoading(true);

        const docRef = doc(db, "astrologers", id);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setError("Astrologer not found");
          setLoading(false);
          return;
        }

        const astrologerData = { id: snap.id, ...snap.data() };
        setAstrologer(astrologerData);

        // Populate edit form
        setEditForm({
          name: astrologerData.name || "",
          specialization: astrologerData.specialization || "",
          specialties: (
            astrologerData.specialties || [astrologerData.specialization]
          )
            .filter(Boolean)
            .join(", "),
          bio: astrologerData.bio || "",
          languages: (astrologerData.languages || ["English"]).join(", "),
          experience: astrologerData.experience || "",
          status: astrologerData.status || "offline",
          areasOfExpertise: astrologerData.areasOfExpertise || [], // NEW
        });

        // Pricing
        try {
          const pricingRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/pricing`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "get-pricing", astrologerId: id }),
            }
          );
          if (pricingRes.ok) {
            const pricingData = await pricingRes.json();
            if (
              pricingData.success &&
              pricingData.pricing?.pricingType === "per_minute"
            ) {
              setPerMinuteCharge(pricingData.pricing.finalPrice);
            }
          }
        } catch (e) {
          console.error("Pricing fetch error:", e);
        }

        // Reviews
        try {
          const reviewsRes = await fetch(
            `${
              process.env.NEXT_PUBLIC_BASE_URL || ""
            }/api/reviews?astrologerId=${id}`
          );
          const reviewsData = await reviewsRes.json();
          if (
            reviewsRes.ok &&
            reviewsData.success &&
            reviewsData.reviews?.length
          ) {
            const sum = reviewsData.reviews.reduce((s, r) => s + r.rating, 0);
            setRating((sum / reviewsData.reviews.length).toFixed(1));
            setReviewsCount(reviewsData.reviews.length);
            setReviews(reviewsData.reviews.slice(0, 3));
          } else {
            console.warn(
              "Failed to fetch reviews:",
              reviewsData.message || "Unknown error"
            );
            setRating("0.0");
            setReviewsCount(0);
            setReviews([]);
          }
        } catch (e) {
          console.error("Reviews fetch error:", e);
          setRating("0.0");
          setReviewsCount(0);
          setReviews([]);
        }

        // Gallery
        try {
          const galleryRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/astrologer/gallery?astrologerId=${id}`
          );
          const galleryData = await galleryRes.json();
          if (galleryRes.ok && galleryData.gallery) {
            setGallery(galleryData.gallery);
          }
        } catch (e) {
          console.error("Gallery fetch error:", e);
          setGallery([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching astrologer:", err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchAstrologerData();
  }, [id]);

  /**
   * Save updated profile data to Firestore.
   * Only accessible if the current user is the astrologer owner.
   */
  const handleSaveProfile = async () => {
    if (!currentUser || currentUser.uid !== id) return;

    try {
      const docRef = doc(db, "astrologers", id);
      const specialtiesArray = editForm.specialties
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const updatedData = {
        name: editForm.name.trim(),
        specialization: editForm.specialization.trim(),
        specialties: specialtiesArray,
        bio: editForm.bio.trim(),
        languages: editForm.languages
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l),
        experience: editForm.experience.trim(),
        status: editForm.status,
        areasOfExpertise: Array.isArray(editForm.areasOfExpertise)
          ? editForm.areasOfExpertise
          : [], // NEW: ensure array
      };

      await updateDoc(docRef, updatedData);
      setAstrologer((prev) => ({ ...prev, ...updatedData }));
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  /**
   * Compress and resize image for avatar upload.
   * Maintains aspect ratio, converts to JPEG for better compression.
   * @param {File} file - The image file to compress
   * @param {number} maxWidth - Maximum width (default: 300)
   * @param {number} maxHeight - Maximum height (default: 300)
   * @param {number} quality - JPEG quality (default: 0.7)
   * @returns {Promise<File>} Compressed File object
   */
  const compressImage = (
    file,
    maxWidth = 300,
    maxHeight = 300,
    quality = 0.7
  ) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
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

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            // Ensure it's JPEG for better compression
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Handle avatar file upload.
   * Validates file type/size, compresses image, converts to base64,
   * and updates Firestore. Ensures base64 size < 800KB.
   * @param {Event} e - File input change event
   */
  const handleAvatarUpload = async (e) => {
    if (!currentUser || currentUser.uid !== id) return;

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
      const compressedFile = await compressImage(file, 300, 300, 0.7); // Smaller dims/quality for base64 efficiency

      // Step 2: Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // Returns data:image/... base64 string
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile); // Handles MIME type automatically
      });

      // Step 3: Validate final size (base64 < 800KB to stay under Firestore limits)
      if (base64.length > 800 * 1024) {
        // Rough check for 600KB binary equiv.
        throw new Error("Compressed image too large for storage");
      }

      // Step 4: Update Firestore directly
      const docRef = doc(db, "astrologers", id);
      await updateDoc(docRef, { avatar: base64 }); // Store as string

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-gray-50)",
        }}
      >
        <div
          className="spinner"
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--color-gray-200)",
            borderTop: "4px solid var(--color-gold)",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  if (error || !astrologer) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-gray-50)",
        }}
      >
        <div
          className="card"
          style={{ textAlign: "center", maxWidth: "400px" }}
        >
          <h2
            style={{
              color: "var(--color-gray-900)",
              marginBottom: "var(--space-md)",
            }}
          >
            Astrologer Not Found
          </h2>
          <p
            style={{
              color: "var(--color-gray-600)",
              marginBottom: "var(--space-lg)",
            }}
          >
            {error || "The astrologer you are looking for does not exist."}
          </p>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/talk-to-astrologer");
              }
            }}
            className="btn btn-primary"
          >
            Back to Astrologers
          </button>
        </div>
      </div>
    );
  }

  const isOnline = astrologer.status === "online";
  const isOwner = currentUser?.uid === id;

  const specialties = astrologer.specialties || [astrologer.specialization];

  const achievements = [
    { icon: Award, label: "Top Rated", value: rating ? `${rating}/5` : "N/A" },
    {
      icon: Calendar,
      label: "Experience",
      value: astrologer.experience || "10+ Years",
    },
    {
      icon: TrendingUp,
      label: "Consultations",
      value: astrologer.consultations
        ? `${astrologer.consultations}+`
        : "1000+",
    },
    {
      icon: MessageCircle,
      label: "Response Time",
      value: astrologer.responseTime || "5 mins",
    },
  ];

  const handleStartCall = async (type) => {
    if (!isOnline) return;

    try {
      const userId = localStorage.getItem("tgs:userId");
      if (!userId) {
        alert("Please log in first.");
        router.push("/auth/user");
        return;
      }

      // Store astrologer ID and call type for the main page to pick up
      localStorage.setItem("tgs:profileCallAstrologerId", astrologer.id);
      localStorage.setItem("tgs:profileCallType", type);

      // Navigate to talk-to-astrologer page which will handle the call
      router.push("/talk-to-astrologer");
    } catch (error) {
      console.error("Error starting call:", error);
      alert(error.message || "Failed to start call. Please try again.");
    }
  };

  /**
   * Handle back navigation.
   * Redirects to dashboard for owner, or astrologers list otherwise.
   */
  const handleBackNavigation = () => {
    if (isOwner) {
      router.push("/astrologer-dashboard");
    } else {
      router.push("/talk-to-astrologer");
    }
  };

  // Helper: Avatar initials
  const avatarInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <>
      {/* Desktop Layout - Custom Grid */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .desktop-layout {
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: var(--space-xl);
          }
        }
      `}</style>

      <div className="app">
        {/* Header Navigation */}
        <div
          style={{
            background: "var(--color-white)",
            borderBottom: "1px solid var(--color-gray-200)",
          }}
        >
          <div className="container">
            <div
              style={{
                padding: "var(--space-md) 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "-16px"
              }}
            >
              <button
                onClick={() => {
                  // Try to go back in history first
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    // If no history, go to astrologers list
                    router.push("/talk-to-astrologer");
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--color-indigo)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <span style={{ transform: "rotate(180deg)" }}>→</span>
                Back to Astrologers
              </button>

              {/* Edit Button - Only for owner */}
              {isOwner && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="btn btn-ghost"
                  style={{ gap: "0.5rem" }}
                >
                  <Edit2 style={{ width: "16px", height: "16px" }} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className="container"
          style={{ padding: "var(--space-2xl) var(--space-lg)" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--space-xl)",
              maxWidth: "1400px",
              margin: "0 auto",
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "var(--space-lg)",
                }}
              >
                <div className="desktop-layout">
                  {/* Left Side */}
                  <div>
                    {/* Profile Card */}
                    <div
                      className="card"
                      style={{ marginBottom: "var(--space-lg)" }}
                    >
                      {/* Hero Banner */}
                      <div
                        style={{
                          height: "140px",
                          background:
                            "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                          margin:
                            "calc(var(--space-xl) * -1) calc(var(--space-xl) * -1) 0",
                          position: "relative",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-50px",
                            left: "var(--space-xl)",
                            width: "120px",
                            height: "120px",
                            background: astrologer.avatar
                              ? `url(${astrologer.avatar})`
                              : "linear-gradient(135deg, var(--color-indigo), var(--color-purple))",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "2.25rem",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            border: "4px solid white",
                            boxShadow: "var(--shadow-lg)",
                            position: "relative",
                          }}
                        >
                          {!astrologer.avatar &&
                            avatarInitials(astrologer.name)}

                          {isOnline && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "8px",
                                right: "8px",
                                width: "24px",
                                height: "24px",
                                background: "#10b981",
                                border: "3px solid white",
                                borderRadius: "50%",
                                animation: "pulse 2s infinite",
                              }}
                            />
                          )}

                          {/* Avatar Upload Button - Only for owner */}
                          {isOwner && (
                            <label
                              style={{
                                position: "absolute",
                                bottom: "0",
                                right: "0",
                                width: "36px",
                                height: "36px",
                                background: "var(--color-indigo)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: uploadingAvatar
                                  ? "not-allowed"
                                  : "pointer",
                                border: "3px solid white",
                                boxShadow: "var(--shadow-md)",
                                opacity: uploadingAvatar ? 0.5 : 1,
                              }}
                            >
                              <Camera
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  color: "white",
                                }}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploadingAvatar}
                                style={{ display: "none" }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Verified Badge */}
                        {astrologer.verified && (
                          <div
                            style={{
                              position: "absolute",
                              top: "var(--space-md)",
                              right: "var(--space-md)",
                              background: "rgba(255, 255, 255, 0.95)",
                              padding: "0.5rem 1rem",
                              borderRadius: "var(--radius-full)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "var(--color-indigo)",
                              boxShadow: "var(--shadow-md)",
                            }}
                          >
                            <CheckCircle
                              style={{ width: "16px", height: "16px" }}
                            />
                            Verified Expert
                          </div>
                        )}
                      </div>

                      {/* Profile Info */}
                      <div style={{ paddingTop: "60px" }}>
                        <h1
                          style={{
                            fontSize: "2rem",
                            fontWeight: 500,
                            marginBottom: "0.5rem",
                            color: "var(--color-gray-900)",
                          }}
                        >
                          {astrologer.name}
                        </h1>

                        <p
                          style={{
                            fontSize: "1.125rem",
                            color: "var(--color-indigo)",
                            fontWeight: 500,
                            marginBottom: "var(--space-md)",
                          }}
                        >
                          {astrologer.specialization}
                        </p>

                        {/* Quick Info Strip */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "1.25rem",
                            marginBottom: "var(--space-lg)",
                            padding: "0.75rem 1rem",
                            background: "var(--color-gray-50)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-gray-200)",
                          }}
                        >
                          {/* Status */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <Globe
                              style={{
                                width: "18px",
                                height: "18px",
                                color: isOnline
                                  ? "#10b981"
                                  : "var(--color-gray-400)",
                              }}
                            />
                            <span
                              style={{
                                fontWeight: 600,
                                color: isOnline
                                  ? "#10b981"
                                  : "var(--color-gray-600)",
                              }}
                            >
                              {isOnline ? "Available Now" : "Offline"}
                            </span>
                          </div>

                          {/* Languages */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <Languages
                              style={{
                                width: "18px",
                                height: "18px",
                                color: "var(--color-indigo)",
                              }}
                            />
                            <span style={{ fontWeight: 500 }}>
                              {(astrologer.languages || ["English"]).join(", ")}
                            </span>
                          </div>

                          {/* Rate */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <IndianRupee
                              style={{
                                width: "18px",
                                height: "18px",
                                color: "#059669",
                              }}
                            />
                            <span
                              style={{
                                fontWeight: 500,
                                color: "#059669",
                                fontFamily: "'Courier New', monospace",
                              }}
                            >
                              ₹{perMinuteCharge}/min
                            </span>
                          </div>
                        </div>

                        

                        {/* Quick Stats */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "var(--space-md)",
                            marginBottom: "var(--space-lg)",
                          }}
                        >
                          {achievements.map((item, idx) => {
                            const IconComponent = item.icon;
                            return (
                              <div
                                key={idx}
                                style={{
                                  background: "var(--color-gray-50)",
                                  padding: "var(--space-md)",
                                  borderRadius: "var(--radius-md)",
                                  border: "1px solid var(--color-gray-200)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.25rem",
                                  }}
                                >
                                  <IconComponent
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      color: "var(--color-gold)",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.90rem",
                                      color: "var(--color-gray-600)",
                                      fontWeight: 500,
                                      letterSpacing: "0.05em",
                                     
                                    }}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "1rem",
                                    fontWeight: 500,
                                    color: "var(--color-gray-900)",
                                  }}
                                >
                                  {item.value}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        
                      </div>
                    </div>

                  </div>

                  {/* Right Side */}
                  <div>
                    {/* Action Buttons */}
                    <div className="card" style={{ marginBottom: "2rem" }}>
                      {/* Buttons row */}
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-md)",
                          flexWrap: "wrap", 
                          alignItems: "center",
                          WebkitOverflowScrolling: "touch",
                          paddingBottom: "0.25rem",
                          justifyContent: "center",
                          width: "100%"
                        }}
                      >
                        <button
                          className="btn btn-primary"
                          disabled={!isOnline}
                          onClick={() => handleStartCall("video")}
                          style={{
                            height: "52px",
                            fontSize: "1.05rem",
                            opacity: isOnline ? 1 : 0.5,
                            cursor: isOnline ? "pointer" : "not-allowed",
                            flex: "0 1 auto",
                            minWidth: "min-content",
                          }}
                        >
                          <Video style={{ width: "20px", height: "20px" }} />
                          Start Video Call
                        </button>

                        <button
                          className="btn btn-secondary"
                          disabled={!isOnline}
                          onClick={() => handleStartCall("voice")}
                          style={{
                            height: "52px",
                            fontSize: "1.05rem",
                            opacity: isOnline ? 1 : 0.5,
                            cursor: isOnline ? "pointer" : "not-allowed",
                            flex: "0 1 auto",
                            minWidth: "min-content",
                          }}
                        >
                          <Phone style={{ width: "20px", height: "20px" }} />
                          Start Voice Call
                        </button>

                        <button
                          className="btn"
                          onClick={() =>
                            router.push(`/appointments/book/${astrologer.id}`)
                          }
                          style={{
                            height: "52px",
                            fontSize: "1.05rem",
                            backgroundColor: "#10b981",
                            color: "#fff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            cursor: "pointer",
                            flex: "0 1 auto",
                            minWidth: "min-content",
                          }}
                        >
                          <CalendarCheck
                            style={{ width: "20px", height: "20px" }}
                          />
                          Book Appointment
                        </button>
                      </div>

                      
                    </div>

                    {/* About */}
                    <div
                      className="card"
                      style={{ marginBottom: "var(--space-lg)" }}
                    >
                      <h2
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 500,
                          marginBottom: "var(--space-md)",
                          color: "var(--color-gray-900)",
                          
                        }}
                      >
                        About
                      </h2>
                      <p
                        style={{
                          color: "var(--color-gray-700)",
                          lineHeight: 1.7,
                          marginBottom: 0,
                        }}
                      >
                        {astrologer.bio ||
                          `Expert in ${astrologer.specialization}. Providing guidance and insights to help you navigate life's journey.`}
                      </p>
                    </div>

                    {/* Specialties */}
                    <div
                      className="card"
                      style={{ marginBottom: "var(--space-lg)" }}
                    >
                      <h2
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 500,
                          marginBottom: "var(--space-md)",
                          color: "var(--color-gray-900)",
                          
                        }}
                      >
                        Areas of Expertise
                      </h2>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.75rem",
                        }}
                      >
                        {/* Render the new areasOfExpertise if present, otherwise fall back to specialties */}
                        {(astrologer.areasOfExpertise &&
                        astrologer.areasOfExpertise.length > 0
                          ? astrologer.areasOfExpertise
                          : specialties
                        ).map((specialty, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "0.5rem 1rem",
                              background: "var(--color-indigo-light)",
                              color: "var(--color-indigo)",
                              borderRadius: "var(--radius-full)",
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              border: "1px solid rgba(79, 70, 229, 0.2)",
                            }}
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Reviews */}
                    <div className="card">
                      <h2
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 500,
                          marginBottom: "var(--space-lg)",
                          color: "var(--color-gray-900)",
                         
                        }}
                      >
                        Recent Reviews
                      </h2>

                      {reviews.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--space-lg)",
                          }}
                        >
                          {reviews.map((review, index) => (
                            <div
                              key={review.id || index}
                              style={{
                                paddingBottom: "var(--space-lg)",
                                borderBottom:
                                  index !== reviews.length - 1
                                    ? "1px solid var(--color-gray-200)"
                                    : "none",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "start",
                                  marginBottom: "0.75rem",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 500,
                                      marginBottom: "0.25rem",
                                      fontFamily:
                                        "'Cormorant Garamond', sans-serif",
                                      fontSize: "1.1rem",
                                    }}
                                  >
                                    {review.userName ||
                                      review.name ||
                                      "Anonymous"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.875rem",
                                      color: "var(--color-gray-500)",
                                    }}
                                  >
                                    {review.createdAt
                                      ? new Date(
                                          review.createdAt.toDate
                                            ? review.createdAt.toDate()
                                            : review.createdAt
                                        ).toLocaleDateString()
                                      : review.date}
                                  </div>
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.25rem" }}
                                >
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      style={{
                                        width: "16px",
                                        height: "16px",
                                        fill:
                                          i < review.rating
                                            ? "#f59e0b"
                                            : "none",
                                        color:
                                          i < review.rating
                                            ? "#f59e0b"
                                            : "var(--color-gray-300)",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p
                                style={{
                                  color: "var(--color-gray-700)",
                                  lineHeight: 1.6,
                                  marginBottom: 0,
                                }}
                              >
                                {review.comment || review.review}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            color: "var(--color-gray-500)",
                            textAlign: "center",
                            padding: "var(--space-xl) 0",
                          }}
                        >
                          No reviews yet
                        </p>
                      )}
                    </div>

                    {/* Gallery Section */}
                    <div className="card mt-6">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "var(--space-lg)",
                        }}
                      >
                        <h2
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 500,
                            color: "var(--color-gray-900)",
                          }}
                        >
                          Gallery
                        </h2>
                        {currentUser?.uid === id && (
                          <button
                            onClick={() => setIsGalleryModalOpen(true)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem 1rem",
                              background: "#d4af37",
                              border: "none",
                              borderRadius: "var(--radius-full)",
                              cursor: "pointer",
                              color: "#fff",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "#b8972e";
                              e.target.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "#d4af37";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            <Edit2 style={{ width: "16px", height: "16px" }} />
                            Manage Gallery
                          </button>
                        )}
                      </div>

                      {/* Gallery Grid Display */}
                      {gallery.length > 0 ? (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                              gap: "var(--space-lg)",
                            }}
                          >
                            {gallery.slice(0, 6).map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  borderRadius: "var(--radius-md)",
                                  overflow: "hidden",
                                  background: "#fff",
                                  border: "1px solid var(--color-gray-200)",
                                  cursor: "pointer",
                                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                }}
                                onClick={() => setSelectedMediaItem(item)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-4px)";
                                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                {/* Media */}
                                <div
                                  style={{
                                    position: "relative",
                                    paddingBottom: "75%",
                                    background: "#f0f0f0",
                                  }}
                                >
                                  {item.mediaType === "image" ? (
                                    <img
                                      src={item.mediaUrl}
                                      alt={item.title || "Gallery item"}
                                      style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <video
                                        src={item.mediaUrl}
                                        style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: "50%",
                                          left: "50%",
                                          transform: "translate(-50%, -50%)",
                                          background: "rgba(0,0,0,0.6)",
                                          borderRadius: "50%",
                                          padding: "1rem",
                                          pointerEvents: "none",
                                        }}
                                      >
                                        <Play
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            color: "#fff",
                                          }}
                                        />
                                      </div>
                                    </>
                                  )}
                                  {/* Media type badge */}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "8px",
                                      left: "8px",
                                      background: "rgba(0,0,0,0.7)",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "var(--radius-sm)",
                                      color: "#fff",
                                      fontSize: "0.7rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    {item.mediaType === "image" ? (
                                      <ImageIcon style={{ width: "10px", height: "10px" }} />
                                    ) : (
                                      <Video style={{ width: "10px", height: "10px" }} />
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                {(item.title || item.description) && (
                                  <div style={{ padding: "var(--space-md)" }}>
                                    {item.title && (
                                      <h3
                                        style={{
                                          fontSize: "1rem",
                                          fontWeight: 500,
                                          marginBottom: "0.25rem",
                                          color: "var(--color-gray-900)",
                                        }}
                                      >
                                        {item.title}
                                      </h3>
                                    )}
                                    {item.description && (
                                      <p
                                        style={{
                                          fontSize: "0.8125rem",
                                          color: "var(--color-gray-600)",
                                          margin: 0,
                                          lineHeight: 1.5,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {gallery.length > 6 && (
                            <button
                              onClick={() => setIsGalleryModalOpen(true)}
                              style={{
                                marginTop: "var(--space-lg)",
                                padding: "0.75rem",
                                background: "transparent",
                                border: "1px solid #d4af37",
                                borderRadius: "var(--radius-md)",
                                cursor: "pointer",
                                color: "#d4af37",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = "#d4af37";
                                e.target.style.color = "#fff";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = "transparent";
                                e.target.style.color = "#d4af37";
                              }}
                            >
                              View All {gallery.length} Items
                            </button>
                          )}
                        </>
                      ) : (
                        <p
                          style={{
                            color: "var(--color-gray-500)",
                            textAlign: "center",
                            padding: "var(--space-xl) 0",
                          }}
                        >
                          No gallery items yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: "var(--space-lg)",
            }}
            onClick={() => setIsEditOpen(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: "500px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-lg)",
                  paddingBottom: "var(--space-md)",
                  borderBottom: "1px solid var(--color-gray-200)",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  Edit Profile
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X
                    style={{
                      width: "20px",
                      height: "20px",
                      color: "var(--color-gray-500)",
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-md)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Primary Specialization
                  </label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        specialization: e.target.value,
                      })
                    }
                    placeholder="e.g., Vedic Astrology"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    All Specialties (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.specialties}
                    onChange={(e) =>
                      setEditForm({ ...editForm, specialties: e.target.value })
                    }
                    placeholder="e.g., Vedic Astrology, Tarot Reading, Numerology"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-gray-500)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Enter multiple specialties separated by commas
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      resize: "vertical",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Languages (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.languages}
                    onChange={(e) =>
                      setEditForm({ ...editForm, languages: e.target.value })
                    }
                    placeholder="e.g., English, Hindi, Punjabi"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Experience
                  </label>
                  <input
                    type="text"
                    value={editForm.experience}
                    onChange={(e) =>
                      setEditForm({ ...editForm, experience: e.target.value })
                    }
                    placeholder="e.g., 10+ Years"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                {/* NEW: Areas of Expertise multi-select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Areas of Expertise
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    {EXPERTISE_OPTIONS.map((area) => {
                      const selected = editForm.areasOfExpertise.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => {
                              const already =
                                prev.areasOfExpertise.includes(area);
                              return {
                                ...prev,
                                areasOfExpertise: already
                                  ? prev.areasOfExpertise.filter(
                                      (a) => a !== area
                                    )
                                  : [...prev.areasOfExpertise, area],
                              };
                            });
                          }}
                          style={{
                            padding: "0.5rem 1rem",
                            borderRadius: "20px",
                            border: "1px solid var(--color-indigo)",
                            background: selected
                              ? "var(--color-indigo)"
                              : "white",
                            color: selected ? "white" : "var(--color-indigo)",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                          }}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>

                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-gray-500)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Select all topics where you provide the best guidance.
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--color-gray-300)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "var(--space-md)",
                  marginTop: "var(--space-lg)",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Save style={{ width: "16px", height: "16px" }} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Modal */}
        <GalleryModal
          isOpen={isGalleryModalOpen}
          onClose={() => {
            setIsGalleryModalOpen(false);
            // Refresh gallery
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/astrologer/gallery?astrologerId=${id}`)
              .then(res => res.json())
              .then(data => {
                if (data.gallery) {
                  setGallery(data.gallery);
                }
              })
              .catch(console.error);
          }}
          astrologerId={id}
          isOwner={currentUser?.uid === id}
        />

        {/* Media Viewer Modal */}
        <MediaViewer
          isOpen={!!selectedMediaItem}
          onClose={() => setSelectedMediaItem(null)}
          item={selectedMediaItem}
        />

        {/* Animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
        .app h1, .app h2, .app h3, .app h4, .app h5, .app h6, .app p, .app span, .app div {
            font-family: 'Georgia', 'Times New Roman', serif;
          }
        `}</style>
      </div>
    </>
  );
}
