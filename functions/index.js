const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();


exports.redeemCoupon = onCall(
    {region: "us-central1", invoker: "private"},
    async (request) => {
      const context = request.auth;
      const data = request.data;

      if (!context) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const uid = context.uid;
      const code = (data.code || "").trim().toUpperCase();
      if (!code) {
        throw new HttpsError("invalid-argument", "Coupon code required");
      }

      const couponRef = db.collection("coupons").doc(code);
      const walletRef = db.collection("wallets").doc(uid);
      const userRef = db.collection("users").doc(uid);

      return db.runTransaction(async (tx) => {
        const [couponSnap, walletSnap, userSnap] =
        await Promise.all([
          tx.get(couponRef),
          tx.get(walletRef),
          tx.get(userRef),
        ]);

        if (!couponSnap.exists) return {ok: false, reason: "NOT_FOUND"};

        const coupon = couponSnap.data();
        if (!coupon.active) return {ok: false, reason: "INACTIVE"};

        const now = admin.firestore.Timestamp.now();
        if (
          coupon.expiresAt &&
        coupon.expiresAt.toMillis() <= now.toMillis()
        ) {
          return {ok: false, reason: "EXPIRED"};
        }

        const wallet = walletSnap.exists ?
        walletSnap.data() :
        {couponBalance: 0};
        const user = userSnap.exists ? userSnap.data() : {};
        const usedCoupons = user.usedCoupons || {};

        if (coupon.type === "multi_use") {
          const usedCount = coupon.usedCount || 0;
          const maxUses =
          coupon.maxUses == null ? null : coupon.maxUses;

          if (maxUses !== null && usedCount >= maxUses) {
            return {ok: false, reason: "MAXED_OUT"};
          }
          if (usedCoupons[code]) {
            return {ok: false, reason: "USED_BY_YOU"};
          }
        }

        const amount = Number(coupon.amount || 0);
        if (amount <= 0) return {ok: false, reason: "BAD_COUPON_AMOUNT"};

        const newCouponBalance =
        (wallet.couponBalance || 0) + amount;

        tx.set(
            walletRef,
            {couponBalance: newCouponBalance},
            {merge: true},
        );

        if (coupon.type === "one_time") {
          tx.delete(couponRef);
        } else {
          tx.update(couponRef, {
            usedCount: admin.firestore.FieldValue.increment(1),
          });

          tx.set(
              userRef,
              {usedCoupons: {...usedCoupons, [code]: now}},
              {merge: true},
          );
        }

        return {ok: true, amount, newCouponBalance};
      });
    },
);

