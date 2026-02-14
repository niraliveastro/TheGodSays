"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MatchingPage from "@/app/matching/page";
import { PageLoading } from "@/components/LoadingStates";

const MATCHING_PAGE_CACHE_KEY = "tgs:matching_page_cache";

export default function MatchingResultPage() {
  const router = useRouter();
  const [cache, setCache] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") {
      router.replace("/kundli-matching");
      return;
    }
    try {
      const raw = sessionStorage.getItem(MATCHING_PAGE_CACHE_KEY);
      if (!raw) {
        router.replace("/kundli-matching");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.result && parsed?.fDetails != null && parsed?.mDetails != null) {
        setCache(parsed);
      } else {
        router.replace("/kundli-matching");
      }
    } catch {
      router.replace("/kundli-matching");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || !cache) {
    return (
      <PageLoading
        type="matching"
        message="Loading your compatibility result..."
      />
    );
  }

  return <MatchingPage initialCache={cache} showOnlyResult />;
}
