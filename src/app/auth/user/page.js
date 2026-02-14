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

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { trackEvent, trackPageView } from "@/lib/analytics";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";

/**
 * OTP Countdown Component
 * Shows remaining time until OTP expires
 */
function OTPCountdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        onExpired();
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (!timeLeft || timeLeft === 'Expired') {
    return null;
  }

  return (
    <p style={{ 
      fontSize: '12px', 
      color: '#666', 
      marginTop: '4px', 
      textAlign: 'center',
      fontWeight: '500'
    }}>
      OTP expires in: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{timeLeft}</span>
    </p>
  );
}

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
  
  // Track page view on mount
  useEffect(() => {
    trackPageView('/auth/user', 'User Authentication');
    
    // Cleanup on unmount
    return () => {
      // Clean up phone auth session on unmount
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthConfirmation');
      }
    };
  }, []);
  
  // Form state management
  const [isLogin, setIsLogin] = useState(true); // Toggle between login (true) and signup (false) modes
  const [authMethod, setAuthMethod] = useState("email"); // "email" or "phone"
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [otpSent, setOtpSent] = useState(false); // Whether OTP has been sent
  const [otpExpiresAt, setOtpExpiresAt] = useState(null); // OTP expiration timestamp
  const [formData, setFormData] = useState({
    email: "", // Email address
    password: "", // Password
    name: "", // Full name (signup only)
    phone: "", // Phone number
    otp: "", // OTP code
  });
  const [error, setError] = useState(""); // Form submission error message

  // Auth and routing hooks
  const { signIn, signUp, signInWithGoogle, signInWithPhoneNumber, verifyOTP, loading } = useAuth(); // Auth context methods and loading state
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
        // Track login attempt
        trackEvent('login_attempt', { method: 'email' });
        
        // Login flow
        const result = await signIn(formData.email, formData.password);
        
        // Track successful login
        trackEvent('login_success', { method: 'email' });
        
        if (result.profile?.collection === "users") {
          // Check for return URL stored before login
          const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('tgs:returnUrl') : null;
          if (returnUrl) {
            sessionStorage.removeItem('tgs:returnUrl');
            router.push(returnUrl);
          } else {
            router.push("/talk-to-astrologer"); // Default redirect
          }
        } else {
          router.push("/unauthorized"); // Redirect if not a user
        }
      } else {
        // Track signup attempt
        trackEvent('signup_attempt', { method: 'email' });
        
        // SIGNUP FLOW
        const user = await signUp(formData.email, formData.password, {
          displayName: formData.name, // Set display name in auth profile
        });

        // Create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "",
          role: "user",
          authProvider: "email",
          createdAt: new Date().toISOString(),
        });

        // Track successful signup
        trackEvent('signup_success', { method: 'email' });
        
        // Check for return URL stored before signup
        const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('tgs:returnUrl') : null;
        if (returnUrl) {
          sessionStorage.removeItem('tgs:returnUrl');
          router.push(returnUrl);
        } else {
          router.push("/talk-to-astrologer"); // Default redirect
        }
      }
    } catch (err) {
      // Track auth failure
      trackEvent(isLogin ? 'login_failed' : 'signup_failed', {
        method: 'email',
        error: err.message
      });
      setError(err.message); // Display error message
    }
  };

  // --------------------------------------------------------------------------
  // PHONE AUTHENTICATION
  // --------------------------------------------------------------------------
  /**
   * Handle phone number OTP request.
   * Sends OTP to the provided phone number.
   */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.phone) {
      setError("Please enter your phone number");
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = formData.phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError("Please enter a valid phone number with country code (e.g., +919305897506)");
      return;
    }

    try {
      trackEvent('login_attempt', { method: 'phone' });
      
      const result = await signInWithPhoneNumber(cleanPhone);
      
      setOtpSent(true);
      setError("");
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      setOtpExpiresAt(expiresAt);
    } catch (err) {
      trackEvent('login_failed', { method: 'phone', error: err.message });
      setError(err.message || "Failed to send OTP. Please try again.");
      setOtpSent(false);
      setOtpExpiresAt(null);
    }
  };

  /**
   * Handle OTP verification.
   * Verifies the OTP code and signs in the user.
   */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.otp || formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      // Verify OTP and authenticate
      const result = await verifyOTP(formData.otp, !isLogin ? formData.name : null);
      
      trackEvent('login_success', { method: 'phone' });

      // Profile is already created in verifyOTP, just redirect

      // Redirect based on role
      if (result.profile?.collection === "users" || !result.profile) {
        const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('tgs:returnUrl') : null;
        if (returnUrl) {
          sessionStorage.removeItem('tgs:returnUrl');
          router.push(returnUrl);
        } else {
          router.push("/talk-to-astrologer");
        }
      } else {
        router.push("/unauthorized");
      }
    } catch (err) {
      trackEvent('login_failed', { method: 'phone', error: err.message });
      setError(err.message || "Invalid OTP. Please try again.");
    }
  };

  /**
   * Reset phone auth state and resend OTP
   * This will trigger a new OTP request with fresh reCAPTCHA
   */
  const handleResendOTP = async () => {
    setError("");
    setOtpSent(false);
    setOtpExpiresAt(null);
    
    // Clear the OTP input
    setFormData({ ...formData, otp: "" });
    
    // Clear any stored session
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tgs:phoneAuthConfirmation');
    }
    
    // Automatically resend OTP if phone number is still available
    if (formData.phone) {
      try {
        // Small delay to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Resend OTP
        await handleSendOTP({ preventDefault: () => {} });
      } catch (err) {
        // Error will be set by handleSendOTP
        console.error('Error resending OTP:', err);
      }
    } else {
      setError("Phone number is required to resend OTP.");
    }
  };

  // --------------------------------------------------------------------------
  // GOOGLE AUTHENTICATION
  // --------------------------------------------------------------------------
  /**
   * Handle Google OAuth sign-in.
   * Works independently of email/phone auth method selection.
   * If new user, creates user profile with defaults.
   * Redirects based on existing profile role.
   */
  const handleGoogleAuth = async () => {
    setError(""); // Clear previous errors
    setOtpSent(false); // Reset phone auth state if any

    // Track Google auth attempt
    trackEvent('login_attempt', { method: 'google' });

    try {
      const result = await signInWithGoogle();
      
      // Track successful Google auth
      trackEvent('login_success', { method: 'google' });

      // Check if profile exists
      if (!result.profile) {
        // Create new user profile with Google account details
        await setDoc(doc(db, "users", result.user.uid), {
          name: result.user.displayName || "User",
          email: result.user.email || "",
          photoURL: result.user.photoURL || "",
          role: "user",
          authProvider: "google",
          createdAt: new Date().toISOString(),
        });
        
        // Check for return URL stored before signup
        const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('tgs:returnUrl') : null;
        if (returnUrl) {
          sessionStorage.removeItem('tgs:returnUrl');
          router.push(returnUrl);
        } else {
          router.push("/talk-to-astrologer");
        }
      } else {
        if (result.profile.collection === "users") {
          // Check for return URL stored before login
          const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('tgs:returnUrl') : null;
          if (returnUrl) {
            sessionStorage.removeItem('tgs:returnUrl');
            router.push(returnUrl);
          } else {
            router.push("/talk-to-astrologer");
          }
        } else {
          router.push("/unauthorized");
        }
      }
    } catch (err) {
      // Track Google auth failure
      trackEvent('login_failed', { method: 'google', error: err.message });
      setError(err.message); // Display error message
    }
  };

  // --------------------------------------------------------------------------
  // FORM FIELD HANDLERS
  // --------------------------------------------------------------------------
  /**
   * Toggle between login and signup modes.
   * Clears any existing errors and resets form state.
   */
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setOtpSent(false);
    setShowPassword(false);
    setFormData({ email: "", password: "", name: "", phone: "", otp: "" });
  };

  /**
   * Toggle between email and phone authentication methods.
   * Resets form state when switching methods.
   */
  const toggleAuthMethod = (method) => {
    setAuthMethod(method);
    setError("");
    setOtpSent(false);
    setShowPassword(false);
    setFormData({ email: "", password: "", name: "", phone: "", otp: "" });
    
    // Clean up reCAPTCHA when switching methods
    if (method === "email" && typeof window !== 'undefined') {
      // reCAPTCHA cleanup is handled by AuthContext
      sessionStorage.removeItem('tgs:phoneAuthConfirmation');
    }
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
  // Main render: Two-panel layout matching /auth/astrologer (golden left, cream form right)
  return (
    <div className="astrologer-auth-page">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <button
        className="back-btn"
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ArrowLeft />
      </button>

      <div className="astrologer-auth-container">
        <div className="astrologer-auth-card">
          <div className="accent-line" />
          <div className="astrologer-auth-grid">
            {/* LEFT – Promo panel (golden, same style as astrologer) */}
            <div className="astrologer-promo-panel">
              <div className="promo-title-row">
                <div className="promo-icon-badge">
                  <Sparkles />
                </div>
                <h2 className="promo-title">
                  {isLogin ? "Welcome Back" : "Join Our Journey"}
                </h2>
              </div>
              <div className="promo-features">
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Connect with expert astrologers</span>
                </div>
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Get personalized guidance</span>
                </div>
                <div className="promo-feature">
                  <Star className="promo-feature-icon" />
                  <span>Book sessions easily</span>
                </div>
              </div>
            </div>

            {/* RIGHT – Form panel (cream, same style as astrologer) */}
            <div className="astrologer-form-panel">
              <div className="form-panel-header">
                <h1 className="form-panel-title">
                  {isLogin ? "User Sign In" : "Create Account"}
                </h1>
                <p className="form-panel-subtitle">
                  {isLogin
                    ? "Access your account and connect with astrologers"
                    : "Join our community and start your journey"}
                </p>
              </div>

              {error && (
                <div className="error-alert" role="alert">
                  {error}
                </div>
              )}

              <div className="auth-method-toggle">
                <button
                  type="button"
                  onClick={() => toggleAuthMethod("email")}
                  className={`auth-toggle-btn ${authMethod === "email" ? "auth-toggle-btn-active" : ""}`}
                  aria-pressed={authMethod === "email" ? "true" : "false"}
                >
                  <Mail className="auth-toggle-icon" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleAuthMethod("phone")}
                  className={`auth-toggle-btn ${authMethod === "phone" ? "auth-toggle-btn-active" : ""}`}
                  aria-pressed={authMethod === "phone" ? "true" : "false"}
                >
                  <Phone className="auth-toggle-icon" />
                  <span>Phone</span>
                </button>
              </div>

              <div id="recaptcha-container" style={{ display: "none" }} />

              <form
                onSubmit={authMethod === "phone" && otpSent ? handleVerifyOTP : authMethod === "phone" ? handleSendOTP : handleSubmit}
                className="astrologer-form"
                noValidate
              >
                {/* Phone Authentication Fields */}
                {authMethod === "phone" && (
            <>
              {/* Phone number input - shown before OTP is sent */}
              {!otpSent && (
                <>
                  {!isLogin && (
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
                        required={!isLogin}
                        aria-label={t.formFields.fullName}
                      />
                    </div>
                  )}
                  <div className="form-field">
                    <label className="form-field-label">
                      <Phone />
                      <span>Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+1234567890 (with country code)"
                      value={formData.phone}
                      onChange={(e) => updateFormField("phone", e.target.value)}
                      className="form-field-input"
                      required
                      aria-label="Phone Number"
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Enter your phone number with country code (e.g., +91 for India, +1 for USA)
                    </p>
                  </div>
                </>
              )}

              {/* OTP input - shown after OTP is sent */}
              {otpSent && (
                <>
                  <div className="form-field">
                    <label className="form-field-label">
                      <Phone />
                      <span>Enter OTP</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={formData.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        updateFormField("otp", value);
                      }}
                      className="form-field-input"
                      required
                      maxLength={6}
                      aria-label="OTP Code"
                      style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'center' }}>
                      OTP sent to {formData.phone}
                    </p>
                    {otpExpiresAt && (
                      <OTPCountdown expiresAt={otpExpiresAt} onExpired={() => {
                        setOtpSent(false);
                        setOtpExpiresAt(null);
                        setError("OTP has expired. Please request a new OTP.");
                      }} />
                    )}
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="auth-resend-otp-btn"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Email Authentication Fields */}
          {authMethod === "email" && (
            <>
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
            </>
          )}

                <button
                  type="submit"
                  disabled={loading}
                  className="submit-btn"
                  aria-label={
                    authMethod === "phone" && otpSent
                      ? "Verify OTP"
                      : authMethod === "phone"
                        ? "Send OTP"
                        : isLogin
                          ? "Sign in"
                          : "Create account"
                  }
                >
                  {loading ? (
                    <>
                      <div className="spinner" />
                      <span>{t.messages.processing}</span>
                    </>
                  ) : (
                    <span>
                      {authMethod === "phone" && otpSent
                        ? "Verify OTP"
                        : authMethod === "phone"
                          ? "Send OTP"
                          : isLogin
                            ? t.auth.signIn
                            : t.auth.createAccount}
                    </span>
                  )}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">
                  {t.auth.signInWithGoogle === "Sign in with Google" ? "OR CONTINUE WITH" : "या जारी रखें"}
                </span>
                <div className="divider-line" />
              </div>

              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="google-btn"
                type="button"
                aria-label="Continue with Google"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 6.75c1.63 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google</span>
              </button>

              <p className="toggle-text">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={toggleAuthMode} className="toggle-link" type="button">
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
