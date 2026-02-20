"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const PRICE = 1;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_CODES = [
  { code: "IN", dial: "91", flag: "🇮🇳" },
  { code: "US", dial: "1", flag: "🇺🇸" },
  { code: "GB", dial: "44", flag: "🇬🇧" },
  { code: "AE", dial: "971", flag: "🇦🇪" },
  { code: "SA", dial: "966", flag: "🇸🇦" },
  { code: "SG", dial: "65", flag: "🇸🇬" },
  { code: "MY", dial: "60", flag: "🇲🇾" },
  { code: "AU", dial: "61", flag: "🇦🇺" },
  { code: "CA", dial: "1", flag: "🇨🇦" },
  { code: "DE", dial: "49", flag: "🇩🇪" },
  { code: "FR", dial: "33", flag: "🇫🇷" },
  { code: "PK", dial: "92", flag: "🇵🇰" },
  { code: "BD", dial: "880", flag: "🇧🇩" },
  { code: "LK", dial: "94", flag: "🇱🇰" },
  { code: "NP", dial: "977", flag: "🇳🇵" },
];

function getEmailError(value) {
  if (!value.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid email address";
  return "";
}

function getPhoneError(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits.length) return "Phone number is required";
  if (digits.length < 10) return "Please enter a valid phone number";
  return "";
}

export default function EventRegistrationForm() {
  const [name, setName] = useState({ value: "", touched: false, error: "" });
  const [email, setEmail] = useState({ value: "", touched: false, error: "" });
  const [phone, setPhone] = useState({ value: "", touched: false, error: "" });
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].dial);
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) setCountryOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial === countryCode) ?? COUNTRY_CODES[0];
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const reminderSentRef = useRef(false);
  const reminderTimeoutRef = useRef(null);

  const ABANDON_REMINDER_DELAY_MS = 30 * 1000;

  const validateName = useCallback((v) => {
    if (!v.trim()) return "Name is required";
    return "";
  }, []);

  const setNameValue = (v) => {
    setName({
      value: v,
      touched: true,
      error: validateName(v),
    });
  };

  const setEmailValue = (v) => {
    setEmail({
      value: v,
      touched: true,
      error: getEmailError(v),
    });
  };

  const setPhoneValue = (v) => {
    setPhone({
      value: v,
      touched: true,
      error: getPhoneError(v),
    });
  };

  const nameError = name.touched ? name.error : "";
  const emailError = email.touched ? email.error : "";
  const phoneError = phone.touched ? phone.error : "";

  const allValid =
    !validateName(name.value) &&
    !getEmailError(email.value) &&
    !getPhoneError(phone.value);

  const openRazorpay = async () => {
    if (!allValid || loading) return;
    setPaymentError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/events/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim(),
          phone: `${countryCode}${phone.value.replace(/\D/g, "").replace(/^0/, "")}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = [data.error, data.details].filter(Boolean).join(" — ") || "Failed to create order";
        throw new Error(msg);
      }

      const { orderId, keyId } = data;
      const fullPhone = `${countryCode}${phone.value.replace(/\D/g, "").replace(/^0/, "")}`;
      reminderSentRef.current = false;
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }

      const sendAbandonReminder = () => {
        if (reminderSentRef.current) return;
        reminderSentRef.current = true;
        fetch("/api/events/send-whatsapp-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.sent) return;
            console.warn("[WhatsApp reminder] Not sent:", data.reason ?? data.error, data.code != null ? `(code ${data.code})` : "");
          })
          .catch((e) => console.warn("[WhatsApp reminder] Request failed:", e));
      };

      const options = {
        key: keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Vastu Course by Acharya Mahendra Tiwari Ji",
        description: "Offline Vastu Course in Bangalore | 15th March (Sunday)",
        order_id: orderId,
        prefill: {
          name: name.value.trim(),
          email: email.value.trim(),
          contact: fullPhone,
        },
        theme: { color: "#2563eb" },
        handler: function (response) {
          setLoading(false);
          if (reminderTimeoutRef.current) {
            clearTimeout(reminderTimeoutRef.current);
            reminderTimeoutRef.current = null;
          }
          fetch("/api/events/send-booking-confirmed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.value.trim(),
              phone: fullPhone,
            }),
          }).catch((e) => console.warn("[Booking confirmed] Request failed:", e));
          setTimeout(() => {
            window.location.href = `/events/success?payment_id=${encodeURIComponent(response.razorpay_payment_id)}`;
          }, 1500);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            reminderTimeoutRef.current = setTimeout(() => {
              reminderTimeoutRef.current = null;
              sendAbandonReminder();
            }, ABANDON_REMINDER_DELAY_MS);
          },
        },
      };

      const Razorpay = typeof window !== "undefined" ? window.Razorpay : null;
      if (!Razorpay) {
        setPaymentError("Payment script not loaded. Please refresh and try again.");
        setLoading(false);
        return;
      }
      const rzp = new Razorpay(options);
      rzp.on("payment.failed", () => {
        setLoading(false);
        setPaymentError("Payment failed. Please try again.");
        sendAbandonReminder();
      });
      rzp.open();
    } catch (err) {
      setLoading(false);
      setPaymentError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
      <h1 className="event-title-glow-sweep text-xl font-bold leading-tight tracking-tight text-black sm:text-2xl md:text-3xl">
        Offline Vastu Course in Bangalore | 15th March (Sunday)
      </h1>
      <p className="text-base text-black sm:text-lg">
        Reserve your seats for ₹{PRICE} 🚀
      </p>

      {/* Instructor card */}
      <div className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-100 p-3 shadow-sm sm:gap-4 sm:p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-base font-semibold text-white sm:h-12 sm:w-12 sm:text-lg">
          T
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-black">Acharya Mahendra Tiwari Ji</p>
          <p className="text-xs text-gray-600 sm:text-sm">
            12+ Years of Experience | Vastu Consultant &amp; Trainer
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-4 sm:gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          openRazorpay();
        }}
      >
        <div>
          <label htmlFor="event-name" className="mb-1 block text-sm font-medium text-black">
            Name *
          </label>
          <input
            id="event-name"
            type="text"
            value={name.value}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => setName((prev) => ({ ...prev, touched: true, error: validateName(prev.value) }))}
            className={`w-full min-w-0 rounded-lg border px-3 py-3 text-base text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2.5 ${
              nameError ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Your name"
            autoComplete="name"
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
        </div>

        <div>
          <label htmlFor="event-email" className="mb-1 block text-sm font-medium text-black">
            Email *
          </label>
          <input
            id="event-email"
            type="email"
            value={email.value}
            onChange={(e) => setEmailValue(e.target.value)}
            onBlur={() => setEmail((prev) => ({ ...prev, touched: true, error: getEmailError(prev.value) }))}
            className={`w-full min-w-0 rounded-lg border px-3 py-3 text-base text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2.5 ${
              emailError ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
        </div>

        <div>
          <label htmlFor="event-phone" className="mb-1 block text-sm font-medium text-black">
            WhatsApp Number *
          </label>
          <div className="flex min-w-0 gap-2">
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-[100px] min-w-0 shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-[120px] sm:py-2.5"
            >
              {COUNTRY_CODES.map(({ code, dial, flag }) => (
                <option key={code} value={dial}>
                  {flag} +{dial}
                </option>
              ))}
            </select>
            <input
              id="event-phone"
              type="tel"
              value={phone.value}
              onChange={(e) => setPhoneValue(e.target.value)}
              onBlur={() => setPhone((prev) => ({ ...prev, touched: true, error: getPhoneError(prev.value) }))}
              className={`min-w-0 flex-1 rounded-lg border px-3 py-3 text-base text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2.5 ${
                phoneError ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="98765 43210"
              autoComplete="tel"
            />
          </div>
          {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-600 sm:text-sm">
            You will get updates on your{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-green-600">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </span>
          </p>
        </div>

        {paymentError && (
          <p className="text-sm text-red-600">{paymentError}</p>
        )}

        <button
          type="submit"
          disabled={!allValid || loading}
          className="w-full min-h-[48px] rounded-lg bg-blue-600 py-3.5 text-base font-semibold text-white transition active:bg-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:text-lg"
        >
          {loading ? "Opening payment…" : `Register Now at ₹${PRICE}`}
        </button>
      </form>
    </div>
  );
}
