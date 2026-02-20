import { NextResponse } from "next/server";

/**
 * Sends a "Booking confirmed" WhatsApp message after successful payment.
 *
 * Strategy:
 *   1. If TWILIO_WHATSAPP_BOOKING_CONFIRMED_CONTENT_SID is set → use that custom template
 *   2. Otherwise, fall back to the Twilio pre-approved "Appointment Reminders" template
 *      (TWILIO_WHATSAPP_CONTENT_SID) with rich event details so it looks authentic.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, phone } = body;

        const digits = (phone ?? "").replace(/\D/g, "").trim();
        if (digits.length < 10) {
            return NextResponse.json(
                { error: "Valid phone number required" },
                { status: 400 }
            );
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_WHATSAPP_NUMBER ?? "";
        const bookingContentSid = (process.env.TWILIO_WHATSAPP_BOOKING_CONFIRMED_CONTENT_SID ?? "").trim();
        const reminderContentSid = (process.env.TWILIO_WHATSAPP_CONTENT_SID ?? "").trim();
        const fromNumber = rawFrom.trim().startsWith("whatsapp:")
            ? rawFrom.trim().replace(/\s/g, "")
            : `whatsapp:${rawFrom.trim().replace(/\s/g, "")}`;

        if (!accountSid || !authToken || !rawFrom.trim()) {
            console.warn("[Booking confirmed] Not configured: missing Twilio credentials");
            return NextResponse.json({ sent: false, reason: "not_configured" });
        }

        // Decide which template and variables to use
        const attendeeName = (name ?? "").trim() || "there";
        let contentSid = "";
        let contentVariables = "";

        if (bookingContentSid) {
            // Custom booking confirmed template: "Booking confirmed! Hi {{1}}, your seat for..."
            contentSid = bookingContentSid;
            contentVariables = JSON.stringify({ "1": attendeeName });
        } else if (reminderContentSid) {
            // Fallback: re-use "Appointment Reminders" template with booking-confirmed data
            // Template: "Your appointment is coming up on {{1}} at {{2}}."
            contentSid = reminderContentSid;
            contentVariables = JSON.stringify({
                "1": `15th March (Sunday) — Vastu Shastra Course | ✅ Booking Confirmed for ${attendeeName}`,
                "2": "10:00 AM — Dr. BR Ambedkar Bhavan, Vasanth Nagar, Bengaluru. See you there! 🙏",
            });
        } else {
            console.warn("[Booking confirmed] No Content Template SID configured.");
            return NextResponse.json({ sent: false, reason: "content_sid_required" });
        }

        const to = `whatsapp:+${digits}`;
        console.log("[Booking confirmed] Sending to", to);

        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
                },
                body: new URLSearchParams({
                    To: to,
                    From: fromNumber,
                    ContentSid: contentSid,
                    ContentVariables: contentVariables,
                }),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            console.error("[Booking confirmed] Twilio error:", data);
            return NextResponse.json(
                { sent: false, error: data.message ?? "Send failed", code: data.code },
                { status: 502 }
            );
        }

        console.log("[Booking confirmed] Sent, sid:", data.sid);
        return NextResponse.json({ sent: true, sid: data.sid });
    } catch (err) {
        console.error("[Booking confirmed] Exception:", err);
        return NextResponse.json(
            { sent: false, error: err instanceof Error ? err.message : "Server error" },
            { status: 500 }
        );
    }
}
