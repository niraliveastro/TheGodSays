import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// NEW PROJECT env vars 
const couponConfig = {
  apiKey: process.env.NEXT_PUBLIC_COUPON_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_COUPON_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_COUPON_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_COUPON_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_COUPON_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.NEXT_PUBLIC_COUPON_FIREBASE_STORAGE_BUCKET,
};

// Named app so it doesn't clash with main app
const couponApp =
  getApps().find((a) => a.name === "couponApp") ||
  initializeApp(couponConfig, "couponApp");

export const couponDb = getFirestore(couponApp);
export const couponFunctions = getFunctions(couponApp);
export default couponApp;
