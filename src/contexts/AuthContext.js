"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { sendOTP as sendCustomOTP, verifyOTP as verifyCustomOTP } from "@/lib/otp-service";
import { doc, getDoc } from "firebase/firestore";

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

  // Custom Phone authentication using Twilio (cost-effective)
  // Store phone number and temp user ID for OTP verification
  let phoneAuthSession = null;

  /**
   * Send OTP to phone number using Twilio (custom service)
   * Much cheaper than Firebase SMS (~25-50% cost savings)
   */
  const signInWithPhone = async (phoneNumber) => {
    setLoading(true);
    try {
      // Format phone number (ensure it starts with +)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      // Generate temporary user ID for OTP session
      const tempUserId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Send OTP via custom Twilio service (pass userId and userType)
      const result = await sendCustomOTP(formattedPhone, tempUserId, 'user');

      // Store session data with the userId returned from API
      phoneAuthSession = {
        phoneNumber: formattedPhone,
        tempUserId: result.tempUserId || tempUserId, // Use the one from API response
        sentAt: new Date()
      };

      // Store in sessionStorage for persistence
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tgs:phoneAuthSession', JSON.stringify(phoneAuthSession));
      }

      return { 
        success: true, 
        message: result.message || 'OTP sent successfully',
        tempUserId: phoneAuthSession.tempUserId,
        // In development, return OTP for testing
        ...(result.otp && { otp: result.otp })
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      phoneAuthSession = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthSession');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP and create/authenticate user
   * Creates Firebase auth user after OTP verification
   */
  const verifyOTP = async (otp, name = null) => {
    setLoading(true);
    try {
      // Get session from memory or sessionStorage
      if (!phoneAuthSession && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('tgs:phoneAuthSession');
        if (stored) {
          phoneAuthSession = JSON.parse(stored);
        }
      }

      if (!phoneAuthSession) {
        throw new Error('No phone verification session found. Please request OTP again.');
      }

      // Verify OTP using custom service (must use same userId as when sending)
      const verifyResult = await verifyCustomOTP(
        phoneAuthSession.phoneNumber,
        otp,
        phoneAuthSession.tempUserId,
        'user'
      );
      
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'OTP verification failed');
      }

      // OTP verified - now create Firebase auth user
      // Check if user already exists with this phone number
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      let existingUser = null;
      try {
        // Search for existing user with this phone number
        const usersQuery = query(
          collection(db, 'users'),
          where('phone', '==', phoneAuthSession.phoneNumber)
        );
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
          // User exists - get their Firebase auth UID from profile
          const userDoc = querySnapshot.docs[0];
          existingUser = { uid: userDoc.id, profile: userDoc.data() };
        }
      } catch (searchError) {
        console.warn('Error searching for existing user:', searchError);
        // Continue with new user creation
      }

      let user;
      let isNewUser = false;

      if (existingUser) {
        // User exists - we need to sign them in
        // Since we don't have their password, we'll create a new auth account
        // and link it, or use a different approach
        // For now, create new auth account but update existing profile
        const phoneEmail = `phone_${phoneAuthSession.phoneNumber.replace(/[^0-9]/g, '')}@thegodsays.app`;
        const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
        
        try {
          // Try to create new auth account (might fail if email exists)
          user = await createUserWithEmailAndPassword(auth, phoneEmail, tempPassword);
          isNewUser = true;
        } catch (createError) {
          // Email might exist, try signing in (unlikely to work without password)
          // For now, create with unique email
          const uniqueEmail = `phone_${phoneAuthSession.phoneNumber.replace(/[^0-9]/g, '')}_${Date.now()}@thegodsays.app`;
          user = await createUserWithEmailAndPassword(auth, uniqueEmail, tempPassword);
          isNewUser = true;
        }
      } else {
        // New user - create Firebase auth account
        const phoneEmail = `phone_${phoneAuthSession.phoneNumber.replace(/[^0-9]/g, '')}@thegodsays.app`;
        const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
        
        isNewUser = true;
        user = await createUserWithEmailAndPassword(auth, phoneEmail, tempPassword);
        
        // Update profile with phone number
        await updateProfile(user.user, {
          displayName: name || 'User',
          phoneNumber: phoneAuthSession.phoneNumber
        });
      }

      setUser(user.user);

      // Create or update user profile in Firestore
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', user.user.uid), {
        name: name || 'User',
        phone: phoneAuthSession.phoneNumber,
        phoneVerified: true,
        phoneVerifiedAt: new Date().toISOString(),
        role: 'user',
        authProvider: 'phone',
        createdAt: isNewUser ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Fetch user profile
      const profile = await fetchUserProfile(user.user.uid);
      setUserProfile(profile);

      // Clean up session
      phoneAuthSession = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tgs:phoneAuthSession');
      }

      return { user: user.user, profile };
    } catch (error) {
      console.error('Error verifying OTP:', error);
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

