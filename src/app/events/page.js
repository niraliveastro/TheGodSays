"use client";

import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import EventRegistrationForm from "@/components/EventRegistrationForm";

const VENUE =
  "Dr. BR Ambedkar Bhavan Millers Rd, near Bhagwan Mahaveer Jain Hospital, Kaverappa Layout, Vasanth Nagar, Bengaluru, Karnataka - 560001";

const BULLETS = [
  "Core Principles of Vastu Shastra",
  "Directional energies explained logically",
  "Common residential and commercial mistakes",
  "How to analyze any space step-by-step",
  "When remedies work and when they don't",
  "Case studies from real consultations",
  "One Day can correct years of Wrong Understanding",
  "Seats are limited to maintain teaching quality",
  "No Refunds | Serious Learners only",
];

export default function EventsPage() {
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      {/* Scoped CSS animations for events page */}
      <style jsx global>{`
        @keyframes event-enter-card {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes event-enter-content {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes event-enter-glow {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes event-glow-sweep {
          0% { left: -30%; }
          100% { left: 130%; }
        }
        .event-title-glow-sweep {
          position: relative;
          overflow: hidden;
        }
        .event-title-glow-sweep::after {
          content: "";
          position: absolute;
          top: 0;
          left: -30%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0) 10%,
            rgba(255, 255, 255, 0.7) 50%,
            rgba(255, 255, 255, 0) 90%,
            transparent 100%
          );
          pointer-events: none;
          animation: event-glow-sweep 2.5s ease-in-out 0.5s 1;
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: "#f0f0f2", color: "#000" }}>
        {/* Subtle top glow on load */}
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[40vh]"
          style={{
            background: "linear-gradient(to bottom, rgba(251,191,36,0.15), transparent, transparent)",
            opacity: 0,
            animation: "event-enter-glow 1s ease-out 0.2s forwards",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-8">
          {/* One attached card: form (white) + poster & details (grey) */}
          <div
            className="overflow-hidden rounded-xl border bg-white"
            style={{
              borderColor: "rgba(229,231,235,0.8)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              opacity: 0,
              animation: "event-enter-card 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
            }}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0">
              {/* Left: Registration form */}
              <section
                className="flex min-w-0 flex-col justify-start p-5 sm:p-6 md:p-8"
                style={{
                  opacity: 0,
                  animation: "event-enter-content 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
                  animationDelay: "120ms",
                }}
              >
                <EventRegistrationForm />
              </section>

              {/* Right: Poster + event details (grey) */}
              <section
                className="flex min-w-0 flex-col pt-6 sm:pt-8"
                style={{
                  backgroundColor: "#fafafa",
                  opacity: 0,
                  animation: "event-enter-content 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
                  animationDelay: "240ms",
                }}
              >
                <div className="relative mx-auto w-full max-w-[280px] overflow-hidden bg-black sm:max-w-[320px]">
                  <Image
                    src="/consultation.webp"
                    alt="Vastu Shastra Course by Acharya Mahendra Tiwari Ji"
                    width={320}
                    height={320}
                    className="object-cover"
                    style={{ width: "100%", height: "auto" }}
                    priority
                    unoptimized
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                  <p className="text-xs text-gray-700 sm:text-sm">
                    <span className="font-semibold text-black">Venue:</span>{" "}
                    <span className="break-words">{VENUE}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gray-700 sm:text-sm">
                    <span aria-hidden="true" className="shrink-0 text-gray-500">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </span>
                    15th March (Sunday)
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gray-700 sm:text-sm">
                    <span aria-hidden="true" className="shrink-0 text-gray-500">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    </span>
                    10 AM to 6 PM
                  </p>
                  <p className="pt-1 text-sm font-bold text-black sm:pt-2 sm:text-base">
                    Learn from a Practitioner, Not a YouTube Mystic
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-700 sm:text-sm" aria-label="What you will learn">
                    {BULLETS.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-amber-600" aria-hidden="true">✨</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gray-200 px-5 py-4 text-xs text-gray-600">
                  <Link href="/events/terms" className="hover:text-black hover:underline">Terms &amp; Conditions</Link>
                  <Link href="/events/privacy" className="hover:text-black hover:underline">Privacy Policy</Link>
                  <Link href="/events/refund" className="hover:text-black hover:underline">Refund Policy</Link>
                </footer>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
