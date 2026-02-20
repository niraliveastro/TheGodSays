import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const amount = 1; // INR (set to 1 for testing)
const amountInPaise = amount * 100; // 100 paise = ₹1

export async function POST(request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return NextResponse.json(
            { error: "Razorpay credentials not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { name, email, phone } = body;

        if (!name?.trim() || !email?.trim() || !phone?.trim()) {
            return NextResponse.json(
                { error: "Name, email and phone are required" },
                { status: 400 }
            );
        }

        const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const order = await instance.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `vastu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            notes: {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                event: "Offline Vastu Course Bangalore 15th March",
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: amountInPaise,
            currency: order.currency,
            keyId,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Razorpay order creation failed:", err);
        return NextResponse.json(
            { error: "Failed to create order", details: message },
            { status: 500 }
        );
    }
}
