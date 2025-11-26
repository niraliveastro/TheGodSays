import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { couponAdminDb } from "@/lib/firebaseCouponsAdmin";

// OLD project admin is already initialized in your app somewhere.
// If not, you can import your existing admin initializer.
// Here we assume admin.auth() points to OLD project.

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { ok: false, reason: "BAD_CODE" },
        { status: 400 }
      );
    }

    // 1) Verify OLD-project user via ID token
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

    // 2) Redeem in NEW project
    const couponRef = couponAdminDb.collection("coupons").doc(couponCode);
    const walletRef = couponAdminDb.collection("wallets").doc(uid);
    const userRef = couponAdminDb.collection("users").doc(uid);

    const result = await couponAdminDb.runTransaction(async (tx) => {
      const [couponSnap, walletSnap, userSnap] = await Promise.all([
        tx.get(couponRef),
        tx.get(walletRef),
        tx.get(userRef),
      ]);

      if (!couponSnap.exists) return { ok: false, reason: "NOT_FOUND" };

      const coupon = couponSnap.data();
      if (!coupon.active) return { ok: false, reason: "INACTIVE" };

      const now = admin.firestore.Timestamp.now();
      if (coupon.expiresAt && coupon.expiresAt.toMillis() <= now.toMillis()) {
        return { ok: false, reason: "EXPIRED" };
      }

      const wallet = walletSnap.exists
        ? walletSnap.data()
        : { couponBalance: 0 };

      const user = userSnap.exists ? userSnap.data() : {};
      const usedCoupons = user.usedCoupons || {};

      if (coupon.type === "multi_use") {
        const usedCount = coupon.usedCount || 0;
        const maxUses =
          coupon.maxUses == null ? null : coupon.maxUses;

        if (maxUses !== null && usedCount >= maxUses) {
          return { ok: false, reason: "MAXED_OUT" };
        }

        if (usedCoupons[couponCode]) {
          return { ok: false, reason: "USED_BY_YOU" };
        }
      }

      const amount = Number(coupon.amount || 0);
      if (amount <= 0) return { ok: false, reason: "BAD_COUPON_AMOUNT" };

      const newCouponBalance =
        (wallet.couponBalance || 0) + amount;

      tx.set(
        walletRef,
        { couponBalance: newCouponBalance },
        { merge: true }
      );

      if (coupon.type === "one_time") {
        tx.delete(couponRef);
      } else {
        tx.update(couponRef, {
          usedCount: admin.firestore.FieldValue.increment(1),
        });

        tx.set(
          userRef,
          { usedCoupons: { ...usedCoupons, [couponCode]: now } },
          { merge: true }
        );
      }

      return { ok: true, amount, newCouponBalance };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Redeem coupon API error:", err);
    return NextResponse.json(
      { ok: false, reason: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
