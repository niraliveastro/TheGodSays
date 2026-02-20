import Link from "next/link";

export const metadata = {
    title: "Privacy Policy | Vastu Course by Tiwari Ji",
    description: "Privacy policy for the offline Vastu course by Acharya Mahendra Tiwari Ji.",
};

export default function EventPrivacyPage() {
    return (
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#f0f0f2" }}>
            <div className="mx-auto max-w-2xl space-y-6 text-gray-700">
                <h1 className="text-2xl font-bold text-black">Privacy Policy</h1>
                <p className="text-sm">
                    Last updated: February 2025. We respect your privacy and are committed to protecting your personal information in connection with the Offline Vastu Course in Bangalore (&ldquo;Course&rdquo;).
                </p>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">1. Information We Collect</h2>
                    <p className="mt-2 text-sm">
                        When you register, we collect your name, email address, and phone number (including country code). We do not collect more than is necessary to complete your registration, process payment, and communicate about the Course.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">2. How We Use Your Information</h2>
                    <p className="mt-2 text-sm">
                        Your data is used to: create and manage your registration, process payment through our payment provider (Razorpay), send confirmations and updates about the Course (including via email and WhatsApp), and send a one-time reminder if you leave the payment step incomplete. We do not use your information for unrelated marketing unless you have given separate consent.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">3. Payment &amp; Third Parties</h2>
                    <p className="mt-2 text-sm">
                        Payment is processed by Razorpay. Your card or other payment details are handled directly by Razorpay according to their privacy policy; we do not store full card numbers. We may share your name, email, and phone with Razorpay and with service providers used for sending messages (e.g. WhatsApp/email) strictly for Course-related purposes.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">4. Data Retention &amp; Security</h2>
                    <p className="mt-2 text-sm">
                        We retain your registration data for as long as needed to run the Course and handle any follow-up (e.g. attendance, support). We take reasonable steps to keep your data secure and to ensure that any third parties we use do the same.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">5. Your Rights</h2>
                    <p className="mt-2 text-sm">
                        You may request access to, correction of, or deletion of your personal data by contacting the course organizer. Applicable law may also give you rights to object to processing or to data portability.
                    </p>
                </section>

                <section>
                    <h2 className="mt-6 text-lg font-semibold text-black">6. Changes</h2>
                    <p className="mt-2 text-sm">
                        We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the top will reflect the latest version. Continued use of the registration service after changes constitutes acceptance of the updated policy.
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
