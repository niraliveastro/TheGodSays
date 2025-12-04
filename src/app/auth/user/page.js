"use client";

/**
 * User Authentication Module
 *
 * This module provides the authentication interface for regular users (seekers) in a consultation platform.
 * It supports both email/password login and signup, as well as Google OAuth integration.
 * Upon successful authentication, it creates or verifies a user profile in Firestore
 * and redirects to the astrologer consultation page. The form dynamically switches between login and signup modes.
 *
 * Key Features:
 * - Toggle between login and signup forms.
 * - Password visibility toggle.
 * - Form validation and error handling.
 * - Google OAuth with automatic profile creation for new users.
 * - Firestore integration for storing user profiles.
 * - Role-based redirection (users only).
 *
 * Dependencies:
 * - React (useState)
 * - Next.js (useRouter)
 * - Firebase Firestore (doc, setDoc)
 * - AuthContext: Provides signIn, signUp, signInWithGoogle, loading
 * - Lucide React icons
 *
 * Styling: Relies on CSS classes (e.g., .auth-page, .form-field-input) defined in external stylesheets.
 * Assumes global CSS for animations, gradients, and responsive design.
 *
 * @module UserAuth
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  Sparkles,
} from "lucide-react";

/**
 * UserAuth Component
 *
 * The main authentication form for users.
 * Renders a centered card layout with logo, form fields, and Google OAuth option.
 * Handles form submission, Google sign-in, and conditional field rendering based on login/signup mode.
 *
 * @returns {JSX.Element} The authentication page UI.
 */
export default function UserAuth() {
  const { t } = useTranslation();
  
  // Form state management
  const [isLogin, setIsLogin] = useState(true); // Toggle between login (true) and signup (false) modes
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [formData, setFormData] = useState({
    email: "", // Email address
    password: "", // Password
    name: "", // Full name (signup only)
    phone: "", // Phone number (signup only)
  });
  const [error, setError] = useState(""); // Form submission error message

  // Auth and routing hooks
  const { signIn, signUp, signInWithGoogle, loading } = useAuth(); // Auth context methods and loading state
  const router = useRouter(); // Next.js router for navigation

  // --------------------------------------------------------------------------
  // EMAIL/PASSWORD AUTHENTICATION
  // --------------------------------------------------------------------------
  /**
   * Handle form submission for login or signup.
   * For login: Authenticates and redirects based on user role.
   * For signup: Creates auth user, stores user profile in Firestore, and redirects to consultation page.
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      if (isLogin) {
        // Login flow
        const result = await signIn(formData.email, formData.password);
        if (result.profile?.collection === "users") {
          router.push("/talk-to-astrologer"); // Redirect to astrologer consultation page
        } else {
          router.push("/unauthorized"); // Redirect if not a user
        }
      } else {
        // SIGNUP FLOW
        const user = await signUp(formData.email, formData.password, {
          displayName: formData.name, // Set display name in auth profile
        });

        // Create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: "user",
          createdAt: new Date().toISOString(),
        });

        router.push("/talk-to-astrologer");
      }
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  // --------------------------------------------------------------------------
  // GOOGLE AUTHENTICATION
  // --------------------------------------------------------------------------
  /**
   * Handle Google OAuth sign-in.
   * If new user, creates user profile with defaults.
   * Redirects based on existing profile role.
   */
  const handleGoogleAuth = async () => {
    setError(""); // Clear previous errors

    try {
      const result = await signInWithGoogle();

      // Check if profile exists
      if (!result.profile) {
        // Create new user profile
        await setDoc(doc(db, "users", result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          role: "user",
          createdAt: new Date().toISOString(),
        });
        router.push("/talk-to-astrologer");
      } else {
        if (result.profile.collection === "users") {
          router.push("/talk-to-astrologer");
        } else {
          router.push("/unauthorized");
        }
      }
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  // --------------------------------------------------------------------------
  // FORM FIELD HANDLERS
  // --------------------------------------------------------------------------
  /**
   * Toggle between login and signup modes.
   * Clears any existing errors.
   */
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  /**
   * Update a specific field in the form data state.
   * @param {string} field - Field name (e.g., 'email', 'name')
   * @param {string} value - New value for the field
   */
  const updateFormField = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // ============================================================================
  // RENDER UI
  // ============================================================================
  // Main render: Authentication page layout
  return (
    <div className="auth-page">
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

      {/* Auth card – centered container for form and branding */}
      <div className="auth-card">
        <div className="accent-line" /> {/* Decorative accent line */}
        {/* Logo section – Branding and dynamic messaging */}
        <div className="logo-section">
          <div className="logo-badge">
            <div className="logo-icon">
              <Sparkles />
            </div>
            <span className="logo-text">TheGodSays</span>
          </div>
          <h1 className="auth-title">
            {isLogin ? "Welcome Back" : "Join Our Journey"}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Continue your cosmic exploration"
              : "Begin your path to enlightenment"}
          </p>
        </div>
        {/* Error alert – Displays validation or auth errors */}
        {error && (
          <div className="error-alert" role="alert">
            {error}
          </div>
        )}
        {/* Auth form – Handles submission with dynamic fields */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Sign-up only fields – Conditionally rendered */}
          {!isLogin && (
            <>
              <div className="form-field">
                <label className="form-field-label">
                  <User />
                  <span>{t.formFields.fullName}</span>
                </label>
                <input
                  type="text"
                  placeholder={t.formFields.enterFullName}
                  value={formData.name}
                  onChange={(e) => updateFormField("name", e.target.value)}
                  className="form-field-input"
                  required
                  aria-label={t.formFields.fullName}
                />
              </div>

              <div className="form-field">
                <label className="form-field-label">
                  <Phone />
                  <span>{t.formFields.phone}</span>
                </label>
                <input
                  type="tel"
                  placeholder={t.formFields.phonePlaceholder}
                  value={formData.phone}
                  onChange={(e) => updateFormField("phone", e.target.value)}
                  className="form-field-input"
                  required
                  aria-label={t.formFields.phone}
                />
              </div>
            </>
          )}

          {/* Email field – Common to both modes */}
          <div className="form-field">
            <label className="form-field-label">
              <Mail />
              <span>{t.formFields.email}</span>
            </label>
            <input
              type="email"
              placeholder={t.formFields.emailPlaceholder}
              value={formData.email}
              onChange={(e) => updateFormField("email", e.target.value)}
              className="form-field-input"
              required
              aria-label={t.formFields.email}
            />
          </div>

          {/* Password field – Common to both modes */}
          <div className="form-field">
            <label className="form-field-label">
              <Lock />
              <span>{t.formFields.password}</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.formFields.passwordPlaceholder}
                value={formData.password}
                onChange={(e) => updateFormField("password", e.target.value)}
                className="form-field-input password-input"
                required
                aria-label={t.formFields.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Submit button – With loading spinner */}
          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            aria-label={isLogin ? "Sign in" : "Create account"}
          >
            {loading ? (
              <>
                <div className="spinner" /> {/* Inline spinner */}
                <span>{t.messages.processing}</span>
              </>
            ) : (
              <span>{isLogin ? t.auth.signIn : t.auth.createAccount}</span>
            )}
          </button>
        </form>
        {/* Divider – Separates form from Google button */}
        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">{t.auth.signInWithGoogle === "Sign in with Google" ? "OR CONTINUE WITH" : "या जारी रखें"}</span>
          <div className="divider-line" />
        </div>
        {/* Google sign-in button – OAuth integration */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="google-btn"
          type="button"
          aria-label="Continue with Google"
        >
          <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
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
        {/* Toggle between login/signup – Switch modes */}
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={toggleAuthMode}
            className="toggle-link"
            type="button"
          >
            {isLogin ? "Sign up now" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
