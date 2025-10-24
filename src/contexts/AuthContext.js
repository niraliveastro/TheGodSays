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
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
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

  // Observe auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser || null);
      
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser.uid);
        setUserProfile(profile);
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

  const value = useMemo(
    () => ({ 
      user, 
      userProfile, 
      loading: loading || initialLoading, 
      signIn, 
      signUp, 
      signOut, 
      signInWithGoogle, 
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

