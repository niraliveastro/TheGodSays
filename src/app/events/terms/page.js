import Link from "next/link";

export const metadata = {
    title: "Terms & Conditions | Vastu Course by Tiwari Ji",
    description: "Terms and conditions for the offline Vastu course by Acharya Mahendra Tiwari Ji.",
};

export default function EventTermsPage() {
    return (
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#f0f0f2" }}>
            <div className="mx-auto max-w-2xl space-y-6 text-gray-700">
                <h1 className="text-2xl font-bold text-black">Terms &amp; Conditions</h1>
                <p className="text-sm">
                    Last updated: February 2025. By registering for the Offline Vastu Course in Bangalore (&ldquo;Course&rdquo;) you agree to these terms.
                </p>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">1. Registration &amp; Eligibility</h2>
                    <p className="mt-2 text-sm">
                        Registration is complete only after successful payment. You must provide a valid name, email, and WhatsApp number. The Course is intended for serious learners; the organizer reserves the right to refuse or cancel any registration.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">2. Event Details</h2>
                    <p className="mt-2 text-sm">
                        Date, time, and venue are as stated on the registration page (15th March, 10 AM–6 PM, Dr. BR Ambedkar Bhavan, Bengaluru). The organizer may change venue or date in exceptional circumstances and will inform registered participants via email/WhatsApp.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">3. Payment</h2>
                    <p className="mt-2 text-sm">
                        Payments are processed via Razorpay. You agree to provide accurate payment details and to pay the full course fee. All fees are in Indian Rupees (INR) and are non-refundable as per our Refund Policy.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">4. Conduct &amp; Use of Content</h2>
                    <p className="mt-2 text-sm">
                        You agree to behave respectfully during the Course. Course content (including teachings, materials, and any recordings) is for personal use only; you may not commercially exploit, record, or redistribute it without written permission.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">5. Limitation of Liability</h2>
                    <p className="mt-2 text-sm">
                        The Course is for educational purposes. The organizer and Acharya Mahendra Tiwari Ji are not liable for any indirect, incidental, or consequential damages arising from your participation or reliance on the content.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">6. Contact</h2>
                    <p className="mt-2 text-sm">
                        For queries regarding these terms, contact the course organizer via the details provided on the registration page.
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
