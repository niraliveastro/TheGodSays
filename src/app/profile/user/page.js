"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  Wallet,
  Clock,
  Edit2,
  Camera,
  Loader2,
  CheckCircle,
  Users,
  Video,
  CalendarCheck,
  X,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { PageLoading } from "@/components/LoadingStates";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Lazy load heavy components
const Modal = lazy(() => import("@/components/Modal"));

/* --------------------------------------------------------------- */
/*  Zodiac Helpers                                                 */
/* --------------------------------------------------------------- */
function getWesternZodiac(month, day) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Aries", symbol: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Taurus", symbol: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Gemini", symbol: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Cancer", symbol: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Leo", symbol: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Virgo", symbol: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Libra", symbol: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Scorpio", symbol: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Sagittarius", symbol: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: "Capricorn", symbol: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Aquarius", symbol: "♒" };
  return { sign: "Pisces", symbol: "♓" };
}

const RASHI_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka",
  "Simha", "Kanya", "Tula", "Vrischika",
  "Dhanu", "Makara", "Kumbha", "Mina"
];

function getNorthernRashi(month, day) {
  // Indian zodiac months roughly align with Western but shifted ~one sign
  // Using the common mapping used in Indian astrology apps
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Mesha (Aries)";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Vrishabha (Taurus)";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Mithuna (Gemini)";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Karka (Cancer)";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Simha (Leo)";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Kanya (Virgo)";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Tula (Libra)";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Vrischika (Scorpio)";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Dhanu (Sagittarius)";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Makara (Capricorn)";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Kumbha (Aquarius)";
  return "Mina (Pisces)";
}

function computeZodiacs(dob) {
  if (!dob) return null;
  const d = new Date(dob + "T12:00:00"); // noon to avoid timezone drift
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return {
    western: getWesternZodiac(month, day),
    indian: getNorthernRashi(month, day),
  };
}

/* --------------------------------------------------------------- */
/*  Image compression utility                                      */
/* --------------------------------------------------------------- */
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { blob ? resolve(blob) : reject(new Error("Compression failed")); }, "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* --------------------------------------------------------------- */
/*  Appointment status helper (mirrored from Appointments page)   */
/* --------------------------------------------------------------- */
function getDisplayStatus(appointment) {
  const now = new Date();
  const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);
  if (appointment.status === "cancelled") return "cancelled";
  if (appointment.status === "completed") return "completed";
  if (appointment.status === "confirmed" || appointment.status === "pending") {
    return apptDateTime > now ? "upcoming" : "missed";
  }
  return "missed";
}

/* --------------------------------------------------------------- */
/*  Main Component                                                 */
/* --------------------------------------------------------------- */
export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();

  /* ---- State ---- */
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", dob: "" });
  const [saving, setSaving] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* ---- Derived ---- */
  const userId = useMemo(() => {
    if (typeof window !== "undefined") return localStorage.getItem("tgs:userId");
    return null;
  }, []);

 const zodiacs = useMemo(() => {
  if (!user?.dob || user.dob === "") return null;
  return computeZodiacs(user.dob);
}, [user?.dob]);


  /* ---- React Query: Profile ---- */
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/user/profile?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      return data.success ? data.user : null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  /* ---- React Query: Call History ---- */
  const { data: callHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ["callHistory", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/calls/history?userId=${userId}&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.success ? (data.history || []).slice(0, 5) : [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  /* ---- React Query: Upcoming Appointments ---- */
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["upcomingAppointments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/appointments?userId=${userId}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.success) return [];
      // filter to only upcoming
      return (data.appointments || []).filter(
        (a) => getDisplayStatus(a) === "upcoming"
      );
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });

  /* ---- Sync state from queries ---- */
  useEffect(() => {
    if (profileData) {
      setUser(profileData);
      setEditForm({ name: profileData.name || "", email: profileData.email || "", phone: profileData.phone || "", dob: profileData.dob || "" });
    }
  }, [profileData]);

  useEffect(() => { if (callHistoryData) setCallHistory(callHistoryData); }, [callHistoryData]);

  /* ---- Auth redirect & loading gate ---- */
  useEffect(() => {
    if (!userId) { router.push("/auth"); return; }
    if (profileData || user) setLoading(false);
    else if (profileLoading) setLoading(true);
  }, [userId, profileLoading, profileData, user, router]);

  /* ---- Handlers ---- */
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
  setUser((prev) => ({
    ...prev,
    ...(editForm.name && { name: editForm.name }),
    ...(editForm.email && { email: editForm.email }),
    ...(editForm.phone && { phone: editForm.phone }),
    ...(editForm.dob && { dob: editForm.dob }), // ⭐ DO NOT overwrite with ""
  }));
  setIsEditModalOpen(false);
}
 else alert(data.message || "Failed to update profile");
    } catch { alert("Network error"); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    try {
      setUploadingAvatar(true);
      const compressed = await compressImage(file, 300, 300, 0.7);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      if (base64.length > 800 * 1024) throw new Error("Compressed image too large");
      await updateDoc(doc(db, "users", userId), { avatar: base64 });
      setUser((prev) => ({ ...prev, avatar: base64 }));
      e.target.value = "";
      alert("Avatar updated!");
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally { setUploadingAvatar(false); }
  };

  const handleSignOut = async () => {
    try { await signOut(); router.push("/auth/user"); }
    catch (e) { console.error("Sign out error:", e); }
  };

  const handleConnect = (appointment) => {
    localStorage.setItem("tgs:profileCallAstrologerId", appointment.astrologerId);
    localStorage.setItem("tgs:profileCallType", "video");
    localStorage.setItem("tgs:appointmentId", appointment.id);
    router.push("/talk-to-astrologer");
  };

  /* ---- Status colour helpers ---- */
  const getStatusColor = (status) => {
    switch ((status || "completed").toLowerCase()) {
      case "completed": return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#059669" };
      case "cancelled": return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "var(--color-gold-dark)" };
      case "rejected":  return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#dc2626" };
      default:          return { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)", text: "#6b7280" };
    }
  };

  /* ---- Early returns ---- */
  if (loading) return <PageLoading type="profile" message="Loading your profile..." />;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFDF5" }}>
        <p className="text-lg" style={{ color: "#4b5563" }}>No user data found.</p>
      </div>
    );
  }

  /* ---- Initials ---- */
  const initials = (user.name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  /* ============================================================= */
  /*  RENDER                                                         */
  /* ============================================================= */
  return (
     <div className="min-h-screen" style={{ background: "#FFFDF5", fontFamily: "'Inter', sans-serif" }}>
      {/* Subtle ambient background blobs */}
      <div style={{ position: "fixed", top: 0, right: 0, width: "33%", height: "33%", background: "rgba(100,116,139,0.03)", filter: "blur(60px)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "25%", height: "25%", background: "rgba(71,85,105,0.03)", filter: "blur(60px)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "3rem 1.5rem", position: "relative", zIndex: 1 }}>

        {/* ---- Header ---- */}
        <header style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 className="title" style={{
            fontSize: "2.5rem",
            fontWeight: 500,
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            Divine Profile
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Your spiritual journey and guided history at a glance.
          </p>
        </header>

        {/* ---- 12-col grid ---- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "2rem" }}>

          {/* ===== LEFT COL (4) – Profile Card ===== */}
          <div style={{ gridColumn: "1 / 5" }}>
            <div className="glass-card" style={{
              borderRadius: "1.5rem", padding: "2rem", textAlign: "center",
              position: "relative", overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
            }}>
              

              {/* Avatar */}
              <div style={{ position: "relative", display: "inline-block", marginBottom: "1.25rem", marginTop: "0.75rem" }}>
                <div style={{
                  width: "7rem", height: "7rem", borderRadius: "50%",
                  border: "4px solid rgba(100,116,139,0.15)", padding: "3px",
                }}>
                  <div style={{
                    width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                    backgroundImage: user.avatar ? `url(${user.avatar})` : "linear-gradient(135deg, var(--color-cream), var(--color-gold))",
                    backgroundSize: "cover", backgroundPosition: "center",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-gold-dark)", fontWeight: 500, fontSize: "1.75rem", fontFamily: "'Georgia', serif",
                  }}>
                    {!user.avatar && initials}
                  </div>
                </div>
                {/* camera edit badge */}
                <label style={{
                  position: "absolute", bottom: "2px", right: "2px",
                  width: "2rem", height: "2rem", background: "#b8972e",
                  borderRadius: "50%", border: "2px solid white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uploadingAvatar ? "not-allowed" : "pointer",
                  opacity: uploadingAvatar ? 0.55 : 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}>
                  {uploadingAvatar
                    ? <Loader2 size={14} color="white" style={{ animation: "spin 1s linear infinite" }} />
                    : <Camera size={14} color="white" />
                  }
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>

              {/* Name */}
              <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", fontWeight: 500, color: "#1e293b", margin: "0 0 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                {user.name}
              </h2>

              {/* Zodiac badges */}
              {zodiacs && (
                <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600, color: "#b8972e",
                    background: "rgba(100,116,139,0.1)", padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                  }}>
                    {zodiacs.western.symbol} {zodiacs.western.sign}
                  </span>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600, color: "var(--color-gold-dark)",
                    background: "rgba(100,116,139,0.08)", padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                  }}>
                    ✦ {zodiacs.indian}
                  </span>
                </div>
              )}

              {/* Contact details */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem", marginTop: "0.5rem", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <Mail size={18} style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: "0.875rem", color: "#334155" }}>{user.email}</span>
                </div>
                {user.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <Phone size={18} style={{ color: "#94a3b8" }} />
                    <span style={{ fontSize: "0.875rem", color: "#334155" }}>{user.phone}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <CalendarCheck size={18} style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: "0.875rem", color: "#334155" }}>
                    Member since {new Date(user.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <button onClick={() => setIsEditModalOpen(true)} style={{
                  width: "100%", padding: "0.7rem 1rem", background: "white",
                  border: "1px solid #e2e8f0", borderRadius: "0.75rem",
                  fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  color: "#334155", transition: "background 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <Edit2 size={15} /> Edit Profile
                </button>
                <button onClick={() => router.push("/profile/family")} style={{
                  width: "100%", padding: "0.7rem 1rem", background: "white",
                  border: "1px solid #e2e8f0", borderRadius: "0.75rem",
                  fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  color: "#334155", transition: "background 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <Users size={15} /> My Family
                </button>
                <button onClick={handleSignOut} style={{
                  width: "100%", padding: "0.7rem 1rem", background: "white",
                  border: "1px solid #e2e8f0", borderRadius: "0.75rem",
                  fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  color: "#ef4444", transition: "background 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COL (8) ===== */}
          <div style={{ gridColumn: "5 / 13", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

            {/* ---- Row: Wallet + Stats ---- */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

              {/* Wallet */}
              <div className="glass-card" style={{
                borderRadius: "1.5rem", padding: "1.5rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-gold-dark)", margin: 0 }}>Divine Wallet</p>
                    <h3 style={{ fontSize: "1.875rem", fontWeight: 500, color: "#1e293b", margin: "0.25rem 0 0" }}>
                      ₹{user.balance?.toFixed(2) || "0.00"}
                    </h3>
                  </div>
                  <div style={{ background: "rgba(100,116,139,0.1)", padding: "0.5rem", borderRadius: "0.625rem" }}>
                    <Wallet size={22} color="#b8972e" />
                  </div>
                </div>
                <button onClick={() => router.push("/wallet")} className="btn-primary w-full text-white " 
                >
                  Top-up Balance
                </button>
              </div>

              {/* Stats */}
              <div className="glass-card" style={{
                borderRadius: "1.5rem", padding: "1.5rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
              }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-gold-dark)", margin: "0 0 1rem" }}>Spiritual Journey Stats</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <p style={{ fontSize: "1.5rem", fontWeight: 500, color: "#1e293b", margin: 0 }}>{user.totalCalls || 0}</p>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-gold-dark)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.2rem 0 0" }}>Consultations</p>
                  </div>
                  <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "0.75rem" }}>
                    <p style={{ fontSize: "1.5rem", fontWeight: 500, color: "#1e293b", margin: 0 }}>{user.minutesUsed || 0}</p>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-gold-dark)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.2rem 0 0" }}>Minutes</p>
                  </div>
                </div>
                <div style={{
                  marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.4rem",
                  fontSize: "0.75rem", color: "#16a34a", background: "rgba(34,197,94,0.08)",
                  padding: "0.4rem 0.65rem", borderRadius: "0.5rem",
                }}>
                  <TrendingUp size={14} /> Active member
                </div>
              </div>
            </div>

            {/* ---- Upcoming Appointments ---- */}
            <div className="card" style={{
              borderRadius: "1.5rem", padding: "1.5rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
              height: "100%"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.2rem", fontWeight: 500, color: "#1e293b", margin: 0 }}>
                  Upcoming Consultations
                </h2>
                <button onClick={() => router.push("/appointments")} style={{
                  background: "none", border: "none", fontSize: "0.8rem", color: "#b8972e",
                  fontWeight: 500, cursor: "pointer", padding: 0,
                }}>
                  View Schedule →
                </button>
              </div>

              {appointmentsLoading ? (
                <div style={{ display: "flex", gap: "1rem" }}>
                  {[1, 2].map((i) => (
                    <div key={i} style={{
                      flex: 1, background: "#f1f5f9", borderRadius: "0.75rem", padding: "1rem",
                      animation: "pulse 2s ease-in-out infinite",
                    }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "0.75rem", background: "#e2e8f0", marginBottom: "0.6rem" }} />
                      <div style={{ width: "70%", height: "12px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "0.4rem" }} />
                      <div style={{ width: "50%", height: "10px", background: "#e2e8f0", borderRadius: "4px" }} />
                    </div>
                  ))}
                </div>
              ) : appointmentsData && appointmentsData.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {appointmentsData.map((appt) => {
                    const apptDate = new Date(`${appt.date}T${appt.time}`);
                    return (
                      <div key={appt.id} style={{
                        background: "white", borderRadius: "1rem", padding: "1rem",
                        border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.85rem",
                        transition: "box-shadow 0.2s",
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                      >
                        {/* avatar placeholder */}
                        <div style={{
                          width: "3rem", height: "3rem", borderRadius: "0.75rem", flexShrink: 0,
                          background: "linear-gradient(135deg, var(--color-gold-dark), #b8972e)",
                          display: "flex", alignItems: "center", justifyContent: "center", color: "white",
                        }}>
                          <Video size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {appt.astrologerName || "Astrologer"}
                          </p>
                          <p style={{ fontSize: "0.68rem", color: "var(--color-gold-dark)", margin: "0.15rem 0 0" }}>
                            {appt.specialty || "Vedic Astrology"}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem", fontSize: "0.68rem", fontWeight: 600, color: "#b8972e" }}>
                            <Clock size={11} />
                            {apptDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}, {apptDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </div>
                        </div>
                        <button onClick={() => handleConnect(appt)} style={{
                          background: "rgba(100,116,139,0.1)", border: "none", borderRadius: "0.5rem",
                          padding: "0.45rem", cursor: "pointer", color: "#b8972e", transition: "all 0.2s",
                          flexShrink: 0,
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#b8972e"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(100,116,139,0.1)"; e.currentTarget.style.color = "#b8972e"; }}
                        >
                          <Video size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0", margin: 0 , display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  No upcoming consultations scheduled.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== PAST GUIDANCE / Call History ===== */}
        <section className="glass-card" style={{
          marginTop: "2rem", borderRadius: "1.5rem", padding: "2rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.06)", position: "relative", overflow: "hidden",
        }}>
          {/* header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ background: "#b8972e", padding: "0.5rem", borderRadius: "0.625rem" }}>
                <Clock size={20} color="white" />
              </div>
              <div>
                <h2 className="section-title" style={{ fontSize: "2rem", fontWeight: 500, color: "#1e293b", margin: 0 }}>Past Guidance</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--color-gold-dark)", margin: "0.15rem 0 0" }}>Your recent call and consultation records</p>
              </div>
            </div>
            <button onClick={() => router.push("/call-history")} style={{
              padding: "0.5rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem",
              background: "white", fontSize: "0.8rem", fontWeight: 600, color: "#334155", cursor: "pointer",
              transition: "background 0.2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              View All Records
            </button>
          </div>

          {/* call list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", position: "relative", zIndex: 1 }}>
            {historyLoading && callHistory.length === 0 ? (
              [1, 2, 3].map((i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "1rem", background: "#f1f5f9", borderRadius: "0.875rem",
                  animation: "pulse 2s ease-in-out infinite",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: "#e2e8f0" }} />
                    <div>
                      <div style={{ width: "8rem", height: "12px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "0.4rem" }} />
                      <div style={{ width: "5.5rem", height: "10px", background: "#e2e8f0", borderRadius: "4px" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ width: "3.5rem", height: "12px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "0.4rem", marginLeft: "auto" }} />
                    <div style={{ width: "2.5rem", height: "10px", background: "#e2e8f0", borderRadius: "4px", marginLeft: "auto" }} />
                  </div>
                </div>
              ))
            ) : callHistory.length > 0 ? (
              callHistory.map((call) => {
                const sc = getStatusColor(call.status);
                const isVideo = call.type === "video";
                return (
                  <div key={call.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "1rem", borderRadius: "1rem",
                    background: `linear-gradient(90deg, ${sc.bg} 0%, transparent 60%)`,
                    border: `1px solid ${sc.border}`,
                    transition: "border-color 0.2s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(100,116,139,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = sc.border)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                      {/* icon circle */}
                      <div style={{
                        width: "3rem", height: "3rem", borderRadius: "50%", flexShrink: 0,
                        background: isVideo ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "linear-gradient(135deg,#10b981,#059669)",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "white",
                        boxShadow: isVideo ? "0 4px 12px rgba(124,58,237,0.3)" : "0 4px 12px rgba(16,185,129,0.3)",
                      }}>
                        {isVideo ? <Video size={18} /> : <Phone size={18} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {call.astrologerName || "Unknown Astrologer"}
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "var(--color-gold-dark)", margin: "0.2rem 0 0" }}>
                          {new Date(call.startedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          {" • "}
                          {new Date(call.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          {call.duration > 0 && ` • ${call.duration} mins`}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#dc2626", margin: 0 }}>
                        -₹{call.cost?.toFixed(2) || "0.00"}
                      </p>
                      <p style={{
                        fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.06em", color: sc.text, margin: "0.2rem 0 0",
                      }}>
                        {call.status || "completed"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <Clock size={40} style={{ opacity: 0.25, color: "var(--color-gold-dark)", margin: "0 auto 0.75rem" }} />
                <p style={{ color: "var(--color-gold-dark)", fontSize: "0.85rem", margin: 0 }}>No call history yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===== Edit Profile Modal ===== */}
      {/* Edit Profile Modal - Lazy loaded */}
      {isEditModalOpen && (
        <Suspense fallback={null}>
          <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
        <div style={{ padding: "1.5rem" }}>
          {[
            { label: "Full Name", type: "text", key: "name", placeholder: "" },
            { label: "Email", type: "email", key: "email", placeholder: "" },
            { label: "Phone (Optional)", type: "tel", key: "phone", placeholder: "+91 98765 43210" },
          ].map((field) => (
            <div key={field.key} style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#b8972e", marginBottom: "0.4rem" }}>
                {field.label}
              </label>
              <input
                type={field.type}
                value={editForm[field.key]}
                onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{
                  width: "100%", padding: "0.7rem 1rem", border: "1px solid #cbd5e1",
                  borderRadius: "0.75rem", fontSize: "0.9rem", outline: "none",
                  boxSizing: "border-box", transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-gold-dark)")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
            </div>
          ))}

          {/* ---- Date of Birth ---- */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#b8972e", marginBottom: "0.4rem" }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={editForm.dob}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              style={{
                width: "100%", padding: "0.7rem 1rem", border: "1px solid #cbd5e1",
                borderRadius: "0.75rem", fontSize: "0.9rem", outline: "none",
                boxSizing: "border-box", transition: "border-color 0.2s",
                colorScheme: "light",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-gold-dark)")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />

            {/* Live zodiac preview */}
            {editForm.dob && (() => {
              const preview = computeZodiacs(editForm.dob);
              return preview ? (
                <div style={{
                  marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "rgba(100,116,139,0.08)", borderRadius: "0.6rem",
                  padding: "0.45rem 0.7rem",
                }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-gold-dark)" }}>Your signs:</span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "#b8972e",
                    background: "rgba(100,116,139,0.12)", padding: "0.2rem 0.55rem", borderRadius: "999px",
                  }}>
                    {preview.western.symbol} {preview.western.sign}
                  </span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "var(--color-gold-dark)",
                    background: "rgba(100,116,139,0.1)", padding: "0.2rem 0.55rem", borderRadius: "999px",
                  }}>
                    ✦ {preview.indian}
                  </span>
                </div>
              ) : null;
            })()}
          </div>

          <div style={{ display: "flex", gap: "0.65rem", marginTop: "1.25rem" }}>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={16} />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
          </Modal>
        </Suspense>
      )}

      {/* ===== Global styles ===== */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        /* Responsive: stack to single column on mobile */
        @media (max-width: 860px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}