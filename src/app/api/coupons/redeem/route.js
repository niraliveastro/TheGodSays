import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { WalletService } from "@/lib/wallet";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { ok: false, reason: "BAD_CODE" },
        { status: 400 }
      );
    }

    // Verify user via ID token
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { ok: false, reason: "NO_TOKEN" },
        { status: 401 }
      );
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const couponCode = code.trim().toUpperCase();

    const db = admin.firestore();
    const couponRef = db.collection("coupons").doc(couponCode);
    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const [couponSnap, userSnap] = await Promise.all([
        tx.get(couponRef),
        tx.get(userRef),
      ]);

      if (!couponSnap.exists) return { ok: false, reason: "NOT_FOUND" };

      const coupon = couponSnap.data();
      if (!coupon.active) return { ok: false, reason: "INACTIVE" };

      const now = admin.firestore.Timestamp.now();
      if (coupon.expiresAt && coupon.expiresAt.toMillis() <= now.toMillis()) {
        return { ok: false, reason: "EXPIRED" };
      }

      const user = userSnap.exists ? userSnap.data() : {};
      const usedCoupons = user.usedCoupons || {};
      const couponType = coupon.type || "once_per_user"; // Default to once_per_user for backward compatibility

      // Handle different coupon types
      if (couponType === "once_per_user" || couponType === "first_time_only") {
        // Check if user has already used this coupon
        if (usedCoupons[couponCode]) {
          return { ok: false, reason: "USED_BY_YOU" };
        }
      } else if (couponType === "multiple_per_user") {
        // Check max uses per user
        const userUsageCount = usedCoupons[couponCode]?.count || 0;
        const maxUsesPerUser = coupon.maxUsesPerUser;
        if (maxUsesPerUser != null && userUsageCount >= maxUsesPerUser) {
          return { ok: false, reason: "USED_BY_YOU" };
        }
      } else if (couponType === "limited_total") {
        // Check total usage limit
        const usedCount = coupon.usedCount || 0;
        const maxUses = coupon.maxUses;
        if (maxUses != null && usedCount >= maxUses) {
          return { ok: false, reason: "MAXED_OUT" };
        }
      } else if (couponType === "one_time_global") {
        // Check if coupon has been used by anyone
        const usedCount = coupon.usedCount || 0;
        if (usedCount > 0) {
          return { ok: false, reason: "MAXED_OUT" };
        }
      } else if (couponType === "multi_use") {
        // Legacy support for old coupon type
        const usedCount = coupon.usedCount || 0;
        const maxUses = coupon.maxUses == null ? null : coupon.maxUses;
        if (maxUses !== null && usedCount >= maxUses) {
          return { ok: false, reason: "MAXED_OUT" };
        }
        if (usedCoupons[couponCode]) {
          return { ok: false, reason: "USED_BY_YOU" };
        }
      }

      const amount = Number(coupon.amount || 0);
      if (amount <= 0) return { ok: false, reason: "BAD_COUPON_AMOUNT" };

      // Handle coupon deletion/updates based on type
      if (couponType === "one_time_global" || couponType === "one_time") {
        // Delete coupon after first use
        tx.delete(couponRef);
      } else {
        // Increment usage count
        tx.update(couponRef, {
          usedCount: admin.firestore.FieldValue.increment(1),
        });

        // Update user's used coupons
        if (couponType === "multiple_per_user") {
          // Track count for multiple_per_user
          const currentUserUsage = usedCoupons[couponCode]?.count || 0;
          tx.set(
            userRef,
            {
              usedCoupons: {
                ...usedCoupons,
                [couponCode]: { timestamp: now, count: currentUserUsage + 1 },
              },
            },
            { merge: true }
          );
        } else {
          // Track timestamp for once_per_user and others
          tx.set(
            userRef,
            { usedCoupons: { ...usedCoupons, [couponCode]: now } },
            { merge: true }
          );
        }
      }

      return { ok: true, amount };
    });

    // If redemption was successful, add money to the main wallet
    if (result.ok && result.amount) {
      try {
        await WalletService.addMoney(
          uid,
          result.amount,
          `coupon-${couponCode}-${Date.now()}`,
          `Coupon redeemed: ${couponCode}`
        );
      } catch (walletError) {
        console.error("Error adding to main wallet:", walletError);
        return NextResponse.json(
          { ok: false, reason: "WALLET_UPDATE_FAILED" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Redeem coupon API error:", err);
    return NextResponse.json(
      { ok: false, reason: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
