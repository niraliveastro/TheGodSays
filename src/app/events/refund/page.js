import Link from "next/link";

export const metadata = {
    title: "Refund Policy | Vastu Course by Tiwari Ji",
    description: "Refund policy for the offline Vastu course by Acharya Mahendra Tiwari Ji.",
};

export default function EventRefundPage() {
    return (
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#f0f0f2" }}>
            <div className="mx-auto max-w-2xl space-y-6 text-gray-700">
                <h1 className="text-2xl font-bold text-black">Refund Policy</h1>
                <p className="text-sm">
                    Last updated: February 2025. Please read this policy before registering for the Offline Vastu Course in Bangalore (&ldquo;Course&rdquo;).
                </p>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">1. No Refunds</h2>
                    <p className="mt-2 text-sm">
                        All course fees are <strong>non-refundable</strong>. Once payment is completed, we do not offer refunds for change of plans, no-shows, or partial attendance. By completing registration and payment, you acknowledge and accept this policy.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">2. Serious Learners Only</h2>
                    <p className="mt-2 text-sm">
                        The Course is designed for serious learners. Seats are limited to maintain teaching quality. We expect registered participants to attend for the full duration (10 AM–6 PM on the stated date) where possible. Non-attendance does not entitle you to a refund or transfer.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">3. Cancellation by Organizer</h2>
                    <p className="mt-2 text-sm">
                        If the Course is cancelled or postponed by the organizer (e.g. due to unforeseen circumstances), we will notify you via email/WhatsApp and will arrange a full refund of the course fee paid. We are not responsible for any other costs you may have incurred (e.g. travel or accommodation).
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">4. Payment Failures</h2>
                    <p className="mt-2 text-sm">
                        If your payment fails or is declined, no amount will be debited and your registration will not be confirmed. You may try again or contact the organizer for assistance.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">5. Contact</h2>
                    <p className="mt-2 text-sm">
                        For any questions about this Refund Policy or the Course, please contact the course organizer using the details on the registration page.
                    </p>
                </section>

                <p className="pt-4">
                    <Link href="/events" className="text-blue-600 underline hover:text-blue-700">
                        ← Back to registration
                    </Link>
                </p>
            </div>
        </div>
    );
}
