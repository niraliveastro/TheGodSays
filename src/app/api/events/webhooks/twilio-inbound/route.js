import { NextResponse } from "next/server";

/**
 * Twilio inbound webhook: called when someone sends a message or clicks
 * a button (Confirm/Cancel) in WhatsApp.
 */
export async function POST(request) {
    try {
        const contentType = request.headers.get("content-type") ?? "";
        let body = {};

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
        }

        const from = body.From ?? "";
        const to = body.To ?? "";
        const messageBody = (body.Body ?? "").trim().toLowerCase();
        const messageSid = body.MessageSid ?? "";

        console.log("[Twilio inbound]", { from, to, body: messageBody, messageSid });

        if (messageBody === "confirm" || messageBody === "cancel") {
            console.log("[Twilio inbound] Button/reply:", messageBody, "from", from);
        }

        return new NextResponse(null, { status: 200 });
    } catch (err) {
        console.error("[Twilio inbound] Error:", err);
        return new NextResponse(null, { status: 200 });
    }
}

export async function GET() {
    return new NextResponse(null, { status: 200 });
}
