"use client";

import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, query, where, getDocs, collection } from "firebase/firestore";

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
  signInWithPhoneNumber: async () => {},
  verifyOTP: async () => {},
  getUserId: () => null,
  getUserRole: () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Use refs to persist phone auth state across re-renders
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      // Try users collection first
      let docRef = doc(db, 'users', uid);
      let docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...docSnap.data(), role: 'user', collection: 'users' };
      }
      
      // Try astrologers collection
      docRef = doc(db, 'astrologers', uid);
      docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...docSnap.data(), role: 'astrologer', collection: 'astrologers' };
      }
      
      return null;
    } catch (error) {
      if (error.code === 'unavailable') {
        console.warn('Firebase is offline - using cached data or default profile');
        // Return a default profile for astrologers when offline
        return { role: 'astrologer', name: 'Astrologer', collection: 'astrologers' };
      }
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Migrate guest conversations to user account on login
  const migrateGuestChats = async (userId) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Get guest chat messages from sessionStorage
      const predictionKey = 'tgs:guest_chat:prediction';
      const matchmakingKey = 'tgs:guest_chat:matchmaking';
      
      const predictionMessages = (() => {
        try {
          const stored = sessionStorage.getItem(predictionKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.error('Error reading guest prediction chat:', e);
        }
        return [];
      })();
      
      const matchmakingMessages = (() => {
        try {
          const stored = sessionStorage.getItem(matchmakingKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.error('Error reading guest matchmaking chat:', e);
        }
        return [];
      })();
      
      // Migrate conversations if there are guest messages
      const migrations = [];
      if (predictionMessages.length > 0) {
        migrations.push(
          fetch('/api/conversations/migrate', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              chatType: 'prediction',
              guestMessages: predictionMessages
            })
          }).then(() => {
            sessionStorage.removeItem(predictionKey);
          }).catch(err => {
            console.error('Error migrating prediction chat:', err);
          })
        );
      }
      
      if (matchmakingMessages.length > 0) {
        migrations.push(
          fetch('/api/conversations/migrate', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              chatType: 'matchmaking',
              guestMessages: matchmakingMessages
            })
          }).then(() => {
            sessionStorage.removeItem(matchmakingKey);
          }).catch(err => {
            console.error('Error migrating matchmaking chat:', err);
          })
        );
      }
      
      if (migrations.length > 0) {
        await Promise.all(migrations);
        console.log('Guest chats migrated successfully');
      }
    } catch (error) {
      console.error('Error migrating guest chats:', error);
    }
  };

  // Observe auth state changes
  useEffect(() => {
    let prevUser = null;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const wasGuest = !prevUser && fbUser; // Detect login event
      prevUser = fbUser;
      
      setUser(fbUser || null);
      
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser.uid);
        setUserProfile(profile);
        
        // Migrate guest chats on login
        if (wasGuest) {
          await migrateGuestChats(fbUser.uid);
        }
        
        // Persist role and ID for quick access
        try {
          if (typeof window !== 'undefined') {
            if (profile?.collection === 'astrologers') {
              localStorage.setItem('tgs:role', 'astrologer')
              localStorage.setItem('tgs:astrologerId', fbUser.uid)
              localStorage.setItem('tgs:userId', fbUser.uid)
            } else {
              localStorage.setItem('tgs:role', 'user')
              localStorage.setItem('tgs:userId', fbUser.uid)
              localStorage.removeItem('tgs:astrologerId')
            }
          }
        } catch (e) { /* ignore */ }
      } else {
        setUserProfile(null);
      }
      
      setInitialLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser(cred.user);
      
      // Fetch user profile to determine role
      const profile = await fetchUserProfile(cred.user.uid);
      setUserProfile(profile);
      
      return { user: cred.user, profile };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      setUser(cred.user);
      
      // Fetch user profile to determine role
      const profile = await fetchUserProfile(cred.user.uid);
      setUserProfile(profile);
      
      return { user: cred.user, profile };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, profile = {}) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (profile.displayName) {
        await updateProfile(cred.user, { displayName: profile.displayName });
      }
      setUser(cred.user);
      return cred.user;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      // Clear any persisted data
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tgs:role')
          localStorage.removeItem('tgs:userId')
          localStorage.removeItem('tgs:astrologerId')
        }
      } catch (e) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  const getUserId = () => {
    return user?.uid || null;
  };

  const getUserRole = () => {
    return userProfile?.collection === 'astrologers' ? 'astrologer' : 'user';
  };

  // Firebase Phone Authentication
  // Using refs to persist across re-renders (these cannot be serialized to sessionStorage)

  /**
   * Initialize reCAPTCHA verifier for Firebase phone authentication
   * Creates an invisible reCAPTCHA widget
   */
  const initializeRecaptcha = async () => {
    if (typeof window === 'undefined' || !auth) {
      console.error('Cannot initialize reCAPTCHA: window or auth not available');
      return null;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          document.addEventListener('DOMContentLoaded', resolve);
        }
      });
    }

    // Ensure the container exists in the DOM
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.display = 'none';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      console.log('Created reCAPTCHA container');
      
      // Wait a bit for the container to be fully in the DOM
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Clean up existing verifier if any
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      recaptchaVerifierRef.current = null;
    }

    try {
      // Verify auth is properly configured
      if (!auth.app || !auth.app.options) {
        throw new Error('Firebase auth is not properly initialized');
      }

      // Create invisible reCAPTCHA verifier
      // Note: Firebase may show visible challenges initially or when risk is detected
      // This is normal behavior - it will become more invisible over time
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, can proceed with phone auth
          console.log('✅ reCAPTCHA verified - proceeding with phone auth');
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired - will retry');
        },
        'error-callback': (error) => {
          console.error('❌ reCAPTCHA error:', error);
        }
      });

      // Render the verifier and wait for it to be ready
      await recaptchaVerifierRef.current.render();
      console.log('reCAPTCHA verifier rendered successfully');

      return recaptchaVerifierRef.current;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      recaptchaVerifierRef.current = null;
      throw error;
    }
  };

  /**
   * Send OTP to phone number using Firebase phone authentication
   */
  const signInWithPhone = async (phoneNumber) => {
    setLoading(true);
    try {
      // Format phone number (ensure it starts with +)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      // Validate auth is available
      if (!auth) {
        throw new Error('Firebase authentication is not initialized. Please refresh the page.');
      }

      // Clean up any existing session before requesting new OTP
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
      
      // Clear stored session
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthConfirmation');
      }

      // Initialize/reinitialize reCAPTCHA (always create fresh to avoid stale state)
      try {
        recaptchaVerifierRef.current = await initializeRecaptcha();
        if (!recaptchaVerifierRef.current) {
          throw new Error('Failed to initialize reCAPTCHA verifier');
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA initialization error:', recaptchaError);
        
        // Provide specific error messages based on error type
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        
        if (recaptchaError.message?.includes('hostname') || recaptchaError.code === 'auth/captcha-check-failed') {
          throw new Error(
            `reCAPTCHA hostname mismatch. "${currentHost}" is not in your reCAPTCHA key domains. ` +
            `Add "${currentHost}" to reCAPTCHA key domains in Google Cloud Console. ` +
            `See LOCALHOST_FIREBASE_PHONE_AUTH_FIX.md for steps.`
          );
        } else if (recaptchaError.message?.includes('container') || recaptchaError.message?.includes('element')) {
          throw new Error('reCAPTCHA container not found. Please refresh the page and try again.');
        } else {
          throw new Error(
            `Failed to initialize reCAPTCHA: ${recaptchaError.message || 'Unknown error'}. ` +
            `Please ensure: 1) Phone authentication is enabled in Firebase Console, ` +
            `2) reCAPTCHA is configured, 3) "${currentHost}" is in reCAPTCHA key domains. ` +
            `See FIREBASE_RECAPTCHA_TROUBLESHOOTING.md for help.`
          );
        }
      }

      // Send OTP via Firebase
      confirmationResultRef.current = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);

      // Store confirmation result metadata in sessionStorage for persistence
      // Note: confirmationResult itself cannot be serialized, but we store metadata
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tgs:phoneAuthConfirmation', JSON.stringify({
          phoneNumber: formattedPhone,
          sentAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
        }));
      }
      
      console.log('✅ OTP sent successfully. Valid for 10 minutes.');

      return { 
        success: true, 
        message: 'OTP sent successfully',
        phoneNumber: formattedPhone
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Clean up verifier on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      confirmationResultRef.current = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthConfirmation');
      }

      // Provide user-friendly error messages
      if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number format. Please include country code (e.g., +919305897506)');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please try again later.');
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded. Please try again later.');
      } else if (error.code === 'auth/captcha-check-failed') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        const currentPort = typeof window !== 'undefined' ? window.location.port : '';
        const fullHost = currentPort ? `${currentHost}:${currentPort}` : currentHost;
        
        console.error('❌ reCAPTCHA Hostname Mismatch Error');
        console.error(`📍 Current hostname: ${fullHost}`);
        console.error('📖 Fix Guide: See LOCALHOST_FIREBASE_PHONE_AUTH_FIX.md');
        console.error('🔧 Quick Fixes:');
        console.error(`   1. Add "${currentHost}" to reCAPTCHA key domains (Google Cloud Console)`);
        if (currentHost === 'localhost') {
          console.error('   2. Also add "127.0.0.1" to reCAPTCHA key domains');
          console.error('   3. Try accessing via http://127.0.0.1:3000 instead');
        }
        console.error('   4. Verify domain is in Firebase Authorized Domains');
        console.error('   5. Wait 2-5 minutes after adding domains');
        console.error('   6. Clear browser cache and try again');
        
        throw new Error(
          `reCAPTCHA hostname mismatch. Current hostname "${fullHost}" is not in your reCAPTCHA key domains. ` +
          `Add "${currentHost}" to your reCAPTCHA key domains in Google Cloud Console. ` +
          `See LOCALHOST_FIREBASE_PHONE_AUTH_FIX.md for detailed steps.`
        );
      } else if (error.code === 'auth/invalid-app-credential') {
        const isLocalhost = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        console.error('❌ Firebase Phone Auth Error: reCAPTCHA not configured');
        if (isLocalhost) {
          console.error('⚠️  LOCALHOST DETECTED - This might be a localhost issue!');
          console.error('📖 Localhost Fix Guide: See LOCALHOST_FIREBASE_PHONE_AUTH_FIX.md');
          console.error('🔧 Quick Fixes for localhost:');
          console.error('   1. Add "localhost" to reCAPTCHA key domains (Google Cloud Console)');
          console.error('   2. Add "127.0.0.1" to reCAPTCHA key domains');
          console.error('   3. Verify "localhost" is in Firebase Authorized Domains');
          console.error('   4. Try accessing via http://127.0.0.1:3000 instead');
          console.error('   5. Or use ngrok for testing (see guide)');
        }
        console.error('📖 Troubleshooting Guide: See FIREBASE_RECAPTCHA_TROUBLESHOOTING.md');
        console.error('🔗 Firebase Console: https://console.firebase.google.com/');
        console.error('   → Authentication → Settings → reCAPTCHA');
        throw new Error(
          isLocalhost 
            ? 'reCAPTCHA not configured. This might be a localhost issue. Add "localhost" to your reCAPTCHA key domains. See LOCALHOST_FIREBASE_PHONE_AUTH_FIX.md'
            : 'reCAPTCHA not properly configured. Click "Configure site keys" in Firebase Console and select your key. See FIREBASE_RECAPTCHA_TROUBLESHOOTING.md for detailed steps.'
        );
      } else if (error.code === 'auth/missing-phone-number') {
        throw new Error('Phone number is required.');
      } else if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid verification code.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP and sign in/create user with Firebase phone authentication
   */
  const verifyOTP = async (otp, name = null) => {
    setLoading(true);
    try {
      if (!confirmationResultRef.current) {
        // Check if we have a stored session
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem('tgs:phoneAuthConfirmation');
          if (stored) {
            const sessionData = JSON.parse(stored);
            const sentAt = new Date(sessionData.sentAt);
            const now = new Date();
            const minutesElapsed = (now - sentAt) / 1000 / 60;
            
            // Firebase OTP expires after 10 minutes
            if (minutesElapsed > 10) {
              sessionStorage.removeItem('tgs:phoneAuthConfirmation');
              throw new Error('OTP has expired (10 minutes). Please request a new OTP.');
            }
            
            // Session exists but confirmationResult was lost (page refresh, etc.)
            throw new Error('Session expired. Please click "Resend OTP" to get a new code.');
          }
        }
        throw new Error('No phone verification session found. Please request OTP again.');
      }
      
      // Check if confirmationResult is still valid (not expired)
      // Firebase OTPs expire after 10 minutes, but we can't check this directly
      // So we check the stored timestamp
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('tgs:phoneAuthConfirmation');
        if (stored) {
          const sessionData = JSON.parse(stored);
          const sentAt = new Date(sessionData.sentAt);
          const now = new Date();
          const minutesElapsed = (now - sentAt) / 1000 / 60;
          
          if (minutesElapsed > 10) {
            // OTP expired, clear everything
            confirmationResultRef.current = null;
            if (recaptchaVerifierRef.current) {
              try {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
              } catch (e) {}
            }
            sessionStorage.removeItem('tgs:phoneAuthConfirmation');
            throw new Error('OTP has expired (10 minutes). Please request a new OTP.');
          }
        }
      }

      // Verify OTP with Firebase
      let result;
      try {
        result = await confirmationResultRef.current.confirm(otp);
      } catch (confirmError) {
        // Handle expired OTP
        if (confirmError.code === 'auth/code-expired' || confirmError.code === 'auth/session-expired') {
          confirmationResultRef.current = null;
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('tgs:phoneAuthConfirmation');
          }
          throw new Error('OTP has expired. Please request a new OTP.');
        }
        throw confirmError;
      }
      
      const user = result.user;

      setUser(user);

      // Check if user profile exists
      let profile = await fetchUserProfile(user.uid);
      let isNewUser = !profile;

      if (isNewUser) {
        // Create new user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: name || user.displayName || 'User',
          phone: user.phoneNumber || confirmationResultRef.current?.verificationId?.split(':')[0] || '',
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString(),
          role: 'user',
          authProvider: 'phone',
          createdAt: new Date().toISOString(),
        });

        // Update Firebase auth profile if name provided
        if (name && !user.displayName) {
          await updateProfile(user, {
            displayName: name
          });
        }

        profile = await fetchUserProfile(user.uid);
      } else {
        // Update existing profile with phone verification status
        await setDoc(doc(db, 'users', user.uid), {
          phone: user.phoneNumber || confirmationResultRef.current?.verificationId?.split(':')[0] || '',
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update name if provided and different
        if (name && profile.name !== name) {
          await setDoc(doc(db, 'users', user.uid), {
            name: name
          }, { merge: true });
          await updateProfile(user, {
            displayName: name
          });
        }
      }

      setUserProfile(profile);

      // Clean up after successful verification
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthConfirmation');
      }

      return { user, profile };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid OTP. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('OTP has expired. Please request a new OTP.');
      } else if (error.code === 'auth/session-expired') {
        throw new Error('Session expired. Please request a new OTP.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ 
      user, 
      userProfile, 
      loading: loading || initialLoading, 
      signIn, 
      signUp, 
      signOut, 
      signInWithGoogle, 
      signInWithPhoneNumber: signInWithPhone,
      verifyOTP,
      getUserId, 
      getUserRole,
      setUser, 
      setLoading 
    }),
    [user, userProfile, loading, initialLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

