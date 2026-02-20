import { NextResponse } from "next/server";

// Twilio "Appointment Reminders" template:
// "Your appointment is coming up on {{1}} at {{2}}. If you need to change it, please reply back and let us know."
// We pack rich event details into these two variables so the message reads naturally.
const TEMPLATE_VAR_1 = "15th March (Sunday) — Vastu Shastra Course by Acharya Mahendra Tiwari Ji | Dr. BR Ambedkar Bhavan, Vasanth Nagar, Bengaluru";
const TEMPLATE_VAR_2 = "10:00 AM";

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone } = body;

        const digits = phone?.replace(/\D/g, "") ?? "";
        if (digits.length < 10) {
            return NextResponse.json(
                { error: "Valid phone number required" },
                { status: 400 }
            );
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_WHATSAPP_NUMBER ?? "";
        const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID ?? "";
        const fromNumber = rawFrom.trim().startsWith("whatsapp:")
            ? rawFrom.trim().replace(/\s/g, "")
            : `whatsapp:${rawFrom.trim().replace(/\s/g, "")}`;

        if (!accountSid || !authToken || !rawFrom.trim()) {
            console.warn("[WhatsApp reminder] Not configured: missing Twilio credentials");
            return NextResponse.json({ sent: false, reason: "not_configured" });
        }

        if (!contentSid.trim()) {
            console.warn("[WhatsApp reminder] TWILIO_WHATSAPP_CONTENT_SID not set.");
            return NextResponse.json({ sent: false, reason: "content_sid_required" });
        }

        const to = `whatsapp:+${digits}`;
        const contentVariables = JSON.stringify({
            "1": TEMPLATE_VAR_1,
            "2": TEMPLATE_VAR_2,
        });
        console.log("[WhatsApp reminder] Sending template to", to, "from", fromNumber);

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
                    ContentSid: contentSid.trim(),
                    ContentVariables: contentVariables,
                }),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            const errMsg = data.message ?? "Send failed";
            console.error("[WhatsApp reminder] Twilio error:", data);
            return NextResponse.json(
                { sent: false, error: errMsg, code: data.code },
                { status: 200 }
            );
        }

        console.log("[WhatsApp reminder] Text sent, sid:", data.sid);

        // Poster: try sending image if configured
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
        const posterUrl = baseUrl ? `${baseUrl}/consultation.webp` : "";
        const imageTemplateSid = (process.env.TWILIO_WHATSAPP_IMAGE_TEMPLATE_SID ?? "").trim();

        if (imageTemplateSid && posterUrl) {
            const imageVariables = JSON.stringify({ "1": posterUrl });
            const imgRes = await fetch(
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
                        ContentSid: imageTemplateSid,
                        ContentVariables: imageVariables,
                    }),
                }
            );
            const imgData = await imgRes.json();
            if (imgRes.ok) {
                console.log("[WhatsApp reminder] Poster (template) sent, sid:", imgData.sid);
            } else {
                console.warn("[WhatsApp reminder] Poster template failed:", imgData.code, imgData.message);
            }
        } else if (posterUrl) {
            const mediaRes = await fetch(
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
                        MediaUrl: posterUrl,
                        Body: "Vastu Course by Acharya Mahendra Tiwari Ji · 15th March",
                    }),
                }
            );
            const mediaData = await mediaRes.json();
            if (mediaRes.ok) {
                console.log("[WhatsApp reminder] Poster sent, sid:", mediaData.sid);
            } else {
                console.warn("[WhatsApp reminder] Poster failed (text was sent):", mediaData.code, mediaData.message);
            }
        } else {
            console.log("[WhatsApp reminder] No NEXT_PUBLIC_APP_URL set, skipping poster");
        }

        return NextResponse.json({ sent: true, sid: data.sid });
    } catch (err) {
        console.error("[WhatsApp reminder] Exception:", err);
        return NextResponse.json(
            { sent: false, error: err instanceof Error ? err.message : "Server error" },
            { status: 200 }
        );
    }
}
