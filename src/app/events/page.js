"use client";

import { useEffect } from "react";

const EVENTS_URL = "https://vastu-course.vercel.app/";

/**
 * /events – redirects to the Vastu course page.
 * Uses replace() so the back button returns to the page before /events, not to /events again.
 */
export default function EventsPage() {
  useEffect(() => {
    window.location.replace(EVENTS_URL);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontFamily: "Georgia, serif",
        color: "#6b7280",
      }}
    >
      Redirecting to events…
    </div>
  );
}
