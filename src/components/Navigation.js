"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  User,
  Menu,
  X,
  Calendar,
  Star,
  BookOpen,
  Eye,
  EyeOff,
  Phone,
  Wallet,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import "./navigation.css";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, signIn, signUp, signOut, signInWithGoogle } =
    useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalPosition, setModalPosition] = useState("center");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [authTab, setAuthTab] = useState("signin");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPwSignin, setShowPwSignin] = useState(false);
  const [showPwSignup, setShowPwSignup] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  // Astrologer-specific navigation items
  const astrologerNavItems = [
    { href: "/astrologer-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: `/account/astrologer/${user?.uid}`, label: "My Profile", icon: User },
    { href: "/profile/astrology", label: "Account Settings", icon: Settings },
  ];

  // Regular user navigation items
  const userNavItems = [
    { href: "/talk-to-astrologer", label: "Talk to Astrologer", icon: Phone },
    { href: "/predictions", label: "AI Predictions", icon: Star },
    { href: "/matching", label: "Matching", icon: BookOpen },
    {
      href: null,
      label: "More",
      icon: MoreHorizontal,
      children: [
        { href: "/numerology", label: "Numerology" },
        { href: "/transit", label: "Planetary Transit" },
        { href: "/cosmic-event-tracker", label: "Cosmic Events Tracker" },
        { href: "/panchang", label: "Panchang" },
      ],
    },
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/profile/user", label: "My Account", icon: User },
  ];

  // When user logs in from the centered auth modal, switch to top-right profile view automatically
  useEffect(() => {
    if (user && showProfileModal) {
      setModalPosition("top-right");
    }
  }, [user, showProfileModal]);

  // Close more dropdown when mobile menu closes
  useEffect(() => {
    if (!isOpen) {
      setShowMoreDropdown(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreDropdown && !event.target.closest("[data-dropdown-container]")) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMoreDropdown]);

  // Determine which nav items to show based on user type
  const navItems = userProfile?.collection === "astrologers" 
    ? astrologerNavItems 
    : userNavItems;

  console.log("User profile:", userProfile);
  console.log("User role:", userProfile?.role);
  console.log("Navigation items:", navItems);

  async function handleAccountClick() {
    if (user) {
      // Redirect based on user type
      try {
        if (userProfile?.collection === "astrologers") {
          router.push("/profile/astrology");
        } else {
          router.push("/profile/user");
        }
      } catch (e) {
        console.error("Failed to navigate to profile page:", e);
      }
    } else {
      router.push("/auth");
    }
  }

  async function onSignOutClick() {
    try {
      const wasAstrologer = userProfile?.collection === "astrologers";
      await signOut();
      setShowProfileModal(false);
      await new Promise((res) => setTimeout(res, 50));
      try {
        router.refresh();
      } catch (e) {
        /* ignore */
      }
      if (wasAstrologer) {
        router.replace("/");
      } else {
        router.replace("/auth");
      }
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    try {
      await signIn(email, password);
    } catch (err) {
      setAuthError("Failed to sign in. Please check your credentials.");
      console.error("Nav SignIn error", err);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name")?.toString() || "";
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    const confirm = form.get("confirm")?.toString() || "";
    if (password !== confirm) {
      setAuthError("Passwords do not match");
      setAuthSubmitting(false);
      return;
    }
    try {
      await signUp(email, password, { displayName: name });
      setDisplayName(name);
    } catch (err) {
      setAuthError("Failed to create account. Please try again.");
      console.error("Nav SignUp error", err);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function onSaveProfile(e) {
    e?.preventDefault?.();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      const ref = doc(db, "users", user.uid);
      const payload = {
        phone,
        dob,
        gender,
        location,
        email: user.email || "",
        displayName,
      };
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, payload);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <nav className="enhanced-nav">
      <div className="nav-container">
        <div className="nav-content">
          <Link href="/" className="nav-logo-wrapper">
            <div className="nav-logo-icon">
              <Sparkles />
            </div>
            <span className="nav-logo-text">TheGodSays</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-desktop">
            {navItems.map((item) => {
              const Icon = item.icon;

              // Handle dropdown menu (More) - only for users
              if (item.children) {
                const isActive = item.children.some(child => pathname === child.href)
                return (
                  <div 
                    key={item.label} 
                    className="nav-dropdown"
                    data-dropdown-container
                    onMouseEnter={() => setShowMoreDropdown(true)}
                    onMouseLeave={() => setShowMoreDropdown(false)}
                  >
                    <button
                      className={`nav-dropdown-button ${isActive ? 'active' : ''}`}
                      onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                    
                    {showMoreDropdown && (
                      <>
                        <div className="nav-dropdown-bridge"></div>
                        <div className="nav-dropdown-menu">
                          <div className="nav-dropdown-content">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`nav-dropdown-item ${
                                  pathname === child.href ? 'active' : ''
                                }`}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${
                    pathname === item.href ? "nav-link-active" : ""
                  }`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button className="nav-mobile-btn" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="nav-mobile-menu">
            <div className="nav-mobile-menu-content">
              {navItems.map((item) => {
                const Icon = item.icon;

                // Handle dropdown menu (More) in mobile - only for users
                if (item.children) {
                  const isActive = item.children.some(child => pathname === child.href)
                  return (
                    <div key={item.label} data-dropdown-container>
                      {/* More button */}
                      <button
                        type="button"
                        className={`nav-mobile-dropdown-button ${isActive ? 'active' : ''}`}
                        onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                      >
                        <div className="flex items-center">
                          <Icon />
                          <span style={{ marginLeft: '0.5rem' }}>{item.label}</span>
                        </div>
                        <ChevronDown className={`chevron-icon ${showMoreDropdown ? 'rotated' : ''}`} />
                      </button>
                      
                      {/* Expandable children */}
                      {showMoreDropdown && (
                        <div className="nav-mobile-dropdown-content">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`nav-mobile-dropdown-item ${
                                pathname === child.href ? 'active' : ''
                              }`}
                              onClick={() => {
                                setIsOpen(false)
                                setShowMoreDropdown(false)
                              }}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-mobile-link ${
                      pathname === item.href ? "nav-mobile-link-active" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile / Auth Modal – Using ONLY globals.css */}
        <Modal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          title={
            user
              ? "My Profile"
              : authTab === "signin"
              ? "Sign In"
              : "Create Account"
          }
          position={modalPosition}
          topOffset={modalPosition === "top-right" ? 80 : undefined}
          className="wider-modal"
        >
          {user ? (
            <form onSubmit={onSaveProfile} className="form">
              <div className="form-group">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <input
                  className="input input-disabled"
                  value={user.email || ""}
                  disabled
                />
              </div>

              {userProfile?.collection && (
                <div className="form-group">
                  <label className="label">Role</label>
                  <input
                    className="input input-disabled capitalize"
                    value={
                      userProfile.collection === "astrologers"
                        ? "Astrologer"
                        : "User"
                    }
                    disabled
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                />
              </div>

              <div className="form-group">
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Gender</label>
                <select
                  className="input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Location</label>
                <input
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn submit-btn"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  variant="outline"
                  onClick={onSignOutClick}
                  className="btn submit-btn"
                >
                  Sign Out
                </button>
              </div>
            </form>
          ) : (
            <div className="auth-container">
              {/* Tab Switcher */}
              <div className="tab-switcher">
                <button
                  type="button"
                  onClick={() => setAuthTab("signin")}
                  className={`tab ${authTab === "signin" ? "tab-active" : ""}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab("signup")}
                  className={`tab ${authTab === "signup" ? "tab-active" : ""}`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Message */}
              {authError && (
                <div className="alert alert-error">{authError}</div>
              )}

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={async () => {
                  setAuthError("");
                  try {
                    await signInWithGoogle();
                  } catch (e) {
                    setAuthError("Google sign-in failed");
                    console.error(e);
                  }
                }}
                className="btn btn-google"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="icon-google"
                >
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.6 32.4 29.2 36 24 36 16.8 36 11 30.2 11 23s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.5 4.1 29.5 2 24 2 12.3 2 3 11.3 3 23s9.3 21 21 21c10.5 0 20-7.6 20-21 0-1.7-.2-3.3-.4-4.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.5 4.1 29.5 2 24 2 15.5 2 8.2 6.7 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.1 0 9.8-1.9 13.4-5.1l-6.2-5.1C29 35.5 26.7 36 24 36c-5.2 0-9.6-3.6-11.3-8.5l-6.5 5C8.1 38.9 15.4 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.3-5.9 6.8l6.2 5.1C38.6 37.8 42 31.6 42 23c0-1.7-.2-3.3-.4-4.5z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="divider">
                <span>or</span>
              </div>

              {/* Sign In / Sign Up Forms */}
              {authTab === "signin" ? (
                <form onSubmit={handleSignIn} className="form">
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="input"
                    />
                  </div>

                  <div className="form-group password-group">
                    <label className="label">Password</label>
                    <input
                      name="password"
                      type={showPwSignin ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwSignin((v) => !v)}
                      className="btn-icon"
                      aria-label={
                        showPwSignin ? "Hide password" : "Show password"
                      }
                    >
                      {showPwSignin ? (
                        <EyeOff className="icon" />
                      ) : (
                        <Eye className="icon" />
                      )}
                    </button>
                  </div>

                  <Button
                    className="btn-full"
                    type="submit"
                    disabled={authSubmitting}
                  >
                    {authSubmitting ? "Signing In…" : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="form">
                  <div className="form-group">
                    <label className="label">Full Name</label>
                    <input
                      name="name"
                      placeholder="Your name"
                      required
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Email</label>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="input"
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group password-group">
                      <label className="label">Password</label>
                      <input
                        name="password"
                        type={showPwSignup ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        required
                        className="input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwSignup((v) => !v)}
                        className="btn-icon"
                        aria-label={
                          showPwSignup ? "Hide password" : "Show password"
                        }
                      >
                        {showPwSignup ? (
                          <EyeOff className="icon" />
                        ) : (
                          <Eye className="icon" />
                        )}
                      </button>
                    </div>

                    <div className="form-group password-group">
                      <label className="label">Confirm</label>
                      <input
                        name="confirm"
                        type={showPwConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        required
                        className="input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwConfirm((v) => !v)}
                        className="btn-icon"
                        aria-label={
                          showPwConfirm ? "Hide password" : "Show password"
                        }
                      >
                        {showPwConfirm ? (
                          <EyeOff className="icon" />
                        ) : (
                          <Eye className="icon" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    className="btn-full"
                    type="submit"
                    disabled={authSubmitting}
                  >
                    {authSubmitting ? "Creating…" : "Create Account"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </Modal>
      </div>
    </nav>
  );
};

export default Navigation;