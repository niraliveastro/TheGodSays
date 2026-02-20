"use client";

import Link from "next/link";

export default function EventSuccessPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-6 text-black">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 p-5 text-center shadow-sm sm:p-6 md:p-8">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600 sm:mb-4 sm:h-16 sm:w-16 sm:text-3xl">
                    ✓
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-600 sm:text-base">
                    Payment successful
                </p>
                <h1 className="mt-1 text-lg font-bold sm:text-xl">Booking confirmed</h1>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Thank you for registering. You will receive confirmation and updates on your WhatsApp.
                </p>
                <p className="mt-3 text-xs text-gray-500 sm:mt-4 sm:text-sm">
                    Offline Vastu Course in Bangalore · 15th March (Sunday) · 10 AM to 6 PM
                </p>
                <Link
                    href="/events"
                    className="mt-5 inline-block min-h-[48px] rounded-lg bg-blue-600 px-5 py-3 font-medium text-white active:bg-blue-700 hover:bg-blue-700 sm:mt-6 sm:px-6 sm:py-2.5"
                >
                    Back to event
                </Link>
            </div>
        </div>
    );
}
