import admin from "firebase-admin";

let couponAdminApp;

if (!admin.apps.find((a) => a.name === "couponAdmin")) {
  couponAdminApp = admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: process.env.COUPON_FIREBASE_PROJECT_ID,
        clientEmail: process.env.COUPON_FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.COUPON_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      projectId: process.env.COUPON_FIREBASE_PROJECT_ID,
    },
    "couponAdmin"
  );
} else {
  couponAdminApp = admin.apps.find((a) => a.name === "couponAdmin");
}

export const couponAdminDb = couponAdminApp.firestore();
