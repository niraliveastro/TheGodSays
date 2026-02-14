"use client";

/**
 * Astrologer Authentication Module
 *
 * This module provides the authentication interface for astrologers in a consultation platform.
 * It supports both email/password login and signup, as well as Google OAuth integration.
 * Upon successful authentication, it creates or verifies an astrologer profile in Firestore
 * and redirects to the dashboard. The form dynamically switches between login and signup modes.
 *
 * Key Features:
 * - Toggle between login and signup forms.
 * - Password visibility toggle.
 * - Form validation and error handling.
 * - Google OAuth with automatic profile creation for new astrologers.
 * - Firestore integration for storing astrologer profiles.
 * - Role-based redirection (astrologers only).
 *
 * Dependencies:
 * - React (useState)
 * - Next.js (useRouter)
 * - Firebase Firestore (doc, setDoc)
 * - AuthContext: Provides signIn, signUp, signInWithGoogle, loading
 * - Lucide React icons
 *
 * Styling: Relies on CSS classes (e.g., .astrologer-auth-page, .form-field-input) defined in external stylesheets.
 * Assumes global CSS for animations, gradients, and responsive design.
 *
 * @module AstrologerAuth
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft, Eye, EyeOff, Sparkles, Star } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * AstrologerAuth Component
 *
 * The main authentication form for astrologers.
 * Renders a responsive, two-panel layout with promotional content on the left
 * and the auth form on the right. Handles form submission, Google sign-in,
 * and conditional field rendering based on login/signup mode.
 *
 * @returns {JSX.Element} The authentication page UI.
 */
export default function AstrologerAuth() {
  const { t } = useTranslation();
  
  // Form state management
  const [isLogin, setIsLogin] = useState(true); // Toggle between login (true) and signup (false) modes
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    specialization: "",
    experience: "",
    languages: "",
  });
  const [error, setError] = useState(""); // Form submission error message

  // Auth and routing hooks
  const { signIn, signUp, signInWithGoogle, loading } = useAuth(); // Auth context methods and loading state
  const router = useRouter(); // Next.js router for navigation

  /* ──────  AUTH HANDLERS  ────── */

  /**
   * Handle form submission for login or signup.
   * For login: Authenticates and redirects based on user role.
   * For signup: Creates auth user, stores astrologer profile in Firestore,
   * sets offline status via API, and redirects to dashboard.
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      if (!isLogin) {
        if (!formData.experience) {
          setError("Please select your experience level.");
          return;
        }
        if (!formData.specialization) {
          setError("Please choose a specialization.");
          return;
        }
        if (!formData.name || !formData.email || !formData.password) {
          setError("Please fill all required fields.");
          return;
        }
      }
      let result;
      if (isLogin) {
        // Login flow
        result = await signIn(formData.email, formData.password);
        if (result.profile?.collection === "astrologers") {
          if (!result.profile.experience) {
            setError("Your astrologer profile is missing an experience level. Please update your profile before continuing.");
            return;
          }
          router.push("/astrologer-dashboard"); // Redirect to astrologer dashboard
        } else {
          router.push("/unauthorized"); // Redirect if not an astrologer
        }
      } else {
        // Signup flow
        const user = await signUp(formData.email, formData.password, {
          displayName: formData.name, // Set display name in auth profile
        });

        // Create astrologer profile in Firestore
        await setDoc(doc(db, "astrologers", user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "",
          specialization: formData.specialization,
          experience: formData.experience,
          languages: formData.languages.split(",").map((l) => l.trim()), // Parse comma-separated languages
          role: "astrologer",
          status: "offline",
          rating: 0,
          reviews: 0,
          verified: false,
          isOnline: false,
          bio: `Expert in ${formData.specialization} with ${formData.experience} of experience.`, // Auto-generate bio
          createdAt: new Date().toISOString(),
        });

        // Set initial offline status via API
        await fetch("/api/astrologer/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId: user.uid,
            action: "set-offline",
          }),
        });

        // Persist role in localStorage for future redirects
        try {
          if (typeof window !== "undefined")
            localStorage.setItem("tgs:role", "astrologer");
        } catch (e) {
          // Ignore localStorage errors (e.g., private browsing)
        }
        router.push("/astrologer-dashboard");
      }
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  /**
   * Handle Google OAuth sign-in.
   * If new user, creates astrologer profile with defaults.
   * Redirects based on existing profile role.
   */
  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithGoogle();

      if (!result.profile) {
        // New user: Create default astrologer profile
        await setDoc(doc(db, "astrologers", result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          role: "astrologer",
          status: "offline",
          rating: 0,
          reviews: 0,
          verified: false,
          isOnline: false,
          specialization: "Vedic Astrology", // Default specialization
          experience: "1-3 years", // Default experience
          languages: ["English"], // Default languages
          bio: "Experienced astrologer providing guidance and insights.", // Default bio
          createdAt: new Date().toISOString(),
        });
        // Persist role in localStorage
        try {
          if (typeof window !== "undefined")
            localStorage.setItem("tgs:role", "astrologer");
        } catch (e) {
          // Ignore localStorage errors
        }
        router.push("/astrologer-dashboard");
      } else {
        // Existing user: Redirect based on role
        if (result.profile.collection === "astrologers") {
          router.push("/astrologer-dashboard");
        } else {
          router.push("/unauthorized");
        }
      }
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  /* ──────  RENDER  ────── */

  // Main render: Authentication page layout
  return (
    <div className="astrologer-auth-page">
      {/* Animated background orbs – decorative elements */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Back button – allows navigation back in browser history */}
      <button
        className="back-btn"
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ArrowLeft />
      </button>

      {/* Main container – centered auth card */}
      <div className="astrologer-auth-container">
        <div className="astrologer-auth-card">
          <div className="accent-line" /> {/* Decorative accent line */}
          {/* Grid layout: Promo panel left, form panel right */}
          <div className="astrologer-auth-grid">
            {/* LEFT – Promo Panel – Marketing content to engage users */}
            <div className="astrologer-promo-panel">
              <div className="promo-title-row">
                <div className="promo-icon-badge">
                  <Sparkles />
                </div>
                <h2 className="promo-title">
                  {isLogin ? "Welcome Back" : "Join Our Network"}
                </h2>
              </div>

              <div className="promo-features">
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Build your reputation</span>
                </div>
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Flexible scheduling</span>
                </div>
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Connect with seekers</span>
                </div>
              </div>
            </div>

            {/* RIGHT – Form Panel – Authentication form */}
            <div className="astrologer-form-panel">
              {/* Header */}
              <div className="form-panel-header">
                <h1 className="form-panel-title">
                  {isLogin ? t.auth.astrologerSignIn : t.auth.createAstrologerProfile}
                </h1>
                <p className="form-panel-subtitle">
                  {isLogin ? t.auth.accessDashboard : t.auth.joinCommunity}
                </p>
              </div>

              {/* Error Alert – Displays validation or auth errors */}
              {error && (
                <div className="error-alert" role="alert">
                  {error}
                </div>
              )}

              {/* Form – Handles submission with dynamic fields */}
              <form
                onSubmit={handleSubmit}
                className="astrologer-form"
                noValidate
              >
                {/* ==== SIGN-UP ONLY FIELDS ==== – Conditionally rendered */}
                {!isLogin && (
                  <>
                    {/* Name */}
                    <div className="form-field">
                      <label className="form-field-label">{t.formFields.fullName}</label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="form-field-input"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="form-field">
                      <label className="form-field-label">{t.formFields.phone}</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="form-field-input"
                        required
                      />
                    </div>

                    {/* Specialization */}
                    <div className="form-field">
                      <label className="form-field-label">{t.auth.specialization}</label>
                      <select
                        value={formData.specialization}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            specialization: e.target.value,
                          })
                        }
                        className="form-field-input"
                        required
                      >
                        <option value="">Select your specialization</option>
                        <option value="Vedic Astrology">Vedic Astrology</option>
                        <option value="Tarot Reading">Tarot Reading</option>
                        <option value="Numerology">Numerology</option>
                        <option value="Palmistry">Palmistry</option>
                        <option value="Vastu Shastra">Vastu Shastra</option>
                        <option value="Face Reading">Face Reading</option>
                      </select>
                    </div>

                    {/* Experience */}
                    <div className="form-field">
                      <label className="form-field-label">
                        {t.auth.yearsOfExperience}
                      </label>
                      <select
                        value={formData.experience}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            experience: e.target.value,
                          })
                        }
                        className="form-field-input"
                        required
                      >
                        <option value="">Select experience level</option>
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5-10 years">5-10 years</option>
                        <option value="10+ years">10+ years</option>
                      </select>
                    </div>

                    {/* Languages */}
                    <div className="form-field">
                      <label className="form-field-label">{t.auth.languages}</label>
                      <input
                        type="text"
                        placeholder="e.g., Hindi, English, Tamil"
                        value={formData.languages}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            languages: e.target.value,
                          })
                        }
                        className="form-field-input"
                        required
                      />
                      <p className="form-field-helper">
                        Separate multiple languages with commas
                      </p>
                    </div>
                  </>
                )}

                {/* ==== COMMON FIELDS ==== – Email and Password */}
                {/* Email */}
                <div className="form-field">
                  <label className="form-field-label">{t.formFields.email}</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="form-field-input"
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-field">
                  <label className="form-field-label">{t.formFields.password}</label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="form-field-input password-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                {/* Submit Button – With loading spinner */}
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner" /> {/* Inline spinner */}
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  )}
                </button>
              </form>

              {/* Divider – Separates form from Google button */}
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">OR CONTINUE WITH</span>
                <div className="divider-line" />
              </div>

              {/* Google Button – OAuth integration */}
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="google-btn"
                type="button"
              >
                <svg
                  className="google-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.75c1.63 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google</span>
              </button>

              {/* Toggle Login/Signup – Switch between modes */}
              <p className="toggle-text">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="toggle-link"
                  type="button"
                >
                  {isLogin ? "Sign up now" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
