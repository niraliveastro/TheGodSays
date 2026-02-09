import { useEffect, useState } from "react";

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    if (window.google?.maps?.importLibrary) {
      setLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => setLoaded(true));
      return;
    }

    // Load the script (New API - no libraries parameter needed)
    const script = document.createElement("script");
script.src =
  `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = (err) => console.error("Google Maps failed to load:", err);
    document.head.appendChild(script);

    return () => {
      if (!window.google?.maps?.importLibrary) {
        script.remove();
      }
    };
  }, []);

  return loaded;
}