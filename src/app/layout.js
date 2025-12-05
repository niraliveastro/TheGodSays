import { Inter } from "next/font/google";
import "./globals.css";
import "./globals-responsive.css";

import { Providers } from "./providers";
import PWAInstaller from "@/components/PWAInstaller";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Navigation from "@/components/Navigation";
import AstrologerRedirect from "@/components/AstrologerRedirect";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MicrosoftClarity from "@/components/MicrosoftClarity";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Panchang - TheGodSays",
  description: "Your daily Panchang and personalized astrological insights",
  manifest: "/manifest.json",
  themeColor: "#d4af37",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TheGodSays",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        {/* Analytics Scripts */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <MicrosoftClarity CLARITY_PROJECT_ID={process.env.NEXT_PUBLIC_CLARITY_ID} />
        )}
        
        {/* Persistent modal portal root */}
        <div id="modal-root" />
        <Providers>
          <AstrologerRedirect />
          <Navigation />
          {children}
          <PWAInstaller />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
