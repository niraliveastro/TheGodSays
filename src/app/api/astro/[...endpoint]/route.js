import { NextResponse } from "next/server";
import {
  validateRequired,
  validateCoordinates,
  validateDate,
  validateTime,
} from "@/lib/validation";

const API_BASE_URL = process.env.ASTRO_API_BASE_URL;
const API_KEY = process.env.ASTRO_API_KEY;

if (!API_BASE_URL || !API_KEY) {
  console.error(
    "Missing required environment variables: ASTRO_API_BASE_URL, ASTRO_API_KEY"
  );
}

const ALLOWED_ENDPOINTS = [
  "tithi-durations",
  "nakshatra-durations",
  "tithi-timings",
  "nakshatra-timings",
  "yoga-durations",
  "karana-timings",
  "hora-timings",
  "choghadiya-timings",
  "rahu-kalam",
  "gulika-kalam",
  "planets",
  "planets/extended",
  "shadbala/summary",
  "vimsottari/maha-dasas",
  "vimsottari/dasa-information",
  "vimsottari/maha-dasas-and-antar-dasas",
  "western/natal-wheel-chart",
  "horoscope-chart-svg-code",
  "match-making/ashtakoot-score",
  "yama-gandam",
  "abhijit-muhurat",
  "amrit-kaal",
  "brahma-muhurat",
  "dur-muhurat",
  "varjyam",
  "good-bad-times",
  "vedicweekday",
  "lunarmonthinfo",
  "rituinfo",
  "samvatinfo",
  "aayanam",
];

export async function POST(request, { params }) {
  try {
    // Properly read the endpoint param
    const resolvedParams = await params;
    const endpointArray = resolvedParams?.endpoint || [];
    const endpointPath = Array.isArray(endpointArray)
      ? endpointArray.join("/")
      : endpointArray;

    console.log("[DEBUG] Endpoint:", endpointPath);

    if (!endpointPath || !ALLOWED_ENDPOINTS.includes(endpointPath)) {
      return NextResponse.json(
        { error: `Invalid endpoint: ${endpointPath}` },
        { status: 400 }
      );
    }

    const payload = await request.json();
    console.log("[DEBUG] Payload:", payload);

    // CONDITIONAL VALIDATION
    if (endpointPath.startsWith("match-making/")) {
      if (!payload.female || !payload.male) {
        return NextResponse.json(
          { error: "Missing female or male birth details" },
          { status: 400 }
        );
      }

      // Validate female
      validateRequired(payload.female, [
        "year",
        "month",
        "date",
        "hours",
        "minutes",
        "latitude",
        "longitude",
      ]);
      validateDate(
        payload.female.year,
        payload.female.month,
        payload.female.date
      );
      validateTime(
        payload.female.hours,
        payload.female.minutes,
        payload.female.seconds || 0
      );
      validateCoordinates(payload.female.latitude, payload.female.longitude);

      // Validate male
      validateRequired(payload.male, [
        "year",
        "month",
        "date",
        "hours",
        "minutes",
        "latitude",
        "longitude",
      ]);
      validateDate(payload.male.year, payload.male.month, payload.male.date);
      validateTime(
        payload.male.hours,
        payload.male.minutes,
        payload.male.seconds || 0
      );
      validateCoordinates(payload.male.latitude, payload.male.longitude);
    } else {
      // Default single-person validation
      validateRequired(payload, [
        "year",
        "month",
        "date",
        "hours",
        "minutes",
        "latitude",
        "longitude",
      ]);
      validateDate(payload.year, payload.month, payload.date);
      validateTime(payload.hours, payload.minutes, payload.seconds || 0);
      validateCoordinates(payload.latitude, payload.longitude);
    }

    // Special handling for endpoints that may need different payload structure
    let finalPayload;
    
    // Match-making endpoints have a different structure (female/male objects)
    if (endpointPath.startsWith("match-making/")) {
      // For match-making, keep the original structure but validate numeric fields
      finalPayload = {
        female: {
          year: parseInt(payload.female.year),
          month: parseInt(payload.female.month),
          date: parseInt(payload.female.date),
          hours: parseInt(payload.female.hours),
          minutes: parseInt(payload.female.minutes),
          seconds: parseInt(payload.female.seconds || 0),
          latitude: parseFloat(payload.female.latitude),
          longitude: parseFloat(payload.female.longitude),
          timezone: parseFloat(payload.female.timezone || 0),
        },
        male: {
          year: parseInt(payload.male.year),
          month: parseInt(payload.male.month),
          date: parseInt(payload.male.date),
          hours: parseInt(payload.male.hours),
          minutes: parseInt(payload.male.minutes),
          seconds: parseInt(payload.male.seconds || 0),
          latitude: parseFloat(payload.male.latitude),
          longitude: parseFloat(payload.male.longitude),
          timezone: parseFloat(payload.male.timezone || 0),
        },
      };
      
      // Validate female numeric fields
      if (isNaN(finalPayload.female.year) || isNaN(finalPayload.female.month) || isNaN(finalPayload.female.date) ||
          isNaN(finalPayload.female.hours) || isNaN(finalPayload.female.minutes) || isNaN(finalPayload.female.seconds) ||
          isNaN(finalPayload.female.latitude) || isNaN(finalPayload.female.longitude) || isNaN(finalPayload.female.timezone)) {
        return NextResponse.json(
          { error: "Invalid numeric values in female payload" },
          { status: 400 }
        );
      }
      
      // Validate male numeric fields
      if (isNaN(finalPayload.male.year) || isNaN(finalPayload.male.month) || isNaN(finalPayload.male.date) ||
          isNaN(finalPayload.male.hours) || isNaN(finalPayload.male.minutes) || isNaN(finalPayload.male.seconds) ||
          isNaN(finalPayload.male.latitude) || isNaN(finalPayload.male.longitude) || isNaN(finalPayload.male.timezone)) {
        return NextResponse.json(
          { error: "Invalid numeric values in male payload" },
          { status: 400 }
        );
      }
      
      // Include config if provided
      if (payload.config) {
        finalPayload.config = { ...payload.config };
      }
    } else {
      // Single-person endpoints - build base payload with required fields
      finalPayload = {
        year: parseInt(payload.year),
        month: parseInt(payload.month),
        date: parseInt(payload.date),
        hours: parseInt(payload.hours),
        minutes: parseInt(payload.minutes),
        seconds: parseInt(payload.seconds || 0),
        latitude: parseFloat(payload.latitude),
        longitude: parseFloat(payload.longitude),
        timezone: parseFloat(payload.timezone || 0),
      };
      
      // Validate that all required numeric fields are valid
      if (isNaN(finalPayload.year) || isNaN(finalPayload.month) || isNaN(finalPayload.date) ||
          isNaN(finalPayload.hours) || isNaN(finalPayload.minutes) || isNaN(finalPayload.seconds) ||
          isNaN(finalPayload.latitude) || isNaN(finalPayload.longitude) || isNaN(finalPayload.timezone)) {
        return NextResponse.json(
          { error: "Invalid numeric values in payload" },
          { status: 400 }
        );
      }
    }
    
    // Config handling - skip for match-making endpoints (already handled above)
    if (!endpointPath.startsWith("match-making/")) {
      // Western chart endpoint - needs specific config structure
      if (endpointPath === "western/natal-wheel-chart") {
        finalPayload.config = {
          observation_point: payload.config?.observation_point || "topocentric",
          ayanamsha: payload.config?.ayanamsha || "lahiri",
          house_system: payload.config?.house_system || "Placidus",
        };
        // Do NOT include language field for western chart
      } else if (endpointPath.startsWith("vimsottari/")) {
        // All vimsottari endpoints use the same config structure
        // maha-dasas works with this config, so dasa-information should too
        finalPayload.config = {
          observation_point: payload.config?.observation_point || "topocentric",
          ayanamsha: payload.config?.ayanamsha || "lahiri",
        };
        // Explicitly ensure house_system is NOT in config (it causes 400 errors)
        if (finalPayload.config.house_system) {
          delete finalPayload.config.house_system;
        }
        // CRITICAL: Ensure language is NOT included at root level (it causes 400 errors)
        delete finalPayload.language;
      } else {
        // For other endpoints, include config as-is but ensure it exists
        if (payload.config) {
          finalPayload.config = { ...payload.config };
        }
        // Include language if provided for other endpoints
        if (payload.language) {
          finalPayload.language = payload.language;
        }
      }
    }
    
    // Log the final payload for debugging
    console.log("[DEBUG] Final payload for", endpointPath, ":", JSON.stringify(finalPayload, null, 2));
    console.log("[DEBUG] API Base URL:", API_BASE_URL);
    console.log("[DEBUG] API Key present:", !!API_KEY);

    // Forward the request to the astrology API with retry logic for rate limiting
    const apiUrl = `${API_BASE_URL}/${endpointPath}`;
    console.log("[DEBUG] Full API URL:", apiUrl);
    
    // Retry logic with exponential backoff for 429 errors
    let res;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify(finalPayload),
        });

        // If successful, break out of retry loop
        if (res.ok) {
          break;
        }

        // If 429 (rate limit) and we have retries left, wait and retry
        if (res.status === 429 && attempt < maxRetries - 1) {
          const baseDelay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          const jitter = Math.floor(Math.random() * 500); // 0-500ms random jitter
          const delay = baseDelay + jitter;
          
          console.log(`[RETRY] Rate limit hit for ${endpointPath}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // For other errors or final attempt, break and handle error
        break;
      } catch (fetchError) {
        lastError = fetchError;
        // If it's a network error and we have retries left, retry
        if (attempt < maxRetries - 1) {
          const baseDelay = 500 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 200);
          await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
          continue;
        }
        // Final attempt failed, throw
        throw fetchError;
      }
    }

    // Handle errors after retries
    if (!res || !res.ok) {
      const errorText = await res?.text().catch(() => "") || lastError?.message || "Unknown error";
      console.error("=".repeat(80));
      console.error("[ERROR] Endpoint:", endpointPath);
      console.error("[ERROR] Status:", res?.status || "Network Error");
      console.error("[ERROR] Response:", errorText);
      console.error("[ERROR] Payload sent:", JSON.stringify(finalPayload, null, 2));
      console.error("=".repeat(80));
      
      // Try to parse error as JSON for better error messages
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.detail || errorText;
        console.error("[ERROR] Parsed error message:", errorMessage);
      } catch {
        // Keep original error text if not JSON
        console.error("[ERROR] Error response is not JSON");
      }
      
      return NextResponse.json(
        { 
          error: errorMessage || `External API error ${res?.status || "Network Error"}`,
          endpoint: endpointPath,
          status: res?.status || 500 
        },
        { status: res?.status || 500 }
      );
    }

    const text = await res.text();
    
    // Special handling for western chart - it might return SVG as plain text
    if (endpointPath === "western/natal-wheel-chart") {
      // If it's an SVG string, wrap it in a JSON object
      if (text.trim().startsWith("<svg")) {
        return NextResponse.json({ output: text, svg: text }, { status: res.status });
      }
      // If it's already JSON, parse it
      try {
        const json = JSON.parse(text);
        return NextResponse.json(json, { status: res.status });
      } catch {
        // If parsing fails but it's not SVG, return as output field
        return NextResponse.json({ output: text }, { status: res.status });
      }
    }
    
    // For other endpoints, try to parse as JSON
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: res.status });
    } catch {
      // If not JSON, return as text (some endpoints return plain text)
      return new NextResponse(text, { status: res.status });
    }
  } catch (err) {
    console.error("Astro API route error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Invalid request" },
      { status: 400 }
    );
  }
}
